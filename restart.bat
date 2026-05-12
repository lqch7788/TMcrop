@echo off
echo Restarting services...
taskkill /FI "WINDOWTITLE EQ Backend*" /F 2>/dev/null
taskkill /FI "WINDOWTITLE EQ Frontend*" /F 2>/dev/null
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>/dev/null
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5188 " ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>/dev/null
timeout /t 1 /nobreak >/dev/null
start "Backend" cmd /c "cd /d %~dp0server && npm run dev"
timeout /t 3 /nobreak >/dev/null
start "Frontend" cmd /c "npm run dev"
