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
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "server/index.js",
    ...(process.env.ACADEMY_E2E_BUILT === "1" ? [] : ["--dev"]),
  ],
  {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(port),
      ACADEMY_DATA_DIR: mkdtempSync(resolve(tmpdir(), "academy-design-")),
      ACADEMY_DEMO: "1",
      ACADEMY_GEMINI_KEY: "",
      ACADEMY_GEMINI_MODEL: "",
    },
  },
);
let log = "",
  browser,
  debugPage;
server.stderr.on("data", (d) => (log += d));
server.stdout.on("data", (d) => (log += d));
const errors = [];
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
    viewport: { width: 1440, height: 1100 },
  });
  const page = await ctx.newPage();
  debugPage = page;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) console.error("HTTP", r.status(), r.url());
  });
  page.on("requestfailed", (r) =>
    console.error("REQUEST FAILED", r.url(), r.failure()?.errorText),
  );
  page.on("dialog", (d) => d.accept());
  await page.goto(origin + "/studio", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#studio-editor");
  assert.ok(
    await page
      .getByRole("button", { name: "예시 불러오기", exact: true })
      .isVisible(),
    "first action is outside collapsed AI settings",
  );
  mkdirSync("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/final-studio-desktop.png",
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "예시 불러오기", exact: true })
    .click();
  assert.ok(
    (await page.locator("#studio-preview").textContent()).includes(
      "정답 · 승인 전 확인",
    ),
  );
  let pause;
  const held = new Promise((r) => (pause = r));
  let reached;
  const reachedCommand = new Promise((r) => (reached = r));
  await page.route("**/api/command", async (route) => {
    reached();
    await held;
    await route.continue();
  });
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await reachedCommand;
  assert.ok(
    await page.locator('[name="title"]').isDisabled(),
    "saving prevents unsaved input racing with successful response",
  );
  pause();
  await page.waitForSelector("#studio-publish");
  await page.unroute("**/api/command");
  await page.locator('#studio-publish input[name="confirmed"]').check();
  await page
    .getByRole("button", { name: "검토 완료 · 공개", exact: true })
    .click();
  await page.getByRole("button", { name: "링크 복사", exact: true }).waitFor();
  const state = await (await page.request.get(origin + "/api/studio")).json();
  const original = state.studioItems[0];
  await page
    .getByRole("button", { name: "이 자료로 새 초안", exact: true })
    .click();
  await page.locator('[name="title"]').fill("새 학기의 수업 체험");
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.waitForSelector("#studio-publish");
  let latest = await (await page.request.get(origin + "/api/studio")).json();
  assert.equal(latest.studioItems.length, 2);
  assert.equal(
    latest.studioItems.find((i) => i.id === original.id).status,
    "published",
  );
  assert.equal(
    (await (await page.request.get(origin + "/api/studio/public")).json())
      .experiences.length,
    1,
  );
  await page.getByLabel("자료 검색", { exact: true }).fill("새 학기");
  assert.equal(await page.locator("[data-library-id]:visible").count(), 1);
  await page.getByLabel("자료 검색", { exact: true }).fill("없는자료");
  assert.ok(await page.locator("#studio-search-empty").isVisible());
  await page.getByLabel("자료 검색", { exact: true }).fill("");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `studio overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "미리보기·승인으로 이동 ↓", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "studio-review",
  );
  await page
    .getByRole("button", { name: "작성 내용으로 돌아가기 ↑", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "studio-editor",
  );
  await page.screenshot({
    path: "test-results/final-studio-mobile.png",
    fullPage: false,
  });
  // A competing edit must preserve this tab's text and offer a separate draft.
  const draft = latest.studioItems.find((i) => i.id !== original.id);
  await page.locator('[name="title"]').fill("이 창에서 작성한 내용");
  const session = await (
    await page.request.get(origin + "/api/session")
  ).json();
  const changed = await page.request.post(origin + "/api/command", {
    headers: { "X-CSRF-Token": session.csrf, Origin: origin },
    data: {
      id: crypto.randomUUID(),
      type: "studio.save",
      revision: latest.revision,
      payload: {
        id: draft.id,
        version: draft.version,
        kind: draft.kind,
        classId: draft.classId,
        data: { ...draft.data, title: "다른 창의 최신 내용" },
      },
    },
  });
  assert.equal(changed.status(), 200);
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.locator(".st-conflict").waitFor();
  assert.equal(
    await page.locator('[name="title"]').inputValue(),
    "이 창에서 작성한 내용",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "초안 저장", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "입력 내용으로 새 초안 저장", exact: true })
    .click();
  await page.waitForFunction(() => !document.querySelector(".st-conflict"));
  latest = await (await page.request.get(origin + "/api/studio")).json();
  assert.equal(latest.studioItems.length, 3);
  assert.equal(
    latest.studioItems.find((i) => i.id === draft.id).data.title,
    "다른 창의 최신 내용",
  );
  const slot = (
    await (
      await page.request.get(origin + "/api/public/slots?classId=A")
    ).json()
  )[0];
  const bookingResponse = await page.request.post(
    origin + "/api/public/command",
    {
      headers: { Origin: origin },
      data: {
        id: crypto.randomUUID(),
        type: "booking",
        payload: {
          classId: "A",
          name: "디자인 검토 가정",
          phone: "01012349876",
          date: slot.date,
          start: slot.start,
        },
      },
    },
  );
  assert.equal(bookingResponse.status(), 200, await bookingResponse.text());
  latest = await (await page.request.get(origin + "/api/studio")).json();
  const booking = latest.bookings[0];
  await page.goto(
    `${origin}/studio?kind=guide&classId=${booking.classId}&bookingId=${booking.id}`,
  );
  await page.waitForSelector("#studio-editor");
  assert.equal(
    await page.locator('[name="classId"]').inputValue(),
    booking.classId,
  );
  assert.equal(
    await page.locator('[name="bookingId"]').inputValue(),
    booking.id,
  );
  await page.locator('[name="title"]').fill("가정 전용 제목");
  await page.locator('[name="goal"]').fill("가정 전용 목표");
  await page.locator('[name="plan"]').fill("가정 전용 수업 계획");
  await page.locator('[name="preparation"]').fill("가정 전용 준비물");
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await page.waitForSelector("#studio-publish");
  await page
    .getByRole("button", { name: "이 자료로 새 초안", exact: true })
    .click();
  assert.equal(await page.locator('[name="bookingId"]').inputValue(), "");
  assert.equal(await page.locator('[name="goal"]').inputValue(), "");
  assert.equal(await page.locator('[name="plan"]').inputValue(), "");
  assert.ok(
    !(await page.locator('[name="title"]').inputValue()).includes("가정 전용"),
  );
  assert.ok(
    !(await page.locator('[name="preparation"]').inputValue()).includes(
      "가정 전용",
    ),
  );
  const publicCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const learner = await publicCtx.newPage();
  learner.on("pageerror", (e) => errors.push(e.message));
  await learner.goto(`${origin}/learn?id=${original.id}`);
  await learner.getByRole("button", { name: "3분 수업 시작하기 →" }).click();
  const wrong = (original.data.answer + 1) % 3;
  await learner.locator(`[name="answer"][value="${wrong}"]`).check();
  await learner
    .getByRole("button", { name: "선택한 답 확인", exact: true })
    .click();
  await learner.getByText("한 번 더 생각해 볼까요?", { exact: true }).waitFor();
  assert.ok(
    await learner.locator(`[name="answer"][value="${wrong}"]`).isChecked(),
  );
  await learner
    .locator(`[name="answer"][value="${original.data.answer}"]`)
    .check();
  await learner
    .getByRole("button", { name: "다시 생각한 답 확인", exact: true })
    .click();
  await learner.getByRole("button", { name: "이 수업 상담하기 →" }).waitFor();
  assert.equal(await learner.locator(".st-answer-correct").count(), 1);
  assert.ok(
    await learner
      .locator(".st-answer-correct")
      .getByText("정답", { exact: true })
      .isVisible(),
  );
  assert.ok(
    await learner
      .locator(`[name="answer"][value="${original.data.answer}"]`)
      .isChecked(),
  );
  assert.equal(
    await learner.evaluate(() => document.activeElement.id),
    "learning-feedback",
  );
  assert.ok(
    await learner.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await learner.screenshot({
    path: "test-results/final-learning-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Final design E2E passed: visible starter, processing lock, safe reuse, library search, 4 widths, mobile review/focus, conflict preservation, consultation context, private-copy clearing, public answer feedback.",
  );
} catch (error) {
  console.error(log, errors);
  if (debugPage)
    console.error(
      (
        await debugPage
          .locator("body")
          .textContent()
          .catch(() => "No document")
      ).slice(0, 2400),
    );
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
