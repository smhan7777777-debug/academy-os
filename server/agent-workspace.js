import { createHash, randomUUID } from "node:crypto";
import { AGENT_CATALOG } from "../shared/agent-catalog.js";
import { AGENT_PATHS } from "./agent-paths.js";
import { check } from "./errors.js";
import { today } from "../shared/core.js";
import { agentSourceHash } from "./agent-source.js";
import { prepareAgentDocument, execute, tick } from "./domain.js";
import { artifactFor } from "../shared/agent-teams.js";
import { siteDesign } from "../shared/templates.js";
import { publicExperiences } from "./studio.js";

const hash = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const terminal = new Set([
  "review",
  "approved",
  "rejected",
  "failed",
  "blocked",
  "stale",
  "cancelled",
]);
const owner = (a) =>
  check(
    a?.role === "owner",
    "원장만 AI 업무를 실행하고 검토할 수 있습니다.",
    403,
  );
const cleanObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const definition = (code) => {
  const d = AGENT_CATALOG.find((a) => a.code === code);
  check(d, "알 수 없는 직원입니다.", 404);
  return d;
};
export function agentConnection(env = process.env) {
  const issues = [];
  if (!env.ACADEMY_AGENT_BASE_URL)
    issues.push("Agent1000 전용 실행 서버 주소 필요");
  if (!env.ACADEMY_AGENT_BEARER) issues.push("웹훅 인증 설정 필요");
  if (!env.ACADEMY_AGENT_SHOP_ID) issues.push("학원 전용 연결 ID 필요");
  if (!env.ACADEMY_AGENT_ACADEMY_ID) issues.push("배움결 학원 ID 매핑 필요");
  if (env.ACADEMY_AGENT_ENABLE !== "1") issues.push("실제 AI 실행 비활성화");
  if (env.ACADEMY_DEMO !== "0")
    issues.push("실제 AI 실행은 비밀번호 로그인 모드에서만 가능");
  if (env.VERCEL)
    issues.push(
      "공개 체험 배포에서는 실제 AI 실행 중지 · 영구 저장 호스트 필요",
    );
  if (env.ACADEMY_AGENT_NAMESPACE && env.ACADEMY_AGENT_NAMESPACE !== "prof")
    issues.push("검증된 전용 사본(prof)만 지원");
  if (env.ACADEMY_AGENT_BASE_URL) {
    try {
      const u = new URL(env.ACADEMY_AGENT_BASE_URL);
      if (
        u.protocol !== "https:" ||
        u.username ||
        u.password ||
        u.search ||
        u.hash ||
        u.pathname !== "/"
      )
        issues.push("실행 서버는 HTTPS 원본 주소여야 합니다.");
    } catch {
      issues.push("실행 서버 주소 형식 오류");
    }
  }
  return {
    ready: issues.length === 0,
    issues,
    mode: "전용 사본 · 초안 생성",
    storage: env.VERCEL ? "공개 체험 임시 저장" : "서버 SQLite 저장",
    delivery: "외부 자동 발송 미연결",
    namespace: "prof",
  };
}

export function normalizeAgentInput(def, raw) {
  check(cleanObject(raw), "입력 객체가 필요합니다.");
  const fields = new Map(def.fields.map((f) => [f.key, f]));
  for (const key of Object.keys(raw))
    check(fields.has(key), "허용되지 않은 입력 항목입니다.");
  const result = {};
  for (const f of def.fields) {
    let value = raw[f.key];
    if (value === undefined || value === "") {
      check(!f.required, `${f.label}을 입력해 주세요.`);
      continue;
    }
    check(
      typeof value === "string" || typeof value === "number",
      `${f.label} 입력 형식을 확인해 주세요.`,
    );
    value = String(value).trim();
    check(
      value.length <= 6000 && (!f.required || value.length > 0),
      `${f.label}은 6,000자 이내로 입력해 주세요.`,
    );
    if (!value) continue;
    if (f.type === "number") {
      value = Number(value);
      check(
        Number.isFinite(value) && value >= 0,
        `${f.label} 숫자를 확인해 주세요.`,
      );
    }
    if (f.type === "date")
      check(
        /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)),
        `${f.label} 날짜를 확인해 주세요.`,
      );
    if (f.type === "select")
      check(f.options.includes(value), `${f.label} 선택값을 확인해 주세요.`);
    if (f.type === "photo") {
      let u;
      try {
        u = new URL(value);
      } catch {
        check(false, "공개 이미지의 HTTPS 주소를 입력해 주세요.");
      }
      check(
        u.protocol === "https:" &&
          !u.username &&
          !u.password &&
          !/localhost|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^\[|\.local$/.test(
            u.hostname,
          ),
        "공개 이미지의 HTTPS 주소만 사용할 수 있습니다.",
      );
    }
    if (["taglist", "multiselect"].includes(f.type)) {
      value = value
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean);
      check(value.length <= 30, "목록은 최대 30개입니다.");
      if (f.options)
        check(
          value.every((x) => f.options.includes(x)),
          `${f.label} 선택값을 확인해 주세요.`,
        );
    }
    if (f.type === "list") {
      const lines = value.split("\n").filter((x) => x.trim());
      check(lines.length <= 100, "목록은 최대 100행입니다.");
      value = lines.map((line) => {
        const values = line.split("|").map((v) => v.trim());
        check(
          values.length === f.subKeys.length,
          `${f.label}: 각 행을 ${f.subKeys.length}개 항목으로 나눠 주세요.`,
        );
        return Object.fromEntries(
          f.subKeys.map((k, i) => [
            k,
            /^(score|max|amount|count|total)$/.test(k) &&
            /^\d+(\.\d+)?$/.test(values[i])
              ? Number(values[i])
              : values[i],
          ]),
        );
      });
    }
    const parts = f.key.split(".");
    check(
      parts.every(
        (k) => !["__proto__", "constructor", "prototype"].includes(k),
      ),
      "허용되지 않은 항목입니다.",
    );
    let target = result;
    for (const key of parts.slice(0, -1)) target = target[key] ??= {};
    target[parts.at(-1)] = value;
  }
  check(JSON.stringify(result).length <= 45000, "입력 자료가 너무 큽니다.");
  return result;
}

export function agentPrefill(s, studentId) {
  const st = studentId ? s.students.find((x) => x.id === studentId) : null;
  check(!studentId || st, "이 학원의 학생을 선택해 주세요.", 404);
  const c = st && s.classes.find((x) => x.id === st.classId);
  const records = st
    ? s.records
        .filter((r) => r.studentId === st.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20)
    : [];
  const last = records[0];
  const values = {
    academy_name: s.settings.name,
    shop_name: s.settings.name,
    "store.name": s.settings.name,
    "store.address": s.settings.address,
    "store.phone": s.settings.phone,
    today: today(),
    as_of: today(),
  };
  const knowledge = Object.fromEntries(
    s.knowledge.map((k) => [k.id, k.answer]),
  );
  for (const key of [
    "tuition",
    "schedule",
    "level",
    "curriculum",
    "consult",
    "location",
    "refund",
    "shuttle",
  ])
    if (knowledge[key])
      values[(key === "level" ? "level_test" : key) + "_note"] = knowledge[key];
  if (st)
    Object.assign(values, {
      student_name: `학생 ${st.id}`,
      student_alias: `학생 ${st.id}`,
      class_name: c?.name || "",
      subject: c?.subject || "",
      grade_level: c?.grade || "",
      term_end_date: st.termEnd || "",
      sessions_total: st.termTotal ?? "",
      lesson_date: last?.date || today(),
      teacher_notes: last?.shareMemo ? last.memo || "" : "",
      homework: last?.hw || "",
      attendance: records.map((r) => `${r.date} | ${r.att}`).join("\n"),
    });
  return values;
}

export function agentContext(s, code, studentId) {
  const context = {
    shop_name: s.settings.name,
    website_facts: JSON.stringify({
      name: s.settings.name,
      address: s.settings.address,
      phone: s.settings.phone,
      knowledge: s.knowledge.map(({ id, answer }) => ({ id, answer })),
    }),
  };
  if (studentId) {
    context.learning_records = s.records
      .filter((r) => r.studentId === studentId)
      .slice(-30)
      .map((r) => ({
        date: r.date,
        attendance: r.att,
        homework: r.hw || "",
        observation: r.level || "",
        teacher_note: r.shareMemo ? r.memo || "" : "",
      }));
    context.approved_learning_notes = s.docs
      .filter(
        (d) =>
          d.studentId === studentId &&
          d.agentRunId &&
          d.status === "approved" &&
          ["academy-ledger", "academy-study-ledger"].includes(d.worker),
      )
      .slice(0, 3)
      .map((d) => ({ title: d.title, body: d.body }));
  }
  if (["CORE-03", "CORE-04", "CORE-13", "CORE-22", "CORE-28"].includes(code))
    context.services = s.classes.map((c) => ({
      name: c.name,
      subject: c.subject,
      grade: c.grade,
    }));
  if (["CORE-11", "CORE-12", "CORE-30"].includes(code))
    context.customers = s.students
      .filter((st) => st.status === "active")
      .slice(0, 50)
      .map((st) => {
        const records = s.records
          .filter((r) => r.studentId === st.id && r.att === "출석")
          .sort((a, b) => b.date.localeCompare(a.date));
        return {
          name: `학생 ${st.id}`,
          last_visit: records[0]?.date || null,
          visit_count: records.length,
          tier: null,
        };
      });
  if (code === "CORE-24" && studentId) {
    context.customer_name = `학생 ${studentId}`;
    context.visits = s.records
      .filter((r) => r.studentId === studentId)
      .slice(0, 50)
      .map((r) => ({
        date: r.date,
        service: s.classes.find((c) => c.id === r.classId)?.name || "수업",
        attendance: r.att,
      }));
  }
  return context;
}

export class AgentWorkspace {
  constructor(store, { env = process.env, fetcher = fetch } = {}) {
    this.store = store;
    this.db = store.db;
    this.env = env;
    this.fetcher = fetcher;
    this.busy = false;
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS agent_runs (id TEXT PRIMARY KEY, academy_id TEXT NOT NULL REFERENCES academies(id), actor_id TEXT NOT NULL, request_key TEXT NOT NULL, digest TEXT NOT NULL, status TEXT NOT NULL, due_at TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), UNIQUE(academy_id,request_key)); CREATE INDEX IF NOT EXISTS agent_runs_due ON agent_runs(status,due_at);`,
    );
  }
  get(actor, id) {
    owner(actor);
    const row = this.db
      .prepare("SELECT payload FROM agent_runs WHERE id=? AND academy_id=?")
      .get(id, actor.academyId);
    check(row, "작업을 찾을 수 없습니다.", 404);
    return JSON.parse(row.payload);
  }
  list(actor) {
    owner(actor);
    return this.db
      .prepare(
        "SELECT payload FROM agent_runs WHERE academy_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .all(actor.academyId)
      .map((r) => JSON.parse(r.payload));
  }
  save(job) {
    this.db
      .prepare(
        "UPDATE agent_runs SET status=?,payload=? WHERE id=? AND academy_id=?",
      )
      .run(job.status, JSON.stringify(job), job.id, job.academyId);
  }
  summary(actor) {
    owner(actor);
    const s = this.store.load(actor.academyId);
    const connection = agentConnection(this.env);
    if (
      connection.ready &&
      actor.academyId !== this.env.ACADEMY_AGENT_ACADEMY_ID
    ) {
      connection.ready = false;
      connection.issues.push("현재 학원의 실행 서버 매핑이 없습니다.");
    }
    return {
      catalog: AGENT_CATALOG,
      school: {
        name: s.settings.name,
        address: s.settings.address,
        phone: s.settings.phone,
      },
      design: {
        id: siteDesign(s.settings).template.id,
        name: siteDesign(s.settings).template.name,
      },
      classes: s.classes.map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
      })),
      experiences: publicExperiences(s).length,
      publications: s.posts
        .filter((p) => p.kind === "popup")
        .map((p) => ({
          ...p,
          bookings: s.bookings.filter(
            (b) => b.campaignId && b.campaignId === p.campaignId,
          ).length,
        })),
      connection,
      students: s.students
        .filter((st) => st.status === "active")
        .map((st) => ({
          id: st.id,
          name: st.name,
          classId: st.classId,
          consent: st.consent,
          records: s.records.filter((r) => r.studentId === st.id).length,
        })),
      revision: s.revision,
      runs: this.list(actor),
      inquiries: s.conversations
        .filter((q) => q.status === "pending")
        .map(({ id, question, date }) => ({ id, question, date })),
      documents: s.docs
        .filter((d) => d.agentRunId)
        .map((d) => ({
          id: d.id,
          runId: d.agentRunId,
          status: d.status,
          title: d.title,
          channel: d.channel,
          delivery: s.deliveries.find((j) => j.docId === d.id)?.status,
        })),
      monthlyLimit: this.limit(),
    };
  }
  limit() {
    const n = Number(this.env.ACADEMY_AGENT_MONTHLY_LIMIT || 100);
    return Number.isInteger(n) && n > 0 && n <= 10000 ? n : 100;
  }
  create(actor, request) {
    owner(actor);
    const d = definition(request.code);
    check(d.available, "이 직원은 학원용 엔진 검증 후 연결됩니다.", 409);
    check(
      request.confirm === true,
      "전송할 자료와 공개 이미지 권한을 확인해 주세요.",
    );
    check(
      typeof request.key === "string" && /^[\w-]{8,80}$/.test(request.key),
      "작업 요청 ID가 필요합니다.",
    );
    const input = normalizeAgentInput(d, request.input);
    const s = this.store.load(actor.academyId);
    check(
      request.revision === s.revision,
      "학원 기록이 바뀌었습니다. 자료를 다시 불러와 확인해 주세요.",
      409,
    );
    agentPrefill(s, request.studentId);
    if (["report", "career"].includes(artifactFor(d.code))) {
      check(
        request.studentId &&
          s.students.some(
            (st) =>
              st.id === request.studentId &&
              st.status === "active" &&
              st.consent,
          ),
        "동의가 확인된 재원 학생을 선택해 주세요.",
      );
    }
    if (["popup", "content"].includes(artifactFor(d.code)))
      check(
        !request.studentId,
        "공개 게시 업무에는 학생 자료를 연결하지 않습니다.",
      );
    const source = request.source
      ? { type: request.source.type, id: request.source.id || null }
      : null;
    if (source) {
      check(
        ["school", "student", "inquiry"].includes(source.type),
        "자료 연결을 확인해 주세요.",
      );
      if (source.type === "student")
        check(source.id === request.studentId, "학생과 근거 자료가 다릅니다.");
      source.hash = agentSourceHash(s, source);
      if (request.studentId)
        check(
          source.type === "student" && source.id === request.studentId,
          "학생의 근거 기록을 연결해 주세요.",
        );
      if (artifactFor(d.code) === "inquiry")
        check(
          source.type === "inquiry" &&
            s.conversations.some(
              (q) => q.id === source.id && q.status === "pending",
            ),
          "답변할 홈페이지 문의를 선택해 주세요.",
        );
    }
    const due = request.dueAt ? Date.parse(request.dueAt) : Date.now();
    check(
      Number.isFinite(due) &&
        due <= Date.now() + 30 * 86400000 &&
        due >= Date.now() - 60000,
      "예약 시간은 지금부터 30일 이내로 지정해 주세요.",
    );
    const digest = hash({
      code: request.code,
      input,
      revision: s.revision,
      studentId: request.studentId || null,
      source,
      dueAt: request.dueAt || null,
    });
    return this.store.transaction(() => {
      const prior = this.db
        .prepare(
          "SELECT digest,payload FROM agent_runs WHERE academy_id=? AND request_key=?",
        )
        .get(actor.academyId, request.key);
      if (prior) {
        check(
          prior.digest === digest,
          "같은 요청 ID에 다른 내용을 보낼 수 없습니다.",
          409,
        );
        return JSON.parse(prior.payload);
      }
      const now = new Date().toISOString();
      const job = {
        id: randomUUID(),
        academyId: actor.academyId,
        actorId: actor.id,
        code: d.code,
        name: d.name,
        studentId: request.studentId || null,
        source,
        input,
        context: agentContext(s, d.code, request.studentId),
        sourceRevision: s.revision,
        status: "draft",
        createdAt: now,
        dueAt: new Date(due).toISOString(),
        history: [{ at: now, event: "입력 초안 저장", actor: actor.id }],
        output: null,
        error: null,
      };
      this.db
        .prepare("INSERT INTO agent_runs VALUES (?,?,?,?,?,?,?,?,?)")
        .run(
          job.id,
          actor.academyId,
          actor.id,
          request.key,
          digest,
          job.status,
          job.dueAt,
          now,
          JSON.stringify(job),
        );
      return job;
    });
  }
  action(actor, id, action, options = {}) {
    owner(actor);
    return this.store.transaction(() => {
      const job = this.get(actor, id);
      const now = new Date().toISOString();
      if (action === "queue") {
        if (["queued", "running"].includes(job.status)) return job;
        check(
          job.status === "draft",
          "새 입력 초안을 만들어 실행해 주세요.",
          409,
        );
        const connection = this.summary(actor).connection;
        check(connection.ready, connection.issues.join(" · "), 503);
        check(
          this.sourceValid(job),
          "자료가 바뀌었습니다. 새 초안으로 다시 준비해 주세요.",
          409,
        );
        const count = this.db
          .prepare(
            "SELECT count(*) AS n FROM agent_runs WHERE academy_id=? AND json_extract(payload,'$.queuedAt') >= ?",
          )
          .get(actor.academyId, now.slice(0, 7) + "-01").n;
        check(
          count < this.limit(),
          "이번 달 AI 실행 한도에 도달했습니다.",
          429,
        );
        job.status = "queued";
        job.queuedAt = now;
      } else if (action === "apply") {
        if (job.docId) {
          const existing = this.store
            .load(actor.academyId)
            .docs.find((d) => d.id === job.docId);
          check(
            existing?.status === "approved",
            "이미 결재함으로 보낸 문서는 결재함에서 확인해 주세요.",
            409,
          );
          return job;
        }
        check(
          job.status === "review" && this.sourceValid(job),
          "현재 자료로 준비한 결과를 먼저 확인해 주세요.",
          409,
        );
        const s = this.store.load(actor.academyId);
        const d = prepareAgentDocument(s, actor, job, options);
        execute(s, actor, "doc.approve", { id: d.id });
        tick(s);
        const delivery = s.deliveries.find((j) => j.docId === d.id);
        check(
          !delivery || delivery.status === "local_delivered",
          delivery?.note || "반영을 확인하지 못했습니다.",
          409,
        );
        s.revision++;
        this.store.save(s);
        job.docId = d.id;
        job.status = "submitted";
      } else if (action === "prepare") {
        if (job.docId) return job;
        check(
          job.status === "review",
          "검토 대기 결과만 결재함으로 보낼 수 있습니다.",
          409,
        );
        check(
          this.sourceValid(job),
          "근거 자료가 변경되었습니다. 새 초안으로 준비해 주세요.",
          409,
        );
        const s = this.store.load(actor.academyId);
        const d = prepareAgentDocument(s, actor, job, options);
        s.revision++;
        this.store.save(s);
        job.docId = d.id;
        job.status = "submitted";
      } else if (action === "approve" || action === "reject") {
        check(
          job.status === "review",
          "검토 대기 결과만 처리할 수 있습니다.",
          409,
        );
        if (action === "approve")
          check(
            this.sourceValid(job),
            "원본 자료가 변경되었습니다. 새 결과를 준비해 주세요.",
            409,
          );
        job.status = action === "approve" ? "approved" : "rejected";
        if (action === "approve") {
          const text = options.text ?? JSON.stringify(job.output, null, 2);
          check(
            typeof text === "string" &&
              text.trim().length > 0 &&
              text.length <= 100000,
            "승인할 결과는 1~100,000자로 입력해 주세요.",
          );
          job.approvedText = text.trim();
          job.approvedDigest = hash(job.approvedText);
        }
        job.reviewedAt = now;
        job.reviewedBy = actor.id;
      } else if (action === "cancel") {
        check(
          ["draft", "queued"].includes(job.status),
          "이미 시작한 작업은 취소할 수 없습니다.",
          409,
        );
        job.status = "cancelled";
      } else check(false, "알 수 없는 작업입니다.");
      job.history.push({ at: now, event: job.status, actor: actor.id });
      this.save(job);
      return job;
    });
  }
  sourceValid(job) {
    const s = this.store.load(job.academyId);
    return job.source
      ? agentSourceHash(s, job.source) === job.source.hash
      : s.revision === job.sourceRevision;
  }
  async processOne() {
    if (this.busy) return;
    this.busy = true;
    let job;
    try {
      job = this.store.transaction(() => {
        // Interrupted calls must never be resent silently: the provider may have completed them.
        for (const row of this.db
          .prepare("SELECT payload FROM agent_runs WHERE status='running'")
          .all()) {
          const old = JSON.parse(row.payload);
          if (Date.now() - Date.parse(old.startedAt) > 180000) {
            old.status = "failed";
            old.error =
              "실행 확인 시간이 지났습니다. 제공자 결과를 확인한 뒤 새로 요청해 주세요.";
            this.save(old);
          }
        }
        const row = this.db
          .prepare(
            "SELECT payload FROM agent_runs WHERE status='queued' AND due_at<=? ORDER BY due_at LIMIT 1",
          )
          .get(new Date().toISOString());
        if (!row) return null;
        const j = JSON.parse(row.payload);
        j.status = "running";
        j.startedAt = new Date().toISOString();
        this.save(j);
        return j;
      });
      if (!job) return;
      const connection = agentConnection(this.env);
      check(
        connection.ready && job.academyId === this.env.ACADEMY_AGENT_ACADEMY_ID,
        "실행 연결 설정이 준비되지 않았습니다.",
        503,
      );
      const s = this.store.load(job.academyId);
      if (!this.sourceValid(job)) {
        job.status = "stale";
        job.error =
          "예약 후 학원 자료가 변경되었습니다. 새 입력으로 확인해 주세요.";
        return;
      }
      const path = AGENT_PATHS[job.code];
      check(path, "허용되지 않은 실행입니다.");
      const payload = {
        ...job.input,
        ...job.context,
        vertical: "academy",
        shop_id: this.env.ACADEMY_AGENT_SHOP_ID,
        persist: false,
      };
      // Context is frozen with the reviewed input; only the server supplies tenant identity.
      const response = await this.fetcher(
        `${this.env.ACADEMY_AGENT_BASE_URL.replace(/\/$/, "")}/webhook/${path.replace(/^wf-/, "wf-prof-")}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.env.ACADEMY_AGENT_BEARER}`,
            "X-Request-ID": job.id,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(90000),
          redirect: "error",
        },
      );
      check(
        response.ok,
        `실행 서버 응답 오류 (${response.status}). 연결 설정과 실행 이력을 확인해 주세요.`,
        502,
      );
      const text = await response.text();
      check(text.length <= 200000, "결과가 너무 큽니다.", 502);
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        check(false, "실행 서버가 JSON 결과를 반환하지 않았습니다.", 502);
      }
      check(cleanObject(result), "실행 결과 구조가 올바르지 않습니다.", 502);
      if (["blocked", "disabled"].includes(result.status)) {
        job.status = "blocked";
        job.error =
          "실행 엔진이 요청을 보류했습니다. 입력과 에이전트 연결을 확인해 주세요.";
        job.warnings = Array.isArray(result.warnings)
          ? result.warnings.filter((x) => typeof x === "string").slice(0, 10)
          : [];
        return;
      }
      check(
        result.ok !== false &&
          !result.error &&
          result.status === "ok" &&
          cleanObject(result.data) &&
          Object.keys(result.data).length > 0,
        "실행 결과를 성공으로 확인할 수 없습니다. 응답 규격 점검이 필요합니다.",
        502,
      );
      job.output = result.data;
      job.status = "review";
      job.engine = "Agent1000 전용 n8n";
      job.warnings = Array.isArray(result.warnings)
        ? result.warnings.filter((x) => typeof x === "string").slice(0, 10)
        : [];
    } catch (e) {
      if (job) {
        job.status = "failed";
        job.error = e.status
          ? e.message
          : "연결 실패 또는 응답 시간 초과입니다. 제공자 실행 이력을 확인한 뒤 새로 요청해 주세요.";
      }
    } finally {
      if (job && terminal.has(job.status)) {
        job.finishedAt = new Date().toISOString();
        job.history.push({ at: job.finishedAt, event: job.status });
        this.save(job);
      }
      this.busy = false;
    }
  }
}
