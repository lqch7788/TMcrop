/**
 * Mock OpenAI 兼容 Whisper ASR 服务（用于 AI-11 voice.ts 改造验证）
 *
 * 作用：
 *   - 模拟 OpenAI /audio/transcriptions 端点，回固定文本（"今天上午在2号棚灌溉番茄用了30分钟"）
 *   - 同时 serve 一个 1 秒静音 WAV 用作测试音频
 *   - 打印收到的 Authorization header 和 model 字段，方便验证 env 抽取逻辑
 *
 * 启动：node tools/test/mock-whisper-server.js [port]
 *   默认端口 8089
 *
 * 环境变量（用于兼容 Azure 模式测试）：
 *   MOCK_AUTH_HEADER=默认 Authorization（Azure 测试时改成 api-key）
 *   MOCK_REQUIRE_PREFIX=默认 "Bearer "（Azure 改成 ""）
 *   MOCK_MODEL=默认 whisper-1（Azure 改成 deploy 名）
 */
const http = require('http');

const PORT = parseInt(process.argv[2] || process.env.MOCK_PORT || '8089', 10);
const EXPECTED_AUTH_HEADER = process.env.MOCK_AUTH_HEADER || 'Authorization';
const EXPECTED_AUTH_PREFIX = process.env.MOCK_REQUIRE_PREFIX ?? 'Bearer ';
const EXPECTED_MODEL = process.env.MOCK_MODEL || 'whisper-1';
const MOCK_TEXT = '今天上午在2号棚灌溉番茄用了30分钟';

// 生成 1 秒 16kHz 16bit 单声道静音 WAV（约 32KB，PCM 数据全为 0）
function generateSilenceWav() {
  const sampleRate = 16000;
  const numSamples = sampleRate; // 1 秒
  const dataSize = numSamples * 2; // 16-bit = 2 bytes/sample
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  // PCM 数据全为 0（静音），已在 Buffer.alloc 时清零
  return buf;
}

const WAV_BUFFER = generateSilenceWav();

const server = http.createServer((req, res) => {
  // 2026-09-03 改用 WHATWG URL API（替代已弃用的 url.parse，避免 DEP0169 警告）
  // req.url 是相对路径如 "/health"，需要 base 才能 new URL()
  const parsed = new URL(req.url, 'http://localhost');
  const timestamp = new Date().toISOString();

  // 健康检查
  if (req.method === 'GET' && parsed.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, mock: 'whisper-asr', port: PORT }));
    return;
  }

  // 提供测试音频
  if (req.method === 'GET' && parsed.pathname === '/test-audio.wav') {
    console.log(`[${timestamp}] GET /test-audio.wav → ${WAV_BUFFER.length} bytes`);
    res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': WAV_BUFFER.length });
    res.end(WAV_BUFFER);
    return;
  }

  // Mock Whisper 转写端点（OpenAI 兼容 /audio/transcriptions）
  if (req.method === 'POST' && parsed.pathname === '/v1/audio/transcriptions') {
    // 打印关键 header + 字段，便于验证 env 抽取
    const authHeader = req.headers[EXPECTED_AUTH_HEADER.toLowerCase()];
    const authPrefixOk = !EXPECTED_AUTH_PREFIX || (authHeader && authHeader.startsWith(EXPECTED_AUTH_PREFIX));
    const modelMatch = (req.headers['x-mock-model'] || '') === EXPECTED_MODEL;

    console.log(`[${timestamp}] POST /v1/audio/transcriptions`);
    console.log(`  Auth header "${EXPECTED_AUTH_HEADER}": ${authHeader ? '✓' : '✗ MISSING'}`);
    console.log(`  Auth prefix "${EXPECTED_AUTH_PREFIX}": ${authPrefixOk ? '✓' : '✗ MISMATCH'}`);
    console.log(`  Model (from body): ${req.headers['x-mock-model'] || '(not echoed by curl)'}`);

    // 必须有 multipart body，丢弃内容（不解析）
    req.on('data', () => {});
    req.on('end', () => {
      // 简易健康检查：如果 Authorization 缺失或前缀不对，返回 401 帮助调试
      if (!authHeader || !authPrefixOk) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'invalid_api_key',
          hint: `Header "${EXPECTED_AUTH_HEADER}" missing or prefix "${EXPECTED_AUTH_PREFIX}" wrong`,
          received_header: authHeader || null,
        }));
        return;
      }
      // 返回 OpenAI Whisper API 标准格式
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text: MOCK_TEXT }));
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found', path: parsed.pathname }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-whisper] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[mock-whisper]   GET  /health              → 健康检查`);
  console.log(`[mock-whisper]   GET  /test-audio.wav      → 1秒静音 WAV`);
  console.log(`[mock-whisper]   POST /v1/audio/transcriptions → 回 "${MOCK_TEXT}"`);
  console.log(`[mock-whisper] 期望：auth header="${EXPECTED_AUTH_HEADER}" prefix="${EXPECTED_AUTH_PREFIX}" model="${EXPECTED_MODEL}"`);
});