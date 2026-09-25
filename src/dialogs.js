import {
  esc,
  icon,
  btn,
  badge,
  field,
  area,
  select,
  checkbox,
  empty,
  dateTime,
} from "./ui.js";
import {
  STATUS,
  KIND,
  dateLabel,
  timeLabel,
  schedulesAt,
  won,
  balance,
  paid,
  addDays,
  DAYS,
  attention,
} from "../shared/core.js";
export const dialogFrame = (
  title,
  sub,
  body,
  footer = "",
  eyebrow = "원장실",
) =>
  `<header class="dialog-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h2 id="dialogTitle" tabindex="-1">${esc(title)}</h2><p>${esc(sub || "")}</p></div><button class="button icon-only ghost" data-action="close-dialog" aria-label="닫기">${icon("close")}</button></header><div class="dialog-body">${body}</div>${footer ? `<footer class="dialog-footer">${footer}</footer>` : ""}`;
export function documentDialog(s, d, edit = false) {
  const approval = s.approvals.find((a) => a.id === d.approvalId);
  const delivery = s.deliveries.find((j) => j.docId === d.id);
  const structured = ["timetable", "booking", "refund", "website"].includes(
    d.kind,
  );
  const editable =
    ["owner", "teacher"].includes(s.actor.role) &&
    !["stale", "cancelled"].includes(d.status) &&
    !structured;
  const body = `${badge(STATUS[d.status], d.status === "approved" ? "green" : d.status === "teacher_review" ? "blue" : "amber")}<div class="workflow"><span>초안</span>${icon("chevron")}<span>${d.reviewerId ? "담당 강사 검수" : "근거 확인"}</span>${icon("chevron")}<strong>원장 결재</strong>${d.channel !== "internal" ? `${icon("chevron")}<span>로컬 반영</span>` : ""}</div>
 <div class="evidence">${(d.evidence || []).map((e) => `<div><small>${esc(e.label)}</small>${esc(e.value)}</div>`).join("")}</div>
 ${d.status === "stale" ? `<div class="error-note">${esc(d.reason)}</div>` : ""}${d.status === "held" ? `<div class="form-note">${esc(dateTime(d.resumeAt))}에 다시 표시합니다.</div>` : ""}
 <div class="dialog-section">${d.recipient ? "받는 사람 · " + esc(d.recipient) : "내부 확인용"} · v${d.revision}</div>
 ${edit ? `<form id="docEditForm" data-form="doc-edit"><input type="hidden" name="id" value="${esc(d.id)}">${area("수정할 본문", "body", d.body, 'required maxlength="12000" rows="12"')}<p class="form-note spaced">문장을 수정하면 현재 버전의 검수·결재가 초기화됩니다. 이미 확인한 본문은 별도 이력으로 보존합니다.</p></form>` : `<div class="text-body">${esc(d.body)}</div>`}
 ${d.questions ? `<div class="dialog-section">검수할 실제 문항 · ${d.questions.length}개</div>${d.questions.map((q) => `<section class="question"><h3>${esc(q.q)}</h3><p class="small muted">${q.choices.map((c, i) => `${i + 1}. ${esc(c)}`).join(" / ")}</p><p class="small spaced"><b>정답 ${q.answer + 1}</b> · ${esc(q.explanation)}</p><p class="small muted">${esc(q.source)}</p></section>`).join("")}` : ""}
 ${approval ? `<div class="approval-proof">${icon("shield")} ${esc(dateTime(approval.at))} · 확인한 본문과 수신자 보존<code>SHA-256 ${esc(approval.hash)}</code></div>` : ""}
 ${delivery ? `<div class="form-note spaced">로컬 반영: ${delivery.status === "queued" ? "대기" : delivery.status === "local_delivered" ? "반영됨" : "중지"}<br>${esc(delivery.note || "로컬 반영 작업을 기다리고 있습니다.")}</div>` : ""}
 ${structured ? '<p class="form-note spaced">일정·금액은 구조화된 정보와 함께 보존합니다. 변경이 필요하면 이 요청을 취소하고 해당 업무 화면에서 새로 준비해 주세요.</p>' : ""}`;
  let footer =
    btn(
      "본문 저장",
      "doc-download",
      `data-id="${esc(d.id)}"`,
      "ghost",
      "download",
    ) + '<span class="spacer"></span>';
  if (edit)
    footer += `<button type="submit" form="docEditForm" class="button primary">수정본 저장</button>`;
  else {
    if (editable) footer += btn("고치기", "doc-edit", `data-id="${esc(d.id)}"`);
    if (s.actor.role === "teacher" && d.status === "teacher_review")
      footer += btn(
        "검수 완료",
        "doc-review",
        `data-id="${esc(d.id)}"`,
        "primary",
        "check",
      );
    if (s.actor.role === "owner") {
      if (["review", "teacher_review"].includes(d.status))
        footer += btn(
          "보류",
          "doc-hold",
          `data-id="${esc(d.id)}"`,
          "ghost",
          "clock",
        );
      if (d.status === "held")
        footer += btn("다시 검토", "doc-resume", `data-id="${esc(d.id)}"`);
      if (d.status === "review")
        footer += btn(
          "확인 · 결재",
          "doc-approve",
          `data-id="${esc(d.id)}"`,
          "primary",
          "check",
        );
      if (["review", "teacher_review", "held", "stale"].includes(d.status))
        footer += btn("취소", "doc-cancel", `data-id="${esc(d.id)}"`, "ghost");
    }
  }
  return dialogFrame(
    d.title,
    `${KIND[d.kind]} · ${dateTime(d.createdAt)} 준비`,
    body,
    footer,
    "REVIEW DOCUMENT",
  );
}
export function studentDialog(s, st) {
  const c = s.classes.find((c) => c.id === st.classId);
  const records = s.records
    .filter((r) => r.studentId === st.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const a = attention(s, st, s.date);
  return dialogFrame(
    st.name,
    `${st.grade} · ${c?.name} · ${st.status === "active" ? "재원" : "퇴원"}`,
    `<div class="evidence"><div><small>수강 기간</small>${esc(st.termStart)} ~ ${esc(st.termEnd)}</div><div><small>학습 정보 활용 동의</small>${st.consent ? "확인 · " + esc(st.consentAt) : "미확인"}</div>${s.actor.role === "owner" ? `<div><small>보호자</small>${esc(st.guardian)}</div><div><small>연락처</small>${esc(st.phone)}</div>` : ""}</div><div class="dialog-section">최근 수업 기록</div>${
      records.length
        ? records
            .slice(0, 12)
            .map(
              (r) =>
                `<div class="entry"><div class="entry-head"><strong>${esc(r.date)}</strong>${badge(r.att, r.att === "결석" ? "red" : "green")}</div><p>${esc(r.hw || "숙제 미관찰")} · ${esc(r.level || "이해도 미관찰")}</p>${r.memo ? `<p>내부 메모 · ${esc(r.memo)}</p>` : ""}</div>`,
            )
            .join("")
        : empty(
            "아직 관찰 기록이 없습니다.",
            "기록하지 않은 상태를 정상으로 판단하지 않습니다.",
            "book",
          )
    }<div class="dialog-section">최근 신호</div><div class="form-note">${a.parts.length ? a.parts.map((p) => `${esc(p.label)} · ${p.points}점`).join("<br>") : "확인한 신호가 없습니다."}</div><div class="dialog-section">학생이 직접 말한 관심·활동</div><div class="text-body">${esc(st.career || "아직 입력된 내용이 없습니다.")}</div><div class="dialog-section">개인 일정</div>${st.personal?.length ? st.personal.map((p) => `<p class="small">${DAYS[p.day]} ${timeLabel(p.start)}–${timeLabel(p.end)} · ${esc(p.label)}</p>`).join("") : '<p class="small muted">등록된 개인 일정이 없습니다.</p>'}`,
    `${s.actor.role === "owner" ? btn("정보 수정", "student-edit", `data-id="${esc(st.id)}"`, "primary") + btn("개인 일정", "personal-edit", `data-id="${esc(st.id)}"`) : ""}${st.career ? btn("진로 상담 초안", "career", `data-id="${esc(st.id)}"`) : ""}`,
    "STUDENT RECORD",
  );
}
export function studentForm(s, st = null, booking = null) {
  const grades = [
    "초1",
    "초2",
    "초3",
    "초4",
    "초5",
    "초6",
    "중1",
    "중2",
    "중3",
    "고1",
    "고2",
    "고3",
  ];
  const c =
    s.classes.find((c) => c.id === (booking?.classId || st?.classId)) ||
    s.classes[0];
  return dialogFrame(
    st ? "학생 정보 수정" : booking ? "상담에서 학생 등록" : "새 학생 등록",
    "확인한 기본 정보만 입력해 주세요.",
    `<form id="studentForm" data-form="student-save" class="form-grid">${st ? `<input type="hidden" name="id" value="${esc(st.id)}">` : ""}${booking ? `<input type="hidden" name="bookingId" value="${esc(booking.id)}">` : ""}${field("학생 이름", "name", st?.name || booking?.name || "", "text", 'required maxlength="40"')}${select("학년", "grade", grades, st?.grade || c.grade)}${field("보호자 이름", "guardian", st?.guardian || "", "text", 'required maxlength="60"')}${field("연락처", "phone", st?.phone || booking?.phone || "", "tel", 'required maxlength="30" placeholder="010-0000-0000"')}${select(
      "반",
      "classId",
      s.classes.map((c) => [c.id, c.name]),
      st?.classId || booking?.classId || c.id,
    )}${select(
      "재원 상태",
      "status",
      [
        ["active", "재원"],
        ["withdrawn", "퇴원"],
      ],
      st?.status || "active",
    )}${field("수강 시작", "termStart", st?.termStart || s.date, "date", "required")}${field("수강 종료", "termEnd", st?.termEnd || addDays(s.date, 90), "date", "required")}${field("총 수강 회차", "termTotal", st?.termTotal || 24, "number", 'min="1" max="300" required')}<div>${checkbox("학습 정보 활용 동의를 확인했습니다.", "consent", st?.consent || false)}</div><div class="full">${area("학생이 직접 말한 관심·활동 (선택)", "career", st?.career || "", 'maxlength="2000"')}</div><p class="form-note full">${st ? "변경된 학생 정보를 근거로 한 대기 서류는 중지됩니다. 동의 철회 시 학습 안내와 문제의 열람도 제한됩니다." : "등록과 함께 선택한 반의 수강료로 첫 청구서를 만듭니다. 정원이 찬 반에는 등록할 수 없습니다."}</p></form>`,
    `<button class="button primary" type="submit" form="studentForm">${st ? "변경 저장" : "등록 확정"}</button>`,
    "STUDENT INFORMATION",
  );
}
export function paymentForm(s, invoice) {
  const st = s.students.find((st) => st.id === invoice.studentId);
  return dialogFrame(
    "입금 기록",
    `${st.name} · ${invoice.label}`,
    `<div class="evidence"><div><small>남은 잔액</small>${won(balance(s, invoice))}</div><div><small>납부 기록</small>${won(paid(s, invoice))}</div></div><form id="paymentForm" data-form="payment" class="form-stack"><input type="hidden" name="invoiceId" value="${esc(invoice.id)}">${field("확인한 입금액 (원)", "amount", balance(s, invoice), "number", `required min="1" max="${balance(s, invoice)}" step="1"`)}${field("입금 식별번호", "reference", "", "text", 'required maxlength="100" placeholder="예: 통장 거래번호 또는 영수증 번호"')}${select("확인 방식", "method", ["계좌 입금 확인", "카드 영수증 확인", "현금 수납 확인"], "계좌 입금 확인")}<p class="form-note">실제 이체가 아닌 장부 기록입니다. 같은 거래는 같은 식별번호를 사용하세요. 중복 식별번호는 반영하지 않습니다.</p></form>`,
    `<button class="button primary" type="submit" form="paymentForm">입금 확인 · 저장</button>`,
    "PAYMENT RECORD",
  );
}
export function invoiceDialog(s, i) {
  const st = s.students.find((st) => st.id === i.studentId);
  const ps = s.payments.filter((p) => p.invoiceId === i.id);
  return dialogFrame(
    `${st.name} · ${i.label}`,
    "청구와 입금·조정 이력",
    `<div class="evidence"><div><small>청구액</small>${won(i.amount)}</div><div><small>감액 조정</small>${won(i.credit || 0)}</div><div><small>순납부액</small>${won(paid(s, i))}</div><div><small>잔액</small>${won(balance(s, i))}</div></div>${ps.map((p) => `<div class="receipt"><div><strong>${won(p.amount)}</strong><p class="muted">${esc(p.method)} · ${esc(p.actor)}</p><p class="muted small">식별번호 ${esc(p.reference)}</p></div><span>${esc(dateTime(p.at))}</span></div>`).join("") || empty("납부 기록이 없습니다.")}`,
    `${btn("장부 확인서 저장", "receipt", `data-id="${esc(i.id)}"`, "secondary", "download")}${paid(s, i) > 0 ? btn("환불 계산", "refund", `data-id="${esc(i.id)}"`) : ""}`,
    "INVOICE HISTORY",
  );
}
export function refundForm(s, i) {
  return dialogFrame(
    "환불 계산 조건",
    "자발적 수강 포기 · 교습기간 1개월 이내 · 독서실 제외",
    `<form id="refundForm" data-form="refund" class="form-stack"><input type="hidden" name="invoiceId" value="${esc(i.id)}">${select(
      "교습 시작 여부",
      "beforeStart",
      [
        ["false", "이미 시작함"],
        ["true", "시작 전"],
      ],
      "false",
    )}${field("총 교습시간", "totalHours", 12, "number", 'required min="1" max="300" step="1"')}${field("경과 교습시간", "elapsedHours", 0, "number", 'required min="0" max="300" step="1"')}${checkbox("위 적용 조건에 해당함을 확인했습니다.", "agree", false, "required")}<p class="form-note">계산 결과를 먼저 결재함에 준비합니다. 결재 시 장부의 환불·감액을 함께 기록하며 실제 송금은 수행하지 않습니다. 이미 환불 조정한 청구는 중복 처리하지 않습니다.</p></form>`,
    `<button form="refundForm" type="submit" class="button primary">계산표 준비</button>`,
    "REFUND WORKSHEET",
  );
}
export function contentForm(s, kind = "content") {
  return dialogFrame(
    kind === "popup" ? "상단 소식 작성" : "학원 소식 작성",
    "작성한 본문이 결재 후 그대로 로컬 공개본에 반영됩니다.",
    `<form id="contentForm" class="form-stack" data-form="content"><input type="hidden" name="kind" value="${esc(kind)}">${field("제목", "title", "", "text", 'required maxlength="100" placeholder="예: 이번 주 수업에서 함께 배운 것"')}${area("공개할 본문", "body", "", 'required maxlength="5000" rows="9" placeholder="학생 이름·개인정보와 성적·합격 실적을 제외하고 작성해 주세요."')}<p class="form-note">게시 범위: 이 로컬 앱의 학원 공개 페이지. agent1000·SNS 자동 게시는 연결되지 않았습니다.</p></form>`,
    `<button form="contentForm" type="submit" class="button primary">결재함에 초안 준비</button>`,
    "ACADEMY STORY",
  );
}
export function scheduleForm(s, c = null) {
  const rows = c
    ? schedulesAt(c, s.date)
    : [{ day: 1, start: 960, end: 1050, room: s.settings.rooms[0] }];
  return dialogFrame(
    c ? c.name + " 시간표 변경" : "새 반 개설",
    "각 요일은 독립적으로 수정됩니다. 모든 수업·상담·개인 일정과 겹침을 검사합니다.",
    `<form id="scheduleForm" data-form="schedule" class="form-stack">${
      c
        ? `<input name="classId" type="hidden" value="${esc(c.id)}">`
        : `<div class="form-grid">${field("반 이름", "name", "", "text", 'required maxlength="60"')}${select("학년", "grade", ["초5", "초6", "중1", "중2", "중3", "고1"], "중2")}${select("과목", "subject", ["수학", "영어"], "수학")}${select(
            "담당 강사",
            "teacherId",
            s.actors
              .filter((a) => a.role === "teacher")
              .map((a) => [a.id, a.name]),
            "teacher-kim",
          )}${field("정원", "capacity", 8, "number", 'required min="1" max="50"')}${field("월 수강료 (원)", "fee", 320000, "number", 'required min="0" max="10000000"')}</div>`
    }${field("적용일", "effectiveFrom", s.date, "date", `required min="${s.date}"`)}<div id="scheduleRows">${rows.map(scheduleRow).join("")}</div>${btn("수업 요일 추가", "schedule-row-add", "", "secondary", "plus")}<p class="form-note">${c ? "변경안은 원장 결재 전까지 현재 시간표에 영향을 주지 않습니다. 결재 후에도 적용일 이전에는 기존 시간표가 보입니다." : "개설 버튼으로 반과 첫 시간표를 확정합니다. 학생은 학생 등록에서 연결하세요."}</p></form>`,
    `<button form="scheduleForm" class="button primary" type="submit">${c ? "변경안 준비" : "반 개설 확정"}</button>`,
    "CLASS SCHEDULE",
  );
}
export function scheduleRow(
  x = { day: 1, start: 960, end: 1050, room: "1강의실" },
) {
  return `<div class="schedule-input">${select(
    "요일",
    "day",
    [
      [1, "월"],
      [2, "화"],
      [3, "수"],
      [4, "목"],
      [5, "금"],
      [6, "토"],
    ],
    x.day,
  )}${field("시작", "start", timeLabel(x.start), "time", 'required min="08:00" max="22:00"')}${field("종료", "end", timeLabel(x.end), "time", 'required min="08:15" max="23:00"')}${select("강의실", "room", ["1강의실", "2강의실", "상담실"], x.room)}<button type="button" class="button icon-only ghost" data-action="schedule-row-remove" aria-label="이 요일 삭제">${icon("close")}</button></div>`;
}
