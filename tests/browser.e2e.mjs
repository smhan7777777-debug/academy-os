import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
const free = createServer();
free.listen(0, "127.0.0.1");
await once(free, "listening");
const port = free.address().port;
await new Promise((r) => free.close(r));
const dir = mkdtempSync(resolve(tmpdir(), "academy-os-e2e-"));
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
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (b) => (serverLog += b));
server.stderr.on("data", (b) => (serverLog += b));
let browser;
const results = [],
  errors = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.error("FAIL " + name + ": " + e.message);
    throw e;
  }
}
const state = (p) =>
  p.evaluate(async () => await (await fetch("/api/state")).json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await wait(100);
    if (i === 99) throw Error(serverLog);
  }
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto(origin);
  await p.waitForSelector(".doc-row");
  const go = async (route) => {
    await p.goto(origin + "/#" + route);
    await p.waitForTimeout(100);
  };
  const role = async (actor) => {
    await p.selectOption("#roleSelect", actor);
    await p.waitForFunction(
      (id) =>
        document.querySelector("#roleSelect")?.value === id &&
        document.querySelector(".profile select option:checked")?.value === id,
      actor,
    );
    await p.waitForTimeout(180);
  };
  await test("all owner routes render without page errors", async () => {
    for (const r of [
      "today",
      "students",
      "lesson",
      "timetable",
      "billing",
      "website",
      "content",
      "staff",
      "biz",
      "settings",
    ]) {
      await go(r);
      assert.ok(await p.locator("h1").innerText());
    }
    assert.deepEqual(errors, []);
  });
  await test("desktop inbox is visible in the first viewport", async () => {
    await go("today");
    assert.ok((await p.locator(".layout-main").boundingBox()).y < 600);
  });
  await test("native dialog contains keyboard focus", async () => {
    await p.locator('[data-action="doc"]').first().click();
    assert.ok(
      await p.evaluate(() =>
        document.querySelector("dialog").contains(document.activeElement),
      ),
    );
    for (let i = 0; i < 15; i++) {
      await p.keyboard.press("Tab");
      assert.ok(
        await p.evaluate(() =>
          document.querySelector("dialog").contains(document.activeElement),
        ),
      );
    }
    await p.keyboard.press("Escape");
  });
  await test("teacher role cannot see finances or other teacher classes", async () => {
    await role("teacher-kim");
    const data = await state(p);
    assert.equal(data.actor.role, "teacher");
    assert.equal(data.invoices.length, 0);
    assert.ok(data.classes.every((c) => c.teacherId === "teacher-kim"));
    assert.equal(await p.locator('.nav a[href="#billing"]').count(), 0);
  });
  await test("untouched lesson does not create records", async () => {
    await go("lesson");
    const data = await state(p);
    let date = data.date;
    for (let i = 0; i < 7; i++) {
      const d = new Date(date + "T12:00:00+09:00");
      if ([1, 3].includes(d.getUTCDay())) break;
      date = new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
    }
    await p.locator('[data-control="lesson-date"]').fill(date);
    await p.locator('[data-control="lesson-date"]').dispatchEvent("change");
    await p.locator('#lessonForm button[type="submit"]').click();
    await p.waitForTimeout(160);
    assert.equal((await state(p)).records.length, 0);
  });
  await test("record -> teacher review -> owner approval -> parent exact content", async () => {
    await p
      .locator(
        '[data-record="S1"] [data-action="lesson-chip"][data-field="att"][data-value="출석"]',
      )
      .click();
    await p
      .locator(
        '[data-record="S1"] [data-action="lesson-chip"][data-field="hw"][data-value="제출"]',
      )
      .click();
    await p.locator('#lessonForm button[type="submit"]').click();
    await p.waitForTimeout(200);
    let data = await state(p);
    assert.equal(data.records.length, 1);
    const d = data.docs.find((d) => d.kind === "report");
    assert.ok(d);
    await go("today");
    await p.locator(`[data-action="doc"][data-id="${d.id}"]`).click();
    await p.locator('[data-action="doc-review"]').click();
    await p.waitForTimeout(200);
    await role("owner");
    await p.locator(`[data-action="doc"][data-id="${d.id}"]`).click();
    await p.locator('[data-action="doc-approve"]').click();
    await p.waitForTimeout(2300);
    await role("parent-s1");
    data = await state(p);
    assert.equal(data.approvals[0].snapshot.body, d.body);
    assert.equal(data.students.length, 1);
    assert.equal(data.records.length, 0);
    assert.ok(
      (await p.locator(".text-body").first().innerText()).includes(
        "숙제: 제출",
      ),
    );
    await role("owner");
  });
  await test("payment persists after reload", async () => {
    await go("billing");
    await p.locator('[data-action="payment"][data-id="INV3"]').click();
    await p.locator('#paymentForm [name="amount"]').fill("100000");
    await p.locator('#paymentForm [name="reference"]').fill("E2E-TRANSFER-1");
    await p.locator('button[form="paymentForm"]').click();
    await p.waitForTimeout(200);
    await p.reload();
    await p.waitForSelector('[data-action="payment"]');
    assert.ok(
      (await state(p)).payments.some(
        (x) => x.reference === "E2E-TRANSFER-1" && x.amount === 100000,
      ),
    );
  });
  await test("edited content uses approval snapshot on public portal", async () => {
    await go("content");
    await p.locator('[data-action="content-new"]').first().click();
    await p.locator('#contentForm [name="title"]').fill("검증 소식");
    await p.locator('#contentForm [name="body"]').fill("수정 전 문장");
    await p.locator('button[form="contentForm"]').click();
    await p.waitForTimeout(150);
    const d = (await state(p)).docs.find((x) => x.kind === "content");
    await go("today");
    await p.locator(`[data-action="doc"][data-id="${d.id}"]`).click();
    await p.locator('[data-action="doc-edit"]').click();
    await p
      .locator('#docEditForm [name="body"]')
      .fill("원장이 확인한 최종 문장");
    await p.locator('button[form="docEditForm"]').click();
    await p.waitForTimeout(150);
    await p.locator('[data-action="doc-approve"]').click();
    await p.waitForTimeout(2300);
    const site = await (await fetch(origin + "/api/public")).json();
    assert.equal(
      site.posts.find((x) => x.kind === "content").body,
      "원장이 확인한 최종 문장",
    );
  });
  await test("free website management publishes approved introduction and all eight sections work", async () => {
    await go("website");
    mkdirSync("test-results", { recursive: true });
    await p.screenshot({ path: "test-results/website-management.png" });
    assert.ok((await p.locator(".website-offer").innerText()).includes("무료"));
    await p
      .locator('#websiteProfileForm [name="headline"]')
      .fill("원장실에서 확인한 학원 소개");
    await p.locator('#websiteProfileForm button[type="submit"]').click();
    await p.waitForSelector('[data-action="doc-approve"]');
    const before = await (await fetch(origin + "/api/public")).json();
    assert.notEqual(
      before.settings.websiteProfile.headline,
      "원장실에서 확인한 학원 소개",
    );
    await p.locator('[data-action="doc-approve"]').click();
    await p.waitForTimeout(2300);
    const q = await ctx.newPage();
    await q.goto(origin + "/?portal=1");
    await q.waitForSelector(".website-nav");
    assert.equal(
      await q.locator("h1").innerText(),
      "원장실에서 확인한 학원 소개",
    );
    const links = await q
      .locator(".website-nav a")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    assert.equal(links.length, 8);
    for (const href of links) assert.equal(await q.locator(href).count(), 1);
    await q.locator('.website-nav a[href="#about"]').click();
    await q.waitForTimeout(100);
    assert.ok(Math.abs((await q.locator("#about").boundingBox()).y) < 100);
    await q.close();
  });
  await test("public booking input is rendered as literal text, not HTML", async () => {
    const q = await ctx.newPage();
    q.on("pageerror", (e) => errors.push(e.message));
    await q.goto(origin + "/?portal=1");
    await q.waitForSelector('[data-public-form="booking"]');
    await q
      .locator('[data-public-form="booking"] [name="name"]')
      .fill('<img src=x onerror="window.pwn=1">');
    await q
      .locator('[data-public-form="booking"] [name="phone"]')
      .fill("01012345678");
    await q.locator('[data-public-form="booking"] [name="agree"]').check();
    await q
      .locator('[data-public-form="booking"] button[type="submit"]')
      .click();
    await q.waitForSelector(".portal-status");
    await go("website");
    await p.waitForFunction(
      () => document.querySelector("#main")?.textContent.includes("<img src=x"),
      {},
      { timeout: 7000 },
    );
    assert.equal(await p.locator("#main img").count(), 0);
    assert.equal(await p.evaluate(() => window.pwn), undefined);
    assert.ok((await p.locator("#main").innerText()).includes("<img src=x"));
    await q.close();
  });
  await test("server rejects unauthenticated and cross-origin state changes", async () => {
    assert.equal((await fetch(origin + "/api/state")).status, 401);
    const r = await fetch(origin + "/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://other.example",
      },
      body: JSON.stringify({ actorId: "owner" }),
    });
    assert.equal(r.status, 403);
  });
  await test("another tab's account change refreshes permissions and session", async () => {
    const other = await ctx.newPage();
    await other.goto(origin);
    await other.waitForSelector("#roleSelect");
    await other.selectOption("#roleSelect", "teacher-kim");
    await other.waitForFunction(
      () => document.querySelector('.nav a[href="#billing"]') === null,
    );
    await p.locator('[data-action="refresh"]').click();
    await p.waitForFunction(
      () => document.querySelector("#roleSelect")?.value === "teacher-kim",
    );
    assert.equal(await p.locator('.nav a[href="#billing"]').count(), 0);
    await role("owner");
    await other.close();
  });
  await test("responsive routes have no page overflow at 320, 390, 768, 1280 px", async () => {
    for (const width of [320, 390, 768, 1280]) {
      await p.setViewportSize({ width, height: 900 });
      for (const r of [
        "today",
        "students",
        "lesson",
        "timetable",
        "billing",
        "website",
        "content",
        "staff",
        "settings",
      ]) {
        await go(r);
        const size = await p.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(
          size.scroll <= width + 1,
          `${r} overflow ${size.scroll}/${width}`,
        );
      }
    }
  });
  await test("public portal fits narrow mobile viewport", async () => {
    await p.setViewportSize({ width: 320, height: 850 });
    await p.goto(origin + "/?portal=1");
    await p.waitForSelector(".portal");
    await p.screenshot({ path: "test-results/website-mobile.png" });
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  });
  await test("dark buttons use readable dark foreground", async () => {
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.emulateMedia({ colorScheme: "dark" });
    await p.goto(origin + "/#content");
    await p.waitForSelector(".button.primary");
    await p.waitForTimeout(350);
    const color = await p
      .locator(".button.primary")
      .first()
      .evaluate((e) => getComputedStyle(e).color);
    assert.notEqual(color, "rgb(255, 255, 255)");
    const contrast = await p.evaluate(() => {
      const luminance = (color) => {
        const c = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((n) => n / 255)
          .map((n) =>
            n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
          );
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      };
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const body = getComputedStyle(document.documentElement),
        button = getComputedStyle(document.querySelector(".button.primary"));
      return {
        body: ratio(luminance(body.color), luminance(body.backgroundColor)),
        button: ratio(
          luminance(button.color),
          luminance(button.backgroundColor),
        ),
      };
    });
    assert.ok(
      contrast.body >= 4.5 && contrast.button >= 4.5,
      JSON.stringify(contrast),
    );
    await p.emulateMedia({ colorScheme: "light" });
  });
  assert.deepEqual(errors, []);
  console.log(
    `Browser checks: ${results.length} passed. Isolated database: ${dir}`,
  );
} catch (e) {
  console.error(e.stack);
  console.error(serverLog);
  process.exitCode = 1;
} finally {
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/browser-results.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser?.close();
  server.kill();
}
