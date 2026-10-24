/**
 * 回填 problems.issue_presets（2026-10-24）
 *
 * 背景
 *   巡查记录一直有 issue_presets（勾选的具体问题项，如「灰霉病、病毒病、白粉病」），
 *   但建问题时没带过来，problems 表也没有这一列。
 *   结果：问题详情 / 任务处理弹窗只剩「病害」这类分类，执行人不知道具体要治什么。
 *
 * 本脚本
 *   1. 给 problems 加 issue_presets 列（若不存在）
 *   2. 从关联的 inspections 记录回填（按 inspections.problem_id = problems.id）
 *   3. 把具体项拼进 description（若 description 尚未包含）
 *
 * 用法
 *   node server/scripts/backfill-problem-issue-presets.cjs --dry-run
 *   node server/scripts/backfill-problem-issue-presets.cjs --apply   # 必须先停后端
 *
 * ⚠️ 必须先停后端：sql.js 内存快照会覆盖磁盘改动。
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

const DB_PATH = path.join(__dirname, '../data/yuanxingtu.db');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

/** 端口是否被监听 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(800);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
  });
}

/** 安全解析 JSON 数组 */
function parseArr(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

(async () => {
  const isApply = process.argv.includes('--apply');
  const isDryRun = process.argv.includes('--dry-run') || !isApply;

  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ 数据库不存在：${DB_PATH}`);
    process.exit(1);
  }

  if (isApply) {
    const running = await isPortInUse(3001);
    if (running) {
      console.error('✗ 后端仍在 3001 端口运行，请先停止（sql.js 会覆盖磁盘）。');
      process.exit(1);
    }
  }

  const SQL = await initSqlJs({
    locateFile: (f) => path.join(__dirname, '../node_modules/sql.js/dist', f),
  });
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  const q = (sql, params) => {
    const st = db.prepare(sql);
    if (params) st.bind(params);
    const out = [];
    while (st.step()) out.push(st.getAsObject());
    st.free();
    return out;
  };

  // ---- 1. 列检查 ----
  const cols = q('PRAGMA table_info(problems)').map((r) => r.name);
  const hasColumn = cols.includes('issue_presets');
  console.log(isApply ? '=== 执行回填 ===' : '=== 预演（--dry-run，不写盘）===');
  console.log(`problems.issue_presets 列：${hasColumn ? '已存在' : '缺失（将添加）'}\n`);

  // ---- 2. 统计待回填 ----
  const rows = q(`
    SELECT p.id, p.problem_code, p.description, p.issue_text,
           i.record_code, i.issue_presets
      FROM problems p
      JOIN inspections i ON i.problem_id = p.id
     WHERE i.issue_presets IS NOT NULL AND i.issue_presets <> '' AND i.issue_presets <> '[]'
  `);
  console.log(`关联巡查记录且带具体项的问题：${rows.length} 条`);
  rows.slice(0, 10).forEach((r) => {
    console.log(`  ${r.problem_code} ← ${r.record_code}: ${r.issue_presets}`);
  });
  if (rows.length > 10) console.log(`  … 其余 ${rows.length - 10} 条`);

  if (!isApply) {
    console.log('\n预演结束。确认后加 --apply 执行（需先停后端）。');
    return;
  }

  // ---- 3. 备份 ----
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `yuanxingtu.db.bak-presets-${stamp}`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`\n✓ 已备份到 ${path.relative(process.cwd(), backupPath)}`);

  // ---- 4. 加列 + 回填（单事务）----
  db.run('BEGIN');
  try {
    if (!hasColumn) {
      db.run("ALTER TABLE problems ADD COLUMN issue_presets TEXT DEFAULT '[]'");
      console.log('✓ 已添加 problems.issue_presets 列');
    }

    let updated = 0;
    for (const r of rows) {
      const presets = parseArr(r.issue_presets);
      if (presets.length === 0) continue;
      // 以 issue_text 为基准判断：原文已包含全部具体项时不再拼接，
      //   否则会出现「病毒病、灰霉病：病毒病、灰霉病」这种自我重复。
      const baseText = String(r.issue_text || '');
      const covered = baseText.length > 0 && presets.every((p) => baseText.includes(p));
      const nextDescription = covered
        ? baseText
        : `${baseText || String(r.description || '')}：${presets.join('、')}`;
      db.run(
        'UPDATE problems SET issue_presets = ?, description = ? WHERE id = ?',
        [JSON.stringify(presets), nextDescription, r.id],
      );
      updated++;
    }
    db.run('COMMIT');
    console.log(`✓ 回填 ${updated} 条`);
  } catch (err) {
    db.run('ROLLBACK');
    console.error('✗ 回填失败，已回滚：', err.message);
    process.exit(1);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('✓ 已写盘。');

  // ---- 5. 复核 ----
  const verify = new SQL.Database(fs.readFileSync(DB_PATH));
  const st = verify.prepare(
    "SELECT problem_code, issue_presets, substr(description,1,60) AS d FROM problems WHERE issue_presets IS NOT NULL AND issue_presets <> '[]' LIMIT 5",
  );
  const out = [];
  while (st.step()) out.push(st.getAsObject());
  st.free();
  console.log('\n=== 回填后样本 ===');
  out.forEach((r) => console.log(' ', r.problem_code, '|', r.issue_presets, '|', r.d));
  verify.close();
})().catch((err) => {
  console.error('✗ 脚本异常：', err);
  process.exit(1);
});
