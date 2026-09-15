@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo [원장실] 처음 실행: 패키지를 설치합니다...
  call npm install
)
echo [원장실] http://localhost:5173 에서 열립니다. 이 창을 닫으면 멈춥니다.
start "" http://localhost:5173
call npx vite --port 5173 --strictPort
