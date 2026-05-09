@echo off
chcp 65001 >nul
echo ========================================
echo Yuanxingtu V1.1 重启脚本
echo ========================================
echo.

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo [1/3] 清理占用端口的进程...
echo   - 关闭后端 (port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo   - 关闭前端 (port 5188)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5188 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo   - 关闭旧窗口...
taskkill /FI "WINDOWTITLE eq Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>&1

echo.
echo [2/3] 启动后端 (port 3001)...
start "Backend" cmd /k "cd /d %ROOT%\server && npm run dev"

echo 等待 4 秒...
timeout /t 4 /nobreak >nul

echo [3/3] 启动前端 (port 5188)...
start "Frontend" cmd /k "cd /d %ROOT% && npm run dev"

echo.
echo ========================================
echo 服务已重启!
echo   前端: http://localhost:5188
echo   后端: http://localhost:3001
echo ========================================
