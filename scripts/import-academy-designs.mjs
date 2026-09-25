import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { LEGACY_TEMPLATES as TEMPLATES } from "../shared/templates.js";

// One-time, reproducible import. No secrets, production database or network calls.
const source = resolve(
  process.argv[2] || "../pet care and academy/academy/agent1000-academy-lab",
);
const rows = JSON.parse(
  readFileSync(resolve(source, "setup/templates-db/templates.json"), "utf8"),
);
mkdirSync("public/designs", { recursive: true });
mkdirSync("public/videos", { recursive: true });
const provenance = [];
for (const template of TEMPLATES) {
  const row = rows.find((r) => r.id === template.id);
  if (!row?.preview_html) throw Error(`Missing original: ${template.id}`);
  let css = [...row.preview_html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  // Original font/image references were relative to the old platform. The local
  // adapter supplies its own media and inherits the application's Korean font.
  css = css
    .replace(/@font-face\s*\{[^}]*\}/gi, "")
    .replace(/url\([^)]*\)/gi, "none");
  writeFileSync(`public/designs/${template.key}.css`, css, "utf8");
  provenance.push({
    id: template.id,
    source: "setup/templates-db/templates.json:preview_html",
    sha256: createHash("sha256").update(row.preview_html).digest("hex"),
    adaptation:
      "Original CSS; six content-bound hero compositions. Demo claims and inactive controls excluded.",
  });
}
for (const video of ["v1", "v2"]) {
  for (const suffix of [".mp4", "-poster.jpg"]) {
    const name = `academy-${video}${suffix}`;
    copyFileSync(
      resolve(source, "public/assets/videos", name),
      `public/videos/${name}`,
    );
  }
}
writeFileSync(
  "public/designs/provenance.json",
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log("Imported six original design styles and two academy videos.");
