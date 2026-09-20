@echo off
echo Starting Reshidual Agent...

start "Reshidual Backend (FastAPI)" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.main:app --port 8420 --host 127.0.0.1 --reload"

start "Reshidual Frontend (Next.js)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 >nul
start http://localhost:3000

echo Backend running on http://127.0.0.1:8420
echo Frontend running on http://localhost:3000
