import assert from "node:assert/strict";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/reports/academy-os-business-brief.html");
const output = resolve(
  root,
  "docs/reports/Academy-OS-Business-Brief-2026-09.pdf",
);
const publicOutput = resolve(
  root,
  "public/Academy-OS-Business-Brief-2026-09.pdf",
);
const previews = resolve(root, "test-results/business-brief");
const searchableOutput = resolve(previews, "searchable-source.pdf");
await mkdir(previews, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.ACADEMY_PDF_BROWSER
    ? { channel: process.env.ACADEMY_PDF_BROWSER }
    : process.platform === "win32"
      ? { channel: "msedge" }
      : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1300 },
    deviceScaleFactor: 1.5,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(request.url()));
  await page.route(/^https?:\/\//, (route) => {
    errors.push(`Unexpected external request: ${route.request().url()}`);
    return route.abort();
  });
  await page.emulateMedia({ media: "print" });
  await page.goto(pathToFileURL(source).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator(".page").count(), 4);
  const layout = await page.locator(".page").evaluateAll((pages) =>
    pages.map((sheet, index) => {
      const bounds = sheet.getBoundingClientRect();
      const main = sheet.querySelector("main").getBoundingClientRect();
      const footer = sheet.querySelector(".footer").getBoundingClientRect();
      const horizontalOverflow = [...sheet.querySelectorAll("*")].some((el) => {
        const box = el.getBoundingClientRect();
        return box.left < bounds.left - 1 || box.right > bounds.right + 1;
      });
      return {
        page: index + 1,
        footerGap: Math.round(footer.top - main.bottom),
        horizontalOverflow,
        height: Math.round(bounds.height),
      };
    }),
  );
  for (let i = 0; i < 4; i++) {
    await page
      .locator(".page")
      .nth(i)
      .screenshot({ path: resolve(previews, `source-page-${i + 1}.png`) });
  }
  assert.ok(
    layout.every((sheet) => sheet.footerGap >= 12 && !sheet.horizontalOverflow),
    JSON.stringify(layout),
  );
  assert.deepEqual(errors, []);
  await page.pdf({
    path: searchableOutput,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    tagged: true,
    outline: true,
  });
  const flattened = await browser.newPage({
    viewport: { width: 794, height: 1123 },
  });
  const imagePages = (
    await Promise.all(
      Array.from({ length: 4 }, async (_, index) => {
        const image = await readFile(
          resolve(previews, `source-page-${index + 1}.png`),
        );
        return `<section><img alt="Academy OS 사업모델 소개서 ${index + 1}쪽" src="data:image/png;base64,${image.toString("base64")}"></section>`;
      }),
    )
  ).join("");
  await flattened.setContent(
    `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><title>원장실 Academy OS · 사업모델 소개서</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}section{width:210mm;height:297mm;break-after:page}section:last-child{break-after:auto}img{display:block;width:100%;height:100%;object-fit:fill}</style></head><body>${imagePages}</body></html>`,
    { waitUntil: "load" },
  );
  await flattened.waitForFunction(() =>
    [...document.images].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await flattened.pdf({
    path: output,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
  });
  await copyFile(output, publicOutput);
  console.log(
    JSON.stringify(
      {
        output,
        publicOutput,
        layout,
        fontsLoaded: await page.evaluate(() => document.fonts.status),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
