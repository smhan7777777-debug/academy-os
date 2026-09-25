import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.js";
import { ACTORS } from "../server/seed.js";
import {
  AgentWorkspace,
  agentConnection,
  normalizeAgentInput,
  agentPrefill,
} from "../server/agent-workspace.js";
import { AGENT_CATALOG } from "../shared/agent-catalog.js";
import { AGENT_PATHS } from "../server/agent-paths.js";
const env = {
  ACADEMY_AGENT_BASE_URL: "https://workflow.example.com",
  ACADEMY_AGENT_BEARER: "test-only",
  ACADEMY_AGENT_SHOP_ID: "test-school",
  ACADEMY_AGENT_ACADEMY_ID: "forest",
  ACADEMY_AGENT_ENABLE: "1",
  ACADEMY_DEMO: "0",
};
const owner = ACTORS[0];
function setup(
  t,
  fetcher = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        status: "ok",
        data: { title: "검토할 결과", body: "확인된 내용" },
      }),
    ),
  extra = {},
) {
  const store = new Store(":memory:");
  t.after(() => store.close());
  return {
    store,
    ws: new AgentWorkspace(store, { env: { ...env, ...extra }, fetcher }),
  };
}
function create(ws, store, extra = {}) {
  return ws.create(owner, {
    key: randomUUID(),
    code: "academy-journal",
    input: {
      student_name: "학생 A",
      teacher_notes: "분수 덧셈을 공부했습니다.",
    },
    confirm: true,
    revision: store.load().revision,
    ...extra,
  });
}
test("catalog covers 9 priority, 13 academy and 27 common; 8 unavailable", () => {
  assert.equal(AGENT_CATALOG.filter((a) => a.priority).length, 9);
  assert.equal(AGENT_CATALOG.filter((a) => a.available).length, 40);
  assert.equal(Object.keys(AGENT_PATHS).length, 40);
  for (const a of AGENT_CATALOG.filter((a) => a.available))
    assert.ok(AGENT_PATHS[a.code]);
});
test("real calls are closed for demo, Vercel, missing secrets and production namespace", () => {
  assert.ok(agentConnection(env).ready);
  for (const extra of [
    { ACADEMY_DEMO: "1" },
    { VERCEL: "1" },
    { ACADEMY_AGENT_BEARER: "" },
    { ACADEMY_AGENT_NAMESPACE: "none" },
    { ACADEMY_AGENT_BASE_URL: "https://user:secret@host.test/" },
  ])
    assert.equal(agentConnection({ ...env, ...extra }).ready, false);
});
test("owner isolation and rejected unauthorized context fields", (t) => {
  const { ws, store } = setup(t);
  assert.throws(() => ws.summary(ACTORS[1]), /원장/);
  assert.throws(
    () =>
      create(ws, store, {
        input: { student_name: "A", teacher_notes: "B", shop_id: "foreign" },
      }),
    /허용되지/,
  );
  assert.throws(() => create(ws, store, { studentId: "FOREIGN" }), /학생/);
  const j = create(ws, store);
  assert.throws(
    () => ws.get({ ...owner, academyId: "other" }, j.id),
    /찾을 수/,
  );
});
test("draft preparation works disconnected without a provider call", (t) => {
  let calls = 0;
  const { ws, store } = setup(
    t,
    () => {
      calls++;
    },
    { ACADEMY_AGENT_ENABLE: "0" },
  );
  const j = create(ws, store);
  assert.equal(j.status, "draft");
  assert.throws(() => ws.action(owner, j.id, "queue"), /비활성화/);
  assert.equal(calls, 0);
});
test("input contracts parse lists and reject invalid values", () => {
  const d = AGENT_CATALOG.find((a) => a.code === "academy-ledger");
  const v = normalizeAgentInput(d, {
    student_name: "A",
    attendance: "2026-09-25 | 출석",
    scores: "2026-09-25 | 시험 | 70 | 100",
  });
  assert.equal(v.scores[0].score, 70);
  assert.equal(v.attendance[0].status, "출석");
  assert.throws(
    () =>
      normalizeAgentInput(d, {
        student_name: "A",
        attendance: "missing separator",
      }),
    /항목/,
  );
  assert.throws(
    () => normalizeAgentInput(d, { student_name: "A", total_units: "NaN" }),
    /숫자/,
  );
});
test("idempotent draft and queue; monthly allowance prevents additional calls", (t) => {
  const { ws, store } = setup(t, undefined, {
    ACADEMY_AGENT_MONTHLY_LIMIT: "1",
  });
  const key = randomUUID();
  const a = create(ws, store, { key }),
    b = create(ws, store, { key });
  assert.equal(a.id, b.id);
  assert.throws(
    () =>
      create(ws, store, {
        key,
        input: { student_name: "A", teacher_notes: "changed" },
      }),
    /다른 내용/,
  );
  ws.action(owner, a.id, "queue");
  ws.action(owner, a.id, "queue");
  const c = create(ws, store);
  assert.throws(() => ws.action(owner, c.id, "queue"), /한도/);
});
test("success uses prof namespace, server-owned identity, then approval without send", async (t) => {
  let calls = 0;
  const { ws, store } = setup(t, async (url, opts) => {
    calls++;
    assert.match(url, /\/wf-prof-academy-a01-academy-journal$/);
    const p = JSON.parse(opts.body);
    assert.equal(p.vertical, "academy");
    assert.equal(p.shop_id, "test-school");
    assert.equal(p.persist, false);
    return new Response(
      JSON.stringify({ ok: true, status: "ok", data: { body: "정상 결과" } }),
    );
  });
  const j = create(ws, store);
  ws.action(owner, j.id, "queue");
  await ws.processOne();
  assert.equal(ws.get(owner, j.id).status, "review");
  assert.equal(ws.action(owner, j.id, "approve").status, "approved");
  assert.equal(calls, 1);
  assert.throws(() => ws.action(owner, j.id, "queue"), /새 입력/);
});
test("HTTP 200 blocked, errors, malformed output never become successful drafts", async (t) => {
  for (const output of [
    { ok: true, status: "blocked", data: {} },
    { ok: false, status: "ok", data: { body: "bad" } },
    { ok: true, status: "ok", data: {} },
    { ok: true, status: "ok" },
  ]) {
    const { ws, store } = setup(
      t,
      async () => new Response(JSON.stringify(output)),
    );
    const j = create(ws, store);
    ws.action(owner, j.id, "queue");
    await ws.processOne();
    assert.ok(["blocked", "failed"].includes(ws.get(owner, j.id).status));
  }
});
test("provider transport errors do not expose secrets or retry automatically", async (t) => {
  let calls = 0;
  const { ws, store } = setup(t, async () => {
    calls++;
    throw Error("secret-bearer");
  });
  const j = create(ws, store);
  ws.action(owner, j.id, "queue");
  await ws.processOne();
  await ws.processOne();
  assert.equal(calls, 1);
  assert.equal(ws.get(owner, j.id).status, "failed");
  assert.ok(!JSON.stringify(ws.list(owner)).includes("secret-bearer"));
});
test("scheduled job waits, can cancel; stale source blocks execution", async (t) => {
  let calls = 0;
  const { ws, store } = setup(t, async () => {
    calls++;
  });
  const future = create(ws, store, {
    dueAt: new Date(Date.now() + 3600000).toISOString(),
  });
  ws.action(owner, future.id, "queue");
  await ws.processOne();
  assert.equal(calls, 0);
  assert.equal(ws.action(owner, future.id, "cancel").status, "cancelled");
  const j = create(ws, store);
  ws.action(owner, j.id, "queue");
  store.db
    .prepare("UPDATE academies SET revision=revision+1 WHERE id='forest'")
    .run();
  await ws.processOne();
  assert.equal(ws.get(owner, j.id).status, "stale");
  assert.equal(calls, 0);
});
test("private teacher note is not prefilled; student is pseudonymized", (t) => {
  const { store } = setup(t);
  const s = store.load();
  s.records = [
    {
      studentId: "S1",
      date: "2026-09-25",
      memo: "private teacher note",
      shareMemo: false,
      att: "출석",
    },
  ];
  const values = agentPrefill(s, "S1");
  assert.equal(values.student_name, "학생 S1");
  assert.equal(values.teacher_notes, "");
  assert.ok(!JSON.stringify(values).includes("private teacher note"));
});
test("jobs survive workspace reconstruction and duplicate workers claim once", async (t) => {
  let calls = 0;
  const { ws, store } = setup(t, async () => {
    calls++;
    return new Response(
      JSON.stringify({ ok: true, status: "ok", data: { body: "result" } }),
    );
  });
  const j = create(ws, store);
  ws.action(owner, j.id, "queue");
  const second = new AgentWorkspace(store, { env, fetcher: ws.fetcher });
  await Promise.all([ws.processOne(), second.processOne()]);
  assert.equal(calls, 1);
  assert.equal(second.get(owner, j.id).status, "review");
});

test("approved results survive closing and reopening the SQLite file", async () => {
  const path = join(
    mkdtempSync(join(tmpdir(), "academy-agent-persist-")),
    "test.sqlite",
  );
  let store = new Store(path);
  try {
    let ws = new AgentWorkspace(store, {
      env,
      fetcher: async () =>
        new Response(
          JSON.stringify({ ok: true, status: "ok", data: { body: "원본" } }),
        ),
    });
    const job = create(ws, store);
    ws.action(owner, job.id, "queue");
    await ws.processOne();
    ws.action(owner, job.id, "approve", { text: "검토한 최종본" });
    store.close();
    store = new Store(path);
    ws = new AgentWorkspace(store, { env });
    assert.equal(ws.get(owner, job.id).approvedText, "검토한 최종본");
    assert.equal(ws.get(owner, job.id).output.body, "원본");
    assert.throws(
      () => ws.action(owner, job.id, "approve", { text: "변조" }),
      /검토 대기/,
    );
  } finally {
    store.close();
  }
});
