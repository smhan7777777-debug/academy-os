import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Store } from "./store.js";
import { ACTORS } from "./seed.js";
import { project, publicState, slots, check, DomainError } from "./domain.js";
import { dataDir } from "./paths.js";
import { readWebsiteSource } from "./website-source.js";
import { renderLibrarySite } from "./website-pages.js";
import {
  publicExperiences,
  readStudioGuide,
  studioCurrent,
  validateStudioData,
} from "./studio.js";
import { generatorStatus, generateExperience } from "./studio-generator.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 5173);
mkdirSync(dataDir, { recursive: true });
const store = new Store(resolve(dataDir, "academy.sqlite"));
const demo = process.env.ACADEMY_DEMO !== "0";
// Local demo identities are explicit. Disable demo mode to require generated account passwords.
if (!store.db.prepare("SELECT id FROM accounts LIMIT 1").get()) {
  const passwords = [];
  for (const actor of ACTORS) {
    const password = randomBytes(15).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    store.db
      .prepare("INSERT INTO accounts VALUES (?,?,?)")
      .run(actor.id, scryptSync(password, salt, 64).toString("hex"), salt);
    passwords.push(`${actor.id}\t${password}`);
  }
  writeFileSync(
    resolve(dataDir, "local-accounts.txt"),
    "Local accounts (private; do not commit)\n" + passwords.join("\n"),
    { mode: 0o600 },
  );
}
const origins = new Set([
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
]);
const attempts = new Map();
const json = (res, status, value) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
};
async function body(req) {
  const chunks = [];
  let bytes = 0;
  for await (const part of req) {
    bytes += part.length;
    check(bytes < 150000, "요청이 너무 큽니다.", 413);
    chunks.push(part);
  }
  let value;
  try {
    // Network chunks can split a Korean character between its UTF-8 bytes.
    value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new DomainError("올바른 JSON 요청이 아닙니다.", 400);
  }
  check(
    value && typeof value === "object" && !Array.isArray(value),
    "JSON 객체 요청이 필요합니다.",
    400,
  );
  return value;
}
const cookie = (req) =>
  (req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("academy_session="))
    ?.slice(16);
const sessionCookie = (token) =>
  `academy_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`;
function rate(req, category, limit) {
  const key = req.socket.remoteAddress + category;
  const now = Date.now();
  let r = attempts.get(key);
  if (!r || r.until < now) {
    r = { count: 0, until: now + 60000 };
    attempts.set(key, r);
  }
  check(
    ++r.count <= limit,
    "요청이 많습니다. 잠시 뒤 다시 시도해 주세요.",
    429,
  );
}
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' ${dev ? "ws://localhost:" + port + " ws://127.0.0.1:" + port : ""}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  );
  try {
    check(
      req.headers.host === `localhost:${port}` ||
        req.headers.host === `127.0.0.1:${port}`,
      "허용되지 않은 호스트입니다.",
      403,
    );
    const url = new URL(req.url, `http://localhost:${port}`);
    const path = url.pathname;
    if (["/studio", "/welcome"].includes(path))
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (path === "/site" || path.startsWith("/site/")) {
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader(
        "Content-Security-Policy",
        res
          .getHeader("Content-Security-Policy")
          .replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
      );
    }
    if (path.startsWith("/api/")) {
      if (req.method === "POST") {
        check(
          origins.has(req.headers.origin),
          "같은 로컬 앱에서 요청해 주세요.",
          403,
        );
        check(
          (req.headers["content-type"] || "").startsWith("application/json"),
          "JSON 요청이 필요합니다.",
          415,
        );
      }
      if (path === "/api/health")
        return json(res, 200, {
          ok: true,
          mode: demo ? "local-demo" : "local-accounts",
          database: "sqlite",
          schema: 1,
          release: "single-academy-reviewed-v3",
        });
      const token = cookie(req),
        session = store.getSession(token);
      const actor = session
        ? ACTORS.find((x) => x.id === session.actor_id)
        : null;
      if (path === "/api/session" && req.method === "GET")
        return json(res, 200, {
          actor,
          csrf: session?.csrf || null,
          demo,
          actors: demo ? ACTORS : [],
        });
      if (path === "/api/login" && req.method === "POST") {
        rate(req, "login", 30);
        const p = await body(req);
        const selected = ACTORS.find((a) => a.id === p.actorId);
        check(selected, "계정을 확인해 주세요.", 401);
        if (!demo) {
          const account = store.db
            .prepare("SELECT * FROM accounts WHERE id=?")
            .get(selected.id);
          check(
            typeof p.password === "string" && p.password.length <= 200,
            "암호를 입력해 주세요.",
            401,
          );
          const hash = scryptSync(p.password, account.salt, 64);
          check(
            timingSafeEqual(hash, Buffer.from(account.password_hash, "hex")),
            "계정 또는 암호가 올바르지 않습니다.",
            401,
          );
        }
        store.logout(token);
        const auth = store.session(selected.id);
        res.setHeader("Set-Cookie", sessionCookie(auth.token));
        return json(res, 200, {
          actor: selected,
          csrf: auth.csrf,
          demo,
          actors: demo ? ACTORS : [],
        });
      }
      if (path === "/api/public" && req.method === "GET")
        return json(res, 200, publicState(store.load()));
      if (path === "/api/public/slots" && req.method === "GET")
        return json(
          res,
          200,
          slots(store.load(), url.searchParams.get("classId")),
        );
      if (path === "/api/public/status" && req.method === "GET") {
        const s = store.load(),
          key = url.searchParams.get("token");
        check(key && key.length >= 32, "확인번호를 입력해 주세요.");
        const b = s.bookings.find((b) => b.token === key);
        const q = s.conversations.find((q) => q.token === key);
        check(b || q, "확인번호를 찾을 수 없습니다.", 404);
        return json(
          res,
          200,
          b
            ? {
                type: "booking",
                status: b.status,
                date: b.date,
                start: b.start,
                room: b.room,
              }
            : {
                type: "inquiry",
                status: q.status,
                question: q.question,
                answer: q.answer,
              },
        );
      }
      if (path === "/api/public/command" && req.method === "POST") {
        rate(req, "public", 80);
        return json(res, 200, store.command(null, await body(req), true));
      }
      if (path === "/api/studio/public" && req.method === "GET") {
        const s = store.load();
        return json(res, 200, {
          academy: { name: s.settings.name, phone: s.settings.phone },
          experiences: publicExperiences(s),
        });
      }
      if (path === "/api/studio/read" && req.method === "POST") {
        rate(req, "studio-read", 30);
        const p = await body(req);
        return json(res, 200, readStudioGuide(store.load(), p.id, p.secret));
      }
      check(actor, "로그인이 필요합니다.", 401);
      if (req.method === "POST")
        check(
          req.headers["x-csrf-token"] === session.csrf,
          "세션을 새로 확인해 주세요.",
          403,
        );
      if (path === "/api/logout" && req.method === "POST") {
        store.logout(token);
        res.setHeader(
          "Set-Cookie",
          "academy_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return json(res, 200, { ok: true });
      }
      if (path === "/api/state" && req.method === "GET")
        return json(res, 200, project(store.load(actor.academyId), actor));
      if (path === "/api/studio" && req.method === "GET") {
        check(actor.role === "owner", "원장 권한이 필요합니다.", 403);
        const s = store.load(actor.academyId);
        return json(res, 200, {
          ...project(s, actor),
          studioItems: s.studioItems.map((x) => ({
            ...x,
            current: studioCurrent(s, x),
          })),
          generator: generatorStatus(),
        });
      }
      if (path === "/api/studio/generate" && req.method === "POST") {
        check(actor.role === "owner", "원장 권한이 필요합니다.", 403);
        rate(req, "studio-generate", 3);
        const p = await body(req);
        const s = store.load(actor.academyId);
        check(
          typeof p.notes === "string" &&
            !s.students.some((st) => p.notes.includes(st.name)),
          "공개용 자료에서 학생 이름을 제외해 주세요.",
        );
        const result = await generateExperience(p);
        result.data = validateStudioData("experience", result.data);
        return json(res, 200, result);
      }
      if (path === "/api/website/source" && req.method === "POST") {
        check(actor.role === "owner", "원장 권한이 필요합니다.", 403);
        rate(req, "website-source", 10);
        const p = await body(req);
        check(
          typeof p.url === "string" && p.url.length <= 2000,
          "자료 링크를 확인해 주세요.",
        );
        try {
          return json(res, 200, await readWebsiteSource(p.url));
        } catch (error) {
          throw new DomainError(
            `링크를 가져오지 못했습니다. ${error.message}`,
            422,
          );
        }
      }
      if (path === "/api/command" && req.method === "POST")
        return json(res, 200, store.command(actor, await body(req)));
      if (path === "/api/backup" && req.method === "GET") {
        check(actor.role === "owner", "원장 권한이 필요합니다.", 403);
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="academy-backup.json"',
        );
        return json(res, 200, {
          schema: 1,
          exportedAt: new Date().toISOString(),
          state: store.load(actor.academyId),
        });
      }
      throw new DomainError("API를 찾을 수 없습니다.", 404);
    }
    if (path === "/site" || path.startsWith("/site/")) {
      const page = await renderLibrarySite(publicState(store.load()), url);
      if (page) {
        res.writeHead(page.status, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        return res.end(page.html);
      }
    }
    if (dev) {
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(path);
      } catch {
        throw new DomainError("올바른 경로가 아닙니다.", 400);
      }
      // Vite serves source files, so expose only browser modules and public assets.
      // A raw-path denylist can be bypassed with /s%65rver or /@fs/ paths.
      check(
        !/[\\\0%]/.test(decodedPath) &&
          !decodedPath
            .split("/")
            .some((part) => part === "." || part === "..") &&
          (/^\/(?:src|shared|designs|templates|videos)\//.test(decodedPath) ||
            /^\/(?:@vite\/(?:client|env)|node_modules\/\.vite\/deps\/[\w.-]+|node_modules\/vite\/dist\/client\/env\.mjs)$/.test(
              decodedPath,
            ) ||
            /^\/(?:index\.html|favicon\.svg|site-library\.(?:css|js)|start|studio|learn|welcome)?\/?$/.test(
              decodedPath,
            ) ||
            /^\/site(?:\/|$)/.test(decodedPath)),
        "허용되지 않은 경로입니다.",
        403,
      );
      return vite.middlewares(req, res, () =>
        json(res, 404, { error: "화면을 찾을 수 없습니다." }),
      );
    }
    const dist = resolve(root, "dist");
    let target = resolve(dist, "." + decodeURIComponent(path));
    check(
      target === dist ||
        target.startsWith(dist + "/") ||
        target.startsWith(dist + "\\"),
      "허용되지 않은 경로입니다.",
      403,
    );
    try {
      if ((await stat(target)).isDirectory())
        target = resolve(target, "index.html");
    } catch {
      target = resolve(dist, "index.html");
    }
    const data = await readFile(target);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".mp4": "video/mp4",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".woff2": "font/woff2",
    };
    if (extname(target) === ".mp4") {
      res.setHeader("Accept-Ranges", "bytes");
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : data.length - 1;
        if (match && !match[1] && match[2]) {
          start = Math.max(0, data.length - Number(match[2]));
          end = data.length - 1;
        }
        end = Math.min(end, data.length - 1);
        if (
          !match ||
          (!match[1] && !match[2]) ||
          start > end ||
          start >= data.length
        ) {
          res.writeHead(416, { "Content-Range": `bytes */${data.length}` });
          return res.end();
        }
        res.writeHead(206, {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${start}-${end}/${data.length}`,
          "Content-Length": end - start + 1,
          "Cache-Control": "no-cache",
        });
        return res.end(data.subarray(start, end + 1));
      }
    }
    res.writeHead(200, {
      "Content-Type": types[extname(target)] || "application/octet-stream",
      "Cache-Control": ["/studio", "/welcome"].includes(path)
        ? "no-store"
        : path.startsWith("/assets/")
          ? "public,max-age=31536000,immutable"
          : "no-cache",
    });
    res.end(data);
  } catch (e) {
    const status = e instanceof DomainError ? e.status : 500;
    if (status === 500) console.error("Request failed:", e.message);
    if (!res.headersSent)
      json(res, status, {
        error:
          status === 500
            ? "저장 또는 처리에 실패했습니다. 입력은 유지됩니다. 서버 기록을 확인해 주세요."
            : e.message,
      });
    else res.end();
  }
});
let vite;
if (dev) {
  const { createServer: createVite } = await import("vite");
  vite = await createVite({
    root,
    // This app uses plain CSS. Avoid unrelated parent-workspace config scans
    // and archived template HTML becoming development dependency entrypoints.
    css: { postcss: { plugins: [] } },
    optimizeDeps: { entries: ["index.html"] },
    server: {
      middlewareMode: true,
      hmr: { server },
      fs: {
        strict: true,
        allow: [root],
        deny: [
          "**/data/**",
          "**/server/**",
          "**/tests/**",
          "**/docs/**",
          "**/.env*",
          "**/.git/**",
          "**/local-accounts.txt",
        ],
      },
    },
    appType: "spa",
  });
}
const timer = setInterval(() => {
  try {
    store.tick();
  } catch (e) {
    console.error("Worker failed:", e.message);
  }
}, 2000);
timer.unref();
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Academy OS: http://localhost:${port} | ${demo ? "local demo identities" : "password accounts"} | durable SQLite storage`,
  ),
);
server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE" ? `Port ${port} is already in use.` : e.message,
  );
  process.exitCode = 1;
  clearInterval(timer);
  store.close();
  vite?.close();
});
async function shutdown() {
  clearInterval(timer);
  await vite?.close();
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
