import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { LIBRARY_TEMPLATES } from "../shared/templates.js";

const socket = createServer().listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((done) => socket.close(done));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server/index.js"], {
  windowsHide: true,
  env: {
    ...process.env,
    VERCEL: "",
    PORT: String(port),
    ACADEMY_DATA_DIR: mkdtempSync(resolve(tmpdir(), "academy-navigation-")),
    ACADEMY_DEMO: "1",
    ACADEMY_AGENT_ENABLE: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "",
  browser;
server.stdout.on("data", (value) => (log += value));
server.stderr.on("data", (value) => (log += value));
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((done) => setTimeout(done, 100));
    if (i === 99) throw Error(log);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const primary = () =>
    page.getByRole("navigation", { name: "주요 화면 이동" });
  const home = async () => {
    await primary()
      .getByRole("link", { name: "원장실 홈", exact: true })
      .click();
    await page.waitForSelector(".home-heading");
    assert.equal(new URL(page.url()).hash, "#today");
  };
  const fits = async (label) => {
    const result = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(
      result.scroll <= result.width + 1,
      `${label}: ${JSON.stringify(result)}`,
    );
  };
  mkdirSync("test-results", { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(origin + "/#today");
    await page.waitForSelector(".home-heading");
    assert.equal(await primary().getByRole("link").count(), 3);
    const website = primary().getByRole("link", {
      name: "학원 홈페이지",
      exact: true,
    });
    const box = await website.boundingBox();
    assert.ok(
      box &&
        (width > 760
          ? box.y + box.height < 180
          : box.y >= 0 && box.y + box.height <= 950),
      "Website button is visible without opening a menu",
    );
    await fits("office");
    await page.screenshot({
      path: `test-results/navigation-office-${width}.png`,
    });
    await website.click();
    await page.waitForSelector(".portal-header");
    await fits("public website");
    await page
      .locator(".portal-header")
      .getByRole("link", { name: "원장실 홈", exact: true })
      .click();
    await page.waitForSelector(".home-heading");
    await primary()
      .getByRole("link", { name: "AI 직원팀", exact: true })
      .click();
    await page.waitForSelector(".qa-featured");
    await fits("AI team");
    await page.locator('.qa-task[href*="academy-popup"]').click();
    await page.waitForSelector("#qaPublish:not([disabled])");
    assert.ok(
      await page.locator('.bg-trail [aria-current="page"]').isVisible(),
    );
    await fits("popup task");
    await page.screenshot({
      path: `test-results/navigation-popup-${width}.png`,
    });
    await page
      .getByRole("link", { name: "← AI 직원팀으로", exact: true })
      .click();
    await page.waitForSelector(".qa-featured");
    await home();
    console.log(
      `PASS ${width}px: office → website → office → AI team → popup → team → office`,
    );
  }
  // The phone drawer closes with the same route, an explicit button, Escape and navigation.
  const openMenu = async () => {
    await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
    assert.equal(await page.locator(".workspace").getAttribute("inert"), "");
  };
  await openMenu();
  await page.locator('#rail .nav a[href="#today"]').click();
  assert.equal(await page.locator("#rail.open").count(), 0);
  assert.equal(await page.locator(".workspace").getAttribute("inert"), null);
  await openMenu();
  await page.locator(".rail-close").click();
  await openMenu();
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page.evaluate(() =>
      document.querySelector("#rail").contains(document.activeElement),
    ),
  );
  await page.keyboard.press("Escape");
  assert.ok(
    await page
      .getByRole("button", { name: "메뉴 열기", exact: true })
      .evaluate((el) => el === document.activeElement),
  );
  await openMenu();
  await page.locator('#rail a[href="#website"]').click();
  await page.waitForSelector(".website-offer");
  assert.equal(await page.locator("#rail.open").count(), 0);
  await page
    .getByRole("link", { name: "디자인·소개 편집 →", exact: true })
    .click();
  await page.waitForSelector("#studioPreview");
  await fits("design editor");
  await page
    .locator(".bg-trail")
    .getByRole("link", { name: "홈페이지 관리", exact: true })
    .click();
  await page.waitForSelector(".website-offer");
  await home();
  console.log(
    "PASS mobile drawer, focus, Escape, same-route close and website editor return",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#rail a[href="/studio"]').click();
  await page.waitForSelector(".st-hero");
  await home();
  await page.locator(".nav-more summary").click();
  await page.locator('#rail a[href="#settings"]').click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('.nav a[aria-current="page"]')
        ?.getAttribute("href") === "#settings",
  );
  assert.ok((await page.locator(".nav-more").getAttribute("open")) !== null);
  await home();
  await page.goto(origin + "/learn");
  await page.waitForSelector(".st-public-title");
  await page
    .locator(".st-header")
    .getByRole("link", { name: "학원 홈페이지", exact: true })
    .click();
  await page.waitForSelector(".portal-header");

  // Multipage templates have their own server-rendered header, including every subpage.
  for (const path of ["", "/about", "/classes", "/content", "/contact"]) {
    await page.goto(
      `${origin}/site${path}?preview=1&template=${LIBRARY_TEMPLATES[0].id}&still=1`,
    );
    await page.waitForSelector(".ac-header");
    const back = page
      .locator(".ac-header")
      .getByRole("link", { name: "원장실 홈", exact: true });
    assert.ok(await back.isVisible());
    await back.click();
    await page.waitForSelector(".home-heading");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS studio, settings, public lesson, all five library pages and no JavaScript errors",
  );
} finally {
  await browser?.close();
  server.kill();
  await once(server, "exit").catch(() => {});
}
