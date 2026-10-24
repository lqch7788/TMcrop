/**
 * 排班班次名对齐 + 签到口径归并（2026-10-24 · 员工身份管理 E6 / E7 数据部分）
 *
 * 两件事：
 *
 * 一、E7 —— schedules.shift 对齐 shifts.shift_name
 *   `schedules.shift` 存的是班次**名称**，且必须能在 `shifts.shift_name` 命中，
 *   否则 `server/src/services/teamAvailabilityService.ts:73` 的
 *   `shiftHoursMap.get(shiftName)` 取不到 → 该员工当天工时按 0 计算，
 *   班组可用工时虚高 → 派工冲突检测误判「还能排」。
 *
 *   实测 3 行异常：
 *     · '全天'（1 行，EMP_005 @2026-09-14）—— 字典里是 '全天班'（SH004，status=deleted
 *       但仍保留 08:00-20:00，且 teamAvailabilityService 查 shifts 时**不过滤 deleted**）
 *       ⇒ 改为 '全天班' 后该行工时 12h 可正常计算。这是**确定的正解**，不是猜测。
 *     · U+FFFD 乱码（2 行，EMP_001 / EMP_003 @2026-09-13）—— 原值不可逆推
 *       ⇒ **不猜**。脚本只报告不改，交由人工确认。
 *
 * 二、E6 —— 签到口径归并（决策 D-E：attendance_records 为准）
 *   `schedules.check_in/check_out` 现存 2 行有效值，而 `attendance_records`
 *   同日同人**没有任何对应行**。本脚本把这 2 行复制成 `attendance_records` 记录，
 *   使签到数据集中到唯一权威表。
 *
 *   注意：本脚本**不删** `schedules.check_in/check_out` 的原值，也不改表结构 ——
 *   写入侧（CheckInModal）的重定向涉及 UI 改动，风险高于收益，另行评估。
 *   先保证「历史签到数据有唯一权威副本」。
 *
 * 用法
 *   node server/scripts/db-migrations/fixScheduleShiftAndCheckin.cjs --dry-run
 *   node server/scripts/db-migrations/fixScheduleShiftAndCheckin.cjs --apply
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）。
 * 环境变量 YUANXINGTU_DB_PATH 可指向其它库（合成库测试用），此时跳过端口检查。
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

const DB_PATH_OVERRIDE = process.env.YUANXINGTU_DB_PATH;
const DB_PATH = DB_PATH_OVERRIDE
  ? path.resolve(DB_PATH_OVERRIDE)
  : path.join(__dirname, '../../data/yuanxingtu.db');
const IS_PRODUCTION_DB = !DB_PATH_OVERRIDE;
const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

/** 确定可修的班次名映射（左：库内错值，右：shifts.shift_name 的正确值） */
const SHIFT_NAME_FIXES = { '全天': '全天班' };

const REPLACEMENT_CHAR = '�';

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(800);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
  });
}

function queryAll(db, sql, params) {
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind(params || []);
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function queryOne(db, sql, params) {
  const rows = queryAll(db, sql, params);
  return rows.length ? rows[0] : null;
}

function columnExists(db, table, column) {
  const r = db.exec('PRAGMA table_info(' + table + ')');
  if (!r || !r[0]) return false;
  const idx = r[0].columns.indexOf('name');
  if (idx < 0) return false;
  return r[0].values.some((row) => row[idx] === column);
}

(async () => {
  const isApply = process.argv.includes('--apply');

  if (!fs.existsSync(DB_PATH)) {
    console.error('✗ 数据库不存在：' + DB_PATH);
    process.exit(1);
  }

  if (isApply && IS_PRODUCTION_DB) {
    if (await isPortInUse(3001)) {
      console.error('✗ 检测到后端服务仍在 3001 端口运行。');
      console.error('  sql.js 会把内存快照整库写回磁盘，覆盖本次修改。');
      console.error('  请先停止后端，再重新执行 --apply。');
      process.exit(1);
    }
  }

  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, '../../node_modules/sql.js/dist', f),
  });
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // ---------- E7：班次名对齐 ----------
  const validShiftNames = new Set(
    queryAll(db, 'SELECT shift_name FROM shifts', []).map((r) => r.shift_name),
  );

  const allSchedules = queryAll(
    db,
    'SELECT id, staff_id, staff_name, date, shift, status FROM schedules',
    [],
  );

  const fixable = [];   // 可确定修复
  const mojibake = [];  // 乱码，不可逆推，只报告
  const unknown = [];   // 既不在字典也不在修复表，且不是乱码

  for (const row of allSchedules) {
    const shift = row.shift == null ? '' : String(row.shift);
    if (validShiftNames.has(shift)) continue;
    if (shift.includes(REPLACEMENT_CHAR)) {
      mojibake.push(row);
    } else if (SHIFT_NAME_FIXES[shift]) {
      fixable.push({ ...row, newShift: SHIFT_NAME_FIXES[shift] });
    } else {
      unknown.push(row);
    }
  }

  // ---------- E6：签到归并 ----------
  const checkinRows = queryAll(
    db,
    `SELECT id, staff_id, staff_name, date, shift, check_in, check_out, status
       FROM schedules
      WHERE check_in IS NOT NULL AND check_in <> ''`,
    [],
  );

  const toInsert = [];
  const alreadyExists = [];
  for (const r of checkinRows) {
    const existing = queryOne(
      db,
      'SELECT id FROM attendance_records WHERE worker_id = ? AND date = ?',
      [r.staff_id, r.date],
    );
    if (existing) {
      alreadyExists.push({ ...r, existingId: existing.id });
      continue;
    }
    const emp = queryOne(db, 'SELECT name FROM employees WHERE id = ?', [r.staff_id]);
    toInsert.push({ ...r, empName: emp ? emp.name : (r.staff_name || '') });
  }

  console.log(isApply ? '=== 执行修复 ===' : '=== 预演（--dry-run，不写盘）===');
  console.log('schedules 总行数：' + allSchedules.length);
  console.log('班次字典可用名称：' + [...validShiftNames].join(' / '));
  console.log('');

  console.log('【E7 班次名对齐】');
  console.log('  可确定修复：' + fixable.length + ' 行');
  for (const f of fixable) {
    console.log(`    ${f.staff_id} ${f.date}：${JSON.stringify(f.shift)} → ${JSON.stringify(f.newShift)}（${f.id}）`);
  }
  console.log('  乱码不可逆推：' + mojibake.length + ' 行（只报告，不改）');
  for (const m of mojibake) {
    console.log(`    ${m.staff_id} ${m.date}：shift=${JSON.stringify(m.shift)} status=${m.status}（${m.id}）`);
  }
  if (unknown.length) {
    console.log('  ⚠ 既不在字典也不可修复：' + unknown.length + ' 行');
    for (const u of unknown) {
      console.log(`    ${u.staff_id} ${u.date}：shift=${JSON.stringify(u.shift)}（${u.id}）`);
    }
  }
  console.log('');

  console.log('【E6 签到归并】');
  console.log('  schedules 有签到值：' + checkinRows.length + ' 行');
  console.log('  需补建 attendance_records：' + toInsert.length + ' 行');
  for (const t of toInsert) {
    console.log(`    ${t.staff_id} ${t.empName} ${t.date} in=${t.check_in} out=${t.check_out}`);
  }
  if (alreadyExists.length) {
    console.log('  已存在对应考勤记录（跳过）：' + alreadyExists.length + ' 行');
    for (const a of alreadyExists) {
      console.log(`    ${a.staff_id} ${a.date} → 已有 ${a.existingId}`);
    }
  }
  console.log('');

  if (!isApply) {
    console.log('预演结束。确认无误后加 --apply 执行（需先停后端）。');
    db.close();
    return;
  }

  // ---------- 备份 ----------
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, 'yuanxingtu.db.bak-shift-checkin-' + stamp);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✓ 已备份到 ' + path.relative(process.cwd(), backupPath) + '\n');

  const now = new Date().toISOString();
  db.run('BEGIN');
  try {
    // E7
    const updShift = db.prepare('UPDATE schedules SET shift = ?, update_time = ? WHERE id = ?');
    for (const f of fixable) updShift.run([f.newShift, now, f.id]);
    updShift.free();
    console.log(`✓ schedules.shift 已修正 ${fixable.length} 行`);

    // E6
    const hasStatusClass = columnExists(db, 'attendance_records', 'status_class');
    const ins = db.prepare(
      `INSERT INTO attendance_records
         (id, worker_id, name, date, check_in, check_out, hours, status${hasStatusClass ? ', status_class' : ''},
          remarks, version, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?${hasStatusClass ? ', ?' : ''}, ?, 1, ?, ?)`,
    );
    for (const t of toInsert) {
      // 工时：按签到/签退跨度计算；跨日（签退小于签到）按 +24h
      let hours = 0;
      if (t.check_in && t.check_out) {
        const [sh, sm] = String(t.check_in).split(':').map(Number);
        const [eh, em] = String(t.check_out).split(':').map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60;
        hours = Math.round((mins / 60) * 10) / 10;
      }
      const newId = `att_e6_${String(t.id).replace(/[^A-Za-z0-9_-]/g, '_')}`;
      const params = [
        newId,
        t.staff_id,
        t.empName,
        t.date,
        t.check_in,
        t.check_out,
        hours,
        '已完成',
      ];
      if (hasStatusClass) params.push('normal');
      params.push(`由 schedules 签到数据归并（源 id: ${t.id}）`, now, now);
      ins.run(params);
    }
    ins.free();
    console.log(`✓ attendance_records 已补建 ${toInsert.length} 行`);
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    console.error('✗ 修复失败，已回滚：', err.message);
    db.close();
    process.exit(1);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('\n✓ 已写盘。');

  // ---------- 复核 ----------
  const verify = new SQL.Database(fs.readFileSync(DB_PATH));
  let ok = true;
  console.log('\n=== 修复后复核 ===');

  const validAfter = new Set(
    queryAll(verify, 'SELECT shift_name FROM shifts', []).map((r) => r.shift_name),
  );
  const remainBad = queryAll(verify, 'SELECT id, shift FROM schedules', []).filter(
    (r) => r.shift != null && !validAfter.has(String(r.shift)) && !String(r.shift).includes(REPLACEMENT_CHAR),
  );
  const remainMojibake = queryAll(verify, 'SELECT id, shift FROM schedules', []).filter(
    (r) => r.shift != null && String(r.shift).includes(REPLACEMENT_CHAR),
  );
  console.log(`  ${remainBad.length === 0 ? '✅' : '❌'} 非乱码且不在字典的班次名：${remainBad.length} 行`);
  console.log(`  ℹ 乱码班次名（人工待确认）：${remainMojibake.length} 行`);
  if (remainBad.length > 0) ok = false;

  for (const t of toInsert) {
    const hit = queryOne(
      verify,
      'SELECT id, check_in, check_out FROM attendance_records WHERE worker_id = ? AND date = ?',
      [t.staff_id, t.date],
    );
    const good = !!hit;
    if (!good) ok = false;
    console.log(`  ${good ? '✅' : '❌'} 签到归并 ${t.staff_id} ${t.date} → ${hit ? hit.id : '缺失'}`);
  }
  verify.close();

  console.log(ok ? '\n✓ 复核通过' : '\n✗ 复核不通过');
  if (!ok) process.exit(2);
})().catch((err) => {
  console.error('✗ 脚本异常：', err);
  process.exit(1);
});
