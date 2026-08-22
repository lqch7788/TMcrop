/**
 * M1.5 数据准备度评估脚本
 *
 * 2026-08-22：量化 V1.1 现有数据 vs AI 训练需求的差距
 *
 * 用法：cd server && npx tsx scripts/ai-data-assessment.ts
 */

import { initDatabase, getDatabase } from '../src/db';

interface TableStats {
  name: string;
  rows: number;
  date_range?: { min: string; max: string; span_days: number };
  relevant_modules: string[];
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  M1.5 AI 数据准备度评估 — V1.1 现状 vs PPT 要求');
  console.log('═'.repeat(70));
  console.log();

  await initDatabase();
  const db = getDatabase();

  // === 1. DB 基本信息 ===
  const dbInfo = db.exec(`PRAGMA page_count; PRAGMA page_size;`);
  const pages = dbInfo[0]?.values?.[0]?.[0] || 0;
  const pageSize = dbInfo[1]?.values?.[0]?.[0] || 4096;
  const dbSizeMB = ((pages * pageSize) / 1024 / 1024).toFixed(2);
  console.log(`[DB 基本信息]`);
  console.log(`  文件大小: ${dbSizeMB} MB`);
  console.log(`  表数量: ${getTableCount(db)}`);
  console.log();

  // === 2. AI 训练关键表 ===
  console.log('[AI 训练关键表行数]');
  const keyTables: TableStats[] = [
    { name: 'farm_tasks', rows: getCount(db, 'farm_tasks'), relevant_modules: ['AI-01 派工', 'AI-06 工时'] },
    { name: 'harvest_records', rows: getCount(db, 'harvest_records'), relevant_modules: ['AI-04 产量预测'] },
    { name: 'daily_records', rows: getCount(db, 'daily_records'), relevant_modules: ['AI-04 生长预测'] },
    { name: 'attendance_records', rows: getCount(db, 'attendance_records'), relevant_modules: ['AI-15 出勤异常', 'AI-02 排班'] },
    { name: 'employees', rows: getCount(db, 'employees'), relevant_modules: ['AI-02 排班', 'AI-01 派工'] },
    { name: 'crop_instances', rows: getCount(db, 'crop_instances'), relevant_modules: ['AI-04 生长预测'] },
    { name: 'iot_sensors', rows: getCount(db, 'iot_sensors'), relevant_modules: ['AI-05 病虫害预警', 'AI-14 异常检测'] },
    { name: 'iot_devices', rows: getCount(db, 'iot_devices'), relevant_modules: ['AI-05/AI-14'] },
    { name: 'pest_disease_dict', rows: getCount(db, 'pest_disease_dict'), relevant_modules: ['AI-09 图像识别'] },
    { name: 'inventory_stock', rows: getCount(db, 'inventory_stock'), relevant_modules: ['AI-07 资源优化'] },
  ];

  keyTables.forEach(t => {
    const gap = assessGap(t.name, t.rows);
    console.log(`  ${t.name.padEnd(25)} ${String(t.rows).padStart(6)} 行  [${t.relevant_modules.join(', ')}]  ${gap}`);
  });
  console.log();

  // === 3. 时间跨度分析（针对训练数据）===
  console.log('[时间跨度分析]');
  const timeSpanTables = ['farm_tasks', 'harvest_records', 'daily_records', 'attendance_records'];
  for (const table of timeSpanTables) {
    const span = getDateRange(db, table);
    if (span) {
      const pptTarget = 730; // PPT 要求 2 年 = 730 天
      const pct = ((span.span_days / pptTarget) * 100).toFixed(1);
      console.log(`  ${table.padEnd(25)} ${span.min} ~ ${span.max} (${span.span_days} 天, PPT 要求 2 年 = ${pptTarget} 天, 达成率 ${pct}%)`);
    } else {
      console.log(`  ${table.padEnd(25)} ❌ 无时间字段或数据为空`);
    }
  }
  console.log();

  // === 4. 环境数据现状（AI-05 病虫害预警关键）===
  console.log('[环境数据现状 - AI-05 预警关键]');
  const envCols = db.exec(`PRAGMA table_info(daily_records)`);
  const hasEnvCols = envCols[0]?.values.some((row: any[]) => {
    const colName = String(row[1]).toLowerCase();
    return ['temp', 'humid', 'light', 'co2', 'soil'].some(k => colName.includes(k));
  });
  console.log(`  daily_records 环境字段: ${hasEnvCols ? '✅ 有' : '❌ 无（温度/湿度/光照/CO2 全部缺失）'}`);
  console.log(`  iot_sensors 数据: ${getCount(db, 'iot_sensors')} 条（AI-05 需要实时环境数据）`);
  console.log(`  → 结论：AI-05 病虫害预警（提前 3 天）依赖环境数据，${hasEnvCols ? '已有' : '缺少'}基础`);
  console.log();

  // === 5. 病虫害图片现状（AI-09 关键）===
  console.log('[病虫害图片现状 - AI-09 识别关键]');
  const dictRows = getCount(db, 'pest_disease_dict');
  const dictWithImage = db.exec(`SELECT COUNT(*) FROM pest_disease_dict WHERE images IS NOT NULL AND images != ''`)[0]?.values?.[0]?.[0] || 0;
  const dictPct = dictRows > 0 ? ((dictWithImage / dictRows) * 100).toFixed(1) : '0';
  console.log(`  pest_disease_dict 总条目: ${dictRows} 种`);
  console.log(`  含图片条目: ${dictWithImage} 种 (${dictPct}%)`);
  console.log(`  PPT 要求: ≥5000 张标注图片 (50+ 种病虫害)`);
  console.log(`  → 缺口: ${5000 - (dictWithImage as number)} 张图片`);
  console.log();

  // === 6. 人员数据现状（AI-02 排班关键）===
  console.log('[人员数据现状 - AI-02 排班关键]');
  const empRows = getCount(db, 'employees');
  const empWithSkills = db.exec(`SELECT COUNT(*) FROM employees WHERE skills IS NOT NULL AND skills != ''`)[0]?.values?.[0]?.[0] || 0;
  console.log(`  employees 总人数: ${empRows} 人`);
  console.log(`  含技能标签人数: ${empWithSkills} 人`);
  console.log(`  PPT 要求: ≥30 人（排班训练样本）`);
  console.log(`  → 缺口: ${Math.max(0, 30 - (empRows as number))} 人`);
  console.log();

  // === 7. 风险评估（Risk 分析师量化）===
  console.log('[风险量化评估（基于 V1.1 现状）]');
  const risks: { risk: string; prob: string; impact: string; score: number }[] = [
    { risk: '数据准备延期（缺病虫害图片+IoT）', prob: '90%', impact: '高', score: 9.0 },
    { risk: `病虫害图片 <5000 (当前 ${dictWithImage})`, prob: '80%', impact: '高', score: 8.0 },
    { risk: '历史任务数据 <1 年 (farm_tasks 仅 84 行)', prob: '70%', impact: '高', score: 7.0 },
    { risk: `员工数据不足 (当前 ${empRows} 人，需求 30+)`, prob: '60%', impact: '中', score: 6.0 },
    { risk: '环境数据完全缺失 (AI-05 预警无基础)', prob: '90%', impact: '高', score: 9.0 },
    { risk: 'AI-01 准确率 <85% (V1.1 数据量不足)', prob: '60%', impact: '中', score: 6.0 },
  ];
  risks.sort((a, b) => b.score - a.score);
  risks.forEach(r => {
    const color = r.score >= 8 ? '🔴' : r.score >= 6 ? '🟡' : '🟢';
    console.log(`  ${color} ${r.risk.padEnd(50)} ${r.prob.padEnd(8)} ${r.impact.padEnd(6)} ${r.score.toFixed(1)}`);
  });
  console.log();

  // === 8. M1.5 数据准备路线 ===
  console.log('[M1.5 数据准备路线建议]');
  console.log('  1. 公开数据集下载 (PlantVillage / AI Challenger 病害) → 2000+ 张图片');
  console.log('  2. Label Studio 部署 + 标注文档/SOP → 启动自标注');
  console.log('  3. IoT 硬件询价 (21 温室 × 2 传感器) → 报价单');
  console.log('  4. 历史任务回溯录入 (6 员工手工) → 500+ 行历史');
  console.log('  5. SQL 验证训练数据时间跨度 → 数据准备度报告');
  console.log();

  // === 9. AI-06 工时预测可行性（Step 1 立即可启动）===
  console.log('[Step 1 AI-06 工时预测可行性]');
  const farmTasksCount = getCount(db, 'farm_tasks');
  const hasEstimateHours = db.exec(`PRAGMA table_info(farm_tasks)`);
  const hasHoursCol = hasEstimateHours[0]?.values?.some((r: any[]) => String(r[1]).toLowerCase().includes('hour'));
  console.log(`  farm_tasks 总数: ${farmTasksCount} 行（AI-06 训练数据）`);
  console.log(`  farm_tasks 是否含工时字段: ${hasHoursCol ? '✅ 是（可直接训练）' : '❌ 否（需扩展字段）'}`);
  console.log(`  → AI-06 现状可行性: ${farmTasksCount >= 30 && hasHoursCol ? '✅ 可立即启动 MVP' : '⚠️ 需扩展 farm_tasks 字段'}`);
  console.log();

  console.log('═'.repeat(70));
  console.log('  评估完成。建议：立即启动 M1.5 数据准备 + AI-06 MVP 双轨并行');
  console.log('═'.repeat(70));
}

function getTableCount(db: any): number {
  const r = db.exec(`SELECT COUNT(*) FROM sqlite_master WHERE type='table'`);
  return r[0]?.values?.[0]?.[0] || 0;
}

function getCount(db: any, table: string): number {
  try {
    const r = db.exec(`SELECT COUNT(*) FROM ${table}`);
    return r[0]?.values?.[0]?.[0] || 0;
  } catch (e) {
    return 0;
  }
}

function getDateRange(db: any, table: string): { min: string; max: string; span_days: number } | null {
  try {
    // 尝试常见时间字段名
    const cols = db.exec(`PRAGMA table_info(${table})`)[0]?.values || [];
    const dateColNames = cols
      .map((r: any[]) => String(r[1]))
      .filter((c: string) => /(date|time|created_at|updated_at)/i.test(c));

    if (dateColNames.length === 0) return null;

    for (const col of dateColNames) {
      try {
        const r = db.exec(`SELECT MIN(${col}), MAX(${col}) FROM ${table} WHERE ${col} IS NOT NULL`);
        if (!r[0]?.values?.[0]) continue;
        const [min, max] = r[0].values[0];
        if (!min || !max) continue;
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const spanDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        return { min: min.split('T')[0], max: max.split('T')[0], span_days: spanDays };
      } catch (e) {}
    }
    return null;
  } catch (e) {
    return null;
  }
}

function assessGap(name: string, rows: number): string {
  const gaps: Record<string, { target: number; label: string }> = {
    farm_tasks: { target: 1000, label: 'PPT 1000+ 推荐反馈' },
    harvest_records: { target: 500, label: 'PPT 500+ 产量历史' },
    daily_records: { target: 730, label: 'PPT 2 年生长记录' },
    attendance_records: { target: 5400, label: '30 人 × 6 月考勤' },
    employees: { target: 30, label: 'PPT 30 人排班' },
    crop_instances: { target: 100, label: 'PPT 100+ 训练样本' },
    iot_sensors: { target: 42, label: '需 42 套传感器 (21 温室 × 2)' },
    iot_devices: { target: 42, label: '同上' },
    pest_disease_dict: { target: 72, label: '需全部 72 种含图片' },
    inventory_stock: { target: 200, label: 'PPT 200+ 库存预警样本' },
  };

  const cfg = gaps[name];
  if (!cfg) return rows > 0 ? 'OK' : '⚠️';

  const pct = Math.min(100, (rows / cfg.target * 100)).toFixed(0);
  const icon = Number(pct) >= 80 ? '✅' : Number(pct) >= 40 ? '⚠️' : '🔴';
  return `${icon} ${pct}%`;
}

main().catch(e => {
  console.error('[ai-data-assessment] 异常:', e);
  process.exit(1);
});
