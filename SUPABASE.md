# SUPABASE.md — 이 앱의 데이터베이스 (정본, 2026-09-20)

> 연결 확인 2026-09-20 ✔ (ref 일치, ACTIVE_HEALTHY) / GitHub push 확인 ✔ (gh 2.98, smhan7777777-debug, origin academy-os)

**이 폴더에서 일하는 모든 Claude Code·Codex 세션은 DB 작업 전에 이 파일을 읽는다.**
루트 `DATABASE.md`가 5개 앱 전체 지도이고, 이 파일은 그중 **이 앱 한 줄**을 못 박은 것이다.

## 1. 이 앱의 프로젝트 (이것만 쓴다)

| 항목 | 값 |
|---|---|
| Supabase 조직 | 오너의 새 조직(Pro) — https://supabase.com/dashboard/org/qvqvhfivuwpzjixsmfwh |
| 프로젝트 이름 | **`academy-os`** |
| 프로젝트 ref | **`vavjvotymylcaapjywdr`** |
| URL | `https://vavjvotymylcaapjywdr.supabase.co` |
| 리전 / 플랜 | ap-northeast-2 (Seoul) / Micro |
| 키가 있는 파일 | `academy-os/.env` (템플릿 `.env.example`) |
| 환경변수 이름 | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| 현재 상태 | 빈 프로젝트, 키는 `.env`에 있음. 앱은 아직 SQLite(`server/store.js`). 다음 일: `backend/sql/001_init.sql` 작성 → 적용 → 저장층 교체. |

키 값은 `.env`(gitignore)에만 둔다. 문서·채팅·커밋·메모리에 키를 복사하지 않는다.
`service_role` 키는 서버 코드 전용이며 브라우저나 `VITE_*`로 내보내지 않는다.

## 2. CLI/API 도구는 이미 설치되어 있다 — 직접 만들고 고친다

루트 `tools/supa.mjs`(Supabase Management API)와 토큰(루트 `.supabase.env`, 모든 git 저장소 바깥)이 준비되어 있다.
대시보드를 열 필요 없이 **이 폴더에서** 아래 명령으로 테이블 생성·수정·SQL 실행·키 조회를 한다.

```bash
node ../tools/supa.mjs projects                                 # 프로젝트 목록·상태
node ../tools/supa.mjs keys vavjvotymylcaapjywdr            # URL + anon + service_role
node ../tools/supa.mjs dumpschema vavjvotymylcaapjywdr      # public 테이블·컬럼
node ../tools/supa.mjs sqlfile vavjvotymylcaapjywdr backend/sql/001_init.sql   # 마이그레이션 적용
node ../tools/supa.mjs sql vavjvotymylcaapjywdr "select now()"                 # 임의 SQL (postgres 권한)
```

- 테이블·컬럼·인덱스·RLS·함수·버킷 **생성과 수정은 허락 없이 진행**한다. 단 스키마 변경은 반드시 이 앱 폴더의 `backend/sql/NNN_*.sql` 번호 파일로 남기고 `sqlfile`로 적용한다(파일이 정본, 대시보드 손편집 금지).
- 토큰 파일 `.supabase.env`는 읽기만 한다. 복사·이동·커밋 금지.

## 3. 금지 — 어기면 멈추고 보고한다

1. **삭제 금지.** `drop table`, `drop column`, `truncate`, 테이블 이름 변경, 데이터 대량 `delete`, 버킷·프로젝트 삭제는 **오너 허락 없이 절대 실행하지 않는다.** 필요하면 어떤 테이블을 왜 지워야 하는지 먼저 물어본다.
2. **다른 앱 프로젝트 금지.** 아래 표의 다른 줄 ref·키·테이블은 읽지도 쓰지도 않는다. `.env`에 다른 ref가 보이면 오류다 — 고치지 말고 보고한다.
3. **옛 프로젝트 금지.** `oylyygcevwvmszektymi`(옛 설교) · `ggwwsumfpvmgiybpigwc`(옛 찬양)는 폐기됨. 어디에도 다시 넣지 않는다.
4. 프로젝트를 새로 만들지 않는다(앱마다 하나로 이미 다 있음).

## 4. 전체 대응표 (참고용 — 자기 줄만 사용)

| 앱 폴더 | Supabase 프로젝트 | ref |
|---|---|---|
| `sermon-agent/` | `sermon-agent` | `rkitijlqcfmpljeumsbu` |
| `worship-agent/` | `worship-agent` | `jowvwpzukinplhqsfcqc` |
| `academy-os/` | `academy-os` | `vavjvotymylcaapjywdr` |
| `pet care-os/pet-care/` | `petcare-os` | `uwmzbagffimdveewlosc` |
| `beauty-os/` | `beauty-os` | `ilzbjumhlqkwwycihliv` |

## 5. 이 앱의 테이블 소유 목록 (작업하며 갱신)

- (스키마를 적용할 때마다 여기에 테이블 이름과 SQL 파일 번호를 적는다.)
