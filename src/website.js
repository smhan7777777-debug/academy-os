import { esc, icon, badge, panel, field, area, dateTime, btn } from "./ui.js";
import { websiteProfile, WEBSITE_SECTIONS } from "../shared/website.js";
import { siteDesign, FREE_STAFF } from "../shared/templates.js";

export function websiteManagement(s) {
  const profile = websiteProfile(s.settings);
  const design = siteDesign(s.settings);
  const sections = design.template.library
    ? [
        ["", "홈"],
        ["/about", "학원 소개"],
        ["/classes", "수강 안내"],
        ["/content", "배움 이야기"],
        ["/contact", "상담·오시는 길"],
      ]
    : WEBSITE_SECTIONS.map(([id, title]) => ["#" + id, title]);
  const leads = s.bookings.filter((b) => !b.studentId);
  const enrolled = leads.filter((b) => b.enrolledStudentId);
  const enabled = (id) => s.workers.find((w) => w.id === id)?.enabled;
  const pending = s.docs.find(
    (d) => d.kind === "website" && ["review", "held"].includes(d.status),
  );
  return `<section class="website-offer">
    <div><div class="eyebrow">FREE WEBSITE · CONNECTED OFFICE</div><h2>무료로 제공하는 학원 웹사이트.<br>운영은 원장실에서 이어집니다.</h2><p>학원 소개와 수강 안내부터 상담·문의·배움 이야기까지.<br>학부모가 만나는 웹사이트와 원장님의 업무가 하나로 연결됩니다.</p><div class="entry-actions">${badge("프리미엄 웹사이트 무료 제공", "green")}${badge("예약·문의 + 콘텐츠 생성 · 무료 직원 2명", "green")}</div></div>
    <div class="website-preview"><span class="small muted">디자인 ${design.template.number} · ${design.template.name} · 히어로 영상 포함</span><strong>${esc(s.settings.name)}</strong><p>${esc(profile.headline)}</p><div class="entry-actions"><a class="button primary" href="/site" target="_blank" rel="noopener">${icon("external")} 웹사이트 보기</a><a class="button secondary" href="/start">웹사이트 만들기 · 두 가지 방법</a></div><small>웹사이트 + 무료 직원 2명 · 로컬 연결</small></div>
  </section>
  <section class="studio-entry"><div><span class="eyebrow">TEACHING STUDIO</span><h2>원장님의 수업을, 하나의 경험으로.</h2><p>3분 수업 체험 · 상담 후 맞춤 안내서 · 학부모 수업 카드.<br>검토하고 승인한 자료가 웹사이트와 연결됩니다.</p></div><a class="button primary" href="/studio">수업 스튜디오 열기 →</a></section>
  <section class="free-staff-grid" aria-label="함께 제공되는 무료 직원 두 명">${FREE_STAFF.map((w) => `<a class="free-staff-card" ${w.id === "booking" ? 'data-action="website-requests"' : ""} href="${w.id === "booking" ? "#website-requests" : w.href}"><span class="free-staff-symbol">${icon(w.id === "booking" ? "calendar" : "spark")}</span><div><span class="eyebrow">${w.code} · 무료 제공</span><h3>${w.name}</h3><p>${w.description}</p><strong>${w.id === "booking" ? "예약·문의 확인하기" : "콘텐츠 만들기"} →</strong></div></a>`).join("")}</section>
  <section class="website-flow" aria-label="웹사이트와 원장실의 연결 흐름">${[
    ["01", "무료 웹사이트", "학원 소개 · 수강 안내 · 콘텐츠"],
    [
      "02",
      "상담·문의 유입",
      `웹사이트 상담 신청 ${leads.length}건 · 문의 ${s.conversations.length}건`,
    ],
    ["03", "원장 확인·등록", `상담에서 학생 등록 ${enrolled.length}건`],
    ["04", "다시 웹사이트로", "승인한 소식 · 답변 · 일정 반영"],
  ]
    .map(
      ([n, t, d]) =>
        `<div><span class="eyebrow">${n}</span><h3>${t}</h3><p>${esc(d)}</p></div>`,
    )
    .join("")}</section>
  <div class="two-columns spaced website-management">${panel(
    "웹사이트 구성",
    "학부모가 보는 웹사이트 메뉴를 직접 확인하세요.",
    `<div class="panel-body"><div class="website-sections">${sections.map(([id, title]) => `<a href="/site${id}" target="_blank" rel="noopener"><span>${esc(title)}</span>${icon("external")}</a>`).join("")}</div><p class="small muted spaced">이 웹사이트와 OS는 같은 서버에 연결되어 있습니다. 실제 agent1000 사이트·도메인의 배포 연결은 아직 설정되지 않았습니다.</p><div class="info-list spaced">${[
      ["상담 신청 → 결재함", enabled("booking") ? "접수 가능" : "새 신청 중지"],
      [
        "문의 → 확인된 답변",
        enabled("inquiry") ? "지식 답변 / 원장 확인" : "원장 직접 확인",
      ],
      [
        "소식 → 웹사이트",
        enabled("content") ? "작성·결재 후 반영" : "새 콘텐츠 준비 중지",
      ],
      ["시간표·잔여석 → 웹사이트", "운영 기록에서 반영"],
    ]
      .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
      .join(
        "",
      )}</div><p class="small muted spaced">방문자 수·광고비·매출 효과는 측정 전입니다. 위 수치는 저장된 신청·문의·등록 기록입니다.</p></div>`,
  )}
  ${panel("학원 소개와 모집 안내", "변경안을 준비하고 결재하면 웹사이트에 반영합니다.", `<form id="websiteProfileForm" data-form="website-profile" class="panel-body form-stack">${field("첫 화면 제목", "headline", profile.headline, "text", 'required maxlength="80"')}${area("첫 화면 소개", "intro", profile.intro, 'required maxlength="400" rows="2"')}${area("학원 소개", "about", profile.about, 'required maxlength="1500" rows="3"')}${area("수강·등록 안내", "admission", profile.admission, 'required maxlength="1500" rows="3"')}<button class="button primary" type="submit">변경안 준비 · 원장 결재</button><p class="small muted">${s.settings.websiteUpdatedAt ? `최근 웹사이트 반영 ${esc(dateTime(s.settings.websiteUpdatedAt))}` : "기본 소개 사용 중 · 학원에 맞는 내용으로 작성해 주세요."}</p></form>${pending ? `<div class="panel-footer">${badge("변경안 확인 필요", "amber")}${btn("변경안 보기", "doc", `data-id="${esc(pending.id)}"`, "secondary")}</div>` : ""}`)}</div>
  <div class="section-label spaced" id="website-requests">웹사이트에서 들어온 상담·문의</div>`;
}

export function websiteIntro(site) {
  const profile = websiteProfile(site.settings);
  return `<nav class="website-nav" aria-label="학원 웹사이트 메뉴">${WEBSITE_SECTIONS.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("")}</nav>
    <section id="home"><academy-hero></academy-hero></section>
    <section class="website-about" id="about"><div class="eyebrow">ABOUT OUR ACADEMY</div><h2>${esc(site.settings.name)}</h2><p class="text-body">${esc(profile.about)}</p></section><section class="studio-entry"><div><span class="eyebrow">A LITTLE MOMENT OF LEARNING</span><h2>우리 수업을 경험해 보세요.</h2><p>예제를 함께 생각하며 선생님의 설명 방식을 만나 보세요.</p></div><a class="button secondary" href="/learn">수업 체험 살펴보기 →</a></section>`;
}
