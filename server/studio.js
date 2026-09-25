import {
  randomUUID,
  randomBytes,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { check } from "./errors.js";
import { today, schedulesAt } from "../shared/core.js";

const hash = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const stamp = () => new Date().toISOString();
const text = (v, label, max = 2000, required = true) => {
  check(
    typeof v === "string" && v.length <= max && (!required || v.trim()),
    `${label}을(를) 확인해 주세요.`,
  );
  return v.trim();
};
export const studioProfile = (s) =>
  s.settings.studioProfile || {
    method: "",
    feedback: "",
    preparation: "",
    version: 0,
  };
export function sourceFor(s, classId, bookingId = "") {
  const c = s.classes.find((c) => c.id === classId);
  check(c, "수업을 찾을 수 없습니다.", 404);
  const b = bookingId ? s.bookings.find((b) => b.id === bookingId) : null;
  check(
    !bookingId || (b && b.classId === classId),
    "상담과 선택한 수업을 확인해 주세요.",
  );
  return {
    academy: {
      name: s.settings.name,
      address: s.settings.address,
      phone: s.settings.phone,
    },
    class: {
      id: c.id,
      name: c.name,
      grade: c.grade,
      subject: c.subject,
      teacher: c.teacher,
      fee: c.fee,
      sessions: schedulesAt(c, today()),
    },
    profile: studioProfile(s),
    ...(b
      ? {
          booking: {
            id: b.id,
            classId: b.classId,
            status: b.status,
            name: b.name,
          },
        }
      : {}),
  };
}
export function studioCurrent(s, item) {
  try {
    return hash(sourceFor(s, item.classId, item.bookingId)) === item.sourceHash;
  } catch {
    return false;
  }
}
function publicCheck(s, d) {
  const value = JSON.stringify(d);
  check(
    !s.students.some((st) => value.includes(st.name)),
    "공개 체험에 재원 학생 이름을 넣을 수 없습니다.",
  );
  check(
    !/합격\s*보장|성적\s*향상\s*보장|100%\s*보장/.test(value),
    "보장 표현을 빼고 실제 수업 방식으로 설명해 주세요.",
  );
}
export function validateStudioData(kind, data) {
  check(
    data && typeof data === "object" && !Array.isArray(data),
    "작성 내용을 확인해 주세요.",
  );
  const d = { title: text(data.title, "제목", 100) };
  if (kind === "experience") {
    for (const key of ["intro", "question", "hint", "explanation"])
      d[key] = text(data[key], key, 1500);
    check(
      Array.isArray(data.choices) && data.choices.length === 3,
      "선택지 세 개를 입력해 주세요.",
    );
    d.choices = data.choices.map((v) => text(v, "선택지", 200));
    check(new Set(d.choices).size === 3, "선택지는 서로 다르게 작성해 주세요.");
    check(
      Number.isInteger(data.answer) && data.answer >= 0 && data.answer < 3,
      "정답을 선택해 주세요.",
    );
    d.answer = data.answer;
  } else if (kind === "guide") {
    for (const key of ["audience", "goal", "plan", "preparation", "questions"])
      d[key] = text(data[key], key, 1500, key !== "questions");
  } else {
    check(kind === "lesson", "지원하지 않는 자료 종류입니다.");
    for (const key of ["activity", "why", "next", "teacherNotes"])
      d[key] = text(data[key], key, 1500, key !== "teacherNotes");
  }
  return d;
}
const audit = (s, a, action, itemId, detail = "") =>
  s.audit.unshift({
    id: "EV-" + randomUUID(),
    at: stamp(),
    actor: a.name,
    actorId: a.id,
    action,
    detail: `${itemId} ${detail}`,
  });
export function executeStudio(s, a, type, p) {
  check(a.role === "owner", "수업 스튜디오는 원장 권한이 필요합니다.", 403);
  if (type === "studio.profile") {
    s.settings.studioProfile = {
      method: text(p.method, "가르치는 방식", 1500),
      feedback: text(p.feedback, "피드백 기준", 1500),
      preparation: text(p.preparation, "수업 준비 안내", 1500),
      version: studioProfile(s).version + 1,
    };
    audit(s, a, type, "profile");
    return {
      message:
        "학원 기준을 저장했습니다. 기존 자료는 최신 기준으로 다시 확인해 주세요.",
    };
  }
  if (type === "studio.save") {
    check(
      ["experience", "guide", "lesson"].includes(p.kind),
      "자료 종류를 확인해 주세요.",
    );
    const source = sourceFor(s, p.classId, p.bookingId || "");
    const data = validateStudioData(p.kind, p.data);
    if (p.kind === "experience")
      publicCheck(s, { data, profile: source.profile });
    let item = p.id ? s.studioItems.find((x) => x.id === p.id) : null;
    check(!p.id || item, "자료를 찾을 수 없습니다.", 404);
    check(
      !item || (item.version === p.version && item.kind === p.kind),
      "자료가 변경되었습니다. 최신 내용을 확인해 주세요.",
      409,
    );
    check(
      s.studioItems.length < 1000 || item,
      "자료 보관 한도에 도달했습니다.",
    );
    if (!item) {
      item = { id: randomUUID(), kind: p.kind, version: 0, createdAt: stamp() };
      s.studioItems.unshift(item);
    }
    Object.assign(item, {
      data,
      classId: p.classId,
      bookingId: p.bookingId || "",
      source,
      sourceHash: hash(source),
      version: item.version + 1,
      status: "draft",
      updatedAt: stamp(),
      secret: null,
      expiresAt: null,
    });
    audit(s, a, type, item.id, `v${item.version}`);
    return {
      message: "초안을 저장했습니다. 검토·승인 전에는 공개되지 않습니다.",
      itemId: item.id,
    };
  }
  const item = s.studioItems.find((x) => x.id === p.id);
  check(item, "자료를 찾을 수 없습니다.", 404);
  check(
    item.version === p.version,
    "자료가 변경되었습니다. 최신 내용을 확인해 주세요.",
    409,
  );
  if (type === "studio.publish") {
    check(item.status === "draft", "초안만 승인할 수 있습니다.");
    check(p.confirmed === true, "내용·공유 범위를 확인한 뒤 승인해 주세요.");
    check(
      studioCurrent(s, item),
      "학원 정보가 바뀌었습니다. 최신 정보로 초안을 다시 저장해 주세요.",
      409,
    );
    validateStudioData(item.kind, item.data);
    if (item.kind === "experience")
      publicCheck(s, { data: item.data, profile: item.source.profile });
    const days = p.days ?? 7;
    check(
      Number.isInteger(days) && days >= 1 && days <= 30,
      "공유 기간은 1~30일입니다.",
    );
    item.status = "published";
    item.approvedAt = stamp();
    item.approvedBy = a.id;
    item.expiresAt =
      item.kind === "experience"
        ? null
        : new Date(Date.now() + days * 86400000).toISOString();
    item.secret =
      item.kind === "experience" ? null : randomBytes(32).toString("hex");
    s.studioApprovals.push({
      id: randomUUID(),
      itemId: item.id,
      version: item.version,
      at: item.approvedAt,
      actorId: a.id,
      snapshot: structuredClone({
        kind: item.kind,
        data: item.data,
        source: item.source,
        expiresAt: item.expiresAt,
      }),
    });
    audit(s, a, type, item.id, `v${item.version}`);
    return {
      message:
        item.kind === "experience"
          ? "수업 체험을 공개했습니다."
          : "안내서를 승인했습니다. 전용 링크로 전달해 주세요.",
      itemId: item.id,
    };
  }
  check(type === "studio.revoke", "지원하지 않는 작업입니다.");
  item.status = "revoked";
  item.secret = null;
  item.version++;
  audit(s, a, type, item.id);
  return { message: "공개·공유를 중지했습니다. 이전 링크는 열리지 않습니다." };
}
export function publicExperiences(s) {
  return s.studioItems
    .filter(
      (x) =>
        x.kind === "experience" &&
        x.status === "published" &&
        studioCurrent(s, x),
    )
    .map((x) => ({
      id: x.id,
      version: x.version,
      title: x.data.title,
      intro: x.data.intro,
      subject: x.source.class.subject,
      grade: x.source.class.grade,
      className: x.source.class.name,
      method: x.source.profile.method,
    }));
}
export function readStudioGuide(s, id, secret) {
  const item = s.studioItems.find(
    (x) => x.id === id && x.kind !== "experience",
  );
  const matches =
    item?.secret &&
    typeof secret === "string" &&
    /^[a-f0-9]{64}$/.test(secret) &&
    timingSafeEqual(
      Buffer.from(item.secret, "hex"),
      Buffer.from(secret, "hex"),
    );
  check(
    matches &&
      item.status === "published" &&
      item.expiresAt > stamp() &&
      studioCurrent(s, item),
    "안내서를 열 수 없습니다. 링크가 만료되었거나 내용이 변경되었습니다. 학원에 새 안내를 요청해 주세요.",
    404,
  );
  const { teacherNotes, ...data } = item.data;
  return {
    kind: item.kind,
    data,
    academy: item.source.academy,
    class: item.source.class,
    method: item.source.profile.method,
    approvedAt: item.approvedAt,
    expiresAt: item.expiresAt,
  };
}
export function executeStudioPublic(s, type, p) {
  if (type === "studio.start") {
    const item = s.studioItems.find(
      (x) =>
        x.id === p.id &&
        x.kind === "experience" &&
        x.status === "published" &&
        studioCurrent(s, x),
    );
    check(item, "현재 공개 중인 수업 체험을 찾을 수 없습니다.", 404);
    check(
      s.studioEvents.length < 20000,
      "현재 체험을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.",
      429,
    );
    const event = {
      id: randomUUID(),
      token: randomBytes(24).toString("hex"),
      itemId: item.id,
      version: item.version,
      at: stamp(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      attempts: 0,
      completed: false,
      consulted: false,
    };
    s.studioEvents.push(event);
    return {
      token: event.token,
      question: item.data.question,
      choices: item.data.choices,
      title: item.data.title,
      intro: item.data.intro,
      method: item.source.profile.method,
    };
  }
  const event = s.studioEvents.find((x) => x.token === p.token);
  check(event && event.expiresAt > stamp(), "체험을 다시 시작해 주세요.", 404);
  const item = s.studioItems.find((x) => x.id === event.itemId);
  check(
    item &&
      item.status === "published" &&
      item.version === event.version &&
      studioCurrent(s, item),
    "수업 체험이 변경되었습니다. 다시 시작해 주세요.",
    409,
  );
  if (type === "studio.consult") {
    check(event.completed, "체험을 마친 뒤 상담으로 이어갈 수 있습니다.");
    event.consulted = true;
    return {
      href: `/?portal=1&classId=${encodeURIComponent(item.classId)}#booking`,
    };
  }
  check(type === "studio.answer", "지원하지 않는 작업입니다.");
  check(
    Number.isInteger(p.answer) && p.answer >= 0 && p.answer < 3,
    "답을 선택해 주세요.",
  );
  check(
    event.attempts < 2 && !event.completed,
    "이미 마친 체험입니다. 새로운 체험을 시작해 주세요.",
  );
  event.attempts++;
  const correct = p.answer === item.data.answer;
  event.completed = correct || event.attempts === 2;
  return {
    correct,
    completed: event.completed,
    hint: item.data.hint,
    ...(event.completed
      ? {
          explanation: item.data.explanation,
          answer: item.data.answer,
          feedback: item.source.profile.feedback,
        }
      : {}),
  };
}
