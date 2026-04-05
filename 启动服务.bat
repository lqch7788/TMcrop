@echo off
echo 正在启动服务器...
cd /d "%~dp0"
start http://localhost:5188
npx --yes vite --port 5188
pause
