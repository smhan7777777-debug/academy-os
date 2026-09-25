import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";

const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const dir = mkdtempSync(resolve(tmpdir(), "academy-studio-"));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "server/index.js",
    ...(process.env.ACADEMY_E2E_BUILT === "1" ? [] : ["--dev"]),
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      ACADEMY_DATA_DIR: dir,
      ACADEMY_DEMO: "1",
      ACADEMY_GEMINI_KEY: "",
      ACADEMY_GEMINI_MODEL: "",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "",
  browser;
server.stderr.on("data", (d) => (log += d));
server.stdout.on("data", (d) => (log += d));
const errors = [];
const pending = new Set();
let debugPage;
try {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
    if (i === 149) throw Error(log);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await ctx.newPage();
  debugPage = page;
  page.on("request", (r) => pending.add(r.url()));
  page.on("requestfinished", (r) => pending.delete(r.url()));
  page.on("requestfailed", (r) => pending.delete(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/studio");
  await page.waitForSelector("#studio-editor");
  await page
    .getByRole("button", { name: "우리 학원 기준", exact: true })
    .click();
  await page
    .getByLabel("가르치는 방식", { exact: true })
    .fill("답을 말하기 전에 풀이의 이유를 먼저 묻습니다.");
  await page
    .getByLabel("피드백 기준", { exact: true })
    .fill("직접 확인한 과정을 함께 설명합니다.");
  await page
    .getByLabel("첫 수업 준비 안내", { exact: true })
    .fill("필기구를 준비해 주세요.");
  await page
    .getByRole("button", { name: "학원 기준 저장", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .getElementById("studio-status")
      .textContent.includes("저장했습니다"),
  );
  await page.getByRole("button", { name: "수업 체험", exact: true }).click();
  await page.getByText("예시로 시작 · AI 초안 도우미", { exact: true }).click();
  await page
    .getByRole("button", { name: "예시 불러오기", exact: true })
    .click();
  let loseSaveResponse = true;
  await page.route("**/api/command", async (route) => {
    if (
      loseSaveResponse &&
      route.request().postDataJSON()?.type === "studio.save"
    ) {
      loseSaveResponse = false;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .getElementById("studio-status")
      .textContent.includes("연결할 수 없습니다"),
  );
  assert.ok((await page.locator('[name="question"]').inputValue()).length > 0);
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.waitForSelector("#studio-publish");
  assert.equal(
    (await (await page.request.get(origin + "/api/studio/public")).json())
      .experiences.length,
    0,
  );
  await page.locator('#studio-publish input[name="confirmed"]').check();
  await page
    .getByRole("button", { name: "검토 완료 · 공개", exact: true })
    .click();
  await page.getByRole("button", { name: "링크 복사", exact: true }).waitFor();
  const state = await (await page.request.get(origin + "/api/studio")).json();
  const item = state.studioItems[0];
  assert.equal(
    state.studioItems.length,
    1,
    "lost response retry must not duplicate a saved draft",
  );
  assert.equal(item.status, "published");
  assert.equal(
    (
      await page.request.post(origin + "/api/command", {
        headers: { Origin: origin },
        data: {
          id: crypto.randomUUID(),
          type: "studio.revoke",
          payload: { id: item.id, version: 1 },
          revision: state.revision,
        },
      })
    ).status(),
    403,
  );
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `studio overflow ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
  const publicCtx = await browser.newContext({
    viewport: { width: 390, height: 900 },
  });
  const publicPage = await publicCtx.newPage();
  publicPage.on("pageerror", (e) => errors.push(e.message));
  assert.equal(
    (await publicPage.request.get(origin + "/api/studio")).status(),
    401,
  );
  await publicPage.goto(`${origin}/learn?id=${item.id}`);
  await publicPage.getByRole("button", { name: "3분 수업 시작하기 →" }).click();
  let loseAnswerResponse = true;
  await publicPage.route("**/api/public/command", async (route) => {
    if (
      loseAnswerResponse &&
      route.request().postDataJSON()?.type === "studio.answer"
    ) {
      loseAnswerResponse = false;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort("failed");
    } else await route.continue();
  });
  await publicPage.locator('input[value="0"]').check();
  await publicPage.getByRole("button", { name: "선택한 답 확인" }).click();
  await publicPage.waitForFunction(() =>
    document
      .getElementById("experience-status")
      .textContent.includes("연결할 수 없습니다"),
  );
  await publicPage.getByRole("button", { name: "선택한 답 확인" }).click();
  await publicPage
    .getByText("한 번 더 생각해 볼까요?", { exact: true })
    .waitFor();
  await publicPage.locator('input[value="1"]').check();
  await publicPage.getByRole("button", { name: "다시 생각한 답 확인" }).click();
  await publicPage
    .getByText("선생님의 설명을 만나 보세요", { exact: true })
    .waitFor();
  await publicPage.screenshot({
    path: "test-results/learning-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await publicPage.getByRole("button", { name: "이 수업 상담하기 →" }).click();
  await publicPage.waitForURL(/portal=1&classId=A#booking/);
  await page.reload();
  await page.waitForSelector("#studio-editor");
  await page.getByRole("button", { name: "상담 안내서", exact: true }).click();
  await page
    .getByLabel("상담에서 확인한 목표")
    .fill("풀이의 이유를 자신의 말로 설명하고 싶습니다.");
  await page
    .getByLabel("함께 검토한 수업과 이유")
    .fill("상담에서 중2 수학 A 수업을 함께 검토했습니다.");
  await page
    .getByLabel("첫 수업 준비", { exact: true })
    .fill("필기구를 준비하고 시간은 학원에 확인합니다.");
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.waitForSelector("#studio-publish");
  await page.locator('#studio-publish input[name="confirmed"]').check();
  await page
    .getByRole("button", { name: "검토 완료 · 공유 승인", exact: true })
    .click();
  const link = page.getByRole("link", { name: "안내서 확인 ↗" });
  await link.waitFor();
  const href = await link.getAttribute("href");
  await publicPage.goto(origin + href);
  await publicPage
    .getByText("풀이의 이유를 자신의 말로 설명하고 싶습니다.", { exact: true })
    .waitFor();
  assert.ok(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.ok(
    (await publicPage.locator("body").textContent()).includes("320,000원"),
  );
  await publicPage.screenshot({
    path: "test-results/guide-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "공개·공유 중지", exact: true })
    .click();
  await page
    .getByText(
      "공유를 중지한 자료입니다. 다시 저장하면 새 초안으로 준비됩니다.",
      { exact: true },
    )
    .waitFor();
  await publicPage.reload();
  await publicPage
    .getByRole("heading", { name: "안내를 다시 확인해 주세요." })
    .waitFor();
  await page
    .getByRole("button", { name: "수업 설명 카드", exact: true })
    .click();
  await page
    .getByLabel("함께한 수업 활동")
    .fill("두 값의 변화량을 관찰했습니다.");
  await page
    .getByLabel("이 활동을 한 이유")
    .fill("수식의 의미를 설명하는 연습입니다.");
  await page
    .getByLabel("다음 수업 준비", { exact: true })
    .fill("그래프를 함께 그려 봅니다.");
  await page
    .getByLabel("교사용 준비 메모 · 공유되지 않음")
    .fill("TEACHER-ONLY-PRIVATE");
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.waitForSelector("#studio-publish");
  await page.locator('#studio-publish input[name="confirmed"]').check();
  await page
    .getByRole("button", { name: "검토 완료 · 공유 승인", exact: true })
    .click();
  const lessonLink = page.getByRole("link", { name: "안내서 확인 ↗" });
  await lessonLink.waitFor();
  await publicPage.goto(origin + (await lessonLink.getAttribute("href")));
  await publicPage
    .getByText("두 값의 변화량을 관찰했습니다。".replace("。", "."), {
      exact: true,
    })
    .waitFor();
  assert.ok(
    !(await publicPage.locator("body").textContent()).includes(
      "TEACHER-ONLY-PRIVATE",
    ),
  );
  const metrics = await (await page.request.get(origin + "/api/studio")).json();
  assert.equal(metrics.studioEvents.length, 1);
  assert.equal(metrics.studioEvents[0].completed, true);
  assert.equal(metrics.studioEvents[0].consulted, true);
  const teacherCtx = await browser.newContext();
  await teacherCtx.request.post(origin + "/api/login", {
    headers: { Origin: origin },
    data: { actorId: "teacher-kim" },
  });
  assert.equal(
    (await teacherCtx.request.get(origin + "/api/studio")).status(),
    403,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Studio E2E passed: owner editing/approval, public hint/retry/consult, private sharing/revocation/redaction, CSRF/roles, 4 viewport sizes.",
  );
} catch (e) {
  console.error(log, errors, [...pending]);
  if (debugPage)
    console.error(
      (
        await debugPage
          .locator("body")
          .textContent({ timeout: 3000 })
          .catch(() => "No page")
      ).slice(0, 1800),
    );
  throw e;
} finally {
  await browser?.close();
  server.kill();
}
