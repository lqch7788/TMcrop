@echo off
echo Starting services...
cd /d %~dp0
start "Backend" cmd /c "cd /d %~dp0server && npm run dev"
timeout /t 3 /nobreak >/dev/null
start "Frontend" cmd /c "npm run dev"
