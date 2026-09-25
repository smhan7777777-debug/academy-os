import test from "node:test";
import assert from "node:assert/strict";
import { WEBSITE_DEFAULTS } from "../shared/website.js";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import {
  execute,
  project,
  slots,
  scheduleConflicts,
  tick,
} from "../server/domain.js";
import { today, addDays, sessionsOn, balance } from "../shared/core.js";
const owner = ACTORS[0],
  teacher = ACTORS[1];
function fixture(t) {
  const db = new Store(":memory:");
  t.after(() => db.close());
  return db;
}
const command = (
  db,
  a,
  type,
  payload,
  id = randomUUID(),
  revision = db.load().revision,
) => db.command(a, { id, type, payload, revision });
function lessonDay(s) {
  for (let i = 0; i < 7; i++) {
    const date = addDays(today(), -i);
    if (sessionsOn(s.classes[0], date).length) return date;
  }
}
function record(db, entries = [{ studentId: "S1", att: "출석", hw: "제출" }]) {
  return command(db, teacher, "record.save", {
    classId: "A",
    date: lessonDay(db.load()),
    records: entries,
  });
}

test("untouched records remain unknown", (t) => {
  const db = fixture(t);
  record(db, []);
  assert.equal(db.load().records.length, 0);
  assert.equal(db.load().docs.filter((d) => d.kind === "report").length, 0);
});
test("absent report contains no homework or participation assertion", (t) => {
  const db = fixture(t);
  record(db, [{ studentId: "S1", att: "결석", hw: "제출", level: "잘 이해" }]);
  const s = db.load(),
    d = s.docs.find((d) => d.kind === "report");
  assert.equal(s.records[0].hw, null);
  assert.ok(d.body.includes("관찰하지 않았습니다"));
  assert.ok(!d.body.includes("숙제: 제출"));
});
test("disabled worker and consent exclusion prevent report creation", (t) => {
  const db = fixture(t);
  command(db, owner, "worker.toggle", { id: "report", enabled: false });
  record(db);
  assert.equal(db.load().docs.filter((d) => d.kind === "report").length, 0);
  command(db, owner, "worker.toggle", { id: "report", enabled: true });
  record(db, [{ studentId: "S5", att: "출석" }]);
  assert.equal(db.load().docs.filter((d) => d.kind === "report").length, 0);
});
test("saving the same lesson twice does not duplicate observations", (t) => {
  const db = fixture(t);
  record(db);
  record(db);
  assert.equal(db.load().records.length, 1);
  assert.equal(db.load().records[0].version, 1);
});
test("teacher may not access another class or approve documents", (t) => {
  const db = fixture(t);
  assert.throws(
    () =>
      command(db, teacher, "record.save", {
        classId: "C",
        date: today(),
        records: [],
      }),
    /담당 반/,
  );
  record(db);
  const d = db.load().docs.find((d) => d.kind === "report");
  assert.throws(
    () => command(db, teacher, "doc.approve", { id: d.id }),
    /원장 권한/,
  );
  assert.throws(
    () => command(db, owner, "doc.approve", { id: d.id }),
    /대기 상태/,
  );
});
test("reviewed report delivers exact snapshot to only its guardian", (t) => {
  const db = fixture(t);
  record(db);
  let d = db.load().docs.find((d) => d.kind === "report");
  command(db, teacher, "doc.review", { id: d.id });
  command(db, owner, "doc.approve", { id: d.id });
  assert.equal(db.load().deliveries[0].status, "queued");
  db.tick();
  const parent = project(db.load(), ACTORS[3]);
  assert.equal(parent.approvals[0].snapshot.body, d.body);
  assert.equal(parent.students.length, 1);
  assert.equal(parent.records.length, 0);
  assert.equal(parent.bank.length, 0);
});
test("teacher projection contains no accounting or other class students", (t) => {
  const db = fixture(t);
  const state = project(db.load(), teacher);
  assert.equal(state.payments.length, 0);
  assert.equal(state.invoices.length, 0);
  assert.ok(state.students.every((s) => s.classId !== "C"));
  assert.ok(!state.students[0].phone);
});
test("academy boundary is enforced", (t) => {
  const db = fixture(t);
  assert.throws(
    () => project(db.load(), { ...owner, academyId: "other" }),
    /접근 권한/,
  );
  assert.throws(
    () =>
      execute(db.load(), { ...owner, academyId: "other" }, "settings.save", {}),
    /접근 권한/,
  );
});
test("edited content publishes the reviewed text", (t) => {
  const db = fixture(t);
  const r = command(db, owner, "content.prepare", {
    kind: "content",
    title: "새 소식",
    body: "원문입니다.",
  });
  command(db, owner, "doc.edit", { id: r.docId, body: "수정한 원문입니다." });
  command(db, owner, "doc.approve", { id: r.docId });
  db.tick();
  assert.equal(db.load().posts[0].body, "수정한 원문입니다.");
});
test("meaning-changing edit creates new approval revision and preserves history", (t) => {
  const db = fixture(t);
  const d = db.load().docs.find((d) => d.kind === "billing");
  command(db, owner, "doc.approve", { id: d.id });
  const r = command(db, owner, "doc.edit", {
    id: d.id,
    body: d.body.replace("미확인 잔액", "납부 확인액"),
  });
  const s = db.load();
  assert.notEqual(r.docId, d.id);
  assert.equal(s.docs.find((x) => x.id === r.docId).status, "review");
  assert.equal(s.approvals[0].snapshot.body, d.body);
});
test("held work disappears from active review until scheduled time", (t) => {
  const db = fixture(t);
  const d = db.load().docs[0];
  command(db, owner, "doc.hold", { id: d.id });
  let s = db.load();
  assert.equal(s.docs.find((x) => x.id === d.id).status, "held");
  assert.ok(s.docs.find((x) => x.id === d.id).resumeAt);
  tick(s, new Date(Date.now() + 2 * 864e5));
  assert.equal(s.docs.find((x) => x.id === d.id).status, "review");
});
test("stale tab cannot overwrite payment and idempotency avoids duplicates", (t) => {
  const db = fixture(t);
  const rev = db.load().revision,
    id = randomUUID(),
    payload = {
      invoiceId: "INV3",
      amount: 100000,
      reference: "unique-bank-event",
    };
  command(db, owner, "payment.add", payload, id, rev);
  command(db, owner, "payment.add", payload, id, rev);
  assert.equal(
    db.load().payments.filter((p) => p.reference === payload.reference).length,
    1,
  );
  assert.throws(
    () =>
      command(
        db,
        owner,
        "doc.hold",
        { id: db.load().docs[0].id },
        randomUUID(),
        rev,
      ),
    /다른 화면/,
  );
  assert.equal(
    balance(
      db.load(),
      db.load().invoices.find((i) => i.id === "INV3"),
    ),
    220000,
  );
});
test("duplicate payment reference is rejected with a different command id", (t) => {
  const db = fixture(t);
  const payload = {
    invoiceId: "INV3",
    amount: 100000,
    reference: "same-event",
  };
  command(db, owner, "payment.add", payload);
  assert.throws(() => command(db, owner, "payment.add", payload), /이미 반영/);
});
test("write failure rolls back domain changes and receipts", (t) => {
  const db = fixture(t);
  db.db.exec(
    "CREATE TRIGGER reject_payment BEFORE INSERT ON payments BEGIN SELECT RAISE(ABORT,'test failure'); END;",
  );
  const before = db.load();
  assert.throws(() =>
    command(db, owner, "payment.add", {
      invoiceId: "INV3",
      amount: 100000,
      reference: "failure",
    }),
  );
  assert.deepEqual(db.load(), before);
});
test("full payment blocks queued old billing message", (t) => {
  const db = fixture(t);
  const d = db
    .load()
    .docs.find((d) => d.kind === "billing" && d.studentId === "S3");
  command(db, owner, "doc.approve", { id: d.id });
  command(db, owner, "payment.add", {
    invoiceId: "INV3",
    amount: 320000,
    reference: "paid",
  });
  db.tick();
  assert.equal(
    db.load().deliveries.find((j) => j.docId === d.id).status,
    "blocked",
  );
});
test("schedule checker finds collisions on every resulting day", (t) => {
  const db = fixture(t);
  const s = db.load();
  const proposed = [
    { day: 2, start: 1020, end: 1110, room: "1강의실" },
    { day: 3, start: 1020, end: 1110, room: "1강의실" },
  ];
  assert.ok(scheduleConflicts(s, "A", proposed, today()).length);
});
test("proposed timetable does not alter published timetable", (t) => {
  const db = fixture(t);
  const before = structuredClone(db.load().classes[0]);
  command(db, owner, "schedule.prepare", {
    classId: "A",
    effectiveFrom: addDays(today(), 3),
    sessions: [
      { day: 2, start: 1020, end: 1110, room: "1강의실" },
      { day: 3, start: 960, end: 1050, room: "1강의실" },
    ],
  });
  assert.deepEqual(db.load().classes[0], before);
});
test("booking checks availability and reserves against a racing second request", (t) => {
  const db = fixture(t);
  const slot = slots(db.load(), "A")[0];
  const payload = {
    ...slot,
    classId: "A",
    name: "테스트",
    phone: "01012345678",
  };
  const result = db.command(
    null,
    { id: randomUUID(), type: "booking", payload },
    true,
  );
  assert.ok(result.bookingToken);
  assert.throws(
    () =>
      db.command(null, { id: randomUUID(), type: "booking", payload }, true),
    /상담할 수 없습니다/,
  );
});
test("public information honors teacher visibility and excludes private data", (t) => {
  const db = fixture(t);
  command(db, owner, "settings.save", { showTeachers: false });
  const p = project(db.load(), owner).public;
  assert.ok(p.classes.every((c) => c.teacher === null));
  assert.ok(!JSON.stringify(p).includes("010-0000"));
  assert.ok(!p.bookings);
});
test("inquiry approval delivers to original conversation", (t) => {
  const db = fixture(t);
  db.command(
    null,
    {
      id: randomUUID(),
      type: "inquiry",
      payload: { question: "셔틀버스가 있나요?" },
    },
    true,
  );
  const q = db.load().conversations[0];
  const r = command(db, owner, "inquiry.prepare", {
    id: q.id,
    answer: "셔틀은 운영하지 않습니다.",
  });
  command(db, owner, "doc.approve", { id: r.docId });
  db.tick();
  assert.equal(db.load().conversations[0].answer, "셔틀은 운영하지 않습니다.");
});
test("ambiguous tuition/refund inquiry escalates instead of returning wrong FAQ", (t) => {
  const db = fixture(t);
  command(db, owner, "knowledge.save", {
    key: "tuition",
    answer: "수강료 안내",
  });
  db.command(
    null,
    {
      id: randomUUID(),
      type: "inquiry",
      payload: { question: "수강료 환불은 어떻게 하나요?" },
    },
    true,
  );
  assert.equal(db.load().conversations[0].status, "pending");
});
test("quiz does not accept unsupported grade or attach to unrelated bookings", (t) => {
  const db = fixture(t);
  assert.throws(
    () =>
      db.command(
        null,
        {
          id: randomUUID(),
          type: "quiz.start",
          payload: { grade: "초5", subject: "수학" },
        },
        true,
      ),
    /준비 중/,
  );
  const q = db.command(
    null,
    {
      id: randomUUID(),
      type: "quiz.start",
      payload: { grade: "초6", subject: "수학" },
    },
    true,
  );
  assert.ok(q.questions.every((q) => !("answer" in q)));
  const slot = slots(db.load(), "A")[0];
  db.command(
    null,
    {
      id: randomUUID(),
      type: "booking",
      payload: {
        ...slot,
        classId: "A",
        name: "별도 지원자",
        phone: "01012345678",
      },
    },
    true,
  );
  assert.equal(db.load().bookings[0].quizId, null);
});
test("student receives reviewed problems without answer keys", (t) => {
  const db = fixture(t);
  command(db, teacher, "pset.prepare", { studentId: "S1", wrongIds: ["Q1"] });
  const d = db.load().docs.find((d) => d.kind === "pset");
  command(db, teacher, "doc.review", { id: d.id });
  command(db, owner, "doc.approve", { id: d.id });
  db.tick();
  const p = project(db.load(), ACTORS[4]);
  assert.ok(
    p.approvals[0].snapshot.questions.every(
      (q) => !("answer" in q) && !("explanation" in q),
    ),
  );
  const result = command(db, ACTORS[4], "student.answer", {
    docId: d.id,
    questionId: "Q1",
    answer: 1,
  });
  assert.equal(result.correct, true);
});
test("minor names and performance claims blocked in public content", (t) => {
  const db = fixture(t);
  for (const body of ["이서준 학생의 이야기", "이번 시험 만점"])
    assert.throws(() =>
      command(db, owner, "content.prepare", {
        kind: "content",
        title: "소식",
        body,
      }),
    );
});
test("refund creates immutable negative payment and matching invoice credit", (t) => {
  const db = fixture(t);
  command(db, owner, "refund.prepare", {
    invoiceId: "INV1",
    totalHours: 12,
    elapsedHours: 0,
    beforeStart: true,
  });
  const d = db.load().docs.find((d) => d.kind === "refund");
  command(db, owner, "doc.approve", { id: d.id });
  const s = db.load();
  assert.equal(
    balance(
      s,
      s.invoices.find((i) => i.id === "INV1"),
    ),
    0,
  );
  assert.equal(
    s.payments.find((p) => p.reference === s.approvals[0].id).amount,
    -320000,
  );
});

test("attendance refreshes remaining lessons and prevents old reenrollment delivery", (t) => {
  const db = fixture(t);
  const old = db
    .load()
    .docs.find((d) => d.kind === "reenroll" && d.studentId === "S1");
  assert.ok(old);
  command(db, owner, "doc.approve", { id: old.id });
  record(db);
  db.tick();
  const s = db.load();
  assert.equal(s.deliveries.find((j) => j.docId === old.id).status, "blocked");
  const next = s.docs.find(
    (d) =>
      d.kind === "reenroll" && d.studentId === "S1" && d.status === "review",
  );
  assert.equal(next.remainingAtDraft, old.remainingAtDraft - 1);
});

test("guardian change prevents queued report going to obsolete recipient", (t) => {
  const db = fixture(t);
  record(db);
  const d = db.load().docs.find((d) => d.kind === "report");
  command(db, teacher, "doc.review", { id: d.id });
  command(db, owner, "doc.approve", { id: d.id });
  const st = db.load().students.find((x) => x.id === "S1");
  command(db, owner, "student.save", { ...st, guardian: "변경된 보호자" });
  db.tick();
  assert.equal(
    db.load().deliveries.find((j) => j.docId === d.id).status,
    "blocked",
  );
});

test("refund can be prepared after withdrawal", (t) => {
  const db = fixture(t);
  const st = db.load().students.find((x) => x.id === "S1");
  command(db, owner, "student.save", { ...st, status: "withdrawn" });
  command(db, owner, "refund.prepare", {
    invoiceId: "INV1",
    totalHours: 12,
    elapsedHours: 0,
    beforeStart: true,
  });
  const d = db.load().docs.find((d) => d.kind === "refund");
  command(db, owner, "doc.approve", { id: d.id });
  assert.equal(db.load().docs.find((x) => x.id === d.id).status, "approved");
});

test("older drafts without recipient context are preserved but require new approval", (t) => {
  const db = fixture(t);
  const old = db.load().docs.find((d) => d.kind === "billing");
  db.transaction(() => {
    const s = db.load();
    delete s.docs.find((d) => d.id === old.id).studentContext;
    db.save(s);
  });
  assert.throws(() => command(db, owner, "doc.approve", { id: old.id }));
  db.tick();
  const s = db.load();
  assert.equal(s.docs.find((d) => d.id === old.id).status, "stale");
  assert.ok(
    s.docs.some(
      (d) =>
        d.kind === "billing" &&
        d.studentId === old.studentId &&
        d.id !== old.id &&
        d.status === "review" &&
        d.studentContext,
    ),
  );
});

test("website introduction remains unchanged until approved snapshot is delivered", (t) => {
  const db = fixture(t);
  const profile = {
    ...WEBSITE_DEFAULTS,
    headline: "새로운 배움을 함께합니다.",
  };
  const before = project(db.load(), owner).public.settings.websiteProfile;
  const result = command(db, owner, "website.prepare", profile);
  assert.deepEqual(
    project(db.load(), owner).public.settings.websiteProfile,
    before,
  );
  command(db, owner, "doc.approve", { id: result.docId });
  assert.deepEqual(
    project(db.load(), owner).public.settings.websiteProfile,
    before,
  );
  db.tick();
  assert.deepEqual(
    project(db.load(), owner).public.settings.websiteProfile,
    profile,
  );
  assert.deepEqual(
    db.load().approvals.find((a) => a.docId === result.docId).snapshot
      .websiteProfile,
    profile,
  );
  assert.equal(db.load().settings.websiteRevision, 1);
});

test("website publishing requires owner and rejects private student names", (t) => {
  const db = fixture(t);
  assert.throws(
    () => command(db, teacher, "website.prepare", WEBSITE_DEFAULTS),
    /원장 권한/,
  );
  assert.throws(
    () =>
      command(db, owner, "website.prepare", {
        ...WEBSITE_DEFAULTS,
        about: "이서준 학생의 학습 이야기",
      }),
    /학생 이름/,
  );
  const result = command(db, owner, "website.prepare", WEBSITE_DEFAULTS);
  assert.throws(
    () =>
      command(db, owner, "doc.edit", {
        id: result.docId,
        body: "본문만 바꾸기",
      }),
    /해당 업무 화면/,
  );
});

test("an older website revision cannot overwrite a newly published introduction", (t) => {
  const db = fixture(t);
  const first = command(db, owner, "website.prepare", {
    ...WEBSITE_DEFAULTS,
    headline: "첫 소개",
  });
  command(db, owner, "doc.approve", { id: first.docId });
  const next = command(db, owner, "website.prepare", {
    ...WEBSITE_DEFAULTS,
    headline: "새 소개",
  });
  db.tick();
  assert.throws(
    () => command(db, owner, "doc.approve", { id: next.docId }),
    /다른 변경/,
  );
  assert.equal(db.load().settings.websiteProfile.headline, "첫 소개");
});

test("website lead becomes a new enrollment and first invoice only after owner approval", (t) => {
  const db = fixture(t);
  const slot = slots(db.load(), "A")[0];
  db.command(
    null,
    {
      id: randomUUID(),
      type: "booking",
      payload: {
        ...slot,
        classId: "A",
        name: "상담 신청 학생",
        phone: "01012345678",
        studentId: "S1",
      },
    },
    true,
  );
  const b = db.load().bookings[0];
  assert.equal(b.studentId, null);
  const student = {
    guardian: "상담 보호자",
    grade: "중2",
    termStart: today(),
    termEnd: addDays(today(), 90),
    termTotal: 24,
    consent: true,
    status: "active",
  };
  assert.throws(
    () => command(db, owner, "booking.enroll", { id: b.id, student }),
    /확정한/,
  );
  const d = db.load().docs.find((d) => d.bookingId === b.id);
  command(db, owner, "doc.approve", { id: d.id });
  assert.throws(
    () =>
      command(db, owner, "booking.enroll", {
        id: b.id,
        student: { ...student, id: "S1" },
      }),
    /새 학생/,
  );
  const result = command(db, owner, "booking.enroll", { id: b.id, student });
  const s = db.load();
  assert.equal(s.bookings[0].enrolledStudentId, result.studentId);
  assert.equal(
    s.students.find((st) => st.id === result.studentId).name,
    b.name,
  );
  assert.equal(
    s.invoices.filter((i) => i.studentId === result.studentId).length,
    1,
  );
  assert.throws(
    () => command(db, owner, "booking.enroll", { id: b.id, student }),
    /확정한/,
  );
});
