# ACADEMY_MULTI_JOJAL — 설계 기록

- 업종: 학원 (59)
- 상호: 조잘 영어교습소 / Jojal English
- **레퍼런스(HOW): https://duck.school/en**
- 서체: 라틴 Oranienbaum · 한글 본문 Pretendard Variable · 한글 제목 -

## 색

- bg: `#F4F2EE`
- ink: `#161514`
- accent: `#E8367A`

레퍼런스 형광 라임 계열 → 우리 자홍(마젠타). 미색 바탕과 먹색은 레퍼런스의 절제를 따름

## 첫 화면

미색 바탕 큰 원호 + 가는 세리프 두 줄 가운데 제목 + 기울어진 알약 스티커 + 아래 가는 선 줄

## 시그니처

레퍼런스의 기울어진 교사 카드(거대한 머리글자 + 작은 사진)를 '레벨 카드'로 바꿈 — 머리글자는 교사 이름이 아니라 반 이름(P·R·W·S·L), 사진은 오른쪽 위 작은 정사각 → 카드 아래 반폭, 흰/자홍 번갈아 기울기

## 구획 대응 (레퍼런스 → 우리)

| 레퍼런스 | 우리 |
|---|---|
| 히어로 | Speak it out loud. |
| 마스코트 | 아치 사진 |
| goal 문장 | Five levels one voice + 사다리 |
| 교사 카드 | Meet the classes 레벨 카드 |
| 원호 문장 | A week at Jojal 시간표 |
| 블로그 | From the notebook |
| 끝 권유 | Come hear them read. |

## 페이지

- `index.html` 홈 — 반 구성과 한 주 흐름을 한 번에
- `classes.html` 반 · 시간표 · 수강료 — 반 선택과 비용 확인
- `test.html` 레벨테스트 · 오시는 길 — 첫 방문 결정
- `notes.html` 수업 노트 — 수업 모습 보기

## 재구성 (2026-09-19~20)

헤더·첫 화면은 레퍼런스 그대로 두고, 그 아래 구획과 하위 페이지 본문의 짜임을 레퍼런스와 다르게 재구성했다.
`css/style.css` 끝의 `/* == rework ... */` 블록이 그 재구성이다(지우면 레퍼런스 1:1 판으로 되돌아간다).
