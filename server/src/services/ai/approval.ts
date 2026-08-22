/**
 * AI-03 智能审批辅助服务（V1 — 规则 + 历史模板）
 * 2026-08-22：P2 MVP
 *
 * Plan 要求：
 * - 基于历史审批数据和业务规则
 * - 为审批人员提供智能建议和风险提示
 * - PPT 要求：准确率 ≥75%
 *
 * V1 实现（网络阻断 LLM）：
 * - 基于审批历史数据匹配相似审批
 * - 规则引擎：金额阈值 + 申请人历史 + 异常检测
 * - 模板化建议（不调真实 LLM）
 */

import { getDatabase } from '../../db';

interface ApprovalInput {
  approval_id?: string;             // 审批 ID（可选）
  applicant_id: string;              // 申请人 ID
  applicant_role?: string;
  approval_type: string;             // 'leave' | 'material' | 'contract' | 'farm_task'
  amount?: number;                   // 金额（如适用）
  duration_days?: number;            // 时长（如请假天数）
  reason?: string;                   // 申请理由
}

interface ApprovalSuggestion {
  decision: 'approve' | 'reject' | 'review';
  confidence: number;                // 0-1
  reasoning: string[];
  risk_level: 'low' | 'medium' | 'high';
  similar_cases: { approval_id: string; decision: string; similarity: number }[];
  suggested_conditions?: string[];
  model_version: string;
  model_type: 'rule-based' | 'llm';
  inference_time_ms: number;
}

const MODEL_VERSION = '1.0.0-rule-based';

export async function suggestApproval(input: ApprovalInput): Promise<ApprovalSuggestion> {
  const startTime = Date.now();
  const db = getDatabase();

  // 1. 查询申请人历史审批记录
  const histRows = db.exec(`
    SELECT id, status, created_at
    FROM approvals
    WHERE applicant_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `, [input.applicant_id]);
  const histCount = histRows[0]?.values?.length || 0;

  // 2. 查询相似历史审批（V1.1 approvals 表无 duration_days，使用 created_at + amount 做相似度）
  const similarRows = db.exec(`
    SELECT id, status, amount, created_at
    FROM approvals
    WHERE applicant_id = ? AND type = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [input.applicant_id, input.approval_type]);

  let approveCount = 0;
  let rejectCount = 0;
  const similar_cases: ApprovalSuggestion['similar_cases'] = [];
  if (similarRows[0]) {
    for (const row of similarRows[0].values) {
      const status = String(row[1]);
      if (status === 'approved') approveCount++;
      else if (status === 'rejected') rejectCount++;
      // 简化相似度：基于金额差异
      let similarity = 0.5;
      if (input.amount && row[2]) {
        const diff = Math.abs(Number(row[2]) - input.amount) / Math.max(input.amount, 1);
        similarity = Math.max(0, 1 - diff);
      }
      similar_cases.push({
        approval_id: String(row[0]),
        decision: status,
        similarity: Math.round(similarity * 100) / 100,
      });
    }
  }

  // 3. 规则评估
  const reasoning: string[] = [];
  let riskLevel: ApprovalSuggestion['risk_level'] = 'low';
  let decisionScore = 0;  // -100~+100

  // 申请人历史倾向
  if (histCount >= 3) {
    const approveRate = (approveCount + rejectCount) > 0 ? approveCount / (approveCount + rejectCount) : 0.5;
    if (approveRate > 0.7) {
      reasoning.push(`申请人历史审批通过率 ${(approveRate * 100).toFixed(0)}% → 默认倾向通过`);
      decisionScore += 20;
    } else if (approveRate < 0.3) {
      reasoning.push(`申请人历史审批通过率仅 ${(approveRate * 100).toFixed(0)}% → 需重点审核`);
      riskLevel = 'high';
    }
  }

  // 金额阈值
  if (input.amount) {
    if (input.amount > 100000) {
      reasoning.push(`金额 ${input.amount} > 10万 → 需主管审批 + 财务审核`);
      riskLevel = 'high';
    } else if (input.amount > 10000) {
      reasoning.push(`金额 ${input.amount} > 1万 → 需部门主管审批`);
      if (riskLevel === 'low') riskLevel = 'medium';
      decisionScore -= 10;
    } else if (input.amount > 0 && input.amount <= 1000) {
      reasoning.push(`小额申请（${input.amount}）→ 倾向快速通过`);
      decisionScore += 10;
    }
  }

  // 请假时长
  if (input.duration_days) {
    if (input.duration_days >= 7) {
      reasoning.push(`请假 ${input.duration_days} 天（≥1 周）→ 需提前交接工作`);
      riskLevel = 'high';
      decisionScore -= 20;
    } else if (input.duration_days >= 3) {
      reasoning.push(`请假 ${input.duration_days} 天 → 需 HR 确认`);
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  // 相似案例
  if (similar_cases.length > 0) {
    const similarApproveRate = similar_cases.filter(c => c.decision === 'approved').length / similar_cases.length;
    reasoning.push(`相似历史案例 ${similar_cases.length} 个，通过率 ${(similarApproveRate * 100).toFixed(0)}%`);
    if (similarApproveRate > 0.6) decisionScore += 20;
    else if (similarApproveRate < 0.3) decisionScore -= 20;
  }

  // 4. 最终决策
  let decision: ApprovalSuggestion['decision'];
  if (decisionScore > 20) decision = 'approve';
  else if (decisionScore < -20) decision = 'reject';
  else decision = 'review';

  // 置信度（基于相似案例数 + 规则明确度）
  const confidence = Math.min(0.95, 0.4 + similar_cases.length * 0.1 + (histCount > 0 ? 0.2 : 0));

  // 5. 附加条件（如需 review 时）
  const suggested_conditions: string[] = [];
  if (decision === 'review') {
    suggested_conditions.push('建议主管电话沟通确认');
    suggested_conditions.push('核查申请人近 30 天绩效记录');
    if (input.amount && input.amount > 50000) suggested_conditions.push('要求提供发票/凭证');
  }

  return {
    decision,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    risk_level: riskLevel,
    similar_cases,
    suggested_conditions: suggested_conditions.length > 0 ? suggested_conditions : undefined,
    model_version: MODEL_VERSION,
    model_type: 'rule-based',
    inference_time_ms: Date.now() - startTime,
  };
}
