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
 * 从 iot_sensor_readings 读取真实历史日均温（按 greenhouse_id）
 * 2026-08-24 PR3：替换 V1 季节经验值（夏季 28/春秋 18/冬季 8℃）
 * - 数据源：iot_sensor_readings.sensor_type='temperature'，按日聚合
 * - 无数据 → 返回 null（由调用方决定是否 Fail Loud）
 */
function queryHistoricalDailyTemp(greenhouseId: string, startDate: Date, endDate: Date): { date: string; avgTemp: number }[] {
  const db = getDatabase();
  const start = startDate.toISOString();
  const end = endDate.toISOString();
  const stmt = db.prepare(`
    SELECT DATE(recorded_at) AS day, AVG(value) AS avg_temp
    FROM iot_sensor_readings
    WHERE greenhouse_id = ? AND sensor_type = 'temperature'
      AND recorded_at >= ? AND recorded_at <= ?
    GROUP BY DATE(recorded_at)
    ORDER BY day
  `);
  stmt.bind([greenhouseId, start, end]);
  const result: { date: string; avgTemp: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    result.push({ date: String(row.day), avgTemp: Number(row.avg_temp) || 0 });
  }
  stmt.free();
  return result;
}

/**
 * GDD 累积（2026-08-24 PR3：优先 iot_sensor_readings 真实数据，无数据抛错）
 * - 有 greenhouseId + iot 数据 → 用真实日均温累加 GDD（每天 max(0, temp - baseTemp) 求和）
 * - 无 greenhouseId 或无 iot 数据 → 抛错（Fail Loud，禁止 mock）
 */
function estimateCumulativeGdd(plantDate: Date, baseTemp: number, greenhouseId?: string): number {
  const today = new Date();
  const daysSince = Math.floor((today.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince <= 0) return 0;

  if (!greenhouseId) {
    throw new Error(
      'AI-04 生长预测需要 greenhouse_id 才能读取 iot_sensor_readings 真实温度数据；' +
      '如该任务未关联温室，请联系前端补充上下文',
    );
  }
  const dailyTemps = queryHistoricalDailyTemp(greenhouseId, plantDate, today);
  if (dailyTemps.length === 0) {
    throw new Error(
      `温室 ${greenhouseId} 在 ${plantDate.toISOString().split('T')[0]} ~ ${today.toISOString().split('T')[0]} 期间` +
      '无 iot_sensor_readings 温度数据，无法计算真实 GDD。请确认传感器已部署并上报数据',
    );
  }

  // 用真实日均温累加 GDD
  let totalGdd = 0;
  for (const { avgTemp } of dailyTemps) {
    totalGdd += Math.max(0, avgTemp - baseTemp);
  }
  return Math.round(totalGdd);
}

export async function predictGrowth(input: GrowthPredictInput): Promise<GrowthPredictResult> {
  // 2026-08-24 PR3：Fail Loud 校验，缺 crop_type 直接抛错（前端能看到明确提示）
  if (!input.crop_type) {
    throw new Error('AI-04 生长预测必须提供 crop_type（作物类型）参数');
  }
  if (!input.greenhouse_id) {
    throw new Error('AI-04 生长预测必须提供 greenhouse_id 才能读取 iot_sensor_readings 真实温度数据');
  }

  const cropProfile = CROP_STAGES[input.crop_type] || CROP_STAGES['默认'];
  const baseTemp = input.base_temperature || cropProfile.base_temp;
  const plantDate = input.plant_date ? new Date(input.plant_date) : new Date();
  const today = new Date();
  const daysSince = Math.max(0, Math.floor((today.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24)));

  // 1. 累积 GDD（2026-08-24 PR3：优先真实 iot 数据，无数据抛错）
  const cumulativeGdd = estimateCumulativeGdd(plantDate, baseTemp, input.greenhouse_id);

  // 2. 当前阶段
  let currentStage = '萌发';
  for (const stage of cropProfile.stages) {
    if (cumulativeGdd >= stage.gdd_start && cumulativeGdd <= stage.gdd_end) {
      currentStage = stage.name;
      break;
    }
  }
  if (cumulativeGdd > cropProfile.total_gdd) currentStage = '成熟（采收期）';

  // 3. 预期采收日期（基于 iot 真实日均温推算未来 GDD 累积速率）
  // → 用最近 7 天真实日均温均值（替换 V1 简化值 18℃）
  const recentTemps = queryHistoricalDailyTemp(input.greenhouse_id,
    new Date(today.getTime() - 7 * 24 * 3600 * 1000), today);
  const dailyAvgTempEstimate = recentTemps.length > 0
    ? recentTemps.reduce((s, d) => s + d.avgTemp, 0) / recentTemps.length
    : 0;
  if (dailyAvgTempEstimate === 0) {
    throw new Error(`温室 ${input.greenhouse_id} 最近 7 天无温度数据，无法预测采收日期`);
  }
  const dailyGddAvg = Math.max(1, dailyAvgTempEstimate - baseTemp);
  const remainingGdd = cropProfile.total_gdd - cumulativeGdd;
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
