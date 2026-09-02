/**
 * AI-10 作物生长状态识别服务（V2 — 修 GROUP BY + 多作物 GDD 字典）
 * 2026-09-02：v0.3.1 修复版
 *
 * 修复前问题（V1）：
 *   - L75-99: GROUP BY remarks + 二次查询 COUNT(*) hack（注释自承"此处用 COUNT(DISTINCT id) 更准确"）
 *   - L43 + L154-159: 番茄硬编码 TARGET_GDD=1600 + 5 段阈值，葡萄/黄瓜/小麦全部 fallback 到萌发期
 *   - L106-118: farm_tasks 查询用 task_content LIKE（task_content 是 JSON 字段，关键词匹配不准）
 *   - L195: 缺素检测仅基于 remarks 关键词，未结合 IoT 传感器（EC/pH 可预示缺素）
 *
 * V2 修复：
 *   - GROUP BY 改 COUNT(DISTINCT id) 单次 SQL
 *   - 多作物 GDD 字典（番茄/草莓/黄瓜/葡萄/叶菜/玉米各自不同）
 *   - farm_tasks 改查 task_title + task_type（更直接）
 *   - 集成 IoT EC/pH 异常作为辅助异常源
 */

import { getDatabase } from '../../db';

interface GrowthStateInput {
  crop_type: string;
  batch_id?: string;
  greenhouse_id?: string;
  current_gdd?: number;
  base_temperature?: number;          // V2 新增：可覆盖默认基准温度
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
  growth_progress_percent: number;
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  growth_rate_index: number;
  estimated_yield_index: number;
  deficiencies: NutrientDeficiency[];
  recommendations: string[];
  model_version: string;
  model_type: 'data-driven';
  source: { records: number; abnormal_records: number; iot_alerts: number };
  xai_reasons: string[];
}

const MODEL_VERSION = '2.0.0-data-driven-multi-crop';

// V2：多作物 GDD 字典（真实农业数据）
const CROP_GDD_PROFILE: Record<string, {
  base_temp: number;
  stages: { name: string; gdd_min: number }[];
  target_total_gdd: number;
}> = {
  番茄: { base_temp: 10, target_total_gdd: 1600, stages: [
    { name: '萌发期', gdd_min: 0 },
    { name: '苗期', gdd_min: 150 },
    { name: '开花期', gdd_min: 400 },
    { name: '结果期', gdd_min: 700 },
    { name: '成熟期', gdd_min: 1200 },
  ] },
  草莓: { base_temp: 5, target_total_gdd: 900, stages: [
    { name: '萌发期', gdd_min: 0 },
    { name: '苗期', gdd_min: 100 },
    { name: '花期', gdd_min: 300 },
    { name: '果期', gdd_min: 500 },
    { name: '成熟期', gdd_min: 700 },
  ] },
  黄瓜: { base_temp: 12, target_total_gdd: 1200, stages: [
    { name: '萌发期', gdd_min: 0 },
    { name: '苗期', gdd_min: 120 },
    { name: '开花期', gdd_min: 350 },
    { name: '结果期', gdd_min: 600 },
    { name: '成熟期', gdd_min: 1000 },
  ] },
  葡萄: { base_temp: 10, target_total_gdd: 2200, stages: [
    { name: '萌发期', gdd_min: 0 },
    { name: '苗期', gdd_min: 200 },
    { name: '花期', gdd_min: 500 },
    { name: '果期', gdd_min: 1000 },
    { name: '成熟期', gdd_min: 1800 },
  ] },
  叶菜: { base_temp: 8, target_total_gdd: 600, stages: [
    { name: '萌发期', gdd_min: 0 },
    { name: '苗期', gdd_min: 80 },
    { name: '生长期', gdd_min: 300 },
    { name: '采收期', gdd_min: 500 },
  ] },
  玉米: { base_temp: 10, target_total_gdd: 1700, stages: [
    { name: '萌发期', gdd_min: 0 },
    { name: '苗期', gdd_min: 150 },
    { name: '拔节期', gdd_min: 400 },
    { name: '抽雄期', gdd_min: 800 },
    { name: '成熟期', gdd_min: 1400 },
  ] },
};

const NUTRIENT_DEFICIENCY_RULES: Record<string, NutrientDeficiency> = {
  N: { type: 'N', nutrient_name: '缺氮', symptoms: ['叶片黄化（老叶先）', '生长缓慢', '植株矮小'], confidence: 0.75, remedy: '追施氮肥（如尿素）' },
  K: { type: 'K', nutrient_name: '缺钾', symptoms: ['叶缘焦枯', '果实发育不良', '抗病力下降'], confidence: 0.7, remedy: '追施钾肥（如硫酸钾）' },
  P: { type: 'P', nutrient_name: '缺磷', symptoms: ['叶片暗绿', '根系发育不良', '花期延迟'], confidence: 0.65, remedy: '追施磷肥（如过磷酸钙）' },
  Mg: { type: 'Mg', nutrient_name: '缺镁', symptoms: ['叶脉间黄化', '老叶症状明显'], confidence: 0.6, remedy: '叶面喷施硫酸镁' },
  Ca: { type: 'Ca', nutrient_name: '缺钙', symptoms: ['果实顶腐', '新叶卷曲'], confidence: 0.6, remedy: '叶面喷施氯化钙' },
};

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

/**
 * V2 修复：单次 SQL 用 COUNT(DISTINCT id) 解决 GROUP BY bug
 */
function queryCropRecords(db: any, cropType: string): {
  recordCount: number;
  abnormalCount: number;
  symptomRecords: string[];
} {
  const like = `%${cropType}%`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRows = db.exec(
    `SELECT COUNT(DISTINCT id) AS n
     FROM daily_records
     WHERE crop_name LIKE ? AND status = 'active'`,
    [like] as any[]
  );
  const recordCount = Number(totalRows[0]?.values?.[0]?.[0] || 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abnormalRows = db.exec(
    `SELECT COUNT(DISTINCT id) AS n, GROUP_CONCAT(remarks, '|') AS symptoms
     FROM daily_records
     WHERE crop_name LIKE ?
       AND status = 'active'
       AND (remarks LIKE '%病%' OR remarks LIKE '%虫%' OR remarks LIKE '%异常%'
            OR remarks LIKE '%萎蔫%' OR remarks LIKE '%黄化%' OR remarks LIKE '%枯%'
            OR remarks LIKE '%缺%' OR remarks LIKE '%腐烂%')`,
    [like] as any[]
  );
  const abnormalCount = Number(abnormalRows[0]?.values?.[0]?.[0] || 0);
  const symptomRecords = String(abnormalRows[0]?.values?.[0]?.[1] || '')
    .split('|')
    .filter(Boolean);

  return { recordCount, abnormalCount, symptomRecords };
}

/**
 * V2 修复：farm_tasks 改查 task_title + task_type（不用 task_content JSON 字段）
 */
function queryTaskCompletion(db: any, cropType: string): { total: number; completed: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stmt = db.exec(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
     FROM farm_tasks
     WHERE task_title LIKE ? OR task_type LIKE ?`,
    [`%${cropType}%`, `%${cropType}%`] as any[]
  );
  if (stmt[0] && stmt[0].values.length > 0) {
    const row = stmt[0].values[0];
    return { total: Number(row[0]) || 0, completed: Number(row[1]) || 0 };
  }
  return { total: 0, completed: 0 };
}

/**
 * V2 新增：IoT 异常源（EC/pH 异常预示缺素）
 */
function queryIotAlerts(db: any, greenhouseId?: string): number {
  if (!greenhouseId) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = db.exec(
    `SELECT COUNT(*) AS n FROM iot_alerts
     WHERE greenhouse_id = ?
       AND (sensor_type IN ('ec', 'ph', 'soil_moisture')
            AND value < min_value OR value > max_value)`,
    [greenhouseId] as any[]
  );
  return Number(result[0]?.values?.[0]?.[0] || 0);
}

export async function identifyGrowthState(input: GrowthStateInput): Promise<GrowthStateResult> {
  const db = getDatabase();
  const xai_reasons: string[] = [];

  // 1. 多作物 GDD 字典（V2 新增）
  const profile = CROP_GDD_PROFILE[input.crop_type] || {
    base_temp: input.base_temperature ?? 10,
    target_total_gdd: 1500,
    stages: [
      { name: '萌发期', gdd_min: 0 },
      { name: '苗期', gdd_min: 150 },
      { name: '开花期', gdd_min: 400 },
      { name: '结果期', gdd_min: 700 },
      { name: '成熟期', gdd_min: 1200 },
    ],
  };
  const baseTemp = input.base_temperature ?? profile.base_temp;
  const targetGdd = profile.target_total_gdd;

  // 2. GDD 计算（priority: input → IoT → error）
  let gdd: number | undefined = input.current_gdd;
  if (gdd === undefined && input.greenhouse_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stmt = db.prepare(
      `SELECT DATE(recorded_at) AS day, AVG(value) AS avg_temp
       FROM iot_sensor_readings
       WHERE greenhouse_id = ? AND sensor_type = 'temperature'
         AND recorded_at >= datetime('now', '-180 day')
       GROUP BY DATE(recorded_at)
       ORDER BY day`
    );
    stmt.bind([input.greenhouse_id]);
    let totalGdd = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      totalGdd += Math.max(0, (Number(row.avg_temp) || 0) - baseTemp);
    }
    stmt.free();
    if (totalGdd > 0) gdd = Math.round(totalGdd);
  }
  if (gdd === undefined) {
    throw new Error(
      `AI-10 生长状态识别缺少 GDD 数据源：请传入 current_gdd 或 greenhouse_id（用于读取 iot_sensor_readings）`
    );
  }

  // 3. 阶段判断（V2：根据作物配置）
  let stage = profile.stages[0].name;
  for (const s of profile.stages) {
    if (gdd >= s.gdd_min) stage = s.name;
  }
  const growthProgressPercent = Math.min(100, Math.round((gdd / targetGdd) * 100));
  xai_reasons.push(
    `当前阶段：${stage}（累积 GDD ${gdd} / 目标 ${targetGdd} ${input.crop_type}）`
  );

  // 4. 健康评分（daily_records + IoT 异常）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { recordCount, abnormalCount, symptomRecords } = queryCropRecords(db, input.crop_type);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iotAlerts = queryIotAlerts(db, input.greenhouse_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { total, completed } = queryTaskCompletion(db, input.crop_type);

  let growthRateIndex = 85;
  if (abnormalCount > 0) growthRateIndex -= Math.min(60, abnormalCount * 15);
  if (iotAlerts > 0) growthRateIndex -= Math.min(20, iotAlerts * 5); // V2：IoT EC/pH 异常扣分
  if (total > 0 && completed / total < 0.6) growthRateIndex -= 10;
  if (recordCount >= 10) growthRateIndex += 5;
  growthRateIndex = Math.max(5, Math.min(100, growthRateIndex));

  const healthStatus: GrowthStateResult['health_status'] =
    growthRateIndex >= 90 ? 'excellent' :
    growthRateIndex >= 70 ? 'good' :
    growthRateIndex >= 50 ? 'fair' :
    growthRateIndex >= 30 ? 'poor' : 'critical';

  xai_reasons.push(
    `健康评分：${growthRateIndex}/100 → ${healthStatus}（记录 ${recordCount} 条，异常 ${abnormalCount} 条，IoT 异常 ${iotAlerts} 条，任务完成率 ${total ? Math.round((completed / total) * 100) : 0}%）`
  );

  // 5. 缺素检测（V2：症状记录 + IoT 异常双源）
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
  // IoT EC 异常可能预示缺 K 或缺 N
  if (iotAlerts > 0 && !foundTypes.has('K')) {
    foundTypes.add('K');
    deficiencies.push({ ...NUTRIENT_DEFICIENCY_RULES.K, confidence: 0.5 });
  }
  xai_reasons.push(
    deficiencies.length > 0
      ? `缺素检测：发现 ${deficiencies.length} 种（${deficiencies.map(d => d.nutrient_name).join('、')}，来源 daily_records 症状 ${symptomRecords.length} 条 + IoT EC ${iotAlerts} 条）`
      : '缺素检测：daily_records 无缺素症状记录'
  );

  // 6. 产量指数
  const estimatedYieldIndex = Math.max(0, Math.min(100, Math.round((gdd / targetGdd) * 80 + growthRateIndex * 0.2)));

  // 7. 建议
  const recommendations: string[] = [];
  if (deficiencies.length > 0) {
    recommendations.push(...deficiencies.map((d) => `${d.nutrient_name}：${d.remedy}`));
  }
  if (abnormalCount > 0) {
    recommendations.push(`发现 ${abnormalCount} 条异常记录，建议加强巡查并排查具体原因`);
  }
  if (iotAlerts > 0) {
    recommendations.push(`IoT 传感器告警 ${iotAlerts} 条（EC/pH/土壤湿度异常），需检查设施`);
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
    growth_progress_percent: growthProgressPercent,
    health_status: healthStatus,
    growth_rate_index: growthRateIndex,
    estimated_yield_index: estimatedYieldIndex,
    deficiencies,
    recommendations,
    model_version: MODEL_VERSION,
    model_type: 'data-driven',
    source: { records: recordCount, abnormal_records: abnormalCount, iot_alerts: iotAlerts },
    xai_reasons,
  };
}
