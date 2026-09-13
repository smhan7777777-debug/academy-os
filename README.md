# 원장실 Academy OS

중소형 학원을 위한 운영체제 체험판. AI 직원이 서류를 준비하고, 원장은 **확인 · 고치기 · 보류** 세 가지만 합니다.

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:5173
```

## 배포

Vercel에 저장소를 연결하면 Vite 프로젝트로 자동 인식됩니다 (Build: `vite build`, Output: `dist`).

## 구조

- `index.html` — 화면 뼈대
- `src/styles.css` — 디자인 토큰·스타일 (라이트/다크)
- `src/app.js` — 결재함 엔진과 화면 (샘플 규칙, 외부 AI·발송·결제 미연결)

모든 인물과 기록은 가상이며, 체험 기록은 브라우저에만 저장됩니다.
