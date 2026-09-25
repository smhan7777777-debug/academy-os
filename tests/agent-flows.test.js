import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import { AgentWorkspace } from "../server/agent-workspace.js";
import { publicState, project, slots } from "../server/domain.js";
import { renderLibrarySite } from "../server/website-pages.js";
import { LIBRARY_TEMPLATES } from "../shared/templates.js";
import { AGENT_TEAMS } from "../shared/agent-teams.js";
import { AGENT_CATALOG } from "../shared/agent-catalog.js";
const owner = ACTORS[0];
function setup(t) {
  const store = new Store(":memory:");
  t.after(() => store.close());
  const ws = new AgentWorkspace(store, {
    env: {
      ACADEMY_AGENT_BASE_URL: "https://test.invalid",
      ACADEMY_AGENT_BEARER: "test",
      ACADEMY_AGENT_SHOP_ID: "test",
      ACADEMY_AGENT_ACADEMY_ID: "forest",
      ACADEMY_AGENT_ENABLE: "1",
      ACADEMY_DEMO: "0",
    },
    fetcher: async () =>
      new Response(
        JSON.stringify({ status: "ok", data: { body: "모의 초안" } }),
      ),
  });
  const cmd = (type, payload) =>
    store.command(owner, {
      id: randomUUID(),
      revision: store.load().revision,
      type,
      payload,
    });
  return { store, ws, cmd };
}
async function run(f, code, input, source, studentId) {
  const j = f.ws.create(owner, {
    key: randomUUID(),
    code,
    input,
    source,
    studentId,
    confirm: true,
    revision: f.store.load().revision,
  });
  f.ws.action(owner, j.id, "queue");
  await f.ws.processOne();
  assert.equal(f.ws.get(owner, j.id).status, "review");
  return j;
}
test("five teams contain exactly the forty available definitions", () => {
  const codes = AGENT_TEAMS.flatMap((t) => t.codes);
  assert.equal(new Set(codes).size, 40);
  assert.deepEqual(
    codes.sort(),
    AGENT_CATALOG.filter((a) => a.available)
      .map((a) => a.code)
      .sort(),
  );
});
test("website inquiry: AI result enters one approval inbox and answers original inquiry exactly once", async (t) => {
  const f = setup(t);
  f.store.command(
    null,
    {
      id: randomUUID(),
      type: "inquiry",
      payload: { question: "새 교재를 따로 구매하나요?" },
    },
    true,
  );
  const q = f.store.load().conversations.at(-1);
  const j = await run(
    f,
    "academy-inquiry",
    { inquiry: q.question },
    { type: "inquiry", id: q.id },
  );
  const submitted = f.ws.action(owner, j.id, "prepare", {
    text: "교재 안내를 상담에서 확인해 드리겠습니다.",
  });
  assert.equal(
    f.store.load().conversations.find((x) => x.id === q.id).answer,
    q.answer,
  );
  assert.equal(
    f.ws.action(owner, j.id, "prepare", { text: "duplicate" }).docId,
    submitted.docId,
  );
  assert.equal(
    f.store.load().docs.filter((d) => d.agentRunId === j.id).length,
    1,
  );
  f.cmd("doc.edit", {
    id: submitted.docId,
    body: "교재는 상담 때 안내합니다. 원장이 확인한 답변입니다.",
  });
  f.cmd("doc.approve", { id: submitted.docId });
  f.store.tick();
  f.store.tick();
  assert.equal(
    f.store.load().conversations.find((x) => x.id === q.id).answer,
    "교재는 상담 때 안내합니다. 원장이 확인한 답변입니다.",
  );
  assert.equal(
    f.store.load().deliveries.filter((d) => d.docId === submitted.docId).length,
    1,
  );
});
test("public popup publishes approved text and dates across library designs and links booking campaign", async (t) => {
  const f = setup(t);
  const j = await run(
    f,
    "academy-popup",
    {
      offer_text: "새 학기 특강 상담",
      valid_from: "2026-09-25",
      valid_until: "2026-10-25",
    },
    { type: "school" },
  );
  const submitted = f.ws.action(owner, j.id, "prepare", {
    title: "특강 상담 안내",
    text: "수업 내용을 상담에서 확인하세요.",
    startsAt: new Date(Date.now() - 1000).toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  });
  assert.equal(publicState(f.store.load()).posts.length, 0);
  f.cmd("doc.approve", { id: submitted.docId });
  f.store.tick();
  f.store.tick();
  const site = publicState(f.store.load());
  const post = site.posts.find((p) => p.campaignId === j.id);
  assert.equal(post.body, "수업 내용을 상담에서 확인하세요.");
  assert.equal(
    f.store.load().posts.filter((p) => p.campaignId === j.id).length,
    1,
  );
  for (const template of LIBRARY_TEMPLATES) {
    site.settings.websiteDesign = { templateId: template.id, video: "v1" };
    const page = await renderLibrarySite(
      site,
      new URL("http://localhost/site"),
    );
    assert.ok(page.html.includes("특강 상담 안내"));
    assert.ok(page.html.includes(`campaign=${j.id}`));
  }
  const s = f.store.load();
  const slot = slots(s, s.classes[0].id)[0];
  f.store.command(
    null,
    {
      id: randomUUID(),
      type: "booking",
      payload: {
        classId: s.classes[0].id,
        name: "방문자",
        phone: "01012345678",
        date: slot.date,
        start: slot.start,
        campaignId: j.id,
      },
    },
    true,
  );
  assert.equal(f.store.load().bookings.at(-1).campaignId, j.id);
  s.posts[0].endsAt = new Date(Date.now() - 1000).toISOString();
  assert.equal(publicState(s).posts.length, 0);
});
test("lesson report reaches only the consenting guardian and never the public website", async (t) => {
  const f = setup(t);
  const j = await run(
    f,
    "academy-journal",
    { student_name: "학생 S1", teacher_notes: "풀이 과정을 설명했습니다." },
    { type: "student", id: "S1" },
    "S1",
  );
  const submitted = f.ws.action(owner, j.id, "prepare", {
    text: "보호자 전용 수업 안내입니다.",
  });
  f.cmd("doc.approve", { id: submitted.docId });
  f.store.tick();
  assert.ok(
    project(f.store.load(), ACTORS[3]).approvals.some(
      (a) => a.docId === submitted.docId,
    ),
  );
  assert.ok(
    !project(f.store.load(), { ...ACTORS[3], studentId: "S2" }).approvals.some(
      (a) => a.docId === submitted.docId,
    ),
  );
  assert.ok(
    !JSON.stringify(publicState(f.store.load())).includes("보호자 전용"),
  );
});
test("source changes and missing consent block approval without leaking or duplicating documents", async (t) => {
  const f = setup(t);
  const j = await run(
    f,
    "academy-journal",
    { student_name: "학생 S1", teacher_notes: "풀이 기록" },
    { type: "student", id: "S1" },
    "S1",
  );
  const submitted = f.ws.action(owner, j.id, "prepare", { text: "수업 안내" });
  f.store.transaction(() => {
    const s = f.store.load();
    s.students.find((st) => st.id === "S1").consent = false;
    s.revision++;
    f.store.save(s);
  });
  assert.throws(
    () => f.cmd("doc.approve", { id: submitted.docId }),
    /근거|동의|수신/,
  );
  assert.equal(
    f.store.load().approvals.filter((a) => a.docId === submitted.docId).length,
    0,
  );
  assert.throws(
    () => f.ws.action(ACTORS[1], j.id, "prepare", { text: "x" }),
    /원장/,
  );
});
test("unrelated inbox work does not invalidate a source-bound AI draft", async (t) => {
  const f = setup(t);
  const j = await run(
    f,
    "academy-journal",
    { student_name: "학생 S1", teacher_notes: "기록" },
    { type: "student", id: "S1" },
    "S1",
  );
  f.cmd("biz.prepare", { kind: "notice", details: "독립적인 운영 공지" });
  assert.ok(f.ws.action(owner, j.id, "prepare", { text: "수업 안내" }).docId);
});
