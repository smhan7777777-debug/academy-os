# 원장실 Academy OS — 작업 정본 (2026-09-15 기준)

이 파일이 학원 OS 작업의 정본이다. 설계 결정과 변경 이력은 `DESIGN.md`, 실행법은 `README.md`.

## 무엇인가
- agent1000.kr 플랫폼과 연동해 사업하는 학원 운영체제. 플랫폼이 무료로 주는 프리미엄 웹사이트의 **뒷면 사무실**이다.
- 원칙 한 줄: **AI 직원이 서류를 준비하고 원장은 확인(결재)·고치기·보류만 한다. 웹사이트는 결재함의 입구이고, 결재된 것만 밖으로 나간다.**
- Vite 바닐라 앱: `index.html`(셸) + `src/styles.css`(토큰·스타일) + `src/app.js`(엔진+화면, 단일 파일). 외부 AI·발송·결제·플랫폼 API는 아직 미연결(모의). 상태는 localStorage `wonjangsil-v3`.

## 실행·배포
- `START.cmd` 더블클릭 또는 `npm run dev` → http://localhost:5173. 빌드 `npm run build`.
- GitHub `smhan7777777-debug/academy-os` main → Vercel 자동 배포(URL은 아직 사용자에게 못 받음).
- 브라우저 확인은 Playwright MCP로 localStorage.clear() 후 DOM 검사, 스크린샷은 확인 뒤 삭제.

## 현재 상태(커밋 순)
- 67a60bb 2차 리뷰 4건: 학생·수납 우선순위/필터, 오답 작업→강사 화면 탭, 브리핑 줄 나눔.
- 5074f39 웹사이트 연동: 웹사이트·예약 담당, 모의 사이트, 상담 신청·문의·후기→서류, 결재→공개(`afterApprove`).
- 0581d99 플랫폼 장점 이식: 바로 쓰기 카드 4장, 오늘 노동·절감 추정, 광고비 0원 KPI, 트리거 3종, 월요 브리핑, 무료 AI 레벨 테스트, 지식 슬롯 9칸, 콘텐츠 담당 5면 초안, 플레이스 꾸러미, 공유 도구 4종, 재등록 담당, 학부모 페이지 확장, 경영지원, AI 매니저 채팅, 직원 요금제 표시. 직원 18명.
- 5c3f218 프리미엄 UI: Pet Care OS 결(숲색 사이드바·크림 활성 탭·금색 눈썹·세이지 히어로·Pretendard+Nanum Myeongjo).

## 코드 지도(app.js)
- 데이터: `STAFF`, `seed()`, `seedSite()`, `KSLOT`(지식 슬롯), `LEVEL_Q`, `MATERIALS`, `BIZ_*`.
- 엔진: `addDoc/approve/hold/editDoc/guard/invalidate`, `afterApprove`(결재→웹 반영), `careScore/attention`, `consultSlots`, `webBook/webAsk/webReview`, `prepareContent/preparePlace/prepareReenroll/parentBook/parentSurvey/prepareBizDoc`, `laborToday/triggers/mondayBrief/managerAnswer`, `morningPrep`.
- 화면: `NAV` → `vToday vStudents vLesson vTimetable vWrong(원장 요약)/vWrongGrid(강사) vBilling vWebsite vContent vBiz vStaff vRules vGuide`, 역할별 `vTeacher vParent vStudent`, `openDoc/openStudent`, 모든 클릭은 `bind()`.

## 지켜야 할 규칙
- 이모지 금지, "발송했다/게시했다" 완료형 금지(초안·모의 전송만), 성적·합격 실적 표현 금지(초안 자체를 만들지 않음), "확정"은 원장이 결재한 뒤에만(웹은 "요청이 접수됐어요"), 확률·이유 추측 금지(신호 점수만), 미성년자 기록에 공유 버튼 없음, 환불은 계산표로만.
- 새 목록 화면은 "확인 필요 먼저 + 학년·반 필터" 패턴, 운영 작업 화면은 담당 역할 화면에 두고 원장에게는 요약만.
- UI 손질은 DESIGN.md "프리미엄 UI" 토큰(`--forest --cream --gold --sage`)을 유지한다.

## 다음 작업 후보(우선순위)
1. 학생 페이지 9종(틀린 문제 체크·AI에게 물어보기·시험 대비 스케줄러·멘탈 케어 연결).
2. 손님 광장 피드·동네 랭킹(dong 기준, 측정 전이면 "집계 안 됨").
3. 승인 스냅샷(본문·수신자 해시)과 7단계 전송 상태기계.
4. 스탬프·소개 쿠폰(양쪽 쿠폰), 학부모 초대 흐름.
5. 실제 플랫폼 연결: `POST /api/booking/request`, `/api/booking/slots`, academy-review/popup/inquiry/place-report(대응표는 DESIGN.md).
