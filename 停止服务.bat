@echo off
chcp 65001 >nul
echo ========================================
echo 停止所有服务
echo ========================================
echo.

echo 正在关闭服务窗口...
taskkill /FI "WINDOWTITLE eq Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>&1

echo 正在清理端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5188 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

echo.
echo 已停止所有服务
pause
