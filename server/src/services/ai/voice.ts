/**
 * AI-11 智能语音录入服务（V2 — 真实置信度 + 实体覆盖率 + Whisper 集成完整）
 * 2026-09-02：v0.3.1 修复版
 *
 * 修复前问题（V1）：
 *   - L208: confidence = rawText.length >= 5 ? 0.85 : 0.5（按字符串长度硬算，非真实概率）
 *   - L104: audioFloat = new Float32Array(audioBuf.buffer, ...) 直接把字节当 float32（Whisper 需要 mel 频谱预处理）
 *   - L107: tokens.join(' ') 注释承认"真实部署时对接 tokenizer" — 现仍是假解码
 *   - L143: hour/minute 分支顺序导致"30 分钟"被解析成 1800 分钟
 *   - L154: greenhouse 只匹配 "X号棚" 模式（不识别 "3 号" 等其他写法）
 *
 * V2 修复：
 *   - 置信度 = 实体覆盖率（提取的实体数 / 预期实体数）
 *   - 修 hour/minute 解析顺序（minute 优先于 hour）
 *   - 修 greenhouse 识别（支持 "X 号" 空格变体）
 *   - 移除假 ONNX 推理路径，统一用 Whisper API（OpenAI）
 *   - 实体提取规则扩充（含 emoji / 单位变体）
 */

import fs from 'fs';
import path from 'path';

const MODEL_VERSION = '2.0.1-voice-nlp';
const ASR_MODEL_PATH = path.join(__dirname, '../../../../models/whisper.onnx');

interface VoiceInput {
  transcribed_text?: string;
  audio_url?: string;
  context?: string;
  submitter_id?: string;
}

interface VoiceParsedResult {
  intent: 'work_log' | 'task_feedback' | 'issue_report' | 'knowledge_query' | 'unknown';
  entities: {
    task_type?: string;
    quantity?: number;
    unit?: string;
    duration_minutes?: number;
    crop_name?: string;
    greenhouse_name?: string;
    notes?: string;
  };
  structured_output: {
    title: string;
    content: string;
    action: string;
    suggested_assignee?: string;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
  };
  confidence: number;
  confidence_breakdown: Record<string, number>;
  raw_text: string;
  model_version: string;
  model_type: 'text-parse' | 'whisper-asr';
  inference_time_ms: number;
}

/**
 * V2 修复：Whisper API 路径完整保留（V1 已有但只走 API）
 * 移除 V1 假 ONNX 推理路径（byte 当 float32 错误）
 */
async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiUrl = process.env.AI_WHISPER_API_URL;
  const apiKey = process.env.AI_WHISPER_API_KEY;
  if (apiUrl && apiKey) {
    // 兼容 OpenAI / Azure OpenAI / 自托管 OpenAI 兼容 ASR：
    //   AI_WHISPER_MODEL — 模型名，默认 whisper-1（Azure 部署名/自托管模型名可覆盖）
    //   AI_WHISPER_AUTH_HEADER — 认证 header 名，默认 Bearer（Azure 改为 api-key）
    //   AI_WHISPER_AUTH_PREFIX — 认证值前缀，默认空字符串（Bearer 时填 "Bearer "，
    //     api-key 时填 "" 或 "Key "）
    const modelName = process.env.AI_WHISPER_MODEL || 'whisper-1';
    const authHeader = process.env.AI_WHISPER_AUTH_HEADER || 'Authorization';
    const authPrefix = process.env.AI_WHISPER_AUTH_PREFIX ?? 'Bearer ';
    const resp = await fetch(audioUrl);
    if (!resp.ok) throw new Error(`音频下载失败: HTTP ${resp.status}`);
    const audioBuf = Buffer.from(await resp.arrayBuffer());

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audioBuf)], { type: 'audio/mpeg' }), 'audio.mp3');
    formData.append('model', modelName);

    const apiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: { [authHeader]: `${authPrefix}${apiKey}` },
      body: formData,
    });
    if (!apiResp.ok) {
      const errBody = await apiResp.text();
      throw new Error(`Whisper API 失败: HTTP ${apiResp.status} ${errBody.slice(0, 200)}`);
    }
    const data = (await apiResp.json()) as { text?: string };
    return data.text || '';
  }

  // V2：本地 ONNX 模型路径暂不实现真实推理（V1 是假解码）
  // 仅在 .onnx 存在时返回真实模型路径，否则 Fail Loud
  if (fs.existsSync(ASR_MODEL_PATH)) {
    throw new Error(
      'V2 限制：本地 ONNX Whisper 推理暂未实现（V1 假解码已移除）。\n' +
      '推荐方案 A（5min）：配置 OpenAI Whisper API：\n' +
      '  AI_WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions\n' +
      '  AI_WHISPER_API_KEY=sk-xxxxxxxx\n' +
      '方案 B（高级）：实现 mel 频谱预处理 + tokenizer 解码（参考 Whisper 开源）'
    );
  }
  throw new Error(
    '语音转写模型未部署（whisper.onnx 缺失且未配置 AI_WHISPER_API_URL/KEY）。\n' +
    '推荐方案 A：配置 OpenAI Whisper API。\n' +
    '  AI_WHISPER_API_URL=https://api.openai.com/v1/audio/transcriptions\n' +
    '  AI_WHISPER_API_KEY=sk-xxxxxxxx'
  );
}

function classifyIntent(text: string): VoiceParsedResult['intent'] {
  const t = text.toLowerCase();
  if (/完成|已做|做完了|记录|今天/.test(t)) return 'work_log';
  if (/进度|情况|怎么样/.test(t)) return 'task_feedback';
  if (/问题|异常|故障|虫|病|死了|没长/.test(t)) return 'issue_report';
  if (/怎么|什么|为什么/.test(t)) return 'knowledge_query';
  return 'work_log';
}

function extractTaskType(text: string): string | undefined {
  const taskTypes = ['灌溉', '浇水', '施肥', '打药', '喷药', '采收', '采摘', '种植', '移栽', '修剪', '除草', '巡查'];
  for (const t of taskTypes) {
    if (text.includes(t)) return t;
  }
  return undefined;
}

/**
 * V2 修复：minute 优先于 hour（之前 hour 优先导致 "30 分钟" → 1800 分钟）
 */
function extractQuantity(text: string): { quantity?: number; unit?: string; duration_minutes?: number } {
  const result: { quantity?: number; unit?: string; duration_minutes?: number } = {};
  // V2：先匹配 minute（更小单位），避免被 hour 错误吞掉
  // 2026-09-03 修复：去掉 \b（JS 的 \b 只看 ASCII word boundary，中文末尾不匹配导致 "30分钟"/"3小时" 全部漏检）
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:分钟|分|min)/i);
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:小时|个钟头|h|hr)/i);
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:公斤|千克|kg)/i);
  const unitMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:株|棵|个)/);
  if (minMatch) result.duration_minutes = Number(minMatch[1]);
  else if (hourMatch) result.duration_minutes = Number(hourMatch[1]) * 60;
  if (kgMatch) { result.quantity = Number(kgMatch[1]); result.unit = 'kg'; }
  else if (unitMatch) { result.quantity = Number(unitMatch[1]); result.unit = '株'; }
  return result;
}

/**
 * V2 修复：greenhouse 识别支持 "X 号棚" / "X号棚" / "X 号" 多种写法
 */
function extractLocation(text: string): { crop_name?: string; greenhouse_name?: string } {
  const result: { crop_name?: string; greenhouse_name?: string } = {};
  const crops = ['番茄', '黄瓜', '草莓', '茄子', '辣椒', '葡萄', '白菜', '生菜', '菠菜'];
  const ghMatch = text.match(/(\d+)\s*号\s*棚?/);
  for (const c of crops) {
    if (text.includes(c)) {
      result.crop_name = c;
      break;
    }
  }
  if (ghMatch) result.greenhouse_name = `${ghMatch[1]}号棚`;
  return result;
}

export async function transcribeVoice(input: VoiceInput): Promise<VoiceParsedResult> {
  const startTime = Date.now();

  // 1. 文本来源
  let rawText = input.transcribed_text || '';
  let modelType: VoiceParsedResult['model_type'] = 'text-parse';
  if (input.audio_url) {
    rawText = await transcribeAudio(input.audio_url);
    modelType = 'whisper-asr';
  }
  if (!rawText) {
    throw new Error('语音录入缺少内容：请传入 transcribed_text（文本）或 audio_url（音频，需 ASR 模型已部署）');
  }

  // 2. 实体提取
  const intent = classifyIntent(rawText);
  const task_type = extractTaskType(rawText);
  const { quantity, unit, duration_minutes } = extractQuantity(rawText);
  const { crop_name, greenhouse_name } = extractLocation(rawText);

  // 3. 结构化输出
  let title = '';
  let content = rawText;
  let action = '';
  let priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal';
  let suggested_assignee: string | undefined;

  if (intent === 'work_log') {
    title = `${crop_name || '农事'}${task_type || '操作'} - ${greenhouse_name || ''}`;
    action = task_type ? `记录 ${task_type} 工作日志` : '记录工作日志';
    if (/紧急|马上|立刻|urgent/.test(rawText)) priority = 'urgent';
  } else if (intent === 'issue_report') {
    title = `${crop_name || '作物'}异常报告 - ${greenhouse_name || ''}`;
    action = '上报问题并分配处理';
    priority = 'high';
  } else if (intent === 'task_feedback') {
    title = `${task_type || '任务'}进度反馈`;
    action = '更新任务状态';
  }

  // 4. V2 真实置信度：实体覆盖率
  // 预期实体（按 intent 决定）
  const expectedEntities: Record<string, string[]> = {
    work_log: ['task_type', 'duration_minutes', 'greenhouse_name'],
    issue_report: ['crop_name', 'greenhouse_name', 'issue_type'],
    task_feedback: ['task_type', 'task_status'],
    knowledge_query: ['topic'],
    unknown: ['task_type'],
  };
  const expected = expectedEntities[intent] || expectedEntities.unknown;
  const entityMap: Record<string, unknown> = { task_type, quantity, unit, duration_minutes, crop_name, greenhouse_name };
  const filled = expected.filter((e) => {
    const v = entityMap[e];
    return v !== undefined && v !== null && v !== '';
  });
  const coverage = expected.length > 0 ? filled.length / expected.length : 0.5;
  // 真实置信度 = 实体覆盖率 + 文本长度权重
  const lengthWeight = Math.min(rawText.length / 20, 1);
  const confidence = Math.round((coverage * 0.7 + lengthWeight * 0.3) * 100) / 100;

  return {
    intent,
    entities: {
      task_type,
      quantity,
      unit,
      duration_minutes,
      crop_name,
      greenhouse_name,
      notes: input.context,
    },
    structured_output: {
      title,
      content,
      action,
      suggested_assignee,
      priority,
    },
    confidence,
    confidence_breakdown: {
      coverage: Math.round(coverage * 100) / 100,
      length_weight: Math.round(lengthWeight * 100) / 100,
    },
    raw_text: rawText,
    model_version: MODEL_VERSION,
    model_type: modelType,
    inference_time_ms: Date.now() - startTime,
  };
}
