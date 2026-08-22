#!/bin/bash
# V1.1 非 Docker 生产部署脚本（Windows / 无 Docker 环境）
# 2026-08-22：作为 docker-compose 的替代方案

set -e

echo "═══════════════════════════════════════════════"
echo "  V1.1 生产部署（Native Node + PM2）"
echo "═══════════════════════════════════════════════"

# 1. 检查 Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js 未安装"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# 2. 安装依赖
echo ""
echo "[1/5] 安装依赖..."
cd "$(dirname "$0")/.."
npm ci --omit=dev

# 3. 构建 TypeScript
echo ""
echo "[2/5] TypeScript 构建..."
npx tsc
echo "✅ 构建产物: server/dist/"

# 4. 数据库迁移
echo ""
echo "[3/5] 数据库迁移..."
npx tsx scripts/run-migration-2026-08-22.ts || echo "(迁移已跑过或失败)"

# 5. 启动 server（后台）
echo ""
echo "[4/5] 启动服务..."

# 安装 PM2（如未装）
if ! command -v pm2 >/dev/null 2>&1; then
    echo "  安装 PM2..."
    npm install -g pm2 || echo "�️  PM2 安装失败，使用 nohup 启动"
fi

if command -v pm2 >/dev/null 2>&1; then
    pm2 delete v11-server 2>/dev/null || true
    pm2 start dist/index.js --name v11-server -i 1 --time
    pm2 save
    echo "✅ PM2 已启动 v11-server"
else
    # fallback: nohup 后台启动
    nohup node dist/index.js > /tmp/v11-server.log 2>&1 &
    echo "✅ nohup 启动 PID $!"
    echo "  日志: /tmp/v11-server.log"
fi

# 6. 健康检查
echo ""
echo "[5/5] 健康检查..."
sleep 3
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "success.*true\|status.*ok"; then
    echo "✅ 服务健康"
else
    echo "⚠️  健康检查异常: $HEALTH"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  部署完成！"
echo "═══════════════════════════════════════════════"
echo ""
echo "端点: http://localhost:3001"
echo "AI 端点（共 16 个）:"
echo "  /api/ai/workhour/{predict,feedback,predictions}"
echo "  /api/ai/dispatch/recommend"
echo "  /api/ai/growth/predict"
echo "  /api/ai/growth-state/identify"
echo "  /api/ai/pest/alert"
echo "  /api/ai/route/optimize"
echo "  /api/ai/resource/optimize"
echo "  /api/ai/schedule/generate"
echo "  /api/ai/image/identify"
echo "  /api/ai/voice/transcribe"
echo "  /api/ai/qa/ask"
echo "  /api/ai/report/generate"
echo "  /api/ai/anomaly/detect"
echo "  /api/ai/attendance/detect"
echo "  /api/ai/approval/suggest"
