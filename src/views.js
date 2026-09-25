import {
  esc,
  icon,
  btn,
  empty,
  badge,
  field,
  area,
  select,
  checkbox,
  heading,
  panel,
  initials,
  dateTime,
} from "./ui.js";
import { websiteManagement } from "./website.js";
import {
  DAYS,
  dateLabel,
  timeLabel,
  addDays,
  schedulesAt,
  sessionsOn,
  balance,
  paid,
  remaining,
  attention,
  won,
  STATUS,
  KIND,
  KIND_ICON,
  KNOWLEDGE,
} from "../shared/core.js";

export const ownerNav = [
  ["today", "오늘 결재함", "inbox"],
  ["website", "무료 웹사이트", "globe"],
  ["students", "학생", "users"],
  ["lesson", "수업 기록", "book"],
  ["timetable", "시간표", "calendar"],
  ["billing", "수납", "wallet"],
  ["content", "학원 소식", "leaf"],
  ["staff", "업무실", "spark"],
  ["biz", "경영지원", "briefcase"],
  ["settings", "설정·기록", "settings"],
];
export const teacherNav = [
  ["today", "오늘 할 일", "inbox"],
  ["lesson", "수업 기록", "book"],
  ["students", "담당 학생", "users"],
  ["wrong", "오답·맞춤 문제", "file"],
  ["timetable", "시간표", "calendar"],
];
export const getNav = (role) =>
  role === "owner"
    ? ownerNav
    : role === "teacher"
      ? teacherNav
      : role === "parent"
        ? [["parent", "자녀 소식", "heart"]]
        : [["student", "나의 학습", "book"]];
export const stat = (
  label,
  value,
  suffix,
  note,
  ic = "file",
  accent = false,
  progress = null,
) =>
  `<div class="stat ${accent ? "accent" : ""}"><div class="stat-top"><span>${esc(label)}</span>${icon(ic)}</div><strong class="num">${esc(value)}<small>${esc(suffix)}</small></strong><p>${esc(note)}</p>${progress !== null ? `<div class="mini-progress" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i class="${i < Math.round(progress * 12) ? "filled" : ""}"></i>`).join("")}</div>` : ""}</div>`;
const workerName = (s, d) =>
  s.workers?.find((w) => w.id === d.worker)?.name || "운영 서류";
const statusTone = (d) =>
  d.status === "review"
    ? d.priority === "high"
      ? "red"
      : "green"
    : d.status === "teacher_review"
      ? "blue"
      : d.status === "held"
        ? "amber"
        : d.status === "approved"
          ? "green"
          : "neutral";
function docExcerpt(d) {
  if (d.status === "stale") return d.reason;
  if (d.status === "held") return dateTime(d.resumeAt) + "에 다시 표시";
  const lines = d.body.split("\n").filter((line) => line.trim());
  if (["billing", "reenroll"].includes(d.kind))
    return lines.slice(1, 3).join(" · ");
  if (d.kind === "report")
    return lines.filter((line) => /^(출결|숙제|이해도)/.test(line)).join(" · ");
  return lines[0] || KIND[d.kind];
}
export const docRow = (s, d) =>
  `<article class="doc-row" data-doc="${esc(d.id)}"><div class="doc-symbol ${esc(d.kind)}">${icon(KIND_ICON[d.kind])}</div><div class="doc-info"><div class="doc-title"><h3>${esc(d.title)}</h3>${badge(STATUS[d.status], statusTone(d))}</div><p class="doc-description">${esc(docExcerpt(d))}</p><div class="doc-meta"><span>${esc(workerName(s, d))}</span><span>${esc(d.recipient || "내부 확인")}</span><span>v${d.revision}${d.review ? " · 검수 완료" : ""}</span></div></div>${btn(d.status === "teacher_review" && s.actor.role === "teacher" ? "검수하기" : d.status === "review" ? "검토하기" : "내용 보기", "doc", `data-id="${esc(d.id)}"`, "secondary", "chevron")}</article>`;
export function home(s, ui) {
  const role = s.actor.role;
  const docs = s.docs;
  const pending = docs.filter((d) =>
    ["review", "teacher_review"].includes(d.status),
  );
  const now = pending.filter(
    (d) => d.status === "review" && d.priority === "high",
  );
  const held = docs.filter((d) => d.status === "held");
  const approved = docs.filter((d) => d.status === "approved");
  const failed = s.deliveries.filter((j) => j.status === "blocked");
  const agenda = s.classes
    .flatMap((c) => sessionsOn(c, s.date).map((x) => ({ ...x, c })))
    .sort((a, b) => a.start - b.start);
  const students = s.students.filter((st) => st.status === "active");
  const overdue = s.invoices.filter((i) => i.due < s.date && balance(s, i) > 0);
  const selected = ui.inbox || "all";
  const tabs = [
    ["all", "전체", pending.length],
    ["urgent", "지금 확인", now.length],
    [
      "teacher",
      "강사 검수",
      pending.filter((d) => d.status === "teacher_review").length,
    ],
    ["held", "보류", held.length],
    ["history", "처리 기록", docs.length - pending.length - held.length],
  ];
  const visible =
    selected === "all"
      ? pending
      : selected === "urgent"
        ? now
        : selected === "teacher"
          ? pending.filter((d) => d.status === "teacher_review")
          : selected === "held"
            ? held
            : docs.filter(
                (d) => !["review", "teacher_review", "held"].includes(d.status),
              );
  visible.sort(
    (a, b) =>
      (b.priority === "high") - (a.priority === "high") ||
      a.createdAt.localeCompare(b.createdAt),
  );
  const inbox = `<div class="tabs" role="tablist" aria-label="결재함 필터">${tabs.map(([id, t, n]) => `<button class="tab ${selected === id ? "active" : ""}" role="tab" aria-selected="${selected === id}" data-action="inbox-filter" data-value="${id}">${esc(t)}<span>${n}</span></button>`).join("")}</div>${visible.length ? visible.map((d) => docRow(s, d)).join("") : empty("지금은 확인할 서류가 없어요.", "기록을 저장하면 필요한 서류가 이곳에 모입니다.")}<div class="panel-footer"><span class="inbox-legend">${icon("shield")} 확인한 버전만 로컬 페이지에 반영됩니다.</span><span>${visible.length}개 서류</span></div>`;
  const cares = students
    .map((st) => ({ st, ...attention(s, st, s.date) }))
    .filter((x) => x.score >= s.settings.threshold)
    .sort((a, b) => b.score - a.score);
  return `<div class="page-heading home-heading"><div><div class="eyebrow">YOUR ACADEMY, IN GOOD ORDER</div><h1>${role === "teacher" ? "선생님, 오늘의 기록을 함께해요." : "오늘, 중요한 일부터."}</h1><p>${role === "teacher" ? "담당 반의 수업 기록과 검수를 한곳에서 확인하세요." : `원장님이 검토할 서류 ${pending.length}건을 정리했습니다. 차근차근 확인해 주세요.`}</p></div><div class="date-ornament">${icon("sun")}<div>${esc(dateLabel(s.date))}<br><span class="muted">기록이 쌓이는 하루</span></div></div></div>
 <div class="stats">${stat(role === "teacher" ? "내 검수 대기" : "결재 대기", role === "teacher" ? pending.filter((d) => d.status === "teacher_review").length : pending.length, "건", now.length ? `지금 확인이 필요한 서류 ${now.length}건` : "급히 확인할 서류가 없습니다", "inbox", true, pending.length ? approved.length / (approved.length + pending.length) : 1)}${stat("오늘 수업", agenda.length, "개 반", `${agenda.reduce((n, x) => n + students.filter((st) => st.classId === x.c.id).length, 0)}명의 수업이 예정되어 있어요`, "calendar")}${role === "owner" ? stat("확인할 수강료", new Intl.NumberFormat("ko-KR").format(overdue.reduce((n, i) => n + balance(s, i), 0)), "원", `기한이 지난 청구 ${overdue.length}건 · 로컬 장부`, "wallet") : stat("담당 학생", students.length, "명", "내 담당 반의 재원 학생", "users")}${stat(role === "owner" ? "재원 학생" : "오늘 기록", role === "owner" ? students.length : s.records.filter((r) => r.date === s.date).length, role === "owner" ? "명" : "명", role === "owner" ? `${s.classes.length}개 반에서 함께 배우고 있어요` : "확인하여 저장한 관찰만 집계", "users")}</div>
 ${failed.length ? `<div class="error-note">로컬 반영이 중지된 서류 ${failed.length}건이 있습니다. ${btn("확인하기", "delivery-list", "", "ghost", "arrow")}</div>` : ""}
 <div class="layout-main"><div>${panel(role === "teacher" ? "나의 검수함" : "원장님의 결재함", "내용과 근거를 살펴본 뒤 다음 단계로 진행하세요.", inbox, badge("서버 저장", "green"))}
 <div class="quick-links"><a class="quick-link" href="#lesson">${icon("book")}<div><strong>수업 기록하기</strong><small>확인한 학생부터 차근차근</small></div>${icon("chevron")}</a><a class="quick-link" href="#students">${icon("users")}<div><strong>학생 살펴보기</strong><small>학습과 수강 이력 한눈에</small></div>${icon("chevron")}</a><button class="quick-link" data-action="${role === "owner" ? "manager" : "go-wrong"}">${icon(role === "owner" ? "chat" : "file")}<div><strong>${role === "owner" ? "장부 도우미" : "맞춤 문제 준비"}</strong><small>${role === "owner" ? "확인된 기록에 관해 물어보세요" : "담당 학생의 오답부터"}</small></div>${icon("chevron")}</button></div></div>
 <aside class="stack side-column">${panel("오늘의 수업", dateLabel(s.date), `<div class="side-agenda">${agenda.length ? agenda.map(({ c, ...x }) => `<div class="agenda-row"><time class="agenda-time">${timeLabel(x.start)}</time><div class="agenda-info"><strong>${esc(c.name)}</strong><p>${esc(c.teacher)} · ${esc(x.room)} · ${timeLabel(x.end)}까지</p><button class="text-link" data-action="open-lesson" data-class="${esc(c.id)}">수업 기록 ${icon("arrow")}</button></div></div>`).join("") : empty("오늘은 예정 수업이 없어요.", "시간표에서 다음 수업을 확인하세요.", "calendar")}</div>`, `<a href="#timetable" class="text-link">전체 ${icon("chevron")}</a>`)}
 ${
   role === "owner"
     ? panel(
         "함께 살펴볼 학생",
         "최근 2주 기록 · 설정한 신호 기준",
         cares.length
           ? cares
               .slice(0, 3)
               .map(
                 (x) =>
                   `<div class="care-row"><div class="avatar">${initials(x.st.name)}</div><div><strong>${esc(x.st.name)}</strong><p>${esc(x.parts[0].label)}</p></div>${badge(x.score + "점", "amber")}</div>`,
               )
               .join("")
           : empty(
               "아직 쌓인 신호가 없어요.",
               "미관찰을 정상으로 판단하지 않습니다.",
               "heart",
             ),
       )
     : ""
 }
 <div class="side-note">${icon("leaf")}<h3>기록은 정확하게,<br>하루는 조금 더 가볍게.</h3><p>확인한 사실만 기록하고,<br>검토한 내용만 함께 나눕니다.</p>${btn("업무 흐름 알아보기", "guide", "", "secondary", "arrow")}</div>
 ${panel(
   "최근 기록",
   "학원 시간대 · Asia/Seoul",
   `<div class="activity">${
     s.audit?.length
       ? s.audit
           .slice(0, 3)
           .map(
             (x) =>
               `<div class="activity-row"><i class="event-dot"></i><div><strong>${esc(x.action)}</strong><p>${esc(x.detail)}</p><p>${esc(dateTime(x.at))} · ${esc(x.actor)}</p></div></div>`,
           )
           .join("")
       : empty(
           "새로운 시작을 기다리고 있어요.",
           "저장·검수·결재 기록이 이곳에 남습니다.",
           "clock",
         )
   }</div>`,
 )}</aside></div>`;
}
export function students(s, ui) {
  const f = ui.studentFilter || {};
  const owner = s.actor.role === "owner";
  const all = s.students.map((st) => ({
    st,
    care: attention(s, st, s.date),
    due: s.invoices
      .filter((i) => i.studentId === st.id && balance(s, i) > 0)
      .reduce((n, i) => n + balance(s, i), 0),
  }));
  const rows = all
    .filter(
      ({ st, care, due }) =>
        (!f.query ||
          [st.name, st.guardian, st.id].join(" ").includes(f.query)) &&
        (!f.classId || st.classId === f.classId) &&
        (!f.grade || st.grade === f.grade) &&
        (!f.only ||
          care.score >= s.settings.threshold ||
          due > 0 ||
          !st.consent),
    )
    .sort(
      (a, b) =>
        (b.care.score >= s.settings.threshold) -
          (a.care.score >= s.settings.threshold) ||
        (b.due > 0) - (a.due > 0) ||
        a.st.consent - b.st.consent ||
        a.st.name.localeCompare(b.st.name, "ko"),
    );
  return (
    heading(
      "STUDENTS",
      "학생 한 명, 하나의 기록.",
      "확인이 필요한 학생부터 살펴보세요.",
      owner ? btn("학생 등록", "student-new", "", "primary", "plus") : "",
    ) +
    panel(
      `학생 ${s.students.filter((x) => x.status === "active").length}명`,
      "이름을 누르면 수강 정보와 관련 기록이 열립니다.",
      `<form class="filters" data-form="student-filter">${field("이름·보호자 검색", "query", f.query || "", "search", 'placeholder="찾을 이름을 입력하세요" class="search-input"')}${select("반", "classId", [["", "전체 반"], ...s.classes.map((c) => [c.id, c.name])], f.classId)}${select("학년", "grade", [["", "전체 학년"], ...[...new Set(s.students.map((st) => st.grade))]], f.grade)}${checkbox("확인 필요한 학생만", "only", f.only)}<button class="button secondary" type="submit">조회</button></form><div class="table-wrap"><table><thead><tr><th>학생</th><th>반 · 학년</th><th>확인할 내용</th><th>수강 기간</th>${owner ? "<th>잔액</th>" : ""}<th>활용 동의</th></tr></thead><tbody>${rows
        .map(({ st, care, due }) => {
          const c = s.classes.find((c) => c.id === st.classId);
          return `<tr><td><button class="student-name" data-action="student" data-id="${esc(st.id)}"><span class="avatar">${initials(st.name)}</span><span>${esc(st.name)}<small>${st.status === "withdrawn" ? "퇴원" : "재원"} · ${esc(st.id.slice(0, 8))}</small></span></button></td><td>${esc(c?.name)}<div class="table-note">${esc(st.grade)}</div></td><td>${care.score >= s.settings.threshold ? badge(`살펴볼 기록 ${care.score}점`, "red") : due ? badge("수강료 확인", "amber") : !st.consent ? badge("동의 확인 필요", "amber") : badge("추가 확인 없음")}</td><td>${esc(st.termEnd)}<div class="table-note">기록 기준 ${remaining(s, st)}회 남음</div></td>${owner ? `<td class="num">${won(due)}</td>` : ""}<td>${badge(st.consent ? "확인" : "미확인", st.consent ? "green" : "amber")}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table>${!rows.length ? empty("조건에 맞는 학생이 없어요.", "필터를 바꾸거나 다른 이름을 검색해 보세요.", "search") : ""}</div>`,
      owner
        ? btn("CSV 내보내기", "students-export", "", "ghost", "download")
        : "",
    )
  );
}

export function lesson(s, ui) {
  const c = s.classes.find((c) => c.id === ui.lessonClass) || s.classes[0];
  if (!c) return empty("담당 반이 없습니다.");
  const date = ui.lessonDate || s.date;
  const scheduled = sessionsOn(c, date);
  const members = s.students.filter(
    (st) => st.classId === c.id && st.status === "active",
  );
  return (
    heading(
      "LESSON JOURNAL",
      "오늘 본 만큼만 기록해요.",
      "선택하지 않은 학생은 미관찰로 남습니다. 출결부터 하나씩 확인하세요.",
    ) +
    `<div class="lesson-controls">${select(
      "담당 반",
      "lessonClass",
      s.classes.map((c) => [c.id, c.name]),
      c.id,
      'data-control="lesson-class"',
    )}${field("수업 날짜", "lessonDate", date, "date", `max="${s.date}" min="${addDays(s.date, -90)}" data-control="lesson-date"`)}${btn("전체 출석 표시", "mark-present", "", "secondary", "check")}</div>` +
    panel(
      `${c.name} · ${members.length}명`,
      `${c.teacher} 선생님 · ${scheduled.length ? scheduled.map((x) => timeLabel(x.start) + "–" + timeLabel(x.end)).join(", ") : "이 날짜에는 수업이 없습니다"}`,
      scheduled.length
        ? `<form id="lessonForm" data-form="lesson"><input type="hidden" name="classId" value="${esc(c.id)}"><input type="hidden" name="date" value="${date}">${members
            .map((st) => {
              const key = `${c.id}:${date}:${st.id}`;
              const existing = s.records.find(
                (r) =>
                  r.studentId === st.id &&
                  r.classId === c.id &&
                  r.date === date,
              );
              const r = ui.lessonDraft[key] ||
                existing || {
                  att: null,
                  hw: null,
                  level: null,
                  memo: "",
                  shareMemo: false,
                };
              return `<section class="lesson-card" data-record="${esc(st.id)}" data-key="${esc(key)}"><div class="lesson-name"><span class="avatar">${initials(st.name)}</span><div><strong>${esc(st.name)}</strong><small>${existing ? "저장된 기록 · v" + existing.version : "미관찰"}${st.consent ? "" : " · 동의 미확인"}</small></div></div><div class="lesson-fields">${[
                ["att", "출결", ["출석", "지각", "결석"]],
                ["hw", "숙제", ["제출", "일부", "미제출"]],
                ["level", "이해도", ["잘 이해", "보통", "다시 설명 필요"]],
              ]
                .map(
                  ([k, label, values]) =>
                    `<div class="choice-row"><span>${label}</span><div class="chips" role="group" aria-label="${esc(st.name + " " + label)}">${values.map((v) => `<button type="button" class="chip ${r[k] === v ? "selected" : ""} ${v === "결석" ? "absent" : ""}" aria-pressed="${r[k] === v}" data-action="lesson-chip" data-key="${esc(key)}" data-field="${k}" data-value="${v}" ${k !== "att" && r.att === "결석" ? "disabled" : ""}>${v}</button>`).join("")}</div></div>`,
                )
                .join(
                  "",
                )}${field("내부 메모 (선택)", "memo", r.memo || "", "text", `maxlength="1000" data-lesson-memo="${esc(key)}" placeholder="확인한 사실을 짧게 남겨 주세요"`)}${checkbox("이 메모를 학부모 리포트 초안에도 포함", "shareMemo", r.shareMemo, `data-share-memo="${esc(key)}" ${r.att === "결석" ? "disabled" : ""}`)}</div></section>`;
            })
            .join(
              "",
            )}<div class="sticky-actions"><p>저장 후, 동의한 학생의 리포트를 준비합니다.<br>리포트 담당이 켜져 있을 때만 실행됩니다.</p><button type="submit" class="button primary">${icon("check")} 기록 저장</button></div></form>`
        : empty(
            "예정된 수업일을 선택해 주세요.",
            "날짜별 기록은 실제 시간표에 연결됩니다.",
            "calendar",
          ),
    )
  );
}

export function timetable(s, ui) {
  const date = ui.scheduleDate || s.date;
  const start = addDays(
    date,
    1 - (new Date(date + "T12:00:00+09:00").getUTCDay() || 7),
  );
  return (
    heading(
      "TIMETABLE",
      "겹치지 않게, 빠짐없게.",
      "변경할 요일만 수정하고, 적용일과 영향 검사를 확인하세요.",
      s.actor.role === "owner"
        ? btn("반 개설", "class-new", "", "primary", "plus")
        : "",
    ) +
    panel(
      "주간 시간표",
      `${dateLabel(start)}부터 · 날짜에 맞는 승인 시간표`,
      `<div class="panel-body">${field("확인할 날짜", "scheduleDate", date, "date", 'data-control="schedule-date"')}</div><div class="table-wrap"><div class="timetable">${[
        1, 2, 3, 4, 5,
      ]
        .map((day) => {
          const d = addDays(start, day - 1);
          const sessions = s.classes
            .flatMap((c) => sessionsOn(c, d).map((x) => ({ ...x, c })))
            .sort((a, b) => a.start - b.start);
          return `<div class="day-column"><h3>${DAYS[day]} <span class="muted">${d.slice(5).replace("-", ".")}</span></h3>${sessions.map(({ c, ...x }) => `<div class="session-block ${c.subject === "영어" ? "blue" : ""}"><time>${timeLabel(x.start)}–${timeLabel(x.end)}</time><strong>${esc(c.name)}</strong><p>${esc(c.teacher)} · ${esc(x.room)}</p></div>`).join("") || '<p class="small muted">예정 수업 없음</p>'}</div>`;
        })
        .join("")}</div></div>`,
    ) +
    `<div class="grid-three spaced">${s.classes
      .map((c) =>
        panel(
          c.name,
          `${c.teacher} · 정원 ${c.capacity || "—"}명`,
          `<div class="panel-body"><div class="info-list">${schedulesAt(c, date)
            .map(
              (x) =>
                `<div><span>${DAYS[x.day]}요일</span><strong>${timeLabel(x.start)}–${timeLabel(x.end)}</strong><span>${esc(x.room)}</span></div>`,
            )
            .join(
              "",
            )}</div>${s.actor.role === "owner" ? btn("시간표 변경안", "schedule-edit", `data-id="${esc(c.id)}"`, "secondary", "calendar") : ""}</div>`,
        ),
      )
      .join("")}</div>`
  );
}

export function billing(s, ui) {
  const f = ui.billFilter || {};
  const total = s.invoices.reduce((n, i) => n + i.amount - (i.credit || 0), 0);
  const totalPaid = s.payments.reduce((n, p) => n + p.amount, 0);
  const rows = s.invoices
    .map((i) => ({
      i,
      st: s.students.find((st) => st.id === i.studentId),
      bal: balance(s, i),
    }))
    .filter(
      ({ st, bal }) =>
        (!f.classId || st.classId === f.classId) && (!f.only || bal > 0),
    )
    .sort(
      (a, b) =>
        (b.i.due < s.date && b.bal > 0) - (a.i.due < s.date && a.bal > 0) ||
        b.bal - a.bal,
    );
  return (
    heading(
      "BILLING",
      "수납은 분명하게.",
      "청구와 입금을 따로 기록합니다. 실제 이체·결제는 연결되어 있지 않습니다.",
      btn("청구서 만들기", "invoice-new", "", "primary", "plus"),
    ) +
    `<div class="stats">${stat("청구 합계", new Intl.NumberFormat("ko-KR").format(total), "원", "감액 조정 반영", "file")}${stat("납부 기록", new Intl.NumberFormat("ko-KR").format(totalPaid), "원", "환불 조정을 포함한 순납부액", "check", true)}${stat("남은 잔액", new Intl.NumberFormat("ko-KR").format(total - totalPaid), "원", "전체 청구 기준", "wallet")}${stat("입금·조정 이력", s.payments.length, "건", "이력은 덮어쓰지 않고 보존합니다", "clock")}</div>` +
    panel(
      "수납 장부",
      "기한이 지난 청구가 먼저 표시됩니다.",
      `<form class="filters" data-form="billing-filter">${select("반", "classId", [["", "전체 반"], ...s.classes.map((c) => [c.id, c.name])], f.classId)}${checkbox("잔액 있는 청구만", "only", f.only)}<button class="button secondary">조회</button></form><div class="table-wrap"><table><thead><tr><th>학생 · 청구</th><th>청구액</th><th>납부액</th><th>잔액</th><th>납부 기한</th><th>기록하기</th></tr></thead><tbody>${rows.map(({ i, st, bal }) => `<tr><td><strong>${esc(st.name)}</strong><div class="table-note">${esc(i.label)}</div></td><td class="num">${won(i.amount - (i.credit || 0))}</td><td class="num">${won(paid(s, i))}</td><td class="num">${bal ? `<strong>${won(bal)}</strong>` : badge("완납", "green")}</td><td>${esc(i.due)}<div class="table-note">${bal && i.due < s.date ? "기한 경과" : ""}</div></td><td><div class="table-actions">${bal ? btn("입금 기록", "payment", `data-id="${esc(i.id)}"`, "light") : ""}${btn("이력", "invoice", `data-id="${esc(i.id)}"`, "secondary")}</div></td></tr>`).join("")}</tbody></table>${!rows.length ? empty("조건에 맞는 청구가 없습니다.") : ""}</div>`,
    ) +
    `<div class="local-banner">${icon("shield")} 입금 식별번호로 중복 기록을 방지합니다. 승인된 안내도 납부액이 바뀌면 반영 전에 다시 확인합니다.</div>`
  );
}

export function website(s) {
  const pending = s.bookings.filter((b) => b.status === "requested");
  const inquiries = s.conversations.filter((q) => q.status === "pending");
  return (
    heading(
      "FREE WEBSITE & GROWTH",
      "우리 학원의 웹사이트와 원장실.",
      "무료 웹사이트로 첫 만남을 만들고, 상담부터 등록까지 이어갑니다.",
      `<a class="button primary" href="/site" target="_blank" rel="noopener">${icon("external")} 학원 웹사이트 보기</a>`,
    ) +
    websiteManagement(s) +
    `<div class="stats">${stat("상담 요청", pending.length, "건", "원장 확인을 기다리고 있어요", "calendar", true)}${stat("답변할 문의", inquiries.length, "건", "지식 범위 밖의 질문", "chat")}${stat("확정한 상담", s.bookings.filter((b) => b.status === "confirmed").length, "건", "실제 등록 전환과 구분합니다", "check")}${stat("공개 소식", s.posts.filter((p) => p.active).length, "건", "이 로컬 앱에 반영한 공개본", "globe")}</div><div class="two-columns">${panel(
      "상담 신청",
      "요청 → 원장 결재 → 상담 확정 → 학생 등록",
      `<div class="panel-body entry-list">${
        s.bookings.length
          ? s.bookings
              .slice()
              .reverse()
              .map(
                (b) =>
                  `<article class="entry"><div class="entry-head"><h3>${esc(b.name)}</h3>${badge({ requested: "확정 대기", confirmed: "확정", expired: "기한 만료", cancelled: "취소" }[b.status] || b.status, b.status === "confirmed" ? "green" : "amber")}</div><p>${esc(dateLabel(b.date))} ${timeLabel(b.start)} · ${esc(b.room)}</p><p>${esc(s.classes.find((c) => c.id === b.classId)?.name)} · ${esc(b.phone)}</p><div class="entry-actions">${b.status === "requested" ? btn("요청 서류 보기", "booking-doc", `data-id="${esc(b.id)}"`, "light") : ""}${b.status === "confirmed" && !b.enrolledStudentId ? btn("학생 등록", "booking-enroll", `data-id="${esc(b.id)}"`, "light") : ""}${["requested", "confirmed"].includes(b.status) ? btn("예약 취소", "booking-cancel", `data-id="${esc(b.id)}"`, "ghost") : ""}${["requested", "confirmed"].includes(b.status) ? `<a class="button secondary" href="/studio?kind=guide&classId=${encodeURIComponent(b.classId)}&bookingId=${encodeURIComponent(b.id)}">상담 안내서 준비</a>` : ""}${b.enrolledStudentId ? badge("등록 연결 완료", "green") : ""}</div></article>`,
              )
              .join("")
          : empty(
              "첫 상담 요청을 기다리고 있어요.",
              "로컬 공개 페이지에서 상담을 신청해 볼 수 있습니다.",
              "calendar",
            )
      }</div>`,
    )}${panel(
      "방문자 문의",
      "복합 질문이나 모르는 내용은 자동으로 답하지 않습니다.",
      `<div class="panel-body entry-list">${
        s.conversations.length
          ? s.conversations
              .slice()
              .reverse()
              .map(
                (q) =>
                  `<article class="entry"><div class="entry-head">${badge(q.status === "answered" ? "답변 있음" : "확인 필요", q.status === "answered" ? "green" : "amber")}<span class="small muted">${esc(q.date)}</span></div><h3 class="spaced">${esc(q.question)}</h3>${q.answer ? `<p>${esc(q.answer)}</p>` : btn("답변 작성", "inquiry", `data-id="${esc(q.id)}"`, "light", "chat")}</article>`,
              )
              .join("")
          : empty(
              "아직 접수된 문의가 없어요.",
              "확인한 답변만 방문자의 확인번호에 연결됩니다.",
              "chat",
            )
      }</div>`,
    )}</div><div class="spaced">${panel("공개 답변 지식", "원장님이 확인하여 저장한 내용만 자동 답변에 사용합니다.", `<div class="panel-body knowledge-grid">${KNOWLEDGE.map(([key, label]) => `<form class="form-stack" data-form="knowledge"><input type="hidden" name="key" value="${key}">${area(label, "answer", s.knowledge.find((k) => k.id === key)?.answer || "", 'maxlength="2000" placeholder="비워 두면 담당자 확인으로 넘깁니다"')}<button class="button secondary" type="submit">답변 저장</button></form>`).join("")}</div>`, btn("공개 설정", "go-settings", "", "ghost", "settings"))}</div>`
  );
}

export function content(s) {
  const posts = s.posts.filter((p) => p.active);
  return (
    heading(
      "ACADEMY STORIES",
      "학원의 이야기를 담백하게.",
      "확인한 수업 이야기와 운영 소식을 적어 주세요.",
      btn("소식 작성", "content-new", "", "primary", "plus"),
    ) +
    `<section class="content-employee spaced"><div><span class="eyebrow">CORE-08 · 무료 제공</span><h2>콘텐츠 생성 직원에게 맡기세요.</h2><p>주제와 확인된 자료를 남기면 검토할 초안을 준비합니다.</p><p class="small muted">현재는 자료를 정리하는 로컬 작성 모드입니다. 외부 AI 생성은 연결 전입니다.</p></div><form data-form="content-generate" class="form-stack">${field("콘텐츠 주제", "topic", "", "text", 'required maxlength="100" placeholder="예: 다음 달 수업 안내"')}${select(
      "읽는 사람",
      "audience",
      [
        ["학부모", "재원 학부모"],
        ["신규 상담 학부모", "신규 상담 학부모"],
      ],
      "학부모",
    )}${area("확인된 자료", "facts", "", 'required maxlength="3000" rows="4" placeholder="일정, 수업 주제, 준비물 등 확인한 사실만 적어 주세요. 학생 개인정보는 넣지 마세요."')}<button type="submit" class="button primary">자료로 초안 준비 →</button></form></section><div class="two-columns spaced">${panel(
      "직접 쓰거나 운영 기록 활용",
      "원장님이 작성하고, 검토한 본문 그대로 반영합니다.",
      `<div class="panel-body entry-list">${[
        [
          "content",
          "수업 이야기",
          "학생 이름 없이 수업의 주제와 배운 내용을 담아 보세요.",
          "book",
        ],
        [
          "popup",
          "운영 일정 안내",
          "휴원일, 상담 일정처럼 꼭 필요한 소식을 간결하게.",
          "calendar",
        ],
        [
          "tuition",
          "수강료 공개 안내",
          "등록된 반별 수강료를 근거로 게시문을 준비합니다.",
          "wallet",
        ],
      ]
        .map(
          ([kind, title, description, ic]) =>
            `<article class="entry"><div class="entry-head"><h3>${icon(ic)} ${title}</h3></div><p>${description}</p><div class="entry-actions">${btn("초안 준비", kind === "tuition" ? "tuition" : "content-new", `data-kind="${kind}"`, "light", "plus")}</div></article>`,
        )
        .join("")}</div>`,
    )}${panel("로컬 공개본", `${posts.length}건 · 외부 플랫폼에는 연결되지 않았습니다.`, `<div class="panel-body entry-list">${posts.length ? posts.map((p) => `<article class="entry"><div class="entry-head"><h3>${esc(p.title)}</h3>${badge("공개본", "green")}</div><p>${esc(p.body.slice(0, 160))}</p><p>${esc(dateTime(p.at))}</p><div class="entry-actions">${btn("본문 복사", "post-copy", `data-id="${esc(p.id)}"`, "secondary", "copy")}${btn("공개본 내리기", "post-hide", `data-id="${esc(p.id)}"`, "ghost")}</div></article>`).join("") : empty("아직 공개한 소식이 없어요.", "새 소식을 작성하고 결재하면 이곳에 모입니다.", "leaf")}</div>`)}</div><div class="spaced">${panel("공유와 내보내기", "만들어진 파일과 실제 주소만 제공합니다.", `<div class="panel-body"><div class="entry-actions">${btn("학원 소개 SVG 카드", "share-card", "", "secondary", "download")}${btn("공개 페이지 주소 복사", "share-link", "", "secondary", "copy")}${btn("학원 소개 문안", "place-draft", "", "secondary", "file")}</div><p class="small muted spaced">로컬 주소는 이 컴퓨터에서만 열립니다. 외부 공유용 주소·QR은 실제 배포 주소를 연결한 뒤 만들 수 있습니다.</p></div>`)}</div>`
  );
}

export function workers(s) {
  return (
    heading(
      "WORKSPACE",
      "함께 일하는 업무실.",
      "실제로 실행되는 업무만 켜고 끄세요. 현재는 확인 가능한 규칙과 서식으로 준비합니다.",
    ) +
    `<div class="capabilities"><span class="capability">${icon("database")} 서버 저장 연결됨</span><span class="capability">${icon("check")} 규칙·서식 업무 실행 가능</span><span class="capability">${icon("spark")} 외부 AI 모델 미연결</span><span class="capability">${icon("globe")} 외부 발송·플랫폼 미연결</span></div><div class="grid-three">${s.workers
      .filter((w) => w.id !== "inquiry")
      .map(
        (w) =>
          `<article class="worker"><div class="row"><div class="worker-icon">${icon({ report: "file", billing: "wallet", care: "heart", pset: "book", booking: "calendar", inquiry: "chat", content: "leaf", reenroll: "users" }[w.id])}</div>${badge(w.enabled ? "업무 켜짐" : "일시 중지", w.enabled ? "green" : "neutral")}</div><h3>${esc(w.id === "booking" ? "예약·문의 직원" : w.id === "content" ? "콘텐츠 생성 직원" : w.name)}</h3>${["booking", "content"].includes(w.id) ? badge("무료 제공", "green") : ""}<p>${esc(w.description)}</p><div class="worker-meta"><span>실행 조건 · ${esc(w.trigger)}</span><span>마지막 실행 · ${esc(dateTime(w.lastRun))}</span><span>준비 실행 ${w.runs}회 · 규칙/서식 기반</span></div><div class="worker-footer">${["report", "billing", "care", "reenroll"].includes(w.id) ? btn("지금 준비", "worker-run", `data-id="${w.id}" ${w.enabled ? "" : "disabled"}`, "ghost", "refresh") : `<a class="button secondary" href="#${w.id === "content" ? "content" : w.id === "booking" ? "website" : "wrong"}">업무 열기 →</a>`}<button class="switch ${w.enabled ? "on" : ""}" role="switch" aria-checked="${w.enabled}" aria-label="${esc(w.name)} ${w.enabled ? "끄기" : "켜기"}" data-action="worker-toggle" data-id="${w.id}" data-enabled="${!w.enabled}"></button></div></article>`,
      )
      .join(
        "",
      )}</div><div class="local-banner">${icon("shield")} 업무를 끄면 새로운 자동 초안이 중지됩니다. 이미 결재한 서류의 로컬 반영은 계속됩니다.</div>`
  );
}

export function wrong(s, ui) {
  const c = s.classes.find((c) => c.id === ui.wrongClass) || s.classes[0];
  const students = s.students.filter(
    (st) => st.classId === c?.id && st.status === "active",
  );
  const qs = s.bank.filter(
    (q) => q.grade === c?.grade && q.subject === c?.subject,
  );
  return (
    heading(
      "LEARNING REVIEW",
      "오답에서, 다음 배움으로.",
      "이 앱을 위해 작성한 예시 문항입니다. 실제 문제와 해설을 확인한 뒤 검수하세요.",
    ) +
    `<div class="lesson-controls">${select(
      "담당 반",
      "wrongClass",
      s.classes.map((c) => [c.id, c.name]),
      c?.id,
      'data-control="wrong-class"',
    )}</div>` +
    panel(
      "틀린 문항 확인",
      "학생별 오답을 선택하면 같은 단원의 예시 문항을 준비합니다.",
      qs.length
        ? `<div class="panel-body entry-list">${students.map((st) => `<form class="entry form-stack" data-form="pset"><input type="hidden" name="studentId" value="${esc(st.id)}"><div class="entry-head"><h3>${esc(st.name)}</h3>${badge(st.consent ? "동의 확인" : "동의 필요", st.consent ? "green" : "amber")}</div>${qs.map((q) => checkbox(`${q.id} · ${q.unit} · ${q.q}`, "wrongIds", st.wrongIds?.includes(q.id), `value="${q.id}"`)).join("")}<button class="button secondary" type="submit" ${st.consent ? "" : "disabled"}>문제 세트 준비</button></form>`).join("")}</div>`
        : empty(
            "이 학년·과목의 문항은 준비 중입니다.",
            "문제은행이 없는 경우 문제를 만들어 낸 것처럼 표시하지 않습니다.",
            "book",
          ),
    ) +
    `<div class="spaced">${panel(
      "최근 문제 세트",
      "현재 근거가 바뀐 서류는 다시 준비해야 합니다.",
      s.docs
        .filter((d) => d.kind === "pset")
        .slice(0, 10)
        .map((d) => docRow(s, d))
        .join("") || empty("아직 준비한 문제 세트가 없습니다."),
    )}</div>`
  );
}

export function business(s) {
  return (
    heading(
      "BUSINESS SUPPORT",
      "운영에 필요한 문서를 차분하게.",
      "직접 확인한 정보를 서식으로 정리합니다. 법률·세무 판단과 전문가 연결은 제공하지 않습니다.",
    ) +
    `<div class="two-columns">${panel(
      "실제로 작성하는 초안",
      "필수 내용을 입력한 후 검토용 문서를 만듭니다.",
      `<div class="panel-body entry-list">${[
        [
          "contract",
          "수강 계약 확인서",
          "학생·수강 기간·교습비·추가 비용·동의 사항",
        ],
        ["notice", "휴원·보강 안내", "대상 반·일정·보강 여부·문의 방법"],
        ["hiring", "강사 채용 안내", "담당 과목·근무 조건·지원 방법"],
      ]
        .map(
          ([k, t, d]) =>
            `<div class="entry"><h3>${t}</h3><p>${d}</p><div class="entry-actions">${btn("내용 작성", "biz-new", `data-kind="${k}"`, "light", "file")}</div></div>`,
        )
        .join("")}</div>`,
    )}${panel("공식 기준 확인", "출처가 없는 기한·지원금·법률 문구는 표시하지 않습니다.", `<div class="panel-body"><div class="entry"><h3>교습비 반환 기준</h3><p>반환 사유, 교습기간과 경과 교습시간에 따라 달라집니다. 수납 화면의 계산기는 자발적 수강 포기·1개월 이내 교습에 한정됩니다.</p><a class="text-link" href="https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=2&csmSeq=1140" target="_blank" rel="noopener">생활법령정보에서 확인 ${icon("external")}</a></div><div class="form-note spaced">적용 지역·과세 형태·신고 종류를 확인하기 전에는 신고 기한이나 지원금 자격을 확정하지 않습니다. 외부 전문가 연결은 아직 미연결입니다.</div></div>`)}</div><div class="spaced">${panel(
      "작성한 문서",
      "결재 이력과 본문을 보존합니다.",
      s.docs
        .filter((d) => d.kind === "biz")
        .map((d) => docRow(s, d))
        .join("") ||
        empty(
          "아직 작성한 문서가 없습니다.",
          "원장님이 입력한 사실로 초안을 작성해 보세요.",
          "file",
        ),
    )}</div>`
  );
}

export function settings(s) {
  return (
    heading(
      "SETTINGS & HISTORY",
      "운영의 기준을 정합니다.",
      "학원 기본 정보, 공개 범위, 기록 보관 상태를 확인하세요.",
    ) +
    `<div class="two-columns">${panel("학원 기본 정보", "저장하면 로컬 공개 페이지에 반영됩니다.", `<form class="panel-body form-stack" data-form="settings">${field("학원 이름", "name", s.settings.name, "text", 'required maxlength="100"')}${field("주소·찾아오는 길", "address", s.settings.address, "text", 'required maxlength="150"')}${field("문의 연락처", "phone", s.settings.phone, "text", 'required maxlength="100"')}${checkbox("공개 페이지에 담당 강사 이름 표시", "showTeachers", s.settings.showTeachers)}${checkbox("공개 페이지에 반별 잔여석 표시", "showSeats", s.settings.showSeats)}<button class="button primary" type="submit">설정 저장</button></form>`)}${panel(
      "살펴볼 학생 기준",
      "확률이 아닌 관찰 신호의 합계입니다.",
      `<form class="panel-body form-stack" data-form="weights"><div class="form-grid">${[
        ["absent", "2주 내 결석 2회 이상"],
        ["homework", "숙제 연속 2회 미제출"],
        ["feedback", "최근 낮은 만족도 의견"],
        ["billing", "기한이 지난 수강료"],
      ]
        .map(([k, l]) =>
          field(
            l,
            k,
            s.settings.weights[k],
            "number",
            'min="0" max="20" required',
          ),
        )
        .join(
          "",
        )}${field("표시 기준 (합계)", "threshold", s.settings.threshold, "number", 'min="1" max="40" required')}</div><button type="submit" class="button secondary">기준 저장</button></form>`,
    )}</div><div class="two-columns spaced">${panel("데이터와 연결", "로컬 서버 · SQLite · 기록은 서버 파일에 저장됩니다.", `<div class="panel-body"><div class="info-list"><div><span>저장 상태</span>${badge("서버 연결", "green")}</div><div><span>데이터 변경 버전</span><b>${s.revision}</b></div><div><span>현재 데이터</span><span>예시 학원 · 로컬 체험</span></div><div><span>문자·결제</span>${badge("미연결")}</div><div><span>수업 체험 AI</span><a href="/studio">스튜디오에서 연결 상태 확인 →</a></div></div><div class="entry-actions"><a class="button secondary" href="/api/backup" download>${icon("download")} JSON 백업</a>${btn("이전 체험 기록 내보내기", "legacy-export", "", "ghost")}</div><p class="small muted spaced">이전 wonjangsil-v3 기록은 삭제하지 않았습니다. 내보내기 후 실제 기록 여부를 확인하고 별도 이관할 수 있습니다.</p></div>`)}${panel(
      "로컬 반영 상태",
      "원장 결재와 반영 결과를 따로 확인합니다.",
      `<div class="panel-body entry-list">${
        s.deliveries.length
          ? s.deliveries
              .slice(-5)
              .reverse()
              .map(
                (j) =>
                  `<div class="entry"><div class="entry-head"><h3>${esc(s.docs.find((d) => d.id === j.docId)?.title)}</h3>${badge(j.status === "local_delivered" ? "로컬 반영" : j.status === "queued" ? "대기" : "중지", j.status === "blocked" ? "red" : "green")}</div><p>${esc(j.note || "로컬 반영 작업 대기 중")}</p>${j.status === "blocked" ? btn("다시 확인", "delivery-retry", `data-id="${esc(j.id)}"`, "secondary", "refresh") : ""}</div>`,
              )
              .join("")
          : empty("아직 반영 이력이 없습니다.")
      }</div>`,
    )}</div><div class="spaced">${panel(
      "운영 기록",
      "수정·검수·결재·입금 작업을 남깁니다.",
      `<div class="table-wrap"><table><thead><tr><th>시간</th><th>사용자</th><th>작업</th><th>내용</th></tr></thead><tbody>${s.audit
        .slice(0, 60)
        .map(
          (e) =>
            `<tr><td>${esc(dateTime(e.at))}</td><td>${esc(e.actor)}</td><td>${esc(e.action)}</td><td>${esc(e.detail)}</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table>${!s.audit.length ? empty("아직 운영 기록이 없습니다.") : ""}</div>`,
    )}</div>`
  );
}

export function parent(s) {
  const st = s.students[0],
    c = s.classes[0];
  return `<div class="parent-layout"><div class="parent-hero"><div class="eyebrow">FAMILY NOTE</div><h1>${esc(st.name)} 학생의 소식이에요.</h1><p>연결된 자녀의 안내와 일정만 확인할 수 있습니다.</p></div><div class="stats">${stat("남은 수업", st.remaining, "회", st.termEnd + "까지", "book", true)}${stat("도착한 안내", s.approvals.length, "건", "확인된 본문 그대로", "file")}${stat("수강 잔액", new Intl.NumberFormat("ko-KR").format(s.invoices.reduce((n, i) => n + i.balance, 0)), "원", "학원에서 확인한 로컬 장부", "wallet")}${stat("상담 요청", s.bookings.filter((b) => ["requested", "confirmed"].includes(b.status)).length, "건", "아래에서 진행 상태 확인", "calendar")}</div>${panel(
    "도착한 안내",
    "담당 강사 검수와 원장 결재를 거친 학습 소식입니다.",
    `<div class="panel-body entry-list">${
      s.approvals.length
        ? s.approvals
            .slice()
            .reverse()
            .map(
              (a) =>
                `<article class="entry"><div class="entry-head"><h3>${esc(KIND[a.snapshot.kind])}</h3><span class="small muted">${esc(dateTime(a.at))}</span></div><div class="text-body spaced">${esc(a.snapshot.body)}</div></article>`,
            )
            .join("")
        : empty(
            "아직 도착한 안내가 없어요.",
            "학원에서 확인한 소식이 이곳에 도착합니다.",
            "file",
          )
    }</div>`,
  )}<div class="two-columns spaced">${panel(
    "수업 일정",
    c.name,
    `<div class="panel-body info-list">${schedulesAt(c, s.date)
      .map(
        (x) =>
          `<div><span>${DAYS[x.day]}요일</span><b>${timeLabel(x.start)}–${timeLabel(x.end)}</b><span>${esc(c.teacher)}</span></div>`,
      )
      .join("")}</div>`,
  )}${panel("상담 요청", "담당 강사와 상담실이 비어 있는 시간만 신청할 수 있어요.", `<div class="panel-body">${btn("상담 시간 보기", "parent-book", "", "primary", "calendar")}<div class="entry-list spaced">${s.bookings.map((b) => `<div class="entry"><p>${esc(dateLabel(b.date))} ${timeLabel(b.start)}</p>${badge({ requested: "학원 확인 중", confirmed: "확정", cancelled: "취소", expired: "기한 만료" }[b.status] || b.status, b.status === "confirmed" ? "green" : "amber")}${["requested", "confirmed"].includes(b.status) ? btn("취소", "booking-cancel", `data-id="${esc(b.id)}"`, "ghost") : ""}</div>`).join("")}</div></div>`)}</div><div class="two-columns spaced">${panel(
    "이번 달은 어떠셨나요?",
    "한 달에 한 번, 원장님께 의견을 남겨 주세요.",
    s.surveys.some((r) => r.date.slice(0, 7) === s.date.slice(0, 7))
      ? empty(
          "의견을 남겨 주셔서 감사합니다.",
          "학원에서 확인하겠습니다.",
          "heart",
        )
      : `<form class="panel-body form-stack" data-form="survey">${select(
          "만족도",
          "rating",
          [
            [5, "5 · 매우 만족"],
            [4, "4 · 만족"],
            [3, "3 · 보통"],
            [2, "2 · 아쉬움"],
            [1, "1 · 상담 필요"],
          ],
          5,
        )}${area("함께 나눌 이야기 (선택)", "note", "", 'maxlength="1000"')}<button class="button primary" type="submit">원장님께 보내기</button></form>`,
  )}${panel(
    "학부모 후기",
    "공개 후기에는 자녀의 이름·개인정보를 넣지 말아 주세요.",
    `<form class="panel-body form-stack" data-form="parent-review">${select(
      "평점",
      "rating",
      [
        [5, "5점"],
        [4, "4점"],
        [3, "3점"],
        [2, "2점"],
        [1, "1점"],
      ],
      5,
    )}${area("공개할 후기", "body", "", 'required maxlength="1000"')}${checkbox("로컬 공개 페이지에 익명 후기를 남기는 데 동의합니다.", "agree", false, "required")}<button class="button secondary" type="submit">후기 남기기</button></form>`,
  )}</div></div>`;
}
export function student(s) {
  const st = s.students[0];
  const sets = s.approvals.filter((a) => a.snapshot.kind === "pset");
  const latest = sets.slice().sort((a, b) => b.at.localeCompare(a.at))[0];
  return `<div class="parent-layout"><div class="parent-hero"><div class="eyebrow">MY LEARNING</div><h1>${esc(st.name)} 학생, 한 문제씩 함께해요.</h1><p>선생님이 검수하고 원장님이 확인한 문제만 표시합니다.</p></div>${panel("나의 연습 문제", latest ? `${latest.snapshot.questions.length}문항 · ${dateTime(latest.at)} 확인` : "문제를 준비하고 있어요.", latest ? `<div class="panel-body">${latest.snapshot.questions.map((q, i) => `<article class="question"><div class="eyebrow">QUESTION ${String(i + 1).padStart(2, "0")} · ${esc(q.unit)}</div><h3>${esc(q.q)}</h3><div class="answer-choices">${q.choices.map((v, n) => btn(`${n + 1}. ${v}`, "student-answer", `data-doc="${esc(latest.docId)}" data-question="${esc(q.id)}" data-answer="${n}"`, "answer-choice")).join("")}</div><div id="answer-${esc(q.id)}" aria-live="polite"></div></article>`).join("")}</div>` : empty("아직 도착한 문제가 없어요.", "선생님이 준비한 문제가 확인되면 여기에서 풀 수 있어요.", "book"))}</div>`;
}
