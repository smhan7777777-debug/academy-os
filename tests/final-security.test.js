import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { request } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import { EXPERIENCE_SAMPLES } from "../shared/studio.js";

test("final HTTP review uses an isolated database", async (t) => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const dir = mkdtempSync(resolve(tmpdir(), "academy-final-security-"));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["server/index.js", "--dev"], {
    env: {
      ...process.env,
      PORT: String(port),
      ACADEMY_DATA_DIR: dir,
      ACADEMY_DEMO: "1",
      ACADEMY_GEMINI_KEY: "",
      ACADEMY_GEMINI_MODEL: "",
    },
    windowsHide: true,
    stdio: "ignore",
  });
  t.after(() => server.kill());
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
    if (i === 149) assert.fail("HTTP server did not start");
  }
  const post = (body) =>
    fetch(origin + "/api/public/command", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  await t.test(
    "development middleware cannot expose server files through encoded paths",
    async () => {
      const serverFile = resolve("server/errors.js").replaceAll("\\", "/");
      for (const path of [
        "/server/errors.js",
        "/s%65rver/errors.js",
        "/server%2ferrors.js",
        `/@fs/${encodeURI(serverFile)}`,
        "/MEMORY.md",
        "/package.json",
      ]) {
        const response = await fetch(origin + path);
        assert.ok(
          [403, 404].includes(response.status),
          `${path}: ${response.status}`,
        );
      }
      assert.equal((await fetch(origin + "/src/studio.js")).status, 200);
      assert.equal((await fetch(origin + "/shared/studio.js")).status, 200);
    },
  );

  await t.test(
    "Vite's browser runtime and its exact environment helper remain available",
    async () => {
      const runtime = await (await fetch(origin + "/@vite/client")).text();
      const environmentImport = runtime.match(
        /^import ["']([^"']+)["'];/m,
      )?.[1];
      assert.equal(environmentImport, "/node_modules/vite/dist/client/env.mjs");
      const helper = await fetch(origin + environmentImport);
      assert.equal(helper.status, 200);
      assert.match(helper.headers.get("content-type"), /javascript/);
      assert.equal(
        (await fetch(origin + "/node_modules/vite/dist/node/index.js")).status,
        403,
      );
    },
  );

  await t.test(
    "development CSS finishes without searching unrelated workspace configuration",
    async () => {
      for (const path of ["/src/styles.css", "/src/studio.css"]) {
        const response = await fetch(origin + path, {
          headers: { Accept: "text/css" },
          signal: AbortSignal.timeout(10000),
        });
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/css/);
        assert.ok((await response.text()).length > 1000);
      }
    },
  );

  await t.test("chunked UTF-8 preserves a Korean inquiry exactly", async () => {
    const question = "학원에 새로 방문하려면 무엇을 준비하나요?";
    const bytes = Buffer.from(
      JSON.stringify({
        id: randomUUID(),
        type: "inquiry",
        payload: { question },
      }),
    );
    const split = bytes.indexOf(Buffer.from("학")) + 1;
    const result = await new Promise((resolveResult, reject) => {
      const req = request(
        origin + "/api/public/command",
        {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolveResult({
              status: res.statusCode,
              value: JSON.parse(Buffer.concat(chunks).toString("utf8")),
            }),
          );
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.write(bytes.subarray(0, split));
      setTimeout(() => req.end(bytes.subarray(split)), 50);
    });
    assert.equal(result.status, 200);
    // Use a fresh socket: this assertion concerns byte preservation, not the
    // shared fetch pool racing an idle server connection during parallel tests.
    const stored = await new Promise((resolveStatus, reject) => {
      const req = request(
        origin + "/api/public/status?token=" + result.value.conversationToken,
        { agent: false },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            try {
              assert.equal(res.statusCode, 200);
              resolveStatus(JSON.parse(Buffer.concat(chunks).toString("utf8")));
            } catch (error) {
              reject(error);
            }
          });
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(stored.question, question);
  });

  await t.test(
    "malformed command bodies fail as client errors without writes",
    async () => {
      for (const value of [
        null,
        [],
        "string",
        { id: randomUUID(), type: "studio.start", payload: null },
        { id: randomUUID(), type: "inquiry", payload: [] },
      ]) {
        assert.equal((await post(value)).status, 400);
      }
    },
  );
});

test("public consultation preserves the experienced class without publishing the private session token", () => {
  const db = new Store(":memory:");
  const command = (type, payload, actor = ACTORS[0]) =>
    db.command(
      actor,
      { id: randomUUID(), type, payload, revision: db.load().revision },
      !actor,
    );
  try {
    const saved = command("studio.save", {
      kind: "experience",
      classId: "B",
      data: EXPERIENCE_SAMPLES.math,
    });
    command("studio.publish", {
      id: saved.itemId,
      version: 1,
      confirmed: true,
    });
    const started = command("studio.start", { id: saved.itemId }, null);
    command(
      "studio.answer",
      { token: started.token, answer: EXPERIENCE_SAMPLES.math.answer },
      null,
    );
    const result = command("studio.consult", { token: started.token }, null);
    const url = new URL(result.href, "http://localhost");
    assert.equal(url.searchParams.get("classId"), "B");
    assert.ok(!result.href.includes(started.token));
  } finally {
    db.close();
  }
});

test("a read remains a single SQLite snapshot while a second server commits", () => {
  const path = resolve(
    mkdtempSync(resolve(tmpdir(), "academy-read-snapshot-")),
    "academy.sqlite",
  );
  const reader = new Store(path);
  const writer = new Store(path);
  try {
    const before = reader.load();
    const prepare = reader.db.prepare.bind(reader.db);
    let wrote = false;
    reader.db.prepare = (sql) => {
      if (!wrote && sql.startsWith("SELECT payload FROM classes ")) {
        wrote = true;
        writer.transaction(() => {
          const state = writer.load();
          state.settings.name = "동시에 변경한 학원";
          state.classes[0].name = "동시에 변경한 수업";
          state.revision++;
          writer.save(state);
        });
      }
      return prepare(sql);
    };
    const snapshot = reader.load();
    assert.equal(wrote, true);
    assert.equal(snapshot.settings.name, before.settings.name);
    assert.equal(snapshot.classes[0].name, before.classes[0].name);
    assert.equal(reader.load().classes[0].name, "동시에 변경한 수업");
  } finally {
    reader.close();
    writer.close();
  }
});
