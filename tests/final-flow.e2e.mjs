import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { EXPERIENCE_SAMPLES } from "../shared/studio.js";

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
    env: {
      ...process.env,
      PORT: String(port),
      ACADEMY_DATA_DIR: mkdtempSync(resolve(tmpdir(), "academy-final-flow-")),
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
server.stdout.on("data", (d) => {
  log += d;
});
server.stderr.on("data", (d) => {
  log += d;
});
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
  const owner = await browser.newContext();
  const auth = await (
    await owner.request.post(origin + "/api/login", {
      headers: { Origin: origin },
      data: { actorId: "owner" },
    })
  ).json();
  const state = async () =>
    (await owner.request.get(origin + "/api/state")).json();
  const command = async (type, payload) => {
    const response = await owner.request.post(origin + "/api/command", {
      headers: { Origin: origin, "X-CSRF-Token": auth.csrf },
      data: {
        id: crypto.randomUUID(),
        type,
        payload,
        revision: (await state()).revision,
      },
    });
    assert.equal(response.status(), 200, await response.text());
    return response.json();
  };
  const saved = await command("studio.save", {
    kind: "experience",
    classId: "B",
    data: EXPERIENCE_SAMPLES.math,
  });
  await command("studio.publish", {
    id: saved.itemId,
    version: 1,
    confirmed: true,
  });
  const publicContext = await browser.newContext({
    viewport: { width: 390, height: 900 },
  });
  const page = await publicContext.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/learn?id=${saved.itemId}`);
  await page.getByRole("button", { name: "3분 수업 시작하기 →" }).click();
  await page.locator('input[name="answer"][value="1"]').check();
  await page.getByRole("button", { name: "선택한 답 확인" }).click();
  await page.getByRole("button", { name: "이 수업 상담하기 →" }).click();
  await page.waitForURL(/classId=B/);
  const booking = page.locator('[data-public-form="booking"]');
  await booking.waitFor();
  assert.equal(await booking.locator('[name="classId"]').inputValue(), "B");
  await booking.locator('[name="name"]').fill("최종검토 신청");
  await booking.locator('[name="phone"]').fill("010-9876-5432");
  let delayed = false;
  let lateResponseDone;
  const lateResponse = new Promise((r) => {
    lateResponseDone = r;
  });
  await page.route("**/api/public/slots?classId=*", async (route) => {
    const response = await route.fetch();
    if (!delayed && route.request().url().endsWith("classId=C")) {
      delayed = true;
      await new Promise((r) => setTimeout(r, 650));
      await route.fulfill({ response });
      lateResponseDone();
    } else await route.fulfill({ response });
  });
  await booking.locator('[name="classId"]').selectOption("C");
  await booking.locator('[name="classId"]').selectOption("A");
  await lateResponse;
  const expected = await (
    await page.request.get(origin + "/api/public/slots?classId=A")
  ).json();
  await page.waitForFunction(
    (expectedValue) =>
      document.querySelector('[data-public-form="booking"] [name="slot"]')
        .value === expectedValue,
    `${expected[0].date}|${expected[0].start}`,
  );
  assert.equal(await booking.locator('[name="classId"]').inputValue(), "A");
  assert.deepEqual(
    await booking
      .locator('[name="slot"] option')
      .evaluateAll((options) => options.map((o) => o.value)),
    expected.map((x) => `${x.date}|${x.start}`),
  );
  assert.equal(
    await booking.locator('[name="name"]').inputValue(),
    "최종검토 신청",
  );
  await booking.locator('[name="classId"]').selectOption("B");
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-public-form="booking"] [type="submit"]')
        .disabled,
  );
  await booking.locator('[name="agree"]').check();
  let failReceiptRead = true;
  await page.route("**/api/public/status?token=*", async (route) => {
    if (failReceiptRead) {
      failReceiptRead = false;
      await route.abort("failed");
    } else await route.continue();
  });
  await booking.locator('[type="submit"]').click();
  await booking.locator(".error-note").waitFor();
  assert.equal(
    await booking.locator('[name="name"]').inputValue(),
    "최종검토 신청",
  );
  await booking.locator('[type="submit"]').click();
  await page.locator(".portal-status").waitFor();
  const bookings = (await state()).bookings.filter(
    (b) => b.name === "최종검토 신청",
  );
  assert.equal(
    bookings.length,
    1,
    "follow-up fetch failure must not duplicate committed booking",
  );
  assert.equal(bookings[0].classId, "B");
  const ownerPage = await owner.newPage();
  ownerPage.setDefaultTimeout(15000);
  ownerPage.setDefaultNavigationTimeout(30000);
  ownerPage.on("pageerror", (e) => errors.push(e.message));
  await ownerPage.goto(origin + "/#website");
  const link = ownerPage.locator(`a[href*="bookingId=${bookings[0].id}"]`);
  await link.waitFor();
  await ownerPage.goto(origin + (await link.getAttribute("href")));
  await ownerPage.locator("#studio-editor").waitFor();
  assert.equal(
    await ownerPage.locator('#studio-editor [name="classId"]').inputValue(),
    "B",
  );
  assert.equal(
    await ownerPage.locator('#studio-editor [name="bookingId"]').inputValue(),
    bookings[0].id,
  );
  assert.equal(
    await ownerPage.locator('#studio-editor [name="goal"]').inputValue(),
    "",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Final flow passed: experience class continuity, rapid class-switch slots, preserved input, committed booking retry, booking-to-guide context.",
  );
} catch (error) {
  console.error(log);
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
