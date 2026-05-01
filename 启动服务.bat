@echo off
chcp 65001 >nul
echo ========================================
echo Yuanxingtu V1.1 Startup Script
echo ========================================
echo.

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo [1/2] Starting Backend (port 3001)...
start "Backend" cmd /k "cd /d %ROOT%\server && npm run dev"

echo Waiting 4 seconds for backend to start...
timeout /t 4 /nobreak >nul

echo [2/2] Starting Frontend (port 5173)...
cd /d %ROOT%
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Services Started!
echo   Frontend: http://localhost:5188
echo   Backend:  http://localhost:3001
echo ========================================
pause
