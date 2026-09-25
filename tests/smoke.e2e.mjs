import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173");
await page.waitForSelector(".doc-row");
await page.waitForTimeout(500);
mkdirSync("test-results", { recursive: true });
await page.screenshot({
  path: "test-results/home-desktop.png",
  fullPage: true,
});
const routes = [
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
];
let out = [];
for (const route of routes) {
  await page.goto("http://localhost:5173/#" + route);
  await page.waitForTimeout(120);
  out.push(
    await page.evaluate(
      (route) => ({
        route,
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        h1: document.querySelector("h1")?.textContent,
      }),
      route,
    ),
  );
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:5173/#today");
await page.waitForTimeout(400);
await page.screenshot({ path: "test-results/home-mobile.png", fullPage: true });
for (const route of routes) {
  await page.goto("http://localhost:5173/#" + route);
  await page.waitForTimeout(100);
  out.push(
    await page.evaluate(
      (route) => ({
        mobile: route,
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }),
      route,
    ),
  );
}
await page.goto("http://localhost:5173/?portal=1");
await page.waitForSelector(".portal");
await page.screenshot({
  path: "test-results/portal-mobile.png",
  fullPage: true,
});
console.log(JSON.stringify({ out, errors }, null, 2));
await browser.close();
