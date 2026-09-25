import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { seed } from "./seed.js";
import {
  daily,
  execute,
  executePublic,
  tick,
  check,
  DomainError,
} from "./domain.js";

export const COLLECTIONS = [
  "students",
  "classes",
  "invoices",
  "payments",
  "records",
  "docs",
  "approvals",
  "deliveries",
  "bookings",
  "conversations",
  "surveys",
  "posts",
  "quizzes",
  "answers",
  "reviews",
  "workers",
  "knowledge",
  "websiteRequests",
  "studioItems",
  "studioEvents",
  "studioApprovals",
  "audit",
];
const IMMUTABLE = new Set([
  "payments",
  "approvals",
  "answers",
  "audit",
  "studioApprovals",
]);
export class Store {
  constructor(path = "data/academy.sqlite") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 5000 });
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;",
    );
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL); INSERT INTO schema_version SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version);
   CREATE TABLE IF NOT EXISTS academies (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, settings TEXT NOT NULL CHECK(json_valid(settings)));
   CREATE TABLE IF NOT EXISTS command_receipts (academy_id TEXT NOT NULL REFERENCES academies(id), id TEXT NOT NULL, actor_id TEXT NOT NULL, digest TEXT NOT NULL, result TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY(academy_id,id));
   CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, salt TEXT NOT NULL);
  `);
    for (const table of COLLECTIONS)
      this.db.exec(
        `CREATE TABLE IF NOT EXISTS ${table} (academy_id TEXT NOT NULL REFERENCES academies(id), id TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(academy_id,id));`,
      );
    this.db
      .exec(`CREATE UNIQUE INDEX IF NOT EXISTS payment_reference ON payments(academy_id,json_extract(payload,'$.reference'));
   CREATE UNIQUE INDEX IF NOT EXISTS lesson_identity ON records(academy_id,json_extract(payload,'$.studentId'),json_extract(payload,'$.classId'),json_extract(payload,'$.date'));
   CREATE UNIQUE INDEX IF NOT EXISTS approval_revision ON approvals(academy_id,json_extract(payload,'$.docId'),json_extract(payload,'$.revision'));
   CREATE UNIQUE INDEX IF NOT EXISTS delivery_approval ON deliveries(academy_id,json_extract(payload,'$.approvalId'));
   CREATE UNIQUE INDEX IF NOT EXISTS survey_month ON surveys(academy_id,json_extract(payload,'$.studentId'),substr(json_extract(payload,'$.date'),1,7));`);
    check(
      this.db.prepare("SELECT version FROM schema_version").get().version === 1,
      "지원하지 않는 데이터베이스 버전입니다.",
      500,
    );
    if (!this.db.prepare("SELECT id FROM academies LIMIT 1").get()) {
      const s = seed();
      daily(s);
      this.transaction(() => {
        this.db
          .prepare("INSERT INTO academies VALUES (?,?,?)")
          .run(s.academyId, 0, JSON.stringify(s.settings));
        this.save(s);
      });
    }
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  load(academyId = "forest") {
    // A second local server can commit between collection reads. Keep each
    // response in one WAL snapshot without taking a write lock for a GET.
    if (this.db.isTransaction) return this.loadSnapshot(academyId);
    this.db.exec("BEGIN");
    try {
      const state = this.loadSnapshot(academyId);
      this.db.exec("COMMIT");
      return state;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  loadSnapshot(academyId) {
    const row = this.db
      .prepare("SELECT * FROM academies WHERE id=?")
      .get(academyId);
    check(row, "학원을 찾을 수 없습니다.", 404);
    const s = {
      academyId: row.id,
      revision: row.revision,
      settings: JSON.parse(row.settings),
    };
    for (const table of COLLECTIONS)
      s[table] = this.db
        .prepare(
          `SELECT payload FROM ${table} WHERE academy_id=? ORDER BY rowid`,
        )
        .all(academyId)
        .map((row) => JSON.parse(row.payload));
    s.docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    s.websiteRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    s.audit.sort((a, b) => b.at.localeCompare(a.at));
    return s;
  }
  save(s) {
    this.db
      .prepare("UPDATE academies SET revision=?,settings=? WHERE id=?")
      .run(s.revision, JSON.stringify(s.settings), s.academyId);
    for (const table of COLLECTIONS) {
      const existing = new Map(
        this.db
          .prepare(`SELECT id,payload FROM ${table} WHERE academy_id=?`)
          .all(s.academyId)
          .map((r) => [r.id, r.payload]),
      );
      const insert = this.db.prepare(
        `INSERT INTO ${table}(academy_id,id,payload) VALUES(?,?,?)`,
      );
      const update = this.db.prepare(
        `UPDATE ${table} SET payload=? WHERE academy_id=? AND id=?`,
      );
      for (const row of s[table]) {
        const payload = JSON.stringify(row);
        if (!existing.has(row.id)) insert.run(s.academyId, row.id, payload);
        else if (existing.get(row.id) !== payload) {
          check(
            !IMMUTABLE.has(table),
            `${table}의 확정 기록을 수정할 수 없습니다.`,
            500,
          );
          update.run(payload, s.academyId, row.id);
        }
        existing.delete(row.id);
      }
      // Deletion is deliberately unavailable: withdrawn/cancelled/superseded records remain auditable.
      check(
        existing.size === 0,
        "저장 과정에서 기존 기록이 누락되었습니다.",
        500,
      );
    }
  }
  command(actor, request, isPublic = false) {
    check(
      request && typeof request === "object" && !Array.isArray(request),
      "작업 요청을 확인해 주세요.",
      400,
    );
    const { id, type, payload = {}, revision } = request;
    check(
      payload && typeof payload === "object" && !Array.isArray(payload),
      "작업 내용을 확인해 주세요.",
      400,
    );
    check(
      typeof id === "string" && /^[\w-]{8,100}$/.test(id),
      "요청 식별번호가 필요합니다.",
    );
    check(typeof type === "string", "작업 종류가 필요합니다.");
    const academyId = actor?.academyId || "forest";
    const actorId = actor?.id || "public";
    const digest = createHash("sha256")
      .update(JSON.stringify({ type, payload }))
      .digest("hex");
    return this.transaction(() => {
      const old = this.db
        .prepare("SELECT * FROM command_receipts WHERE academy_id=? AND id=?")
        .get(academyId, id);
      if (old) {
        check(
          old.actor_id === actorId && old.digest === digest,
          "같은 요청 번호로 다른 작업을 실행할 수 없습니다.",
          409,
        );
        return JSON.parse(old.result);
      }
      const s = this.load(academyId);
      if (!isPublic)
        check(
          Number.isInteger(revision) && s.revision === revision,
          "다른 화면에서 기록이 변경되었습니다. 최신 내용을 확인한 뒤 다시 저장해 주세요.",
          409,
        );
      const result = isPublic
        ? executePublic(s, type, payload)
        : execute(s, actor, type, payload);
      s.revision++;
      this.save(s);
      this.db
        .prepare("INSERT INTO command_receipts VALUES(?,?,?,?,?,?)")
        .run(
          academyId,
          id,
          actorId,
          digest,
          JSON.stringify(result),
          new Date().toISOString(),
        );
      return result;
    });
  }
  tick() {
    return this.transaction(() => {
      const s = this.load();
      if (tick(s)) {
        s.revision++;
        this.save(s);
        return true;
      }
      return false;
    });
  }
  session(actorId) {
    const token = randomUUID() + randomUUID();
    const csrf = randomUUID();
    this.db
      .prepare("DELETE FROM auth_sessions WHERE expires<?")
      .run(Date.now());
    this.db
      .prepare("INSERT INTO auth_sessions VALUES(?,?,?,?)")
      .run(
        createHash("sha256").update(token).digest("hex"),
        actorId,
        csrf,
        Date.now() + 12 * 3600e3,
      );
    return { token, csrf };
  }
  getSession(token) {
    if (!token) return null;
    return (
      this.db
        .prepare(
          "SELECT actor_id,csrf FROM auth_sessions WHERE token_hash=? AND expires>?",
        )
        .get(createHash("sha256").update(token).digest("hex"), Date.now()) ||
      null
    );
  }
  logout(token) {
    if (token)
      this.db
        .prepare("DELETE FROM auth_sessions WHERE token_hash=?")
        .run(createHash("sha256").update(token).digest("hex"));
  }
  close() {
    this.db.close();
  }
}
