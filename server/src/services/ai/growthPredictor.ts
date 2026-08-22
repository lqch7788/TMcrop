/**
 * AI-04 作物生长预测服务（V1 — 规则版 baseline）
 * 2026-08-22：P0 核心 MVP
 *
 * 与 Plan 设计差异：
 * - Plan 要求 XGBoost + 环境传感器 + 产量历史训练
 * - 现实约束：V1.1 无 daily_records 环境字段、XGBoost 网络阻断
 * - 降级实现：GDD（积温）+ 历史平均产量 + 异常预警规则
 * - 等数据扩充 + XGBoost 可用后切换
 *
 * 算法：
 * - 阶段预测：GDD 累积 → 作物阶段（番茄示例：萌发 0-150 / 苗期 150-400 / 开花 400-700 / 结果 700-1200 / 成熟 1200+）
 * - 产量预测：历史同类型批次平均 × 阶段完成度系数
 * - 异常预警：阶段进度滞后 > 20%
 */

import { getDatabase } from '../../db';

interface GrowthPredictInput {
  crop_type: string;               // 必填：作物类型
  batch_id?: string;
  greenhouse_id?: string;
  plant_date?: string;              // 种植日期（ISO8601）
  expected_harvest_date?: string;   // 预期采收日期
  base_temperature?: number;        // 该作物的基准温度（℃）
  variety?: string;
}

interface StageEstimate {
  stage_name: string;
  stage_start: string;              // ISO8601 预估日期
  stage_end: string;
  cumulative_gdd: number;
}

interface GrowthPredictResult {
  crop_type: string;
  current_stage: string;             // 当前所处阶段
  days_since_planting: number;
  cumulative_gdd: number;
  expected_harvest_date: string;
  days_to_harvest: number;
  yield_prediction_kg: number;       // 预估产量
  yield_confidence_low: number;
  yield_confidence_high: number;
  stage_estimate: StageEstimate[];
  alerts: string[];                  // 异常预警
  model_version: string;
  model_type: 'rule-based' | 'onnx-xgboost';
  xai_reasons: string[];
}

// 作物阶段定义（基于 GDD 积温，简单规则）
const CROP_STAGES: Record<string, { base_temp: number; total_gdd: number; stages: { name: string; gdd_start: number; gdd_end: number }[] }> = {
  '番茄': {
    base_temp: 10,
    total_gdd: 1200,
    stages: [
      { name: '萌发', gdd_start: 0, gdd_end: 150 },
      { name: '苗期', gdd_start: 150, gdd_end: 400 },
      { name: '开花', gdd_start: 400, gdd_end: 700 },
      { name: '结果', gdd_start: 700, gdd_end: 1200 },
      { name: '成熟', gdd_start: 1200, gdd_end: 1200 },
    ],
  },
  '草莓': {
    base_temp: 5,
    total_gdd: 800,
    stages: [
      { name: '萌发', gdd_start: 0, gdd_end: 100 },
      { name: '苗期', gdd_start: 100, gdd_end: 300 },
      { name: '开花', gdd_start: 300, gdd_end: 500 },
      { name: '结果', gdd_start: 500, gdd_end: 800 },
      { name: '成熟', gdd_start: 800, gdd_end: 800 },
    ],
  },
  '黄瓜': {
    base_temp: 12,
    total_gdd: 900,
    stages: [
      { name: '萌发', gdd_start: 0, gdd_end: 120 },
      { name: '苗期', gdd_start: 120, gdd_end: 350 },
      { name: '开花', gdd_start: 350, gdd_end: 550 },
      { name: '结果', gdd_start: 550, gdd_end: 900 },
      { name: '成熟', gdd_start: 900, gdd_end: 900 },
    ],
  },
  '默认': {
    base_temp: 10,
    total_gdd: 1000,
    stages: [
      { name: '萌发', gdd_start: 0, gdd_end: 150 },
      { name: '苗期', gdd_start: 150, gdd_end: 400 },
      { name: '开花', gdd_start: 400, gdd_end: 650 },
      { name: '结果', gdd_start: 650, gdd_end: 1000 },
      { name: '成熟', gdd_start: 1000, gdd_end: 1000 },
    ],
  },
};

const MODEL_VERSION = '1.0.0-rule-gdd';

/**
 * GDD 累积（基于历史同期日均温 + 基准温度）
 * 简化：用过去 N 天的"日均温"近似累积 GDD
 */
function estimateCumulativeGdd(plantDate: Date, baseTemp: number): number {
  const today = new Date();
  const daysSince = Math.floor((today.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince <= 0) return 0;

  // V1.1 无 daily_records 环境数据，用季节经验值估算
  // 春秋季日均温约 18℃，夏季 28℃，冬季 8℃
  const month = today.getMonth() + 1;  // 1-12
  let dailyAvgTemp = 18;
  if ([6, 7, 8].includes(month)) dailyAvgTemp = 28;
  else if ([12, 1, 2].includes(month)) dailyAvgTemp = 8;

  const dailyGdd = Math.max(0, dailyAvgTemp - baseTemp);
  return Math.round(dailyGdd * daysSince);
}

export async function predictGrowth(input: GrowthPredictInput): Promise<GrowthPredictResult> {
  const cropProfile = CROP_STAGES[input.crop_type] || CROP_STAGES['默认'];
  const baseTemp = input.base_temperature || cropProfile.base_temp;
  const plantDate = input.plant_date ? new Date(input.plant_date) : new Date();
  const today = new Date();
  const daysSince = Math.max(0, Math.floor((today.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24)));

  // 1. 累积 GDD
  const cumulativeGdd = estimateCumulativeGdd(plantDate, baseTemp);

  // 2. 当前阶段
  let currentStage = '萌发';
  for (const stage of cropProfile.stages) {
    if (cumulativeGdd >= stage.gdd_start && cumulativeGdd <= stage.gdd_end) {
      currentStage = stage.name;
      break;
    }
  }
  if (cumulativeGdd > cropProfile.total_gdd) currentStage = '成熟（采收期）';

  // 3. 预期采收日期（基于 GDD 累积速率推算）
  const remainingGdd = cropProfile.total_gdd - cumulativeGdd;
  const dailyAvgTempEstimate = 18;  // 简化
  const dailyGddAvg = Math.max(1, dailyAvgTempEstimate - baseTemp);
  const daysToHarvest = remainingGdd > 0 ? Math.ceil(remainingGdd / dailyGddAvg) : 0;
  const harvestDate = new Date(today.getTime() + daysToHarvest * 24 * 60 * 60 * 1000);

  // 4. 预估产量（基于历史同作物平均 × 阶段完成度）
  const db = getDatabase();
  const yieldResult = db.exec(`
    SELECT AVG(harvest_quantity) AS avg_yield, COUNT(*) AS n
    FROM harvest_records
    WHERE crop_name = ? AND harvest_quantity > 0
  `, [input.crop_type]);
  const avgYield = Number(yieldResult[0]?.values?.[0]?.[0] || 10);
  const sampleN = Number(yieldResult[0]?.values?.[0]?.[1] || 0);

  // 阶段完成度系数（基于累积 GDD / 总 GDD）
  const completionRatio = Math.min(1, cumulativeGdd / cropProfile.total_gdd);
  const yieldPrediction = Math.round(avgYield * completionRatio * 10) / 10;
  const yieldLow = Math.round(yieldPrediction * 0.85 * 10) / 10;
  const yieldHigh = Math.round(yieldPrediction * 1.15 * 10) / 10;

  // 5. 阶段时间预估
  const stageEstimate: StageEstimate[] = cropProfile.stages.map(s => {
    // 各阶段预估持续天数（基于日均 GDD）
    const stageGdd = s.gdd_end - s.gdd_start;
    const stageDays = Math.max(1, Math.ceil(stageGdd / dailyGddAvg));
    const stageStartOffset = Math.max(0, Math.floor((s.gdd_start - cumulativeGdd) / dailyGddAvg));
    const stageStart = new Date(today.getTime() + stageStartOffset * 24 * 60 * 60 * 1000);
    const stageEnd = new Date(stageStart.getTime() + stageDays * 24 * 60 * 60 * 1000);
    return {
      stage_name: s.name,
      stage_start: stageStart.toISOString().split('T')[0],
      stage_end: stageEnd.toISOString().split('T')[0],
      cumulative_gdd: s.gdd_start,
    };
  });

  // 6. 异常预警
  const alerts: string[] = [];
  if (daysSince > 30 && cumulativeGdd < 100) {
    alerts.push(`⚠️ 生长缓慢：已 ${daysSince} 天但累积 GDD 仅 ${cumulativeGdd}（可能低温/缺水）`);
  }
  if (sampleN === 0) {
    alerts.push(`⚠️ 缺历史产量数据（PPT 要求 ≥100 样本训练）— 当前用规则默认值估算`);
  }
  if (completionRatio < 0.3 && daysSince > 60) {
    alerts.push(`⚠️ 阶段进度滞后：${daysSince} 天完成度仅 ${(completionRatio * 100).toFixed(0)}%`);
  }

  // 7. XAI 推理依据
  const xai_reasons: string[] = [
    `当前阶段：${currentStage}（累积 GDD ${cumulativeGdd}/${cropProfile.total_gdd}，完成度 ${(completionRatio * 100).toFixed(0)}%）`,
    `预期采收：${harvestDate.toISOString().split('T')[0]}（${daysToHarvest} 天后）`,
    `产量预测：${yieldPrediction}kg（基于 ${sampleN} 条历史均值 ${avgYield}kg × 完成度）`,
    `基准温度：${baseTemp}℃（${input.crop_type} 默认）`,
  ];
  if (alerts.length > 0) {
    xai_reasons.push(`⚠️ 异常：${alerts.join('；')}`);
  }

  return {
    crop_type: input.crop_type,
    current_stage: currentStage,
    days_since_planting: daysSince,
    cumulative_gdd: cumulativeGdd,
    expected_harvest_date: harvestDate.toISOString().split('T')[0],
    days_to_harvest: daysToHarvest,
    yield_prediction_kg: yieldPrediction,
    yield_confidence_low: yieldLow,
    yield_confidence_high: yieldHigh,
    stage_estimate: stageEstimate,
    alerts,
    model_version: MODEL_VERSION,
    model_type: 'rule-based',
    xai_reasons,
  };
}
