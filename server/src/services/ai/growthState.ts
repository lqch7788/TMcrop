/**
 * AI-10 作物生长状态识别服务（V1 — Mock 演示）
 * 2026-08-22：P2 MVP
 *
 * Plan 要求：通过图像分析判断作物生长阶段 + 缺素症状 + 健康状况
 * PPT 要求：阶段识别准确 ≥85%
 *
 * V1 实现（网络阻断 XGBoost + EfficientNet）：
 * - mock 识别：基于历史 daily_records + 作物种类 + 当前 GDD 阶段
 * - 缺素症状规则（PPT 提到缺氮/缺磷/缺钾）
 * - 等真实图像识别模型部署后切换
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
  growth_rate_index: number;        // 0-100（与历史均值对比）
  estimated_yield_index: number;    // 0-100
  deficiencies: NutrientDeficiency[];
  recommendations: string[];
  model_version: string;
  model_type: 'mock' | 'image-recognition';
  xai_reasons: string[];
}

const MODEL_VERSION = '1.0.0-mock-state';

// 缺素症状规则
const NUTRIENT_DEFICIENCY_RULES = [
  { type: 'N', name: '缺氮', symptoms: ['叶片黄化（老叶先）', '生长缓慢', '植株矮小'], remedy: '追施氮肥（如尿素）' },
  { type: 'P', name: '缺磷', symptoms: ['叶片暗绿', '根系发育不良', '花期延迟'], remedy: '追施磷肥（如过磷酸钙）' },
  { type: 'K', name: '缺钾', symptoms: ['叶缘焦枯', '果实发育不良', '抗病力下降'], remedy: '追施钾肥（如硫酸钾）' },
  { type: 'Mg', name: '缺镁', symptoms: ['叶脉间黄化', '老叶症状明显'], remedy: '叶面喷施硫酸镁' },
  { type: 'Ca', name: '缺钙', symptoms: ['果实顶腐', '新叶卷曲'], remedy: '叶面喷施氯化钙' },
];

export async function identifyGrowthState(input: GrowthStateInput): Promise<GrowthStateResult> {
  const db = getDatabase();

  // 1. 查询该作物的历史健康状况（mock）
  const histResult = db.exec(`
    SELECT COUNT(*) AS n, AVG(actual_hours) AS avg_h
    FROM farm_tasks
    WHERE task_type = ? AND actual_hours > 0
  `, [input.crop_type]);
  const histCount = Number(histResult[0]?.values?.[0]?.[0] || 0);
  const histAvgHours = Number(histResult[0]?.values?.[0]?.[1] || 0);

  // 2. 阶段推断（基于 AI-04 的 GDD）
  const gdd = input.current_gdd || 500;
  let stage = '苗期';
  if (gdd >= 1200) stage = '成熟期';
  else if (gdd >= 700) stage = '结果期';
  else if (gdd >= 400) stage = '开花期';
  else if (gdd >= 150) stage = '苗期';
  else stage = '萌发期';

  // 3. 健康状态评分（mock，基于历史均值对比）
  const growthRateIndex = histAvgHours > 0 ? Math.min(100, Math.round((gdd / (histAvgHours * 10)) * 100)) : 70;
  let healthStatus: GrowthStateResult['health_status'];
  if (growthRateIndex >= 90) healthStatus = 'excellent';
  else if (growthRateIndex >= 70) healthStatus = 'good';
  else if (growthRateIndex >= 50) healthStatus = 'fair';
  else if (growthRateIndex >= 30) healthStatus = 'poor';
  else healthStatus = 'critical';

  // 4. 缺素检测（mock：基于历史样本 + 当前阶段）
  const deficiencies: NutrientDeficiency[] = [];
  const seedHash = (input.batch_id || input.crop_type).length;
  if (stage === '结果期' && seedHash % 3 === 0) {
    deficiencies.push({
      type: 'K', nutrient_name: NUTRIENT_DEFICIENCY_RULES[2].name,
      symptoms: NUTRIENT_DEFICIENCY_RULES[2].symptoms,
      confidence: 0.7, remedy: NUTRIENT_DEFICIENCY_RULES[2].remedy,
    });
  }
  if (stage === '开花期' && seedHash % 5 === 0) {
    deficiencies.push({
      type: 'P', nutrient_name: NUTRIENT_DEFICIENCY_RULES[1].name,
      symptoms: NUTRIENT_DEFICIENCY_RULES[1].symptoms,
      confidence: 0.65, remedy: NUTRIENT_DEFICIENCY_RULES[1].remedy,
    });
  }
  if (growthRateIndex < 60) {
    deficiencies.push({
      type: 'N', nutrient_name: NUTRIENT_DEFICIENCY_RULES[0].name,
      symptoms: NUTRIENT_DEFICIENCY_RULES[0].symptoms,
      confidence: 0.8, remedy: NUTRIENT_DEFICIENCY_RULES[0].remedy,
    });
  }

  // 5. 改进建议
  const recommendations: string[] = [];
  if (deficiencies.length > 0) {
    recommendations.push(...deficiencies.map(d => `${d.nutrient_name}：${d.remedy}`));
  }
  if (growthRateIndex < 70) {
    recommendations.push('建议加强肥水管理 + 巡查频率');
  }
  if (recommendations.length === 0) {
    recommendations.push('✅ 当前生长状态良好，继续保持');
  }

  // 6. XAI 推理
  const xai_reasons = [
    `当前阶段：${stage}（基于累积 GDD ${gdd}）`,
    `健康评分：${growthRateIndex}/100 → ${healthStatus}`,
    `历史任务样本：${histCount} 条（平均实际工时 ${histAvgHours.toFixed(1)}h）`,
    `缺素检测：${deficiencies.length} 种（${deficiencies.map(d => d.nutrient_name).join('、') || '无'}）`,
    `模型：mock 演示版（图像识别模型待网络通畅后接入）`,
  ];

  return {
    crop_type: input.crop_type,
    growth_stage: stage,
    health_status: healthStatus,
    growth_rate_index: growthRateIndex,
    estimated_yield_index: Math.max(0, growthRateIndex - 10),  // 产量指数略低于生长指数
    deficiencies,
    recommendations,
    model_version: MODEL_VERSION,
    model_type: 'mock',
    xai_reasons,
  };
}
