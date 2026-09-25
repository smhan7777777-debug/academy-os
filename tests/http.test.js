import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";

test("password mode enforces authentication, CSRF and authoritative role", async (t) => {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const dir = mkdtempSync(resolve(tmpdir(), "academy-os-http-"));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["server/index.js", "--dev"], {
    env: {
      ...process.env,
      PORT: String(port),
      ACADEMY_DATA_DIR: dir,
      ACADEMY_DEMO: "0",
    },
    windowsHide: true,
    stdio: "ignore",
  });
  t.after(() => server.kill());
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
    if (i === 99) assert.fail("HTTP server did not start");
  }
  const post = (path, body, headers = {}) =>
    fetch(origin + path, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  assert.equal((await fetch(origin + "/api/state")).status, 401);
  const session = await (await fetch(origin + "/api/session")).json();
  assert.equal(session.demo, false);
  assert.equal(session.actors.length, 0);
  assert.equal((await post("/api/login", { actorId: "owner" })).status, 401);
  assert.equal(
    (await post("/api/login", { actorId: "owner", password: "incorrect" }))
      .status,
    401,
  );
  const passwords = Object.fromEntries(
    readFileSync(resolve(dir, "local-accounts.txt"), "utf8")
      .split("\n")
      .slice(1)
      .map((line) => line.split("\t")),
  );
  const login = await post("/api/login", {
    actorId: "teacher-kim",
    password: passwords["teacher-kim"],
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  const auth = await login.json();
  const state = await (
    await fetch(origin + "/api/state", { headers: { Cookie: cookie } })
  ).json();
  assert.equal(state.actor.role, "teacher");
  assert.equal(state.invoices.length, 0);
  const command = {
    id: crypto.randomUUID(),
    type: "settings.save",
    payload: { name: "unauthorized", role: "owner" },
    revision: state.revision,
    actorId: "owner",
  };
  assert.equal(
    (await post("/api/command", command, { Cookie: cookie })).status,
    403,
  );
  assert.equal(
    (
      await post("/api/command", command, {
        Cookie: cookie,
        "X-CSRF-Token": auth.csrf,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await post(
        "/api/logout",
        {},
        { Cookie: cookie, "X-CSRF-Token": auth.csrf },
      )
    ).status,
    200,
  );
  assert.equal(
    (await fetch(origin + "/api/state", { headers: { Cookie: cookie } }))
      .status,
    401,
  );
});
