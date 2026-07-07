/**
 * 迁移脚本单元测试（2026-07-07）
 *
 * 策略：使用隔离内存 sql.js 数据库（与 inventoryInbound.test.ts 风格一致）
 *       手工建表 + 跑真实 SQL 断言，验证迁移算法在 4 个核心场景的行为。
 *
 * 测试覆盖：
 * 1. 幂等性：跑 3 次后行数稳定
 * 2. 外购类型迁移：source_origin='external_purchase' 的种源被迁移
 * 3. 跳过非外购类型：source_origin='self_produced' 等不被迁移
 * 4. 跳过已删除：deleted_at IS NOT NULL 不被迁移
 *
 * 注：无法直接 import scripts/ 中的 migrateOne（scripts 主入口会立即 main()），
 *     故单测内本地复刻 migrateOne SQL 块以验证算法正确性。
 *     真实 db 上的迁移：执行 scripts/db-migrations/migrateSeedSourcesToInventoryStock.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

let db: Database;
let testCounter = 0;

// 必要表结构（精简版，足够单测）
const CREATE_SEED_SOURCES = `
  CREATE TABLE IF NOT EXISTS seed_sources (
    id TEXT PRIMARY KEY,
    source_code TEXT NOT NULL,
    source_origin TEXT,
    crop_code TEXT,
    crop_id TEXT,
    crop_name TEXT,
    crop_variety TEXT,
    variety_id TEXT,
    variety_name TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    initial_count REAL DEFAULT 0,
    remaining_quantity REAL DEFAULT 0,
    quantity REAL DEFAULT 0,
    unit TEXT,
    purchase_price REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    purchase_date TEXT,
    create_time TEXT,
    stock_instance_id TEXT,
    deleted_at TEXT
  )
`;

const CREATE_INVENTORY_STOCK = `
  CREATE TABLE IF NOT EXISTS inventory_stock (
    id TEXT PRIMARY KEY,
    instance_id TEXT UNIQUE NOT NULL,
    stock_type TEXT NOT NULL,
    business_id TEXT,
    business_type TEXT,
    business_code TEXT,
    crop_id TEXT,
    crop_name TEXT,
    variety_id TEXT,
    variety_name TEXT,
    current_quantity REAL DEFAULT 0,
    available_quantity REAL DEFAULT 0,
    frozen_quantity REAL DEFAULT 0,
    unit TEXT,
    source_type TEXT,
    inbound_date TEXT,
    status TEXT DEFAULT 'in_stock',
    version INTEGER DEFAULT 1,
    create_time TEXT,
    update_time TEXT
  )
`;

const CREATE_INVENTORY_INBOUND = `
  CREATE TABLE IF NOT EXISTS inventory_inbound_records (
    id TEXT PRIMARY KEY,
    record_type TEXT DEFAULT 'inbound',
    record_date TEXT NOT NULL,
    source_module TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_code TEXT,
    stock_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    crop_code TEXT,
    crop_name TEXT,
    variety_name TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    unit_price REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    supplier_id TEXT,
    supplier_name TEXT,
    business_id TEXT,
    notes TEXT,
    create_by TEXT,
    create_time TEXT,
    update_time TEXT
  )
`;

function migId(prefix: string): string {
  testCounter++;
  return `${prefix}_test_${Date.now()}_${testCounter}`;
}

/**
 * 单条迁移算法（与 scripts/db-migrations/migrateSeedSourcesToInventoryStock.ts 中的 migrateOne 等价）
 */
function migrateOne(db: Database, src: any, ranAt: string): void {
  const stockId = migId('MIG_STOCK');
  const instanceId = migId('MIG_INST');
  const inboundId = migId('MIG_INB');

  db.run(
    `INSERT INTO inventory_stock (
      id, instance_id, stock_type, business_id, business_type, business_code,
      crop_id, crop_name, variety_id, variety_name,
      current_quantity, available_quantity, frozen_quantity,
      unit, source_type, inbound_date, status, version, create_time, update_time
    ) VALUES (?, ?, 'seed', ?, 'seed_source', ?, ?, ?, ?, ?, ?, ?, 0, ?, 'external_purchase', ?, 'in_stock', 1, ?, ?)`,
    [
      stockId, instanceId, src.id, src.source_code,
      src.crop_id || null, src.crop_name, src.variety_id || null, src.variety_name,
      src.remaining_quantity || 0, src.remaining_quantity || 0,
      src.unit, src.purchase_date || src.create_time, src.create_time, ranAt,
    ],
  );

  db.run(
    `INSERT INTO inventory_inbound_records (
      id, record_type, record_date, source_module, source_id, source_code,
      stock_type, source_type, crop_code, crop_name, variety_name,
      quantity, unit, unit_price, total_amount,
      supplier_id, supplier_name, business_id, notes, create_by, create_time, update_time
    ) VALUES (?, 'inbound', ?, 'seed_source', ?, ?, 'seed', 'external_purchase',
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', ?, ?)`,
    [
      inboundId, src.purchase_date || src.create_time, src.id, src.source_code,
      src.crop_code || null, src.crop_name, src.variety_name,
      src.initial_count || src.quantity || 0, src.unit,
      src.purchase_price || 0, src.total_amount || 0,
      src.supplier_id || null, src.supplier_name, src.id,
      `[历史迁移回填] seed_source_id=${src.id}; ran_at=${ranAt}`,
      src.create_time, ranAt,
    ],
  );

  db.run(
    `UPDATE seed_sources SET stock_instance_id = ? WHERE id = ? AND stock_instance_id IS NULL`,
    [stockId, src.id],
  );
}

/**
 * 拉取外购类型、未逻辑删除的种源（与 scripts 一致）
 */
function fetchExternalSources(db: Database): any[] {
  const stmt = db.prepare(
    `SELECT id, source_code, crop_code, crop_id, crop_name, crop_variety,
            variety_id, variety_name, supplier_id, supplier_name,
            initial_count, remaining_quantity, quantity, unit,
            purchase_price, total_amount, purchase_date, create_time, stock_instance_id
     FROM seed_sources
     WHERE source_origin = 'external_purchase'
       AND deleted_at IS NULL`,
  );
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/**
 * 双幂等检查 — 任一存在则跳过
 */
function shouldSkip(db: Database, src: any): boolean {
  const stockChk = db.prepare(
    `SELECT COUNT(*) AS cnt FROM inventory_stock WHERE business_type='seed_source' AND business_id=?`,
  );
  stockChk.bind([src.id]);
  stockChk.step();
  const stockExists = (stockChk.getAsObject() as any).cnt > 0;
  stockChk.free();

  const inboundChk = db.prepare(
    `SELECT COUNT(*) AS cnt FROM inventory_inbound_records
     WHERE source_module='seed_source' AND source_id=? AND notes LIKE '[历史迁移回填]%'`,
  );
  inboundChk.bind([src.id]);
  inboundChk.step();
  const inboundExists = (inboundChk.getAsObject() as any).cnt > 0;
  inboundChk.free();

  return stockExists || inboundExists;
}

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run(CREATE_SEED_SOURCES);
  db.run(CREATE_INVENTORY_STOCK);
  db.run(CREATE_INVENTORY_INBOUND);

  // 5 条外购（应被迁移）
  for (let i = 0; i < 5; i++) {
    db.run(
      `INSERT INTO seed_sources (id, source_code, source_origin, crop_name, variety_name,
        supplier_name, initial_count, remaining_quantity, quantity, unit,
        purchase_price, total_amount, purchase_date, create_time, deleted_at)
        VALUES (?, ?, 'external_purchase', ?, ?, ?, ?, ?, 100, '袋', ?, ?, '2026-06-01', '2026-06-01 10:00:00', NULL)`,
      [`ext_${i}`, `ZZ20260601-00${i}`, `作物${i}`, `品种${i}`,
        `供应商${i % 2}`, 100, 100, 25, 2500],
    );
  }

  // 2 条自产（应被跳过）
  for (let i = 0; i < 2; i++) {
    db.run(
      `INSERT INTO seed_sources (id, source_code, source_origin, crop_name, variety_name,
        supplier_name, initial_count, remaining_quantity, quantity, unit, create_time, deleted_at)
        VALUES (?, ?, 'self_produced', ?, ?, NULL, 50, 50, 50, '袋', '2026-06-01', NULL)`,
      [`self_${i}`, `ZZ202606-S${i}`, `作物S${i}`, `品种S${i}`],
    );
  }

  // 1 条外购但 deleted（应被跳过）
  db.run(
    `INSERT INTO seed_sources (id, source_code, source_origin, crop_name, variety_name,
      supplier_name, initial_count, remaining_quantity, quantity, unit,
      create_time, deleted_at)
      VALUES ('del_1', 'ZZ-OLD-1', 'external_purchase', '已删除', '已删除',
        '供应商', 50, 50, 50, '袋', '2026-05-01', '2026-06-15 10:00:00')`,
  );
});

describe('migrateSeedSourcesToInventoryStock', () => {
  it('幂等性：跑 3 次后行数稳定 (sources=5 expect inventory_stock=5, inventory_inbound=5)', () => {
    const ranAt = '2026-07-07T10:00:00Z';
    let migrated = 0;
    let skipped = 0;

    // 第 1 次
    for (const src of fetchExternalSources(db)) {
      if (shouldSkip(db, src)) { skipped++; continue; }
      migrateOne(db, src, ranAt);
      migrated++;
    }
    expect(migrated).toBe(5);
    expect(skipped).toBe(0);

    // 第 2 次 — 应全部跳过
    migrated = 0;
    skipped = 0;
    for (const src of fetchExternalSources(db)) {
      if (shouldSkip(db, src)) { skipped++; continue; }
      migrateOne(db, src, ranAt);
      migrated++;
    }
    expect(migrated).toBe(0);
    expect(skipped).toBe(5);

    // 第 3 次 — 同上
    migrated = 0;
    skipped = 0;
    for (const src of fetchExternalSources(db)) {
      if (shouldSkip(db, src)) { skipped++; continue; }
      migrateOne(db, src, ranAt);
      migrated++;
    }
    expect(migrated).toBe(0);
    expect(skipped).toBe(5);

    // 最终行数稳定
    const stockCntStmt = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_stock WHERE business_type='seed_source'`);
    stockCntStmt.step();
    expect((stockCntStmt.getAsObject() as any).cnt).toBe(5);
    stockCntStmt.free();

    const inboundCntStmt = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_inbound_records WHERE source_module='seed_source' AND notes LIKE '[历史迁移回填]%'`);
    inboundCntStmt.step();
    expect((inboundCntStmt.getAsObject() as any).cnt).toBe(5);
    inboundCntStmt.free();
  });

  it('跳过 source_origin != external_purchase 的种源（self_produced 不迁移）', () => {
    // 此时 self_0 / self_1 在 fetchExternalSources 已过滤掉
    const sources = fetchExternalSources(db);
    expect(sources.length).toBe(5);  // 只返回 external_purchase 的 5 条
    expect(sources.find((s) => s.id === 'self_0')).toBeUndefined();
    expect(sources.find((s) => s.id === 'self_1')).toBeUndefined();
  });

  it('跳过 deleted_at IS NOT NULL 的种源（del_1 不应被迁移）', () => {
    const sources = fetchExternalSources(db);
    expect(sources.find((s) => s.id === 'del_1')).toBeUndefined();
  });

  it('迁移后 seed_sources.stock_instance_id 被反向同步', () => {
    const ranAt = '2026-07-07T10:00:00Z';
    for (const src of fetchExternalSources(db)) {
      if (shouldSkip(db, src)) continue;
      migrateOne(db, src, ranAt);
    }

    const stmt = db.prepare(`SELECT id, stock_instance_id FROM seed_sources WHERE source_origin='external_purchase' AND deleted_at IS NULL`);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      expect(row.stock_instance_id).toBeTruthy();
      // 反向同步的 stock_instance_id 必须对应 inventory_stock 行
      const chk = db.prepare(`SELECT COUNT(*) AS cnt FROM inventory_stock WHERE id=?`);
      chk.bind([row.stock_instance_id]);
      chk.step();
      expect((chk.getAsObject() as any).cnt).toBe(1);
      chk.free();
    }
    stmt.free();
  });

  it('迁移行带规范的 [历史迁移回填] 备注 + system 创建者标识', () => {
    const ranAt = '2026-07-07T10:00:00Z';
    for (const src of fetchExternalSources(db)) {
      if (shouldSkip(db, src)) continue;
      migrateOne(db, src, ranAt);
    }

    const stmt = db.prepare(`SELECT notes, create_by FROM inventory_inbound_records WHERE source_module='seed_source'`);
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      expect(row.notes).toMatch(/^\[历史迁移回填\] seed_source_id=/);
      expect(row.create_by).toBe('system');
    }
    stmt.free();
  });
});
