import { createHash } from "node:crypto";
import { today, addDays } from "../shared/core.js";
import { check } from "./errors.js";
import { publicExperiences } from "./studio.js";
export function campaignPreview(s, p = {}) {
  check(
    p && typeof p === "object" && !Array.isArray(p),
    "선택한 안내 항목을 확인해 주세요.",
  );
  check(
    (p.title === undefined || typeof p.title === "string") &&
      (p.body === undefined || typeof p.body === "string"),
    "제목과 내용은 글자로 입력해 주세요.",
  );
  const kind = p.kind || "enrollment";
  check(
    ["enrollment", "consultation", "experience"].includes(kind),
    "안내 종류를 선택해 주세요.",
  );
  const c = p.classId ? s.classes.find((c) => c.id === p.classId) : null;
  check(!p.classId || c, "학원에 등록된 수업을 선택해 주세요.");
  const days = Number(p.days || 14);
  check([7, 14, 30].includes(days), "게시 기간을 선택해 주세요.");
  const delay = Number(p.delay || 0);
  check([0, 1, 7].includes(delay), "게시 시작일을 선택해 주세요.");
  const tone = p.tone || "navy",
    layout = p.layout || "card";
  check(
    ["navy", "teal", "plum"].includes(tone) && ["card", "bar"].includes(layout),
    "안내 디자인을 선택해 주세요.",
  );
  const label = c?.name || s.settings.name;
  const variants = {
    enrollment: {
      title: `${label} 수강 상담`,
      body: `${label}의 수업이 궁금하신가요?\n수업 내용과 수강 일정은 상담을 통해 안내해 드립니다.\n아래에서 편한 상담 시간을 선택해 주세요.`,
    },
    consultation: {
      title: `${label}, 먼저 이야기 나눠요`,
      body: `학생에게 맞는 수업을 함께 살펴봅니다.\n궁금한 점을 정리해 상담을 신청해 주세요.\n${s.settings.name}에서 안내해 드리겠습니다.`,
    },
    experience: {
      title: "우리 학원의 수업을 만나 보세요",
      body: `${s.settings.name}의 공개 수업 체험을 만나 보세요.\n체험 후 궁금한 점은 학원에 문의해 주세요.`,
    },
  };
  if (kind === "experience")
    check(
      publicExperiences(s).length > 0,
      "공개할 수업 체험을 먼저 승인해 주세요.",
    );
  const title = String(p.title ?? variants[kind].title).trim();
  const body = String(p.body ?? variants[kind].body).trim();
  check(
    title.length > 0 &&
      title.length <= 100 &&
      body.length > 0 &&
      body.length <= 5000,
    "제목과 내용을 확인해 주세요.",
  );
  const result = {
    title,
    body,
    tone,
    layout,
    kind: "popup",
    startsAt: `${addDays(today(), delay)}T00:00:00+09:00`,
    endsAt: `${addDays(today(), delay + days - 1)}T23:59:59+09:00`,
    cta: kind === "experience" ? "/learn" : "/?portal=1#booking",
    classId: c?.id || null,
    mode: "template",
    schoolName: s.settings.name,
  };
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        result,
        source: {
          name: s.settings.name,
          class: c,
          studio: kind === "experience" ? s.studioItems : null,
        },
      }),
    )
    .digest("hex");
  return { ...result, hash, revision: s.revision };
}
