/**
 * 把未归属的历史数据批量打上指定基地（2026-10-25）
 *
 * 背景：
 *   实测 809 条核心业务记录无法从现有字段可靠推断基地（匹配率仅 2.8%）。
 *   按用户决策：历史数据批量归属到**指定基地**（一次性完成），
 *   之后「当前基地」切换就能看到真实的隔离效果。
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）
 *
 * 用法：
 *   停服 → node server/scripts/db-migrations/assignUnscopedDataToBase.cjs [--apply] [--base=<base_oid>]
 *   默认干跑；不传 --base 时自动选「宁波北仑基地」（base_1780023508412），
 *   若不存在则选第一个 active 基地。
 *
 * 影响表：plantings / seedlings / farm_tasks / harvest_records / inventory_stock / crop_instances
 * 只改 base_oid 为空的记录，已有归属的不动。
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const APPLY = process.argv.includes('--apply');
const baseArg = process.argv.find((a) => a.startsWith('--base='));
const DB = path.join(__dirname, '..', '..', 'data', 'yuanxingtu.db');

const TABLES = ['plantings', 'seedlings', 'farm_tasks', 'harvest_records', 'inventory_stock', 'crop_instances'];
const DEFAULT_BASE = 'base_1780023508412'; // 宁波北仑基地

(async () => {
  console.log('='.repeat(72));
  console.log(`批量归属未归属数据${APPLY ? '（执行）' : '（干跑）'}`);
  console.log('='.repeat(72));

  if (!fs.existsSync(DB)) {
    console.error('❌ 数据库不存在:', DB);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB));
  const q = (s) => { const r = db.exec(s); return r[0] ? r[0].values : []; };

  // ── 1. 确定目标基地 ──
  let targetOid = baseArg ? baseArg.split('=')[1] : DEFAULT_BASE;
  let target = q(`SELECT oid, name FROM bases WHERE oid = '${targetOid.replace(/'/g, "''")}' AND (status IS NULL OR status = 'active')`);
  if (target.length === 0) {
    const fallback = q(`SELECT oid, name FROM bases WHERE status IS NULL OR status = 'active' ORDER BY oid LIMIT 1`);
    if (fallback.length === 0) {
      console.error('❌ 库中没有可用基地');
      process.exit(1);
    }
    targetOid = String(fallback[0][0]);
    target = fallback;
    console.log(`⚠️ 指定基地不存在，回退到第一个 active 基地: ${targetOid}`);
  }
  const targetName = String(target[0][1] || '');
  console.log(`\n目标基地: ${targetOid} (${targetName})`);

  // ── 2. 统计待归属 ──
  console.log('\n【待归属统计】');
  const stats = [];
  for (const t of TABLES) {
    try {
      const total = q(`SELECT COUNT(*) FROM ${t}`)[0][0];
      const empty = q(`SELECT COUNT(*) FROM ${t} WHERE base_oid IS NULL OR base_oid = ''`)[0][0];
      console.log(`  ${t.padEnd(18)} 总 ${String(total).padStart(4)} | 待归属 ${String(empty).padStart(4)}`);
      stats.push({ t, total, empty });
    } catch (e) {
      console.log(`  ⚠️ ${t} 跳过（${e.message}）`);
      stats.push({ t, total: 0, empty: 0, error: true });
    }
  }

  const totalEmpty = stats.reduce((a, s) => a + s.empty, 0);
  console.log(`\n合计待归属: ${totalEmpty} 条`);

  if (!APPLY) {
    console.log('\n[干跑] 未写入。加 --apply 执行。');
    return;
  }

  // ── 3. 执行归属 ──
  console.log('\n【执行归属】');
  const now = new Date().toISOString();
  let changed = 0;
  for (const s of stats) {
    if (s.error || s.empty === 0) continue;
    db.run(
      `UPDATE ${s.t} SET base_oid = ?, base_name = ? WHERE base_oid IS NULL OR base_oid = ''`,
      [targetOid, targetName]
    );
    // 同步 updated_at（各表列名不统一，逐个尝试）
    for (const col of ['updated_at', 'update_time']) {
      try {
        db.run(`UPDATE ${s.t} SET ${col} = ? WHERE ${col} IS NOT NULL`, [now]);
        break;
      } catch { /* 该表没有这列 */ }
    }
    const after = q(`SELECT COUNT(*) FROM ${s.t} WHERE base_oid = '${targetOid}'`)[0][0];
    console.log(`  ✅ ${s.t.padEnd(18)} 归属后该基地共 ${after} 条`);
    changed += s.empty;
  }

  fs.writeFileSync(DB, Buffer.from(db.export()));
  console.log('\n✅ 已写回数据库');

  // ── 4. 复核 ──
  const db2 = new SQL.Database(fs.readFileSync(DB));
  const q2 = (s) => { const r = db2.exec(s); return r[0] ? r[0].values : []; };
  console.log('\n【复核】');
  for (const t of TABLES) {
    try {
      const total = q2(`SELECT COUNT(*) FROM ${t}`)[0][0];
      const filled = q2(`SELECT COUNT(*) FROM ${t} WHERE base_oid IS NOT NULL AND base_oid != ''`)[0][0];
      const empty = total - filled;
      console.log(`  ${t.padEnd(18)} 有基地 ${String(filled).padStart(4)} | 未归属 ${String(empty).padStart(4)} / ${String(total).padStart(4)}`);
    } catch { /* 忽略 */ }
  }
  console.log(`\n本次归属 ${changed} 条到「${targetName}」`);
})().catch((e) => {
  console.error('失败:', e.message);
  process.exit(1);
});
