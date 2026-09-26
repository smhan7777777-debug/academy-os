import * as api from "./api.js";
import { esc, icon } from "./ui.js";
import { brand, workspaceNav, workspaceTrail, schoolNav } from "./brand.js";
import { renderTeamHub } from "./agent-directory.js";
import { announcementHtml } from "../shared/announcements.js";
import "./agent-quick.css";

const request = (path, body) =>
  api.request(path, { method: "POST", body: JSON.stringify(body) });
const channelNames = {
  naver_place: "네이버 플레이스",
  kakao_map: "카카오맵",
  google_gbp: "구글",
  karrot: "당근",
};
function textResult(v) {
  if (typeof v === "string")
    return v
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]*>/g, " ");
  if (Array.isArray(v)) return v.map(textResult).join("\n\n");
  if (v && typeof v === "object")
    return ["body", "answer", "text", "report", "content"].find(
      (k) => typeof v[k] === "string",
    )
      ? textResult(
          v[
            ["body", "answer", "text", "report", "content"].find(
              (k) => typeof v[k] === "string",
            )
          ],
        )
      : Object.values(v).map(textResult).join("\n\n");
  return String(v ?? "");
}
export async function startQuickAgents() {
  document.body.classList.add("quick-agent-page");
  const app = document.querySelector("#app");
  let auth = await api.session();
  if (!auth.actor && auth.demo) auth = await api.login("owner");
  if (auth.actor?.role !== "owner") {
    app.innerHTML = `<main class="qa-shell"><h1>원장 로그인이 필요합니다.</h1>${schoolNav()}</main>`;
    return;
  }
  let state = await api.request("/api/agent-workspace");
  const params = new URLSearchParams(location.search);
  const code = params.get("agent") || "";
  const selected = state.catalog.find((a) => a.code === code);
  document.title = `${code === "academy-popup" ? "홈페이지 팝업" : selected?.name || "AI 직원팀"} · 배움결`;
  app.innerHTML = `<main class="qa-shell" id="main"><header class="qa-header"><a href="/#today" aria-label="배움결 · 원장실 홈">${brand("우리 학원 직원팀")}</a>${workspaceNav("agents")}</header>${workspaceTrail("agents", code === "academy-popup" ? "팝업·소식" : selected?.name || "")}<div id="qaContent"></div><p id="qaStatus" role="status" aria-live="polite"></p></main>`;
  const content = app.querySelector("#qaContent");
  const note = (message, error = false) => {
    const el = app.querySelector("#qaStatus");
    el.textContent = message;
    el.className = error ? "qa-status error-note" : "qa-status form-note";
  };
  const refresh = async () => {
    state = await api.request("/api/agent-workspace");
  };
  function heading(title, description, label = "OUR ACADEMY TEAM") {
    return `<div class="qa-heading"><div><span class="eyebrow">${label}</span><h1>${title}</h1><p>${description}</p></div>${code ? '<a class="button secondary" href="/agents">← AI 직원팀으로</a>' : ""}</div>`;
  }
  function hub() {
    renderTeamHub(content, state);
  }
  async function popup() {
    let options = {
      kind: "enrollment",
      classId: "",
      days: 14,
      delay: 0,
      tone: "navy",
      layout: "card",
    };
    let preview = null,
      sequence = 0,
      pending = true,
      publishing = false,
      published = false,
      key = crypto.randomUUID(),
      replaceId = null;
    const chips = (name, choices, current) =>
      choices
        .map(
          ([v, t]) =>
            `<button type="button" class="qa-choice ${String(v) === String(current) ? "selected" : ""}" data-choice="${name}" data-value="${v}" aria-pressed="${String(v) === String(current)}">${t}</button>`,
        )
        .join("");
    content.innerHTML =
      heading(
        "홈페이지에 소식을 띄워 보세요.",
        "안내 선택 → 홈페이지 미리보기 → 게시. 글을 처음부터 쓰지 않아도 됩니다.",
        "WEBSITE · POPUP STUDIO",
      ) +
      `<div class="qa-studio"><section class="qa-panel qa-config"><div class="qa-section-number">01 <span>안내 선택</span></div><h2>무엇을 알릴까요?</h2><div class="qa-choices">${chips("kind", [["enrollment", "수강 상담"], ["consultation", "상담 안내"], ...(state.experiences ? [["experience", "수업 체험"]] : [])], options.kind)}</div><label class="qa-field">연결할 수업<select id="qaClass"><option value="">학원 전체</option>${state.classes.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("")}</select></label><h3>얼마 동안 보여줄까요?</h3><div class="qa-choices">${chips(
        "days",
        [
          [7, "1주"],
          [14, "2주"],
          [30, "한 달"],
        ],
        options.days,
      )}</div><h3>표시 방식</h3><div class="qa-choices">${chips(
        "layout",
        [
          ["card", "팝업 카드"],
          ["bar", "하단 안내 띠"],
        ],
        options.layout,
      )}</div><h3>색상</h3><div class="qa-choices qa-swatches">${chips(
        "tone",
        [
          ["navy", "딥 네이비"],
          ["teal", "포레스트 틸"],
          ["plum", "플럼"],
        ],
        options.tone,
      )}</div><details class="qa-details"><summary>문구·게시 시작일 직접 바꾸기</summary><label class="qa-field">제목<input id="qaTitle" maxlength="100"></label><label class="qa-field">내용<textarea id="qaBody" rows="5" maxlength="5000"></textarea></label><label class="qa-field">게시 시작<select id="qaDelay"><option value="0">오늘</option><option value="1">내일</option><option value="7">다음 주</option></select></label><button type="button" class="button secondary" id="qaResetCopy">선택한 안내 문구로 되돌리기</button></details><p class="qa-source">${icon("check")} ${esc(state.school.name)}의 수업 정보로 준비<br><small>선택형 서식입니다. AI 연결 없이도 게시됩니다.</small></p></section><section class="qa-preview-panel"><div class="qa-preview-head"><div><span class="qa-section-number">02 <span>우리 홈페이지 미리보기</span></span><p>${esc(state.design.name)} · ${esc(state.school.name)}</p></div><a href="/site" target="_blank" rel="noopener">현재 사이트 ↗</a></div><div class="qa-site-frame"><iframe title="현재 학원 홈페이지 배경" src="/site?preview=1&template=${encodeURIComponent(state.design.id)}&embed=1&still=1" tabindex="-1"></iframe><div id="qaAnnouncement"></div></div><div class="qa-publish-bar"><p id="qaPeriod">미리보기를 준비하고 있습니다.</p><button id="qaPublish" class="button primary" disabled>이 내용으로 홈페이지에 게시 →</button><small>누르면 원장 승인 이력과 함께 홈페이지에 반영됩니다.</small></div></section></div><section class="qa-panel qa-publications"><div class="entry-head"><h2>홈페이지 게시 현황</h2><a href="/site" target="_blank" rel="noopener">공개 사이트에서 확인 ↗</a></div><div id="qaPublications"></div></section>`;
    const publishButton = app.querySelector("#qaPublish");
    app
      .querySelector(".qa-config")
      .insertAdjacentHTML(
        "beforeend",
        '<a class="qa-advanced" href="/agents?view=advanced&agent=academy-popup">AI 맞춤 문구·예약 실행 상세 설정 ↗</a>',
      );
    function list() {
      app.querySelector("#qaPublications").innerHTML = state.publications.length
        ? state.publications
            .map((p) => {
              const status = !p.active
                ? "내림"
                : p.endsAt && Date.parse(p.endsAt) <= Date.now()
                  ? "기간 종료"
                  : p.startsAt && Date.parse(p.startsAt) > Date.now()
                    ? "게시 예약"
                    : "게시 중";
              return `<article class="qa-publication"><div><span class="qa-tag">${status}</span><h3>${esc(p.title)}</h3><p>${p.endsAt ? new Date(p.endsAt).toLocaleDateString("ko-KR") : "기간 미지정"} · 연결된 상담 ${p.bookings}건</p></div><div class="entry-actions">${p.active ? `<button class="button secondary" data-hide-post="${esc(p.id)}">홈페이지에서 내리기</button>` : ""}<button class="button secondary" data-copy-post="${esc(p.id)}">수정해서 다시 게시</button></div></article>`;
            })
            .join("")
        : '<p class="qa-empty">아직 게시한 팝업이 없습니다. 위 미리보기에서 첫 안내를 게시하세요.</p>';
    }
    async function update() {
      content.querySelectorAll("[data-choice]").forEach((b) => {
        const active = String(options[b.dataset.choice]) === b.dataset.value;
        b.classList.toggle("selected", active);
        b.setAttribute("aria-pressed", String(active));
      });
      const version = ++sequence;
      pending = true;
      published = false;
      key = crypto.randomUUID();
      publishButton.disabled = true;
      app.querySelector("#qaAnnouncement").setAttribute("aria-busy", "true");
      try {
        const next = await request(
          "/api/agent-workspace/campaign-preview",
          options,
        );
        if (version !== sequence) return;
        preview = next;
        pending = false;
        app.querySelector("#qaAnnouncement").innerHTML = announcementHtml(
          preview,
          true,
        );
        app.querySelector("#qaAnnouncement").removeAttribute("aria-busy");
        if (document.activeElement?.id !== "qaTitle")
          app.querySelector("#qaTitle").value = preview.title;
        if (document.activeElement?.id !== "qaBody")
          app.querySelector("#qaBody").value = preview.body;
        app.querySelector("#qaPeriod").textContent =
          `${new Date(preview.startsAt).toLocaleDateString("ko-KR")} ~ ${new Date(preview.endsAt).toLocaleDateString("ko-KR")} · ${preview.cta === "/learn" ? "수업 체험" : "상담 신청"} 버튼 연결`;
        publishButton.disabled = publishing;
        publishButton.textContent = replaceId
          ? "수정한 내용으로 교체 게시 →"
          : "이 내용으로 홈페이지에 게시 →";
      } catch (e) {
        if (version === sequence) {
          preview = null;
          note(e.message, true);
        }
      }
    }
    content.addEventListener("click", async (e) => {
      const choice = e.target.closest("[data-choice]");
      if (choice && !publishing) {
        const group = choice.dataset.choice;
        options[group] = choice.dataset.value;
        content.querySelectorAll(`[data-choice="${group}"]`).forEach((b) => {
          b.classList.toggle("selected", b === choice);
          b.setAttribute("aria-pressed", String(b === choice));
        });
        await update();
      }
      const hide = e.target.closest("[data-hide-post]");
      if (hide) {
        hide.disabled = true;
        try {
          await refresh();
          await api.command(
            "post.hide",
            { id: hide.dataset.hidePost },
            state.revision,
          );
          await refresh();
          list();
          note("홈페이지에서 안내를 내렸습니다. 승인 기록은 보관됩니다.");
        } catch (error) {
          note(error.message, true);
          hide.disabled = false;
        }
      }
      const copy = e.target.closest("[data-copy-post]");
      if (copy && !publishing) {
        const p = state.publications.find(
          (p) => p.id === copy.dataset.copyPost,
        );
        replaceId = p.active ? p.id : null;
        options = {
          ...options,
          title: p.title,
          body: p.body,
          tone: p.tone || "navy",
          layout: p.layout || "card",
        };
        app.querySelector(".qa-details").open = true;
        await update();
        app.querySelector(".qa-studio").scrollIntoView({ behavior: "smooth" });
      }
    });
    app.querySelector("#qaClass").onchange = (e) => {
      options.classId = e.target.value;
      update();
    };
    app.querySelector("#qaDelay").onchange = (e) => {
      options.delay = Number(e.target.value);
      update();
    };
    for (const [id, k] of [
      ["qaTitle", "title"],
      ["qaBody", "body"],
    ])
      app.querySelector("#" + id).oninput = (e) => {
        options[k] = e.target.value;
        update();
      };
    app.querySelector("#qaResetCopy").onclick = () => {
      delete options.title;
      delete options.body;
      update();
    };
    publishButton.onclick = async () => {
      if (!preview || pending || publishing || published) return;
      publishing = true;
      publishButton.disabled = true;
      try {
        await api.command(
          "campaign.publish",
          { options, previewHash: preview.hash, replaceId },
          preview.revision,
          key,
        );
        published = true;
        replaceId = null;
        await refresh();
        list();
        const scheduled = Date.parse(preview.startsAt) > Date.now();
        note(
          scheduled
            ? "게시를 예약했습니다. 선택한 시작일에 홈페이지에 표시됩니다."
            : "홈페이지에 게시했습니다. 공개 사이트에서 팝업과 상담 신청 버튼을 확인하세요.",
        );
        publishButton.textContent = scheduled
          ? "게시 예약 완료 ✓"
          : "홈페이지 게시 완료 ✓";
      } catch (e) {
        note(e.message, true);
        publishButton.disabled = false;
        if (e.status === 409) await update();
      } finally {
        publishing = false;
      }
    };
    list();
    await update();
  }
  async function simple() {
    const photo = code === "academy-briefing",
      career = code === "academy-career",
      place = code === "academy-place",
      inquiry = code === "academy-inquiry";
    let prepared = null,
      busy = false,
      previewSeq = 0,
      run = null,
      runKey = crypto.randomUUID(),
      editedText = null;
    let settings = {
      code,
      studentId: params.get("student") || "",
      inquiryId: params.get("inquiry") || "",
      channel: "naver_place",
      interests: [],
      photoUrl: "",
    };
    const destination = inquiry
      ? "해당 홈페이지 문의에 답변"
      : place
        ? "플레이스용 문서를 내부 보관 · 외부 게시는 별도"
        : ["academy-ledger", "academy-study-ledger"].includes(code)
          ? "학생의 학습 장부로 내부 보관"
          : "해당 보호자의 비공개 공간에 전달";
    content.innerHTML =
      heading(
        esc(selected.name),
        "기존 자료를 자동으로 가져옵니다. 내용을 확인한 뒤 한 번에 처리하세요.",
      ) +
      `<div class="qa-workflow"><section class="qa-panel qa-config"><span class="qa-section-number">01 <span>자료 선택</span></span><h2>${place ? "어느 채널에 사용할까요?" : inquiry ? "어떤 문의에 답할까요?" : "어느 학생을 준비할까요?"}</h2>${
        place
          ? `<div class="qa-choices">${Object.entries(channelNames)
              .map(
                ([v, t]) =>
                  `<button class="qa-choice ${v === settings.channel ? "selected" : ""}" data-channel="${v}">${t}</button>`,
              )
              .join("")}</div>`
          : inquiry
            ? `<select id="qaInquiry" aria-label="홈페이지 문의"><option value="">답변할 문의 선택</option>${state.inquiries.map((q) => `<option value="${esc(q.id)}">${esc(q.question)}</option>`).join("")}</select>${state.inquiries.length ? "" : '<p>현재 답변을 기다리는 문의가 없습니다.</p><a href="/site" target="_blank" rel="noopener">홈페이지 보기 ↗</a>'}`
            : `<select id="qaStudent" aria-label="학생 선택"><option value="">학생 선택</option>${state.students.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} · 수업 기록 ${s.records}건${s.consent ? "" : " · 동의 확인 필요"}</option>`).join("")}</select>`
      }${photo ? '<div class="qa-photo-choice"><p>수업 기록만으로도 리포트를 만들 수 있습니다.</p><a class="button secondary" id="qaWithoutPhoto" href="/agents?agent=academy-journal">사진 없이 수업 기록으로 준비 →</a><details><summary>답안지 사진으로 분석하기</summary><label class="qa-field">공개 가능한 답안지 사진 주소<input id="qaPhoto" type="url" placeholder="https://…"></label></details></div>' : ""}${career ? `<h3>학생이 직접 말한 관심 분야</h3><p class="small">실제로 확인한 항목만 선택하세요.</p><div class="qa-choices">${["과학·기술", "인문·사회", "예술·디자인", "경영·경제", "의료·보건", "아직 탐색 중"].map((t) => `<button class="qa-choice" data-interest="${t}" aria-pressed="false">${t}</button>`).join("")}</div>` : ""}<div id="qaFacts" class="qa-facts"><p>자료를 선택하면 자동으로 준비합니다.</p></div><div class="qa-run-controls"><button class="button primary" id="qaGenerate" disabled>AI로 초안 만들기 →</button><small>${state.connection.ready ? "선택한 자료로 AI를 호출합니다. 결과는 적용 전에 확인합니다." : "실제 AI 연결 설정이 필요합니다. 자료 미리보기는 사용할 수 있습니다."}</small></div><a class="qa-advanced" href="/agents?view=advanced&agent=${encodeURIComponent(code)}">직접 입력·실행 예약 등 상세 설정 ↗</a></section><section class="qa-result-panel"><span class="qa-section-number">02 <span>확인하고 적용</span></span><h2>결과가 여기에 준비됩니다.</h2><p class="qa-destination">${destination}</p><div id="qaResult"><div class="qa-result-empty">${icon("file")}<p>자료를 다시 옮겨 적을 필요가 없습니다.<br>직원이 정리한 결과만 확인하세요.</p></div></div></section></div>`;
    const studentEl = app.querySelector("#qaStudent"),
      inquiryEl = app.querySelector("#qaInquiry"),
      generate = app.querySelector("#qaGenerate");
    if (studentEl) studentEl.value = settings.studentId;
    if (inquiryEl) inquiryEl.value = settings.inquiryId;
    async function prepare() {
      if (busy) return;
      const seq = ++previewSeq;
      prepared = null;
      generate.disabled = true;
      runKey = crypto.randomUUID();
      if (app.querySelector("#qaWithoutPhoto"))
        app.querySelector("#qaWithoutPhoto").href =
          `/agents?agent=academy-journal&student=${encodeURIComponent(settings.studentId)}`;
      try {
        const next = await request(
          "/api/agent-workspace/quick-input",
          settings,
        );
        if (seq !== previewSeq) return;
        prepared = next;
        app.querySelector("#qaFacts").innerHTML =
          `<span class="qa-tag">자료 준비됨</span><h3>${esc(next.studentName || state.school.name)}</h3><p>${place ? `${esc(state.school.address)}<br>${esc(state.school.phone)}` : inquiry ? esc(next.input.inquiry) : "학원에 저장된 수업·출결·공유 가능한 관찰 기록을 가져왔습니다."}</p><details><summary>AI에 전달할 자료 확인</summary><pre>${esc(
            Object.entries(next.input)
              .map(
                ([k, v]) =>
                  `${state.catalog.find((a) => a.code === code).fields.find((f) => f.key === k)?.label || k}: ${v}`,
              )
              .join("\n"),
          )}</pre></details>`;
        generate.disabled = !state.connection.ready || busy;
      } catch (e) {
        if (seq === previewSeq)
          app.querySelector("#qaFacts").innerHTML =
            `<p>${esc(e.message)}</p>${e.message.includes("수업 기록") ? '<a href="/#lesson">수업 기록하러 가기 →</a>' : ""}`;
      }
    }
    if (studentEl)
      studentEl.onchange = (e) => {
        settings.studentId = e.target.value;
        prepare();
      };
    if (inquiryEl)
      inquiryEl.onchange = (e) => {
        settings.inquiryId = e.target.value;
        prepare();
      };
    app.querySelector("#qaPhoto")?.addEventListener("change", (e) => {
      settings.photoUrl = e.target.value;
      prepare();
    });
    content.addEventListener("click", (e) => {
      const channel = e.target.closest("[data-channel]");
      if (channel && !busy) {
        settings.channel = channel.dataset.channel;
        content
          .querySelectorAll("[data-channel]")
          .forEach((b) => b.classList.toggle("selected", b === channel));
        prepare();
      }
      const interest = e.target.closest("[data-interest]");
      if (interest && !busy) {
        const v = interest.dataset.interest;
        settings.interests = settings.interests.includes(v)
          ? settings.interests.filter((x) => x !== v)
          : [...settings.interests, v];
        interest.classList.toggle("selected", settings.interests.includes(v));
        interest.setAttribute(
          "aria-pressed",
          String(settings.interests.includes(v)),
        );
        prepare();
      }
    });
    async function result() {
      if (!run) return;
      await refresh();
      run = state.runs.find((r) => r.id === run.id);
      const el = app.querySelector("#qaResult");
      if (["queued", "running"].includes(run.status)) {
        el.innerHTML =
          '<div class="qa-result-empty"><span class="qa-tag">AI가 준비하고 있습니다</span><p>다른 업무를 보셔도 작업은 보관됩니다.</p></div>';
        return;
      }
      if (run.status === "review") {
        if (el.querySelector("#qaResultText")) return;
        const output = textResult(run.output);
        editedText = output;
        el.innerHTML = `<label class="qa-field">적용할 내용<textarea id="qaResultText" rows="12" maxlength="12000">${esc(output)}</textarea></label><button class="button primary" id="qaApply">확인 완료 · ${place || ["academy-ledger", "academy-study-ledger"].includes(code) ? "문서 보관" : "바로 반영"} →</button><small>한 번 승인하면 연결된 곳에 반영되고 결재 이력도 남습니다.</small>`;
        el.querySelector("#qaResultText").oninput = (e) => {
          editedText = e.target.value;
        };
        el.querySelector("#qaApply").onclick = async (e) => {
          e.target.disabled = true;
          try {
            run = await request("/api/agent-workspace/action", {
              id: run.id,
              action: "apply",
              text: editedText,
              title: selected.name,
            });
            await result();
          } catch (error) {
            note(error.message, true);
            e.target.disabled = false;
          }
        };
      } else if (run.status === "submitted") {
        el.innerHTML = `<div class="qa-complete">${icon("check")}<h3>처리했습니다.</h3><p>${destination}</p><a class="button secondary" href="/?doc=${encodeURIComponent(run.docId)}#today">승인한 문서 확인 →</a></div>`;
        busy = false;
        generate.disabled = true;
        generate.textContent = "처리 완료 ✓";
        runKey = crypto.randomUUID();
      } else {
        el.innerHTML = `<p class="error-note">${esc(run.error || "작업을 다시 확인해 주세요.")}</p><a href="/agents?view=advanced">작업 기록과 입력 확인 →</a>`;
        busy = false;
        runKey = crypto.randomUUID();
        content
          .querySelectorAll(".qa-config select, .qa-config input, .qa-choice")
          .forEach((el) => (el.disabled = false));
        generate.disabled = !state.connection.ready;
      }
    }
    generate.onclick = async () => {
      if (!prepared || busy) return;
      busy = true;
      content
        .querySelectorAll(".qa-config select, .qa-config input, .qa-choice")
        .forEach((el) => (el.disabled = true));
      generate.disabled = true;
      try {
        run = await request("/api/agent-workspace/runs", {
          ...prepared,
          key: runKey,
          confirm: true,
        });
        const resumeUrl = new URL(location.href);
        resumeUrl.searchParams.set("run", run.id);
        history.replaceState(null, "", resumeUrl);
        run = await request("/api/agent-workspace/action", {
          id: run.id,
          action: "queue",
        });
        await result();
      } catch (e) {
        note(e.message, true);
        busy = false;
        content
          .querySelectorAll(".qa-config select, .qa-config input, .qa-choice")
          .forEach((el) => (el.disabled = false));
        generate.disabled = !state.connection.ready;
      }
    };
    const timer = setInterval(() => {
      if (run && ["queued", "running"].includes(run.status))
        result().catch((e) => note(e.message, true));
    }, 1800);
    window.addEventListener("pagehide", () => clearInterval(timer), {
      once: true,
    });
    if (settings.studentId || settings.inquiryId || place) await prepare();
    const resume = state.runs.find(
      (r) => r.id === params.get("run") && r.code === code,
    );
    if (resume) {
      run = resume;
      busy = true;
      generate.disabled = true;
      content
        .querySelectorAll(".qa-config select, .qa-config input, .qa-choice")
        .forEach((el) => (el.disabled = true));
      await result();
    }
  }
  if (code === "academy-popup") await popup();
  else if (selected?.priority) await simple();
  else if (code) {
    location.replace(`/agents?view=advanced&agent=${encodeURIComponent(code)}`);
  } else hub();
  if (!code && state.runs.length) {
    const labels = {
      draft: "입력 준비",
      queued: "실행 대기",
      running: "AI 준비 중",
      review: "확인할 결과",
      submitted: "승인·반영 기록",
      approved: "승인 기록",
      failed: "실행 확인 필요",
      stale: "자료 재확인",
      blocked: "실행 보류",
      cancelled: "취소",
      rejected: "보류",
    };
    content.insertAdjacentHTML(
      "beforeend",
      `<section class="qa-panel qa-recent"><div class="entry-head"><h2>이어서 처리할 작업</h2><a href="/agents?view=advanced">전체 기록 →</a></div><div class="qa-shortcuts">${state.runs
        .slice(0, 5)
        .map((r) => {
          const simple =
            state.catalog.some((a) => a.code === r.code && a.priority) &&
            r.code !== "academy-popup" &&
            r.status !== "draft";
          const query = new URLSearchParams({
            agent: r.code,
            run: r.id,
            ...(r.studentId ? { student: r.studentId } : {}),
            ...(r.source?.type === "inquiry" ? { inquiry: r.source.id } : {}),
            ...(simple ? {} : { view: "advanced" }),
          });
          return `<a href="${r.docId ? `/?doc=${encodeURIComponent(r.docId)}#today` : `/agents?${query}`}" >${esc(r.name)}<span>${labels[r.status] || "작업 확인"} →</span></a>`;
        })
        .join("")}</div></section>`,
    );
  }
}
