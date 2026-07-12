/**
 * 药剂库扁平化迁移脚本（独立运行）
 * 2026-07-12：将旧双层结构 pesticide_library + pesticide_specs 合并为单层扁平 pesticide_specs
 * 用法：cd server && npx tsx scripts/migratePesticideFlat.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../data/yuanxingtu.db');

// 备份原数据库
const backupPath = DB_PATH + `.backup-${Date.now()}`;
fs.copyFileSync(DB_PATH, backupPath);
console.log(`✓ 已备份数据库: ${backupPath}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 检查是否需要迁移
const tableInfo = db.pragma('table_info(pesticide_specs)') as any[];
const hasOldFK = tableInfo.some((col: any) => col.name === 'pesticide_id');
const hasNewCol = tableInfo.some((col: any) => col.name === 'stock_quantity');

if (!hasOldFK || hasNewCol) {
  console.log(hasNewCol ? '→ 已扁平化，无需迁移' : '→ 未找到旧表，跳过');
  db.close();
  process.exit(0);
}

console.log('→ 检测到旧版双层结构，开始扁平化迁移...');

// 1. 读旧数据
const oldSpecs = db.prepare('SELECT * FROM pesticide_specs').all() as any[];
const oldLibrary = db.prepare('SELECT * FROM pesticide_library').all() as any[];
console.log(`  已读取: ${oldSpecs.length} 条 specs, ${oldLibrary.length} 条 library`);

// 2. 建 lib map
const libMap = new Map<string, any>();
for (const row of oldLibrary) libMap.set(row.id, row);

// 3. 删除旧表
db.exec('DROP TABLE IF EXISTS pesticide_specs');
console.log('  已删除旧 pesticide_specs 表');

// 4. 创建新扁平表
db.exec(`
  CREATE TABLE pesticide_specs (
    id TEXT PRIMARY KEY,
    pesticide_code TEXT NOT NULL UNIQUE,
    pesticide_name TEXT NOT NULL,
    pesticide_type TEXT,
    ingredient TEXT,
    mechanism TEXT,
    function_desc TEXT,
    taboo_desc TEXT,
    target_pests TEXT,
    spec_content TEXT,
    formulation TEXT,
    manufacturer TEXT,
    brand_name TEXT,
    suggested_dosage TEXT,
    suggested_ratio TEXT,
    dosage_unit TEXT,
    remark TEXT,
    stock_quantity REAL DEFAULT 0,
    stock_unit TEXT DEFAULT 'kg',
    unit_price REAL DEFAULT 0,
    batch_number TEXT,
    production_date TEXT,
    expiration_date TEXT,
    package_spec TEXT,
    status TEXT DEFAULT 'active',
    create_time TEXT DEFAULT (datetime('now','localtime')),
    update_time TEXT DEFAULT (datetime('now','localtime'))
  )
`);
console.log('  ✓ 新扁平表已创建');

// 5. 迁移数据
const insert = db.prepare(`INSERT INTO pesticide_specs (
  id, pesticide_code, pesticide_name, pesticide_type, ingredient, mechanism,
  function_desc, taboo_desc, target_pests,
  spec_content, formulation, manufacturer, brand_name,
  suggested_dosage, suggested_ratio, dosage_unit, remark,
  stock_quantity, stock_unit, unit_price, status, create_time, update_time
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const now = new Date().toISOString();
let codeSeq = 0;

const migrateMany = db.transaction(() => {
  for (const specRow of oldSpecs) {
    const libRow = libMap.get(specRow.pesticide_id);
    codeSeq++;
    const newCode = `PC-${String(codeSeq).padStart(4, '0')}`;

    insert.run(
      specRow.id, newCode,
      libRow?.pesticide_name || '未知药剂',
      libRow?.pesticide_type || null,
      libRow?.ingredient || null,
      libRow?.mechanism || null,
      libRow?.function_desc || null,
      libRow?.taboo_desc || null,
      libRow?.target_pests || null,
      specRow.spec_content || null,
      specRow.formulation || null,
      specRow.manufacturer || null,
      specRow.brand_name || null,
      specRow.suggested_dosage || null,
      specRow.suggested_ratio || null,
      specRow.dosage_unit || null,
      specRow.remark || null,
      0, 'kg', 0,
      libRow?.status || 'active',
      specRow.create_time || now,
      now
    );
  }

  // 无 spec 的主表行创建占位行
  const specPesticideIds = new Set(oldSpecs.map((s: any) => s.pesticide_id));
  for (const libRow of oldLibrary) {
    if (!specPesticideIds.has(libRow.id)) {
      codeSeq++;
      const newCode = `PC-${String(codeSeq).padStart(4, '0')}`;
      const newId = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      insert.run(
        newId, newCode,
        libRow.pesticide_name,
        libRow.pesticide_type || null,
        libRow.ingredient || null,
        libRow.mechanism || null,
        libRow.function_desc || null,
        libRow.taboo_desc || null,
        libRow.target_pests || null,
        null, null, null, null, null, null, null, null,
        0, 'kg', 0,
        libRow.status || 'active',
        libRow.create_time || now,
        now
      );
    }
  }
});

migrateMany();
console.log(`  ✓ 已迁移 ${codeSeq} 条记录`);

// 6. 创建入库审计表
db.exec(`
  CREATE TABLE IF NOT EXISTS pesticide_stock_in_records (
    id TEXT PRIMARY KEY,
    spec_id TEXT NOT NULL,
    pesticide_code TEXT,
    pesticide_name TEXT,
    quantity REAL NOT NULL,
    remark TEXT,
    create_time TEXT DEFAULT (datetime('now','localtime'))
  )
`);
console.log('  ✓ pesticide_stock_in_records 表已创建');

// 7. 验证
const count = (db.prepare('SELECT COUNT(*) as cnt FROM pesticide_specs').get() as any).cnt;
console.log(`\n✓ 迁移完成！新表共 ${count} 条记录`);
console.log(`✓ 备份文件: ${backupPath}`);
console.log('\n→ 现在可以重启服务器');
db.close();
