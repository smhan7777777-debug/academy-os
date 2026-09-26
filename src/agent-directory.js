import { esc, icon } from "./ui.js";
import {
  AGENT_TEAMS,
  FEATURED_AGENTS,
  teamFor,
} from "../shared/agent-teams.js";

const symbols = ["book", "chat", "heart", "globe", "briefcase"];
const taskUrl = (a) =>
  `/agents?${a.priority ? "" : "view=advanced&"}agent=${encodeURIComponent(a.code)}`;

export function renderTeamHub(content, state) {
  const params = new URLSearchParams(location.search);
  const directory = params.get("view") === "directory";
  const available = state.catalog.filter((a) => a.available);
  content.innerHTML = `<section class="qa-welcome"><div><span class="eyebrow">BAEUMGYEOL · AI TEAM</span><h1>${directory ? "우리 학원, 모든 AI 직원." : "어떤 일을 도와드릴까요?"}</h1><p>${directory ? "맡길 일로 검색하고, 담당 직원을 바로 찾아보세요." : "수업 기록부터 홈페이지 소식까지.<br>맡길 일을 고르면 필요한 자료를 함께 준비합니다."}</p></div><a class="qa-directory-cta" href="/agents?view=directory">${icon("users")}<span>전체 직원 보기<strong>${state.catalog.length}개 업무 · 5개 전문 팀</strong></span>${icon("arrow")}</a></section>
    <nav class="qa-view-nav" aria-label="직원 탐색"><a href="/agents" ${!directory ? 'aria-current="page"' : ""}>${icon("spark")} 핵심 업무</a><a href="/agents?view=directory" ${directory ? 'aria-current="page"' : ""}>${icon("users")} 전체 직원 <span>${state.catalog.length}</span></a></nav>
    <p class="qa-connection-note" ${directory ? "hidden" : ""}>${icon(state.connection.ready ? "check" : "settings")} ${state.connection.ready ? "AI 연결됨 · 실행 결과를 확인한 뒤 반영하세요." : "AI 실행은 연결 설정이 필요합니다. 홈페이지 팝업은 지금 사용할 수 있어요."}<a href="/agents?view=advanced">연결 확인 →</a></p>
    <div id="qaHubBody"></div>`;
  const body = content.querySelector("#qaHubBody");
  if (!directory) {
    body.innerHTML = `<div class="qa-section-heading"><h2>자주 맡기는 핵심 업무</h2><span>선택하면 바로 시작해요</span></div><div class="qa-featured">${FEATURED_AGENTS.map((a, i) => `<a class="qa-task tone-${i}" href="/agents?agent=${a.code}"><span class="qa-task-icon">${icon(["book", "file", "compass", "globe", "leaf"][i])}</span><h2>${esc(a.name)}</h2><p>${esc(a.when)}</p><small>${a.code === "academy-popup" ? "미리보기부터 홈페이지 게시까지" : esc(a.result)}</small><strong>${esc(a.action)} ${icon("arrow")}</strong></a>`).join("")}</div>
      <div class="qa-home-bottom"><section class="qa-panel"><h2>이런 일도 맡겨 보세요</h2><div class="qa-shortcuts"><a href="/agents?agent=academy-journal">${icon("file")} 수업일지 만들기 <span>→</span></a><a href="/agents?agent=academy-inquiry">${icon("chat")} 홈페이지 문의 답변 <span>${state.inquiries.length}건 →</span></a><a href="/agents?agent=academy-reenroll">${icon("users")} 재등록 안내 <span>→</span></a><a href="/agents?agent=academy-ledger">${icon("book")} 진도·출결 정리 <span>→</span></a></div></section><section class="qa-panel qa-panel-navy"><span class="eyebrow">CONNECTED WEBSITE</span><h2>소식 하나가,<br>새로운 상담으로.</h2><p>안내를 선택하고 미리 본 뒤 게시하세요.<br>우리 홈페이지의 상담 신청으로 이어집니다.</p><a class="button" href="/agents?agent=academy-popup">홈페이지 팝업 만들기 ${icon("arrow")}</a><a class="qa-light-link" href="/site" target="_blank" rel="noopener">현재 홈페이지 보기 ↗</a></section></div>
      <section class="qa-team-overview"><div class="qa-section-heading"><h2>업무별로 직원 찾기</h2><a href="/agents?view=directory">전체 보기 →</a></div><div class="qa-team-tiles">${AGENT_TEAMS.map((t, i) => `<a href="/agents?view=directory&team=${i}">${icon(symbols[i])}<span><strong>${esc(t.name)}</strong><small>${available.filter((a) => t.codes.includes(a.code)).length}개 업무</small></span>${icon("chevron")}</a>`).join("")}</div></section>`;
    return;
  }
  let team = params.get("team") || "all";
  if (
    ![
      "all",
      "core",
      "pending",
      ...AGENT_TEAMS.map((_, i) => String(i)),
    ].includes(team)
  )
    team = "all";
  body.innerHTML = `<section class="qa-directory" aria-label="전체 직원 목록"><div class="qa-search-row"><label class="qa-search">${icon("search")}<input id="qaAgentSearch" type="search" aria-label="직원 또는 업무 검색" placeholder="예: 상담, 리포트, 홈페이지" value="${esc(params.get("q") || "")}"></label><button class="button secondary" id="qaClearSearch" type="button">초기화</button></div><div class="qa-filters" role="group" aria-label="업무팀 선택">${[["all", `전체 ${state.catalog.length}`], ["core", `핵심 ${available.filter((a) => a.priority).length}`], ...AGENT_TEAMS.map((t, i) => [String(i), t.name]), ["pending", `준비 중 ${state.catalog.length - available.length}`]].map(([id, label]) => `<button type="button" data-team="${id}" aria-pressed="${team === id}">${esc(label)}</button>`).join("")}</div><p id="qaDirectoryCount" role="status" aria-live="polite"></p><div id="qaDirectoryResults"></div></section>`;
  const input = body.querySelector("#qaAgentSearch");
  function render() {
    const query = input.value.trim().toLocaleLowerCase("ko");
    const matches = state.catalog.filter((a) => {
      const t = teamFor(a.code);
      const inTeam =
        team === "all" ||
        (team === "core"
          ? a.priority
          : team === "pending"
            ? !a.available
            : AGENT_TEAMS[Number(team)]?.codes.includes(a.code));
      return (
        inTeam &&
        `${a.name} ${a.code} ${a.description} ${t?.name || ""}`
          .toLocaleLowerCase("ko")
          .includes(query)
      );
    });
    body.querySelector("#qaDirectoryCount").textContent =
      `${matches.length}개 업무 · ${available.length}개 업무 제공 / ${state.catalog.length - available.length}개 준비 중`;
    body
      .querySelectorAll("[data-team]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.team === team)),
      );
    const groups = [
      ...AGENT_TEAMS,
      {
        name: "추가 연결 준비 중",
        description: "아직 제공되지 않는 업무입니다.",
        codes: state.catalog.filter((a) => !teamFor(a.code)).map((a) => a.code),
      },
    ];
    body.querySelector("#qaDirectoryResults").innerHTML = matches.length
      ? groups
          .map((t, i) => {
            const agents = matches.filter((a) => t.codes.includes(a.code));
            if (!agents.length) return "";
            return `<section class="qa-directory-team team-${i}"><div class="qa-section-heading"><h2>${icon(symbols[i] || "clock")} ${esc(t.name)} <span>${agents.length}</span></h2></div><p>${esc(t.description)}</p><div class="qa-directory-grid">${agents.map((a) => `<article class="qa-agent-card ${a.available ? "" : "is-pending"}" data-code="${esc(a.code)}"><div class="qa-agent-meta"><span>${a.priority ? "핵심 직원" : esc(a.code)}</span><span>${!a.available ? "준비 중" : a.code === "academy-popup" ? "홈페이지 바로 게시" : state.connection.ready ? "AI 연결됨" : "AI 연결 필요"}</span></div><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><small>${esc(t.destination || "연결 준비 후 이용할 수 있습니다.")}</small>${a.available ? `<a class="qa-agent-start" href="${taskUrl(a)}" aria-label="${esc(a.name)} 업무 열기">업무 열기 ${icon("arrow")}</a>` : '<span class="qa-agent-pending">연결 준비 중 · 실행할 수 없음</span>'}</article>`).join("")}</div></section>`;
          })
          .join("")
      : '<div class="qa-no-results"><h2>일치하는 직원이 없어요.</h2><p>다른 업무 이름을 검색하거나 초기화를 눌러 전체 직원을 확인하세요.</p></div>';
    const url = new URL(location.href);
    team === "all"
      ? url.searchParams.delete("team")
      : url.searchParams.set("team", team);
    query
      ? url.searchParams.set("q", input.value.trim())
      : url.searchParams.delete("q");
    history.replaceState(null, "", url);
  }
  input.addEventListener("input", render);
  body.querySelector(".qa-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-team]");
    if (!button) return;
    team = button.dataset.team;
    render();
  });
  body.querySelector("#qaClearSearch").addEventListener("click", () => {
    input.value = "";
    team = "all";
    render();
    input.focus();
  });
  render();
}
