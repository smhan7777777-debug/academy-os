# 세 OS 조사 범위와 로컬 근거

2026-09-25. [사업 제안 본문](ACADEMY-NETWORK-STRATEGY-2026-09-25.md)의 근거 기록이다.

## 범위

`academy-os`, `beauty-os`, `pet care-os`의 전체 디렉터리 구조를 열거하고, 최신 사업 방향과 실제 구현에 영향을 주는 문서·설정·핵심 코드를 선별해 읽었다. 의존성·빌드·캐시를 제외한 파일명 조사 시점의 개수는 각각 5,892 / 14,893 / 12,744개였다. **이는 읽은 파일 수가 아니다.** 이미지·폰트·영상과 복제 플랫폼이 큰 비중을 차지한다.

파일 열거에서는 `node_modules`, `.git`, `.next`, `dist`, `test-results`, `.vercel`, `.turbo`, `.venv`, `__pycache__`를 제외했다. `.env`, 키, 실제 DB 내용은 분석 자료로 읽지 않았다. 관련 없는 설교·예배 앱은 사업 분석 범위에서 제외했다.

## 현재 정본과 보관 사본 구분

| 경로 | 역할과 처리 |
|---|---|
| `academy-os/src`, `server`, `shared`, `public`, `tests` | 현재 학원 앱의 UI·저장·도메인·웹사이트·검증 기반. 이전 웹사이트 작업의 확인 결과와 이번 핵심 소스 검토를 함께 사용 |
| `academy-os/agent1000-academy-lab` | 원본 에이전트·플랫폼 사본. README와 구조를 확인. 원격 n8n 호출이나 전체 플랫폼 재실행은 하지 않음 |
| `beauty-os/apps`, `packages`, `backend`, `workflows`, `eval` | 현재 앱 구조. 업종 설정·고객 기록·권한·사이트 흐름과 사업 문서를 대조 |
| `beauty-os/Beauty OS`, `Beauty OS.zip` | 이전 12업종 랩·플랫폼·디자인 원본. README와 구조를 확인. 최신 앱 상태와 혼동하지 않음 |
| `beauty-os/os 만드는 요청파일 10개` | 초기 요청 자료. 최신 `docs/08`, `docs/09`, CLAUDE 수정 사항이 과거 가정을 보완함 |
| `pet care-os/pet-care/petcare-v2` | 현재 8업종 앱. 최신 MEMORY와 9월 25일 설계·사업문서, config·핵심 lib를 확인 |
| `pet care-os/pet-care/petcare-os` | 이전 3업종 Atelier 앱. 당시 검증·현장 기록 연구는 참고하되 현재 v2와 분리 |
| `pet care-os/agent1000-petcare-lab`, `academy(not_main)` | 보관·복제 소스. 파일 구조를 조사했으며 현재 학원 앱이나 현재 펫 v2로 간주하지 않음 |
| `agent1000 website108-2026-09-23/59-academy.zip` | 이전 웹사이트 구현에서 확인·가져온 11개 디자인. 업종 네트워크의 구현 근거가 아님 |

## 주요 문서 근거

### 학원

- `README.md`, `MEMORY.md`, `CLAUDE.md`, `DESIGN.md`, 감사·세션 인계 문서: 현재 기능, 무료 웹사이트와 직원 두 명의 제품 원칙, 과거 설계와 최신 상태의 차이.
- `SESSION_MEMORY_2026-09-25_WEBSITE.md`: 17종 디자인, `/start` 제작 흐름, 현재 로컬 작성기와 외부 AI 미연결의 구분.
- `server/store.js`: 실제 컬렉션, 학원 키, 승인·감사·수납 저장과 단일 데모 기본값.
- `server/domain.js`, `server/seed.js`, `shared/core.js`: 학생·보호자 동의, 검수·승인, 근거 변경, 기록·수납·시간표.
- `src/website-setup.js`, `src/website.js`, `shared/templates.js`, `server/website-pages.js`: 웹사이트 작업에서 확인한 현재 제작·표시 구조.
- `agent1000-academy-lab/README.md`: 원본 랩과 복제 플랫폼의 관계. README의 연동 완료 설명을 이번 조사에서 원격 검증한 것은 아님.

### 뷰티

- `README.md`, `CLAUDE.md`, `AGENTS.md`: 현재 앱과 과거 초기 지침의 차이.
- `docs/00_README.md`부터 `09_passport_access_and_retention.md`: 구독·영업·제품·직원·기술·파트너·파일럿·기록 해자·권한 설계. 최신 보충 문서를 우선.
- `docs/bitgyeol-overview.pdf`: 4쪽의 추출 텍스트 확인. 4쪽의 ‘미구현’ 일부가 최신 `docs/09`보다 오래된 설명임을 확인. PDF 디자인 전수 검수는 하지 않음.
- `packages/config/verticals/*.json`: 12개 설정 중 타투 `coming_soon`, 나머지 11개.
- 현재 사이트 제작·고객 기록 흐름의 소스 검토와 `docs/09`의 구현 경로·한계를 대조. 프로덕션 인증·결제·메시지 발송을 이번에 실험하지 않음.

### 동물

- `pet-care/AGENTS.md`, `README.md`, `MEMORY.md`: 옛 3업종과 최신 8업종 경로·버전 구분.
- `docs/PETCARE-V2-설계와-확장전략.md`, `docs/PETCARE-사업모델-아이수첩-네트워크-2026-09-25.md`: 8업종, 수첩·인수인계·생애주기, 확정된 최신 가격 가설, 남은 작업.
- `docs/Pet-Care-Network-통합사업모델-2026-09-15.md`, `docs/research-2026-09-15/ecosystem-economics-validation.md` 등 기존 연구: 기존 도구와 공존, 무료 수령, 실제 완료·지원 원가 측정. 과거 시장 자료를 최신 확인 없이 재인용하지 않음.
- `한국_반려견_8개서비스_AI에이전트_SaaS_사업계획서.pdf`: 5쪽 추출 텍스트 확인. 초기 유료 대상 집중, 업종 중복을 고려한 시장 계산, 가격·예산을 가설로 구분하는 원칙을 참고. PDF의 옛 가격을 현재 확정 가격으로 쓰지 않음.
- `petcare-v2/packages/config/verticals`: 8개 서비스와 별도 아이콘 파일 확인.
- `petcare-v2/apps/web/src/lib/pets.ts`, `careCard.ts`, `lifecycle.ts`: 아이·기록 출처·공유 설정·규칙 기반 후속 일정 구조. `source=store`나 코드 존재를 외부 검증·임상 적합성 증명으로 해석하지 않음.

## 해석상 교정한 주장

1. 기존 사업자는 과거 기록이 0에서 시작하지 않는다. 고객 동의 기반 이전도 가능하므로 ‘오래된 기록은 절대 따라올 수 없다’는 전제를 버렸다.
2. 서로 다른 업종의 추가 가입만으로 네트워크 효과가 생기지 않는다. 자료가 실제 업무에 사용되고 공급·수요가 맞아야 한다.
3. ‘학원·공급사·유통사는 파트너라 경쟁하지 않는다’고 가정하지 않았다. 협업과 경쟁 모두 가능하다.
4. 최신 자료에 구현됐다고 적힌 기능과 실제 상용 운용·효과 검증을 구분했다.
5. 기록 내보내기·동의 철회를 막아 만드는 이탈 장벽을 사업의 기반으로 삼지 않았다.
6. 같은 엔진을 쓰는 것과 다른 업종을 낮은 지원비로 운영하는 것은 별도 검증 대상이다.

## 이번 산출물·검증

신규 전략 문서와 이 조사 기록, `MEMORY.md` 인계만 변경한다. 앱 기능·가격·DB·다른 프로젝트는 변경하지 않는다. 문서의 UTF-8, 로컬 링크, 예시 산식, 공백 오류를 확인한다. 문서 작업이므로 앱 테스트를 새로 실행해 통과했다고 보고하지 않는다.
