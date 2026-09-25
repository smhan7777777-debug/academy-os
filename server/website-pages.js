import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { siteDesign, templateById } from "../shared/templates.js";
import { websiteProfile } from "../shared/website.js";
import { DAYS, timeLabel } from "../shared/core.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const PAGES = [
  ["", "홈"],
  ["about", "학원 소개"],
  ["classes", "수강 안내"],
  ["content", "배움 이야기"],
  ["contact", "상담·오시는 길"],
];
const root = resolve(import.meta.dirname, "../public/templates");

// Bake the library's assets and page shell with approved academy data.
// The source library contains sample prices, claims and schedules: none are published.
export async function renderLibrarySite(site, url) {
  const preview = url.searchParams.has("preview");
  const design = siteDesign(site.settings);
  const template =
    (preview && templateById(url.searchParams.get("template"))) ||
    design.template;
  if (!template.library) return null;
  const page = url.pathname.replace(/^\/site\/?/, "");
  if (!PAGES.some(([key]) => key === page))
    return { status: 404, html: "화면을 찾을 수 없습니다." };
  const video =
    preview && ["v1", "v2"].includes(url.searchParams.get("video"))
      ? url.searchParams.get("video")
      : design.displayedVideo;
  const query = preview
    ? `?${new URLSearchParams({ preview: "1", template: template.id, video, ...(url.searchParams.has("still") ? { still: "1" } : {}), ...(url.searchParams.has("embed") ? { embed: "1" } : {}) })}`
    : "";
  const href = (key = "") => `/site${key ? `/${key}` : ""}${query}`;
  const profile = websiteProfile(site.settings);
  const original = await readFile(
    resolve(root, template.id, "index.html"),
    "utf8",
  );
  const fonts = [
    ...original.matchAll(/href="\.\.\/_shared\/(fonts\/[^"<>]+\.css)"/g),
  ]
    .map((m) => `<link rel="stylesheet" href="/templates/_shared/${m[1]}">`)
    .join("");
  const classes = site.classes
    .map(
      (c) =>
        `<article class="ac-card"><span class="ac-eyebrow">${esc(c.grade)} · ${esc(c.subject)}</span><h3>${esc(c.name)}</h3>${c.teacher ? `<p>담당 ${esc(c.teacher)}</p>` : ""}<p>${c.sessions.map((s) => `${esc(DAYS[s.day])} ${esc(timeLabel(s.start))}–${esc(timeLabel(s.end))}`).join("<br>")}</p>${c.seats !== null ? `<p>잔여 ${c.seats}석</p>` : ""}<a class="ac-text-link" href="${href("contact")}">상담 안내 →</a></article>`,
    )
    .join("");
  const news = site.posts.length
    ? site.posts
        .map(
          (p) =>
            `<article class="ac-card"><span class="ac-eyebrow">학원 소식</span><h3>${esc(p.title)}</h3><p class="ac-copy">${esc(p.body)}</p></article>`,
        )
        .join("")
    : '<p class="ac-empty">새 소식이 준비되면 이곳에 안내합니다.</p>';
  const contact = `<section class="ac-section" id="contact"><div class="ac-section-title"><span class="ac-eyebrow">VISIT & CONTACT</span><h2>상담부터 차근차근.</h2></div><div class="ac-grid"><article class="ac-card"><h3>${esc(site.settings.name)}</h3><p>${esc(site.settings.address)}</p><p>${esc(site.settings.phone)}</p><p class="ac-copy">${esc(profile.admission)}</p>${preview ? '<span class="ac-note">미리보기에서는 상담 신청을 받지 않습니다.</span>' : `<a class="ac-button" href="/?portal=1#booking">상담 시간 선택 →</a>`}</article><article class="ac-card"><h3>궁금한 점을 남겨 주세요</h3><p>예약·문의 직원과 원장님이 확인합니다.</p><form id="siteInquiry"><label>문의 내용<textarea name="question" required maxlength="1000" rows="4" ${preview ? "disabled" : ""}></textarea></label><button class="ac-button" type="submit" ${preview ? "disabled" : ""}>문의 보내기</button><p role="status" id="inquiryStatus"></p></form></article></div></section>`;
  const about = `<section class="ac-section" id="about"><span class="ac-eyebrow">ABOUT OUR ACADEMY</span><h2>배움의 다음 걸음을 함께.</h2><div class="ac-about"><img src="${template.image}" alt="학습 분위기를 보여 주는 디자인 이미지"><div><h3>${esc(site.settings.name)}</h3><p class="ac-copy">${esc(profile.about)}</p><small>사진은 디자인용 연출 이미지입니다.</small></div></div></section>`;
  const courses = `<section class="ac-section" id="admission"><span class="ac-eyebrow">OUR CLASSES</span><h2>지금 만날 수 있는 수업.</h2><p class="ac-copy">${esc(profile.admission)}</p><div class="ac-grid">${classes}</div></section>`;
  const stories = `<section class="ac-section" id="content"><span class="ac-eyebrow">ACADEMY JOURNAL</span><h2>학원에서 전하는 이야기.</h2><div class="ac-grid">${news}</div></section>`;
  const hero = `<section class="ac-hero"><div class="ac-hero-copy"><span class="ac-eyebrow">${esc(site.settings.name)}</span><h1>${esc(profile.headline)}</h1><p>${esc(profile.intro)}</p><div class="ac-actions"><a class="ac-button" href="${href("contact")}">상담 안내 ${"→"}</a><a class="ac-text-link" href="${href("classes")}">수업 살펴보기 ↗</a></div></div><div class="ac-film"><video muted loop playsinline preload="metadata" poster="/videos/academy-${video}-poster.jpg"><source src="/videos/academy-${video}.mp4" type="video/mp4"></video><button class="ac-film-toggle" type="button">영상 재생</button><span class="ac-film-note">배움이 자라는 시간</span></div></section>`;
  const studio = preview
    ? ""
    : `<section class="ac-section"><span class="ac-eyebrow">A LITTLE MOMENT OF LEARNING</span><h2>우리 수업을 경험해 보세요.</h2><p>예제를 함께 생각하며 선생님의 설명을 만나 보세요.</p><a class="ac-button" href="/learn">수업 체험 보기 →</a></section>`;
  const body =
    page === "about"
      ? about
      : page === "classes"
        ? courses + studio
        : page === "content"
          ? stories
          : page === "contact"
            ? contact
            : hero + studio + about + courses + stories + contact;
  const title = PAGES.find(([key]) => key === page)[1];
  return {
    status: 200,
    html: `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(site.settings.name)} · ${title}</title><meta name="description" content="${esc(profile.intro)}">${preview ? '<meta name="robots" content="noindex,nofollow">' : ""}${fonts}<link rel="stylesheet" href="/site-library.css"></head><body class="ac-site ac-${template.layout}" style="--ac-accent:${template.accent}" data-preview="${preview}">${preview ? `<div class="ac-preview">${esc(template.name)} · 적용 전 미리보기${!url.searchParams.has("embed") ? `<a href="/start?template=${template.id}">이 디자인 선택 →</a>` : ""}</div>` : ""}<header class="ac-header"><a class="ac-brand" href="${href()}">${esc(site.settings.name)}<small>GROW AT YOUR OWN PACE</small></a><nav aria-label="학원 웹사이트 메뉴">${PAGES.map(([key, label]) => `<a href="${href(key)}" ${page === key ? 'aria-current="page"' : ""}>${label}</a>`).join("")}</nav></header><main>${body}</main><footer class="ac-footer"><strong>${esc(site.settings.name)}</strong><p>${esc(site.settings.address)} · ${esc(site.settings.phone)}</p><a class="ac-office-link" href="/#today">⌂ 원장실로 이동 →</a><span> · 배움결과 함께하는 학원 운영</span></footer><script src="/site-library.js" defer></script></body></html>`,
  };
}
