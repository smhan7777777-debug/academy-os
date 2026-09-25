# 외부 공유용 배움결 Academy OS 사업모델 소개서

- **보낼 파일:** [Academy-OS-Business-Brief-2026-09.pdf](Academy-OS-Business-Brief-2026-09.pdf)
- **외부에서 바로 열기:** https://academy-os-five.vercel.app/Academy-OS-Business-Brief-2026-09.pdf
- 형식: A4 세로 3쪽, 배움결의 네이비·청록·라벤더 브랜드 디자인. 글꼴 설치 없이 열리는 고해상도 평면화 PDF이며, 서비스 체험 링크는 클릭할 수 있다.
- 구성: 서비스와 고객 가치 / 핵심 9개 직원·홈페이지 연동·현재 구현 범위 / 수익 구조·장기 경쟁력·파일럿 제안.
- 기준: 2026년 9월의 단일 학원 모델. 현재 구현과 상용 제공 전 과제, 구독 설계와 검증할 가설을 구분했다. 내부 경로·계정·연락처·비밀키·실제 학생 정보는 포함하지 않았다.

PDF는 받는 사람에게 HTML이나 글꼴 파일을 함께 보낼 필요가 없다. 일부 IDE 미리보기에서 한글 웹폰트 PDF가 열리지 않는 문제를 피하기 위해 각 페이지를 고해상도 화면으로 고정했다. 검색·문장 복사가 필요하면 함께 보관한 HTML 원본을 사용한다. 페이지 내 홈페이지 그림은 서비스 흐름을 설명하는 구성 예시다.

## 수정·재생성

[HTML 원본](academy-os-business-brief.html)을 수정한 뒤 저장소 루트에서 실행한다.

```powershell
npm.cmd run docs:pdf
```

기존 Playwright 개발 의존성을 사용한다. Windows는 설치된 Microsoft Edge, 그 외 환경은 Playwright Chromium을 사용한다. 다른 설치된 브라우저를 사용할 경우 `ACADEMY_PDF_BROWSER`에 Playwright 채널 이름을 지정한다. 생성 스크립트는 저장소의 로컬 글꼴만 사용하며 외부 네트워크 요청, 3쪽 구성, 본문·하단 표기 겹침과 가로 넘침을 검사한다. 결과를 docs/reports와 public에 동일하게 저장하므로 빌드·배포 시 기존 외부 PDF 주소도 갱신된다.

검토용 페이지 이미지는 Git에서 제외한 `test-results/business-brief/`에 저장된다. 최종 PDF는 별도 PDF 렌더러에서도 페이지 수·한글 표시·텍스트 추출·글꼴 포함 여부를 확인했다. PDF를 수정했으면 실제 PDF 페이지를 다시 확인한다.
