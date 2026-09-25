import * as api from "./api.js";
import { schoolNav } from "./brand.js";
import {
  esc,
  icon,
  btn,
  badge,
  field,
  area,
  select,
  checkbox,
  panel,
  empty,
  formData,
} from "./ui.js";
import { DAYS, timeLabel, dateLabel } from "../shared/core.js";
import { websiteIntro } from "./website.js";
import { websiteProfile } from "../shared/website.js";
import { siteDesign, templateById } from "../shared/templates.js";
import "./template-hero.js";
import { announcementHtml } from "../shared/announcements.js";
const sitePanel = (id, ...args) =>
  panel(...args).replace("<section ", `<section id="${esc(id)}" `);

export async function startPortal() {
  const dismissedAnnouncements = new Set();
  const app = document.querySelector("#app");
  let site = await api.request("/api/public");
  const params = new URLSearchParams(location.search);
  if (params.has("embed")) document.body.classList.add("embedded-site-preview");
  const preview = params.has("preview") && templateById(params.get("template"));
  const applyPreview = () => {
    if (preview)
      site.settings.websiteDesign = {
        templateId: preview.id,
        video: ["v1", "v2"].includes(params.get("video"))
          ? params.get("video")
          : preview.video,
      };
  };
  applyPreview();
  let classId =
    site.classes.find((c) => c.id === params.get("classId"))?.id ||
    site.classes[0]?.id ||
    "";
  let available = await api.request(
    "/api/public/slots?classId=" + encodeURIComponent(classId),
  );
  let busy = false;
  let slotsVersion = 0;
  let slotsLoading = false;
  let slotsError = "";
  const formDraft = {
    name: "",
    phone: "",
    question: "",
    slot: "",
    linkQuiz: false,
  };
  let quiz = null,
    quizResult = null,
    quizGrade = "중2",
    quizSubject = "수학",
    status = null;
  let token = "";
  try {
    token = sessionStorage.getItem("academy-confirmation") || "";
  } catch {}
  const notify = (text, error = false) => {
    const e = document.createElement("div");
    e.className = "toast" + (error ? " error" : "");
    e.textContent = text;
    document.querySelector("#toasts").append(e);
    setTimeout(() => e.remove(), 6500);
  };
  function render() {
    applyPreview();
    document.title = site.settings.name + " · 학원 공개 페이지";
    app.innerHTML = `<main class="portal design-${siteDesign(site.settings).template.key}" id="main">${preview ? `<div class="design-preview-bar"><span>디자인 ${preview.number} · ${preview.name} 미리보기 · 현재 사이트에는 아직 적용되지 않았습니다.</span><a href="/start?template=${preview.id}">이 디자인 선택 →</a></div>` : ""}<header class="portal-header"><a class="brand" href="/site"><span class="brand-mark">${esc(site.settings.name.slice(0, 1))}</span><span class="brand-word">${esc(site.settings.name)}<small>GROW AT YOUR OWN PACE</small></span></a>${schoolNav()}</header>${site.posts
      .filter(
        (p) =>
          p.kind === "popup" && !preview && !dismissedAnnouncements.has(p.id),
      )
      .slice(0, 1)
      .map((p) => announcementHtml(p))
      .join(
        "",
      )}${websiteIntro(site)}<section class="website-about" id="admission"><div class="eyebrow">ADMISSION</div><h2>우리 아이에게 맞는 수업</h2><p class="text-body">${esc(websiteProfile(site.settings).admission)}</p></section><div class="grid-three">${site.classes.map((c) => `<article class="portal-class"><div class="eyebrow">${esc(c.grade)} · ${esc(c.subject)}</div><h3>${esc(c.name)}</h3><p>${c.sessions.map((x) => `${DAYS[x.day]} ${timeLabel(x.start)}–${timeLabel(x.end)}`).join(" / ")}</p>${c.teacher ? `<p>${esc(c.teacher)} 선생님</p>` : ""}${c.seats !== null ? badge(c.seats > 0 ? `남은 자리 ${c.seats}석` : "정원 마감 · 상담 가능", c.seats ? "green" : "amber") : ""}</article>`).join("")}</div>
 <div class="two-columns" id="booking">${panel(
   "먼저 이야기 나눠요.",
   "담당 강사와 상담실이 비어 있는 시간입니다.",
   `<form class="panel-body form-stack" data-public-form="booking">${select(
     "희망 반",
     "classId",
     site.classes.map((c) => [c.id, c.name]),
     classId,
     'data-portal-control="class"',
   )}${field("학생 이름", "name", formDraft.name, "text", 'required maxlength="40" autocomplete="name"')}${field("보호자 연락처", "phone", formDraft.phone, "tel", 'required maxlength="30" autocomplete="tel" placeholder="010-0000-0000"')}${select("상담 시간", "slot", available.length ? available.map((x) => [x.date + "|" + x.start, x.label]) : [["", "현재 가능한 시간 없음"]], formDraft.slot, "required")}${quizResult ? checkbox("이번에 완료한 예시 문제 결과를 내 상담에 연결", "linkQuiz", formDraft.linkQuiz) : ""}${checkbox("입력한 이름·연락처를 상담 확인에 사용하는 데 동의합니다.", "agree", false, "required")}<button class="button primary" type="submit" ${available.length && site.bookingEnabled ? "" : "disabled"}>상담 요청하기 ${icon("arrow")}</button><p class="small muted">학원 확인 후 예약이 확정됩니다. 요청은 24시간 동안 유효하며 실제 문자는 발송하지 않습니다.</p></form>`,
 )}${panel("궁금한 점을 남겨 주세요.", "학원이 확인한 답변이 없으면 직접 확인합니다.", `<form class="panel-body form-stack" data-public-form="inquiry">${area("질문", "question", formDraft.question, 'required maxlength="1000" placeholder="예: 상담은 어떻게 진행되나요?"')}<button class="button secondary" type="submit">질문 접수</button><p class="small muted">아래 확인번호를 보관하면 원장님이 확인한 답변을 다시 볼 수 있습니다.</p></form><div class="panel-body"><div class="dialog-section" id="confirmation">요청·답변 확인</div><form class="form-stack" data-public-form="status">${field("내 확인번호", "token", token, "text", 'required minlength="32" autocomplete="off"')}<button type="submit" class="button secondary">진행 상황 확인</button></form>${status ? `<div class="portal-status">${status.type === "booking" ? `${badge({ requested: "학원 확인 중", confirmed: "상담 확정", cancelled: "취소", expired: "기한 만료" }[status.status] || status.status, status.status === "confirmed" ? "green" : "amber")}<p>${esc(dateLabel(status.date))} ${timeLabel(status.start)} · ${esc(status.room)}</p>` : `${badge(status.status === "answered" ? "답변이 도착했어요" : "확인 중", status.status === "answered" ? "green" : "amber")}<p>${esc(status.question)}</p><div class="text-body spaced">${esc(status.answer || "학원에서 질문을 확인하고 있습니다.")}</div>`}</div>` : ""}</div>`)}
 </div><div class="two-columns spaced">${sitePanel(
   "exam",
   "가볍게 풀어보는 예시 문제",
   "수준을 판정하는 진단 검사가 아닙니다. 준비된 학년·과목만 제공합니다.",
   `<div class="panel-body">${
     quizResult
       ? `<div class="parent-hero"><div class="eyebrow">SAMPLE PRACTICE</div><h3>${esc(quizResult.grade)} ${esc(quizResult.subject)} · ${quizResult.score}/${quizResult.total} 정답</h3><p>${esc(quizResult.message)}</p><p>같은 학년·과목의 반: ${quizResult.classes.map((c) => esc(c.name)).join(", ") || "현재 개설 반 없음"}</p></div>${btn("다시 풀기", "p-quiz-reset", "", "secondary")}`
       : quiz
         ? `<form data-public-form="quiz-finish" class="form-stack">${quiz.questions.map((q, i) => `<section class="question"><div class="eyebrow">QUESTION ${i + 1}</div><h3>${esc(q.q)}</h3>${q.choices.map((c, j) => `<label class="check"><input type="radio" name="q${i}" value="${j}" required><span>${esc(c)}</span></label>`).join("")}</section>`).join("")}<button type="submit" class="button primary">정답 수 확인</button></form>`
         : `<form data-public-form="quiz-start" class="form-stack">${select(
             "준비된 예시 문항",
             "pair",
             site.quizOptions.map((q) => [
               q.grade + "|" + q.subject,
               q.grade + " " + q.subject,
             ]),
             quizGrade + "|" + quizSubject,
           )}<button class="button secondary" type="submit">예시 문제 시작</button><p class="small muted">개인정보를 받지 않습니다. 결과는 본인이 상담 연결을 선택할 때만 해당 요청에 연결합니다.</p></form>`
   }</div>`,
 )}${sitePanel(
   "content",
   "학원의 소식",
   "원장님이 확인한 내용만 이곳에 반영됩니다.",
   `<div class="panel-body entry-list">${
     site.posts.filter((p) => p.kind !== "popup").length
       ? site.posts
           .filter((p) => p.kind !== "popup")
           .slice(0, 5)
           .map(
             (p) =>
               `<article class="entry"><div class="eyebrow">ACADEMY NOTE</div><h3>${esc(p.title)}</h3><div class="text-body spaced">${esc(p.body)}</div></article>`,
           )
           .join("")
       : empty(
           "새 소식을 준비하고 있어요.",
           "수강료와 일정은 상담을 통해 확인해 주세요.",
           "leaf",
         )
   }</div>`,
 )}</div><div class="spaced">${sitePanel("reviews", "학부모가 남긴 이야기", "연결된 재원 학부모만 익명으로 남길 수 있습니다.", `<div class="panel-body entry-list">${site.reviews.length ? site.reviews.map((r) => `<article class="entry"><div class="entry-head"><h3>재원 학부모</h3>${badge(r.rating + " / 5", "amber")}</div><p>${esc(r.body)}</p>${r.reply ? `<div class="form-note spaced">학원의 답글<br>${esc(r.reply)}</div>` : ""}</article>`).join("") : empty("아직 등록된 후기가 없습니다.", "학부모 페이지에서 후기를 남길 수 있습니다.", "chat")}</div>`)}</div><footer class="app-footer" id="contact"><div><span class="footer-brand">${esc(site.settings.name)}</span><p>${esc(site.settings.address)} · ${esc(site.settings.phone)}</p></div><p>예시 학원 · 무료 제공 웹사이트 미리보기<br>외부 문자·결제·플랫폼 미연결</p></footer></main>`;
    app.querySelector("academy-hero").site = site;
    const bookingForm = app.querySelector('[data-public-form="booking"]');
    if (bookingForm && (slotsLoading || slotsError)) {
      bookingForm.querySelector('[type="submit"]').disabled = true;
      const note = document.createElement("p");
      note.className = "form-note";
      note.setAttribute("role", "status");
      note.textContent = slotsLoading
        ? "선택한 반의 상담 시간을 확인하고 있습니다."
        : slotsError;
      if (slotsError) {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "button secondary";
        retry.dataset.action = "p-slots-retry";
        retry.textContent = "상담 시간 다시 확인";
        note.append(document.createElement("br"), retry);
      }
      bookingForm.append(note);
    }
    if (preview) {
      app.querySelectorAll("form button[type=submit]").forEach((b) => {
        b.disabled = true;
        b.title = "실제 신청은 현재 웹사이트에서 진행해 주세요.";
      });
    }
  }
  // Hydrate the original-design hero after every portal render.
  async function loadSlots() {
    const version = ++slotsVersion;
    const selectedClass = classId;
    slotsLoading = true;
    slotsError = "";
    try {
      const next = await api.request(
        "/api/public/slots?classId=" + encodeURIComponent(selectedClass),
      );
      if (version !== slotsVersion || selectedClass !== classId) return false;
      available = next;
    } catch (error) {
      if (version !== slotsVersion || selectedClass !== classId) return false;
      available = [];
      slotsError = error.message;
    } finally {
      if (version === slotsVersion) slotsLoading = false;
    }
    if (!available.some((x) => x.date + "|" + x.start === formDraft.slot))
      formDraft.slot = available[0]
        ? available[0].date + "|" + available[0].start
        : "";
    return true;
  }
  async function loadStatus() {
    if (token)
      status = await api.request(
        "/api/public/status?token=" + encodeURIComponent(token),
      );
  }
  async function remember(value) {
    token = value;
    try {
      sessionStorage.setItem("academy-confirmation", token);
    } catch {}
    await loadStatus();
  }
  app.addEventListener("input", (e) => {
    if (e.target.name in formDraft)
      formDraft[e.target.name] =
        e.target.type === "checkbox" ? e.target.checked : e.target.value;
  });
  app.addEventListener("change", async (e) => {
    if (e.target.dataset.portalControl === "class") {
      if (busy) {
        e.target.value = classId;
        return;
      }
      classId = e.target.value;
      formDraft.slot = "";
      available = [];
      const loading = loadSlots();
      render();
      if (await loading) {
        render();
        app
          .querySelector('[data-portal-control="class"]')
          ?.focus({ preventScroll: true });
      }
    }
    if (e.target.name === "slot") formDraft.slot = e.target.value;
    if (e.target.name === "linkQuiz") formDraft.linkQuiz = e.target.checked;
  });
  app.addEventListener("click", async (e) => {
    const dismiss = e.target.closest("[data-dismiss-announcement]");
    if (dismiss) {
      const card = dismiss.closest("[data-announcement]");
      dismissedAnnouncements.add(card.dataset.announcement);
      card.remove();
      return;
    }
    if (
      e.target.closest('[data-action="p-slots-retry"]') &&
      !busy &&
      !slotsLoading
    ) {
      const loading = loadSlots();
      render();
      if (await loading) render();
    }
    if (e.target.closest('[data-action="p-quiz-reset"]')) {
      quiz = null;
      quizResult = null;
      formDraft.linkQuiz = false;
      render();
    }
  });
  const ids = new Map();
  app.addEventListener("submit", async (e) => {
    const form = e.target;
    if (!form.matches("[data-public-form]")) return;
    e.preventDefault();
    if (busy) return;
    const p = formData(form);
    const type = form.dataset.publicForm;
    let mutationType, payload;
    let commandKey;
    let mutationSucceeded = false;
    const controls = [...form.querySelectorAll("input,textarea,select,button")];
    const disabledBefore = controls.map((control) => control.disabled);
    try {
      busy = true;
      controls.forEach((control) => {
        control.disabled = true;
      });
      if (type === "status") {
        token = p.token.trim();
        await loadStatus();
        render();
        return;
      }
      if (type === "booking") {
        if (slotsLoading || slotsError)
          throw Error("상담 가능 시간을 확인한 뒤 다시 신청해 주세요.");
        const [date, start] = p.slot.split("|");
        mutationType = "booking";
        payload = {
          classId,
          campaignId: new URLSearchParams(location.search).get("campaign"),
          name: p.name,
          phone: p.phone,
          date,
          start: Number(start),
          ...(p.linkQuiz && quizResult ? { quizToken: quiz.quizToken } : {}),
        };
      }
      if (type === "inquiry") {
        mutationType = "inquiry";
        payload = { question: p.question };
      }
      if (type === "quiz-start") {
        [quizGrade, quizSubject] = p.pair.split("|");
        mutationType = "quiz.start";
        payload = { grade: quizGrade, subject: quizSubject };
      }
      if (type === "quiz-finish") {
        mutationType = "quiz.finish";
        payload = {
          token: quiz.quizToken,
          answers: quiz.questions.map((q, i) => Number(p["q" + i])),
        };
      }
      const key = mutationType + JSON.stringify(payload);
      commandKey = key;
      const id = ids.get(key) || crypto.randomUUID();
      ids.set(key, id);
      const result = await api.publicCommand(mutationType, payload, id);
      mutationSucceeded = true;
      if (type === "booking") {
        await remember(result.bookingToken);
        formDraft.name = "";
        formDraft.phone = "";
        formDraft.slot = "";
        formDraft.linkQuiz = false;
        quiz = null;
        quizResult = null;
        await loadSlots();
      }
      if (type === "inquiry") {
        await remember(result.conversationToken);
        formDraft.question = "";
      }
      if (type === "quiz-start") quiz = result;
      if (type === "quiz-finish") quizResult = result;
      site = await api.request("/api/public");
      ids.delete(key);
      render();
      notify(result.message || "준비했습니다.");
    } catch (err) {
      if (!mutationSucceeded && err.status && err.status !== 500 && commandKey)
        ids.delete(commandKey);
      notify(err.message, true);
      let note = form.querySelector(".error-note");
      if (!note) {
        note = document.createElement("div");
        note.className = "error-note";
        note.setAttribute("role", "alert");
        form.append(note);
      }
      note.textContent = err.message;
    } finally {
      busy = false;
      controls.forEach((control, i) => {
        control.disabled = disabledBefore[i];
      });
    }
  });
  await loadSlots();
  try {
    await loadStatus();
  } catch {
    token = "";
    status = null;
  }
  render();
  if (location.hash)
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
