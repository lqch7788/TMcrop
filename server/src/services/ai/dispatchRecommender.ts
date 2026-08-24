/**
 * AI-01 派工推荐服务（V2 — 7 因子真实数据版）
 * 2026-08-22：P0 核心 MVP
 * 2026-08-24 PR2：4 个因子真实化（替换硬编码）
 *   - F2 地理位置：greenhouses 真实 lat/lng + 员工常驻温室（最近任务最多）haversine 距离
 *   - F4 历史表现：performance_records 最近 90 天平均 total_score
 *   - F6 批次熟悉度：farm_tasks 该员工 batch_id 历史完成数
 *   - F7 周期适配：schedules 最近 30 天 shift 覆盖度
 *
 * 与 V1.1 现有 useComprehensiveDispatch.ts 算法一致（7 因子加权评分）：
 *   - 技能匹配 30%
 *   - 地理位置 20%
 *   - 当前负荷 20%
 *   - 历史表现 15%
 *   - 紧急程度 10%
 *   - 批次熟悉 3%
 *   - 周期适配 2%
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

const EARTH_RADIUS_KM = 6371;

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
 * Haversine 距离（公里）—— 用于 F2 真实地理位置计算
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * F2 地理位置分数（0-100）：任务温室 vs 员工常驻温室
 * - 员工常驻温室 = 该员工历史任务中访问次数最多的 greenhouse
 * - 距离 0km → 100 分；50km → 0 分（线性衰减）
 */
function calcLocationScore(db: ReturnType<typeof getDatabase>, workerId: string, taskGreenhouseId: string): { score: number; distanceKm: number } {
  // 任务温室坐标
  const ghRows = db.exec(`SELECT lat, lng FROM greenhouses WHERE id = ?`, [taskGreenhouseId]);
  const taskLat = Number(ghRows[0]?.values?.[0]?.[0] || 0);
  const taskLng = Number(ghRows[0]?.values?.[0]?.[1] || 0);
  if (taskLat === 0 && taskLng === 0) return { score: 60, distanceKm: -1 };

  // 员工常驻温室（最近任务最多访问的）
  const empGhRows = db.exec(`
    SELECT g.lat, g.lng
    FROM farm_tasks t
    JOIN greenhouses g ON g.id = t.greenhouse_id
    WHERE t.assignee_id = ? AND g.lat != 0 AND g.lng != 0
    GROUP BY g.id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `, [workerId]);
  if (!empGhRows[0]?.values?.length) {
    return { score: 60, distanceKm: -1 };  // 无历史任务 → 中等分
  }
  const empLat = Number(empGhRows[0].values[0][0]);
  const empLng = Number(empGhRows[0].values[0][1]);
  const distanceKm = haversineDistance(empLat, empLng, taskLat, taskLng);
  const score = Math.max(0, Math.min(100, Math.round(100 - distanceKm * 2)));
  return { score, distanceKm };
}

/**
 * F4 历史表现分数（0-100）：performance_records 最近 90 天平均 total_score
 * - 无记录 → 70（中性默认）
 */
function calcPerformanceScore(db: ReturnType<typeof getDatabase>, workerId: string): number {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 7);  // YYYY-MM
  const rows = db.exec(`
    SELECT AVG(total_score) AS avg_score, COUNT(*) AS n
    FROM performance_records
    WHERE staff_id = ?
      AND status = '已评估'
      AND deleted_at IS NULL
      AND month >= ?
  `, [workerId, ninetyDaysAgo]);
  const avg = Number(rows[0]?.values?.[0]?.[0] || 0);
  const n = Number(rows[0]?.values?.[0]?.[1] || 0);
  if (n === 0) return 70;  // 无历史绩效 → 中性
  return Math.max(0, Math.min(100, Math.round(avg)));
}

/**
 * F6 批次熟悉度（0-100）：farm_tasks 该员工 batch_id 历史完成数
 * - 无 batch_id → 50（中性）
 * - 每完成 1 个任务 +20 分，封顶 100
 */
function calcBatchFamiliarity(db: ReturnType<typeof getDatabase>, workerId: string, batchId?: string): number {
  if (!batchId) return 50;
  const rows = db.exec(`
    SELECT COUNT(*) AS n FROM farm_tasks
    WHERE assignee_id = ? AND batch_id = ? AND status = 'completed'
  `, [workerId, batchId]);
  const n = Number(rows[0]?.values?.[0]?.[0] || 0);
  return Math.min(100, 30 + n * 20);  // 至少 30 分（参与过该批次）
}

/**
 * F7 周期适配（0-100）：schedules 最近 30 天 shift 覆盖度
 * - 无排班记录 → 50
 * - shift 种类越多分越高（多班次适应能力）
 */
function calcCycleFit(db: ReturnType<typeof getDatabase>, workerId: string): number {
  const rows = db.exec(`
    SELECT COUNT(DISTINCT shift) AS shift_count, COUNT(*) AS total
    FROM schedules
    WHERE staff_id = ? AND date > datetime('now', '-30 day')
  `, [workerId]);
  const shiftCount = Number(rows[0]?.values?.[0]?.[0] || 0);
  const total = Number(rows[0]?.values?.[0]?.[1] || 0);
  if (total === 0) return 50;  // 无排班记录 → 中性
  // 基础 50，每多一种 shift +15，封顶 100
  return Math.min(100, 50 + shiftCount * 15);
}

/**
 * 计算派工推荐（7 因子加权评分，全部真实数据驱动）
 */
export async function recommendDispatch(input: DispatchRecommendInput): Promise<WorkerRecommendation[]> {
  const db = getDatabase();

  // 0. 参数校验：缺少 task_type / greenhouse_id 时抛错（避免 fallback 到假数据）
  if (!input.task_type) {
    throw new Error('AI-01 派工推荐必须提供 task_type 参数');
  }
  if (!input.greenhouse_id) {
    throw new Error('AI-01 派工推荐必须提供 greenhouse_id（任务所属温室）参数');
  }

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

  // 2. 计算每个候选人的 7 因子分数（全部真实数据驱动）
  const recommendations: WorkerRecommendation[] = [];

  for (const w of workerRows) {
    const skills = w.skills ? w.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    // F1: 技能匹配度（0-100）—— 真实
    const required = input.required_skills || [];
    const skillMatch = required.length === 0
      ? 70  // 无要求时给中等分
      : Math.round((skills.filter((s: string) => required.includes(s)).length / required.length) * 100);

    // F2: 地理位置（0-100）—— 2026-08-24 PR2 真实化
    const { score: location, distanceKm } = calcLocationScore(db, w.id, input.greenhouse_id);

    // F3: 当前负荷（0-100）—— 真实
    const workloadResult = db.exec(`
      SELECT COUNT(*) AS active_tasks
      FROM farm_tasks
      WHERE assignee_id = ? AND status IN ('accepted', 'in_progress', 'pending_acceptance')
    `, [w.id]);
    const activeTasks = Number(workloadResult[0]?.values?.[0]?.[0] || 0);
    const workload = Math.max(0, 100 - activeTasks * 20);

    // F4: 历史表现（0-100）—— 2026-08-24 PR2 真实化
    const performance = calcPerformanceScore(db, w.id);

    // F5: 紧急程度（0-100）—— 真实（基于 priority）
    const urgencyMap: Record<string, number> = { urgent: 100, high: 80, normal: 60, low: 40 };
    const urgency = urgencyMap[input.priority || 'normal'] || 60;

    // F6: 批次熟悉度（0-100）—— 2026-08-24 PR2 真实化
    const batchFamiliarity = calcBatchFamiliarity(db, w.id, input.batch_id);

    // F7: 周期适配（0-100）—— 2026-08-24 PR2 真实化
    const cycleFit = calcCycleFit(db, w.id);

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

    // 活跃任务数说明
    if (activeTasks > 0) {
      xaiReasons.push(`当前 ${activeTasks} 个进行中任务（负荷已扣减）`);
    }
    if (skills.length > 0) {
      xaiReasons.push(`持有技能 ${skills.length} 项：${skills.slice(0, 3).join('、')} 等`);
    }
    // 距离信息（F2 真实化后才有意义）
    if (distanceKm >= 0) {
      xaiReasons.push(`距任务温室 ${distanceKm.toFixed(1)}km（基于常驻温室）`);
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
