import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import {
  TEMPLATES,
  LEGACY_TEMPLATES,
  LIBRARY_TEMPLATES,
} from "../shared/templates.js";

const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise((r) => socket.close(r));
const dir = mkdtempSync(resolve(tmpdir(), "academy-designs-"));
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
let log = "",
  browser;
server.stderr.on("data", (d) => (log += d));
server.stdout.on("data", (d) => (log += d));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) break;
    } catch {}
    await wait(100);
    if (i === 99) throw Error(log);
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("test-results", { recursive: true });
  for (const template of LEGACY_TEMPLATES) {
    await page.goto(`${origin}/site?preview=1&template=${template.id}&still=1`);
    await page.waitForSelector("academy-hero h1");
    assert.equal(
      await page
        .locator('[data-public-form="booking"] [type="submit"]')
        .isDisabled(),
      true,
    );
    assert.ok((await page.locator("academy-hero h1").textContent()).length > 0);
    assert.equal(await page.locator("academy-hero video").count(), 1);
    await page.waitForFunction(
      () =>
        document.querySelector("academy-hero").shadowRoot.querySelector("video")
          .readyState >= 2,
    );
    assert.equal(
      await page.locator("academy-hero video").evaluate((v) => v.paused),
      true,
    );
    await page.locator("academy-hero .film-toggle").click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector("academy-hero")
          .shadowRoot.querySelector("video").paused,
    );
    await page.locator("academy-hero .film-toggle").click();
    await page.evaluate(() => document.fonts.ready);
    if (process.argv.includes("--thumbnails")) {
      await page.locator(".design-preview-bar").evaluate((el) => el.remove());
      await page.screenshot({
        path: `public/designs/${template.key}-preview.png`,
      });
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1040 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${template.key} page overflows at ${width}`,
      );
      const overflow = await page.locator("academy-hero").evaluate((el) => {
        const root = el.shadowRoot,
          box = el.getBoundingClientRect();
        return [...root.querySelectorAll("h1,.intro,.actions,.film-toggle")]
          .filter((e) => e.getBoundingClientRect().right > box.right + 1)
          .map((e) => e.className);
      });
      assert.deepEqual(
        overflow,
        [],
        `${template.key} clipped content at ${width}`,
      );
    }
    console.log(`PASS ${template.id}: video playback, pause, 4 viewport sizes`);
  }
  // Reading a preview must never change the saved template.
  assert.equal(
    (await (await fetch(origin + "/api/public")).json()).settings.websiteDesign
      .templateId,
    TEMPLATES[0].id,
  );
  for (const template of LIBRARY_TEMPLATES) {
    await page.goto(
      `${origin}/site?preview=1&template=${template.id}&video=v2&still=1`,
    );
    await page.waitForSelector(".ac-hero h1");
    assert.ok(
      (await page.locator(".ac-brand").textContent()).includes("수학의숲"),
    );
    assert.equal(await page.locator("#siteInquiry button").isDisabled(), true);
    assert.ok(
      (await page.locator(".ac-film source").getAttribute("src")).includes(
        "v2",
      ),
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${template.name} overflows at ${width}`,
      );
    }
    await page
      .locator(".ac-header nav a")
      .filter({ hasText: "수강 안내" })
      .click();
    await page.waitForSelector("#admission .ac-card");
    assert.ok(page.url().includes("preview=1"));
    await page
      .locator(".ac-header nav a")
      .filter({ hasText: "상담·오시는 길" })
      .click();
    assert.equal(await page.locator("#siteInquiry button").isDisabled(), true);
    console.log(
      `PASS ${template.id}: multipage preview, actual classes, 4 viewport sizes`,
    );
  }
  await page.goto(origin + "/start");
  await page.waitForSelector(".design-card");
  assert.equal(await page.locator(".design-card").count(), TEMPLATES.length);
  await page
    .frameLocator("#studioPreview")
    .locator("academy-hero h1")
    .waitFor();
  await page.locator('[data-width="mobile"]').click();
  assert.ok((await page.locator("#studioPreview").boundingBox()).width <= 390);
  await page.locator('[data-width="desktop"]').click();
  await page.locator(`[data-select-template="${TEMPLATES[3].id}"]`).click();
  assert.equal(
    await page
      .locator(`[data-select-template="${TEMPLATES[3].id}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.locator('[name="video"][value="v2"]').check();
  await page.locator('[name="name"]').fill("연결 테스트 학원");
  await page.locator('#siteSetupForm [type="submit"]').click();
  await page.waitForSelector('.setup-status a[href="/site"]');
  await page.reload();
  assert.equal(
    await page
      .locator(`[data-select-template="${TEMPLATES[3].id}"]`)
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.locator('[name="video"][value="v2"]').isChecked(),
    true,
  );
  await page.screenshot({
    path: "test-results/design-studio.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Studio overflow ${width}`,
    );
  }
  await page.goto(origin + "/site");
  await page.waitForSelector("academy-hero video");
  assert.ok(
    (await page.locator("academy-hero source").getAttribute("src")).includes(
      "v2",
    ),
  );
  assert.ok(
    (await page.locator(".brand-word").textContent()).includes(
      "연결 테스트 학원",
    ),
  );
  console.log(
    "PASS choose design + video + school -> save -> reload -> website uses selected identity",
  );

  await page.goto(origin + "/start");
  await page.locator('[data-method="custom"]').click();
  await page.locator('[name="sourceUrl"]').fill("https://127.0.0.1");
  await page.locator("#readSource").click();
  await page.waitForFunction(() =>
    document
      .querySelector(".setup-status")
      ?.textContent.includes("가져오지 못했습니다"),
  );
  await page.locator('[name="sourceUrl"]').fill("");
  await page.locator("#sourceFiles").setInputFiles({
    name: "academy.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "수업마다 풀이를 함께 살펴봅니다. 상담 시간은 예약 후 안내합니다.",
    ),
  });
  await page.waitForFunction(() =>
    document.querySelector('[name="notes"]')?.value.includes("풀이"),
  );
  await page.locator('#customSourceForm [type="submit"]').click();
  await page.waitForSelector("#customReviewForm");
  const oldHeadline = (await (await fetch(origin + "/api/public")).json())
    .settings.websiteProfile.headline;
  await page
    .locator('[name="profile.headline"]')
    .fill("함께 질문하며 배우는 교실");
  assert.equal(
    (await (await fetch(origin + "/api/public")).json()).settings.websiteProfile
      .headline,
    oldHeadline,
  );
  await page.reload();
  await page.waitForSelector("#customReviewForm");
  await page
    .locator('[name="profile.headline"]')
    .fill("함께 질문하며 배우는 교실");
  await page.locator('#customReviewForm [type="submit"]').click();
  await page.waitForSelector('.setup-status a[href="/site"]');
  assert.equal(
    (await (await fetch(origin + "/api/public")).json()).settings.websiteProfile
      .headline,
    "함께 질문하며 배우는 교실",
  );
  console.log(
    "PASS custom file -> persisted draft -> owner edit -> explicit apply; unsafe URL blocked",
  );

  await page.goto(origin + "/#content");
  await page.waitForSelector('[data-form="content-generate"]');
  await page.locator('[name="topic"]').fill("가을 수업 준비");
  await page
    .locator('[name="facts"]')
    .fill("다음 수업에는 필기구와 오답 노트를 준비해 주세요.");
  await page.locator('[data-form="content-generate"] [type="submit"]').click();
  await page.waitForSelector('[data-action="doc-approve"]');
  assert.equal(
    (await (await fetch(origin + "/api/public")).json()).posts.some((p) =>
      p.title.includes("가을 수업 준비"),
    ),
    false,
  );
  await page.locator('[data-action="doc-approve"]').click();
  for (let i = 0; i < 30; i++) {
    const site = await (await fetch(origin + "/api/public")).json();
    if (site.posts.some((p) => p.title.includes("가을 수업 준비"))) break;
    await wait(200);
    if (i === 29) throw Error("Approved content did not publish");
  }
  await page.goto(origin + "/site#content");
  await page.waitForSelector("#content");
  assert.ok(
    (await page.locator("#content").textContent()).includes("가을 수업 준비"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForSelector("academy-hero video");
  assert.equal(
    await page.locator("academy-hero video").evaluate((v) => v.paused),
    true,
  );
  console.log(
    "PASS content brief -> review -> publish -> selected website; reduced motion keeps video paused",
  );
  await page.locator('.website-nav a[href="#about"]').click();
  await wait(100);
  assert.ok(Math.abs((await page.locator("#about").boundingBox()).y) < 100);
  await page.goto(origin + "/#website");
  await page.waitForSelector('[data-action="website-requests"]');
  await page.locator('[data-action="website-requests"]').click();
  await wait(600);
  assert.ok(
    Math.abs((await page.locator("#website-requests").boundingBox()).y) < 120,
  );
  assert.ok(page.url().endsWith("#website"));
  await page.goto(origin + "/#staff");
  await page.waitForSelector(".worker");
  assert.equal(
    await page.locator(".worker").filter({ hasText: "무료 제공" }).count(),
    2,
  );
  console.log("PASS website anchors and two free employee consoles");
  await page.goto(origin + "/start");
  await page
    .locator(`[data-select-template="${LIBRARY_TEMPLATES[0].id}"]`)
    .click();
  await page.frameLocator("#studioPreview").locator(".ac-hero").waitFor();
  await page.locator('#siteSetupForm [type="submit"]').click();
  await page.waitForSelector('.setup-status a[href="/site"]');
  await page.goto(origin + "/site");
  await page.waitForSelector(".ac-hero");
  assert.ok((await page.locator("h1").textContent()).includes("함께 질문"));
  assert.ok(
    (await page.locator("#content").textContent()).includes("가을 수업 준비"),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/library-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/library-mobile.png" });
  await page.goto(origin + "/site/contact");
  await page.locator("#siteInquiry textarea").fill("수업 준비물은 무엇인가요?");
  await page.locator("#siteInquiry button").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#inquiryStatus")
      ?.textContent.includes("접수했습니다"),
  );
  await page.locator("#inquiryStatus a").click();
  await page.waitForSelector("academy-hero");
  await page.goto(origin + "/#website");
  await page.waitForSelector('.website-sections a[href="/site/classes"]');
  console.log(
    "PASS library selection persists, approved content appears, inquiry reaches OS and page links work",
  );
  const media = await fetch(origin + "/videos/academy-v1.mp4", {
    headers: { Range: "bytes=0-1023" },
  });
  assert.equal(media.status, 206);
  assert.equal((await media.arrayBuffer()).byteLength, 1024);
  assert.equal(media.headers.get("content-type"), "video/mp4");
  assert.deepEqual(errors, []);
  console.log("PASS video byte ranges and no uncaught browser errors");
} finally {
  await browser?.close();
  server.kill();
}
