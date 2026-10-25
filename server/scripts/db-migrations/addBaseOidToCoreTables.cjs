/**
 * 给核心业务表加 base_oid / base_name（2026-10-25）
 *
 * 背景：
 *   数据行级权限（按基地隔离）需要每条业务记录知道自己属于哪个基地。
 *   实测 196 张表里只有 4 张有基地字段，且 greenhouses 用 base_oid、
 *   seed_sources / inventory_inbound_records 用 base_id —— 命名不统一。
 *   本脚本给 6 张核心业务表补 base_oid + base_name，统一跟随 greenhouses 的命名。
 *
 * ⚠️ 必须先停后端（sql.js 内存快照会覆盖外部改盘）
 *   用法：停服 → node server/scripts/db-migrations/addBaseOidToCoreTables.cjs [--apply] → 启服
 *   默认干跑，只报告不写入。
 *
 * 回填策略（Fail Loud：逐表报告可回填数与剩余空值数）：
 *   - plantings       : area_oid → zones.oid → zones.greenhouse_oid → greenhouses.oid → base_oid
 *   - seedlings       : 同上
 *   - farm_tasks      : greenhouse_id → greenhouses.oid → base_oid
 *   - harvest_records : 同上
 *   - inventory_stock : 无可靠线索（greenhouse_name 是自由文本）→ 不回填
 *   - crop_instances  : 无基地线索 → 不回填
 *
 *   实测整体仅 23/832 条（2.8%）可推断，其余保留空值。
 *   空值语义 = 「未归属」，读取过滤默认放行（由业务侧逐步归属）。
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const APPLY = process.argv.includes('--apply');
const DB = path.join(__dirname, '..', '..', 'data', 'yuanxingtu.db');

/** 需要加列的表 */
const TABLES = [
  'plantings',
  'seedlings',
  'farm_tasks',
  'harvest_records',
  'inventory_stock',
  'crop_instances',
];

/**
 * 回填规则：表 → 从哪条链路推断 base_oid
 * 返回 SQL 片段（别名统一为 x）
 */
const BACKFILL = {
  plantings: {
    sql: `UPDATE plantings SET
            base_oid = (SELECT g.base_oid FROM zones z JOIN greenhouses g ON g.oid = z.greenhouse_oid
                        WHERE z.oid = plantings.area_oid AND g.base_oid IS NOT NULL AND g.base_oid != ''),
            base_name = (SELECT g.base_name FROM zones z JOIN greenhouses g ON g.oid = z.greenhouse_oid
                         WHERE z.oid = plantings.area_oid AND g.base_oid IS NOT NULL AND g.base_oid != '')
          WHERE base_oid IS NULL AND area_oid IS NOT NULL AND area_oid != ''`,
    desc: 'area_oid → zones → greenhouses → base_oid',
  },
  seedlings: {
    sql: `UPDATE seedlings SET
            base_oid = (SELECT g.base_oid FROM zones z JOIN greenhouses g ON g.oid = z.greenhouse_oid
                        WHERE z.oid = seedlings.area_oid AND g.base_oid IS NOT NULL AND g.base_oid != ''),
            base_name = (SELECT g.base_name FROM zones z JOIN greenhouses g ON g.oid = z.greenhouse_oid
                         WHERE z.oid = seedlings.area_oid AND g.base_oid IS NOT NULL AND g.base_oid != '')
          WHERE base_oid IS NULL AND area_oid IS NOT NULL AND area_oid != ''`,
    desc: 'area_oid → zones → greenhouses → base_oid',
  },
  farm_tasks: {
    sql: `UPDATE farm_tasks SET
            base_oid = (SELECT g.base_oid FROM greenhouses g
                        WHERE g.oid = farm_tasks.greenhouse_id AND g.base_oid IS NOT NULL AND g.base_oid != ''),
            base_name = (SELECT g.base_name FROM greenhouses g
                         WHERE g.oid = farm_tasks.greenhouse_id AND g.base_oid IS NOT NULL AND g.base_oid != '')
          WHERE base_oid IS NULL AND greenhouse_id IS NOT NULL AND greenhouse_id != ''`,
    desc: 'greenhouse_id → greenhouses → base_oid',
  },
  harvest_records: {
    sql: `UPDATE harvest_records SET
            base_oid = (SELECT g.base_oid FROM greenhouses g
                        WHERE g.oid = harvest_records.greenhouse_id AND g.base_oid IS NOT NULL AND g.base_oid != ''),
            base_name = (SELECT g.base_name FROM greenhouses g
                         WHERE g.oid = harvest_records.greenhouse_id AND g.base_oid IS NOT NULL AND g.base_oid != '')
          WHERE base_oid IS NULL AND greenhouse_id IS NOT NULL AND greenhouse_id != ''`,
    desc: 'greenhouse_id → greenhouses → base_oid',
  },
  inventory_stock: { sql: null, desc: '无可靠线索，跳过' },
  crop_instances: { sql: null, desc: '无基地线索，跳过' },
};

(async () => {
  console.log('='.repeat(72));
  console.log(`给核心表加 base_oid${APPLY ? '（执行）' : '（干跑）'}`);
  console.log('='.repeat(72));

  if (!fs.existsSync(DB)) {
    console.error('❌ 数据库不存在:', DB);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB));
  const q = (s) => { const r = db.exec(s); return r[0] ? r[0].values : []; };
  const hasCol = (t, c) => {
    const r = db.exec(`PRAGMA table_info(${t})`);
    return r[0] ? r[0].values.some((v) => v[1] === c) : false;
  };

  // ── 1. 预检 ──
  console.log('\n【预检】');
  const toAdd = [];
  for (const t of TABLES) {
    const exists = q(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='${t}'`)[0][0];
    if (!exists) { console.log(`  ⚠️ ${t} 表不存在，跳过`); continue; }
    const hasOid = hasCol(t, 'base_oid');
    const hasName = hasCol(t, 'base_name');
    const cnt = q(`SELECT COUNT(*) FROM ${t}`)[0][0];
    console.log(`  ${t.padEnd(18)} ${String(cnt).padStart(4)} 行 | base_oid:${hasOid ? '有' : '无'} base_name:${hasName ? '有' : '无'}`);
    if (!hasOid || !hasName) toAdd.push({ t, addOid: !hasOid, addName: !hasName });
  }

  if (!APPLY) {
    console.log('\n【将要执行】');
    for (const x of toAdd) {
      if (x.addOid) console.log(`  ALTER TABLE ${x.t} ADD COLUMN base_oid TEXT`);
      if (x.addName) console.log(`  ALTER TABLE ${x.t} ADD COLUMN base_name TEXT`);
    }
    console.log('\n【回填计划】');
    for (const [t, rule] of Object.entries(BACKFILL)) {
      console.log(`  ${t.padEnd(18)} ${rule.desc}`);
    }
    console.log('\n[干跑] 未写入。加 --apply 执行。');
    return;
  }

  // ── 2. 加列 ──
  console.log('\n【执行：加列】');
  for (const x of toAdd) {
    if (x.addOid) {
      db.run(`ALTER TABLE ${x.t} ADD COLUMN base_oid TEXT`);
      console.log(`  ✅ ${x.t}.base_oid`);
    }
    if (x.addName) {
      db.run(`ALTER TABLE ${x.t} ADD COLUMN base_name TEXT`);
      console.log(`  ✅ ${x.t}.base_name`);
    }
  }
  if (toAdd.length === 0) console.log('  （无需加列，已是最新）');

  // ── 3. 建索引（按基地过滤会用） ──
  console.log('\n【执行：建索引】');
  for (const t of TABLES) {
    if (!hasCol(t, 'base_oid')) continue;
    try {
      db.run(`CREATE INDEX IF NOT EXISTS idx_${t}_base_oid ON ${t}(base_oid)`);
      console.log(`  ✅ idx_${t}_base_oid`);
    } catch (e) {
      console.log(`  ⚠️ idx_${t}_base_oid 失败: ${e.message}`);
    }
  }

  // ── 4. 回填 ──
  console.log('\n【执行：回填】');
  const report = [];
  for (const [t, rule] of Object.entries(BACKFILL)) {
    const before = q(`SELECT COUNT(*) FROM ${t} WHERE base_oid IS NOT NULL AND base_oid != ''`)[0][0];
    if (!rule.sql) {
      const total = q(`SELECT COUNT(*) FROM ${t}`)[0][0];
      console.log(`  ⏭ ${t.padEnd(18)} ${rule.desc}（空值 ${total} 条）`);
      report.push({ t, filled: 0, empty: total, skipped: true });
      continue;
    }
    db.run(rule.sql);
    const after = q(`SELECT COUNT(*) FROM ${t} WHERE base_oid IS NOT NULL AND base_oid != ''`)[0][0];
    const total = q(`SELECT COUNT(*) FROM ${t}`)[0][0];
    const filled = after - before;
    console.log(`  ✅ ${t.padEnd(18)} 回填 ${filled} 条 | 剩余空值 ${total - after}/${total}`);
    report.push({ t, filled, empty: total - after, skipped: false });
  }

  // ── 5. 写回 ──
  fs.writeFileSync(DB, Buffer.from(db.export()));
  console.log('\n✅ 已写回数据库');

  // ── 6. 复核 ──
  const db2 = new SQL.Database(fs.readFileSync(DB));
  const q2 = (s) => { const r = db2.exec(s); return r[0] ? r[0].values : []; };
  console.log('\n【复核】');
  for (const t of TABLES) {
    const total = q2(`SELECT COUNT(*) FROM ${t}`)[0][0];
    const filled = q2(`SELECT COUNT(*) FROM ${t} WHERE base_oid IS NOT NULL AND base_oid != ''`)[0][0];
    console.log(`  ${t.padEnd(18)} 有基地 ${String(filled).padStart(4)} / ${String(total).padStart(4)}`);
  }

  console.log('\n【汇总】');
  const totalFilled = report.reduce((a, r) => a + r.filled, 0);
  const totalEmpty = report.reduce((a, r) => a + r.empty, 0);
  console.log(`  回填 ${totalFilled} 条，未归属 ${totalEmpty} 条（保留空值，读取过滤默认放行）`);
})().catch((e) => {
  console.error('失败:', e.message);
  process.exit(1);
});
