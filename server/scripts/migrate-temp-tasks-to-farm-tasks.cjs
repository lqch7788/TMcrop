/**
 * 临时任务 → 农事任务 数据迁移脚本（阶段 2）
 *
 * 背景：把 temp_tasks 的存量数据并入 farm_tasks，为最终下线临时任务模块做准备。
 * 计划文档：docs/农事任务合并临时任务_实施计划_20261021.md
 *
 * 关键设计：
 *   1. **保留原 id 与 task_code** —— 两张表主键都是 TEXT 且 TT/NS 前缀不交叉，
 *      这样 task_operation_records（流转记录）与 problems.source_task_id 无需级联改号。
 *   2. **estimated_hours 必须归一化** —— 临时任务存的是「小时零头」，
 *      农事任务存的是「已含天数」的总小时（farm 的列表按 hours×人工 直接算）。
 *      写入 farm 时统一为 days*8 + hours。
 *   3. **幂等** —— id 或 task_code 已存在则跳过，可重复执行。
 *   4. **单事务** —— 任一条失败整体回滚，不会留下半迁移状态。
 *   5. **默认干跑** —— 只有 --apply 才真正写库。
 *
 * ⚠️ 必须在**停服**状态下执行：sql.js 运行时全量落盘会覆盖磁盘改动。
 *
 * 用法：
 *   node server/scripts/migrate-temp-tasks-to-farm-tasks.cjs           # 干跑
 *   node server/scripts/migrate-temp-tasks-to-farm-tasks.cjs --apply   # 执行
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
// --db=<path> 可指向库副本做预演（不触碰运行时库）
const dbArg = process.argv.find((a) => a.startsWith('--db='));
const DB_PATH = dbArg
  ? path.resolve(dbArg.slice('--db='.length))
  : path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const REPORT_DIR = path.join(__dirname, '..', 'data');

/** 任务类型 → 中文名（与 src/types/farm/common.ts 的 FARM_OPERATION_TYPES 一致） */
const TYPE_LABEL_MAP = {
  planting: '定植',
  irrigation: '灌溉',
  fertilization: '施肥',
  pest_control: '病虫害防治',
  pruning: '修剪',
  harvest: '采收',
  weeding: '中耕除草',
  farm_repair: '农场维修',
  equipment_repair: '设备维修',
  cleaning: '清洁卫生',
  seedling: '育苗',
  facility_maintenance: '设施维护',
  staff_dispatch: '人员调配',
  safety_check: '安全检查',
  other: '其他',
};

function nz(v) {
  return v === null || v === undefined ? '' : String(v);
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v) !== '') return v;
  }
  return '';
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ 数据库不存在: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = DELETE');

  console.log('='.repeat(72));
  console.log(`临时任务 → 农事任务 迁移${APPLY ? '（执行）' : '（干跑）'}`);
  console.log(`数据库: ${DB_PATH}`);
  console.log('='.repeat(72));

  // ---------- 前置断言 ----------
  const farmCols = db.prepare('PRAGMA table_info(farm_tasks)').all().map((r) => r.name);
  const missing = ['worker_count', 'urgency'].filter((c) => !farmCols.includes(c));
  if (missing.length > 0) {
    console.error(`✗ farm_tasks 缺少列: ${missing.join(', ')}`);
    console.error('  请先完成阶段 1 并重启后端（fixSchemaColumns 会自动补列）');
    db.close();
    process.exit(1);
  }

  const tempRows = db.prepare('SELECT * FROM temp_tasks ORDER BY create_time').all();
  console.log(`\n临时任务总数: ${tempRows.length}`);

  const existsStmt = db.prepare('SELECT id FROM farm_tasks WHERE id = ? OR task_code = ?');
  const insertSql = `
    INSERT INTO farm_tasks (
      id, task_code, task_title, title, task_type, type_name, task_content, description,
      assignee_id, assignee_name, assigner_id, assigner_name,
      greenhouse_id, greenhouse_name, area_name,
      plan_date, plan_time, due_date, plan_end, priority, urgency, status, progress,
      completion_date, completion_note, completed_at, accepted_at, actual_start_at,
      estimated_hours, estimated_days, actual_hours, worker_count,
      rework_count, rejected_reason, remarks,
      feedback_requirements, version, create_by, create_time, update_time,
      dispatch_mode, source_type, source_problem_id, tenant_id, synthetic,
      materials, tools, type_config, sop_content
    ) VALUES (
      @id, @task_code, @task_title, @title, @task_type, @type_name, @task_content, @description,
      @assignee_id, @assignee_name, @assigner_id, @assigner_name,
      @greenhouse_id, @greenhouse_name, @area_name,
      @plan_date, @plan_time, @due_date, @plan_end, @priority, @urgency, @status, @progress,
      @completion_date, @completion_note, @completed_at, @accepted_at, @actual_start_at,
      @estimated_hours, @estimated_days, @actual_hours, @worker_count,
      @rework_count, @rejected_reason, @remarks,
      @feedback_requirements, @version, @create_by, @create_time, @update_time,
      @dispatch_mode, @source_type, @source_problem_id, @tenant_id, @synthetic,
      @materials, @tools, @type_config, @sop_content
    )
  `;
  const insertStmt = db.prepare(insertSql);
  const deleteStmt = db.prepare('DELETE FROM temp_tasks WHERE id = ?');

  const migrateOne = (t) => {
    const taskType = nz(t.task_type) || 'other';
    const title = firstNonEmpty(t.task_title, t.title, '临时任务');
    const createTime = nz(t.create_time);
    const days = Number(t.estimated_days) || 0;
    const hours = Number(t.estimated_hours) || 0;
    const status = t.status === 'pending_reassign' ? 'failed' : (nz(t.status) || 'pending');

    return {
      id: nz(t.id),
      task_code: nz(t.task_code),
      task_title: title,
      title,
      task_type: taskType,
      type_name: TYPE_LABEL_MAP[taskType] || taskType,
      task_content: nz(t.task_content),
      description: nz(t.task_content),
      assignee_id: nz(t.assignee_id),
      assignee_name: nz(t.assignee_name),
      assigner_id: firstNonEmpty(t.assigner_id, t.requester_id, ''),
      assigner_name: firstNonEmpty(t.assigner_name, t.requester_name, t.create_by, '系统'),
      greenhouse_id: nz(t.greenhouse_id),
      greenhouse_name: firstNonEmpty(t.greenhouse_name, t.location, t.area_name, ''),
      area_name: nz(t.area_name),
      plan_date: firstNonEmpty(t.request_date, createTime.slice(0, 10), ''),
      plan_time: firstNonEmpty(t.request_time, createTime.slice(11, 16), ''),
      due_date: nz(t.due_date),
      plan_end: nz(t.due_date),
      priority: firstNonEmpty(t.priority, 'medium'),
      urgency: firstNonEmpty(t.urgency, 'normal'),
      status,
      progress: Number(t.progress) || 0,
      completion_date: nz(t.completion_date),
      completion_note: firstNonEmpty(t.acceptance_remarks, t.completion_note, ''),
      // 已完成但无 completed_at 的历史行：用 update_time 兜底
      completed_at: status === 'completed' ? firstNonEmpty(t.completed_at, t.update_time, '') : nz(t.completed_at),
      accepted_at: nz(t.accepted_at),
      actual_start_at: nz(t.start_time),
      // 关键归一化：farm 的 estimated_hours 是「已含天数」的总小时
      estimated_hours: days * 8 + hours,
      estimated_days: days,
      actual_hours: Number(t.actual_hours) || 0,
      worker_count: Number(t.worker_count) || 1,
      rework_count: Number(t.reject_count) || 0,
      rejected_reason: nz(t.reject_reason),
      remarks: nz(t.remarks),
      feedback_requirements: firstNonEmpty(t.required_feedback, '[]'),
      version: Number(t.version) || 1,
      create_by: nz(t.create_by),
      create_time: createTime,
      update_time: nz(t.update_time) || createTime,
      dispatch_mode: 'farm',
      source_type: 'tempTask',
      source_problem_id: t.source_problem_id || null,
      tenant_id: t.tenant_id === null || t.tenant_id === undefined ? 1 : t.tenant_id,
      synthetic: 0,
      materials: '[]',
      tools: '[]',
      type_config: '{}',
      sop_content: '',
    };
  };

  // ---------- 干跑：逐条打印摘要 ----------
  const toInsert = [];
  const skipped = [];
  for (const t of tempRows) {
    const exists = existsStmt.get(nz(t.id), nz(t.task_code));
    if (exists) {
      skipped.push({ id: t.id, task_code: t.task_code, reason: 'id 或 task_code 已存在于 farm_tasks' });
      continue;
    }
    toInsert.push(migrateOne(t));
  }

  console.log(`可迁移: ${toInsert.length} 条，跳过: ${skipped.length} 条`);
  if (skipped.length > 0) {
    for (const s of skipped) console.log(`  · 跳过 ${s.id} / ${s.task_code} — ${s.reason}`);
  }

  console.log('\n迁移预览（前 3 条）:');
  for (const row of toInsert.slice(0, 3)) {
    console.log(
      `  ${row.task_code} | ${row.task_title} | ${row.type_name} | ${row.status} | ` +
      `工时 ${row.estimated_hours}h (days=${row.estimated_days}) × ${row.worker_count}人 | ` +
      `执行人 ${row.assignee_name || '—'} | 来源 ${row.source_type}`
    );
  }

  if (!APPLY) {
    console.log('\n[干跑结束] 未写入数据库。确认无误后加 --apply 执行。');
    db.close();
    return;
  }

  // ---------- 正式执行（单事务） ----------
  const report = {
    startedAt: new Date().toISOString(),
    dbPath: DB_PATH,
    totalSource: tempRows.length,
    migrated: [],
    skipped,
    failed: [],
  };

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of toInsert) {
      try {
        insertStmt.run(row);
        deleteStmt.run(row.id);
        report.migrated.push({
          id: row.id,
          taskCode: row.task_code,
          title: row.task_title,
          status: row.status,
          estimatedHours: row.estimated_hours,
          workerCount: row.worker_count,
        });
      } catch (err) {
        report.failed.push({ id: row.id, taskCode: row.task_code, error: err.message });
        throw err; // 单条失败整体回滚，避免半迁移
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    report.failed.push({ fatal: err.message });
    console.error(`\n✗ 迁移失败，已回滚: ${err.message}`);
  }

  // ---------- 校验 ----------
  const farmTotal = db.prepare('SELECT COUNT(*) c FROM farm_tasks').get().c;
  const migratedInFarm = db.prepare("SELECT COUNT(*) c FROM farm_tasks WHERE source_type='tempTask'").get().c;
  const tempLeft = db.prepare('SELECT COUNT(*) c FROM temp_tasks').get().c;
  const orphanRecords = db.prepare(`
    SELECT COUNT(*) c FROM task_operation_records r
    WHERE NOT EXISTS (SELECT 1 FROM farm_tasks f WHERE f.id = r.task_id)
      AND NOT EXISTS (SELECT 1 FROM temp_tasks t WHERE t.id = r.task_id)
  `).get().c;

  report.finishedAt = new Date().toISOString();
  report.verification = { farmTotal, migratedInFarm, tempLeft, orphanRecords };

  console.log('\n校验结果:');
  console.log(`  farm_tasks 总数: ${farmTotal}`);
  console.log(`  其中 source_type='tempTask': ${migratedInFarm}`);
  console.log(`  temp_tasks 剩余: ${tempLeft}`);
  console.log(`  task_operation_records 孤儿数: ${orphanRecords}`);

  const reportPath = path.join(REPORT_DIR, `temp-merge-report.${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n迁移报告: ${reportPath}`);

  db.close();

  if (report.failed.length > 0) process.exit(1);
}

main();
