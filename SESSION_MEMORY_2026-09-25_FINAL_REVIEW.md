# 2026-09-25 · Academy OS 최종 검토 인계

사용자가 Astra 선택을 알리고, Pet OS 사업모델·디자인을 참고해 전문가를 동원한 전반적인 최종 검토를 요청했다. 사업/상품, 디자인/사용성, 서버/데이터를 독립 검토하고 Root가 상담 연결·재시도·설정·전체 검증을 통합했다. 실제 전문가에게 외부 연락한 것은 아니며 에이전트별 검토를 수행했다.

## 최종 실행

- http://localhost:5177/studio · http://localhost:5177/start · http://localhost:5177/site
- PID 32392, release `single-academy-reviewed-v3`. 다음 작업 전에 health와 포트 재확인.
- `START.ps1`은 같은 release 또는 빈 포트를 찾는다. 기존5173~5176은 이전 서버로 보존했으며 자동 종료하지 않았다. 로그 `%LOCALAPPDATA%\AcademyOS\server-5177.*.log`.
- 실제 DB는 기존 Academy OS SQLite를 보존했다. 검토 전 `npm run backup`으로 `academy-2026-09-25T08-43-00-064Z.sqlite` 생성·무결성 확인. 학생·예약·콘텐츠 초기화 없음. 테스트는 임시DB만 사용.
- Pet OS는 `../pet care-os/pet-care/`의 AGENTS/MEMORY, 최신 v2 사업 문서와 랜딩·업종투어 소스만 참고. 다른 앱 환경변수·키·DB·배포는 변경하지 않음.

## 사업 판단

최종 보고서 `FINAL_REVIEW_2026-09-25.md`, 근거 보고서 `docs/ACADEMY-FINAL-BUSINESS-REVIEW-2026-09-25.md` 참조. 무료 홈페이지·직원 숫자·데이터 축적만으로 독점 해자가 생기지 않는다. 학원별 검토 기준과 승인 자료가 다음 안내 준비에 실제로 도움이 되는 재사용 구조를 우선했다. 요금 변경이나 기존 무료 업무 잠금 없음. Pet의 8업종 네트워크·예시 가격표·기록을 떠나지 못한다는 주장을 Academy로 복제하지 않음.

## 수정 파일과 동작

- `src/studio.js/css`: 접힌 예시를 첫 행동으로 노출, 작성/검토 이동, 자료함 검색, 원본 유지 새 초안, 안내서 복제 개인정보 초기화, 상담query검증, 처리 중 입력 잠금, 409 최신상태/입력 보존+새초안, 정답 미리보기/선택 유지/초점 개선. 모바일 입력 글꼴16px, rows2/3/4 최소높이90/112/136px.
- `src/portal.js`: 유효한 query classId 선택, 상담시간 조회 순서 검증·실패 재조회, 반 변경 중 신청 비활성화, 입력 보존. 신청 저장 후 상태 조회 실패에도 같은 명령 ID를 유지해 중복 신청 방지. 폼 처리 중 입력 잠금.
- `src/views.js`: 상담 카드에 해당 수업/상담 안내서 준비 연결. 설정의 전체AI미연결 단정을 실제 스튜디오 상태 확인 링크로 대체.
- `shared/studio.js`: 실제 수업일 없이 기본제목이 ‘오늘’이라고 단정하지 않도록 수정.
- `server/index.js`: 요청 바이트를 합친 뒤 UTF-8 디코딩, JSON객체 검사, 개발경로 허용목록, 정확한 Vite env helper 허용. CSS는 `postcss:{plugins:[]}`, `optimizeDeps.entries:['index.html']`로 불필요한 외부 설정/보관된 HTML 탐색 제한.
- `server/store.js`: 조회를 읽기 트랜잭션으로 처리해 여러 서버에서도 단일 revision스냅샷 유지. 명령 payload객체 검사.
- `server/studio.js`: 체험상담 URL에 검증된 classId유지. 체험비밀토큰을URL에 넣지 않음.
- `server/paths.js`: 데이터 경로 결정 전에 .env를 읽어 서버와 백업이 동일 설정을 사용. 명시적 프로세스 환경변수가 우선.
- `START.ps1`: reviewed-v3 확인. 기존프로세스 종료 없이 새주소 사용.
- 신규검증 `tests/final-security.test.js`, `tests/paths.test.js`, `tests/final-flow.e2e.mjs`, `tests/final-design.e2e.mjs`; 기존스튜디오E2E의 변경라벨/상담URL기대수정. `package.json`에 final-flow/final-design 실행명령 추가.

## 검증

- 최종 `npm test`: **64/64 통과**. 권한·결재·수납·공개범위·원본변경·만료철회·공유메모제외·동시읽기/쓰기·재시작·백업·한글청크·잘못된요청·개발경로·CSS/helper·환경설정 포함.
- 수정한 개발 설정으로 `npm run test:final-flow`도 전체 통과했다. 실제 5177 서버에서 스튜디오 편집기, 웹사이트 디자인 17개, 브라우저 오류0건 확인. 실제 실행의 AI `configured:false`, release `single-academy-reviewed-v3` 확인. 실제 데이터는 검사 과정에서 변경하지 않았다(로컬 로그인 세션 생성 제외).
- `ACADEMY_E2E_BUILT=1 npm run test:browser`: 기존15개 통과.
- 같은 빌드모드 `test:website`: 17개 디자인 ×4화면폭, 영상, 선택/맞춤제작, 게시/문의, 하위페이지·모션줄이기·범위요청 통과.
- 같은 빌드모드 `test:studio`: 작성→승인→체험→상담, 공유/철회/내부메모제외/역할·CSRF/응답유실 재시도 통과.
- 같은 빌드모드 `test:final-flow`: 체험 반 유지, 반을 빠르게 변경했을 때 이전 시간 응답 제외, 이름/전화보존, 저장된 신청의 후속조회실패·재시도 중복방지, 상담→안내서 연결 통과.
- 같은 빌드모드 `test:final-design`: 첫행동, 처리중잠금, 원본승인유지 복제/검색, 4화면폭, 모바일초점, 409충돌입력보존/새초안, 상담query, 가정별복제초기화, 공개선택답/정답 통과.
- 마지막 CSS 소규모 수정 후 재빌드하고 임시DB 브라우저에서 모바일 입력 높이90px·글꼴16px·가로넘침없음을 확인했다. `test-results/final-compact-mobile.png`를 직접 열어 확인. 이 CSS 변경 때문에 이미 통과한 모든 업무 테스트를 반복하지는 않았다.
- 스튜디오PC·공개체험모바일·안내서모바일·최종디자인 캡처를 실제 열어 확인했다. 모든 시각/브라우저 검증은 Edge Chromium 기반이며 모든 실제 기기·브라우저를 검증했다는 뜻은 아님.
- `npm run build` 통과. `npm run format:check` 통과. `git diff --check` 공백오류없음(기존줄바꿈변환경고만). dependency audit0건.

검토 도중 확인한 실패도 남긴다. 초기 dev 허용목록이 Vite env helper를 막아 화면이 부팅되지 않아 해당 경로 하나만 허용했다. 이후 CSS가 설정 자동탐색 중 오래 대기하는 현상을 직접 재현해 명시적 빈PostCSS설정으로 해결했다. CSS HTTP회귀와 새 임시DB 실제 스튜디오부트(JS/HTTP오류0)를 확인했다. 병렬 테스트의 UTF-8검사 이후 GET은 idle연결재사용으로 ECONNRESET이 발생하여 그 확인 요청만 새 소켓으로 고립시켰고, 최종64개 전체가 통과했다. 개발 첫 컴파일은 빌드 모드보다 느릴 수 있어 브라우저 이동은 기본30초 한도를 사용한다.

## 완료로 간주하지 않은 항목

원장 스튜디오와 강사 수업기록의 자동연계, 실제 수업일필드, 실사용자 가입/보호자 본인인증, 상용다학원서비스, 실제AI응답품질, 실제문자/결제, 장기보관/집계정책, 매출/시간절감/지불의사 검증은 별도다. 현행 원본변경감지는 자유문장안의 모든 가격·일정 모순을 검사하지 않는다. 이미 본 문서/인쇄본은 철회로 회수하지 못한다. 현재AI키미설정 상태를 실제AI가운영중이라고 표현하지 않는다.

새상용가격확정, 타앱수정, 실발송·외부게시, 커밋·푸시·배포는 수행하지 않았다. 기존미커밋변경을모두보존했다.
