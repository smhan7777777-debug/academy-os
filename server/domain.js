import { randomUUID, createHash } from "node:crypto";
import {
  today,
  addDays,
  dayOf,
  dateLabel,
  timeLabel,
  schedulesAt,
  sessionsOn,
  overlap,
  balance,
  paid,
  remaining,
  attention,
  won,
  KNOWLEDGE,
} from "../shared/core.js";
import { ACTORS, BANK } from "./seed.js";
import { websiteProfile } from "../shared/website.js";
import { siteDesign, templateById, FREE_STAFF } from "../shared/templates.js";
import { DomainError, check } from "./errors.js";
import { executeStudio, executeStudioPublic } from "./studio.js";
export { DomainError, check } from "./errors.js";

const id = (prefix) => prefix + "-" + randomUUID();
const txt = (value, label, max = 5000) => {
  check(
    typeof value === "string" && value.trim().length > 0 && value.length <= max,
    `${label}을(를) 확인해 주세요.`,
  );
  return value.trim();
};
const integer = (v, min, max, label) => {
  check(
    Number.isSafeInteger(v) && v >= min && v <= max,
    `${label} 범위를 확인해 주세요.`,
  );
  return v;
};
const validDate = (d) =>
  typeof d === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !Number.isNaN(Date.parse(d)) &&
  new Date(d).toISOString().slice(0, 10) === d;
const byId = (items, id, label = "항목") => {
  const item = items.find((x) => x.id === id);
  check(item, `${label}을 찾을 수 없습니다.`, 404);
  return item;
};
const owner = (a) => check(a.role === "owner", "원장 권한이 필요합니다.", 403);
const allowedStudent = (s, a, studentId) => {
  const st = byId(s.students, studentId, "학생");
  const c = byId(s.classes, st.classId);
  check(
    a.role === "owner" ||
      (a.role === "teacher" && c.teacherId === a.id) ||
      (["parent", "student"].includes(a.role) && a.studentId === st.id),
    "이 학생에 접근할 수 없습니다.",
    403,
  );
  return st;
};
const staffFor = (s, a, classId) => {
  const c = byId(s.classes, classId, "반");
  check(
    a.role === "owner" || (a.role === "teacher" && c.teacherId === a.id),
    "담당 반에만 기록할 수 있습니다.",
    403,
  );
  return c;
};
const enabled = (s, worker) => s.workers.find((w) => w.id === worker)?.enabled;
const requireWorker = (s, worker) =>
  check(
    enabled(s, worker),
    "해당 업무가 일시 중지되어 있습니다. 업무실에서 다시 켜 주세요.",
  );
const activeDocs = (d) =>
  ["review", "teacher_review", "held"].includes(d.status);
const stamp = () => new Date().toISOString();
function audit(s, a, action, detail) {
  s.audit.unshift({
    id: id("EV"),
    at: stamp(),
    actor: a.name,
    actorId: a.id,
    action,
    detail,
  });
}
function ran(s, worker) {
  const w = s.workers.find((x) => x.id === worker);
  if (w) {
    w.lastRun = stamp();
    w.runs++;
  }
}
const studentContext = (st) =>
  JSON.stringify([
    st.name,
    st.guardian,
    st.classId,
    st.status,
    st.consent,
    st.termStart,
    st.termEnd,
    st.termTotal,
  ]);
function doc(s, p) {
  const existing = s.docs.find(
    (d) => d.key === p.key && d.status !== "cancelled" && d.status !== "stale",
  );
  if (existing) return existing;
  const d = {
    id: id("DOC"),
    revision: 1,
    status: p.reviewerId ? "teacher_review" : "review",
    createdAt: stamp(),
    updatedAt: stamp(),
    priority: "normal",
    channel: "internal",
    evidence: [],
    ...p,
    ...(p.studentId
      ? { studentContext: studentContext(byId(s.students, p.studentId)) }
      : {}),
  };
  s.docs.unshift(d);
  return d;
}
function invalidate(s, predicate, reason) {
  s.docs
    .filter((d) => activeDocs(d) && predicate(d))
    .forEach((d) => {
      d.status = "stale";
      d.reason = reason;
      d.updatedAt = stamp();
    });
}
function validContent(s, text) {
  check(
    !/합격|1등급|만점|성적\s*향상|성적이\s*올/.test(text),
    "성적·합격 실적 표현을 빼고 수업이나 운영 소식으로 작성해 주세요.",
  );
  check(
    !s.students.some((st) => text.includes(st.name)),
    "공개 글에는 재원 학생 이름을 넣을 수 없습니다.",
  );
}
function report(s, st, r) {
  if (!enabled(s, "report") || !st.consent) return;
  const c = byId(s.classes, r.classId);
  const lines = [
    `${st.guardian}께,`,
    `${dateLabel(r.date)} ${c.name} 수업 기록을 안내드립니다.`,
    `출결: ${r.att}`,
  ];
  if (r.att !== "결석") {
    if (r.hw) lines.push(`숙제: ${r.hw}`);
    if (r.level) lines.push(`이해도 관찰: ${r.level}`);
    if (r.shareMemo && r.memo) lines.push(`선생님이 공유한 메모: ${r.memo}`);
  } else
    lines.push(
      "해당 수업의 참여·이해도는 관찰하지 않았습니다. 보강이 필요하면 학원으로 문의해 주세요.",
    );
  lines.push(
    "",
    "기록을 바탕으로 준비한 안내이며, 담당 강사 검수와 원장 결재 후 학부모 페이지에 반영됩니다.",
  );
  ran(s, "report");
  return doc(s, {
    key: `report:${r.id}:${r.version}`,
    kind: "report",
    title: `${st.name} · 수업 리포트`,
    studentId: st.id,
    reviewerId: c.teacherId,
    worker: "report",
    recipient: st.guardian,
    channel: "parent",
    body: lines.join("\n"),
    source: { type: "record", id: r.id, version: r.version },
    evidence: [
      { label: "수업", value: `${r.date} · ${c.name}` },
      { label: "기록한 강사", value: r.actor },
      { label: "출결", value: r.att },
      { label: "동의", value: st.consentAt || "확인" },
    ],
  });
}
function billing(s, inv, date = today()) {
  if (!enabled(s, "billing") || balance(s, inv) <= 0 || inv.due >= date) return;
  const st = byId(s.students, inv.studentId);
  if (st.status !== "active") return;
  ran(s, "billing");
  return doc(s, {
    key: `billing:${inv.id}:${inv.version}`,
    kind: "billing",
    worker: "billing",
    priority: "high",
    studentId: st.id,
    recipient: st.guardian,
    channel: "parent",
    title: `${st.name} · 수강료 확인`,
    body: `${st.guardian}께,\n${inv.label}의 미확인 잔액은 ${won(balance(s, inv))}입니다.\n납부 기한: ${inv.due}\n이미 납부하셨다면 학원에 확인을 요청해 주세요.\n\n${s.settings.name}`,
    source: { type: "invoice", id: inv.id, version: inv.version },
    evidence: [
      { label: "청구", value: won(inv.amount) },
      { label: "납부 기록", value: won(paid(s, inv)) },
      { label: "잔액", value: won(balance(s, inv)) },
    ],
  });
}
function care(s, date = today()) {
  if (!enabled(s, "care")) return;
  for (const st of s.students.filter((x) => x.status === "active")) {
    const a = attention(s, st, date);
    invalidate(
      s,
      (d) =>
        d.kind === "care" &&
        d.studentId === st.id &&
        (d.score !== a.score ||
          JSON.stringify(d.evidence) !==
            JSON.stringify(
              a.parts.map((p) => ({ label: p.label, value: p.points + "?" })),
            )),
      "현재 신호가 달라졌습니다.",
    );
    if (a.score >= s.settings.threshold)
      doc(s, {
        key: `care:${st.id}:${date}:${a.score}`,
        kind: "care",
        worker: "care",
        title: `${st.name} · 함께 살펴볼 기록`,
        studentId: st.id,
        score: a.score,
        priority: "high",
        body: `${st.name} 학생의 최근 기록을 담당 강사와 확인해 주세요.\n\n${a.parts.map((p) => `${p.label} (+${p.points})`).join("\n")}\n\n신호 합계 ${a.score}점입니다. 이유나 퇴원 확률을 추측하지 않습니다.`,
        evidence: a.parts.map((p) => ({
          label: p.label,
          value: p.points + "점",
        })),
      });
  }
}
export function daily(s, date = today()) {
  if (s.settings.lastDaily === date) return false;
  s.settings.lastDaily = date;
  s.invoices.forEach((i) => billing(s, i, date));
  care(s, date);
  if (enabled(s, "reenroll"))
    for (const st of s.students.filter(
      (st) =>
        st.status === "active" &&
        st.termEnd >= date &&
        st.termEnd <= addDays(date, 30),
    )) {
      doc(s, {
        key: `reenroll:${st.id}:${st.version}:${st.termEnd}:${remaining(s, st)}`,
        remainingAtDraft: remaining(s, st),
        kind: "reenroll",
        worker: "reenroll",
        studentId: st.id,
        title: `${st.name} · 다음 학기 상담`,
        recipient: st.guardian,
        channel: "parent",
        body: `${st.guardian}께,\n현재 수강 기간은 ${st.termEnd}까지입니다.\n현재 기록 기준 남은 수업은 ${remaining(s, st)}회입니다.\n다음 학기 수강 여부와 궁금한 점을 편하게 알려 주세요.`,
        source: { type: "student", id: st.id, version: st.version },
        evidence: [
          { label: "수강 종료", value: st.termEnd },
          { label: "남은 회차", value: remaining(s, st) + "회" },
        ],
      });
    }
  return true;
}

export function scheduleConflicts(
  s,
  classId,
  sessions,
  effectiveFrom,
  ignoreBooking,
) {
  const c = byId(s.classes, classId);
  const reasons = [];
  check(
    Array.isArray(sessions) && sessions.length > 0 && sessions.length <= 7,
    "주간 수업을 1~7개 입력해 주세요.",
  );
  for (const x of sessions) {
    integer(x.day, 1, 6, "요일");
    integer(x.start, 480, 1320, "시작 시간");
    integer(x.end, x.start + 15, 1380, "종료 시간");
    check(s.settings.rooms.includes(x.room), "등록된 강의실을 선택해 주세요.");
  }
  for (let i = 0; i < sessions.length; i++)
    for (let j = i + 1; j < sessions.length; j++)
      if (
        sessions[i].day === sessions[j].day &&
        overlap(sessions[i], sessions[j])
      )
        reasons.push("변경안 안에 겹치는 수업이 있습니다.");
  // Check every version boundary; weekly recurrence repeats between boundaries.
  const boundaries = new Set([
    effectiveFrom,
    ...s.classes
      .flatMap((o) => o.scheduleVersions.map((v) => v.effectiveFrom))
      .filter((d) => d >= effectiveFrom),
  ]);
  for (const date of boundaries)
    for (const x of sessions)
      for (const other of s.classes.filter((o) => o.id !== classId))
        for (const y of schedulesAt(other, date))
          if (
            x.day === y.day &&
            overlap(x, y) &&
            (c.teacherId === other.teacherId || x.room === y.room)
          )
            reasons.push(`${other.name}과 강사 또는 강의실 시간이 겹칩니다.`);
  for (const st of s.students.filter(
    (st) => st.classId === classId && st.status === "active",
  ))
    for (const p of st.personal || [])
      if (sessions.some((x) => x.day === p.day && overlap(x, p)))
        reasons.push(`${st.name}의 개인 일정과 겹칩니다.`);
  for (const b of s.bookings.filter(
    (b) =>
      b.id !== ignoreBooking &&
      ["requested", "confirmed"].includes(b.status) &&
      b.date >= effectiveFrom,
  ))
    if (
      sessions.some(
        (x) =>
          x.day === dayOf(b.date) &&
          overlap(x, b) &&
          (b.teacherId === c.teacherId || b.room === x.room),
      )
    )
      reasons.push(`${b.date} 상담 예약과 겹칩니다.`);
  return [...new Set(reasons)];
}
function slotFree(s, classId, date, start, room = "상담실", ignoreId) {
  const c = byId(s.classes, classId);
  const slot = { start, end: start + 30 };
  return (
    !s.classes.some((other) =>
      sessionsOn(other, date).some(
        (x) =>
          overlap(slot, x) &&
          (x.room === room || other.teacherId === c.teacherId),
      ),
    ) &&
    !s.bookings.some(
      (b) =>
        b.id !== ignoreId &&
        b.date === date &&
        ["requested", "confirmed"].includes(b.status) &&
        overlap(slot, b) &&
        (b.room === room || b.teacherId === c.teacherId),
    )
  );
}
export function slots(s, classId, date = today(), now = new Date()) {
  if (!s.classes.some((c) => c.id === classId)) return [];
  const result = [];
  for (let n = 0; n < 14; n++) {
    const d = addDays(date, n);
    if ([0, 6].includes(dayOf(d))) continue;
    for (let start = 840; start <= 1110; start += 30) {
      if (Date.parse(`${d}T${timeLabel(start)}:00+09:00`) <= now.getTime())
        continue;
      if (slotFree(s, classId, d, start))
        result.push({
          date: d,
          start,
          end: start + 30,
          room: "상담실",
          label: `${dateLabel(d)} ${timeLabel(start)}`,
        });
    }
  }
  return result;
}
function guard(s, d, date = today()) {
  if (d.kind === "website") {
    check(
      d.websiteRevision === (s.settings.websiteRevision || 0),
      "웹사이트의 다른 변경이 먼저 반영되었습니다. 현재 소개로 다시 준비해 주세요.",
    );
    check(
      d.websiteProfile && Object.keys(d.websiteProfile).length === 4,
      "웹사이트 변경 내용을 확인해 주세요.",
    );
    Object.values(d.websiteProfile).forEach((value) => validContent(s, value));
  }
  if (d.studentId) {
    const st = byId(s.students, d.studentId);
    check(
      st.status === "active" || d.kind === "refund",
      "퇴원한 학생의 서류입니다.",
    );
    check(
      d.studentContext === studentContext(st),
      "학생·수신 정보를 다시 확인해야 합니다. 새 초안을 준비해 주세요.",
    );
    if (d.kind === "reenroll")
      check(
        d.remainingAtDraft === remaining(s, st),
        "남은 수업 횟수가 바뀌었습니다. 새 초안을 준비해 주세요.",
      );
    if (["report", "pset", "career"].includes(d.kind))
      check(st.consent, "학습 정보 활용 동의를 먼저 확인해 주세요.");
  }
  if (d.source) {
    const lists = {
      invoice: s.invoices,
      record: s.records,
      student: s.students,
    };
    if (lists[d.source.type])
      check(
        byId(lists[d.source.type], d.source.id).version === d.source.version,
        "근거 기록이 바뀌었습니다. 새 초안을 준비해 주세요.",
      );
  }
  if (d.kind === "billing")
    check(
      balance(s, byId(s.invoices, d.source.id)) > 0,
      "완납되어 안내를 중지합니다.",
    );
  if (d.kind === "timetable") {
    const c = byId(s.classes, d.classId);
    check(
      c.version === d.classVersion,
      "시간표의 다른 변경이 먼저 반영되었습니다.",
    );
    const conflicts = scheduleConflicts(s, c.id, d.sessions, d.effectiveFrom);
    check(!conflicts.length, conflicts.join(" "));
  }
  if (d.kind === "booking") {
    const b = byId(s.bookings, d.bookingId);
    check(
      b.status === "requested" &&
        Date.parse(`${b.date}T${timeLabel(b.start)}:00+09:00`) > Date.now(),
      "이미 처리되었거나 지난 예약입니다.",
    );
    check(
      slotFree(s, b.classId, b.date, b.start, b.room, b.id),
      "요청 이후 강사 또는 강의실 시간이 찼습니다.",
    );
  }
  if (["content", "popup"].includes(d.kind)) validContent(s, d.body);
  if (d.kind === "inquiry")
    check(
      d.body.trim().length >= 2,
      "방문자에게 보낼 실제 답변을 입력해 주세요.",
    );
  if (d.kind === "pset")
    check(
      Array.isArray(d.questions) && d.questions.length > 0,
      "문항이 준비되지 않았습니다.",
    );
  if (d.kind === "refund") {
    const i = byId(s.invoices, d.invoiceId);
    check(paid(s, i) >= d.amount, "환불 가능 납부액이 달라졌습니다.");
  }
}
function approve(s, a, d) {
  owner(a);
  check(d.status === "review", "원장 결재 대기 상태에서만 결재할 수 있습니다.");
  guard(s, d);
  if (d.reviewerId)
    check(
      d.review?.actorId === d.reviewerId && d.review.revision === d.revision,
      "담당 강사의 현재 버전 검수가 필요합니다.",
    );
  const payload = {
    docId: d.id,
    revision: d.revision,
    body: d.body,
    recipient: d.recipient || "",
    channel: d.channel,
    studentId: d.studentId || null,
    kind: d.kind,
    source: d.source || null,
    questions: d.questions || null,
    websiteProfile: d.websiteProfile || null,
  };
  const snapshot = structuredClone(payload);
  const approval = {
    id: id("APR"),
    docId: d.id,
    revision: d.revision,
    actorId: a.id,
    at: stamp(),
    snapshot,
    hash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
  };
  s.approvals.push(approval);
  d.status = "approved";
  d.approvedAt = approval.at;
  d.approvalId = approval.id;
  if (d.kind === "timetable") {
    const c = byId(s.classes, d.classId);
    c.version++;
    c.scheduleVersions.push({
      version: c.version,
      effectiveFrom: d.effectiveFrom,
      sessions: structuredClone(d.sessions),
    });
  }
  if (d.kind === "booking") byId(s.bookings, d.bookingId).status = "confirmed";
  if (d.kind === "refund") {
    const i = byId(s.invoices, d.invoiceId);
    s.payments.push({
      id: id("PAY"),
      invoiceId: i.id,
      amount: -d.amount,
      date: today(),
      method: "환불 장부 조정",
      reference: approval.id,
      actor: a.name,
      at: stamp(),
    });
    i.credit += d.amount;
    i.version++;
    invalidate(
      s,
      (x) => x.source?.type === "invoice" && x.source.id === i.id,
      "환불 조정으로 금액이 변경되었습니다.",
    );
  }
  if (d.channel !== "internal")
    s.deliveries.push({
      id: id("DEL"),
      docId: d.id,
      approvalId: approval.id,
      status: "queued",
      attempts: 0,
      createdAt: stamp(),
      channel: d.channel,
    });
  audit(s, a, "원장 결재", d.title);
  return {
    message:
      d.channel === "internal"
        ? "결재 기록을 저장했습니다."
        : "결재했습니다. 로컬 반영 대기열에 추가했습니다.",
  };
}
export function tick(s, now = new Date()) {
  let changed = false;
  const date = today(now);
  // Earlier local drafts did not bind the recipient context. Keep their history,
  // but require a newly prepared draft instead of inferring historical consent.
  for (const d of s.docs.filter(
    (d) =>
      d.studentId &&
      activeDocs(d) &&
      (!d.studentContext ||
        (d.kind === "reenroll" && d.remainingAtDraft === undefined)),
  )) {
    d.status = "stale";
    d.reason = "이전 초안의 수신 정보와 수업 횟수를 다시 확인해야 합니다.";
    d.updatedAt = stamp();
    s.settings.lastDaily = null;
    changed = true;
  }
  if (daily(s, date)) changed = true;
  for (const d of s.docs.filter(
    (d) => d.status === "held" && d.resumeAt <= now.toISOString(),
  )) {
    d.status = d.reviewerId && !d.review ? "teacher_review" : "review";
    delete d.resumeAt;
    changed = true;
  }
  for (const b of s.bookings.filter(
    (b) =>
      b.status === "requested" &&
      (b.expiresAt <= now.toISOString() ||
        Date.parse(`${b.date}T${timeLabel(b.start)}:00+09:00`) <=
          now.getTime()),
  )) {
    b.status = "expired";
    invalidate(
      s,
      (d) => d.bookingId === b.id,
      "상담 요청의 유효 시간이 지났습니다.",
    );
    changed = true;
  }
  for (const job of s.deliveries.filter((j) => j.status === "queued")) {
    changed = true;
    const d = byId(s.docs, job.docId);
    const a = byId(s.approvals, job.approvalId);
    job.attempts++;
    try {
      guard(s, d, date);
      if (d.kind === "website") {
        s.settings.websiteProfile = structuredClone(a.snapshot.websiteProfile);
        s.settings.websiteRevision = (s.settings.websiteRevision || 0) + 1;
        s.settings.websiteUpdatedAt = stamp();
      }
      if (["content", "popup", "tuition"].includes(d.kind)) {
        s.posts.unshift({
          id: id("POST"),
          docId: d.id,
          approvalId: a.id,
          title: d.title,
          body: a.snapshot.body,
          kind: d.kind,
          at: stamp(),
          active: true,
        });
      }
      if (d.kind === "inquiry") {
        const q = byId(s.conversations, d.conversationId);
        q.answer = a.snapshot.body;
        q.status = "answered";
        if (d.knowledgeKey) {
          const k = s.knowledge.find((k) => k.id === d.knowledgeKey);
          if (k) {
            k.answer = a.snapshot.body;
            k.version++;
          } else
            s.knowledge.push({
              id: d.knowledgeKey,
              answer: a.snapshot.body,
              version: 1,
            });
        }
      }
      if (d.kind === "review")
        byId(s.reviews, d.reviewId).reply = a.snapshot.body;
      job.status = "local_delivered";
      job.completedAt = stamp();
      job.note = "이 로컬 앱에 반영됨 · 외부 문자/플랫폼 미연결";
    } catch (e) {
      job.status = "blocked";
      job.note = e.message;
    }
  }
  return changed;
}

export function execute(s, a, type, p = {}) {
  check(a && a.academyId === s.academyId, "학원 접근 권한이 없습니다.", 403);
  if (type.startsWith("studio.")) return executeStudio(s, a, type, p);
  const date = today();
  let result = { message: "저장했습니다." };
  switch (type) {
    case "record.save": {
      const c = staffFor(s, a, p.classId);
      check(
        validDate(p.date) && p.date <= date && p.date >= addDays(date, -90),
        "최근 90일 안의 수업일을 선택해 주세요.",
      );
      check(
        sessionsOn(c, p.date).length,
        "선택한 날짜에는 해당 반 수업이 없습니다.",
      );
      check(
        Array.isArray(p.records) && p.records.length <= 100,
        "수업 기록을 확인해 주세요.",
      );
      let count = 0;
      for (const entry of p.records) {
        const st = byId(s.students, entry.studentId);
        check(
          st.classId === c.id && st.status === "active",
          "담당 반의 재원 학생만 기록할 수 있습니다.",
        );
        if (!entry.att) continue;
        check(
          ["출석", "지각", "결석"].includes(entry.att),
          "출결을 확인해 주세요.",
        );
        check(
          [null, "", "제출", "일부", "미제출"].includes(entry.hw ?? null),
          "숙제 항목을 확인해 주세요.",
        );
        check(
          [null, "", "잘 이해", "보통", "다시 설명 필요"].includes(
            entry.level ?? null,
          ),
          "이해도 항목을 확인해 주세요.",
        );
        check(
          typeof (entry.memo || "") === "string" &&
            (entry.memo || "").length <= 1000,
          "메모는 1,000자 이내입니다.",
        );
        let r = s.records.find(
          (x) =>
            x.studentId === st.id && x.date === p.date && x.classId === c.id,
        );
        const data = {
          att: entry.att,
          hw: entry.att === "결석" ? null : entry.hw || null,
          level: entry.att === "결석" ? null : entry.level || null,
          memo: entry.memo || "",
          shareMemo: entry.shareMemo === true,
        };
        if (r && Object.keys(data).every((k) => r[k] === data[k])) continue;
        if (!r) {
          r = {
            id: id("REC"),
            studentId: st.id,
            classId: c.id,
            date: p.date,
            version: 0,
          };
          s.records.push(r);
        }
        Object.assign(r, data, {
          version: r.version + 1,
          actor: a.name,
          actorId: a.id,
          at: stamp(),
        });
        invalidate(
          s,
          (d) => d.source?.type === "record" && d.source.id === r.id,
          "수업 기록이 수정되었습니다.",
        );
        report(s, st, r);
        invalidate(
          s,
          (d) => d.kind === "reenroll" && d.studentId === st.id,
          "수업 기록으로 남은 횟수가 변경되었습니다.",
        );
        s.settings.lastDaily = null;
        count++;
      }
      daily(s, date);
      care(s, date);
      audit(s, a, "수업 기록", `${c.name} · ${p.date} · ${count}명`);
      result.message = count
        ? `${count}명의 확인한 기록을 저장했습니다.`
        : "변경한 관찰이 없습니다. 미관찰 상태를 유지했습니다.";
      break;
    }
    case "doc.edit": {
      check(
        ["owner", "teacher"].includes(a.role),
        "수정 권한이 없습니다.",
        403,
      );
      const old = byId(s.docs, p.id);
      check(
        a.role === "owner" || old.reviewerId === a.id,
        "담당 서류만 수정할 수 있습니다.",
        403,
      );
      check(
        !["timetable", "booking", "refund", "website"].includes(old.kind),
        "일정·금액 변경은 해당 업무 화면에서 새 요청으로 준비해 주세요.",
      );
      const body = txt(p.body, "내용", 12000);
      if (["content", "popup"].includes(old.kind)) validContent(s, body);
      check(
        !["stale", "cancelled"].includes(old.status),
        "이 서류는 새로 준비해야 합니다.",
      );
      if (body === old.body) break;
      let d = old;
      if (old.status === "approved") {
        d = {
          ...structuredClone(old),
          id: id("DOC"),
          key: id("revision"),
          parentDocId: old.id,
          createdAt: stamp(),
        };
        delete d.approvalId;
        delete d.approvedAt;
        s.docs.unshift(d);
      }
      d.body = body;
      d.revision++;
      d.status = d.reviewerId ? "teacher_review" : "review";
      delete d.review;
      delete d.resumeAt;
      d.updatedAt = stamp();
      audit(s, a, "서류 수정", `${d.title} · v${d.revision}`);
      result = {
        message: "수정본을 저장했습니다. 새 버전의 검수·결재가 필요합니다.",
        docId: d.id,
      };
      break;
    }
    case "doc.review": {
      const d = byId(s.docs, p.id);
      check(
        a.role === "teacher" && d.reviewerId === a.id,
        "지정된 담당 강사만 검수할 수 있습니다.",
        403,
      );
      check(
        d.status === "teacher_review",
        "강사 검수 대기 서류만 처리할 수 있습니다.",
      );
      guard(s, d);
      d.review = { actorId: a.id, at: stamp(), revision: d.revision };
      d.status = "review";
      audit(s, a, "강사 검수", d.title);
      result.message = "검수했습니다. 원장 결재함으로 전달했습니다.";
      break;
    }
    case "doc.approve":
      return approve(s, a, byId(s.docs, p.id));
    case "doc.hold": {
      owner(a);
      const d = byId(s.docs, p.id);
      check(activeDocs(d), "대기 서류만 보류할 수 있습니다.");
      const resume = p.resumeAt || `${addDays(date, 1)}T08:30:00+09:00`;
      check(
        Number.isFinite(Date.parse(resume)) &&
          Date.parse(resume) > Date.now() &&
          Date.parse(resume) <= Date.now() + 31 * 864e5,
        "31일 이내의 미래 시각을 선택해 주세요.",
      );
      d.resumeAt = new Date(resume).toISOString();
      d.status = "held";
      audit(s, a, "서류 보류", d.title);
      result.message = "보류함으로 옮겼습니다. 지정한 시각에 다시 표시합니다.";
      break;
    }
    case "doc.resume": {
      owner(a);
      const d = byId(s.docs, p.id);
      check(d.status === "held", "보류 중인 서류가 아닙니다.");
      d.status = d.reviewerId && !d.review ? "teacher_review" : "review";
      delete d.resumeAt;
      break;
    }
    case "doc.cancel": {
      owner(a);
      const d = byId(s.docs, p.id);
      check(
        activeDocs(d) || d.status === "stale",
        "대기 중인 서류만 취소할 수 있습니다.",
      );
      d.status = "cancelled";
      if (d.bookingId) byId(s.bookings, d.bookingId).status = "cancelled";
      audit(s, a, "서류 취소", d.title);
      break;
    }
    case "delivery.retry": {
      owner(a);
      const j = byId(s.deliveries, p.id);
      check(
        j.status === "blocked",
        "중지된 로컬 반영만 다시 시도할 수 있습니다.",
      );
      guard(s, byId(s.docs, j.docId));
      j.status = "queued";
      break;
    }
    case "payment.add": {
      owner(a);
      const i = byId(s.invoices, p.invoiceId);
      const amount = integer(p.amount, 1, balance(s, i), "입금액");
      const reference = txt(p.reference, "입금 식별번호", 100);
      check(
        !s.payments.some((x) => x.reference === reference),
        "이미 반영한 입금 식별번호입니다.",
        409,
      );
      s.payments.push({
        id: id("PAY"),
        invoiceId: i.id,
        amount,
        date,
        method: txt(p.method || "계좌 입금 확인", "입금 방식", 50),
        reference,
        actor: a.name,
        at: stamp(),
      });
      i.version++;
      invalidate(
        s,
        (d) => d.source?.type === "invoice" && d.source.id === i.id,
        "납부 금액이 바뀌었습니다.",
      );
      billing(s, i);
      care(s, date);
      audit(
        s,
        a,
        "입금 기록",
        `${byId(s.students, i.studentId).name} · ${won(amount)}`,
      );
      result.message =
        "입금 기록을 저장하고 미납 안내를 갱신했습니다. 실제 결제 처리는 하지 않습니다.";
      break;
    }
    case "invoice.create": {
      owner(a);
      const st = byId(s.students, p.studentId);
      check(st.status === "active", "재원 학생만 청구할 수 있습니다.");
      const label = txt(p.label, "청구명", 80);
      check(validDate(p.due), "납부 기한을 확인해 주세요.");
      check(
        !s.invoices.some((i) => i.studentId === st.id && i.label === label),
        "동일한 청구명이 이미 있습니다.",
      );
      s.invoices.push({
        id: id("INV"),
        studentId: st.id,
        label,
        amount: integer(p.amount, 1, 10000000, "청구액"),
        credit: 0,
        due: p.due,
        date,
        version: 1,
      });
      audit(s, a, "청구서 생성", `${st.name} · ${label}`);
      break;
    }
    case "refund.prepare": {
      owner(a);
      const i = byId(s.invoices, p.invoiceId);
      const total = integer(p.totalHours, 1, 300, "총 교습시간"),
        elapsed = integer(p.elapsedHours, 0, total, "경과 시간");
      check(
        p.beforeStart === true || p.beforeStart === false,
        "교습 시작 여부를 선택해 주세요.",
      );
      const ratio = p.beforeStart
        ? 1
        : elapsed * 3 < total
          ? 2 / 3
          : elapsed * 2 < total
            ? 1 / 2
            : 0;
      const amount = Math.min(paid(s, i), Math.floor(i.amount * ratio));
      check(amount > 0, "선택한 조건에서 반환 대상액이 없습니다.");
      check(
        !s.docs.some(
          (d) =>
            d.kind === "refund" &&
            d.invoiceId === i.id &&
            d.status === "approved",
        ),
        "이미 환불 조정한 청구입니다. 추가 조정은 장부를 확인해 주세요.",
      );
      doc(s, {
        key: `refund:${i.id}:${i.version}:${amount}`,
        kind: "refund",
        title: `${byId(s.students, i.studentId).name} · 환불 계산 확인`,
        priority: "high",
        invoiceId: i.id,
        studentId: i.studentId,
        amount,
        source: { type: "invoice", id: i.id, version: i.version },
        body: `자발적 수강 포기 · 교습기간 1개월 이내 · 독서실 제외\n총 교습시간 ${total}, 경과 ${elapsed}\n교습 시작 전: ${p.beforeStart ? "예" : "아니오"}\n청구액 ${won(i.amount)} · 기록된 순납부액 ${won(paid(s, i))}\n반환 계산액 ${won(amount)}\n\n원장 결재 시 로컬 장부의 환불·감액 조정만 기록합니다. 실제 송금은 별도 확인이 필요합니다. 다른 반환 사유와 1개월 초과 과정에는 이 계산을 적용하지 않습니다.`,
        evidence: [
          {
            label: "기준",
            value: "학원법 시행령 별표 4 · 적용 조건 확인 필요",
          },
          {
            label: "공식 안내",
            value:
              "https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=3&cnpClsNo=2&csmSeq=1140",
          },
        ],
      });
      break;
    }
    case "student.save": {
      owner(a);
      const c = byId(s.classes, p.classId);
      const name = txt(p.name, "학생 이름", 40);
      const guardian = txt(p.guardian, "보호자 이름", 60);
      const phone = txt(p.phone, "연락처", 30);
      check(
        /^0\d{8,10}$/.test(phone.replace(/[-\s]/g, "")),
        "연락처 숫자 9~11자리를 입력해 주세요.",
      );
      check(
        validDate(p.termStart) &&
          validDate(p.termEnd) &&
          p.termStart <= p.termEnd,
        "수강 기간을 확인해 주세요.",
      );
      check(
        [
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
        ].includes(p.grade),
        "학년을 선택해 주세요.",
      );
      check(
        ["active", "withdrawn"].includes(p.status || "active"),
        "재원 상태를 확인해 주세요.",
      );
      let st = p.id ? byId(s.students, p.id) : null;
      if ((p.status || "active") === "active")
        check(
          s.students.filter(
            (x) =>
              x.id !== st?.id && x.classId === c.id && x.status === "active",
          ).length < c.capacity,
          "선택한 반의 정원이 찼습니다.",
        );
      const values = {
        name,
        guardian,
        phone,
        classId: c.id,
        grade: p.grade,
        consent: p.consent === true,
        status: p.status || "active",
        termStart: p.termStart,
        termEnd: p.termEnd,
        termTotal: integer(p.termTotal, 1, 300, "총 수강 회차"),
        career:
          typeof p.career === "string"
            ? p.career.slice(0, 2000)
            : st?.career || "",
      };
      if (st) {
        const revoke = st.consent && !values.consent;
        Object.assign(st, values, {
          version: st.version + 1,
          consentAt: values.consent ? st.consentAt || date : null,
        });
        invalidate(
          s,
          (d) => d.studentId === st.id,
          "학생·수강 정보가 변경되었습니다.",
        );
        if (revoke)
          s.deliveries
            .filter(
              (j) =>
                j.status === "queued" &&
                byId(s.docs, j.docId).studentId === st.id,
            )
            .forEach((j) => {
              j.status = "blocked";
              j.note = "학습 정보 활용 동의가 철회되었습니다.";
            });
      } else {
        st = {
          id: id("STU"),
          ...values,
          consentAt: values.consent ? date : null,
          personal: [],
          version: 1,
        };
        s.students.push(st);
        s.invoices.push({
          id: id("INV"),
          studentId: st.id,
          label: date.slice(0, 7) + " 첫 수강료",
          amount: c.fee,
          credit: 0,
          date,
          due: addDays(date, 7),
          version: 1,
        });
      }
      audit(s, a, "학생 정보 저장", st.name);
      result.studentId = st.id;
      break;
    }
    case "student.personal": {
      owner(a);
      const st = byId(s.students, p.studentId);
      check(
        Array.isArray(p.personal) && p.personal.length <= 20,
        "개인 일정은 20개 이내입니다.",
      );
      st.personal = p.personal.map((x) => ({
        day: integer(x.day, 0, 6, "요일"),
        start: integer(x.start, 0, 1439, "시작"),
        end: integer(x.end, x.start + 1, 1440, "종료"),
        label: txt(x.label, "일정 이름", 80),
      }));
      st.version++;
      audit(s, a, "개인 일정 수정", st.name);
      break;
    }
    case "class.create": {
      owner(a);
      const t = ACTORS.find(
        (x) => x.id === p.teacherId && x.role === "teacher",
      );
      check(t, "강사를 선택해 주세요.");
      const c = {
        id: id("CLS"),
        name: txt(p.name, "반 이름", 60),
        grade: txt(p.grade, "학년", 10),
        subject: txt(p.subject, "과목", 20),
        teacherId: t.id,
        teacher: t.name,
        capacity: integer(p.capacity, 1, 50, "정원"),
        fee: integer(p.fee, 0, 10000000, "수강료"),
        version: 1,
        scheduleVersions: [],
      };
      s.classes.push(c);
      check(validDate(p.effectiveFrom), "적용일을 확인해 주세요.");
      const conflicts = scheduleConflicts(s, c.id, p.sessions, p.effectiveFrom);
      check(!conflicts.length, conflicts.join(" "));
      c.scheduleVersions.push({
        version: 1,
        effectiveFrom: p.effectiveFrom,
        sessions: p.sessions,
      });
      audit(s, a, "반 개설", c.name);
      break;
    }
    case "schedule.prepare": {
      owner(a);
      const c = byId(s.classes, p.classId);
      check(
        validDate(p.effectiveFrom) && p.effectiveFrom >= date,
        "오늘 이후 적용일을 선택해 주세요.",
      );
      const conflicts = scheduleConflicts(s, c.id, p.sessions, p.effectiveFrom);
      check(!conflicts.length, conflicts.join(" "));
      doc(s, {
        key: id("schedule"),
        kind: "timetable",
        title: `${c.name} · 시간표 변경`,
        classId: c.id,
        classVersion: c.version,
        sessions: p.sessions,
        effectiveFrom: p.effectiveFrom,
        priority: "high",
        body: `${c.name}\n적용일: ${p.effectiveFrom}\n${p.sessions.map((x) => `${["일", "월", "화", "수", "목", "금", "토"][x.day]} ${timeLabel(x.start)}–${timeLabel(x.end)} · ${x.room}`).join("\n")}\n\n결재 후 적용일에 맞춰 학부모·공개 페이지의 시간표가 변경됩니다.`,
        evidence: [
          {
            label: "검사",
            value: "모든 요일의 강사·교실·개인 일정·상담 예약 확인",
          },
        ],
      });
      audit(s, a, "시간표 변경안", c.name);
      break;
    }
    case "pset.prepare": {
      const st = allowedStudent(s, a, p.studentId);
      const c = staffFor(s, a, st.classId);
      requireWorker(s, "pset");
      check(st.consent, "학습 정보 활용 동의가 필요합니다.");
      check(
        Array.isArray(p.wrongIds) && p.wrongIds.length > 0,
        "틀린 예시 문항을 선택해 주세요.",
      );
      const qs = p.wrongIds.map((q) => byId(BANK, q, "문항"));
      check(
        qs.every((q) => q.grade === st.grade && q.subject === c.subject),
        "학년·과목에 맞는 문항을 선택해 주세요.",
      );
      st.version++;
      st.wrongIds = [...new Set(p.wrongIds)];
      invalidate(
        s,
        (d) => d.kind === "pset" && d.studentId === st.id,
        "오답 기록이 바뀌었습니다.",
      );
      const units = [...new Set(qs.map((q) => q.unit))];
      const questions = BANK.filter(
        (q) =>
          q.grade === st.grade &&
          q.subject === c.subject &&
          units.includes(q.unit),
      );
      doc(s, {
        key: `pset:${st.id}:${st.version}`,
        kind: "pset",
        worker: "pset",
        studentId: st.id,
        reviewerId: c.teacherId,
        title: `${st.name} · ${units.join(" · ")} 연습`,
        body: `확인한 오답: ${qs.map((q) => q.id).join(", ")}\n연습 단원: ${units.join(", ")}\n예시 문제은행에서 ${questions.length}문항을 준비했습니다.\n담당 강사가 문항과 해설을 검수한 뒤 학생에게 공개합니다.`,
        questions,
        source: { type: "student", id: st.id, version: st.version },
        channel: "student",
        recipient: st.name,
        evidence: [
          { label: "문항 출처", value: "로컬 앱을 위해 작성한 예시 문항" },
          { label: "오답 입력", value: a.name },
        ],
      });
      ran(s, "pset");
      break;
    }
    case "career.prepare": {
      const st = allowedStudent(s, a, p.studentId);
      const c = staffFor(s, a, st.classId);
      check(st.consent, "학습 정보 활용 동의가 필요합니다.");
      check(st.career, "학생이 직접 말한 관심·활동을 먼저 기록해 주세요.");
      doc(s, {
        key: `career:${st.id}:${st.version}`,
        kind: "career",
        title: `${st.name} · 진로 상담 준비`,
        studentId: st.id,
        reviewerId: c.teacherId,
        channel: "parent",
        recipient: st.guardian,
        source: { type: "student", id: st.id, version: st.version },
        body: `학생이 직접 말한 내용\n${st.career}\n\n다음 상담에서 확인할 질문\n1. 어떤 활동이 가장 기억에 남았나요?\n2. 다음에 직접 해 보고 싶은 것은 무엇인가요?\n\n적성·진학 가능성에 관한 판단은 포함하지 않았습니다.`,
        evidence: [{ label: "근거", value: "학생 자기 기록" }],
      });
      break;
    }
    case "student.answer": {
      check(a.role === "student", "학생 계정이 필요합니다.", 403);
      const d = byId(s.docs, p.docId);
      check(
        d.studentId === a.studentId &&
          d.kind === "pset" &&
          d.status === "approved" &&
          s.deliveries.some(
            (j) => j.docId === d.id && j.status === "local_delivered",
          ),
        "공개된 본인의 문제만 풀 수 있습니다.",
        403,
      );
      check(
        byId(s.students, a.studentId).consent,
        "학습 정보 활용 동의를 확인해 주세요.",
        403,
      );
      const snap = byId(s.approvals, d.approvalId).snapshot;
      const q = byId(snap.questions, p.questionId, "문항");
      integer(p.answer, 0, q.choices.length - 1, "답");
      const correct = p.answer === q.answer;
      s.answers.push({
        id: id("ANS"),
        studentId: a.studentId,
        docId: d.id,
        questionId: q.id,
        answer: p.answer,
        correct,
        at: stamp(),
      });
      result = {
        message: correct
          ? "정답입니다. 풀이를 확인해 보세요."
          : "풀이를 읽고 한 번 더 생각해 보세요.",
        correct,
        explanation: q.explanation,
      };
      break;
    }
    case "content.prepare": {
      owner(a);
      requireWorker(s, "content");
      const body = txt(p.body, "내용", 5000);
      validContent(s, body);
      check(
        ["content", "popup"].includes(p.kind),
        "게시 종류를 선택해 주세요.",
      );
      const d = doc(s, {
        key: id("content"),
        kind: p.kind,
        worker: "content",
        title: txt(p.title, "제목", 100),
        body,
        priority: "high",
        channel: "site",
        recipient: "로컬 학원 공개 페이지",
        evidence: [
          { label: "원문", value: "원장 직접 작성" },
          {
            label: "반영 범위",
            value: "이 로컬 앱의 공개 페이지 · 외부 플랫폼 미연결",
          },
        ],
      });
      ran(s, "content");
      result.docId = d.id;
      break;
    }
    case "tuition.prepare": {
      owner(a);
      const body = s.classes
        .map(
          (c) =>
            `${c.name}: 월 ${won(c.fee)} · 주 ${schedulesAt(c, date).length}회`,
        )
        .join("\n");
      doc(s, {
        key: "tuition:" + createHash("sha256").update(body).digest("hex"),
        kind: "tuition",
        title: "수강료 공개 안내",
        priority: "high",
        channel: "site",
        recipient: "로컬 학원 공개 페이지",
        body: `${s.settings.name}\n\n${body}\n\n추가 비용과 반환 기준은 학원에 확인해 주세요.`,
        evidence: [{ label: "근거", value: "반별로 등록한 수강료" }],
      });
      break;
    }
    case "post.hide": {
      owner(a);
      const post = byId(s.posts, p.id);
      post.active = false;
      audit(s, a, "공개본 내리기", post.title);
      break;
    }
    case "knowledge.save": {
      owner(a);
      check(
        KNOWLEDGE.some((k) => k[0] === p.key),
        "지식 항목을 확인해 주세요.",
      );
      const answer = typeof p.answer === "string" ? p.answer.trim() : "";
      check(answer.length <= 2000, "답변은 2,000자 이내입니다.");
      const k = s.knowledge.find((k) => k.id === p.key);
      if (k) {
        k.answer = answer;
        k.version++;
      } else s.knowledge.push({ id: p.key, answer, version: 1 });
      audit(s, a, "공개 답변 수정", p.key);
      break;
    }
    case "inquiry.prepare": {
      owner(a);
      const q = byId(s.conversations, p.id);
      const answer = txt(p.answer, "답변", 3000);
      check(
        !p.knowledgeKey || KNOWLEDGE.some((k) => k[0] === p.knowledgeKey),
        "지식 항목을 확인해 주세요.",
      );
      const d = doc(s, {
        key: `inquiry:${q.id}:${q.version || 1}`,
        kind: "inquiry",
        title: "방문자 문의 답변",
        conversationId: q.id,
        knowledgeKey: p.knowledgeKey || null,
        channel: "conversation",
        recipient: "문의한 방문자",
        body: answer,
        evidence: [{ label: "방문자 질문", value: q.question }],
      });
      result.docId = d.id;
      break;
    }
    case "booking.cancel": {
      const b = byId(s.bookings, p.id);
      check(
        a.role === "owner" ||
          (a.role === "parent" && b.studentId === a.studentId),
        "예약 취소 권한이 없습니다.",
        403,
      );
      check(
        ["requested", "confirmed"].includes(b.status),
        "이미 종료된 예약입니다.",
      );
      b.status = "cancelled";
      invalidate(s, (d) => d.bookingId === b.id, "상담이 취소되었습니다.");
      audit(s, a, "상담 취소", b.id);
      break;
    }
    case "booking.enroll": {
      owner(a);
      check(
        p.student && !p.student.id,
        "상담에서 새 학생을 등록해 주세요. 기존 학생 수정은 학생 화면에서 진행합니다.",
      );
      const b = byId(s.bookings, p.id);
      check(
        b.status === "confirmed" && !b.enrolledStudentId,
        "확정한 미등록 상담만 등록할 수 있습니다.",
      );
      const r = execute(s, a, "student.save", {
        ...p.student,
        name: b.name,
        guardian: p.student.guardian || b.name + " 보호자",
        phone: b.phone,
        classId: b.classId,
      });
      b.enrolledStudentId = r.studentId;
      audit(s, a, "상담에서 등록", b.name);
      result = r;
      break;
    }
    case "parent.book": {
      check(a.role === "parent", "학부모 계정이 필요합니다.", 403);
      const st = byId(s.students, a.studentId);
      check(st.status === "active", "재원 학생만 상담을 요청할 수 있습니다.");
      result = book(
        s,
        {
          ...p,
          name: st.name,
          phone: st.phone,
          classId: st.classId,
          studentId: st.id,
        },
        date,
      );
      break;
    }
    case "parent.survey": {
      check(a.role === "parent", "학부모 계정이 필요합니다.", 403);
      check(
        !s.surveys.some(
          (x) =>
            x.studentId === a.studentId &&
            x.date.slice(0, 7) === date.slice(0, 7),
        ),
        "이번 달 의견을 이미 남기셨습니다.",
      );
      const rating = integer(p.rating, 1, 5, "만족도");
      const note = typeof p.note === "string" ? p.note.slice(0, 1000) : "";
      s.surveys.push({
        id: id("SUR"),
        studentId: a.studentId,
        rating,
        note,
        date,
      });
      if (rating <= 3)
        doc(s, {
          key: `survey:${a.studentId}:${date}`,
          kind: "survey",
          priority: "high",
          studentId: a.studentId,
          title: "학부모 의견 확인",
          body: `만족도 ${rating}/5\n${note || "추가 의견 없음"}\n\n보호자와 직접 확인해 주세요. 이유를 추측하지 않습니다.`,
          evidence: [{ label: "접수일", value: date }],
        });
      care(s, date);
      break;
    }
    case "parent.review": {
      check(a.role === "parent", "재원 학부모 계정이 필요합니다.", 403);
      check(
        byId(s.students, a.studentId).status === "active",
        "재원 학부모만 후기를 남길 수 있습니다.",
      );
      const rating = integer(p.rating, 1, 5, "평점");
      const body = txt(p.body, "후기", 1000);
      validContent(s, body);
      const r = {
        id: id("REVIEW"),
        studentId: a.studentId,
        rating,
        body,
        date,
        reply: null,
      };
      s.reviews.push(r);
      doc(s, {
        key: "review:" + r.id,
        kind: "review",
        title: "학부모 후기 답글",
        body: "의견을 남겨 주셔서 감사합니다. 말씀해 주신 내용을 담당 선생님과 확인하겠습니다.",
        reviewId: r.id,
        channel: "site",
        recipient: "로컬 공개 후기",
        evidence: [{ label: "원문", value: body }],
      });
      break;
    }
    case "worker.toggle": {
      owner(a);
      const w = byId(s.workers, p.id);
      check(typeof p.enabled === "boolean", "설정값을 확인해 주세요.");
      w.enabled = p.enabled;
      // CORE-01 is one employee with two internal capabilities.
      if (["booking", "inquiry"].includes(w.id)) {
        s.workers
          .filter((x) => ["booking", "inquiry"].includes(x.id))
          .forEach((x) => {
            x.enabled = p.enabled;
          });
      }
      audit(s, a, "업무 설정", `${w.name} ${w.enabled ? "시작" : "중지"}`);
      break;
    }
    case "worker.run": {
      owner(a);
      const w = byId(s.workers, p.id);
      requireWorker(s, w.id);
      if (w.id === "billing") s.invoices.forEach((i) => billing(s, i));
      else if (w.id === "care") care(s);
      else if (w.id === "report")
        s.records.forEach((r) => report(s, byId(s.students, r.studentId), r));
      else if (w.id === "reenroll") {
        s.settings.lastDaily = null;
        daily(s);
      } else throw new DomainError("이 업무는 화면에서 요청할 때 실행됩니다.");
      ran(s, w.id);
      audit(s, a, "업무 실행", w.name);
      break;
    }
    case "website.configure": {
      owner(a);
      check(
        templateById(p.templateId),
        "제공된 학원 디자인 중에서 선택해 주세요.",
      );
      check(
        ["v1", "v2"].includes(p.video),
        "제공된 학원 영상을 선택해 주세요.",
      );
      for (const key of ["name", "address", "phone"]) {
        if (p[key] !== undefined) s.settings[key] = txt(p[key], key, 150);
      }
      check(
        p.rotate === undefined || typeof p.rotate === "boolean",
        "영상 자동 교체 설정을 확인해 주세요.",
      );
      s.settings.websiteDesign = {
        templateId: p.templateId,
        video: p.video,
        rotate: p.rotate === true,
      };
      s.settings.websiteConfiguredAt = stamp();
      s.settings.websiteRevision = (s.settings.websiteRevision || 0) + 1;
      invalidate(
        s,
        (d) => d.kind === "website",
        "웹사이트 디자인 또는 학원 정보가 변경되었습니다. 소개 변경안을 다시 확인해 주세요.",
      );
      audit(s, a, "웹사이트 디자인 적용", p.templateId);
      result = {
        message: "선택한 디자인과 영상을 학원 웹사이트에 적용했습니다.",
        href: "/site",
      };
      break;
    }
    case "content.generate": {
      owner(a);
      requireWorker(s, "content");
      const topic = txt(p.topic, "주제", 100);
      const facts = txt(p.facts, "확인된 자료", 3000);
      validContent(s, topic);
      validContent(s, facts);
      const audience = ["학부모", "신규 상담 학부모"].includes(p.audience)
        ? p.audience
        : "학부모";
      const title = `${topic} · ${s.settings.name}`;
      // Offline composer, explicitly labelled in the UI and audit evidence.
      // Never claim model generation or silently call a production workflow.
      const body = `${s.settings.name}에서 ${audience}께 안내드립니다.\n\n${topic}\n\n${facts}\n\n궁금한 내용은 웹사이트의 상담·문의 창구에 남겨 주세요. 학원에서 확인해 안내드리겠습니다.`;
      const d = doc(s, {
        key: id("content"),
        kind: "content",
        worker: "content",
        title,
        body,
        priority: "high",
        channel: "site",
        recipient: "학원 웹사이트 방문자",
        sourceBrief: { topic, facts, audience },
        generator: "local-composer",
        evidence: [
          { label: "직원", value: "CORE-08 · 콘텐츠 생성 직원 · 무료" },
          {
            label: "작성 방식",
            value: "입력 자료를 정리한 로컬 초안 · 외부 AI 미연결",
          },
          { label: "확인된 자료", value: facts },
        ],
      });
      ran(s, "content");
      result = {
        docId: d.id,
        message:
          "입력 자료로 초안을 준비했습니다. 고치거나 승인한 뒤 게시하세요.",
      };
      break;
    }
    case "website.custom.prepare": {
      owner(a);
      const notes = txt(p.notes, "학원 자료", 12000);
      validContent(s, notes);
      const sourceUrl =
        typeof p.sourceUrl === "string" ? p.sourceUrl.trim() : "";
      check(
        !sourceUrl ||
          (sourceUrl.length <= 2000 && /^https:\/\//i.test(sourceUrl)),
        "자료 링크는 https 주소로 입력해 주세요.",
      );
      const current = websiteProfile(s.settings);
      const request = {
        id: id("SITE"),
        status: "review",
        createdAt: stamp(),
        websiteRevision: s.settings.websiteRevision || 0,
        sourceUrl,
        notes,
        generator: "local-composer",
        files: Array.isArray(p.files)
          ? p.files.slice(0, 5).map((name) => txt(name, "파일명", 150))
          : [],
        profile: {
          ...current,
          intro: notes.slice(0, 400),
          about: notes.slice(0, 1500),
        },
      };
      s.websiteRequests ||= [];
      s.websiteRequests.unshift(request);
      audit(s, a, "맞춤 웹사이트 초안 준비", request.id);
      result = {
        requestId: request.id,
        message:
          "학원 자료로 초안을 준비했습니다. 내용을 확인하고 적용해 주세요.",
      };
      break;
    }
    case "website.custom.apply": {
      owner(a);
      const request = byId(s.websiteRequests || [], p.id, "맞춤 제작 초안");
      check(request.status === "review", "이미 처리한 초안입니다.");
      check(
        request.websiteRevision === (s.settings.websiteRevision || 0),
        "초안 작성 후 웹사이트가 변경되었습니다. 최신 정보로 초안을 다시 만들어 주세요.",
      );
      const profile = {};
      for (const [key, max] of [
        ["headline", 80],
        ["intro", 400],
        ["about", 1500],
        ["admission", 1500],
      ]) {
        profile[key] = txt(p.profile?.[key], "웹사이트 소개", max);
        validContent(s, profile[key]);
      }
      s.settings.websiteProfile = profile;
      s.settings.websiteRevision = (s.settings.websiteRevision || 0) + 1;
      s.settings.websiteUpdatedAt = stamp();
      s.settings.websiteConfiguredAt ||= stamp();
      request.status = "applied";
      request.reviewedAt = stamp();
      request.approvedBy = a.id;
      request.profile = structuredClone(profile);
      invalidate(
        s,
        (d) => d.kind === "website",
        "원장이 맞춤 웹사이트 내용을 적용했습니다.",
      );
      audit(s, a, "맞춤 웹사이트 검토·적용", request.id);
      result = {
        message: "확인한 내용을 웹사이트에 적용했습니다.",
        href: "/site",
      };
      break;
    }
    case "website.custom.reject": {
      owner(a);
      const request = byId(s.websiteRequests || [], p.id, "맞춤 제작 초안");
      check(request.status === "review", "이미 처리한 초안입니다.");
      request.status = "rejected";
      request.reviewedAt = stamp();
      audit(s, a, "맞춤 웹사이트 초안 보류", request.id);
      result = {
        message: "초안을 보류했습니다. 웹사이트는 그대로 유지됩니다.",
      };
      break;
    }
    case "website.prepare": {
      owner(a);
      const profile = {};
      for (const [key, label, max] of [
        ["headline", "첫 화면 제목", 80],
        ["intro", "첫 화면 소개", 400],
        ["about", "학원 소개", 1500],
        ["admission", "수강 안내", 1500],
      ]) {
        profile[key] = txt(p[key], label, max);
        validContent(s, profile[key]);
      }
      invalidate(
        s,
        (d) => d.kind === "website",
        "새 웹사이트 변경안이 준비되었습니다.",
      );
      const d = doc(s, {
        key: id("website"),
        kind: "website",
        title: "무료 웹사이트 · 소개와 수강 안내 변경",
        channel: "website",
        recipient: "학원 웹사이트 방문자",
        priority: "high",
        websiteProfile: profile,
        websiteRevision: s.settings.websiteRevision || 0,
        body: `첫 화면 제목\n${profile.headline}\n\n첫 화면 소개\n${profile.intro}\n\n학원 소개\n${profile.about}\n\n수강 안내\n${profile.admission}`,
        evidence: [
          { label: "연결", value: "원장실 결재 → 연결된 학원 웹사이트" },
          {
            label: "반영 범위",
            value: "현재 실행 중인 웹사이트 · 외부 배포와 별도",
          },
        ],
      });
      audit(s, a, "웹사이트 변경안", d.title);
      result = {
        message:
          "웹사이트 변경안을 결재함에 준비했습니다. 승인 전에는 기존 소개를 유지합니다.",
        docId: d.id,
      };
      break;
    }
    case "settings.save": {
      owner(a);
      for (const k of ["name", "address", "phone"])
        if (p[k] !== undefined) s.settings[k] = txt(p[k], k, 150);
      for (const k of ["showTeachers", "showSeats"])
        if (p[k] !== undefined) {
          check(typeof p[k] === "boolean", "공개 설정을 확인해 주세요.");
          s.settings[k] = p[k];
        }
      if (p.weights)
        for (const k of ["absent", "homework", "feedback", "billing"])
          s.settings.weights[k] = integer(p.weights[k], 0, 20, "신호 가중치");
      if (p.threshold !== undefined)
        s.settings.threshold = integer(p.threshold, 1, 40, "표시 기준");
      invalidate(s, (d) => d.kind === "care", "신호 기준이 변경되었습니다.");
      care(s);
      audit(s, a, "학원 설정", "기본 정보·공개·신호 설정");
      break;
    }
    case "biz.prepare": {
      owner(a);
      check(
        ["contract", "notice", "hiring", "place"].includes(p.kind),
        "서식 종류를 선택해 주세요.",
      );
      const title = {
        contract: "수강 계약 확인서",
        notice: "휴원·보강 안내",
        hiring: "강사 채용 안내",
        place: "학원 소개 자료",
      }[p.kind];
      const details = txt(p.details, "확인한 내용", 5000);
      doc(s, {
        key: id("biz"),
        kind: "biz",
        title,
        body: `${title} · 검토용 초안\n${s.settings.name}\n작성일 ${date}\n주소 ${s.settings.address}\n\n${details}\n\n작성·검토: 원장\n이 문서는 사용자가 입력한 정보를 정리한 초안입니다. 실제 계약·신고에 사용하기 전 관할 기준과 필수 기재사항을 확인해 주세요.`,
        evidence: [{ label: "근거", value: "학원 설정 + 원장 직접 입력" }],
      });
      break;
    }
    default:
      throw new DomainError("지원하지 않는 작업입니다.", 404);
  }
  return result;
}

function book(s, p, date = today()) {
  requireWorker(s, "booking");
  const c = byId(s.classes, p.classId);
  const name = txt(p.name, "이름", 40);
  const phone = txt(p.phone, "연락처", 30);
  check(
    /^0\d{8,10}$/.test(phone.replace(/[-\s]/g, "")),
    "연락처 숫자 9~11자리를 입력해 주세요.",
  );
  check(
    slots(s, c.id, date).some((x) => x.date === p.date && x.start === p.start),
    "그 시간에는 상담할 수 없습니다. 다른 시간을 골라 주세요.",
  );
  let quiz = null;
  if (p.quizToken) {
    quiz = s.quizzes.find((q) => q.token === p.quizToken);
    check(
      quiz && quiz.completed && quiz.expiresAt > stamp(),
      "유효한 본인의 레벨 확인 결과를 선택해 주세요.",
    );
    check(!quiz.bookingId, "이미 상담에 연결된 결과입니다.");
    check(
      c.grade === quiz.grade && c.subject === quiz.subject,
      "레벨 확인의 학년·과목에 맞는 반을 선택해 주세요.",
    );
  }
  const b = {
    id: id("BOOK"),
    token: randomUUID(),
    name,
    phone,
    classId: c.id,
    teacherId: c.teacherId,
    date: p.date,
    start: p.start,
    end: p.start + 30,
    room: "상담실",
    status: "requested",
    createdAt: stamp(),
    expiresAt: new Date(Date.now() + 864e5).toISOString(),
    studentId: p.studentId || null,
    quizId: quiz?.id || null,
  };
  s.bookings.push(b);
  if (quiz) quiz.bookingId = b.id;
  doc(s, {
    key: "booking:" + b.id,
    kind: "booking",
    worker: "booking",
    priority: "high",
    title: `${name} · 상담 요청`,
    bookingId: b.id,
    channel: "internal",
    body: `상담 요청: ${dateLabel(b.date)} ${timeLabel(b.start)}–${timeLabel(b.end)}\n담당: ${c.teacher}\n장소: ${b.room}\n희망 반: ${c.name}\n연락처: ${phone}${quiz ? `\n연결한 예시 레벨 확인: ${quiz.grade} ${quiz.subject} ${quiz.score}/${quiz.questionIds.length}` : ""}\n\n원장 결재 후 로컬 예약 확인 페이지에 확정 상태가 표시됩니다. 외부 문자 발송은 연결되지 않았습니다.`,
    evidence: [
      { label: "가용 시간", value: "담당 강사·상담실의 30분 전체 구간 검사" },
      {
        label: "요청 만료",
        value: "24시간 또는 예약 시작 시각 중 먼저 도래하는 때",
      },
    ],
  });
  ran(s, "booking");
  return {
    message:
      "상담 요청을 접수했습니다. 아래 확인번호로 진행 상황을 확인할 수 있습니다.",
    bookingToken: b.token,
  };
}
export function executePublic(s, type, p = {}) {
  if (type.startsWith("studio.")) return executeStudioPublic(s, type, p);
  const date = today();
  if (type === "booking") return book(s, { ...p, studentId: null }, date);
  if (type === "inquiry") {
    const question = txt(p.question, "질문", 1000);
    const matches = KNOWLEDGE.filter((k) =>
      k[2].some((w) => question.includes(w)),
    );
    let answer = "";
    if (enabled(s, "inquiry") && matches.length === 1)
      answer = s.knowledge.find((k) => k.id === matches[0][0])?.answer || "";
    const q = {
      id: id("CONV"),
      token: randomUUID(),
      question,
      answer: answer || null,
      status: answer ? "answered" : "pending",
      date,
      version: 1,
    };
    s.conversations.push(q);
    if (answer) ran(s, "inquiry");
    return {
      message:
        answer ||
        "확인이 필요한 질문으로 접수했습니다. 이 페이지의 확인번호로 답변을 다시 확인할 수 있습니다.",
      conversationToken: q.token,
    };
  }
  if (type === "quiz.start") {
    const qs = BANK.filter(
      (q) => q.grade === p.grade && q.subject === p.subject,
    );
    check(
      qs.length,
      "해당 학년·과목의 예시 문항은 준비 중입니다. 상담을 신청해 주세요.",
    );
    const q = {
      id: id("QUIZ"),
      token: randomUUID(),
      grade: p.grade,
      subject: p.subject,
      questionIds: qs.map((q) => q.id),
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
      completed: false,
      date,
    };
    s.quizzes.push(q);
    return {
      quizToken: q.token,
      questions: qs.map(({ answer, explanation, ...q }) => q),
    };
  }
  if (type === "quiz.finish") {
    const q = s.quizzes.find((q) => q.token === p.token);
    check(
      q && !q.completed && q.expiresAt > stamp(),
      "유효한 레벨 확인을 시작해 주세요.",
    );
    check(
      Array.isArray(p.answers) && p.answers.length === q.questionIds.length,
      "모든 문항에 답해 주세요.",
    );
    q.score = q.questionIds.filter((id, i) => {
      const question = byId(BANK, id);
      integer(p.answers[i], 0, question.choices.length - 1, "답");
      return question.answer === p.answers[i];
    }).length;
    q.completed = true;
    return {
      score: q.score,
      total: q.questionIds.length,
      grade: q.grade,
      subject: q.subject,
      classes: s.classes
        .filter((c) => c.grade === q.grade && c.subject === q.subject)
        .map((c) => ({ id: c.id, name: c.name })),
      message:
        "예시 문항의 정답 수입니다. 진단·수준 판정은 상담에서 담당 강사와 확인해 주세요.",
    };
  }
  throw new DomainError("지원하지 않는 공개 작업입니다.", 404);
}
export function publicState(s) {
  const date = today();
  return {
    date,
    settings: {
      name: s.settings.name,
      address: s.settings.address,
      phone: s.settings.phone,
      websiteProfile: websiteProfile(s.settings),
      websiteDesign: siteDesign(s.settings),
    },
    site: {
      id: `site:${s.academyId}`,
      academyId: s.academyId,
      configured: Boolean(s.settings.websiteConfiguredAt),
      mode: "local",
      href: "/site",
    },
    freeStaff: FREE_STAFF.map((w) => ({ ...w, enabled: enabled(s, w.id) })),
    classes: s.classes.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      subject: c.subject,
      teacher: s.settings.showTeachers ? c.teacher : null,
      sessions: schedulesAt(c, date),
      seats: s.settings.showSeats
        ? Math.max(
            0,
            c.capacity -
              s.students.filter(
                (st) => st.status === "active" && st.classId === c.id,
              ).length,
          )
        : null,
    })),
    posts: s.posts
      .filter((p) => p.active)
      .map(({ id, title, body, kind, at }) => ({ id, title, body, kind, at })),
    reviews: s.reviews.map(({ id, rating, body, reply, date }) => ({
      id,
      rating,
      body,
      reply,
      date,
    })),
    quizOptions: [
      ...new Map(
        BANK.map((q) => [
          q.grade + q.subject,
          { grade: q.grade, subject: q.subject },
        ]),
      ).values(),
    ],
    bookingEnabled: enabled(s, "booking"),
  };
}
export function project(s, a) {
  check(a?.academyId === s.academyId, "학원 접근 권한이 없습니다.", 403);
  const date = today();
  const base = {
    revision: s.revision,
    date,
    actor: a,
    mode: "local",
    settings: {
      name: s.settings.name,
      address: s.settings.address,
      phone: s.settings.phone,
      weights: s.settings.weights,
      threshold: s.settings.threshold,
    },
    bank: BANK,
  };
  if (a.role === "owner")
    return {
      ...structuredClone(s),
      ...base,
      settings: structuredClone(s.settings),
      actors: ACTORS,
      public: publicState(s),
    };
  if (a.role === "teacher") {
    const classes = s.classes.filter((c) => c.teacherId === a.id);
    const ids = s.students
      .filter((st) => classes.some((c) => c.id === st.classId))
      .map((st) => st.id);
    const ownDocs = s.docs.filter(
      (d) =>
        d.reviewerId === a.id && (!d.studentId || ids.includes(d.studentId)),
    );
    return {
      ...base,
      classes,
      students: s.students
        .filter((st) => ids.includes(st.id))
        .map(({ phone, guardian, ...st }) => st),
      records: s.records.filter(
        (r) =>
          ids.includes(r.studentId) && classes.some((c) => c.id === r.classId),
      ),
      docs: ownDocs.map((d) => ({
        ...d,
        recipient: d.studentId
          ? byId(s.students, d.studentId).name + " 보호자"
          : d.recipient,
      })),
      approvals: [],
      deliveries: [],
      invoices: [],
      payments: [],
      workers: s.workers.filter((w) => ["report", "pset"].includes(w.id)),
      surveys: [],
      audit: s.audit.filter((e) => e.actorId === a.id).slice(0, 50),
    };
  }
  const st = byId(s.students, a.studentId);
  const c = byId(s.classes, st.classId);
  const deliveries = s.deliveries.filter(
    (j) =>
      j.status === "local_delivered" &&
      s.docs.some((d) => d.id === j.docId && d.studentId === st.id),
  );
  const approvals = s.approvals.filter(
    (ap) =>
      deliveries.some((j) => j.approvalId === ap.id) &&
      ap.snapshot.channel === (a.role === "parent" ? "parent" : "student") &&
      (!["report", "pset", "career"].includes(ap.snapshot.kind) || st.consent),
  );
  return {
    ...base,
    bank: [],
    students: [
      {
        id: st.id,
        name: st.name,
        grade: st.grade,
        classId: st.classId,
        termEnd: st.termEnd,
        remaining: remaining(s, st),
        consent: st.consent,
        status: st.status,
      },
    ],
    classes: [
      {
        id: c.id,
        name: c.name,
        teacher: c.teacher,
        scheduleVersions: c.scheduleVersions,
      },
    ],
    records: [],
    docs: [],
    approvals: approvals.map((ap) => ({
      ...ap,
      snapshot: {
        ...ap.snapshot,
        questions: ap.snapshot.questions?.map(
          ({ answer, explanation, ...q }) => q,
        ),
      },
    })),
    deliveries: [],
    invoices:
      a.role === "parent"
        ? s.invoices
            .filter((i) => i.studentId === st.id)
            .map((i) => ({ ...i, paid: paid(s, i), balance: balance(s, i) }))
        : [],
    payments: [],
    bookings:
      a.role === "parent"
        ? s.bookings
            .filter((b) => b.studentId === st.id)
            .map(({ phone, token, ...b }) => b)
        : [],
    surveys: s.surveys.filter((r) => r.studentId === st.id),
    answers: s.answers.filter((r) => r.studentId === st.id),
  };
}
