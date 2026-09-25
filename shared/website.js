// The free academy website is the acquisition channel; the OS is its office.
export const WEBSITE_DEFAULTS = {
  headline: "아이의 배움을, 함께 들여다봅니다.",
  intro:
    "확인한 수업 기록으로 학부모와 소통하고, 한 명 한 명의 배움에 필요한 다음 걸음을 준비합니다.",
  about:
    "학생의 현재 배움을 살피고, 담당 선생님과 보호자가 함께 다음 수업을 준비합니다. 수업과 상담에서 확인한 기록을 바탕으로 소통합니다.",
  admission:
    "아래에서 관심 있는 반과 상담 시간을 선택해 주세요. 담당 선생님과 학습 목표를 상담한 뒤 수강 과정과 등록 절차를 안내합니다.",
};
export const WEBSITE_SECTIONS = [
  ["home", "홈"],
  ["about", "학원 소개"],
  ["admission", "수강 안내"],
  ["exam", "레벨 확인"],
  ["content", "배움 이야기"],
  ["booking", "상담 신청"],
  ["reviews", "학부모 후기"],
  ["contact", "오시는 길"],
];
export const websiteProfile = (settings) => ({
  ...WEBSITE_DEFAULTS,
  ...settings.websiteProfile,
});
