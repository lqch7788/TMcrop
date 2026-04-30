@echo off
echo ========================================
echo 原形图后端服务启动脚本
echo ========================================
echo.

cd /d "%~dp0server"

echo 正在安装依赖...
call npm install

echo.
echo 正在启动服务...
echo 服务地址: http://localhost:3001
echo 健康检查: http://localhost:3001/api/health
echo.
echo 按 Ctrl+C 停止服务
echo.

npx tsx src/index.ts
