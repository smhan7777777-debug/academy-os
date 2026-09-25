import * as api from "./api.js";
import {
  esc,
  icon,
  btn,
  badge,
  empty,
  field,
  area,
  select,
  checkbox,
  heading,
  panel,
  download,
  formData,
  dateTime,
} from "./ui.js";
import {
  today,
  addDays,
  timeLabel,
  dateLabel,
  DAYS,
  balance,
  paid,
  won,
  STATUS,
  KIND,
  schedulesAt,
} from "../shared/core.js";
import * as V from "./views.js";
import * as D from "./dialogs.js";
import "./studio.css";

const app = document.querySelector("#app"),
  dialog = document.querySelector("#dialog");
let s = null,
  busy = false,
  dirty = false,
  route = location.hash.slice(1) || "today",
  focusBefore = null;
const ui = {
  inbox: "all",
  lessonDraft: {},
  studentFilter: {},
  billFilter: {},
  dialog: null,
};
const requestIds = new Map();
export const toast = (message, error = false) => {
  const item = document.createElement("div");
  item.className = "toast" + (error ? " error" : "");
  item.textContent = message;
  document.querySelector("#toasts").append(item);
  setTimeout(() => item.remove(), error ? 8000 : 4500);
};
const nav = () => V.getNav(s.actor.role);
function render() {
  if (!s) return;
  const items = nav();
  if (!items.some((x) => x[0] === route)) route = items[0][0];
  const title = items.find((x) => x[0] === route)?.[1];
  const pending = s.docs.filter((d) =>
    ["review", "teacher_review"].includes(d.status),
  ).length;
  document.title = title + " · 원장실";
  app.innerHTML = `<div class="shell"><aside class="rail" id="rail" aria-label="주 메뉴"><a class="brand" href="#today"><span class="brand-mark">결</span><span class="brand-word">원장실<small>ACADEMY OS</small></span></a><div class="academy-card">${icon("leaf")}<div><strong>${esc(s.settings.name)}</strong><small>학원의 하루를 정리하는 곳</small></div></div><nav class="nav">${s.actor.role === "owner" ? `<a href="/studio">${icon("spark")}<span>수업 스튜디오</span></a>` : ""}${items.map(([id, t, ic], i) => `${i === 0 ? '<div class="nav-group">MY OFFICE</div>' : id === "website" ? '<div class="nav-group">GROW TOGETHER</div>' : id === "staff" ? '<div class="nav-group">WORKSPACE</div>' : ""}<a href="#${id}" class="${id === route ? "active" : ""}" ${id === route ? 'aria-current="page"' : ""}>${icon(ic)}<span>${esc(t)}</span>${id === "today" && pending ? `<span class="count">${pending}</span>` : ""}</a>`).join("")}</nav><div class="rail-bottom"><div class="rail-poem">선생님은 가르침에,<br>원장님은 중요한 일에.</div><div class="rail-status"><span class="dot"></span> LOCAL WORKSPACE · V4</div></div></aside><div class="workspace"><header class="topbar"><div class="row"><button class="button icon-only ghost mobile-menu" data-action="menu" aria-label="메뉴 열기" aria-expanded="false">${icon("menu")}</button><div class="breadcrumb"><span>나의 학원</span>${icon("chevron")}<strong>${esc(title)}</strong></div></div><div class="top-tools">${["owner", "teacher"].includes(s.actor.role) ? `<button class="global-search" data-action="search" aria-label="학생 검색">${icon("search")}<span>학생 이름으로 찾아보기</span><kbd>Ctrl K</kbd></button>` : ""}<span class="top-date">${esc(dateLabel(s.date))}</span><button class="button icon-only ghost" data-action="refresh" aria-label="최신 기록 불러오기" title="최신 기록">${icon("refresh")}</button><div class="profile"><span class="avatar">${esc(s.actor.name.slice(0, 1))}</span>${api.auth.demo ? `<label class="sr-only" for="roleSelect">로컬 체험 계정 선택</label><select id="roleSelect" data-control="actor">${api.auth.actors.map((a) => `<option value="${a.id}" ${a.id === s.actor.id ? "selected" : ""}>${a.role === "owner" ? "원장" : a.role === "teacher" ? "강사 · " + a.name : a.role === "parent" ? "학부모 · 이서준" : "학생 · 이서준"}</option>`).join("")}</select>` : btn("로그아웃", "logout", "", "ghost")}</div></div></header><main class="content" id="main" tabindex="-1">${view()}<div class="local-banner">${icon("shield")}<span>${api.auth.demo ? "로컬 체험 · 예시 학원 · 계정 전환 가능" : "로컬 계정 모드"} · 변경 내용은 서버에 저장됩니다. 문자·결제는 미연결입니다. AI 초안 연결 상태는 수업 스튜디오에서 확인하세요.</span><a href="#settings" data-action="guide">이용 안내</a></div><footer class="app-footer"><span><span class="footer-brand">원장실</span> &nbsp; 조금 더 가벼운 학원의 하루.</span><span>서버 저장 연결 · Asia/Seoul · 기록 v${s.revision}</span></footer></main></div></div>`;
}
function view() {
  return (
    {
      today: V.home,
      students: V.students,
      lesson: V.lesson,
      timetable: V.timetable,
      billing: V.billing,
      website: V.website,
      content: V.content,
      staff: V.workers,
      biz: V.business,
      settings: V.settings,
      wrong: V.wrong,
      parent: V.parent,
      student: V.student,
    }[route] || V.home
  )(s, ui);
}
function open(html, type = null) {
  focusBefore = dialog.open ? focusBefore : document.activeElement;
  dialog.innerHTML = html;
  ui.dialog = type;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("#dialogTitle")?.focus();
}
function close() {
  dialog.close();
  ui.dialog = null;
  focusBefore?.focus?.();
}
function openDoc(id, edit = false) {
  const d = s.docs.find((d) => d.id === id);
  if (d) open(D.documentDialog(s, d, edit), { kind: "doc", id, edit });
  else toast("현재 계정에 이 서류의 열람 권한이 없습니다.", true);
}
function navigate(id) {
  if (dirty && !confirm("저장하지 않은 입력이 있습니다. 이동할까요?")) return;
  dirty = false;
  close();
  location.hash = id;
  if (route === id) render();
}
async function refresh(force = false) {
  if (!s || (!force && (busy || dirty || dialog.open))) return;
  const latest = await api.getState();
  const changedActor = latest.actor.id !== s.actor.id;
  if (changedActor) {
    await api.session();
    ui.lessonDraft = {};
    ui.inbox = "all";
    close();
    dirty = false;
    toast("다른 탭에서 전환한 계정을 반영했습니다.");
  }
  if (force || changedActor || latest.revision !== s.revision) {
    s = latest;
    render();
  }
}
async function mutate(
  type,
  payload,
  { keepDialog = false, quiet = false } = {},
) {
  if (busy) return null;
  busy = true;
  const controls = [
    ...document.querySelectorAll('button[type="submit"],.dialog-footer button'),
  ];
  controls.forEach((b) => (b.disabled = true));
  const key = type + JSON.stringify(payload);
  let id = requestIds.get(key) || crypto.randomUUID();
  requestIds.set(key, id);
  try {
    const result = await api.command(type, payload, s.revision, id);
    requestIds.delete(key);
    dirty = false;
    s = await api.getState();
    if (!keepDialog) close();
    render();
    if (!quiet) toast(result.message || "저장했습니다.");
    return result;
  } catch (e) {
    if (e.status !== 0 && e.status !== 500) requestIds.delete(key);
    if (e.status === 409) {
      try {
        s = await api.getState();
      } catch {}
    }
    toast(e.message, true);
    showFormError(e.message);
    return null;
  } finally {
    busy = false;
    controls.forEach((b) => (b.disabled = false));
  }
}
function showFormError(message) {
  const form = dialog.open
    ? dialog.querySelector("form")
    : document.activeElement?.closest("form");
  if (!form) return;
  let error = form.querySelector(".error-note");
  if (!error) {
    error = document.createElement("div");
    error.className = "error-note";
    error.setAttribute("role", "alert");
    form.prepend(error);
  }
  error.textContent = message;
}
function recordDraft(key) {
  if (ui.lessonDraft[key]) return ui.lessonDraft[key];
  const [classId, date, studentId] = key.split(":");
  const saved = s.records.find(
    (r) =>
      r.classId === classId && r.date === date && r.studentId === studentId,
  );
  return (ui.lessonDraft[key] = saved
    ? structuredClone(saved)
    : { att: null, hw: null, level: null, memo: "", shareMemo: false });
}
const dataAttr = (e, key) => e.dataset[key];
function getInvoice(id) {
  return s.invoices.find((i) => i.id === id);
}
const guide = () =>
  open(
    D.dialogFrame(
      "원장실을 사용하는 순서",
      "확인한 사실이 검토한 안내로 이어집니다.",
      `<div class="entry-list">${[
        [
          "01",
          "담당 강사로 수업 기록",
          "수업일을 고르고 실제 확인한 출결·숙제·이해도만 저장하세요.",
        ],
        [
          "02",
          "강사 검수",
          "오늘 할 일에서 작성된 리포트나 문제를 확인하고 검수 완료를 누르세요.",
        ],
        [
          "03",
          "원장 결재",
          "원장 계정으로 전환하고 본문·근거·받는 사람을 확인해 결재하세요.",
        ],
        [
          "04",
          "학부모·학생 확인",
          "몇 초 후 연결된 학부모 또는 학생 계정에서 승인한 내용을 확인할 수 있습니다.",
        ],
        [
          "05",
          "로컬 데이터 보관",
          "기록은 SQLite 파일에 저장됩니다. 설정에서 JSON 백업을 받을 수 있습니다.",
        ],
      ]
        .map(
          ([n, t, d]) =>
            `<div class="entry"><div class="eyebrow">STEP ${n}</div><h3>${t}</h3><p>${d}</p></div>`,
        )
        .join(
          "",
        )}</div><p class="form-note spaced">현재 로컬 체험 모드에서는 계정 전환으로 역할을 확인할 수 있습니다. 서버는 각 계정의 업무 권한을 검사합니다. 실제 학원 운영·외부 공개 전에는 개인 계정과 외부 서비스 설정이 필요합니다.</p>`,
      btn("확인했습니다", "close-dialog", "", "primary"),
      "GETTING STARTED",
    ),
  );

app.addEventListener("click", handleClick);
dialog.addEventListener("click", handleClick);
async function handleClick(event) {
  if (!s) return;
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const action = b.dataset.action,
    id = b.dataset.id;
  event.preventDefault();
  try {
    if (action === "website-requests") {
      document
        .querySelector("#website-requests")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "close-dialog") {
      if (!dirty || confirm("저장하지 않은 입력을 닫을까요?")) {
        dirty = false;
        close();
      }
      return;
    }
    if (action === "menu") {
      const rail = document.querySelector("#rail");
      const on = rail.classList.toggle("open");
      b.setAttribute("aria-expanded", String(on));
      if (on) {
        const scrim = document.createElement("button");
        scrim.className = "nav-scrim";
        scrim.ariaLabel = "메뉴 닫기";
        scrim.dataset.action = "menu-close";
        app.append(scrim);
      } else document.querySelector(".nav-scrim")?.remove();
      return;
    }
    if (action === "menu-close") {
      document.querySelector("#rail")?.classList.remove("open");
      document.querySelector(".nav-scrim")?.remove();
      document
        .querySelector('[data-action="menu"]')
        ?.setAttribute("aria-expanded", "false");
      return;
    }
    if (action === "refresh") {
      if (dirty) {
        toast("입력을 저장한 뒤 새로고침해 주세요.", true);
        return;
      }
      await refresh(true);
      toast("최신 기록을 불러왔습니다.");
      return;
    }
    if (action === "logout") {
      await api.logout();
      location.reload();
      return;
    }
    if (action === "guide") {
      guide();
      return;
    }
    if (action === "inbox-filter") {
      ui.inbox = b.dataset.value;
      render();
      return;
    }
    if (action === "doc") {
      openDoc(id);
      return;
    }
    if (action === "doc-edit") {
      openDoc(id, true);
      return;
    }
    if (action === "doc-download") {
      const d = s.docs.find((d) => d.id === id);
      download(d.title + ".txt", d.body);
      return;
    }
    if (["doc-review", "doc-approve", "doc-resume"].includes(action)) {
      await mutate(action.replace("-", "."), { id });
      return;
    }
    if (action === "doc-hold") {
      open(
        D.dialogFrame(
          "언제 다시 살펴볼까요?",
          "보류한 서류는 지정한 시각에 다시 검토함으로 돌아옵니다.",
          `<form id="holdForm" data-form="hold" class="form-stack"><input type="hidden" name="id" value="${esc(id)}">${field("다시 표시할 시각 (한국 시간)", "resume", addDays(s.date, 1) + "T08:30", "datetime-local", "required")}</form>`,
          `<button form="holdForm" class="button primary" type="submit">보류함으로 이동</button>`,
        ),
      );
      return;
    }
    if (action === "doc-cancel") {
      if (confirm("이 서류를 취소할까요? 기록은 보존됩니다."))
        await mutate("doc.cancel", { id });
      return;
    }
    if (action === "student") {
      const st = s.students.find((st) => st.id === id);
      open(D.studentDialog(s, st));
      return;
    }
    if (action === "student-new" || action === "student-edit") {
      open(
        D.studentForm(
          s,
          s.students.find((st) => st.id === id),
        ),
      );
      return;
    }
    if (action === "personal-edit") {
      const st = s.students.find((st) => st.id === id);
      open(
        D.dialogFrame(
          st.name + " 개인 일정",
          "시간표 변경 때 함께 확인할 일정입니다.",
          `<form id="personalForm" data-form="personal" class="form-stack"><input type="hidden" name="studentId" value="${esc(id)}">${select(
            "요일",
            "day",
            DAYS.map((d, i) => [i, d]),
            2,
          )}${field("시작 시간", "start", "16:00", "time", "required")}${field("종료 시간", "end", "17:00", "time", "required")}${field("일정 이름", "label", "", "text", 'required maxlength="80"')}<p class="form-note">입력한 일정이 기존 개인 일정에 추가됩니다. 아래 버튼으로 기존 일정을 모두 해제할 수도 있습니다.</p></form>`,
          `<button form="personalForm" class="button primary" type="submit">일정 추가</button>${btn("기존 일정 해제", "personal-clear", `data-id="${esc(id)}"`, "ghost")}`,
        ),
      );
      return;
    }
    if (action === "personal-clear") {
      if (confirm("이 학생의 개인 일정을 모두 해제할까요?"))
        await mutate("student.personal", { studentId: id, personal: [] });
      return;
    }
    if (action === "career") {
      await mutate("career.prepare", { studentId: id });
      return;
    }
    if (action === "students-export") {
      const head = [
        "학생",
        "학년",
        "반",
        "보호자",
        "연락처",
        "재원 상태",
        "수강 시작",
        "수강 종료",
        "활용 동의",
      ];
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^([=+@\-])/, "\t$1")
          .replaceAll('"', '""') +
        '"';
      const rows = s.students.map((st) => [
        st.name,
        st.grade,
        s.classes.find((c) => c.id === st.classId)?.name,
        st.guardian,
        st.phone,
        st.status,
        st.termStart,
        st.termEnd,
        st.consent ? "확인" : "미확인",
      ]);
      download(
        "학생명부-" + s.date + ".csv",
        "\uFEFF" +
          [head, ...rows].map((row) => row.map(cell).join(",")).join("\r\n"),
        "text/csv;charset=utf-8",
      );
      return;
    }
    if (action === "open-lesson") {
      ui.lessonClass = b.dataset.class;
      ui.lessonDate = s.date;
      navigate("lesson");
      return;
    }
    if (action === "mark-present") {
      document.querySelectorAll("[data-record]").forEach((el) => {
        recordDraft(el.dataset.key).att = "출석";
      });
      dirty = true;
      render();
      toast(
        "전체 학생의 출석을 표시했습니다. 실제 관찰과 다르면 수정한 뒤 저장하세요.",
      );
      return;
    }
    if (action === "lesson-chip") {
      const r = recordDraft(b.dataset.key);
      const k = b.dataset.field;
      r[k] = r[k] === b.dataset.value ? null : b.dataset.value;
      if (r.att === "결석") {
        r.hw = null;
        r.level = null;
        r.shareMemo = false;
      }
      dirty = true;
      const y = scrollY;
      render();
      window.scrollTo(0, y);
      return;
    }
    if (action === "go-wrong") {
      navigate("wrong");
      return;
    }
    if (action === "go-settings") {
      navigate("settings");
      return;
    }
    if (action === "payment") {
      open(D.paymentForm(s, getInvoice(id)));
      return;
    }
    if (action === "invoice") {
      open(D.invoiceDialog(s, getInvoice(id)));
      return;
    }
    if (action === "refund") {
      open(D.refundForm(s, getInvoice(id)));
      return;
    }
    if (action === "invoice-new") {
      open(
        D.dialogFrame(
          "새 청구서",
          "재원 학생의 청구 항목과 금액을 확인해 주세요.",
          `<form id="invoiceForm" data-form="invoice" class="form-stack">${select(
            "학생",
            "studentId",
            s.students
              .filter((st) => st.status === "active")
              .map((st) => [st.id, st.name]),
          )}${field("청구명", "label", s.date.slice(0, 7) + " 수강료", "text", 'required maxlength="80"')}${field("청구액 (원)", "amount", 320000, "number", 'required min="1" max="10000000"')}${field("납부 기한", "due", addDays(s.date, 7), "date", "required")}</form>`,
          `<button class="button primary" form="invoiceForm" type="submit">청구서 저장</button>`,
        ),
      );
      return;
    }
    if (action === "receipt") {
      const i = getInvoice(id),
        st = s.students.find((st) => st.id === i.studentId);
      download(
        `${st.name}-장부확인서.txt`,
        `${s.settings.name}\n로컬 장부 확인서 (세금 영수증 아님)\n\n학생: ${st.name}\n항목: ${i.label}\n청구액: ${won(i.amount)}\n감액: ${won(i.credit || 0)}\n순납부액: ${won(paid(s, i))}\n잔액: ${won(balance(s, i))}\n\n기록\n${s.payments
          .filter((p) => p.invoiceId === i.id)
          .map(
            (p) => `${p.date} ${won(p.amount)} / ${p.method} / ${p.reference}`,
          )
          .join("\n")}`,
      );
      return;
    }
    if (action === "class-new" || action === "schedule-edit") {
      open(
        D.scheduleForm(
          s,
          s.classes.find((c) => c.id === id),
        ),
      );
      return;
    }
    if (action === "schedule-row-add") {
      const parent = document.querySelector("#scheduleRows");
      if (parent.children.length >= 7) {
        toast("최대 7개 수업을 입력할 수 있습니다.", true);
        return;
      }
      parent.insertAdjacentHTML("beforeend", D.scheduleRow());
      dirty = true;
      return;
    }
    if (action === "schedule-row-remove") {
      b.closest(".schedule-input").remove();
      dirty = true;
      return;
    }
    if (action === "content-new") {
      open(D.contentForm(s, b.dataset.kind || "content"));
      return;
    }
    if (action === "tuition") {
      await mutate("tuition.prepare", {});
      return;
    }
    if (action === "post-hide") {
      if (
        confirm(
          "이 소식을 로컬 공개 페이지에서 내릴까요? 승인 이력은 남습니다.",
        )
      )
        await mutate("post.hide", { id });
      return;
    }
    if (action === "post-copy") {
      await navigator.clipboard.writeText(
        s.posts.find((p) => p.id === id).body,
      );
      toast("본문을 복사했습니다.");
      return;
    }
    if (action === "share-link") {
      await navigator.clipboard.writeText(location.origin + "/site");
      toast("이 컴퓨터에서 여는 로컬 주소를 복사했습니다.");
      return;
    }
    if (action === "share-card") {
      const text = esc(s.settings.name);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#173d30"/><rect x="50" y="50" width="1100" height="530" rx="22" fill="none" stroke="#a0ad87"/><text x="100" y="140" font-size="22" fill="#dec99a" font-family="sans-serif">ACADEMY NOTE</text><text x="100" y="275" font-size="54" fill="#f4edda" font-family="sans-serif">${text}</text><text x="100" y="352" font-size="30" fill="#d9e2d5" font-family="sans-serif">확인한 기록으로 함께하는 배움.</text><text x="100" y="505" font-size="20" fill="#c0d0bc" font-family="sans-serif">로컬 미리보기용 · 외부 공유 주소 연결 전</text></svg>`;
      download("학원소개-로컬카드.svg", svg, "image/svg+xml");
      return;
    }
    if (action === "place-draft") {
      openBiz(
        "place",
        `${s.settings.name}\n주소: ${s.settings.address}\n문의: ${s.settings.phone}\n운영 반: ${s.classes.map((c) => c.name).join(", ")}\n소개: 확인한 수업 기록으로 보호자와 소통합니다.`,
      );
      return;
    }
    if (action === "inquiry") {
      const q = s.conversations.find((q) => q.id === id);
      open(
        D.dialogFrame(
          "방문자 문의 답변",
          "승인한 답변은 원래 문의 확인번호에 연결됩니다.",
          `<div class="text-body">${esc(q.question)}</div><form id="inquiryForm" data-form="inquiry" class="form-stack spaced"><input name="id" type="hidden" value="${esc(id)}">${area("방문자에게 보낼 답변", "answer", "", 'required maxlength="3000"')}${select(
            "공개 지식에도 저장 (선택)",
            "knowledgeKey",
            [
              ["", "이번 질문에만 답변"],
              ["shuttle", "셔틀"],
              ["refund", "환불"],
              ["tuition", "수강료"],
              ["location", "위치"],
              ["consult", "상담"],
            ],
          )}</form>`,
          `<button class="button primary" form="inquiryForm" type="submit">답변 초안 준비</button>`,
        ),
      );
      return;
    }
    if (action === "booking-doc") {
      const d = s.docs.find((d) => d.bookingId === id);
      openDoc(d.id);
      return;
    }
    if (action === "booking-cancel") {
      if (confirm("이 상담 예약을 취소할까요?"))
        await mutate("booking.cancel", { id });
      return;
    }
    if (action === "booking-enroll") {
      open(
        D.studentForm(
          s,
          null,
          s.bookings.find((b) => b.id === id),
        ),
      );
      return;
    }
    if (action === "parent-book") {
      const classId = s.students[0].classId;
      const slots = await api.request(
        "/api/public/slots?classId=" + encodeURIComponent(classId),
      );
      open(
        D.dialogFrame(
          "상담 시간 선택",
          "원장님 확인 후 로컬 페이지에 확정 상태가 표시됩니다.",
          slots.length
            ? `<form id="parentBooking" data-form="parent-book" class="form-stack">${select(
                "가능한 상담 시간",
                "slot",
                slots.map((x) => [x.date + "|" + x.start, x.label]),
              )}<p class="form-note">담당 강사와 상담실의 30분 전체 구간을 확인한 시간입니다.</p></form>`
            : empty("현재 예약 가능한 시간이 없습니다."),
          slots.length
            ? '<button class="button primary" type="submit" form="parentBooking">상담 요청</button>'
            : "",
        ),
      );
      return;
    }
    if (action === "worker-toggle") {
      await mutate("worker.toggle", {
        id,
        enabled: b.dataset.enabled === "true",
      });
      return;
    }
    if (action === "worker-run") {
      await mutate("worker.run", { id });
      return;
    }
    if (action === "biz-new") {
      openBiz(b.dataset.kind);
      return;
    }
    if (action === "delivery-list") {
      navigate("settings");
      return;
    }
    if (action === "delivery-retry") {
      await mutate("delivery.retry", { id });
      return;
    }
    if (action === "student-answer") {
      const r = await mutate(
        "student.answer",
        {
          docId: b.dataset.doc,
          questionId: b.dataset.question,
          answer: Number(b.dataset.answer),
        },
        { quiet: true },
      );
      if (r) {
        const target = document.getElementById("answer-" + b.dataset.question);
        target.innerHTML = `<div class="explanation"><strong>${esc(r.message)}</strong><br>${esc(r.explanation)}</div>`;
      }
      return;
    }
    if (action === "legacy-export") {
      try {
        const raw = localStorage.getItem("wonjangsil-v3");
        if (!raw) {
          toast("이 브라우저에 이전 체험 기록이 없습니다.");
          return;
        }
        download("academy-v3-원본기록.json", raw, "application/json");
        toast(
          "이전 기록을 그대로 내보냈습니다. 기존 기록은 삭제하지 않았습니다.",
        );
      } catch {
        toast("브라우저 저장소에 접근할 수 없습니다.", true);
      }
      return;
    }
    if (action === "search") {
      open(
        D.dialogFrame(
          "학생 찾기",
          "현재 계정에서 볼 수 있는 학생만 검색합니다.",
          `${field("이름·학년·반 검색", "search", "", "search", 'id="searchInput" placeholder="학생 이름을 입력하세요" autocomplete="off"')}<div class="search-results" id="searchResults"></div>`,
        ),
      );
      document.querySelector("#searchInput").focus();
      searchResults("");
      return;
    }
    if (action === "manager") {
      open(
        D.dialogFrame(
          "장부 도우미",
          "확인한 장부 숫자로 답합니다. 외부 AI 모델은 연결하지 않았습니다.",
          `<form data-form="manager" class="form-stack">${field("무엇이 궁금하신가요?", "question", "", "text", 'required placeholder="예: 미납 얼마야? / 오늘 수업은?"')}<button type="submit" class="button primary">기록에서 확인</button></form><div id="managerAnswer" class="text-body spaced">미납 · 결재 · 수업 · 상담 · 재원 학생을 물어보세요.</div>`,
        ),
      );
      return;
    }
  } catch (e) {
    toast(e.message, true);
  }
}
function openBiz(kind, details = "") {
  const names = {
    contract: "수강 계약 확인서",
    notice: "휴원·보강 안내",
    hiring: "강사 채용 안내",
    place: "학원 소개 자료",
  };
  open(
    D.dialogFrame(
      names[kind],
      "직접 확인한 내용을 서식에 정리합니다.",
      `<form id="bizForm" data-form="biz" class="form-stack"><input type="hidden" name="kind" value="${kind}">${area("확인한 내용", "details", details, 'required maxlength="5000" rows="10" placeholder="대상·기간·금액·조건을 구체적으로 입력해 주세요."')}<p class="form-note">작성한 내용으로 검토용 초안을 만듭니다. 법률상 완전한 계약서 또는 전문가 검토로 표시하지 않습니다.</p></form>`,
      `<button form="bizForm" type="submit" class="button primary">초안 준비</button>`,
    ),
  );
}
function searchResults(query) {
  const results = s.students
    .filter((st) =>
      [st.name, st.grade, s.classes.find((c) => c.id === st.classId)?.name]
        .join(" ")
        .includes(query),
    )
    .slice(0, 15);
  document.querySelector("#searchResults").innerHTML = results.length
    ? results
        .map(
          (st) =>
            `<button class="search-result" data-action="student" data-id="${esc(st.id)}"><span class="avatar">${esc(st.name.slice(0, 1))}</span><span><strong>${esc(st.name)}</strong><small>${esc(st.grade)} · ${esc(s.classes.find((c) => c.id === st.classId)?.name)}</small></span>${icon("chevron")}</button>`,
        )
        .join("")
    : empty("검색 결과가 없습니다.");
}
function minutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
async function submit(event) {
  const form = event.target;
  if (!form.matches("form[data-form]")) return;
  event.preventDefault();
  const p = formData(form),
    kind = form.dataset.form;
  form.querySelector(".error-note")?.remove();
  try {
    if (kind === "student-filter") {
      ui.studentFilter = { ...p, only: form.elements.only.checked };
      dirty = false;
      render();
      return;
    }
    if (kind === "billing-filter") {
      ui.billFilter = { ...p, only: form.elements.only.checked };
      dirty = false;
      render();
      return;
    }
    if (kind === "lesson") {
      const records = [...form.querySelectorAll("[data-record]")].map((el) => {
        const key = el.dataset.key;
        const saved = s.records.find(
          (r) =>
            r.studentId === el.dataset.record &&
            r.classId === p.classId &&
            r.date === p.date,
        );
        return {
          studentId: el.dataset.record,
          ...(ui.lessonDraft[key] || saved || { att: null }),
        };
      });
      const r = await mutate("record.save", {
        classId: p.classId,
        date: p.date,
        records,
      });
      if (r) {
        ui.lessonDraft = {};
        render();
      }
      return;
    }
    if (kind === "doc-edit") {
      const r = await mutate(
        "doc.edit",
        { id: p.id, body: p.body },
        { keepDialog: true },
      );
      if (r) openDoc(r.docId || p.id);
      return;
    }
    if (kind === "hold") {
      await mutate("doc.hold", { id: p.id, resumeAt: p.resume + ":00+09:00" });
      return;
    }
    if (kind === "student-save") {
      const payload = {
        ...p,
        termTotal: Number(p.termTotal),
        consent: form.elements.consent.checked,
      };
      if (p.bookingId)
        await mutate("booking.enroll", { id: p.bookingId, student: payload });
      else await mutate("student.save", payload);
      return;
    }
    if (kind === "personal") {
      const st = s.students.find((st) => st.id === p.studentId);
      await mutate("student.personal", {
        studentId: p.studentId,
        personal: [
          ...(st.personal || []),
          {
            day: Number(p.day),
            start: minutes(p.start),
            end: minutes(p.end),
            label: p.label,
          },
        ],
      });
      return;
    }
    if (kind === "payment") {
      await mutate("payment.add", { ...p, amount: Number(p.amount) });
      return;
    }
    if (kind === "invoice") {
      await mutate("invoice.create", { ...p, amount: Number(p.amount) });
      return;
    }
    if (kind === "refund") {
      await mutate("refund.prepare", {
        invoiceId: p.invoiceId,
        totalHours: Number(p.totalHours),
        elapsedHours: Number(p.elapsedHours),
        beforeStart: p.beforeStart === "true",
      });
      return;
    }
    if (kind === "schedule") {
      const sessions = [...form.querySelectorAll(".schedule-input")].map(
        (row) => ({
          day: Number(row.querySelector('[name="day"]').value),
          start: minutes(row.querySelector('[name="start"]').value),
          end: minutes(row.querySelector('[name="end"]').value),
          room: row.querySelector('[name="room"]').value,
        }),
      );
      await mutate(p.classId ? "schedule.prepare" : "class.create", {
        ...p,
        sessions,
        capacity: Number(p.capacity),
        fee: Number(p.fee),
      });
      return;
    }
    if (kind === "pset") {
      await mutate("pset.prepare", {
        studentId: p.studentId,
        wrongIds: new FormData(form).getAll("wrongIds"),
      });
      return;
    }
    if (kind === "content-generate") {
      const result = await mutate("content.generate", p);
      if (result) openDoc(result.docId);
      return;
    }
    if (kind === "content") {
      await mutate("content.prepare", p);
      return;
    }
    if (kind === "knowledge") {
      await mutate("knowledge.save", p);
      return;
    }
    if (kind === "inquiry") {
      await mutate("inquiry.prepare", p);
      return;
    }
    if (kind === "parent-book") {
      const [date, start] = p.slot.split("|");
      await mutate("parent.book", { date, start: Number(start) });
      return;
    }
    if (kind === "survey") {
      await mutate("parent.survey", { rating: Number(p.rating), note: p.note });
      return;
    }
    if (kind === "parent-review") {
      await mutate("parent.review", { rating: Number(p.rating), body: p.body });
      return;
    }
    if (kind === "website-profile") {
      const result = await mutate("website.prepare", p);
      if (result) openDoc(result.docId);
      return;
    }
    if (kind === "settings") {
      await mutate("settings.save", {
        ...p,
        showTeachers: form.elements.showTeachers.checked,
        showSeats: form.elements.showSeats.checked,
      });
      return;
    }
    if (kind === "weights") {
      await mutate("settings.save", {
        weights: {
          absent: Number(p.absent),
          homework: Number(p.homework),
          feedback: Number(p.feedback),
          billing: Number(p.billing),
        },
        threshold: Number(p.threshold),
      });
      return;
    }
    if (kind === "biz") {
      await mutate("biz.prepare", p);
      return;
    }
    if (kind === "manager") {
      let answer =
        "해당 내용은 현재 확인한 장부만으로 답할 수 없습니다. 담당자와 직접 확인해 주세요.";
      const q = p.question;
      if (/미납|잔액|수납/.test(q)) {
        const invoices = s.invoices.filter(
          (i) => i.due < s.date && balance(s, i) > 0,
        );
        answer = `기한이 지난 청구 ${invoices.length}건, 잔액 ${won(invoices.reduce((n, i) => n + balance(s, i), 0))}입니다. 수납 화면에서 개별 청구를 확인할 수 있습니다.`;
      } else if (/결재|서류/.test(q))
        answer = `원장 결재 대기 ${s.docs.filter((d) => d.status === "review").length}건, 강사 검수 대기 ${s.docs.filter((d) => d.status === "teacher_review").length}건, 보류 ${s.docs.filter((d) => d.status === "held").length}건입니다.`;
      else if (/수업/.test(q))
        answer =
          s.classes
            .map((c) => {
              const xs = schedulesAt(c, s.date).filter(
                (x) =>
                  x.day === new Date(s.date + "T12:00:00+09:00").getUTCDay(),
              );
              return xs
                .map(
                  (x) =>
                    `${c.name} ${timeLabel(x.start)}–${timeLabel(x.end)} · ${c.teacher}`,
                )
                .join("\n");
            })
            .filter(Boolean)
            .join("\n") || "오늘 예정된 수업이 없습니다.";
      else if (/학생|재원/.test(q))
        answer = `재원 학생 ${s.students.filter((st) => st.status === "active").length}명입니다.`;
      else if (/상담/.test(q))
        answer = `확정 대기 ${s.bookings.filter((b) => b.status === "requested").length}건, 확정 ${s.bookings.filter((b) => b.status === "confirmed").length}건입니다.`;
      document.querySelector("#managerAnswer").textContent = answer;
      dirty = false;
      return;
    }
  } catch (e) {
    toast(e.message, true);
    showFormError(e.message);
  }
}
app.addEventListener("submit", submit);
dialog.addEventListener("submit", submit);
function input(event) {
  if (!s) return;
  const e = event.target;
  if (e.id === "searchInput") {
    searchResults(e.value.trim());
    return;
  }
  if (e.dataset.lessonMemo) {
    recordDraft(e.dataset.lessonMemo).memo = e.value;
    dirty = true;
    return;
  }
  const form = e.closest("form");
  if (
    form &&
    !["student-filter", "billing-filter", "manager"].includes(form.dataset.form)
  )
    dirty = true;
}
app.addEventListener("input", input);
dialog.addEventListener("input", input);
app.addEventListener("change", async (event) => {
  const e = event.target;
  try {
    if (e.dataset.shareMemo) {
      recordDraft(e.dataset.shareMemo).shareMemo = e.checked;
      dirty = true;
      return;
    }
    const control = e.dataset.control;
    if (!control) return;
    if (dirty && !confirm("저장하지 않은 입력이 있습니다. 이동할까요?")) {
      render();
      return;
    }
    dirty = false;
    if (control === "actor") {
      await api.login(e.value);
      ui.lessonDraft = {};
      ui.inbox = "all";
      s = await api.getState();
      route = V.getNav(s.actor.role)[0][0];
      location.hash = route;
      render();
      return;
    }
    if (control === "lesson-class") ui.lessonClass = e.value;
    if (control === "lesson-date") ui.lessonDate = e.value;
    if (control === "schedule-date") ui.scheduleDate = e.value;
    if (control === "wrong-class") ui.wrongClass = e.value;
    render();
  } catch (err) {
    toast(err.message, true);
  }
});
window.addEventListener("hashchange", async () => {
  if (!s) return;
  const next = location.hash.slice(1) || "today";
  if (dirty && !confirm("저장하지 않은 입력이 있습니다. 이동할까요?")) {
    history.replaceState(null, "", "#" + route);
    return;
  }
  dirty = false;
  route = next;
  close();
  render();
  try {
    await refresh();
  } catch (e) {
    toast(e.message, true);
  }
  window.scrollTo(0, 0);
  document.querySelector("#main")?.focus({ preventScroll: true });
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
dialog.addEventListener("cancel", (e) => {
  if (dirty && !confirm("저장하지 않은 입력을 닫을까요?")) e.preventDefault();
  else {
    dirty = false;
    ui.dialog = null;
  }
});
document.addEventListener("keydown", (e) => {
  if (dialog.open && e.key === "Tab") {
    const items = [
      ...dialog.querySelectorAll(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ),
    ].filter((el) => el.getClientRects().length);
    const current = items.indexOf(document.activeElement);
    if (
      items.length &&
      (current < 0 ||
        (e.shiftKey && current === 0) ||
        (!e.shiftKey && current === items.length - 1))
    ) {
      e.preventDefault();
      (e.shiftKey ? items.at(-1) : items[0]).focus();
    }
    return;
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "k" &&
    s &&
    ["owner", "teacher"].includes(s.actor.role)
  ) {
    e.preventDefault();
    document.querySelector('[data-action="search"]')?.click();
  }
});
async function boot() {
  try {
    if (["/studio", "/learn", "/welcome"].includes(location.pathname)) {
      const { startStudio } = await import("./studio.js");
      await startStudio();
      return;
    }
    if (location.pathname === "/start") {
      const { startWebsiteSetup } = await import("./website-setup.js");
      await startWebsiteSetup();
      return;
    }
    if (
      location.pathname === "/site" ||
      new URLSearchParams(location.search).has("portal")
    ) {
      const { startPortal } = await import("./portal.js");
      await startPortal();
      return;
    }
    const auth = await api.session();
    if (!auth.actor) {
      if (auth.demo) await api.login("owner");
      else {
        loginScreen();
        return;
      }
    }
    s = await api.getState();
    render();
    setInterval(() => refresh().catch(() => {}), 5000);
  } catch (e) {
    app.innerHTML = `<div class="boot"><span class="brand-mark">결</span><h1>기록을 불러오지 못했어요.</h1><p>${esc(e.message)}</p><button class="button primary" id="reloadApp">다시 연결</button></div>`;
    document.querySelector("#reloadApp").onclick = () => location.reload();
  }
}
function loginScreen() {
  app.innerHTML = `<main class="login-card"><span class="brand-mark">결</span><h1>나의 원장실에 들어가기.</h1><p>로컬 계정 파일에 발급된 계정 ID와 암호로 로그인하세요.</p><form id="loginForm" class="form-stack">${field("계정 ID", "actorId", "", "text", 'required autocomplete="username"')}${field("암호", "password", "", "password", 'required autocomplete="current-password"')}<button class="button primary" type="submit">로그인</button></form></main>`;
  document.querySelector("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const p = formData(e.target);
    try {
      await api.login(p.actorId, p.password);
      location.reload();
    } catch (err) {
      toast(err.message, true);
    }
  };
}
boot();
