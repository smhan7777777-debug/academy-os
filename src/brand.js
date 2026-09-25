import { esc, icon } from "./ui.js";

export const brand = (subtitle = "ACADEMY OS") =>
  `<span class="bg-brand"><img src="/favicon.svg" width="42" height="42" alt=""><span>배움결<small>${subtitle}</small></span></span>`;

export const workspaceNav = (current = "studio") =>
  `<nav class="bg-navigation bg-primary-nav" aria-label="주요 화면 이동">${[
    ["office", "/#today", "home", "원장실 홈", "오늘 할 일과 결재함"],
    [
      "agents",
      "/agents",
      "briefcase",
      "AI 직원팀",
      "업무를 선택하고 직원에게 맡기기",
    ],
    ["site", "/site", "globe", "학원 홈페이지", "학부모가 보는 공개 홈페이지"],
  ]
    .map(
      ([id, href, symbol, label, title]) =>
        `<a href="${href}" class="bg-nav-link ${current === id ? "is-current" : ""}" ${current === id ? 'aria-current="page"' : ""} title="${title}">${icon(symbol)}<span>${label}</span></a>`,
    )
    .join("")}</nav>`;

// A fixed parent route also works for bookmarks and direct entry from another tab.
export const workspaceTrail = (current, detail = "") => {
  const sections = {
    agents: ["/agents", "AI 직원팀"],
    studio: ["/studio", "수업 스튜디오"],
    start: ["/#website", "홈페이지 관리"],
  };
  const section = sections[current];
  if (!section) return "";
  const leaf = detail || (current === "start" ? "디자인·소개 편집" : "");
  return `<nav class="bg-trail" aria-label="현재 위치"><a href="/#today">원장실 홈</a>${icon("chevron")}${leaf ? `<a href="${section[0]}">${section[1]}</a>${icon("chevron")}<span aria-current="page">${esc(leaf)}</span>` : `<span aria-current="page">${section[1]}</span>`}</nav>`;
};

export const schoolNav = () =>
  `<nav class="bg-navigation" aria-label="화면 이동"><a class="bg-nav-link" href="/site">${icon("home")}<span>학원 홈페이지</span></a><a class="bg-nav-link" href="/#today">${icon("briefcase")}<span>원장실 홈</span>${icon("arrow")}</a></nav>`;
