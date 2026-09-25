export const AGENT_TEAMS = [
  {
    name: "수업·학습 기록",
    description: "수업 기록을 장부와 보호자 리포트로 정리합니다.",
    codes: [
      "academy-journal",
      "academy-ledger",
      "academy-study-ledger",
      "academy-briefing",
      "academy-career",
      "CORE-24",
    ],
    destination: "학생별 내부 기록 · 동의한 보호자에게 전달",
  },
  {
    name: "신규 문의·상담",
    description: "홈페이지에서 들어온 질문과 상담을 이어갑니다.",
    codes: [
      "academy-inquiry",
      "CORE-01",
      "CORE-02",
      "CORE-03",
      "CORE-04",
      "CORE-21",
      "CORE-22",
      "CORE-28",
      "CORE-29",
    ],
    destination: "문의 답변 · 상담 업무에서 확인",
  },
  {
    name: "학부모 소통·재등록",
    description: "최근 기록을 살펴보고 필요한 안내를 준비합니다.",
    codes: [
      "academy-reenroll",
      "CORE-11",
      "CORE-12",
      "CORE-13",
      "CORE-14",
      "CORE-19",
      "CORE-23",
      "CORE-25",
      "CORE-26",
      "CORE-27",
      "CORE-30",
    ],
    destination: "학부모 안내 초안 · 내부 확인",
  },
  {
    name: "홈페이지·홍보",
    description: "모집 소식과 채널별 안내를 준비합니다.",
    codes: [
      "academy-popup",
      "academy-sns",
      "academy-place",
      "academy-place-distribute",
      "academy-place-report",
      "academy-review",
      "CORE-05",
      "CORE-07",
      "CORE-08",
    ],
    destination: "홈페이지 게시 또는 외부 채널용 승인 문서",
  },
  {
    name: "학원 운영",
    description: "정산과 운영 기록을 검토할 문서로 만듭니다.",
    codes: ["CORE-09", "CORE-10", "CORE-15", "CORE-16", "CORE-18"],
    destination: "원장 전용 내부 문서",
  },
];
export const FEATURED_AGENTS = [
  {
    code: "academy-study-ledger",
    name: "학습 장부",
    when: "학생의 누적 기록을 살펴볼 때",
    action: "학습 기록 정리",
    result: "학생별 학습 장부 · 내부 보관",
  },
  {
    code: "academy-briefing",
    name: "학부모 리포트",
    when: "답안지 사진으로 학습을 설명할 때",
    action: "리포트 준비",
    result: "수업 요약 · 보호자 전용 공간",
  },
  {
    code: "academy-career",
    name: "진로 상담",
    when: "학생 상담을 준비할 때",
    action: "상담 자료 준비",
    result: "진로 상담 자료 · 보호자 전용 공간",
  },
  {
    code: "academy-place",
    name: "플레이스",
    when: "학원 소개 정보를 정리할 때",
    action: "학원 소개 준비",
    result: "플레이스용 문서 · 외부 게시 별도",
  },
  {
    code: "academy-popup",
    name: "팝업·소식",
    when: "특강과 신규 모집을 알릴 때",
    action: "모집 안내 준비",
    result: "홈페이지 안내 · 상담 신청 연결",
  },
];
export const teamFor = (code) =>
  AGENT_TEAMS.find((t) => t.codes.includes(code));
export function artifactFor(code) {
  if (["academy-inquiry", "CORE-01"].includes(code)) return "inquiry";
  if (code === "academy-popup") return "popup";
  if (["academy-sns", "CORE-08"].includes(code)) return "content";
  if (code === "academy-briefing") return "report";
  if (code === "academy-career") return "career";
  if (code === "academy-reenroll") return "reenroll";
  return "internal";
}
