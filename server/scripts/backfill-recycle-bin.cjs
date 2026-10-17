/**
 * 作物管理回收站 —— 历史软删数据回填（一次性脚本）
 *
 * 用途：把 seed_sources / seedlings / plantings 中已软删除（deleted_at 非空）的记录
 *       补登到 recycle_bin，使回收站能统一查看与恢复历史删除数据。
 *
 * 纪律：必须先停服，再执行本脚本（运行中的 sql.js 内存快照会覆盖磁盘写入）。
 * 用法：node server/scripts/backfill-recycle-bin.cjs
 * 幂等：按 (entity_type, entity_id) 去重，不重复插入。
 */
const path = require('path');
const Database = require(path.join(__dirname, '..', 'node_modules', 'better-sqlite3'));
const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const db = new Database(DB_PATH);

// 1) 确保回收站表存在（与 schema.ts 保持一致）
db.exec(`
  CREATE TABLE IF NOT EXISTS recycle_bin (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL DEFAULT 'crop',
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_code TEXT,
    display_name TEXT,
    snapshot TEXT NOT NULL,
    dependencies TEXT,
    restore_info TEXT,
    delete_mode TEXT NOT NULL,
    source_page TEXT,
    deleted_by TEXT,
    deleted_by_id TEXT,
    deleted_at TEXT NOT NULL,
    restore_status TEXT NOT NULL DEFAULT 'pending',
    restored_by TEXT,
    restored_at TEXT,
    restore_error TEXT,
    purge_at TEXT,
    created_at TEXT NOT NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_recycle_list ON recycle_bin(module, entity_type, restore_status, deleted_at DESC)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_recycle_code ON recycle_bin(entity_code)`);

function nextId() {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RCY-${ymd}-`;
  const row = db.prepare(`SELECT id FROM recycle_bin WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`);
  const serial = row ? (parseInt(String(row.id).slice(prefix.length), 10) || 0) + 1 : 1;
  return `${prefix}${String(serial).padStart(4, '0')}`;
}

const existsStmt = db.prepare(
  `SELECT 1 FROM recycle_bin WHERE entity_type = ? AND entity_id = ? LIMIT 1`,
);
const insertStmt = db.prepare(`
  INSERT INTO recycle_bin (
    id, module, entity_type, entity_id, entity_code, display_name,
    snapshot, dependencies, restore_info, delete_mode, source_page,
    deleted_by, deleted_by_id, deleted_at, restore_status, created_at
  ) VALUES (?, 'crop', ?, ?, ?, ?, ?, NULL, NULL, 'soft', ?, ?, NULL, ?, 'pending', ?)
`);

/** 通用回填 */
function backfill(table, entityType, page, buildMeta) {
  const rows = db.prepare(`SELECT * FROM ${table} WHERE deleted_at IS NOT NULL`).all();
  let inserted = 0;
  let skipped = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      if (existsStmt.get(entityType, row.id)) { skipped++; continue; }
      const meta = buildMeta(row);
      const deletedAt = row.deleted_at || new Date().toISOString();
      insertStmt.run(
        nextId(), entityType, row.id, meta.code, meta.name,
        JSON.stringify(row), page, meta.by || null, deletedAt, deletedAt,
      );
      inserted++;
    }
  });
  tx();
  console.log(`[backfill] ${entityType}: 插入 ${inserted} 条，跳过 ${skipped} 条（已存在）`);
}

backfill('seed_sources', 'seed_source', '/crop/seed-source', (row) => ({
  code: row.source_code || '',
  name: `种源 ${row.source_code || row.id}`,
  by: row.update_by || row.create_by || null,
}));

backfill('seedlings', 'seedling', '/crop/seedling', (row) => ({
  code: row.seedling_code || '',
  name: `育苗 ${row.seedling_code || row.id} · ${row.crop_name || ''}${row.crop_variety ? '/' + row.crop_variety : ''}`,
  by: row.create_by || null,
}));

backfill('plantings', 'planting', '/crop/planting', (row) => ({
  code: row.planting_code || '',
  name: `种植 ${row.planting_code || row.id} · ${row.crop_name || ''}${row.crop_variety ? '/' + row.crop_variety : ''}`,
  by: row.create_by || row.update_by || null,
}));

const total = db.prepare(`SELECT COUNT(*) AS c FROM recycle_bin`).get().c;
console.log(`[backfill] 完成：recycle_bin 共 ${total} 条`);
db.close();
