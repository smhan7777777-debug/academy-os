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
  await page.goto(origin + "/agents");
  const password = readFileSync(resolve(dir, "local-accounts.txt"), "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("owner\t"))
    .split("\t")[1];
  assert.equal(
    await page.evaluate(
      async (password) =>
        (
          await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actorId: "owner", password }),
          })
        ).status,
      password,
    ),
    200,
  );
  await page.goto(origin + "/agents");
  await page.waitForSelector(".qa-featured");
  assert.equal(await page.locator(".qa-task").count(), 5);
  assert.equal(await page.locator("#agentInput").count(), 0);
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/quick-hub.png", fullPage: true });
  await page.goto(origin + "/agents?agent=academy-popup");
  await page.waitForSelector("#qaPublish:not([disabled])");
  assert.equal(
    await page.locator("input:visible, textarea:visible").count(),
    0,
  );
  assert.equal(await page.locator("#agentStudent").count(), 0);
  await page.selectOption("#qaClass", "A");
  await page.click('[data-choice="days"][data-value="7"]');
  await page.click('[data-choice="tone"][data-value="plum"]');
  await page.waitForSelector("#qaPublish:not([disabled])");
  assert.ok(await page.locator("#qaAnnouncement .announcement-plum").count());
  await page.screenshot({
    path: "test-results/quick-popup-desktop.png",
    fullPage: true,
  });
  await page.click("#qaPublish");
  await page.waitForFunction(() =>
    document
      .querySelector("#qaStatus")
      .textContent.includes("홈페이지에 게시했습니다"),
  );
  assert.match(await page.locator("#qaPublications").innerText(), /게시 중/);
  const publishedPage = await browser.newPage();
  await publishedPage.goto(origin + "/site");
  await publishedPage.waitForSelector(".school-announcement.announcement-plum");
  const displayedBody = await publishedPage
    .locator(".school-announcement p")
    .innerText();
  assert.ok(displayedBody.includes("중2"));
  await publishedPage.locator(".announcement-cta").click();
  await publishedPage.waitForSelector('[data-portal-control="class"]');
  assert.equal(
    await publishedPage.locator('[data-portal-control="class"]').inputValue(),
    "A",
  );
  assert.ok(new URL(publishedPage.url()).searchParams.get("campaign"));
  await publishedPage.close();
  await page.locator("[data-copy-post]").first().click();
  await page.fill("#qaTitle", "클릭으로 수정한 상담 안내");
  await page.click('[data-choice="layout"][data-value="bar"]');
  await page.waitForSelector("#qaPublish:not([disabled])");
  await page.click("#qaPublish");
  await page.waitForFunction(() =>
    document.querySelector("#qaPublish").textContent.includes("완료"),
  );
  assert.equal(await page.locator("[data-hide-post]").count(), 1);
  const publicData = await page.evaluate(
    async () => await (await fetch("/api/public")).json(),
  );
  assert.equal(publicData.posts.length, 1);
  assert.equal(publicData.posts[0].layout, "bar");
  assert.equal(publicData.posts[0].title, "클릭으로 수정한 상담 안내");
  await page.locator("[data-hide-post]").click();
  await page.waitForFunction(
    () => document.querySelectorAll("[data-hide-post]").length === 0,
  );
  assert.equal(
    (await page.evaluate(async () => await (await fetch("/api/public")).json()))
      .posts.length,
    0,
  );
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `test-results/quick-popup-${width}.png`,
      fullPage: width > 1000,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + "/agents?agent=academy-place");
  await page.waitForSelector("#qaGenerate:not([disabled])");
  assert.equal(
    await page
      .locator("input:visible, textarea:visible, select:visible")
      .count(),
    0,
  );
  await page.click("#qaGenerate");
  await page.waitForSelector("#qaApply", { timeout: 15000 });
  await page.reload(); // Resume the same execution; never call the provider again on reload.
  await page.waitForSelector("#qaApply");
  await page.click("#qaApply");
  await page.waitForSelector(".qa-complete");
  const workspace = await page.evaluate(
    async () => await (await fetch("/api/agent-workspace")).json(),
  );
  assert.equal(
    workspace.runs.filter((r) => r.code === "academy-place").length,
    1,
  );
  assert.equal(
    workspace.documents.find((d) => d.runId === workspace.runs[0].id).status,
    "approved",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS quick workspace: no required typing for popup/place, real-site preview, publish/replace/hide, class and campaign CTA, four widths, mocked AI one-click run and apply, reload resumes without duplication.",
  );
} finally {
  await browser?.close();
  server.kill();
}
