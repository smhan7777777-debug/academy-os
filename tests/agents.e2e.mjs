import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const dir = mkdtempSync(resolve(tmpdir(), "academy-agents-"));
const origin = `http://127.0.0.1:${port}`;
// Only this isolated test process substitutes a provider response. No external call is made.
const entry = `globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,status:'ok',data:{title:'검증용 모의 결과',body:'분수 덧셈 수업 기록을 정리했습니다.'}}));await import('./server/index.js');`;
const server = spawn(process.execPath, ["--input-type=module", "-e", entry], {
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    VERCEL: "",
    PORT: String(port),
    ACADEMY_DATA_DIR: dir,
    ACADEMY_DEMO: "0",
    ACADEMY_AGENT_ENABLE: "1",
    ACADEMY_AGENT_BASE_URL: "https://test-only.invalid",
    ACADEMY_AGENT_BEARER: "test-only",
    ACADEMY_AGENT_SHOP_ID: "test-school",
    ACADEMY_AGENT_ACADEMY_ID: "forest",
    ACADEMY_AGENT_NAMESPACE: "prof",
  },
});
let log = "";
server.stdout.on("data", (v) => (log += v));
server.stderr.on("data", (v) => (log += v));
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
    if (i === 99) throw Error(log);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(origin + "/agents?view=advanced");
  await page
    .getByRole("heading", { name: "원장 로그인이 필요합니다." })
    .waitFor();
  const password = readFileSync(resolve(dir, "local-accounts.txt"), "utf8")
    .split("\n")
    .find((l) => l.startsWith("owner\t"))
    .split("\t")[1];
  const login = await page.evaluate(async (password) => {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "owner", password }),
    });
    return r.status;
  }, password);
  assert.equal(login, 200);
  await page.goto(origin + "/agents?view=advanced");
  await page.waitForSelector("#agentInput");
  assert.equal(await page.locator("[data-agent-code]").count(), 9);
  await page.selectOption("#agentFilter", "전체");
  assert.equal(await page.locator("[data-agent-code]").count(), 48);
  await page.selectOption("#agentStudent", "S1");
  await page.click("#agentPrefill");
  await page.waitForFunction(
    () => document.querySelector('[name="student_name"]').value === "학생 S1",
  );
  await page.fill('[name="teacher_notes"]', "분수 덧셈 수업 기록입니다.");
  await page.check("#agentConfirm");
  await page.click('#agentInput button[type="submit"]');
  await page.waitForSelector('[data-agent-action="queue"]');
  await page.click('[data-agent-action="queue"]');
  await page.waitForSelector('[data-agent-action="prepare"]', {
    timeout: 15000,
  });
  await page.fill("[data-review-id]", "원장이 수정한 승인 결과입니다.");
  await page.click("#refreshAgents");
  assert.equal(
    await page.locator("[data-review-id]").inputValue(),
    "원장이 수정한 승인 결과입니다.",
  );
  await page.click('[data-agent-action="prepare"]');
  await page.waitForFunction(() =>
    document
      .querySelector("#agentHistory")
      .textContent.includes("통합 결재함으로 전달됨"),
  );
  const submitted = await page.evaluate(
    async () => (await (await fetch("/api/agent-workspace")).json()).runs[0],
  );
  assert.ok(submitted.docId);
  await page.goto(origin + "/#today");
  await page.waitForSelector('[data-doc="' + submitted.docId + '"]');
  await page
    .locator('[data-doc="' + submitted.docId + '"] [data-action="doc"]')
    .click();
  const approvalResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/command") && r.request().method() === "POST",
  );
  await page.locator('[data-action="doc-approve"]').click();
  assert.ok((await approvalResponse).ok());
  await page.waitForFunction(async (id) => {
    const state = await (await fetch("/api/state")).json();
    return state.deliveries.some(
      (d) => d.docId === id && d.status === "local_delivered",
    );
  }, submitted.docId);
  await page.goto(origin + "/agents?view=advanced");
  await page.waitForSelector("#agentHistory");
  await page.click("#refreshAgents");
  await page.waitForFunction(() =>
    document
      .querySelector("#agentHistory")
      .textContent.includes("앱에 반영 완료"),
  );
  assert.match(
    await page.locator("#agentHistory").innerText(),
    /앱에 반영 완료/,
  );
  await page.reload();
  await page.waitForSelector("#agentHistory");
  await page.selectOption("#agentFilter", "전체");
  await page.click('[data-agent-code="CORE-35"]');
  assert.equal(await page.locator("#agentInput").count(), 0);
  mkdirSync("test-results", { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.goto(origin + "/agents?view=advanced");
    await page.waitForSelector("#agentInput");
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({ path: `test-results/agents-${width}.png` });
  }
  const noSession = await browser.newPage();
  await noSession.goto(origin);
  const status = await noSession.evaluate(
    async () => (await fetch("/api/agent-workspace")).status,
  );
  assert.equal(status, 401);
  assert.deepEqual(errors, []);
  console.log(
    "PASS agents: real password login, 48 catalog entries, private-note-safe prefill, draft → mocked provider → approval, reload persistence, unavailable distinction, 3 responsive widths, unauthenticated API denied.",
  );
} finally {
  await browser?.close();
  server.kill();
}
