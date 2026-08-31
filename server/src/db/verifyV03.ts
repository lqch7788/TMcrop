/**
 * v0.3 一次性验证脚本
 * 用 sql.js 读取 yuanxingtu.db，验证 v0.3 新字段是否生效
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

(async () => {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);

  console.log('=== v0.3 验证（sql.js 读取）===\n');

  const checks = [
    { table: 'farm_tasks', cols: ['progress_pct','current_pause_reason','paused_at','resumed_at','actual_start_at','actual_end_at','total_pause_seconds','outsource_cost','tenant_id'] },
    { table: 'farm_operation_records', cols: ['quality_score','quality_remark','evaluator_id','evaluated_at','worker_hourly_rate_snapshot','labor_cost_snapshot','tenant_id'] },
    { table: 'pesticide_library', cols: ['safety_interval_days','max_use_per_season','retry_interval_days','compatible_pesticides','gb2763_code','data_source','tenant_id'] },
    { table: 'problems', cols: ['rectification_progress','recheck_required','recheck_result','recheck_at','rechecker_id','recurrence_count','tenant_id'] },
    { table: 'employees', cols: ['hourly_rate','tenant_id'] },
  ];

  let totalPass = 0;
  let totalCheck = 0;

  for (const c of checks) {
    console.log(`[${c.table}]`);
    const cols = db.exec(`PRAGMA table_info(${c.table})`)[0].values.map((r: unknown[]) => r[1] as string);
    for (const col of c.cols) {
      totalCheck++;
      const ok = cols.includes(col);
      if (ok) totalPass++;
      console.log(`  ${ok ? '✓' : '✗'} ${col}`);
    }
    console.log();
  }

  console.log(`合计: ${totalPass}/${totalCheck} 字段通过`);

  // tenant_id 覆盖统计
  console.log('\n=== tenant_id 覆盖率 ===');
  const coreTables = [
    'plantings','farm_tasks','farm_task_schedules','farm_task_swap_requests',
    'farm_operation_records','work_logs','labor_records','attendance_records',
    'temp_tasks','inspections','problems','employees','pesticide_library',
    'pesticide_records','fertilizer_records','material_requests',
    'material_executes','material_returns','inventory_stock','batch_inventory',
    'inventory_transaction','warehouses','greenhouses','zones','blocks',
    'seed_sources','seedlings','crop_instances','harvest_records',
    'planting_move_records','daily_records','production_plans','crop_orders',
    'customers','suppliers','purchase_plans','materials',
    'iot_devices','iot_history','iot_alerts','monitoring_devices',
    'task_operation_records','reminders','onboarding_records','leave_records',
  ];

  let withTenant = 0;
  const missing: string[] = [];
  for (const t of coreTables) {
    try {
      const cols = db.exec(`PRAGMA table_info(${t})`)[0].values.map((r: unknown[]) => r[1] as string);
      if (cols.includes('tenant_id')) {
        withTenant++;
      } else {
        missing.push(t);
      }
    } catch (e) {
      missing.push(`${t}(不存在)`);
    }
  }
  console.log(`含 tenant_id: ${withTenant}/${coreTables.length}`);
  if (missing.length > 0) {
    console.log(`缺 tenant_id: ${missing.join(', ')}`);
  }

  db.close();
  console.log('\n=== 验证完成 ===');
})();
