/**
 * 迁移：farm_task_schedules.shift_type 从硬编码枚举（day/night/morning/afternoon）
 *      改为 shifts 表的 shift_code（SH001/SH002/SH003）。
 *
 * 背景（2026-10-20）：
 *   排班调度（考勤）用 shifts 表作班次唯一数据源（ShiftEditor 维护，班次可增删改），
 *   而任务派工排班把班次硬编码成 day/night/morning/afternoon 四值，两套码对不上，
 *   合并到同一页后用户看到的班次无法互相理解。本迁移把任务排班统一到 shifts 表。
 *
 * 用法：
 *   node server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs --dry-run
 *   node server/scripts/db-migrations/migrateFarmTaskScheduleShiftType.cjs --apply
 *
 * ⚠️ 执行 --apply 前必须先停掉后端：sql.js 的 saveDatabase() 会用内存快照全量重写
 *    磁盘文件，运行中的服务会把外部改盘覆盖掉。
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '../../data/yuanxingtu.db');
const DATA_DIR = path.resolve(__dirname, '../../data');
const APPLY = process.argv.includes('--apply');

// 旧枚举 → shifts.shift_code 映射
const LEGACY_SHIFT_MAP = {
  day: 'SH001',
  morning: 'SH001',
  afternoon: 'SH002',
  night: 'SH003',
};

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('数据库不存在：' + DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  const before = db.prepare('SELECT COUNT(*) AS c FROM farm_task_schedules').get().c;
  const beforeRows = db
    .prepare('SELECT id, shift_type, plan_start, plan_end, worker_name FROM farm_task_schedules')
    .all();

  // 只迁移仍为旧枚举的行；已是 SH 编码的行原样保留
  const toMigrate = beforeRows.filter((r) => LEGACY_SHIFT_MAP[r.shift_type]);

  // 脏数据体检：既不是旧枚举也不是 SH 编码 → 无法映射，终止迁移
  const unmapped = beforeRows.filter(
    (r) => r.shift_type && !LEGACY_SHIFT_MAP[r.shift_type] && !/^SH\d+$/.test(r.shift_type),
  );
  if (unmapped.length > 0) {
    console.error('存在无法映射的 shift_type，终止迁移：');
    console.error(JSON.stringify(unmapped, null, 2));
    db.close();
    process.exit(1);
  }

  // 生成迁移计划；plan_start/plan_end 只回填 NULL 的（不覆盖人工填过的值）
  const plans = toMigrate.map((r) => {
    const code = LEGACY_SHIFT_MAP[r.shift_type];
    const shift = db.prepare('SELECT start_time, end_time FROM shifts WHERE shift_code = ?').get(code);
    return {
      id: r.id,
      from: r.shift_type,
      to: code,
      planStart: r.plan_start ?? shift?.start_time ?? null,
      planEnd: r.plan_end ?? shift?.end_time ?? null,
    };
  });

  // 顺带体检：worker_name 里的 U+FFFD 替换字符（种子数据写入损坏，单独报告不修）
  const mojibake = beforeRows.filter((r) => r.worker_name && r.worker_name.includes('�'));

  if (!APPLY) {
    console.log('[dry-run] 总行数 ' + before + '，计划迁移 ' + plans.length + ' 行：');
    console.log(JSON.stringify(plans, null, 2));
    if (mojibake.length > 0) {
      console.log('[dry-run] ⚠️ 检出 worker_name 含 U+FFFD 乱码的行 ' + mojibake.length + ' 条（本脚本不修，需另行授权）：');
      console.log(JSON.stringify(mojibake.map((r) => ({ id: r.id, worker_name: r.worker_name })), null, 2));
    }
    console.log('[dry-run] 未写盘。加 --apply 执行。');
    db.close();
    return;
  }

  // 自动备份
  const ts = stamp();
  const backup = path.join(DATA_DIR, 'yuanxingtu.db.bak.' + ts);
  fs.copyFileSync(DB_PATH, backup);
  console.log('已备份 → ' + backup);

  const upd = db.prepare(
    'UPDATE farm_task_schedules SET shift_type = ?, plan_start = ?, plan_end = ? WHERE id = ?',
  );
  const run = db.transaction((list) => {
    for (const p of list) upd.run(p.to, p.planStart, p.planEnd, p.id);
  });
  run(plans);
  db.close();

  // 重新打开校验
  const db2 = new Database(DB_PATH, { readonly: true });
  const after = db2.prepare('SELECT COUNT(*) AS c FROM farm_task_schedules').get().c;
  const leftovers = db2
    .prepare("SELECT COUNT(*) AS c FROM farm_task_schedules WHERE shift_type NOT LIKE 'SH%'")
    .get().c;
  const distinct = db2
    .prepare('SELECT shift_type, plan_start, plan_end, COUNT(*) AS c FROM farm_task_schedules GROUP BY shift_type, plan_start, plan_end')
    .all();
  db2.close();

  const report = {
    appliedAt: new Date().toISOString(),
    rowsBefore: before,
    rowsAfter: after,
    migrated: plans.length,
    leftoverNonShiftCode: leftovers,
    distinctAfter: distinct,
    details: plans,
    mojibakeWorkerNames: mojibake.map((r) => ({ id: r.id, worker_name: r.worker_name })),
  };
  const reportPath = path.join(DATA_DIR, 'farm-task-schedule-shift-report.' + ts + '.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('迁移完成：');
  console.log('  行数 ' + before + ' → ' + after + (before === after ? '（一致）' : '（❌ 不一致）'));
  console.log('  已迁移 ' + plans.length + ' 行；残留非 SH 编码 ' + leftovers + ' 行');
  console.log('  迁移后分布：' + JSON.stringify(distinct));
  console.log('  报告 → ' + reportPath);
  if (mojibake.length > 0) {
    console.log('  ⚠️ worker_name 含 U+FFFD 乱码 ' + mojibake.length + ' 条（本脚本未修，见报告）');
  }
  if (before !== after || leftovers !== 0) process.exit(2);
}

main();
