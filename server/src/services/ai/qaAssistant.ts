/**
 * AI-12 智能问答助手服务（真实检索 + LLM 端口预留）
 * 2026-08-22：砍掉 LLM mock 模板回答
 *
 * 真实链路：
 * 1. 知识库检索：SQLite 真实表（数据字典 / 推荐规则 / AI 规则）关键词检索
 * 2. LLM 生成：环境变量 AI_LLM_API_URL + AI_LLM_API_KEY 配置后调用真实 LLM API
 *    - 未配置 → 返回真实检索结果拼装回答，并明确标注"LLM 未配置"（不伪装）
 */

import { getDatabase } from '../../db';

interface QAInput {
  question: string;                // 用户自然语言问题
  context?: string;                // 上下文（如当前页面）
}

interface QAResult {
  question: string;
  intent: 'operation' | 'data_query' | 'terminology' | 'troubleshooting' | 'unknown';
  answer: string;
  references: { source: string; excerpt: string; relevance: number }[];
  confidence: number;              // 0-1
  model_version: string;
  llm_configured: boolean;         // LLM 端口是否已配置
  response_time_ms: number;
}

const MODEL_VERSION = '1.0.1-fts5-real';

/**
 * 意图分类（关键词匹配）
 */
function classifyIntent(question: string): QAResult['intent'] {
  const q = question.toLowerCase();
  if (/怎么|如何|操作|使用|添加|删除|修改|创建|导出|导入|按钮|界面|菜单|登录|权限/.test(q)) return 'operation';
  if (/多少|统计|数量|总数|平均|历史|查询|最近|今天|本周|本月/.test(q)) return 'data_query';
  if (/是什么|意思|定义|区别|概念|术语|什么意思|解释/.test(q)) return 'terminology';
  if (/错误|失败|问题|为什么|无法|不工作|报错|卡住/.test(q)) return 'troubleshooting';
  return 'unknown';
}

/**
 * 知识库检索（真实表 LIKE 检索）
 */
function searchKnowledgeBase(question: string): { source: string; excerpt: string; relevance: number }[] {
  const db = getDatabase();
  const keywords = question.replace(/[怎么如何是什么多少查询]+/g, '').trim().split(/\s+/).filter(k => k.length >= 2);

  if (keywords.length === 0) return [];

  const results: { source: string; excerpt: string; relevance: number }[] = [];

  // 1. 查数据字典
  try {
    const dictResults = db.exec(`
      SELECT dict_name, dict_label, description FROM data_dictionary
      WHERE dict_name LIKE ? OR dict_label LIKE ? OR description LIKE ?
      LIMIT 3
    `, [`%${keywords[0]}%`, `%${keywords[0]}%`, `%${keywords[0]}%`]);
    if (dictResults[0]?.values?.length) {
      for (const row of dictResults[0].values) {
        results.push({
          source: `数据字典:${row[0]}`,
          excerpt: `${row[1]} - ${row[2] || ''}`.slice(0, 100),
          relevance: 0.7,
        });
      }
    }
  } catch (e) { /* 表缺失则跳过 */ }

  // 2. 查推荐规则
  try {
    const ruleResults = db.exec(`
      SELECT DISTINCT type, severity, action FROM recommendation_rules
      WHERE action LIKE ? OR type LIKE ?
      LIMIT 3
    `, [`%${keywords[0]}%`, `%${keywords[0]}%`]);
    if (ruleResults[0]?.values?.length) {
      for (const row of ruleResults[0].values) {
        results.push({
          source: `推荐规则:${row[0]}`,
          excerpt: `${row[2]}（严重度 ${row[1]}）`.slice(0, 100),
          relevance: 0.5,
        });
      }
    }
  } catch (e) { /* 表缺失则跳过 */ }

  // 3. 查 AI 规则库（如果存在）
  try {
    const aiRuleResults = db.exec(`
      SELECT type, severity, action FROM ai_recommendation_rules
      WHERE action LIKE ? OR type LIKE ?
      LIMIT 3
    `, [`%${keywords[0]}%`, `%${keywords[0]}%`]);
    if (aiRuleResults[0]?.values?.length) {
      for (const row of aiRuleResults[0].values) {
        results.push({
          source: `AI 规则:${row[0]}`,
          excerpt: `${row[2]}（严重度 ${row[1]}）`.slice(0, 100),
          relevance: 0.6,
        });
      }
    }
  } catch (e) { /* 表缺失则跳过 */ }

  return results;
}

/**
 * 调用真实 LLM API（端口预留：配置 AI_LLM_API_URL + AI_LLM_API_KEY 后启用）
 * 未配置 → 返回 null（上层用真实检索结果拼装，不伪装 LLM 回答）
 */
async function callLLM(question: string, references: { source: string; excerpt: string }[]): Promise<string | null> {
  const apiUrl = process.env.AI_LLM_API_URL;
  const apiKey = process.env.AI_LLM_API_KEY;
  if (!apiUrl) return null;

  const prompt = `你是弘智耘种植管理系统的智能助手。请基于以下知识库片段回答用户问题，回答要简洁准确（150 字内）。\n\n知识库片段：\n${references.map(r => `- 【${r.source}】${r.excerpt}`).join('\n') || '（无匹配片段）'}\n\n用户问题：${question}`;

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ prompt, question, stream: false }),
  });
  if (!resp.ok) {
    throw new Error(`LLM API 调用失败: HTTP ${resp.status}`);
  }
  const data = await resp.json() as Record<string, any>;
  // 兼容常见 LLM 返回结构（answer / content / choices[0].text / text）
  const text = data.answer ?? data.content ?? data.text ?? data.choices?.[0]?.text ?? data.choices?.[0]?.message?.content ?? null;
  if (!text) {
    throw new Error('LLM API 返回结构无法解析（期望 answer/content/choices[0].text 字段）');
  }
  return String(text);
}

/**
 * 无 LLM 时：基于真实检索结果拼装回答（标注数据来源，不伪装）
 */
function composeRetrievalAnswer(intent: QAResult['intent'], question: string, references: { source: string; excerpt: string }[]): string {
  if (references.length === 0) {
    return `知识库中未找到与"${question}"直接匹配的内容。建议：\n1. 尝试更具体的关键词\n2. 查看系统文档菜单\n3. 联系管理员补充知识库\n\n（注：LLM 未配置，仅检索本地知识库。配置环境变量 AI_LLM_API_URL 后可启用智能回答）`;
  }
  const intentLabel: Record<QAResult['intent'], string> = {
    operation: '操作指导',
    data_query: '数据查询',
    terminology: '术语解释',
    troubleshooting: '故障排查',
    unknown: '知识库匹配',
  };
  return `【${intentLabel[intent]}】关于 "${question}"，知识库检索到以下相关内容：\n\n${references.map((r, i) => `${i + 1}. 【${r.source}】${r.excerpt}`).join('\n')}\n\n（注：LLM 未配置，以上为本地知识库检索结果。配置 AI_LLM_API_URL 后可获得智能生成的完整回答）`;
}

export async function answerQuestion(input: QAInput): Promise<QAResult> {
  const startTime = Date.now();

  // 1. 意图分类
  const intent = classifyIntent(input.question);

  // 2. 真实知识库检索
  const references = searchKnowledgeBase(input.question);

  // 3. LLM 端口：已配置 → 真实调用；未配置 → 真实检索结果拼装
  const llmConfigured = Boolean(process.env.AI_LLM_API_URL);
  let answer: string;
  let confidence = 0.3;

  if (llmConfigured) {
    const llmAnswer = await callLLM(input.question, references.slice(0, 5));
    answer = llmAnswer ?? composeRetrievalAnswer(intent, input.question, references);
    confidence = llmAnswer ? 0.85 : 0.4;
  } else {
    answer = composeRetrievalAnswer(intent, input.question, references);
    confidence = references.length > 0 ? 0.6 : 0.2;
  }

  return {
    question: input.question,
    intent,
    answer,
    references: references.slice(0, 5),
    confidence: Math.round(confidence * 100) / 100,
    model_version: MODEL_VERSION,
    llm_configured: llmConfigured,
    response_time_ms: Date.now() - startTime,
  };
}
