/**
 * 同步 greenhouses.base_name 到 bases.name（2026-10-26）
 *
 * 背景：
 *   用户权限管理 → 用户基地权限 tab 出现乱码基地名「�������ػ���」。
 *   根因有两层：
 *     1. `greenhouses.base_name` 是冗余字段，与 `bases.name` 不同步：
 *        同一个 base_oid 对应多个名字（宁波北仑 / 宁波北仑基地 / 乱码），
 *        其中两条是 2026-05 的历史测试记录，name 和 base_name 都是乱码。
 *     2. `GET /api/user-base-permissions/all-bases` 从 greenhouses 派生
 *        DISTINCT(base_oid, base_name)，把乱码和重复名一起带了出来。
 *
 * 本脚本解决第 1 层（第 2 层已改为直接读 bases 主表）。
 * base_oid 是权威，base_name 只是冗余副本 → 统一以 bases.name 覆盖。
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）
 *
 * 用法：
 *   停服 → node server/scripts/db-migrations/syncGreenhousesBaseName.cjs [--apply]
 *   默认干跑
 *
 * 影响表：greenhouses（只改 base_name，不动 base_oid / name / status）
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const APPLY = process.argv.includes('--apply');
const DB = path.join(__dirname, '..', '..', 'data', 'yuanxingtu.db');

(async () => {
  console.log('='.repeat(72));
  console.log(`同步 greenhouses.base_name → bases.name${APPLY ? '（执行）' : '（干跑）'}`);
  console.log('='.repeat(72));

  if (!fs.existsSync(DB)) {
    console.error('❌ 数据库不存在:', DB);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB));
  const q = (s) => { const r = db.exec(s); return r[0] ? r[0].values : []; };

  // ── 1. 待修复明细 ──
  const mismatches = q(`
    SELECT g.oid, g.base_oid, g.base_name, b.name AS correct_name, g.status
    FROM greenhouses g
    JOIN bases b ON b.oid = g.base_oid
    WHERE g.base_oid IS NOT NULL AND g.base_oid != ''
      AND g.base_name IS NOT NULL AND g.base_name != b.name
    ORDER BY g.base_oid, g.oid
  `);

  console.log(`\n待修复 ${mismatches.length} 条：`);
  for (const [oid, baseOid, baseName, correct, status] of mismatches) {
    const garbled = String(baseName).includes('�');
    console.log(
      `  ${garbled ? '【乱码】' : '【不一致】'} ${oid}  base=${baseOid}  status=${status}\n` +
      `      现值: ${JSON.stringify(baseName)}\n` +
      `      改为: ${JSON.stringify(correct)}`
    );
  }

  if (mismatches.length === 0) {
    console.log('\n✅ 无需修复');
    db.close();
    return;
  }

  // ── 2. 统计空 base_name（无 bases 对应则不动）──
  const orphanEmpty = q(`
    SELECT COUNT(*) FROM greenhouses g
    LEFT JOIN bases b ON b.oid = g.base_oid
    WHERE g.base_oid IS NOT NULL AND g.base_oid != ''
      AND (g.base_name IS NULL OR g.base_name = '')
      AND b.oid IS NULL
  `)[0][0];
  if (orphanEmpty > 0) {
    console.log(`\nℹ️ 另有 ${orphanEmpty} 条 base_oid 在 bases 表中不存在、base_name 为空 —— 不处理`);
  }

  if (!APPLY) {
    console.log('\n（干跑结束，加 --apply 执行）');
    db.close();
    return;
  }

  // ── 3. 执行 ──
  db.run(`
    UPDATE greenhouses
    SET base_name = (SELECT b.name FROM bases b WHERE b.oid = greenhouses.base_oid)
    WHERE base_oid IS NOT NULL AND base_oid != ''
      AND EXISTS (SELECT 1 FROM bases b WHERE b.oid = greenhouses.base_oid)
      AND base_name IS NOT NULL
      AND base_name != (SELECT b.name FROM bases b WHERE b.oid = greenhouses.base_oid)
  `);

  const remaining = q(`
    SELECT COUNT(*) FROM greenhouses g
    JOIN bases b ON b.oid = g.base_oid
    WHERE g.base_oid IS NOT NULL AND g.base_oid != ''
      AND g.base_name IS NOT NULL AND g.base_name != b.name
  `)[0][0];

  fs.writeFileSync(DB, Buffer.from(db.export()));
  console.log(`\n✅ 修复完成，剩余不一致：${remaining} 条，已落盘`);
  db.close();
})();
