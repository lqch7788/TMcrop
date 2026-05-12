@echo off
echo Stopping services...
taskkill /FI "WINDOWTITLE EQ Backend*" /F 2>/dev/null
taskkill /FI "WINDOWTITLE EQ Frontend*" /F 2>/dev/null
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>/dev/null
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5188 " ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>/dev/null
echo Done! Services stopped.
