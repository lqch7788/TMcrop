/**
 * v0.3 P0-1：创建 batch_timeline_view 视图
 * 用 better-sqlite3 在 sql.js 主服务之外的脚本中执行
 * sql.js 重启时会读取新视图
 */

// 此脚本是一次性迁移工具，使用 require 绕过 better-sqlite3 类型检查
// 运行时类型推断失败需要 eslint-disable
/* eslint-disable */
// @ts-nocheck

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_PATH = `${DB_PATH}.backup-pre-view-${Date.now()}`;

console.log('=== v0.3 P0-1: 创建 batch_timeline_view 视图 ===\n');

// 1. 备份
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`✅ 备份: ${BACKUP_PATH}`);
}

// 2. 打开 better-sqlite3
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
console.log('✅ 已打开 better-sqlite3 + WAL\n');

// 3. 检查字段是否就位
function columnExists(tableName, columnName) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return cols.some((c) => c.name === columnName);
  } catch (e) {
    return false;
  }
}

console.log('--- 检查依赖字段 ---');
const checks = [
  { table: 'farm_tasks', column: 'progress_pct' },
  { table: 'farm_tasks', column: 'batch_code' },
  { table: 'farm_tasks', column: 'plan_date' },
  { table: 'farm_operation_records', column: 'batch_code' },
  { table: 'farm_operation_records', column: 'operation_date' },
  { table: 'farm_operation_records', column: 'workload' },
  { table: 'daily_records', column: 'related_code' },
  { table: 'harvest_records', column: 'batch_code' },
  { table: 'planting_move_records', column: 'planting_id' },
];

let allOk = true;
for (const c of checks) {
  const ok = columnExists(c.table, c.column);
  if (!ok) allOk = false;
  console.log(`  ${ok ? '✓' : '✗'} ${c.table}.${c.column}`);
}

if (!allOk) {
  console.log('\n❌ 依赖字段缺失！请先跑 migrateV03.ts');
  process.exit(1);
}

console.log('\n--- 创建视图 ---');

// 4. 删除旧视图（如果有）
try {
  db.exec('DROP VIEW IF EXISTS batch_timeline_view');
  console.log('  ✓ 删除旧视图（如有）');
} catch (e) {
  console.log('  • 删除旧视图失败（可忽略）:', e.message);
}

// 5. 创建视图
const viewSql = `
  CREATE VIEW batch_timeline_view AS
  -- 1. 农事任务
  SELECT
    'farm_task' AS event_type,
    id,
    batch_code,
    plan_date AS event_date,
    task_title AS title,
    task_type AS subtype,
    CASE WHEN status = 'completed' THEN 100 ELSE COALESCE(progress_pct, 0) END AS progress,
    status,
    assignee_name AS operator,
    NULL AS quantity,
    NULL AS unit,
    json_object(
      'task_type', task_type,
      'priority', priority,
      'plan_time', plan_time,
      'completion_date', completion_date
    ) AS detail
  FROM farm_tasks
  WHERE batch_code IS NOT NULL

  UNION ALL

  -- 2. 作业流水
  SELECT
    'operation' AS event_type,
    id,
    batch_code,
    operation_date AS event_date,
    operation_type_name AS title,
    operation_type AS subtype,
    NULL AS progress,
    status,
    operator_name AS operator,
    workload AS quantity,
    unit AS unit,
    json_object(
      'operation_type', operation_type,
      'workers', workers,
      'duration_hours', duration,
      'workload', workload,
      'workload_unit', unit
    ) AS detail
  FROM farm_operation_records
  WHERE batch_code IS NOT NULL

  UNION ALL

  -- 3. 每日记录
  SELECT
    'daily_record' AS event_type,
    id,
    related_code AS batch_code,
    record_date AS event_date,
    '种植每日记录' AS title,
    record_type AS subtype,
    NULL AS progress,
    'completed' AS status,
    COALESCE(json_extract(data, '$.operator'), '系统') AS operator,
    NULL AS quantity,
    NULL AS unit,
    data AS detail
  FROM daily_records
  WHERE related_type = 'planting' AND related_code IS NOT NULL

  UNION ALL

  -- 4. 采收
  SELECT
    'harvest' AS event_type,
    id,
    batch_code,
    harvest_date AS event_date,
    '采收' AS title,
    harvest_form AS subtype,
    NULL AS progress,
    'completed' AS status,
    harvester_names AS operator,
    harvest_quantity AS quantity,
    unit AS unit,
    json_object(
      'quality_grade', quality_grade,
      'buyer_name', buyer_name,
      'sales_channel', sales_channel
    ) AS detail
  FROM harvest_records
  WHERE batch_code IS NOT NULL

  UNION ALL

  -- 5. 移入移出
  SELECT
    'move' AS event_type,
    id,
    CAST(planting_id AS TEXT) AS batch_code,
    operation_date AS event_date,
    CASE operation_type
      WHEN 'move_in' THEN '移入'
      WHEN 'move_out' THEN '移出'
      ELSE COALESCE(operation_type, '移栽')
    END AS title,
    to_area_name AS subtype,
    NULL AS progress,
    'completed' AS status,
    operator_name AS operator,
    quantity AS quantity,
    '株' AS unit,
    json_object(
      'from_area', from_area_name,
      'to_area', to_area_name,
      'quantity', quantity,
      'unit', '株'
    ) AS detail
  FROM planting_move_records
  WHERE planting_id IS NOT NULL
`;

try {
  db.exec(viewSql);
  console.log('  ✓ batch_timeline_view 创建成功');
} catch (e) {
  console.error('  ✗ 创建视图失败:', e.message);
  process.exit(1);
}

// 6. 创建复合索引
console.log('\n--- 创建复合索引 ---');
const indexes = [
  { name: 'idx_tasks_batch_date', sql: 'CREATE INDEX IF NOT EXISTS idx_tasks_batch_date ON farm_tasks(batch_code, plan_date DESC) WHERE batch_code IS NOT NULL' },
  { name: 'idx_op_records_batch_date', sql: 'CREATE INDEX IF NOT EXISTS idx_op_records_batch_date ON farm_operation_records(batch_code, operation_date DESC) WHERE batch_code IS NOT NULL' },
  { name: 'idx_harvest_batch_date', sql: 'CREATE INDEX IF NOT EXISTS idx_harvest_batch_date ON harvest_records(batch_code, harvest_date DESC) WHERE batch_code IS NOT NULL' },
  { name: 'idx_daily_records_batch_date', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_records_batch_date ON daily_records(related_code, record_date DESC) WHERE related_type = \'planting\' AND related_code IS NOT NULL' },
];

for (const idx of indexes) {
  try {
    db.exec(idx.sql);
    console.log(`  ✓ ${idx.name}`);
  } catch (e) {
    console.log(`  ✗ ${idx.name} 失败:`, e.message);
  }
}

// 7. 验证
console.log('\n--- 验证 ---');
try {
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM batch_timeline_view').get();
  console.log(`  ✓ 视图中事件总数: ${count.cnt}`);

  // 找一个有数据的批次做示例查询
  const sample = db.prepare(`
    SELECT batch_code, COUNT(*) AS cnt
    FROM batch_timeline_view
    GROUP BY batch_code
    ORDER BY cnt DESC
    LIMIT 3
  `).all();

  if (sample.length > 0) {
    console.log('\n  Top 3 批次（事件数最多）:');
    for (const row of sample) {
      console.log(`    ${row.batch_code}: ${row.cnt} 事件`);
    }
  } else {
    console.log('  • 暂无数据');
  }
} catch (e) {
  console.error('  ✗ 验证失败:', e.message);
}

// 8. 关闭
db.close();
console.log('\n=== 视图创建完成 ===');
console.log('下一步: 重启 sql.js 服务（npm run dev），让内存 db 加载新视图');
