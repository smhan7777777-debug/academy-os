import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { AGENT_CATALOG } from "../shared/agent-catalog.js";
import { AGENT_TEAMS } from "../shared/agent-teams.js";

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
    ACADEMY_DATA_DIR: mkdtempSync(resolve(tmpdir(), "academy-mobile-ui-")),
    ACADEMY_DEMO: "1",
    ACADEMY_AGENT_ENABLE: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "",
  browser;
server.stdout.on("data", (v) => (log += v));
server.stderr.on("data", (v) => (log += v));
const engine = process.env.ACADEMY_TEST_ENGINE || "edge";
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await new Promise((done) => setTimeout(done, 100));
    if (i === 99) throw Error(log);
  }
  browser =
    engine === "webkit"
      ? await webkit.launch({ headless: true })
      : await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("test-results", { recursive: true });
  const fits = async (label) =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${engine} overflow: ${label}`,
    );
  const colors = async (selectors) =>
    page.evaluate(
      (selectors) =>
        selectors.map((s) => {
          const c = getComputedStyle(document.querySelector(s));
          return [c.backgroundColor, c.color, c.borderColor];
        }),
      selectors,
    );
  const targets = async (selector) => {
    for (const item of await page.locator(selector).all()) {
      if (!(await item.isVisible())) continue;
      const b = await item.boundingBox();
      assert.ok(
        b.height >= 44 && b.width >= 44,
        `${await item.textContent()}: ${JSON.stringify(b)}`,
      );
    }
  };
  let reference;
  for (const width of [320, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const mode of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: mode });
      await page.goto(origin + "/#today");
      await page.waitForSelector(".home-agent-section");
      await page.evaluate(() => document.fonts.ready);
      const palette = await colors([
        "html",
        "body",
        ".home-agent-section",
        ".home-agent-section .primary",
        ".agent-featured .quick-link",
      ]);
      reference ||= palette;
      assert.deepEqual(
        palette,
        reference,
        `${width}px ${mode}: brand colors must not change`,
      );
      await fits(`office ${width} ${mode}`);
      await targets(".bg-primary-nav a, .home-agent-section .button");
      const all = page.locator(
        '.home-agent-section a[href="/agents?view=directory"]',
      );
      assert.ok(
        (await all.boundingBox()).y < 700,
        "All staff is discoverable in first screen",
      );
      await all.click();
      await page.waitForSelector(".qa-agent-card");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.locator(".qa-agent-card").count(),
        AGENT_CATALOG.length,
      );
      assert.equal(
        await page.locator(".qa-agent-start").count(),
        AGENT_CATALOG.filter((a) => a.available).length,
      );
      await fits(`directory ${width} ${mode}`);
      await targets(".qa-view-nav a, .qa-filters button, .qa-agent-start");
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `test-results/mobile-directory-${engine}-${width}-${mode}.png`,
        });
      await page.goto(origin + "/agents");
      await page.waitForSelector(".qa-task");
      await page.evaluate(() => document.fonts.ready);
      await fits(`hub ${width} ${mode}`);
      assert.ok(
        (await page.locator(".qa-directory-cta").boundingBox()).y < 700,
      );
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `test-results/mobile-team-${engine}-${width}-${mode}.png`,
        });
    }
    console.log(
      `PASS ${engine} ${width}px: light/dark colors, office → all staff, touch targets, overflow`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const ink = await page.evaluate(async () => {
    await document.fonts.load('400 28px "Baeumgyeol Sans"');
    await document.fonts.load('700 28px "Baeumgyeol Sans"');
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 60;
    const context = canvas.getContext("2d");
    return [400, 700].map((weight) => {
      context.clearRect(0, 0, 300, 60);
      context.font = `${weight} 28px "Baeumgyeol Sans"`;
      context.fillText("우리 학원 ABC", 4, 40);
      return context
        .getImageData(0, 0, 300, 60)
        .data.reduce(
          (sum, value, index) => sum + (index % 4 === 3 ? value : 0),
          0,
        );
    });
  });
  assert.ok(
    ink[1] > ink[0] * 1.15,
    `Bold labels must remain visually distinct: ${ink}`,
  );
  await page.goto(origin + "/agents?view=directory");
  await page.waitForSelector(".qa-agent-card");
  for (let i = 0; i < AGENT_TEAMS.length; i++) {
    await page.locator(`[data-team="${i}"]`).click();
    assert.deepEqual(
      (
        await page
          .locator(".qa-agent-card")
          .evaluateAll((els) => els.map((el) => el.dataset.code))
      ).sort(),
      [...AGENT_TEAMS[i].codes].sort(),
    );
  }
  await page.locator('[data-team="core"]').click();
  assert.equal(await page.locator(".qa-agent-card").count(), 9);
  await page.locator('[data-team="pending"]').click();
  assert.equal(await page.locator(".qa-agent-card").count(), 8);
  assert.equal(await page.locator(".qa-agent-start").count(), 0);
  await page.locator("#qaClearSearch").click();
  await page.locator("#qaAgentSearch").fill("팝업");
  assert.ok(await page.locator('[data-code="academy-popup"]').isVisible());
  const filteredUrl = page.url();
  await page.locator('[data-code="academy-popup"] a').click();
  await page.waitForSelector("#qaPublish:not([disabled])");
  await fits("popup");
  await targets(".qa-choice, #qaPublish");
  await page.goBack();
  await page.waitForSelector("#qaAgentSearch");
  assert.equal(page.url(), filteredUrl);
  assert.equal(await page.locator("#qaAgentSearch").inputValue(), "팝업");
  await page.reload();
  await page.waitForSelector("#qaAgentSearch");
  assert.equal(await page.locator("#qaAgentSearch").inputValue(), "팝업");
  await page.locator("#qaAgentSearch").fill("no-match-xyz");
  assert.equal(await page.locator(".qa-agent-card").count(), 0);
  assert.ok(await page.locator(".qa-no-results").isVisible());
  await page.locator("#qaClearSearch").click();
  assert.equal(await page.locator(".qa-agent-card").count(), 48);
  await page.goto(origin + "/agents?view=advanced&agent=CORE-09");
  await page.waitForSelector("#agentEditor");
  assert.ok(
    (await page.locator("#agentEditor").boundingBox()).y < 650,
    "The selected task opens before the long catalog on mobile",
  );
  await fits("advanced task");
  await page.locator(".agent-directory-return").click();
  await page.waitForSelector(".qa-agent-card");
  assert.equal(await page.locator(".qa-agent-card").count(), 48);
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${engine}: 48 employees, 5 teams, core 9, pending 8, search, reset, popup link, history and reload`,
  );
} catch (e) {
  console.error(log);
  throw e;
} finally {
  await browser?.close();
  server.kill();
}
