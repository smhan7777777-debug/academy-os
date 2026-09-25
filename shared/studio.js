export const STUDIO_KINDS = {
  experience: "수업 체험",
  guide: "상담 안내서",
  lesson: "수업 설명 카드",
};
export const EXPERIENCE_SAMPLES = {
  math: {
    label: "수학 · 생각의 순서",
    title: "기울기를 그림처럼 생각해 볼까요?",
    intro: "식을 외우기 전에, 두 값이 어떻게 함께 변하는지 살펴봅니다.",
    question: "y = 2x + 1에서 x가 1만큼 커지면 y는 얼마나 커질까요?",
    choices: ["1만큼", "2만큼", "3만큼"],
    answer: 1,
    hint: "x에 0과 1을 각각 넣어 보세요. 두 y값의 차이는 얼마인가요?",
    explanation:
      "x가 0일 때 y는 1, x가 1일 때 y는 3입니다. y는 2만큼 커집니다. 숫자를 넣어 변화부터 확인하는 방법을 함께 연습합니다.",
  },
  english: {
    label: "영어 · 문장 속 단서",
    title: "문장 안에서 시간의 단서를 찾아요",
    intro: "단서를 찾고, 선택의 이유를 말해 보는 짧은 수업입니다.",
    question: "She ___ to school yesterday. 빈칸에 알맞은 말은?",
    choices: ["go", "went", "goes"],
    answer: 1,
    hint: "yesterday는 언제일까요? 이미 지나간 일을 표현하는 동사를 찾아보세요.",
    explanation:
      "yesterday는 어제입니다. go의 과거형 went를 써서 She went to school yesterday.라고 합니다. 답과 함께 선택한 이유도 말해 보세요.",
  },
  reading: {
    label: "독서 · 근거 찾기",
    title: "한 문장에도 생각의 근거가 있어요",
    intro: "짧은 글에서 실제로 알 수 있는 것부터 찾습니다.",
    question:
      "‘민지는 비가 그친 뒤 우산을 접었다.’ 이 문장에서 확인할 수 있는 것은?",
    choices: [
      "민지는 비 오는 날을 싫어한다",
      "비가 그친 뒤 우산을 접었다",
      "민지는 학교에 가고 있다",
    ],
    answer: 1,
    hint: "글에 적힌 사실과 내가 상상한 내용을 나눠 보세요.",
    explanation:
      "글에서 확인할 수 있는 사실은 비가 그친 뒤 우산을 접었다는 것입니다. 기분이나 목적지는 쓰여 있지 않습니다. 읽기에서는 사실과 추측을 구분하는 연습을 합니다.",
  },
  art: {
    label: "미술 · 관찰하는 눈",
    title: "빛이 오는 방향을 찾아요",
    intro: "표현하기 전에 무엇을 관찰할지 질문하는 수업입니다.",
    question:
      "공의 왼쪽 위에서 빛을 비춘다면, 가장 밝게 보일 부분은 어디일까요?",
    choices: ["왼쪽 위", "오른쪽 아래", "어느 곳이나 동일"],
    answer: 0,
    hint: "빛을 먼저 만나는 면을 상상해 보세요.",
    explanation:
      "이 예시에서는 빛을 직접 받는 왼쪽 위가 밝게 보입니다. 실제 관찰에서는 빛과 재질도 함께 살펴보며 표현합니다.",
  },
  music: {
    label: "음악 · 리듬 읽기",
    title: "리듬을 작은 단위로 나눠요",
    intro: "간단한 리듬 개념을 확인하고 선생님의 설명을 만나 보세요.",
    question: "4분음표를 한 박으로 셀 때, 2분음표는 몇 박일까요?",
    choices: ["한 박", "두 박", "네 박"],
    answer: 1,
    hint: "2분음표 하나의 길이는 4분음표 두 개의 길이와 같습니다.",
    explanation:
      "2분음표는 두 박입니다. 같은 속도로 두 번 세면서 소리를 이어가는 연습을 할 수 있습니다. 실제 연주는 담당 선생님과 확인합니다.",
  },
  coding: {
    label: "코딩 · 실행 순서",
    title: "컴퓨터의 순서로 생각해요",
    intro: "한 줄씩 따라가며 결과를 예상해 봅니다.",
    question: "x = 2 다음에 x = x + 3을 실행하면 x의 값은?",
    choices: ["2", "3", "5"],
    answer: 2,
    hint: "두 번째 줄의 오른쪽에는 이전 x값 2를 넣어 보세요.",
    explanation:
      "이전 x값 2에 3을 더한 5가 새 x값이 됩니다. 프로그램의 실행 순서를 따라가며 값을 확인하는 연습입니다.",
  },
};

export function emptyStudioData(kind) {
  if (kind === "experience")
    return {
      title: "",
      intro: "",
      question: "",
      choices: ["", "", ""],
      answer: 0,
      hint: "",
      explanation: "",
    };
  if (kind === "guide")
    return {
      title: "상담에서 함께 확인한 수업",
      audience: "보호자님",
      goal: "",
      plan: "",
      preparation: "",
      questions: "",
    };
  return {
    title: "수업 이야기",
    activity: "",
    why: "",
    next: "",
    teacherNotes: "",
  };
}
