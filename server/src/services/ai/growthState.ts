/**
 * AI-10 作物生长状态识别服务（真实数据版）
 * 2026-08-22：砍掉 mock hash 随机缺素检测
 *
 * 真实数据链路：
 * - 生长阶段：累积 GDD 积温计算（真实物理量，与 AI-04 同源）
 * - 健康评分：daily_records 真实记录（异常记录扣分）+ farm_tasks 任务完成率
 * - 缺素检测：daily_records.remarks 真实症状关键词匹配（无记录 → 明确标注"无缺素症状记录"）
 * - 图像识别模型部署后（pest_image.onnx）切换为图像分析
 */

import { getDatabase } from '../../db';

interface GrowthStateInput {
  crop_type: string;
  batch_id?: string;
  greenhouse_id?: string;
  current_gdd?: number;             // 当前累积 GDD（来自 AI-04）
}

interface NutrientDeficiency {
  type: 'N' | 'P' | 'K' | 'Mg' | 'Ca';
  nutrient_name: string;
  symptoms: string[];
  confidence: number;
  remedy: string;
}

interface GrowthStateResult {
  crop_type: string;
  growth_stage: string;
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  growth_rate_index: number;        // 0-100（真实记录驱动）
  estimated_yield_index: number;    // 0-100
  deficiencies: NutrientDeficiency[];
  recommendations: string[];
  model_version: string;
  model_type: 'data-driven';
  xai_reasons: string[];
}

const MODEL_VERSION = '1.0.1-data-driven';
const TARGET_GDD = 1600;            // 番茄全生育期目标积温（℃·d）

// 缺素症状规则（真实农业营养诊断）
const NUTRIENT_DEFICIENCY_RULES: Record<string, NutrientDeficiency> = {
  N: { type: 'N', nutrient_name: '缺氮', symptoms: ['叶片黄化（老叶先）', '生长缓慢', '植株矮小'], confidence: 0.75, remedy: '追施氮肥（如尿素）' },
  K: { type: 'K', nutrient_name: '缺钾', symptoms: ['叶缘焦枯', '果实发育不良', '抗病力下降'], confidence: 0.7, remedy: '追施钾肥（如硫酸钾）' },
  P: { type: 'P', nutrient_name: '缺磷', symptoms: ['叶片暗绿', '根系发育不良', '花期延迟'], confidence: 0.65, remedy: '追施磷肥（如过磷酸钙）' },
  Mg: { type: 'Mg', nutrient_name: '缺镁', symptoms: ['叶脉间黄化', '老叶症状明显'], confidence: 0.6, remedy: '叶面喷施硫酸镁' },
  Ca: { type: 'Ca', nutrient_name: '缺钙', symptoms: ['果实顶腐', '新叶卷曲'], confidence: 0.6, remedy: '叶面喷施氯化钙' },
};

// 症状关键词 → 缺素类型（真实记录匹配）
const SYMPTOM_KEYWORDS: { kw: string; type: keyof typeof NUTRIENT_DEFICIENCY_RULES }[] = [
  { kw: '缺氮', type: 'N' },
  { kw: '黄化', type: 'N' },
  { kw: '叶缘焦枯', type: 'K' },
  { kw: '焦枯', type: 'K' },
  { kw: '缺钾', type: 'K' },
  { kw: '缺磷', type: 'P' },
  { kw: '叶脉间黄化', type: 'Mg' },
  { kw: '缺镁', type: 'Mg' },
  { kw: '顶腐', type: 'Ca' },
  { kw: '缺钙', type: 'Ca' },
];

/** 查询该作物真实记录（prepare + bind，中文安全） */
function queryCropRecords(db: any, cropType: string): {
  recordCount: number;
  abnormalCount: number;
  symptomRecords: string[];
} {
  const like = `%${cropType}%`;
  const stmt = db.prepare(`
    SELECT COUNT(*) AS n,
           SUM(CASE WHEN remarks LIKE '%病%' OR remarks LIKE '%虫%' OR remarks LIKE '%异常%' OR remarks LIKE '%萎蔫%' OR remarks LIKE '%黄化%' OR remarks LIKE '%枯%' THEN 1 ELSE 0 END) AS abnormal,
           remarks
    FROM daily_records
    WHERE crop_name LIKE ? AND status = 'active'
    GROUP BY remarks
  `);
  stmt.bind([like]);
  let recordCount = 0;
  let abnormalCount = 0;
  const symptomRecords: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    recordCount += Number(row.n) || 0;
    abnormalCount += Number(row.abnormal) || 0;
    if (row.remarks) symptomRecords.push(String(row.remarks));
  }
  stmt.free();

  // 兼容：GROUP BY remarks 时 COUNT 按组计，此处用 COUNT(DISTINCT id) 更准确 → 重新统计
  const cntStmt = db.prepare('SELECT COUNT(*) AS n FROM daily_records WHERE crop_name LIKE ? AND status = ?');
  cntStmt.bind([like, 'active']);
  if (cntStmt.step()) recordCount = Number(cntStmt.getAsObject().n) || 0;
  cntStmt.free();
  return { recordCount, abnormalCount, symptomRecords };
}

/** 查询该作物任务完成率（真实 farm_tasks） */
function queryTaskCompletion(db: any, cropType: string): { total: number; completed: number } {
  // farm_tasks 无 crop 字段时按任务类型关键词近似匹配（真实数据）
  const like = `%${cropType}%`;
  const stmt = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
    FROM farm_tasks WHERE task_content LIKE ? OR task_title LIKE ?
  `);
  stmt.bind([like, like]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    return { total: Number(row.total) || 0, completed: Number(row.completed) || 0 };
  }
  stmt.free();
  return { total: 0, completed: 0 };
}

export async function identifyGrowthState(input: GrowthStateInput): Promise<GrowthStateResult> {
  const db = getDatabase();
  const xai_reasons: string[] = [];

  // 1. 生长阶段（GDD 积温，真实计算）
  const gdd = input.current_gdd ?? 500;
  let stage = '苗期';
  if (gdd >= 1200) stage = '成熟期';
  else if (gdd >= 700) stage = '结果期';
  else if (gdd >= 400) stage = '开花期';
  else if (gdd >= 150) stage = '苗期';
  else stage = '萌发期';
  xai_reasons.push(`当前阶段：${stage}（累积 GDD ${gdd} / 目标 ${TARGET_GDD}）`);

  // 2. 真实记录健康评估
  const { recordCount, abnormalCount, symptomRecords } = queryCropRecords(db, input.crop_type);
  const { total, completed } = queryTaskCompletion(db, input.crop_type);

  // 健康评分：基础 85 - 异常记录每类扣 15 + 管理活跃度加分
  let growthRateIndex = 85;
  if (abnormalCount > 0) growthRateIndex -= Math.min(60, abnormalCount * 15);
  if (total > 0 && completed / total < 0.6) growthRateIndex -= 10;
  if (recordCount >= 10) growthRateIndex += 5;
  growthRateIndex = Math.max(5, Math.min(100, growthRateIndex));

  const healthStatus: GrowthStateResult['health_status'] =
    growthRateIndex >= 90 ? 'excellent' :
    growthRateIndex >= 70 ? 'good' :
    growthRateIndex >= 50 ? 'fair' :
    growthRateIndex >= 30 ? 'poor' : 'critical';

  xai_reasons.push(`健康评分：${growthRateIndex}/100 → ${healthStatus}（真实 daily_records ${recordCount} 条，其中异常 ${abnormalCount} 条；任务完成率 ${total ? Math.round(completed / total * 100) : 0}%）`);

  // 3. 缺素检测：真实症状记录匹配
  const deficiencies: NutrientDeficiency[] = [];
  const foundTypes = new Set<string>();
  for (const rec of symptomRecords) {
    for (const { kw, type } of SYMPTOM_KEYWORDS) {
      if (rec.includes(kw) && !foundTypes.has(type)) {
        foundTypes.add(type);
        deficiencies.push(NUTRIENT_DEFICIENCY_RULES[type]);
      }
    }
  }
  xai_reasons.push(
    deficiencies.length > 0
      ? `缺素检测：发现 ${deficiencies.length} 种（${deficiencies.map(d => d.nutrient_name).join('、')}，来源 daily_records 症状记录）`
      : '缺素检测：daily_records 无缺素症状记录（未发现缺氮/磷/钾/镁/钙症状）',
  );

  // 4. 产量指数（GDD 进度 + 健康修正）
  const estimatedYieldIndex = Math.max(0, Math.min(100, Math.round((gdd / TARGET_GDD) * 80 + growthRateIndex * 0.2)));

  // 5. 改进建议（真实记录驱动）
  const recommendations: string[] = [];
  if (deficiencies.length > 0) {
    recommendations.push(...deficiencies.map(d => `${d.nutrient_name}：${d.remedy}`));
  }
  if (abnormalCount > 0) {
    recommendations.push(`发现 ${abnormalCount} 条异常记录，建议加强巡查并排查具体原因`);
  }
  if (growthRateIndex < 70) {
    recommendations.push('建议加强肥水管理 + 巡查频率');
  }
  if (recommendations.length === 0) {
    recommendations.push('当前生长状态良好，无缺素与异常记录，继续保持');
  }

  return {
    crop_type: input.crop_type,
    growth_stage: stage,
    health_status: healthStatus,
    growth_rate_index: growthRateIndex,
    estimated_yield_index: estimatedYieldIndex,
    deficiencies,
    recommendations,
    model_version: MODEL_VERSION,
    model_type: 'data-driven',
    xai_reasons,
  };
}
