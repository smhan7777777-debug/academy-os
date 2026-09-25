// Stable IDs from Agent1000's academy catalog. Never substitute palette IDs.
export const LEGACY_TEMPLATES = [
  [
    "DEUNGYONG",
    "등용",
    "선명한 시작",
    "넓은 여백, 강한 타이포그래피와 시네마틱 영상",
    "#d70015",
    "v2",
  ],
  [
    "GAGYO",
    "가교",
    "가능성을 잇는 곳",
    "입체적인 카드와 활기 있는 블루 컬러",
    "#2356d8",
    "v1",
  ],
  [
    "GWANMUN",
    "관문",
    "다음 단계의 시작",
    "정보가 잘 읽히는 에디토리얼 구성",
    "#215347",
    "v2",
  ],
  [
    "HANBYEOL",
    "한별",
    "더 넓은 배움",
    "풀스크린 영상과 절제된 골드 포인트",
    "#a98448",
    "v1",
  ],
  [
    "ITDA",
    "잇다",
    "배움이 실력이 되도록",
    "다크 테마, 선명한 라임과 실용적인 구성",
    "#b6ef67",
    "v1",
  ],
  [
    "JEONGJIN",
    "정진",
    "매일의 성장을 기록하다",
    "종이의 질감과 차분한 편집 디자인",
    "#9b3838",
    "v2",
  ],
].map(([key, name, title, description, accent, video], index) => ({
  id: `EDU_ACADEMY_MULTI_${key}`,
  key: key.toLowerCase(),
  name,
  title,
  description,
  accent,
  video,
  number: String(index + 1).padStart(2, "0"),
}));
export const LIBRARY_TEMPLATES = [
  [
    "JOJAL",
    "조잘",
    "밝은 여백과 경쾌한 타이포그래피",
    "#9b3f28",
    "board.jpg",
    "editorial",
  ],
  [
    "SEMTEUL",
    "셈틀",
    "짙은 바탕과 에메랄드 포인트",
    "#087964",
    "desk.jpg",
    "dark",
  ],
  [
    "CHAEKGORI",
    "책고리",
    "책의 질감을 담은 차분한 클래식",
    "#753746",
    "c1.jpg",
    "classic",
  ],
  [
    "GUNGRI",
    "궁리",
    "넓은 사진과 부드러운 색면",
    "#5b4bb0",
    "hero.jpg",
    "cinema",
  ],
  [
    "YEOEUM",
    "여음",
    "둥근 카드와 코발트 포인트",
    "#4a6cff",
    "stage.jpg",
    "dark",
  ],
  [
    "MONUN",
    "모눈",
    "정돈된 그리드와 작업실의 감각",
    "#365d52",
    "build.jpg",
    "editorial",
  ],
  [
    "PILSEON",
    "필선",
    "포스터처럼 선명한 수업 안내",
    "#b8322a",
    "desk.jpg",
    "poster",
  ],
  [
    "GAROJUL",
    "가로줄",
    "올리브 컬러와 명확한 정보 구성",
    "#6b7a1c",
    "write.jpg",
    "split",
  ],
  [
    "YOMOJOMO",
    "요모조모",
    "자두색 포인트와 부드러운 곡선",
    "#7b2f63",
    "puzzle.jpg",
    "split",
  ],
  [
    "DEUNGBUL",
    "등불",
    "남색과 밝은 포인트의 균형",
    "#2b3f86",
    "night.jpg",
    "poster",
  ],
  [
    "TEUMSAE",
    "틈새",
    "청록색으로 정리한 학원 소식",
    "#0a7e8c",
    "board.jpg",
    "editorial",
  ],
].map(([key, name, description, accent, image, layout], i) => ({
  id: `ACADEMY_MULTI_${key}`,
  key: key.toLowerCase(),
  name,
  title: name,
  description,
  accent,
  video: i % 2 ? "v2" : "v1",
  number: String(i + 7).padStart(2, "0"),
  library: true,
  layout,
  image: `/templates/ACADEMY_MULTI_${key}/img/${image}`,
}));
export const TEMPLATES = [...LEGACY_TEMPLATES, ...LIBRARY_TEMPLATES];
export const templateById = (id) => TEMPLATES.find((t) => t.id === id);
export const siteDesign = (settings = {}, date = new Date()) => {
  const template =
    templateById(settings.websiteDesign?.templateId) || TEMPLATES[0];
  const video = ["v1", "v2"].includes(settings.websiteDesign?.video)
    ? settings.websiteDesign.video
    : template.video;
  const rotate = settings.websiteDesign?.rotate === true;
  const displayedVideo = rotate
    ? ["v1", "v2"][Math.floor(date.getTime() / 86400000) % 2]
    : video;
  return { templateId: template.id, video, displayedVideo, rotate, template };
};
export const FREE_STAFF = [
  {
    id: "booking",
    code: "CORE-01",
    name: "예약·문의 직원",
    description: "상담 시간 안내, 예약 접수와 문의 답변을 함께 맡습니다.",
    href: "/#website",
  },
  {
    id: "content",
    code: "CORE-08",
    name: "콘텐츠 생성 직원",
    description:
      "학원 자료로 초안을 준비하고, 확인한 소식을 웹사이트에 게시합니다.",
    href: "/#content",
  },
];
