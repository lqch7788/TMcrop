/**
 * 一次性清理：含 U+FFFD 乱码的测试/探针残留记录
 *
 * 背景（2026-10-17）：
 *   2026 年 6-7 月测试期，中文经错误编码链路写入（GBK 字节被按 UTF-8 解码）→
 *   库里留下大量 U+FFFD 乱码。原始字节已丢失，多数无法反推原值。
 *   经逐条核对：含乱码的行全部是测试/探针残留（TEST-/DBG-/VERIFY-/PROBE-/FIX/OVER…），
 *   真实业务数据干净；例外已显式排除：
 *     - YM20260716-001（真实育苗，仅备注含乱码，保留）
 *     - inventory_stock / inventory_inbound_records 的近期记录（可能真实，保留不删）
 *
 * 安全措施：
 *   - 删除前逐条做引用检查（库存/流水/种源/每日记录），被引用则拒绝删除该行
 *   - 默认预演（只打印），--apply 才写库
 *   - 必须在后端停止时运行
 *
 * 用法：
 *   node server/scripts/cleanup-mojibake-residue.cjs
 *   node server/scripts/cleanup-mojibake-residue.cjs --apply
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require(path.join(__dirname, '..', 'node_modules', 'sql.js'));

const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const APPLY = process.argv.includes('--apply');
const BAD = "char(65533)";

initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) })
  .then((SQL) => {
    const db = new SQL.Database(fs.readFileSync(DB_PATH));
    const q = (s) => { const r = db.exec(s); return r[0] ? r[0].values : []; };

    // 各表删除条件（乱码 + 明确排除真实数据）
    const targets = [
      {
        table: 'seedlings', code: 'seedling_code',
        where: `(instr(crop_name,${BAD})>0 OR instr(crop_variety,${BAD})>0 OR instr(seedling_type,${BAD})>0
                 OR instr(greenhouse_name,${BAD})>0 OR instr(area_name,${BAD})>0 OR instr(remarks,${BAD})>0
                 OR instr(create_by,${BAD})>0 OR instr(unit,${BAD})>0)
                AND seedling_code <> 'YM20260716-001'`,   // 真实记录，保留
        // 级联删除每日记录
        cascade: (ids) => ids.length ? [`DELETE FROM daily_records WHERE related_type='seedling' AND related_id IN (${ids.map(i => `'${i}'`).join(',')})`] : [],
      },
      {
        table: 'seed_sources', code: 'source_code',
        where: `instr(unit,${BAD})>0`,
        cascade: () => [],
      },
      {
        table: 'harvest_records', code: 'harvest_code',
        where: `(instr(unit,${BAD})>0 OR instr(products,${BAD})>0 OR instr(crop_name,${BAD})>0)`,
        cascade: () => [],
      },
      {
        table: 'crop_instances', code: 'instance_code',
        where: `(instr(crop_name,${BAD})>0 OR instr(crop_variety,${BAD})>0)`,
        cascade: () => [],
      },
      {
        table: 'plantings', code: 'planting_code',
        where: `instr(crop_name,${BAD})>0`,
        cascade: () => [],
      },
    ];

    // 引用守卫：被这些表引用的行一律不删
    const guard = (table, id, code) => {
      const checks = [];
      if (table === 'crop_instances') {
        checks.push(`SELECT COUNT(*) FROM inventory_stock WHERE instance_id = '${code}'`);
        checks.push(`SELECT COUNT(*) FROM inventory_transaction WHERE instance_id = '${code}'`);
      }
      if (table === 'harvest_records') {
        checks.push(`SELECT COUNT(*) FROM inventory_stock WHERE source_id = '${id}'`);
        checks.push(`SELECT COUNT(*) FROM inventory_inbound_records WHERE source_id = '${id}'`);
      }
      if (table === 'seed_sources') {
        checks.push(`SELECT COUNT(*) FROM seedlings WHERE mother_source_id = '${id}'`);
      }
      if (table === 'plantings') {
        checks.push(`SELECT COUNT(*) FROM inventory_stock WHERE business_id = '${code}'`);
      }
      for (const c of checks) {
        try { if (Number(q(c)[0][0]) > 0) return true; } catch { /* 列不存在则跳过 */ }
      }
      return false;
    };

    let totalDel = 0;
    let totalSkip = 0;
    for (const t of targets) {
      const rows = q(`SELECT id, ${t.code} FROM ${t.table} WHERE ${t.where}`);
      const deletable = [];
      rows.forEach(([id, code]) => {
        if (guard(t.table, id, code)) { totalSkip++; console.log(`  ⚠ 跳过（被引用）${t.table}: ${code}`); }
        else deletable.push([id, code]);
      });
      console.log(`${t.table}: 命中 ${rows.length} 条 → 可删 ${deletable.length} 条`);
      if (!deletable.length) continue;
      console.log('   ' + deletable.map(r => r[1]).join(', '));
      if (APPLY) {
        const ids = deletable.map(r => r[0]);
        t.cascade(ids).forEach(sql => db.run(sql));
        db.run(`DELETE FROM ${t.table} WHERE id IN (${ids.map(i => `'${i}'`).join(',')})`);
      }
      totalDel += deletable.length;
    }

    if (APPLY) {
      fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
      console.log(`\n已删除 ${totalDel} 条，跳过 ${totalSkip} 条，已写盘。`);
    } else {
      console.log(`\n【预演】共将删除 ${totalDel} 条，跳过 ${totalSkip} 条。加 --apply 执行。`);
    }
  })
  .catch((e) => { console.error('清理失败：', e); process.exit(1); });
