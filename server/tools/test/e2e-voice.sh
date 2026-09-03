#!/bin/bash
# AI-11 语音录入 ASR 端到端测试脚本
# 2026-09-03：voice.ts 硬编码改环境变量后的验证工具
#
# 用法：
#   bash tools/test/e2e-voice.sh
#
# 前置条件：
#   1. server 已在 3001 端口运行（npm run dev）
#   2. .env 配置了 AI_WHISPER_API_URL=http://127.0.0.1:8089/v1/audio/transcriptions
#      AI_WHISPER_API_KEY=mock-test-key
#      （如果只想跑真实 API，把 URL 改成中转商地址即可）
#   3. tsx watch 已自动重启加载新代码（如果改了 .env）

set -e

PORT_MOCK=8089
PORT_SERVER=3001
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "AI-11 语音录入 ASR 端到端测试"
echo "============================================"

# Step 1: 启动 mock Whisper（后台）
echo ""
echo "[1/4] 启动 mock Whisper server (port $PORT_MOCK)..."
node "$SCRIPT_DIR/mock-whisper-server.js" $PORT_MOCK > /tmp/mock-whisper.log 2>&1 &
MOCK_PID=$!
echo "    mock PID: $MOCK_PID"

# 等待 mock 就绪
for i in 1 2 3 4 5; do
  if curl -sf "http://127.0.0.1:$PORT_MOCK/health" > /dev/null; then
    echo "    mock 健康检查 ✓"
    break
  fi
  sleep 0.5
done

if ! curl -sf "http://127.0.0.1:$PORT_MOCK/health" > /dev/null; then
  echo "    ✗ mock 启动失败，查看 /tmp/mock-whisper.log"
  cat /tmp/mock-whisper.log
  kill $MOCK_PID 2>/dev/null || true
  exit 1
fi

cleanup() {
  echo ""
  echo "[清理] 关闭 mock Whisper (PID $MOCK_PID)"
  kill $MOCK_PID 2>/dev/null || true
}
trap cleanup EXIT

# Step 2: 验证 status 端点 whisper 模块已部署
echo ""
echo "[2/4] 验证 /api/ai/config/status 中 whisper 状态..."
STATUS=$(curl -s "http://127.0.0.1:$PORT_SERVER/api/ai/config/status")
DEPLOYED=$(echo "$STATUS" | grep -o '"code":"whisper"[^}]*"deployed":[^,}]*' | grep -o 'deployed":[a-z]*' | cut -d: -f2)

if [ "$DEPLOYED" = "true" ]; then
  echo "    ✓ whisper 已部署（横幅应为绿勾）"
else
  echo "    ✗ whisper 未部署（部署状态：$DEPLOYED）"
  echo "    请确认 .env 已设 AI_WHISPER_API_URL，且 server 已重启加载新配置"
  echo "    完整状态：$STATUS"
  exit 1
fi

# Step 3: 调用语音录入端到端（上传 mock 提供的测试音频）
echo ""
echo "[3/4] 调用 POST /api/ai/voice/transcribe ..."
RESPONSE=$(curl -s -X POST "http://127.0.0.1:$PORT_SERVER/api/ai/voice/transcribe" \
  -H "Content-Type: application/json" \
  -d "{\"audio_url\":\"http://127.0.0.1:$PORT_MOCK/test-audio.wav\"}")

echo "    原始响应："
echo "$RESPONSE" | head -c 500
echo ""

# Step 4: 验证结构化输出
echo ""
echo "[4/4] 验证结构化字段..."
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[a-z]*' | head -1 | cut -d: -f2)
INTENT=$(echo "$RESPONSE" | grep -o '"intent":"[^"]*"' | head -1 | cut -d'"' -f4)
TASK_TYPE=$(echo "$RESPONSE" | grep -o '"taskType":"[^"]*"' | head -1 | cut -d'"' -f4)
CROP=$(echo "$RESPONSE" | grep -o '"cropName":"[^"]*"' | head -1 | cut -d'"' -f4)
GH=$(echo "$RESPONSE" | grep -o '"greenhouseName":"[^"]*"' | head -1 | cut -d'"' -f4)
DURATION=$(echo "$RESPONSE" | grep -o '"durationMinutes":[0-9]*' | head -1 | cut -d: -f2)
MODEL_TYPE=$(echo "$RESPONSE" | grep -o '"modelType":"[^"]*"' | head -1 | cut -d'"' -f4)

PASS=0
FAIL=0
check() {
  if [ "$1" = "$2" ]; then
    echo "    ✓ $3"
    PASS=$((PASS+1))
  else
    echo "    ✗ $3（期望 '$2'，实际 '$1'）"
    FAIL=$((FAIL+1))
  fi
}

check "$SUCCESS" "true" "API success=true"
check "$INTENT" "work_log" "intent 识别为 work_log"
check "$TASK_TYPE" "灌溉" "taskType 抽取为 灌溉"
check "$CROP" "番茄" "cropName 抽取为 番茄"
check "$GH" "2号棚" "greenhouseName 抽取为 2号棚"
check "$DURATION" "30" "durationMinutes 直接为 30（'30 分钟' 命中 minMatch）"
check "$MODEL_TYPE" "whisper-asr" "modelType 为 whisper-asr（走了 ASR 路径）"

echo ""
echo "============================================"
echo "结果：$PASS 通过，$FAIL 失败"
echo "============================================"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "mock 日志（用于诊断 Authorization header 是否正确）："
  cat /tmp/mock-whisper.log
  exit 1
fi

exit 0