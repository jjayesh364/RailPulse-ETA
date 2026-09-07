@echo off
echo ===================================================
echo   RailPulse ETA - Startup Script
echo   Smart India Hackathon 2026 Prototype
echo ===================================================
echo.

echo [1/2] Starting Backend Server on http://localhost:8000 ...
start "RailPulse Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 >nul

echo [2/2] Starting Frontend Server on http://localhost:3000 ...
start "RailPulse Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo  All services launched!
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://localhost:8000
echo  - API Docs: http://localhost:8000/docs
echo ===================================================
pause
