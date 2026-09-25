import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import { campaignPreview } from "../server/campaigns.js";
import { quickInput } from "../server/agent-quick.js";
import { AgentWorkspace } from "../server/agent-workspace.js";
import { publicState, project } from "../server/domain.js";
import { addDays, today } from "../shared/core.js";
function setup(t) {
  const s = new Store(":memory:");
  t.after(() => s.close());
  return s;
}
const owner = ACTORS[0];
const cmd = (s, type, payload, key = randomUUID()) =>
  s.command(owner, { id: key, type, payload, revision: s.load().revision });
test("selected campaign previews without writes, publishes exactly once, replaces and can be removed", (t) => {
  const s = setup(t),
    before = s.load();
  const options = {
    kind: "enrollment",
    classId: "A",
    days: 7,
    tone: "plum",
    layout: "card",
  };
  const preview = campaignPreview(before, options);
  assert.deepEqual(s.load(), before);
  const key = randomUUID();
  const result = cmd(
    s,
    "campaign.publish",
    { options, previewHash: preview.hash },
    key,
  );
  assert.equal(
    cmd(s, "campaign.publish", { options, previewHash: preview.hash }, key)
      .postId,
    result.postId,
  );
  let published = publicState(s.load()).posts;
  assert.equal(published.length, 1);
  assert.equal(published[0].body, preview.body);
  assert.equal(published[0].tone, "plum");
  assert.ok(published[0].cta.includes("classId=A"));
  const secondOptions = {
    ...options,
    layout: "bar",
    title: "수정한 모집 안내",
  };
  const second = campaignPreview(s.load(), secondOptions);
  const replacement = cmd(s, "campaign.publish", {
    options: secondOptions,
    previewHash: second.hash,
    replaceId: result.postId,
  });

  assert.equal(publicState(s.load()).posts.length, 1);
  assert.equal(s.load().approvals.length, before.approvals.length + 2);
  cmd(s, "post.hide", { id: replacement.postId });
  assert.equal(publicState(s.load()).posts.length, 0);
});
test("newest active announcement wins after reload; future announcements do not hide it", (t) => {
  const s = setup(t);
  for (const [title, delay] of [
    ["첫 안내", 0],
    ["현재 안내", 0],
    ["다음 주 안내", 7],
  ]) {
    const options = { title, delay };
    const preview = campaignPreview(s.load(), options);
    cmd(s, "campaign.publish", { options, previewHash: preview.hash });
  }
  assert.equal(publicState(s.load()).posts[0].title, "현재 안내");
  assert.equal(publicState(s.load()).posts.length, 2);
});

test("scheduled, stale, private, forged and teacher publication attempts cannot publish", (t) => {
  const s = setup(t),
    options = { delay: 1 };
  const p = campaignPreview(s.load(), options);
  assert.throws(
    () => cmd(s, "campaign.publish", { options, previewHash: "wrong" }),
    /미리보기/,
  );
  assert.throws(
    () =>
      s.command(ACTORS[1], {
        id: randomUUID(),
        type: "campaign.publish",
        payload: { options, previewHash: p.hash },
        revision: s.load().revision,
      }),
    /원장/,
  );
  const privateOptions = { title: s.load().students[0].name };
  const priv = campaignPreview(s.load(), privateOptions);
  assert.throws(
    () =>
      cmd(s, "campaign.publish", {
        options: privateOptions,
        previewHash: priv.hash,
      }),
    /학생 이름/,
  );
  cmd(s, "campaign.publish", { options, previewHash: p.hash });
  assert.equal(publicState(s.load()).posts.length, 0);
  assert.equal(s.load().posts[0].startsAt.slice(0, 10), addDays(today(), 1));
  assert.throws(() => campaignPreview(s.load(), { classId: "OTHER" }), /수업/);
  assert.throws(
    () => campaignPreview(s.load(), { kind: "experience" }),
    /체험/,
  );
});
test("quick inputs use existing facts, reject absent records and never synthesize observations", (t) => {
  const s = setup(t),
    state = s.load();
  const place = quickInput(state, {
    code: "academy-place",
    channel: "kakao_map",
  });
  assert.equal(place.input["store.name"], state.settings.name);
  assert.equal(place.studentId, null);
  assert.throws(
    () => quickInput(state, { code: "academy-journal", studentId: "S1" }),
    /수업 기록/,
  );
  assert.throws(
    () =>
      quickInput(state, {
        code: "academy-career",
        studentId: "S1",
        interests: [],
      }),
    /관심 분야/,
  );
  state.records.push({
    id: "test",
    studentId: "S1",
    date: today(),
    att: "출석",
    hw: "제출",
    memo: "절대 전송하면 안 되는 메모",
    shareMemo: false,
  });
  const input = quickInput(state, { code: "academy-journal", studentId: "S1" });
  assert.match(input.input.teacher_notes, /출석/);
  assert.ok(!JSON.stringify(input).includes("절대 전송"));
});
test("one approval action applies an AI reply atomically and safely on retry", async (t) => {
  const s = setup(t);
  s.command(
    null,
    {
      id: randomUUID(),
      type: "inquiry",
      payload: { question: "교재는 별도인가요?" },
    },
    true,
  );
  const q = s.load().conversations.at(-1);
  const ws = new AgentWorkspace(s, {
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
        JSON.stringify({
          status: "ok",
          data: { body: "교재 안내는 상담 시 확인해 드립니다." },
        }),
      ),
  });
  const prepared = quickInput(s.load(), {
    code: "academy-inquiry",
    inquiryId: q.id,
  });
  const job = ws.create(owner, {
    ...prepared,
    key: randomUUID(),
    confirm: true,
  });
  ws.action(owner, job.id, "queue");
  await ws.processOne();
  const result = ws.action(owner, job.id, "apply", {
    text: "원장이 확인한 교재 안내입니다.",
  });
  assert.equal(
    s.load().conversations.at(-1).answer,
    "원장이 확인한 교재 안내입니다.",
  );
  assert.equal(
    ws.action(owner, job.id, "apply", { text: "다른 내용" }).docId,
    result.docId,
  );
  assert.equal(s.load().docs.filter((d) => d.agentRunId === job.id).length, 1);
  assert.ok(
    !JSON.stringify(project(s.load(), ACTORS[3])).includes(
      "원장이 확인한 교재",
    ),
  );
});
