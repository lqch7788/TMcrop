/**
 * 物料入库 冲销/回收/审批入账 行为测试
 * 2026-09-28 审计修复配套测试（P0/P1 批次）
 *
 * 策略：mock db/index 注入隔离内存 sql.js 库，直接调用真实 service 函数，
 *       断言 SQL 结果（不启动 server、不污染主 DB）。
 *
 * 覆盖的审计修复点：
 * 1. 回收候选批次行 = 同名批次行 + 本单归属批次行（预览与执行同口径）——
 *    历史 DEFAULT-${code}-${id} 命名行与现行"默认批次"行并存时不再"预览可冲、确认 400"
 * 2. 主表未命中 → 抛错（此前静默跳过，只扣批次/照写流水 → 账实脱节）
 * 3. 批次可回收余量不足 → 抛错（此前仅 console.warn）
 * 4. applyMaterialInboundApproval 自管事务：失败整体回滚（不再留"半完成"状态）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';

const { memRef } = vi.hoisted(() => ({ memRef: { db: null as unknown } }));

vi.mock('../db/index', () => ({
  getDatabase: () => {
    if (!memRef.db) throw new Error('测试内存库未初始化');
    return memRef.db;
  },
  saveDatabase: () => {
    // 测试中不落盘
  },
}));

import { collectReverseBatchRows, reverseInboundStock, applyMaterialInboundApproval, parseInboundMaterialsStrict } from '../services/materialInboundStock.service';
import { syncInboundToMaterials } from '../db/materials';

const CREATE_MATERIALS = `
  CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    specification TEXT,
    unit TEXT,
    quantity REAL DEFAULT 0,
    minStock REAL DEFAULT 0,
    maxStock REAL DEFAULT 0,
    price TEXT,
    supplier TEXT,
    location TEXT,
    barcode TEXT,
    batchNo TEXT,
    productionDate TEXT,
    expiryDate TEXT,
    lastUpdateTime TEXT,
    dataStatus TEXT DEFAULT '启用',
    remarks TEXT,
    supplierId TEXT DEFAULT ''
  )
`;

const CREATE_BATCH_INVENTORY = `
  CREATE TABLE batch_inventory (
    id TEXT PRIMARY KEY,
    material_code TEXT NOT NULL,
    material_name TEXT,
    batch_no TEXT NOT NULL,
    production_date TEXT,
    expiry_date TEXT,
    unit TEXT,
    total_quantity REAL DEFAULT 0,
    remaining_quantity REAL DEFAULT 0,
    inbound_record_id INTEGER,
    create_time TEXT,
    update_time TEXT
  )
`;

const CREATE_TRANSACTION = `
  CREATE TABLE inventory_transaction (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    instance_id TEXT,
    stock_type TEXT,
    transaction_type TEXT,
    quantity REAL,
    balance_before REAL,
    balance_after REAL,
    business_id TEXT,
    business_type TEXT,
    business_code TEXT,
    operator_id TEXT,
    operator_name TEXT,
    operate_date TEXT,
    remarks TEXT,
    create_time TEXT
  )
`;

const CREATE_INBOUND = `
  CREATE TABLE inbound_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    inboundDate TEXT,
    supplier TEXT,
    supplierId TEXT DEFAULT '',
    operator TEXT,
    status TEXT DEFAULT 'pending',
    materials TEXT,
    voidedDate TEXT,
    recordType TEXT DEFAULT 'inbound',
    reversalOf INTEGER,
    reversalReason TEXT
  )
`;

let db: Database;

function selectRow(sql: string): Record<string, unknown> {
  const r = db.exec(sql);
  if (r.length === 0 || r[0].values.length === 0) return {};
  const row: Record<string, unknown> = {};
  r[0].columns.forEach((c, i) => { row[c] = r[0].values[0][i]; });
  return row;
}

function scalar(sql: string): unknown {
  const r = db.exec(sql);
  return r.length > 0 && r[0].values.length > 0 ? r[0].values[0][0] : undefined;
}

beforeEach(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run(CREATE_MATERIALS);
  db.run(CREATE_BATCH_INVENTORY);
  db.run(CREATE_TRANSACTION);
  db.run(CREATE_INBOUND);
  memRef.db = db;
});

describe('collectReverseBatchRows 回收候选行口径', () => {
  it('同时返回同名批次行与本单归属行，且不重复', () => {
    // 同名行（现行"默认批次"），剩余 0
    db.run(
      `INSERT INTO batch_inventory (id, material_code, batch_no, total_quantity, remaining_quantity, inbound_record_id)
       VALUES ('b1', 'M1', '默认批次', 100, 0, 44)`
    );
    // 本单归属的历史命名行（DEFAULT-code-id），剩余 100
    db.run(
      `INSERT INTO batch_inventory (id, material_code, batch_no, total_quantity, remaining_quantity, inbound_record_id)
       VALUES ('b2', 'M1', 'DEFAULT-M1-44', 100, 100, 44)`
    );
    // 他单的同名行（不该被本单回收，除非批次名相同——同名即共享池，属预期）
    db.run(
      `INSERT INTO batch_inventory (id, material_code, batch_no, total_quantity, remaining_quantity, inbound_record_id)
       VALUES ('b3', 'M1', 'B-OTHER', 50, 50, 99)`
    );

    const rows = collectReverseBatchRows(db, 'M1', '默认批次', 44);
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(['b1', 'b2']); // b3 既不同名、也非本单归属 → 排除
    expect(rows.reduce((s, r) => s + r.remaining, 0)).toBe(100);
  });
});

describe('reverseInboundStock 回收执行', () => {
  it('历史命名批次行也能被回收（审计用例：剩 0 的默认批次行 + 剩 100 的 DEFAULT-* 行）', () => {
    db.run(`INSERT INTO materials (code, name, quantity) VALUES ('M1', '测试物料', 100)`);
    db.run(
      `INSERT INTO batch_inventory (id, material_code, batch_no, total_quantity, remaining_quantity, inbound_record_id)
       VALUES ('b1', 'M1', '默认批次', 100, 0, 44)`
    );
    db.run(
      `INSERT INTO batch_inventory (id, material_code, batch_no, total_quantity, remaining_quantity, inbound_record_id)
       VALUES ('b2', 'M1', 'DEFAULT-M1-44', 100, 100, 44)`
    );

    reverseInboundStock(db, [{ code: 'M1', batchNo: '', quantity: 100 }], 44, 'RK-TEST-1', '测试员');

    expect(scalar(`SELECT quantity FROM materials WHERE code = 'M1'`)).toBe(0);
    // b1 剩 0 无需扣减；b2 承担全部 100
    expect(scalar(`SELECT remaining_quantity FROM batch_inventory WHERE id = 'b1'`)).toBe(0);
    expect(scalar(`SELECT remaining_quantity FROM batch_inventory WHERE id = 'b2'`)).toBe(0);
    expect(scalar(`SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type = 'material_reverse_inbound'`)).toBe(1);
  });

  it('可回收余量不足时抛错（不再静默只扣主表）', () => {
    db.run(`INSERT INTO materials (code, name, quantity) VALUES ('M1', '测试物料', 100)`);
    db.run(
      `INSERT INTO batch_inventory (id, material_code, batch_no, total_quantity, remaining_quantity, inbound_record_id)
       VALUES ('b1', 'M1', '默认批次', 100, 10, 44)`
    );

    expect(() =>
      reverseInboundStock(db, [{ code: 'M1', batchNo: '', quantity: 100 }], 44, 'RK-TEST-2', '测试员')
    ).toThrow(/可回收余量 10 不足以回收入库量 100/);
    // 事务由调用方管理；这里断言流水未写入（不会出现"凭空的反向流水"）
    expect(scalar(`SELECT COUNT(*) FROM inventory_transaction`)).toBe(0);
  });

  it('主数据不存在时抛错（fail loud，不再静默跳过）', () => {
    expect(() =>
      reverseInboundStock(db, [{ code: 'GHOST', batchNo: '', quantity: 5 }], 44, 'RK-TEST-3', '测试员')
    ).toThrow(/主数据不存在/);
  });
});

describe('parseInboundMaterialsStrict 严格解析（写路径）', () => {
  it('正常 JSON / 双重编码 / 空值 均可解析', () => {
    expect(parseInboundMaterialsStrict('[{"code":"M1","quantity":1}]')).toHaveLength(1);
    expect(parseInboundMaterialsStrict('"[{\\"code\\":\\"M1\\",\\"quantity\\":1}]"')).toHaveLength(1);
    expect(parseInboundMaterialsStrict('')).toEqual([]);
    expect(parseInboundMaterialsStrict(null)).toEqual([]);
  });

  it('损坏数据抛错（不再退化成空数组导致"静默不回收库存"）', () => {
    expect(() => parseInboundMaterialsStrict('{坏JSON')).toThrow(/明细数据损坏/);
    expect(() => parseInboundMaterialsStrict('{"code":"M1"}')).toThrow(/不是数组/);
  });
});

describe('applyMaterialInboundApproval 审批入账', () => {
  it('入库单不存在 → success:false（不再被上层当成成功）', () => {
    const r = applyMaterialInboundApproval(db, '999', 'approved');
    expect(r.success).toBe(false);
    expect(r.message).toContain('不存在');
  });

  it('已完成单重复审批 → 幂等短路，库存不重复累加', () => {
    db.run(`INSERT INTO materials (code, name, quantity) VALUES ('M1', '测试物料', 30)`);
    db.run(
      `INSERT INTO inbound_records (id, code, status, supplier, operator, materials)
       VALUES (7, 'RK-IDEM', 'completed', '供应商A', '测试员', '[{"code":"M1","name":"测试物料","quantity":30,"unit":"件"}]')`
    );

    const r = applyMaterialInboundApproval(db, '7', 'approved');
    expect(r.success).toBe(true);
    expect(r.message).toContain('跳过重复入账');
    expect(scalar(`SELECT quantity FROM materials WHERE code = 'M1'`)).toBe(30); // 未变成 60
  });

  it('入账过程抛错时整体回滚：单据仍为 pending、库存/批次账不变', () => {
    db.run(`INSERT INTO materials (code, name, quantity) VALUES ('M1', '测试物料', 0)`);
    db.run(
      `INSERT INTO inbound_records (id, code, status, supplier, operator, materials)
       VALUES (8, 'RK-ROLLBACK', 'pending', '供应商A', '测试员', '[{"code":"M1","name":"测试物料","quantity":50,"unit":"件"}]')`
    );
    // 故意制造失败：删掉流水表 → writeStockTransaction 的 INSERT 抛错
    db.run('DROP TABLE inventory_transaction');

    expect(() => applyMaterialInboundApproval(db, '8', 'approved')).toThrow();

    // 回滚后：单据状态未变、主表未加库存、批次账无新增
    expect(scalar(`SELECT status FROM inbound_records WHERE id = 8`)).toBe('pending');
    expect(scalar(`SELECT quantity FROM materials WHERE code = 'M1'`)).toBe(0);
    expect(scalar(`SELECT COUNT(*) FROM batch_inventory`)).toBe(0);
  });
});

describe('批次A-2：供应商主数据 id 落库', () => {
  it('新建物料时写入 supplierId（明细为空则取单头兜底）', () => {
    syncInboundToMaterials(
      [{ code: 'M-A2-1', name: '物料A', quantity: 5, unit: '件', supplier: '金色稻种有限公司', supplierId: 'SUP001' }],
      { fallbackSupplier: '兜底供应商', fallbackSupplierId: 'SUP999' }
    );
    const row = selectRow("SELECT supplier, supplierId FROM materials WHERE code = 'M-A2-1'");
    expect(row.supplier).toBe('金色稻种有限公司');
    expect(row.supplierId).toBe('SUP001');
  });

  it('明细未带供应商时，单头兜底同时落 id', () => {
    syncInboundToMaterials(
      [{ code: 'M-A2-2', name: '物料B', quantity: 3, unit: '件' }],
      { fallbackSupplier: '兜底供应商', fallbackSupplierId: 'SUP888' }
    );
    const row = selectRow("SELECT supplier, supplierId FROM materials WHERE code = 'M-A2-2'");
    expect(row.supplier).toBe('兜底供应商');
    expect(row.supplierId).toBe('SUP888');
  });

  it('已有物料：本次不带 id 时不清空既有 supplierId', () => {
    syncInboundToMaterials([{ code: 'M-A2-3', name: '物料C', quantity: 1, unit: '件', supplier: '老供应商', supplierId: 'SUP111' }], {});
    // 第二次入库：只带名称、不带 id
    syncInboundToMaterials([{ code: 'M-A2-3', name: '物料C', quantity: 1, unit: '件', supplier: '老供应商2' }], {});
    const row = selectRow("SELECT supplier, supplierId FROM materials WHERE code = 'M-A2-3'");
    expect(row.supplier).toBe('老供应商2');
    expect(row.supplierId).toBe('SUP111'); // 名称更新了，id 保留（不被空值抹掉）
  });
});
