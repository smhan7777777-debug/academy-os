import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import { publicState, project } from "../server/domain.js";
import {
  publicExperiences,
  readStudioGuide,
  studioCurrent,
} from "../server/studio.js";
import { generateExperience } from "../server/studio-generator.js";
import { EXPERIENCE_SAMPLES } from "../shared/studio.js";

const owner = ACTORS[0];
const cmd = (db, type, payload, actor = owner) =>
  db.command(actor, {
    id: randomUUID(),
    revision: db.load().revision,
    type,
    payload,
  });
const pub = (db, type, payload) =>
  db.command(null, { id: randomUUID(), type, payload }, true);
const setup = (t) => {
  const db = new Store(":memory:");
  t.after(() => db.close());
  return db;
};
const experience = { ...EXPERIENCE_SAMPLES.math };
const guide = {
  title: "상담 안내",
  audience: "보호자님",
  goal: "풀이의 이유를 설명하기",
  plan: "상담에서 함께 확인한 반을 안내합니다.",
  preparation: "필기구를 준비해 주세요.",
  questions: "요일은 상담에서 다시 확인합니다.",
};
function save(db, kind = "experience", data = experience, more = {}) {
  const { itemId } = cmd(db, "studio.save", {
    kind,
    classId: "A",
    data,
    ...more,
  });
  return db.load().studioItems.find((x) => x.id === itemId);
}
function publish(db, item) {
  cmd(db, "studio.publish", {
    id: item.id,
    version: item.version,
    confirmed: true,
    days: 7,
  });
  return db.load().studioItems.find((x) => x.id === item.id);
}

test("studio guides and immutable approval history survive database restart", () => {
  const path = join(
    mkdtempSync(join(tmpdir(), "academy-studio-persist-")),
    "academy.sqlite",
  );
  let db = new Store(path);
  let item;
  try {
    item = publish(db, save(db, "guide", guide));
  } finally {
    db.close();
  }
  db = new Store(path);
  try {
    assert.deepEqual(
      readStudioGuide(db.load(), item.id, item.secret).data,
      guide,
    );
    assert.equal(db.load().studioApprovals[0].itemId, item.id);
    assert.equal(db.load().studioApprovals[0].snapshot.data.goal, guide.goal);
  } finally {
    db.close();
  }
});

test("studio drafts require owner confirmation and never expose private state", (t) => {
  const db = setup(t),
    item = save(db, "guide", guide);
  assert.deepEqual(publicExperiences(db.load()), []);
  assert.equal(publicState(db.load()).studioItems, undefined);
  for (const actor of ACTORS.slice(1)) {
    assert.equal(project(db.load(), actor).studioItems, undefined);
    assert.throws(
      () =>
        cmd(
          db,
          "studio.publish",
          { id: item.id, version: 1, confirmed: true },
          actor,
        ),
      /원장 권한/,
    );
  }
  assert.throws(
    () =>
      cmd(db, "studio.publish", { id: item.id, version: 1, confirmed: false }),
    /확인한 뒤/,
  );
  assert.throws(
    () => readStudioGuide(db.load(), item.id, "0".repeat(64)),
    /열 수 없습니다/,
  );
  assert.equal(db.load().studioApprovals.length, 0);
});

test("experience answers stay server-side; wrong attempt gives hint then explanation without level inference", (t) => {
  const db = setup(t),
    item = publish(db, save(db));
  const catalog = publicExperiences(db.load());
  assert.equal(catalog[0].answer, undefined);
  const start = pub(db, "studio.start", { id: item.id });
  assert.equal(start.answer, undefined);
  assert.equal(start.explanation, undefined);
  assert.throws(
    () => pub(db, "studio.consult", { token: start.token }),
    /체험을 마친/,
  );
  const first = pub(db, "studio.answer", { token: start.token, answer: 0 });
  assert.equal(first.completed, false);
  assert.equal(first.explanation, undefined);
  const second = pub(db, "studio.answer", { token: start.token, answer: 1 });
  assert.equal(second.completed, true);
  assert.equal(second.correct, true);
  assert.ok(second.explanation);
  assert.throws(
    () => pub(db, "studio.answer", { token: start.token, answer: 1 }),
    /이미 마친/,
  );
  pub(db, "studio.consult", { token: start.token });
  pub(db, "studio.consult", { token: start.token });
  assert.equal(db.load().studioEvents.filter((x) => x.consulted).length, 1);
});

test("private links require the full secret, redact internal notes, expire and revoke", (t) => {
  const db = setup(t);
  const item = publish(
    db,
    save(db, "lesson", {
      title: "수업 카드",
      activity: "함수의 변화 관찰",
      why: "두 값의 관계 설명",
      next: "다음 시간에는 그래프",
      teacherNotes: "INTERNAL-NEVER-SHARED",
    }),
  );
  const value = readStudioGuide(db.load(), item.id, item.secret);
  assert.ok(!JSON.stringify(value).includes("INTERNAL"));
  assert.ok(!JSON.stringify(value).includes(item.secret));
  assert.throws(
    () => readStudioGuide(db.load(), item.id, item.secret.slice(1)),
    /열 수 없습니다/,
  );
  assert.throws(
    () => readStudioGuide(db.load(), item.id, "a".repeat(64)),
    /열 수 없습니다/,
  );
  const expired = db.load();
  expired.studioItems[0].expiresAt = "2000-01-01T00:00:00.000Z";
  assert.throws(
    () => readStudioGuide(expired, item.id, item.secret),
    /열 수 없습니다/,
  );
  cmd(db, "studio.revoke", { id: item.id, version: item.version });
  assert.throws(
    () => readStudioGuide(db.load(), item.id, item.secret),
    /열 수 없습니다/,
  );
});

test("approval snapshots survive editing; editing withdraws publication and old links", (t) => {
  const db = setup(t),
    item = publish(db, save(db, "guide", guide));
  const before = db.load().studioApprovals[0];
  save(
    db,
    "guide",
    { ...guide, title: "수정한 안내" },
    { id: item.id, version: item.version },
  );
  assert.throws(
    () => readStudioGuide(db.load(), item.id, item.secret),
    /열 수 없습니다/,
  );
  assert.deepEqual(db.load().studioApprovals[0], before);
  const updated = db.load().studioItems[0];
  assert.throws(
    () =>
      cmd(db, "studio.publish", { id: item.id, version: 1, confirmed: true }),
    /변경되었습니다/,
  );
  const next = publish(db, updated);
  assert.notEqual(next.secret, item.secret);
  assert.equal(db.load().studioApprovals.length, 2);
});

test("source changes invalidate drafts and published guides instead of serving stale prices", (t) => {
  const db = setup(t),
    item = publish(db, save(db, "guide", guide));
  const changed = db.load();
  changed.classes[0].fee += 10000;
  assert.equal(studioCurrent(changed, item), false);
  assert.throws(
    () => readStudioGuide(changed, item.id, item.secret),
    /열 수 없습니다/,
  );
  cmd(db, "studio.profile", {
    method: "과정부터 묻습니다.",
    feedback: "관찰한 내용만 설명합니다.",
    preparation: "필기구를 준비합니다.",
  });
  assert.throws(
    () => readStudioGuide(db.load(), item.id, item.secret),
    /열 수 없습니다/,
  );
  const draft = save(db);
  cmd(db, "studio.profile", {
    method: "질문부터 시작합니다.",
    feedback: "확인한 사실을 설명합니다.",
    preparation: "필기구",
  });
  assert.throws(() => publish(db, draft), /학원 정보가 바뀌었습니다/);
});

test("public experiences withdraw on source changes and reject sessions for revoked revisions", (t) => {
  const db = setup(t),
    item = publish(db, save(db));
  const session = pub(db, "studio.start", { id: item.id });
  cmd(db, "studio.revoke", { id: item.id, version: item.version });
  assert.deepEqual(publicExperiences(db.load()), []);
  assert.throws(
    () => pub(db, "studio.answer", { token: session.token, answer: 0 }),
    /변경되었습니다/,
  );
});

test("public content refuses student names, malformed choices, and nonexistent class or booking", (t) => {
  const db = setup(t);
  assert.throws(
    () => save(db, "experience", { ...experience, intro: "이서준의 풀이" }),
    /학생 이름/,
  );
  assert.throws(
    () => save(db, "experience", { ...experience, answer: 9 }),
    /정답/,
  );
  assert.throws(
    () => save(db, "experience", { ...experience, choices: ["A", "A", "B"] }),
    /서로 다르게/,
  );
  assert.throws(
    () => save(db, "guide", guide, { classId: "missing" }),
    /수업을 찾을/,
  );
  assert.throws(
    () => save(db, "guide", guide, { bookingId: "missing" }),
    /상담과 선택/,
  );
  assert.throws(
    () => pub(db, "studio.publish", { id: "missing", confirmed: true }),
    /체험을 다시/,
  );
});

test("studio approvals remain immutable in SQLite and commands are idempotent", (t) => {
  const db = setup(t);
  const request = {
    id: randomUUID(),
    revision: db.load().revision,
    type: "studio.save",
    payload: { kind: "experience", classId: "A", data: experience },
  };
  assert.deepEqual(db.command(owner, request), db.command(owner, request));
  assert.equal(db.load().studioItems.length, 1);
  publish(db, db.load().studioItems[0]);
  const modified = db.load();
  modified.studioApprovals[0].snapshot.data.title = "rewrite";
  assert.throws(() => db.transaction(() => db.save(modified)), /확정 기록/);
});

test("AI generation sends only explicit public materials; no-key and provider failures are honest", async () => {
  const input = {
    notes: "A teacher-authored public example",
    confirmPublic: true,
  };
  await assert.rejects(
    generateExperience(input, { env: {} }),
    /연결이 설정되지/,
  );
  await assert.rejects(
    generateExperience({ ...input, confirmPublic: false }),
    /공개용 자료/,
  );
  const env = {
    ACADEMY_GEMINI_KEY: "test-secret",
    ACADEMY_GEMINI_MODEL: "test-model",
  };
  const value = await generateExperience(input, {
    env,
    fetcher: async (url, options) => {
      assert.ok(!url.includes("test-secret"));
      assert.equal(options.headers["x-goog-api-key"], "test-secret");
      const body = JSON.parse(options.body);
      assert.equal(body.contents[0].parts[0].text, input.notes);
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(experience) }] } },
          ],
        }),
      );
    },
  });
  assert.equal(value.data.title, experience.title);
  await assert.rejects(
    generateExperience(input, {
      env,
      fetcher: async () => new Response("secret error", { status: 503 }),
    }),
    /AI 초안을 만들지 못했습니다/,
  );
});
