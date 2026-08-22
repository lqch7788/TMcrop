/**
 * AI-12 智能问答助手服务（V1 — SQLite FTS5 + LLM mock）
 * 2026-08-22：P2 MVP
 *
 * Plan 要求：
 * - 基于自然语言处理为系统用户提供操作指导、数据查询、问题解答
 * - 回答准确率 ≥80% / <3 秒
 *
 * V1 实现：
 * - 知识库：SQLite FTS5 全文索引（系统字典 + 规则 + 业务术语）
 * - LLM mock：模板化回答（不调真实 API，省成本）
 * - 意图分类：操作指导 / 数据查询 / 术语解释 / 故障排查
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
  response_time_ms: number;
}

const MODEL_VERSION = '1.0.0-fts5-mock-llm';

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
 * FTS5 全文搜索知识库
 * （V1.1 当前无 FTS5 索引，用 LIKE fallback）
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
  } catch (e) {}

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
  } catch (e) {}

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
  } catch (e) {}

  return results;
}

/**
 * 模板化回答（LLM mock）
 */
function generateAnswer(intent: QAResult['intent'], question: string, references: { source: string; excerpt: string }[]): { answer: string; confidence: number } {
  if (references.length === 0) {
    return {
      answer: `抱歉，知识库中未找到与"${question}"直接匹配的内容。建议：\n1. 尝试更具体的关键词\n2. 查看系统文档菜单\n3. 联系管理员补充知识库`,
      confidence: 0.2,
    };
  }

  let template = '';
  let confidence = 0.6;

  switch (intent) {
    case 'operation':
      template = `根据知识库，关于 "${question}" 的操作步骤：\n\n${references.map((r, i) => `${i + 1}. 【${r.source}】${r.excerpt}`).join('\n')}\n\n提示：具体操作请参考系统右上角"帮助"菜单。`;
      confidence = 0.75;
      break;
    case 'data_query':
      template = `根据知识库，关于 "${question}" 的数据查询：\n\n${references.map((r, i) => `${i + 1}. 【${r.source}】${r.excerpt}`).join('\n')}\n\n注：实际数据请以仪表盘实时显示为准。`;
      confidence = 0.7;
      break;
    case 'terminology':
      template = `关于 "${question}" 的术语解释：\n\n${references.map((r, i) => `${i + 1}. 【${r.source}】${r.excerpt}`).join('\n')}`;
      confidence = 0.8;
      break;
    case 'troubleshooting':
      template = `关于 "${question}" 的故障排查：\n\n${references.map((r, i) => `${i + 1}. 【${r.source}】${r.excerpt}`).join('\n')}\n\n如仍未解决，请联系系统管理员。`;
      confidence = 0.65;
      break;
    default:
      template = `根据知识库：\n\n${references.map((r, i) => `${i + 1}. 【${r.source}】${r.excerpt}`).join('\n')}`;
      confidence = 0.5;
  }

  return { answer: template, confidence: Math.min(confidence + references.length * 0.05, 0.95) };
}

export async function answerQuestion(input: QAInput): Promise<QAResult> {
  const startTime = Date.now();

  // 1. 意图分类
  const intent = classifyIntent(input.question);

  // 2. 知识库搜索
  const references = searchKnowledgeBase(input.question);

  // 3. 生成回答
  const { answer, confidence } = generateAnswer(intent, input.question, references);

  return {
    question: input.question,
    intent,
    answer,
    references: references.slice(0, 5),
    confidence: Math.round(confidence * 100) / 100,
    model_version: MODEL_VERSION,
    response_time_ms: Date.now() - startTime,
  };
}
