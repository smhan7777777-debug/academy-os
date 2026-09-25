export const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
export const today = (now = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export const addDays = (date, n) =>
  new Date(Date.parse(date + "T12:00:00+09:00") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const dayOf = (date) => new Date(date + "T12:00:00+09:00").getUTCDay();
export const dateLabel = (date) =>
  `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${DAYS[dayOf(date)]})`;
export const timeLabel = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const won = (n) => new Intl.NumberFormat("ko-KR").format(n) + "원";
export const overlap = (a, b) => a.start < b.end && b.start < a.end;
export const schedulesAt = (c, date) =>
  [...c.scheduleVersions]
    .filter((v) => v.effectiveFrom <= date)
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version,
    )[0]?.sessions || [];
export const sessionsOn = (c, date) =>
  schedulesAt(c, date).filter((s) => s.day === dayOf(date));
export const balance = (s, invoice) =>
  invoice.amount -
  (invoice.credit || 0) -
  s.payments
    .filter((p) => p.invoiceId === invoice.id)
    .reduce((n, p) => n + p.amount, 0);
export const paid = (s, invoice) =>
  s.payments
    .filter((p) => p.invoiceId === invoice.id)
    .reduce((n, p) => n + p.amount, 0);
export const remaining = (s, student) =>
  Math.max(
    0,
    student.termTotal -
      s.records.filter(
        (r) =>
          r.studentId === student.id &&
          r.date >= student.termStart &&
          r.date <= student.termEnd &&
          ["출석", "지각"].includes(r.att),
      ).length,
  );
export const STATUS = {
  review: "원장 결재",
  teacher_review: "강사 검수",
  held: "보류",
  approved: "결재 완료",
  stale: "근거 변경",
  cancelled: "취소",
};
export const KIND = {
  report: "학습 리포트",
  billing: "수납 안내",
  care: "학생 살펴보기",
  pset: "맞춤 문제",
  career: "진로 상담",
  timetable: "시간표 변경",
  booking: "상담 요청",
  inquiry: "문의 답변",
  content: "학원 소식",
  popup: "상단 소식",
  tuition: "수강료 안내",
  reenroll: "재등록 안내",
  biz: "행정 초안",
  refund: "환불 계산",
  survey: "학부모 의견",
  review: "후기 답글",
  website: "웹사이트 변경",
};
export const KIND_ICON = {
  report: "file",
  billing: "wallet",
  care: "heart",
  pset: "book",
  career: "compass",
  timetable: "calendar",
  booking: "calendar",
  inquiry: "chat",
  content: "leaf",
  popup: "globe",
  tuition: "wallet",
  reenroll: "users",
  biz: "briefcase",
  refund: "wallet",
  survey: "chat",
  review: "chat",
  website: "globe",
};
export function attention(s, student, date = today()) {
  const records = s.records
    .filter(
      (r) =>
        r.studentId === student.id &&
        r.date >= addDays(date, -14) &&
        r.date <= date,
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const parts = [];
  const w = s.settings.weights;
  const absent = records.filter((r) => r.att === "결석").length;
  if (absent >= 2)
    parts.push({ label: `최근 2주 결석 ${absent}회`, points: w.absent });
  if (
    records.length >= 2 &&
    records.slice(0, 2).every((r) => r.hw === "미제출")
  )
    parts.push({ label: "숙제 연속 2회 미제출", points: w.homework });
  if (
    s.surveys.some(
      (r) =>
        r.studentId === student.id &&
        r.rating <= 3 &&
        r.date >= addDays(date, -30),
    )
  )
    parts.push({ label: "확인할 학부모 의견", points: w.feedback });
  if (
    s.invoices.some(
      (i) => i.studentId === student.id && i.due < date && balance(s, i) > 0,
    )
  )
    parts.push({ label: "기한이 지난 수강료", points: w.billing });
  return { score: parts.reduce((a, p) => a + p.points, 0), parts };
}
export const WORKERS = [
  [
    "report",
    "리포트 담당",
    "기록한 사실만 보호자 안내로 정리합니다.",
    "수업 기록 저장 시",
  ],
  [
    "billing",
    "수납 담당",
    "잔액을 확인하고 오래된 안내를 중지합니다.",
    "매일 · 입금 기록 시",
  ],
  [
    "care",
    "관심학생 담당",
    "최근 관찰과 학부모 의견을 함께 살핍니다.",
    "매일 · 관찰 변경 시",
  ],
  [
    "pset",
    "오답 담당",
    "오답 단원에 맞는 검수용 문제를 준비합니다.",
    "강사가 요청할 때",
  ],
  [
    "booking",
    "상담 담당",
    "강사·상담실이 비어 있는 시간을 찾습니다.",
    "상담 요청 시",
  ],
  [
    "inquiry",
    "문의 담당",
    "확정한 지식만 답하고 나머지는 확인을 요청합니다.",
    "문의 접수 시",
  ],
  [
    "content",
    "콘텐츠 담당",
    "원장님이 쓴 소식을 결재 후 로컬 공개본에 반영합니다.",
    "초안을 요청할 때",
  ],
  [
    "reenroll",
    "재등록 담당",
    "수강 종료일과 남은 회차로 안내를 준비합니다.",
    "매일 · 종료 30일 전",
  ],
];
export const KNOWLEDGE = [
  ["tuition", "수강료", ["수강료", "학원비", "비용", "원비"]],
  ["schedule", "시간표", ["시간표", "요일", "몇 시"]],
  ["level", "레벨 확인", ["레벨", "테스트", "진단"]],
  ["capacity", "반 정원", ["정원", "몇 명", "인원"]],
  ["curriculum", "커리큘럼", ["커리큘럼", "진도", "선행", "내신", "교재"]],
  ["consult", "상담", ["상담", "전화"]],
  ["location", "위치·주차", ["위치", "주소", "어디", "주차"]],
  ["refund", "환불", ["환불", "취소", "반환"]],
  ["shuttle", "셔틀", ["셔틀", "버스", "차량", "픽업"]],
];
