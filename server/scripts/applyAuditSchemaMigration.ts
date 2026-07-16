/**
 * 2026-07-17 审核迁移脚本 — 独立运行（启动白名单已禁用 fixMissingSchema）
 *
 * 执行内容（全部幂等，可重复跑）：
 *   1. pest_disease_dict 表加 images 列（病虫害图片 base64 JSON 数组）
 *   2. fertilizer 模块 10 个索引（查询性能 + generateCode + IoT 去重）
 *   3. application_method 字典补 诱捕/浸泡/其他 3 项（INSERT OR IGNORE）
 *
 * ⚠️ 运行前必须停掉后端服务器（否则磁盘改动会被内存 saveDatabase 覆盖）！
 *
 * 用法：
 *   cd server
 *   npx tsx scripts/applyAuditSchemaMigration.ts
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../data/yuanxingtu.db');

async function main() {
  console.log('=== 审核迁移脚本 ===');
  console.log('DB:', DB_PATH);

  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);
  let changed = false;

  // ---------- 1. pest_disease_dict.images 列 ----------
  try {
    db.run(`ALTER TABLE pest_disease_dict ADD COLUMN images TEXT`);
    console.log('✓ pest_disease_dict 加 images 列');
    changed = true;
  } catch (e: any) {
    if (String(e.message).includes('duplicate column')) {
      console.log('• pest_disease_dict.images 已存在，跳过');
    } else {
      throw e;
    }
  }

  // ---------- 2. fertilizer 模块 10 个索引 ----------
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_create_time ON fertilizer_records(create_time DESC)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_fertilize_time ON fertilizer_records(fertilize_time DESC)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_planting_id ON fertilizer_records(planting_id)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_seedling_id ON fertilizer_records(seedling_id)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_data_source ON fertilizer_records(data_source)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_crop_name ON fertilizer_records(crop_name)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_specs_fertilizer_code ON fertilizer_specs(fertilizer_code)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_specs_status ON fertilizer_specs(status)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_fertilizer_code ON fertilizer_records(fertilizer_code)',
    'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_iot_record_id ON fertilizer_records(iot_record_id)',
  ];
  let idxCount = 0;
  for (const sql of indexes) {
    try {
      db.run(sql);
      idxCount++;
    } catch (e: any) {
      console.error('✗ 索引失败:', sql.slice(0, 80), '—', e.message);
    }
  }
  console.log(`✓ 索引处理完成（${idxCount}/${indexes.length}，IF NOT EXISTS 幂等）`);
  changed = true;

  // ---------- 3. application_method 字典补 3 项 ----------
  const methods = [
    { id: 'AM008', code: 'trap', label: '诱捕', color: 'rose', sort: 8 },
    { id: 'AM009', code: 'soak', label: '浸泡', color: 'indigo', sort: 9 },
    { id: 'AM010', code: 'other', label: '其他', color: 'gray', sort: 10 },
  ];
  for (const m of methods) {
    db.run(
      `INSERT OR IGNORE INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, status)
       VALUES (?, 'application_method', ?, ?, ?, ?, ?, 'active')`,
      [m.id, m.code, m.label, m.code, m.color, m.sort]
    );
  }
  console.log('✓ application_method 字典补 3 项（INSERT OR IGNORE 幂等）');
  changed = true;

  // ---------- 保存 ----------
  if (changed) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    console.log('✓ DB 已保存');
  }

  // ---------- 验证 ----------
  console.log('\n=== 验证 ===');
  const stmt1 = db.prepare(`PRAGMA table_info(pest_disease_dict)`);
  let hasImages = false;
  while (stmt1.step()) {
    if ((stmt1.getAsObject() as any).name === 'images') hasImages = true;
  }
  stmt1.free();
  console.log('pest_disease_dict.images:', hasImages ? '✅' : '❌');

  const stmt2 = db.prepare(
    `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='index' AND name LIKE 'idx_fertilizer_records_%'`
  );
  stmt2.step();
  const idxTotal = (stmt2.getAsObject() as any).c;
  stmt2.free();
  console.log(`idx_fertilizer_records_* 索引: ${idxTotal} 个（期望 8）`);

  const stmt3 = db.prepare(
    `SELECT COUNT(*) AS c FROM dictionaries WHERE id IN ('AM008','AM009','AM010')`
  );
  stmt3.step();
  const dictCount = (stmt3.getAsObject() as any).c;
  stmt3.free();
  console.log(`AM008-010 字典: ${dictCount}/3`);

  db.close();
  console.log('\n迁移完成。请重启后端服务器。');
}

main().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});
