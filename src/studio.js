import * as api from "./api.js";
import { esc, field, area, select, checkbox, dateTime } from "./ui.js";
import { DAYS, timeLabel, schedulesAt, today, won } from "../shared/core.js";
import {
  STUDIO_KINDS,
  EXPERIENCE_SAMPLES,
  emptyStudioData,
} from "../shared/studio.js";
import "./studio.css";

const el = (id) => document.getElementById(id);
const button = (text, action, attrs = "", primary = false) =>
  `<button type="button" class="button ${primary ? "primary" : "secondary"}" data-studio="${action}" ${attrs}>${text}</button>`;
const prose = (value) =>
  `<p class="st-prose">${esc(value || "작성한 내용이 이곳에 나타납니다.")}</p>`;
const label = (text, value) =>
  `<section class="st-reading"><span class="eyebrow">${text}</span>${prose(value)}</section>`;
const dates = (c) =>
  (c.sessions || [])
    .map((v) => `${DAYS[v.day]} ${timeLabel(v.start)}–${timeLabel(v.end)}`)
    .join(" · ");
const cardPreview = (kind, d, c, method = "") =>
  `<div class="st-paper"><span class="eyebrow">${kind === "experience" ? "A LITTLE MOMENT OF LEARNING" : kind === "guide" ? "YOUR NEXT CHAPTER" : "OUR LEARNING STORY"}</span><h2>${esc(d.title || STUDIO_KINDS[kind])}</h2><p class="st-caption">${esc(c?.name || "수업 선택")}</p>${kind === "experience" ? `${prose(d.intro)}<div class="st-question">${prose(d.question)}${d.choices.map((v, i) => `<div class="st-choice"><span>${i + 1}</span>${esc(v || "선택지")}</div>`).join("")}</div>${label("정답 · 승인 전 확인", d.choices[d.answer] ? `${Number(d.answer) + 1}. ${d.choices[d.answer]}` : "선택지와 정답을 확인해 주세요.")}${label("생각을 돕는 힌트", d.hint)}${label("선생님의 설명", d.explanation)}` : kind === "guide" ? `${prose(d.audience)}${label("함께 확인한 목표", d.goal)}${label("이렇게 수업합니다", d.plan)}${label("첫 수업을 위한 준비", d.preparation)}${d.questions ? label("더 확인할 이야기", d.questions) : ""}` : `${label("함께한 수업 활동", d.activity)}${label("이 활동을 한 이유", d.why)}${label("다음 수업으로 이어가기", d.next)}`}${method ? label("우리 학원의 가르치는 방식", method) : ""}</div>`;

export async function startStudio() {
  document.body.classList.add("studio-page");
  if (location.pathname === "/learn") return startLearning();
  if (location.pathname === "/welcome") {
    window.addEventListener("hashchange", startWelcome);
    return startWelcome();
  }
  const app = el("app");
  const auth = await api.session();
  if (!auth.actor && auth.demo) await api.login("owner");
  else if (auth.actor?.role !== "owner") {
    app.innerHTML = `<main class="st-container" id="main"><h1>원장님의 수업 스튜디오</h1><p>원장 계정으로 로그인한 뒤 이용해 주세요.</p><a class="button primary" href="/">원장실로 이동</a></main>`;
    return;
  }
  let state = await api.request("/api/studio"),
    tab = "experience",
    selected = null,
    data = emptyStudioData(tab),
    classId = state.classes[0]?.id || "",
    bookingId = "",
    dirty = false,
    busy = false,
    message = "",
    generatorNotes = "",
    librarySearch = "",
    conflictingItem = false,
    messageError = false;
  const initial = new URLSearchParams(location.search);
  if (initial.get("kind") === "guide") {
    const requestedClass = state.classes.find(
      (c) => c.id === initial.get("classId"),
    );
    const requestedBooking = state.bookings.find(
      (b) =>
        b.id === initial.get("bookingId") && b.classId === requestedClass?.id,
    );
    tab = "guide";
    data = emptyStudioData(tab);
    data.preparation = state.settings.studioProfile?.preparation || "";
    if (requestedClass) classId = requestedClass.id;
    if (requestedBooking) bookingId = requestedBooking.id;
    message = requestedBooking
      ? "선택한 상담과 수업을 연결했습니다. 보호자와 확인한 내용으로 안내서를 작성해 주세요."
      : "상담 안내서를 준비합니다. 연결할 수업과 상담을 확인해 주세요.";
  }
  const profile = () =>
    state.settings.studioProfile || {
      method: "",
      feedback: "",
      preparation: "",
    };
  const requestIds = new Map();
  const currentClass = () => state.classes.find((c) => c.id === classId);
  const notify = (value, error = false) => {
    message = value;
    messageError = error;
    if (el("studio-status")) {
      el("studio-status").textContent = value;
      el("studio-status").classList.toggle("st-error", error);
      if (error) focusSection("studio-status");
    }
  };
  const guard = () =>
    !dirty || confirm("저장하지 않은 내용을 버리고 이동할까요?");
  const reset = (kind) => {
    tab = kind;
    selected = null;
    bookingId = "";
    data = emptyStudioData(kind);
    if (kind === "guide") data.preparation = profile().preparation;
    dirty = false;
    conflictingItem = false;
    librarySearch = "";
  };
  const refresh = async () => {
    state = await api.request("/api/studio");
    if (selected)
      selected = state.studioItems.find((x) => x.id === selected.id);
  };
  function focusSection(id) {
    const target = el(id);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function lockForms(locked) {
    for (const control of app.querySelectorAll(
      "form input, form select, form textarea, form button, [data-studio]",
    )) {
      if (locked) {
        if (!control.disabled) {
          control.dataset.studioLocked = "1";
          control.disabled = true;
        }
      } else if (control.dataset.studioLocked) {
        control.disabled = false;
        delete control.dataset.studioLocked;
      }
    }
    app.setAttribute("aria-busy", String(locked));
  }
  function reuse(item) {
    selected = null;
    tab = item.kind;
    data = structuredClone(item.data);
    classId = item.classId;
    bookingId = "";
    if (tab === "guide") {
      data = emptyStudioData("guide");
      data.preparation = profile().preparation || "";
    }
    if (tab === "lesson") data.teacherNotes = "";
    conflictingItem = false;
    dirty = true;
    message =
      tab === "guide"
        ? "수업을 새 안내서에 연결했습니다. 이전 가정의 내용은 가져오지 않았으며 원본 공유는 유지됩니다."
        : "새 초안으로 가져왔습니다. 원본 공유는 유지됩니다. 이번 수업·수신 대상에 맞게 확인한 뒤 저장하세요.";
    messageError = false;
    render();
    focusSection("studio-editor");
  }
  const editFields = () => {
    const common = `${field("제목", "title", data.title, "text", 'required maxlength="100"')}`;
    if (tab === "experience")
      return (
        common +
        area(
          "체험 소개",
          "intro",
          data.intro,
          'required maxlength="1500" rows="2"',
        ) +
        area(
          "함께 풀어 볼 질문",
          "question",
          data.question,
          'required maxlength="1500" rows="2"',
        ) +
        `<div class="st-options">${data.choices.map((v, i) => field(`선택지 ${i + 1}`, `choice${i}`, v, "text", 'required maxlength="200"')).join("")}</div>` +
        select(
          "정답",
          "answer",
          [
            [0, "선택지 1"],
            [1, "선택지 2"],
            [2, "선택지 3"],
          ],
          data.answer,
        ) +
        area(
          "첫 시도 후 보여 줄 힌트",
          "hint",
          data.hint,
          'required maxlength="1500" rows="2"',
        ) +
        area(
          "체험을 마친 뒤 선생님의 설명",
          "explanation",
          data.explanation,
          'required maxlength="1500" rows="3"',
        )
      );
    const fields =
      tab === "guide"
        ? [
            ["audience", "받는 분의 호칭", 2],
            ["goal", "상담에서 확인한 목표", 3],
            ["plan", "함께 검토한 수업과 이유", 3],
            ["preparation", "첫 수업 준비", 2],
            ["questions", "추가 확인 사항 · 선택", 2],
          ]
        : [
            ["activity", "함께한 수업 활동", 3],
            ["why", "이 활동을 한 이유", 3],
            ["next", "다음 수업 준비", 2],
            ["teacherNotes", "교사용 준비 메모 · 공유되지 않음", 3],
          ];
    return (
      common +
      fields
        .map(([key, title, rows]) =>
          area(
            title,
            key,
            data[key],
            `maxlength="1500" rows="${rows}" ${["questions", "teacherNotes"].includes(key) ? "" : "required"}`,
          ),
        )
        .join("")
    );
  };
  function readEditor() {
    const form = el("studio-editor");
    if (!form) return;
    const values = Object.fromEntries(new FormData(form));
    classId = values.classId;
    bookingId = values.bookingId || "";
    const next = {};
    for (const key of Object.keys(data))
      if (key !== "choices")
        next[key] =
          key === "answer" ? Number(values[key]) : (values[key] ?? "");
    if (tab === "experience")
      next.choices = [0, 1, 2].map((i) => values["choice" + i]);
    data = next;
  }
  function editorPreview() {
    const c = currentClass();
    return (
      cardPreview(tab, data, c, profile().method) +
      (tab !== "experience" && c
        ? `<div class="st-panel st-preview-facts"><span class="eyebrow">함께 전달되는 수업 정보</span><p>${esc(dates({ sessions: schedulesAt(c, today()) }))}</p><p>등록된 수강료 ${won(c.fee)}</p><p>${esc(state.settings.address)} · ${esc(state.settings.phone)}</p><small>등록 확정과 수강료 적용 기간은 상담에서 확인합니다.</small></div>`
        : "")
    );
  }
  function renderPreview() {
    if (el("studio-preview")) el("studio-preview").innerHTML = editorPreview();
  }
  function render() {
    const drafts = state.studioItems.filter((x) => x.status === "draft").length;
    const stale = state.studioItems.filter(
      (x) => x.status !== "revoked" && !x.current,
    ).length;
    const events = state.studioEvents;
    const items = state.studioItems.filter((x) => x.kind === tab);
    document.title = "수업 스튜디오 · " + state.settings.name;
    app.innerHTML = `<div class="st-container"><header class="st-header"><a class="st-brand" href="/"><span class="brand-mark">결</span><span>원장실 <small>수업 스튜디오</small></span></a><nav aria-label="원장실 메뉴"><a href="/">원장실</a><a href="/start">웹사이트 디자인</a><a href="/learn" target="_blank" rel="noopener">공개 수업 체험 ↗</a></nav></header><main id="main"><section class="st-hero"><div><span class="eyebrow">YOUR WAY OF TEACHING</span><h1>가르치는 방식이<br>학원의 얼굴이 됩니다.</h1><p>한 번의 수업 체험, 한 가정을 위한 안내서.<br>원장님의 자료를 읽기 좋은 경험으로 준비하세요.</p></div><aside><span class="eyebrow">OUR STUDIO</span><strong>${esc(state.settings.name)}</strong><p>자료 준비 → 초안 검토 → 승인·공유</p><a class="st-work-link" href="#studio-work">자료 만들기로 이동 ↓</a><a href="/site" target="_blank" rel="noopener">우리 홈페이지 보기 ↗</a></aside></section><div class="st-stats"><div><strong>${drafts}</strong><span>검토할 초안</span></div><div><strong>${stale}</strong><span>정보 변경 · 재확인 필요</span></div><div><strong>${events.length} / ${events.filter((e) => e.completed).length}</strong><span>체험 시작 / 완료 · 세션 기준</span></div><div><strong>${events.filter((e) => e.consulted).length}</strong><span>상담 버튼 선택 · 등록 수 아님</span></div></div><nav id="studio-work" class="st-tabs" aria-label="수업 스튜디오 업무">${Object.entries(
      STUDIO_KINDS,
    )
      .map(([key, title]) =>
        button(
          title,
          "tab",
          `data-kind="${key}" aria-pressed="${key === tab}"`,
          key === tab,
        ),
      )
      .join(
        "",
      )}${button("우리 학원 기준", "tab", `data-kind="profile" aria-pressed="${tab === "profile"}"`, tab === "profile")}</nav><p id="studio-status" tabindex="-1" class="st-status ${messageError ? "st-error" : ""}" role="status" aria-live="polite">${esc(message)}</p>${
      tab === "profile"
        ? `<div class="st-grid"><form id="studio-profile" class="st-panel form-stack"><span class="eyebrow">TEACHING PRINCIPLES</span><h2>모든 자료가 참고하는 기준</h2>${area("가르치는 방식", "method", profile().method, 'required maxlength="1500" rows="4" placeholder="예: 답을 알려 주기 전에 풀이의 이유를 먼저 묻습니다."')}${area("피드백 기준", "feedback", profile().feedback, 'required maxlength="1500" rows="3" placeholder="예: 학생이 설명한 과정에서 확인한 부분만 안내합니다."')}${area("첫 수업 준비 안내", "preparation", profile().preparation, 'required maxlength="1500" rows="3"')}<button class="button primary" type="submit">학원 기준 저장</button><p class="st-caption">기준을 바꾸면 이전 자료는 재확인이 필요합니다. 학생 개인정보는 넣지 마세요.</p></form><aside class="st-panel st-note"><span class="eyebrow">A PERSONAL TOUCH</span><h2>우리 학원다운<br>설명이 쌓이는 곳.</h2><p>공통 문구보다 실제 수업의 기준을 적어 주세요. 공개 체험과 상담 안내에 원장님이 확인한 기준이 함께 담깁니다.</p><p>자료는 자동으로 게시되지 않습니다. 변경된 기준은 각 자료를 다시 저장하고 승인해야 반영됩니다.</p></aside></div>`
        : `<div class="st-grid"><section class="st-panel"><div class="st-editor-heading"><div><span class="eyebrow">01 · PREPARE</span><h2>${STUDIO_KINDS[tab]} 만들기</h2></div>${button("새로 만들기", "new")}</div>${
            tab === "experience"
              ? `<section class="st-starter"><span class="eyebrow">첫 자료는 가볍게</span><h3>분야별 예시에서 시작하세요.</h3><p>질문 하나를 고르고, 우리 학원의 설명으로 다듬습니다.</p><div class="st-sample-row">${select(
                  "예시 선택",
                  "sample",
                  Object.entries(EXPERIENCE_SAMPLES).map(([k, v]) => [
                    k,
                    v.label,
                  ]),
                  "math",
                  'id="studio-sample"',
                )}${button("예시 불러오기", "sample")}</div><p class="st-caption">교사 검토용 예시 · 저장과 승인 후 공개됩니다.</p></section><details class="st-assist"><summary>예시로 시작 · AI 초안 도우미</summary><div class="form-stack"><p class="st-caption">위 예시를 불러오거나, 연결된 AI에 공개용 수업 자료를 전달할 수 있습니다.</p>${area("AI에게 줄 공개용 수업 자료", "notes", generatorNotes, 'id="studio-notes" maxlength="6000" rows="4"')}${checkbox("학생 개인정보가 없는 자료이며 AI 제공자에게 전달하는 데 동의합니다.", "confirmPublic", false, 'id="studio-ai-consent"')}${button(state.generator.configured ? "AI 체험 초안 만들기" : "AI 연결 전 · 직접 작성 가능", "generate", state.generator.configured ? "" : "disabled")}<p class="st-caption">${state.generator.configured ? `Gemini · ${esc(state.generator.model)} · 생성 후 검토 필요` : "AI 키·모델이 연결되면 활성화됩니다. 예시와 직접 작성은 바로 사용할 수 있습니다."}</p></div></details>`
              : `<p class="st-caption">${tab === "guide" ? "보호자와 실제로 확인한 목표와 수업만 적습니다. 민감한 상담 내용은 넣지 마세요." : "반 전체의 활동을 설명합니다. 관찰하지 않은 개인의 이해도·성과를 만들지 않습니다."}</p>`
          }<form id="studio-editor" class="form-stack" tabindex="-1">${select(
            "연결할 수업",
            "classId",
            state.classes.map((c) => [c.id, c.name]),
            classId,
            "required",
          )}${tab === "guide" ? select("기존 상담 연결 · 선택", "bookingId", [["", "직접 작성"], ...state.bookings.filter((b) => b.classId === classId).map((b) => [b.id, `${b.name} · ${b.date}`])], bookingId) : ""}${editFields()}${conflictingItem ? `<div class="st-conflict" role="alert"><strong>다른 창에서 이 자료를 수정했습니다.</strong><p>입력한 내용은 그대로 유지됩니다. 새 초안으로 보관하거나 목록에서 최신 자료를 다시 열어 주세요.</p>${button("입력 내용으로 새 초안 저장", "save-copy")}</div>` : ""}<div class="st-editor-actions"><button class="button primary" type="submit" ${conflictingItem ? "disabled" : ""}>초안 저장</button>${button("미리보기·승인으로 이동 ↓", "preview")}<span class="st-caption">${selected ? `수정 v${selected.version} · 수정 저장 시 이전 공유 중지` : "검토 전에는 공개되지 않습니다."}</span></div></form></section><aside id="studio-review" tabindex="-1" class="st-preview-column"><div class="st-preview-heading"><span class="eyebrow">02 · REVIEW</span><span>읽는 분의 화면 · 검토용</span></div><button type="button" data-studio="editor" class="st-return-edit">작성 내용으로 돌아가기 ↑</button><div id="studio-preview">${editorPreview()}</div>${
            selected
              ? `<section id="studio-approval" tabindex="-1" class="st-panel st-approval"><h3>${selected.status === "published" ? "승인된 자료" : "내용을 확인하고 승인하세요"}</h3>${!selected.current ? '<p class="st-error">가격·시간표·학원 기준이 달라졌습니다. 초안을 다시 저장해 최신 정보를 반영하세요.</p>' : ""}${
                  selected.status === "draft"
                    ? `<form id="studio-publish" class="form-stack">${checkbox(tab === "experience" ? "내용·정답·공개 권한을 확인했습니다. 홈페이지에 공개합니다." : "수신 대상과 내용을 확인했습니다. 링크를 받은 분에게 공유합니다.", "confirmed", false, "required")}${
                        tab !== "experience"
                          ? select(
                              "공유 유효기간",
                              "days",
                              [
                                [1, "1일"],
                                [7, "7일"],
                                [14, "14일"],
                                [30, "30일"],
                              ],
                              7,
                            )
                          : ""
                      }<button type="submit" class="button primary" ${selected.current ? "" : "disabled"}>검토 완료 · ${tab === "experience" ? "공개" : "공유 승인"}</button></form>`
                    : ""
                }${selected.status === "published" && selected.current ? `<p class="st-caption">${dateTime(selected.approvedAt)} 승인${selected.expiresAt ? ` · ${dateTime(selected.expiresAt)}까지` : ""}</p><div class="entry-actions">${button("링크 복사", "copy")}${selected.kind === "experience" ? `<a class="button secondary" href="/learn?id=${selected.id}" target="_blank" rel="noopener">체험 확인 ↗</a>` : `<a class="button secondary" href="${shareUrl(selected)}" target="_blank" rel="noopener noreferrer">안내서 확인 ↗</a>`}</div>${selected.kind !== "experience" ? '<p class="st-caption">링크를 가진 분이 열 수 있습니다. 필요한 보호자에게만 전달하세요.</p>' : ""}<p id="studio-link" class="st-caption"></p>` : ""}${button("이 자료로 새 초안", "reuse", `data-id="${selected.id}"`)}${selected.status !== "revoked" ? button("공개·공유 중지", "revoke") : '<p class="st-caption">공유를 중지한 자료입니다. 다시 저장하면 새 초안으로 준비됩니다.</p>'}${tab === "lesson" ? `<details class="st-assist"><summary>교사용 준비와 공개용 수업 소개</summary>${label("교사용 메모 · 보호자에게 공유되지 않음", data.teacherNotes)}${label("공개용 소개 초안 · 별도 콘텐츠 검토 필요", `${data.activity}\n\n${data.why}`)}<a href="/#content">콘텐츠 직원에서 검토·작성 →</a></details>` : ""}</section>`
              : '<p class="st-caption">초안을 저장하면 검토·승인할 수 있습니다.</p>'
          }</aside></div><section id="studio-library" class="st-library"><div class="st-editor-heading"><div><span class="eyebrow">STUDIO LIBRARY</span><h2>작성한 자료 ${items.length}</h2></div>${field("자료 검색", "librarySearch", librarySearch, "search", 'id="studio-library-search" placeholder="제목 또는 수업명"')}</div>${items.length ? `<div class="st-library-grid">${items.map((x) => `<article class="st-library-card" data-library-id="${x.id}"><span class="st-tag">${!x.current && x.status !== "revoked" ? "정보 변경 · 재확인" : x.status === "published" ? (x.expiresAt && x.expiresAt <= new Date().toISOString() ? "공유 만료" : "승인 완료") : x.status === "draft" ? "검토할 초안" : "공유 중지"}</span><strong>${esc(x.data.title)}</strong><span>${esc(x.source.class.name)} · v${x.version}</span><small>${dateTime(x.updatedAt)}</small><div class="st-library-actions">${button("열기", "open", `data-id="${x.id}"`)}${button("새 초안으로 쓰기", "reuse", `data-id="${x.id}"`)}</div></article>`).join("")}</div>` : '<p class="st-empty">첫 자료를 만들어 보세요. 초안부터 차근차근 보관됩니다.</p>'}<p id="studio-search-empty" class="st-empty" hidden>검색한 제목이나 수업의 자료가 없습니다.</p></section>`
    }</main><footer class="st-footer"><span>원장님의 기준으로, 한 걸음씩.</span><span>${api.auth.demo ? "예시 학원 · 로컬 체험" : "로컬 계정"} · 서버 저장 · 외부 문자 미연결</span></footer></div>`;
    filterLibrary();
  }
  function filterLibrary() {
    let visible = 0;
    const query = librarySearch.trim().toLocaleLowerCase();
    for (const card of app.querySelectorAll("[data-library-id]")) {
      const item = state.studioItems.find(
        (x) => x.id === card.dataset.libraryId,
      );
      card.hidden = !`${item.data.title} ${item.source.class.name}`
        .toLocaleLowerCase()
        .includes(query);
      if (!card.hidden) visible++;
    }
    if (el("studio-search-empty"))
      el("studio-search-empty").hidden = !query || visible > 0;
  }
  function shareUrl(x) {
    return x.kind === "experience"
      ? `/learn?id=${x.id}`
      : `/welcome#${x.id}.${x.secret}`;
  }
  async function mutate(type, payload) {
    lockForms(true);
    const key = type + JSON.stringify(payload);
    const id = requestIds.get(key) || crypto.randomUUID();
    requestIds.set(key, id);
    let value;
    try {
      value = await api.command(type, payload, state.revision, id);
      await refresh();
      requestIds.delete(key);
    } catch (error) {
      if (error.status && error.status !== 500) requestIds.delete(key);
      throw error;
    }
    dirty = false;
    conflictingItem = false;
    if (value.itemId)
      selected = state.studioItems.find((x) => x.id === value.itemId);
    message = value.message;
    messageError = false;
    render();
    if (type === "studio.save" || type === "studio.publish")
      focusSection("studio-approval");
  }
  app.addEventListener("input", (e) => {
    if (e.target.closest("#studio-editor")) {
      readEditor();
      dirty = true;
      renderPreview();
    }
    if (e.target.closest("#studio-profile")) dirty = true;
    if (e.target.id === "studio-notes") generatorNotes = e.target.value;
    if (e.target.id === "studio-library-search") {
      librarySearch = e.target.value;
      filterLibrary();
    }
  });
  app.addEventListener("change", (e) => {
    if (e.target.name === "classId") {
      readEditor();
      bookingId = "";
      render();
    }
  });
  app.addEventListener("submit", async (e) => {
    if (
      !["studio-editor", "studio-publish", "studio-profile"].includes(
        e.target.id,
      )
    )
      return;
    e.preventDefault();
    if (busy) return;
    busy = true;
    const submitter = e.submitter;
    if (submitter) submitter.disabled = true;
    try {
      if (e.target.id === "studio-editor") {
        readEditor();
        await mutate("studio.save", {
          id: selected?.id,
          version: selected?.version,
          kind: tab,
          classId,
          bookingId,
          data,
        });
      } else if (e.target.id === "studio-profile")
        await mutate(
          "studio.profile",
          Object.fromEntries(new FormData(e.target)),
        );
      else {
        if (dirty) throw Error("변경한 내용을 먼저 초안으로 저장해 주세요.");
        await mutate("studio.publish", {
          id: selected.id,
          version: selected.version,
          confirmed: e.target.elements.confirmed.checked,
          days: Number(e.target.elements.days?.value || 7),
        });
      }
    } catch (error) {
      if (error.status === 409) {
        const latest = await api.request("/api/studio").catch(() => null);
        if (latest) {
          state = latest;
          const updated =
            selected && latest.studioItems.find((x) => x.id === selected.id);
          conflictingItem =
            !!selected && (!updated || updated.version !== selected.version);
          if (tab !== "profile") render();
        }
      }
      notify(error.message, true);
    } finally {
      busy = false;
      lockForms(false);
      if (submitter) submitter.disabled = false;
    }
  });
  app.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-studio]");
    if (!b || busy || b.disabled) return;
    const action = b.dataset.studio;
    busy = true;
    try {
      if (
        [
          "tab",
          "new",
          "open",
          "sample",
          "reuse",
          "generate",
          "revoke",
        ].includes(action) &&
        !guard()
      )
        return;
      if (action === "preview") focusSection("studio-review");
      if (action === "editor") focusSection("studio-editor");
      if (action === "reuse")
        reuse(state.studioItems.find((x) => x.id === b.dataset.id));
      if (action === "save-copy") {
        readEditor();
        await mutate("studio.save", { kind: tab, classId, bookingId, data });
      }
      if (action === "tab" || action === "new") {
        reset(action === "tab" ? b.dataset.kind : tab);
        render();
      }
      if (action === "open") {
        selected = state.studioItems.find((x) => x.id === b.dataset.id);
        tab = selected.kind;
        data = structuredClone(selected.data);
        classId = selected.classId;
        bookingId = selected.bookingId;
        dirty = false;
        conflictingItem = false;
        render();
        focusSection("studio-editor");
      }
      if (action === "sample") {
        const { label: unused, ...sample } =
          EXPERIENCE_SAMPLES[el("studio-sample").value];
        data = structuredClone(sample);
        dirty = true;
        render();
        focusSection("studio-editor");
      }
      if (action === "revoke")
        await mutate("studio.revoke", {
          id: selected.id,
          version: selected.version,
        });
      if (action === "copy") {
        if (dirty)
          throw Error(
            "화면에 수정한 내용이 있습니다. 저장하고 승인한 뒤 링크를 공유해 주세요.",
          );
        if (
          selected.expiresAt &&
          selected.expiresAt <= new Date().toISOString()
        )
          throw Error(
            "공유 기간이 지났습니다. 다시 저장하고 승인해 새 링크를 만들어 주세요.",
          );
        const url = new URL(shareUrl(selected), location.origin).href;
        try {
          await navigator.clipboard.writeText(url);
          notify("링크를 복사했습니다.");
        } catch {
          el("studio-link").textContent = url;
          notify("아래 링크를 선택해 복사해 주세요.");
        }
      }
      if (action === "generate") {
        b.disabled = true;
        lockForms(true);
        notify("AI가 체험 초안을 준비하고 있습니다. 입력 자료를 유지합니다.");
        const result = await api.request("/api/studio/generate", {
          method: "POST",
          body: JSON.stringify({
            notes: generatorNotes,
            confirmPublic: el("studio-ai-consent").checked,
          }),
        });
        data = result.data;
        dirty = true;
        message = "AI 초안입니다. 정답·힌트·설명을 검토한 뒤 저장해 주세요.";
        render();
      }
    } catch (error) {
      notify(error.message, true);
    } finally {
      busy = false;
      lockForms(false);
      b.disabled = false;
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  render();
}

async function startLearning() {
  const app = el("app"),
    info = await api.request("/api/studio/public");
  const requestIds = new Map();
  async function command(type, payload) {
    const key = type + JSON.stringify(payload);
    const id = requestIds.get(key) || crypto.randomUUID();
    requestIds.set(key, id);
    try {
      const value = await api.publicCommand(type, payload, id);
      requestIds.delete(key);
      return value;
    } catch (error) {
      if (error.status && error.status !== 500) requestIds.delete(key);
      throw error;
    }
  }
  let active = null,
    attempt = null,
    result = null,
    chosenAnswer = null,
    busy = false;
  const wanted = new URLSearchParams(location.search).get("id");
  document.title = "수업을 경험해 보세요 · " + info.academy.name;
  function render() {
    app.innerHTML = `<div class="st-public"><header class="st-header"><a class="st-brand" href="/site">${esc(info.academy.name)}</a><a href="/site">학원 홈페이지 ↗</a></header><main id="main"><section class="st-public-title"><span class="eyebrow">A LITTLE MOMENT OF LEARNING</span><h1>설명보다 먼저,<br>작은 배움의 경험.</h1><p>문제 하나를 함께 생각하며<br>우리 학원의 수업 방식을 만나 보세요.</p></section>${active ? `<div class="st-experience" id="learning-card" tabindex="-1"><span class="st-tag">${result?.completed ? "체험 완료" : attempt ? "02 · 함께 생각하기" : "01 · 수업 만나기"}</span><h2>${esc(active.title)}</h2>${prose(active.intro)}${attempt ? `<form id="experience-answer"><h3 id="learning-question" tabindex="-1">${esc(attempt.question)}</h3><div class="st-answer-options" role="radiogroup" aria-labelledby="learning-question">${attempt.choices.map((x, i) => `<label class="st-answer ${result?.completed && i === result.answer ? "st-answer-correct" : ""}"><input type="radio" name="answer" value="${i}" required ${chosenAnswer === i ? "checked" : ""} ${result?.completed ? "disabled" : ""}><span><b>${i + 1}</b><span>${esc(x)}${result?.completed && i === result.answer ? '<small class="st-answer-label">정답</small>' : ""}${result?.completed && chosenAnswer === i ? '<small class="st-answer-label">내가 고른 답</small>' : ""}</span></span></label>`).join("")}</div>${result ? `<div id="learning-feedback" tabindex="-1" class="st-feedback" role="status"><h3>${result.completed ? "선생님의 설명을 만나 보세요" : "한 번 더 생각해 볼까요?"}</h3>${prose(result.completed ? result.explanation : result.hint)}${result.completed && result.feedback ? prose(result.feedback) : ""}</div>` : ""}${result?.completed ? '<p class="st-caption">한 문제로 학습 수준을 판정하지 않습니다. 실제 수업과 반 선택은 선생님과 상담해 주세요.</p><button type="button" class="button primary" id="experience-consult">이 수업 상담하기 →</button>' : `<button class="button primary" type="submit">${result ? "다시 생각한 답 확인" : "선택한 답 확인"}</button>`}</form>` : `<div class="st-method">${label("우리 학원의 가르치는 방식", active.method || "예제를 함께 살펴보고 선택한 이유를 설명해 봅니다.")}</div><button type="button" class="button primary" id="experience-start">3분 수업 시작하기 →</button><p class="st-caption">이름·연락처 없이 체험할 수 있습니다.</p>`}<button type="button" class="button ghost" id="experience-back">다른 체험 보기</button><p id="experience-status" class="st-status" role="status"></p></div>` : `<div class="st-public-grid">${info.experiences.length ? info.experiences.map((x) => `<article class="st-course"><span class="eyebrow">${esc(x.grade)} · ${esc(x.subject)}</span><h2>${esc(x.title)}</h2>${prose(x.intro)}<button type="button" class="button secondary" data-experience="${x.id}">수업 만나기 ↗</button></article>`).join("") : '<div class="st-empty"><h2>수업 체험을 준비하고 있습니다.</h2><p>원장님이 검토한 체험이 이곳에 공개됩니다.</p><a href="/site">학원 소개 보기 →</a></div>'}</div>`}</main><footer class="st-footer"><span>${esc(info.academy.name)}</span><span>작은 시도에서 시작하는 배움.</span></footer></div>`;
  }
  async function run(work) {
    if (busy) return;
    busy = true;
    try {
      app.setAttribute("aria-busy", "true");
      await work();
    } catch (error) {
      if (el("experience-status"))
        el("experience-status").textContent = error.message;
    } finally {
      busy = false;
      app.setAttribute("aria-busy", "false");
    }
  }
  function focusLearning(id) {
    const target = el(id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  app.addEventListener("click", (e) => {
    if (
      !e.target.closest(
        "[data-experience], #experience-start, #experience-back, #experience-consult",
      )
    )
      return;
    run(async () => {
      const item = e.target.closest("[data-experience]");
      if (item) {
        active = info.experiences.find((x) => x.id === item.dataset.experience);
        chosenAnswer = null;
        render();
        focusLearning("learning-card");
      }
      if (e.target.id === "experience-start") {
        attempt = await command("studio.start", { id: active.id });
        render();
        focusLearning("learning-question");
      }
      if (e.target.id === "experience-back") {
        active = attempt = result = chosenAnswer = null;
        render();
        el("main").scrollIntoView({ block: "start", behavior: "instant" });
      }
      if (e.target.id === "experience-consult") {
        const value = await command("studio.consult", {
          token: attempt.token,
        });
        location.href = value.href;
      }
    });
  });
  app.addEventListener("submit", (e) => {
    if (e.target.id !== "experience-answer") return;
    e.preventDefault();
    const submittedAnswer = Number(new FormData(e.target).get("answer"));
    run(async () => {
      chosenAnswer = submittedAnswer;
      result = await command("studio.answer", {
        token: attempt.token,
        answer: submittedAnswer,
      });
      render();
      focusLearning("learning-feedback");
    });
  });
  active = info.experiences.find((x) => x.id === wanted) || null;
  render();
}

async function startWelcome() {
  const app = el("app");
  const requestedHash = location.hash;
  const [id, secret] = requestedHash.slice(1).split(".");
  document.title = "학원에서 전하는 안내";
  try {
    const guide = await api.request("/api/studio/read", {
      method: "POST",
      body: JSON.stringify({ id, secret }),
    });
    if (location.hash !== requestedHash) return;
    app.innerHTML = `<div class="st-welcome"><header class="st-header"><a class="st-brand" href="/site">${esc(guide.academy.name)}</a><button type="button" class="button secondary" id="guide-print">인쇄·PDF 저장</button></header><main id="main">${cardPreview(guide.kind, guide.data, guide.class, guide.method)}<section class="st-paper st-course-info"><span class="eyebrow">CLASS INFORMATION</span><h2>수업과 방문 안내</h2><dl><div><dt>수업</dt><dd>${esc(guide.class.name)}</dd></div><div><dt>일정</dt><dd>${esc(dates(guide.class))}</dd></div><div><dt>등록된 수강료</dt><dd>${won(guide.class.fee)}</dd></div><div><dt>위치</dt><dd>${esc(guide.academy.address)}</dd></div><div><dt>연락처</dt><dd>${esc(guide.academy.phone)}</dd></div></dl><p class="st-caption">${esc(dateTime(guide.approvedAt))} 확인 기준입니다. 수강료의 적용 기간·추가 비용·등록 확정은 학원에 확인해 주세요.</p><p class="st-caption">이 안내는 ${esc(dateTime(guide.expiresAt))}까지 열 수 있습니다. 필요한 보호자만 링크를 보관해 주세요.</p></section></main><footer class="st-footer">${esc(guide.academy.name)} · 함께 확인한 내용을 차근차근.</footer></div>`;
    el("guide-print").onclick = () => window.print();
  } catch (error) {
    if (location.hash !== requestedHash) return;
    app.innerHTML = `<main class="st-welcome st-empty" id="main"><span class="eyebrow">PRIVATE GUIDE</span><h1>안내를 다시 확인해 주세요.</h1><p>${esc(error.message)}</p><a href="/site" class="button secondary">학원 홈페이지로</a></main>`;
  }
}
