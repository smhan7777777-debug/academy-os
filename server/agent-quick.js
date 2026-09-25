import { agentPrefill } from "./agent-workspace.js";
import { AGENT_CATALOG } from "../shared/agent-catalog.js";
import { check } from "./errors.js";
import { remaining } from "../shared/core.js";
export function quickInput(s, p) {
  check(
    p && typeof p === "object" && !Array.isArray(p),
    "준비할 업무를 선택해 주세요.",
  );
  const def = AGENT_CATALOG.find((a) => a.code === p.code && a.priority);
  check(
    def && p.code !== "academy-popup",
    "해당 업무는 상세 작업실에서 준비해 주세요.",
  );
  const schoolOnly = p.code === "academy-place" || p.code === "academy-inquiry";
  const st = schoolOnly
    ? null
    : s.students.find((st) => st.id === p.studentId && st.status === "active");
  check(schoolOnly || st, "학생을 선택해 주세요.");
  check(!st || st.consent, "학습 정보 활용 동의를 먼저 확인해 주세요.");
  const values = agentPrefill(s, st?.id);
  if (st) {
    values.sessions_used = st.termTotal - remaining(s, st);
    const records = s.records
      .filter((r) => r.studentId === st.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
    if (
      ["academy-journal", "academy-ledger", "academy-study-ledger"].includes(
        p.code,
      )
    )
      check(
        records.length,
        "아직 저장된 수업 기록이 없습니다. 수업 기록을 먼저 저장해 주세요.",
      );
    if (p.code === "academy-journal")
      values.teacher_notes = records
        .slice(0, 5)
        .map(
          (r) =>
            `${r.date} · ${r.att}${r.hw ? ` · 숙제: ${r.hw}` : ""}${r.level ? ` · 관찰: ${r.level}` : ""}${r.shareMemo && r.memo ? ` · ${r.memo}` : ""}`,
        )
        .join("\n");
  }
  let source = st ? { type: "student", id: st.id } : { type: "school" };
  if (p.code === "academy-inquiry") {
    const q = s.conversations.find(
      (q) => q.id === p.inquiryId && q.status === "pending",
    );
    check(q, "답변할 홈페이지 문의를 선택해 주세요.");
    values.inquiry = q.question;
    source = { type: "inquiry", id: q.id };
  }
  if (p.code === "academy-place") {
    values.channel = p.channel || "naver_place";
    check(
      ["naver_place", "kakao_map", "google_gbp", "karrot"].includes(
        values.channel,
      ),
      "채널을 선택해 주세요.",
    );
  }
  if (p.code === "academy-career") {
    check(
      Array.isArray(p.interests) &&
        p.interests.length > 0 &&
        p.interests.length <= 12 &&
        p.interests.every(
          (x) => typeof x === "string" && x.length > 0 && x.length <= 80,
        ),
      "학생이 실제로 말한 관심 분야를 선택해 주세요.",
    );
    values.interests = p.interests.join("\n");
  }
  if (p.code === "academy-briefing") {
    check(
      typeof p.photoUrl === "string" && p.photoUrl.startsWith("https://"),
      "사진 분석에는 공개 가능한 답안지 사진 주소가 필요합니다. 사진 없이 수업 리포트를 만들려면 수업 기록 리포트를 선택하세요.",
    );
    values.photo_url = p.photoUrl;
  }
  const input = Object.fromEntries(
    def.fields
      .filter((f) => values[f.key] !== undefined && values[f.key] !== "")
      .map((f) => [f.key, values[f.key]]),
  );
  return {
    code: p.code,
    input,
    source,
    studentId: st?.id || null,
    revision: s.revision,
    studentName: st?.name || null,
    name: def.name,
  };
}
