import { icon } from "./ui.js";

export const brand = (subtitle = "ACADEMY OS") =>
  `<span class="bg-brand"><img src="/favicon.svg" width="42" height="42" alt=""><span>배움결<small>${subtitle}</small></span></span>`;

export const workspaceNav = (current = "studio") =>
  `<nav class="bg-navigation" aria-label="화면 이동"><a href="/#today" class="bg-nav-link">${icon("home")}<span>원장실 홈</span>${icon("arrow")}</a><a href="/studio" class="bg-nav-link ${current === "studio" ? "is-current" : ""}" ${current === "studio" ? 'aria-current="page"' : ""}>${icon("book")}<span>수업 스튜디오</span></a><a href="/start" class="bg-nav-link ${current === "start" ? "is-current" : ""}" ${current === "start" ? 'aria-current="page"' : ""}>${icon("globe")}<span>웹사이트 제작</span></a><a href="/site" class="bg-nav-link">${icon("external")}<span>학원 홈페이지</span></a></nav>`;

export const schoolNav = () =>
  `<nav class="bg-navigation" aria-label="화면 이동"><a class="bg-nav-link" href="/site">${icon("home")}<span>학원 홈페이지</span>${icon("arrow")}</a><a class="bg-nav-link" href="/#today">${icon("briefcase")}<span>원장실로 이동</span>${icon("arrow")}</a></nav>`;
