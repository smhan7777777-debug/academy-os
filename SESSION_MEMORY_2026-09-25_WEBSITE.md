# 2026-09-25 · Beauty OS 방식의 학원 웹사이트 제작

## 요청과 구현

사용자는 beauty-os를 참고해 academy-os의 웹사이트 제작 방법을 맞추라고 요청했다. Beauty OS의 WebsiteStudio와 서버 렌더링·맞춤 제작 흐름을 읽고 학원 앱의 기존 Node/SQLite 구조에 적용했다. Beauty OS 파일과 DB는 수정하지 않았다.

- 제작 스튜디오: 현재 사이트 미리보기, PC·모바일 전환, 디자인·영상 선택, 영상 추천/날짜별 교체, 학원 정보 확인, 적용과 주소 복사.
- 제작 경로 둘: 프리미엄 템플릿 / 링크·텍스트 자료를 통한 맞춤 제작. 초안은 서버에 저장하며 원장이 수정 후 명시적으로 적용한다. 보류도 이력으로 보존한다.
- 기존 6개 ID 유지 + 최신 학원 라이브러리 11개 ID 추가. 신규 페이지 `/site`, `/site/about`, `/site/classes`, `/site/content`, `/site/contact`. 실제 문의는 기존 공개 API, 상담 시간 선택은 기존 예약 화면으로 연결.
- 원본 사진·글꼴과 디자인 방향을 학원 데이터용 레이아웃으로 적용. 원본의 가짜 개강일·가격·지점·수업 목록은 공개하지 않는다. 원본 HTML의 전체 레이아웃을 그대로 서비스하는 Beauty OS와는 이 부분이 다르며, 원본 모든 섹션의 정확한 시각적 이식은 후속 범위다.

## 주요 파일

`src/website-setup.js`, `src/website.js`, `src/styles.css`, `src/template-hero.js`, `shared/templates.js`, `server/domain.js`, `server/store.js`, `server/seed.js`, `server/index.js`, `server/website-source.js`, `server/website-pages.js`, `public/site-library.{css,js}`, `public/templates/`, `scripts/import-academy-library.ps1`, `tests/website*.{js,mjs}`.

## 보존과 권한

SQLite의 `websiteRequests` 테이블을 기존 컬렉션 체계로 추가한다. 삭제·초기화는 하지 않는다. 학원 소개 적용은 원장 역할, 전체 상태 revision, 초안의 websiteRevision을 검사한다. 공개 응답에는 출처 자료/제작 이력을 포함하지 않는다. 기존 학생·예약·수납과 승인 전 콘텐츠를 보존한다.

출처 가져오기는 서버에서 공개 HTTPS IPv4 주소만 허용하며 DNS 확인 주소를 실제 TLS 연결에 고정한다. 12초/1MB/리다이렉트 횟수 제한. 자동 접근 차단 페이지, JavaScript 렌더링 페이지는 자료 붙여넣기를 안내한다. 외부 AI 키를 읽거나 호출하지 않았다.

## 현재 한계

- 맞춤 초안은 입력 자료의 로컬 정리이며 외부 LLM 생성이 아니다. TXT/MD/CSV 지원, 사진·PDF 분석 미지원.
- 디자인 적용은 현재 로컬 학원의 사이트에 반영. 외부 도메인 배포·새로운 다학원 가입·Agent1000 운영 연결은 이번 변경에 포함하지 않음.
- 기존 6종은 기존 단일 페이지를 유지하며, 새 11종은 데이터에 연결된 5개 페이지를 제공.
- 기존 미커밋·미추적 작업을 모두 유지. 커밋·푸시·배포하지 않음.

## 검증

- `npm.cmd test`: 45개 통과. 제작 초안 비공개/원장 권한/수정 적용/보류/오래된 버전 차단/영상 회전/공개 소스 주소 제한을 추가 검증.
- `npm.cmd run test:browser`: 기존 업무 브라우저 15개 통과.
- `npm.cmd run test:website`: 개발 모드와 빌드 모드 모두 통과. 기존 6종 영상 재생, 신규 11종 페이지 이동/실제 수업/미리보기 접수 차단, 320·390·768·1440px, 저장→재조회, 파일→초안→수정→적용, 문의→원장실 확인 경로, 승인 콘텐츠 반영, 무료 직원 2명, MP4 range 응답 확인.
- PC·모바일 웹사이트와 제작 스튜디오 스크린샷 육안 확인.
- 공개 HTTPS 소스 가져오기 실제 호출(example.com) 성공. 차단 주소 UI 안내 확인.
- 형식 검사, 빌드, `git diff --check` 통과. 첫 개발 E2E 중 파일 편집과 겹쳐 선택값 검증이 실패했으며 HMR과 입력 경합을 의심했다. 파일 편집 없이 전체를 다시 실행해 개발·빌드 모드 모두 성공 확인.
- 기본 DB 백업: `%LOCALAPPDATA%/AcademyOS/data/backups/academy-2026-09-25T05-04-08-348Z.sqlite`, 무결성 통과. 회귀 검사는 모두 임시 격리 DB 사용.

## 이번 세션 실행 주소

- 최신 서버: **http://localhost:5174/start** (원장실 http://localhost:5174). PID 19224, Node `server/index.js --dev`, `PORT=5174`. 로그 `studio-5174.stdout.log`, `studio-5174.stderr.log` (AcademyOS 로컬 데이터 상위 폴더).
- 기존 5173 서버(PID 34164)의 종료 명령이 실행 정책에 차단되어 해당 프로세스를 유지하고 5174에서 새 서버를 실행했다. 두 서버는 같은 앱 DB를 사용한다. 이번 작업은 **5174 주소**에서 이어갈 것. 다음 세션에 과거 PID를 바로 종료하지 말고 포트 소유자를 재확인.
- 5174 `/api/health` 정상, 신규 라이브러리 미리보기 HTTP 200 및 페이지 렌더링 확인. 기존 선택값을 테스트용 디자인으로 바꾸지 않았다.
- 브라우저 열기/실DB 비교를 묶은 추가 명령도 정책에서 차단되어 실행되지 않았다. 브라우저 자동 열기는 완료로 주장하지 않으며 사용자는 위 링크로 접속할 수 있다. 검증은 통과한 격리 브라우저 검사와 실제 서버의 읽기 전용 HTTP 확인을 근거로 한다.
