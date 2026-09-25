import { createHash } from "node:crypto";
import { check } from "./errors.js";
export function agentSourceHash(s, source) {
  let data;
  if (source.type === "inquiry") {
    const q = s.conversations.find((q) => q.id === source.id);
    check(q, "연결할 문의를 찾을 수 없습니다.", 404);
    data = q;
  } else if (source.type === "student") {
    const st = s.students.find((st) => st.id === source.id);
    check(st, "연결할 학생을 찾을 수 없습니다.", 404);
    data = {
      student: st,
      records: s.records.filter((r) => r.studentId === st.id),
      class: s.classes.find((c) => c.id === st.classId),
      approvedNotes: s.docs
        .filter(
          (d) =>
            d.studentId === st.id &&
            d.agentRunId &&
            d.status === "approved" &&
            ["academy-ledger", "academy-study-ledger"].includes(d.worker),
        )
        .slice(0, 3)
        .map((d) => ({ id: d.id, revision: d.revision, body: d.body })),
    };
  } else {
    check(source.type === "school", "지원하지 않는 자료 연결입니다.");
    data = s.classes;
  }
  const { name, address, phone } = s.settings;
  return createHash("sha256")
    .update(
      JSON.stringify({
        data,
        settings: { name, address, phone },
        knowledge: s.knowledge,
      }),
    )
    .digest("hex");
}
