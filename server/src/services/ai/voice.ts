/**
 * AI-11 智能语音录入服务（V1 — Mock 演示）
 * 2026-08-22：P2 MVP
 *
 * Plan 要求：
 * - 支持农事人员田间语音输入工作日志
 * - 系统自动转文字 + 结构化存储
 * - PPT 要求：转写准确率 ≥90%
 *
 * V1 实现（网络阻断 Whisper / 国产 ASR）：
 * - mock 文本解析：从用户文本提取 task_type / quantity / notes
 * - 意图分类：日志 / 任务反馈 / 问题上报 / 知识查询
 * - 模拟 ASR 文本字段（真实 ASR 上线后切换）
 */

interface VoiceInput {
  /** 模拟 ASR 转写文本（V1.1 无 ASR；真实部署用 Whisper/国产 ASR） */
  transcribed_text: string;
  /** 可选：原始音频 URL（base64 / OSS）*/
  audio_url?: string;
  /** 上下文：用户当前所在页面 */
  context?: string;
  /** 提交人 ID */
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
    issue_type?: string;
  };
  structured_output: {
    title: string;
    content: string;
    action: string;
    suggested_assignee?: string;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
  };
  confidence: number;
  raw_text: string;
  model_version: string;
  model_type: 'mock' | 'whisper';
  inference_time_ms: number;
}

const MODEL_VERSION = '1.0.0-mock-asr';

/**
 * 意图分类（关键词匹配）
 */
function classifyIntent(text: string): VoiceParsedResult['intent'] {
  const t = text.toLowerCase();
  if (/完成|已做|做完了|记录|今天/.test(t)) return 'work_log';
  if (/完成|进度|情况|怎么样/.test(t)) return 'task_feedback';
  if (/问题|异常|故障|虫|病|死了|没长/.test(t)) return 'issue_report';
  if (/怎么|什么|为什么|为什么/.test(t)) return 'knowledge_query';
  return 'work_log';  // 默认当工作日志
}

/**
 * 提取任务类型
 */
function extractTaskType(text: string): string | undefined {
  const taskTypes = ['灌溉', '浇水', '施肥', '打药', '喷药', '采收', '采摘', '种植', '移栽', '修剪', '除草', '巡查'];
  for (const t of taskTypes) {
    if (text.includes(t)) return t;
  }
  return undefined;
}

/**
 * 提取数字 + 单位
 */
function extractQuantity(text: string): { quantity?: number; unit?: string; duration_minutes?: number } {
  const result: { quantity?: number; unit?: string; duration_minutes?: number } = {};
  // 匹配 "3小时" "30分钟" "5公斤" 等
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:小时|个钟头|h|hr)/i);
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:分钟|分|min)/i);
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:公斤|千克|kg)/i);
  const unitMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:株|棵|个)/);
  if (hourMatch) result.duration_minutes = Number(hourMatch[1]) * 60;
  else if (minMatch) result.duration_minutes = Number(minMatch[1]);
  else if (kgMatch) { result.quantity = Number(kgMatch[1]); result.unit = 'kg'; }
  else if (unitMatch) { result.quantity = Number(unitMatch[1]); result.unit = '株'; }
  return result;
}

/**
 * 提取作物/温室名
 */
function extractLocation(text: string): { crop_name?: string; greenhouse_name?: string } {
  const result: { crop_name?: string; greenhouse_name?: string } = {};
  const crops = ['番茄', '黄瓜', '草莓', '茄子', '辣椒', '葡萄'];
  const ghMatch = text.match(/(\d+)号棚/);
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

  // 1. 意图分类
  const intent = classifyIntent(input.transcribed_text);

  // 2. 实体提取
  const task_type = extractTaskType(input.transcribed_text);
  const { quantity, unit, duration_minutes } = extractQuantity(input.transcribed_text);
  const { crop_name, greenhouse_name } = extractLocation(input.transcribed_text);

  // 3. 结构化输出
  let title = '';
  let content = input.transcribed_text;
  let action = '';
  let priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal';
  let suggested_assignee: string | undefined;

  if (intent === 'work_log') {
    title = `${crop_name || '农事'}${task_type || '操作'} - ${greenhouse_name || ''}`;
    action = task_type ? `记录 ${task_type} 工作日志` : '记录工作日志';
    if (/紧急|马上|立刻|urgent/.test(input.transcribed_text)) priority = 'urgent';
  } else if (intent === 'issue_report') {
    title = `${crop_name || '作物'}异常报告 - ${greenhouse_name || ''}`;
    action = '上报问题并分配处理';
    priority = 'high';
  } else if (intent === 'task_feedback') {
    title = `${task_type || '任务'}进度反馈`;
    action = '更新任务状态';
  }

  // 4. 推荐执行人（mock：选负载最低）
  suggested_assignee = 'EMP_001';  // V1.1 mock，可后续接入 AI-01

  // 5. 置信度（mock）
  const confidence = input.transcribed_text.length >= 5 ? 0.85 : 0.5;

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
    confidence: Math.round(confidence * 100) / 100,
    raw_text: input.transcribed_text,
    model_version: MODEL_VERSION,
    model_type: 'mock',
    inference_time_ms: Date.now() - startTime,
  };
}
