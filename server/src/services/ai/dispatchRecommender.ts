/**
 * AI-01 派工推荐服务（V1 — 7 因子算法）
 * 2026-08-22：P0 核心 MVP
 *
 * 与 V1.1 现有 useComprehensiveDispatch.ts 算法一致（7 因子加权评分）：
 *   - 技能匹配 30%
 *   - 地理位置 20%
 *   - 当前负荷 20%
 *   - 历史表现 15%
 *   - 紧急程度 10%
 *   - 批次熟悉 3%
 *   - 周期适配 2%
 *
 * 区别：后端 SQL 实现，可独立部署；前端 hook 版用于 mock/演示。
 */

import { getDatabase } from '../../db';

// 7 因子权重（与 V1.1 一致）
const WEIGHTS = {
  skill_match: 0.30,
  location: 0.20,
  workload: 0.20,
  performance: 0.15,
  urgency: 0.10,
  batch_familiarity: 0.03,
  cycle_fit: 0.02,
};

interface Worker {
  id: string;
  name: string;
  skills: string[];
  performance_score: number;
  current_load: number;
  batch_familiarity: number;
  distance_km: number;
}

interface DispatchRecommendInput {
  task_type: string;
  required_skills?: string[];
  greenhouse_id?: string;
  priority?: string;
  batch_id?: string;
  estimated_hours?: number;
  due_date?: string;
  team_ids?: string[];              // 班组过滤（可选）
}

interface WorkerRecommendation {
  worker_id: string;
  worker_name: string;
  match_score: number;
  factor_scores: Record<string, number>;
  xai_reasons: string[];
}

/**
 * 计算派工推荐（7 因子加权评分）
 */
export async function recommendDispatch(input: DispatchRecommendInput): Promise<WorkerRecommendation[]> {
  const db = getDatabase();

  // 1. 查询候选员工（含班组过滤）
  let workerRows: any[] = [];
  if (input.team_ids && input.team_ids.length > 0) {
    const placeholders = input.team_ids.map(() => '?').join(',');
    const sql = `
      SELECT DISTINCT e.id, e.name, e.skills, e.position_name
      FROM employees e
      LEFT JOIN team_members tm ON tm.worker_id = e.id
      WHERE e.status = 'active' AND tm.team_id IN (${placeholders})
    `;
    const result = db.exec(sql, input.team_ids);
    workerRows = result[0]?.values.map((row: any[]) => ({
      id: row[0], name: row[1], skills: row[2] || '', position: row[3] || '',
    })) || [];
  } else {
    const result = db.exec(`SELECT id, name, skills, position_name FROM employees WHERE status = 'active'`);
    workerRows = result[0]?.values.map((row: any[]) => ({
      id: row[0], name: row[1], skills: row[2] || '', position: row[3] || '',
    })) || [];
  }

  if (workerRows.length === 0) {
    return [];
  }

  // 2. 计算每个候选人的 7 因子分数
  const recommendations: WorkerRecommendation[] = [];

  for (const w of workerRows) {
    const skills = w.skills ? w.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    // F1: 技能匹配度（0-100）
    const required = input.required_skills || [];
    const skillMatch = required.length === 0
      ? 70  // 无要求时给中等分
      : Math.round((skills.filter((s: string) => required.includes(s)).length / required.length) * 100);

    // F2: 地理位置（默认 80，简化）
    const location = 80;

    // F3: 当前负荷（从历史任务统计，0=空，100=满）
    const workloadResult = db.exec(`
      SELECT COUNT(*) AS active_tasks
      FROM farm_tasks
      WHERE assignee_id = ? AND status IN ('accepted', 'in_progress', 'pending_acceptance')
    `, [w.id]);
    const activeTasks = Number(workloadResult[0]?.values?.[0]?.[0] || 0);
    const workload = Math.max(0, 100 - activeTasks * 20);  // 每个活跃任务扣 20%

    // F4: 历史表现（V1.1 employees 表无 performance_score 字段，用默认 70；Phase 2 接入实际评分）
    const performance = 70;

    // F5: 紧急程度（基于 task.priority）
    const urgencyMap: Record<string, number> = { urgent: 100, high: 80, normal: 60, low: 40 };
    const urgency = urgencyMap[input.priority || 'normal'] || 60;

    // F6: 批次熟悉度（暂用 50 默认）
    const batchFamiliarity = 50;

    // F7: 周期适配（暂用 70 默认）
    const cycleFit = 70;

    // 加权总分
    const matchScore = Math.round(
      skillMatch * WEIGHTS.skill_match +
      location * WEIGHTS.location +
      workload * WEIGHTS.workload +
      performance * WEIGHTS.performance +
      urgency * WEIGHTS.urgency +
      batchFamiliarity * WEIGHTS.batch_familiarity +
      cycleFit * WEIGHTS.cycle_fit
    );

    // XAI 推理依据（top 3 因素）
    const factorScores = { skill_match: skillMatch, location, workload, performance, urgency, batch_familiarity: batchFamiliarity, cycle_fit: cycleFit };
    const sortedFactors = Object.entries(factorScores)
      .sort((a, b) => (b[1] * (WEIGHTS as any)[b[0]] - a[1] * (WEIGHTS as any)[a[0]]))
      .slice(0, 3);

    const xaiReasons: string[] = sortedFactors.map(([k, v]) => {
      const factorNames: Record<string, string> = {
        skill_match: '技能匹配度',
        location: '地理位置',
        workload: '当前负荷',
        performance: '历史表现',
        urgency: '紧急程度',
        batch_familiarity: '批次熟悉度',
        cycle_fit: '周期适配',
      };
      return `${factorNames[k]}: ${v}分（权重 ${((WEIGHTS as any)[k] * 100).toFixed(0)}%）`;
    });

    // 活跃任务数说明（如果有）
    if (activeTasks > 0) {
      xaiReasons.push(`当前 ${activeTasks} 个进行中任务（负荷已扣减）`);
    }
    if (skills.length > 0) {
      xaiReasons.push(`持有技能 ${skills.length} 项：${skills.slice(0, 3).join('、')} 等`);
    }

    recommendations.push({
      worker_id: w.id,
      worker_name: w.name,
      match_score: Math.max(0, Math.min(100, matchScore)),
      factor_scores: factorScores,
      xai_reasons: xaiReasons,
    });
  }

  // 按 match_score 降序
  recommendations.sort((a, b) => b.match_score - a.match_score);

  return recommendations;
}
