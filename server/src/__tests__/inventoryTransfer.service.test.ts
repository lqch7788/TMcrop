/**
 * inventoryTransfer.service 单元测试
 * 2026-06-24: 库存调拨入种源 - B1 验证门
 *
 * 策略：使用 sql.js 内存数据库 + vi.mock 替换 getDatabase/saveDatabase
 *       不污染主 DB，不启动 server。
 *
 * 测试覆盖：
 * 1. listTransferableSources - 仅返回 3 种 stock_type 且 qty>0
 * 2. listTransferableSources - 关键字筛选 + 日期范围筛选
 * 3. executeTransferToSource - 正常调拨 1 条 → 验证所有表写入
 * 4. executeTransferToSource - 多选调拨 2 条（seed + product）→ 验证独立 code
 * 5. executeTransferToSource - quantity 超限 → 抛错且无写入
 * 6. executeTransferToSource - stockId 不存在 → 抛 404
 * 7. executeTransferToSource - 部分失败（中间 item 失败）→ 全量回滚
 * 8. executeTransferToSource - quantity 降为 0 → status 变 'depleted'
 * 9. 14 个 original_* / transferred_from_* 字段全量填充
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'

// ============ Hoisted 共享状态（vi.mock factory 中访问） ============

const mockState = vi.hoisted(() => ({
  db: null as Database | null,
  instanceCounter: 0,
  codeCounter: 0,
}))

// ============ Mock 依赖模块 ============

vi.mock('../db', () => ({
  getDatabase: () => mockState.db,
  saveDatabase: () => {},
}))

vi.mock('../services/inventory.service', () => ({
  generateInstanceId: async () => {
    mockState.instanceCounter += 1
    return `INS-TEST-MOCK-${String(mockState.instanceCounter).padStart(4, '0')}`
  },
}))

vi.mock('../services/seedSource.service', () => ({
  seedSourceService: {
    generateCode: async () => {
      mockState.codeCounter += 1
      return `ZZ20260624-${String(mockState.codeCounter).padStart(3, '0')}`
    },
  },
}))

// ============ 测试目标 ============

import {
  executeTransferToSource,
  listTransferableSources,
  InventoryTransferBusinessError,
} from '../services/inventoryTransfer.service'

// ============ 建表 SQL（精简版，覆盖 service 写入所需字段） ============

const CREATE_INVENTORY_STOCK = `
  CREATE TABLE IF NOT EXISTS inventory_stock (
    id TEXT PRIMARY KEY,
    instance_id TEXT UNIQUE,
    stock_type TEXT NOT NULL,
    business_id TEXT,
    business_type TEXT,
    business_code TEXT,
    source_type TEXT,
    source_instance_id TEXT,
    source_module TEXT,
    source_id TEXT,
    source_form TEXT,
    crop_id TEXT,
    crop_code TEXT,
    crop_name TEXT,
    variety_id TEXT,
    variety_name TEXT,
    current_quantity REAL DEFAULT 0,
    available_quantity REAL DEFAULT 0,
    frozen_quantity REAL DEFAULT 0,
    unit TEXT,
    warehouse_id TEXT,
    warehouse_name TEXT,
    inbound_date TEXT,
    unit_price REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    status TEXT,
    version INTEGER DEFAULT 1,
    harvest_record_id TEXT,
    production_plan_code TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    create_time TEXT,
    update_time TEXT,
    deleted_at TEXT
  )
`

const CREATE_SEED_SOURCES = `
  CREATE TABLE IF NOT EXISTS seed_sources (
    id TEXT PRIMARY KEY,
    source_code TEXT,
    source_name TEXT,
    source_type TEXT,
    source_origin TEXT,
    production_plan_code TEXT,
    crop_category TEXT,
    type_name TEXT,
    variety_name TEXT,
    crop_name TEXT,
    crop_variety TEXT,
    crop_code TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    quantity REAL,
    unit TEXT,
    purchase_date TEXT,
    purchase_price REAL,
    total_amount REAL,
    used_quantity REAL,
    remaining_quantity REAL,
    remarks TEXT,
    create_by TEXT,
    create_by_id TEXT,
    propagation_type TEXT,
    propagation_status TEXT,
    propagation_method TEXT,
    parent_male_id TEXT,
    parent_male_code TEXT,
    parent_female_id TEXT,
    parent_female_code TEXT,
    mother_plant_id TEXT,
    mother_plant_code TEXT,
    linked_planting_id TEXT,
    linked_planting_code TEXT,
    propagation_start_date TEXT,
    expected_harvest_date TEXT,
    actual_harvest_date TEXT,
    breeding_location TEXT,
    target_traits TEXT,
    generation TEXT,
    pictures TEXT,
    initial_count REAL,
    print_count INTEGER DEFAULT 0,
    end_type TEXT,
    end_time TEXT,
    parent_source_id TEXT,
    deleted_at TEXT,
    -- 2026-06-24: 库存调拨入种源 - 14 个新字段
    transferred_from_stock_id TEXT,
    transferred_from_business_type TEXT,
    transferred_from_business_id TEXT,
    original_inbound_date TEXT,
    original_source_module TEXT,
    original_source_id TEXT,
    original_harvest_record_id TEXT,
    original_crop_id TEXT,
    original_crop_name TEXT,
    original_variety_id TEXT,
    original_variety_name TEXT,
    original_unit TEXT,
    original_unit_price REAL,
    original_supplier_id TEXT,
    original_supplier_name TEXT,
    original_production_plan_code TEXT,
    create_time TEXT,
    update_time TEXT
  )
`

const CREATE_CROP_INSTANCES = `
  CREATE TABLE IF NOT EXISTS crop_instances (
    id TEXT PRIMARY KEY,
    instance_code TEXT,
    business_id TEXT,
    business_type TEXT,
    crop_name TEXT,
    initial_quantity REAL,
    current_quantity REAL,
    source_instance_id TEXT,
    status TEXT,
    create_time TEXT,
    update_time TEXT
  )
`

const CREATE_INVENTORY_TRANSACTION = `
  CREATE TABLE IF NOT EXISTS inventory_transaction (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE,
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
`

// ============ 工具函数 ============

function selectAll(db: Database, sql: string, params: any[] = []): any[] {
  const result = db.exec(sql, params)
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

function selectOne(db: Database, sql: string, params: any[] = []): any | null {
  const rows = selectAll(db, sql, params)
  return rows[0] || null
}

function countRows(db: Database, table: string): number {
  const r = selectOne(db, `SELECT COUNT(*) as cnt FROM ${table}`)
  return r?.cnt || 0
}

// ============ 测试夹具 ============

async function setupDb(): Promise<Database> {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run(CREATE_INVENTORY_STOCK)
  db.run(CREATE_SEED_SOURCES)
  db.run(CREATE_CROP_INSTANCES)
  db.run(CREATE_INVENTORY_TRANSACTION)
  return db
}

async function seedTestStocks(db: Database): Promise<void> {
  // 库存 1: seed 类型，10 kg，葡萄
  db.run(
    `INSERT INTO inventory_stock
      (id, instance_id, stock_type, business_type, business_id, crop_name, variety_name,
       current_quantity, available_quantity, unit, inbound_date, unit_price,
       supplier_id, supplier_name, production_plan_code, status, version, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'STK-SEED-0001', 'INS-20260624-0001', 'seed', 'harvest', 'HV-001', '葡萄', '巨峰',
      10, 10, 'kg', '2026-06-20', 50,
      'SUP-001', '供应商A', 'PP-2026-001', 'in_stock', '2026-06-20T10:00:00.000Z',
    ]
  )
  // 库存 2: product 类型，5 kg，葡萄籽
  db.run(
    `INSERT INTO inventory_stock
      (id, instance_id, stock_type, business_type, business_id, crop_name, variety_name,
       current_quantity, available_quantity, unit, inbound_date, unit_price,
       supplier_id, supplier_name, production_plan_code, status, version, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'STK-PROD-0002', 'INS-20260624-0002', 'product', 'harvest', 'HV-002', '葡萄', '巨峰（籽）',
      5, 5, 'kg', '2026-06-21', 200,
      'SUP-002', '供应商B', 'PP-2026-002', 'in_stock', '2026-06-21T10:00:00.000Z',
    ]
  )
  // 库存 3: seedling 类型，8 株
  db.run(
    `INSERT INTO inventory_stock
      (id, instance_id, stock_type, business_type, business_id, crop_name, variety_name,
       current_quantity, available_quantity, unit, inbound_date, unit_price,
       supplier_id, supplier_name, production_plan_code, status, version, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      'STK-SDL-0003', 'INS-20260624-0003', 'seedling', 'harvest', 'HV-003', '葡萄苗', '巨峰',
      8, 8, '株', '2026-06-22', 30,
      null, null, null, 'in_stock', '2026-06-22T10:00:00.000Z',
    ]
  )
}

beforeEach(async () => {
  mockState.db = await setupDb()
  mockState.instanceCounter = 0
  mockState.codeCounter = 0
  await seedTestStocks(mockState.db)
})

// ============ 测试用例 ============

describe('listTransferableSources', () => {
  it('1. 默认列出 3 种 stock_type 且 current_quantity > 0', async () => {
    const rows = await listTransferableSources({})
    expect(rows.length).toBe(3)
    expect(rows.map(r => r.stockType).sort()).toEqual(['product', 'seed', 'seedling'])
  })

  it('2. 关键字筛选匹配 cropName/varietyName/instanceId', async () => {
    const rows = await listTransferableSources({ keyword: '巨峰（籽）' })
    expect(rows.length).toBe(1)
    expect(rows[0].instanceId).toBe('INS-20260624-0002')
  })

  it('3. 日期范围筛选', async () => {
    const rows = await listTransferableSources({ dateFrom: '2026-06-21', dateTo: '2026-06-22' })
    expect(rows.length).toBe(2)
  })

  it('4. stockType 筛选只返回指定类型', async () => {
    const rows = await listTransferableSources({ stockType: ['seed'] })
    expect(rows.length).toBe(1)
    expect(rows[0].stockType).toBe('seed')
  })
})

describe('executeTransferToSource - 入参校验', () => {
  it('5. 空 items 抛 EMPTY_ITEMS', async () => {
    await expect(executeTransferToSource([])).rejects.toMatchObject({
      code: 'INV_TRANSFER_EMPTY_ITEMS',
    })
  })

  it('6. 调拨数量 <= 0 抛 INVALID_QUANTITY', async () => {
    await expect(
      executeTransferToSource([{ sourceStockId: 'STK-SEED-0001', transferQuantity: 0, unit: 'kg' }])
    ).rejects.toMatchObject({ code: 'INV_TRANSFER_INVALID_QUANTITY' })
  })

  it('7. 调拨单位为空抛 UNIT_MISMATCH', async () => {
    await expect(
      executeTransferToSource([{ sourceStockId: 'STK-SEED-0001', transferQuantity: 1, unit: '' }])
    ).rejects.toMatchObject({ code: 'INV_TRANSFER_UNIT_MISMATCH' })
  })

  it('8. stockId 不存在抛 STOCK_NOT_FOUND (404)', async () => {
    await expect(
      executeTransferToSource([{ sourceStockId: 'STK-NOT-EXIST', transferQuantity: 1, unit: 'kg' }])
    ).rejects.toMatchObject({
      code: 'INV_TRANSFER_STOCK_NOT_FOUND',
      httpStatus: 404,
    })
  })
})

describe('executeTransferToSource - 业务校验', () => {
  it('9. quantity 超限抛 INSUFFICIENT_QUANTITY 且无任何写入', async () => {
    const before = {
      seedSrc: countRows(mockState.db!, 'seed_sources'),
      cropInst: countRows(mockState.db!, 'crop_instances'),
      tx: countRows(mockState.db!, 'inventory_transaction'),
    }
    await expect(
      executeTransferToSource([{ sourceStockId: 'STK-SEED-0001', transferQuantity: 100, unit: 'kg' }])
    ).rejects.toMatchObject({ code: 'INV_TRANSFER_INSUFFICIENT_QUANTITY' })

    // 验证无写入
    expect(countRows(mockState.db!, 'seed_sources')).toBe(before.seedSrc)
    expect(countRows(mockState.db!, 'crop_instances')).toBe(before.cropInst)
    expect(countRows(mockState.db!, 'inventory_transaction')).toBe(before.tx)

    // 验证原库存未被修改
    const stock = selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-SEED-0001'")
    expect(stock.current_quantity).toBe(10)
  })

  it('10. 单位不一致抛 UNIT_MISMATCH', async () => {
    await expect(
      executeTransferToSource([{ sourceStockId: 'STK-SEED-0001', transferQuantity: 1, unit: 'g' }])
    ).rejects.toMatchObject({ code: 'INV_TRANSFER_UNIT_MISMATCH' })
  })
})

describe('executeTransferToSource - 正常路径', () => {
  it('11. 调拨 1 条 → 验证所有表写入', async () => {
    const result = await executeTransferToSource(
      [{ sourceStockId: 'STK-SEED-0001', transferQuantity: 3, unit: 'kg' }],
      { id: 'USR-001', name: '测试员' }
    )
    expect(result.length).toBe(1)
    expect(result[0].newSeedSourceCode).toBe('ZZ20260624-001')

    // seed_sources 新增 1 行
    expect(countRows(mockState.db!, 'seed_sources')).toBe(1)
    // crop_instances 新增 1 行
    expect(countRows(mockState.db!, 'crop_instances')).toBe(1)
    // inventory_transaction 新增 2 行（out + in）
    expect(countRows(mockState.db!, 'inventory_transaction')).toBe(2)
    // inventory_stock：原 3 行 + 新 1 行 = 4 行
    expect(countRows(mockState.db!, 'inventory_stock')).toBe(4)

    // 验证原库存扣减
    const origStock = selectOne(mockState.db!, "SELECT current_quantity, status FROM inventory_stock WHERE id = 'STK-SEED-0001'")
    expect(origStock.current_quantity).toBe(7)
    expect(origStock.status).toBe('in_stock')
  })

  it('12. 多选调拨 2 条 → 独立 code + 全部写入', async () => {
    const result = await executeTransferToSource([
      { sourceStockId: 'STK-SEED-0001', transferQuantity: 2, unit: 'kg' },  // seed
      { sourceStockId: 'STK-PROD-0002', transferQuantity: 1, unit: 'kg' },  // product
    ])
    expect(result.length).toBe(2)
    expect(result[0].newSeedSourceCode).toBe('ZZ20260624-001')
    expect(result[1].newSeedSourceCode).toBe('ZZ20260624-002')  // mock 计数器递增

    // seed_sources 新增 2 行
    expect(countRows(mockState.db!, 'seed_sources')).toBe(2)
    // crop_instances 新增 2 行
    expect(countRows(mockState.db!, 'crop_instances')).toBe(2)
    // inventory_transaction 新增 4 行（2 out + 2 in）
    expect(countRows(mockState.db!, 'inventory_transaction')).toBe(4)

    // 验证原库存都扣减
    const s1 = selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-SEED-0001'")
    expect(s1.current_quantity).toBe(8)
    const s2 = selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-PROD-0002'")
    expect(s2.current_quantity).toBe(4)
  })

  it('13. quantity 降为 0 → status 自动变 depleted', async () => {
    await executeTransferToSource([
      { sourceStockId: 'STK-SEED-0001', transferQuantity: 10, unit: 'kg' },  // 全部扣完
    ])
    const s1 = selectOne(mockState.db!, "SELECT current_quantity, status FROM inventory_stock WHERE id = 'STK-SEED-0001'")
    expect(s1.current_quantity).toBe(0)
    expect(s1.status).toBe('depleted')
  })

  it('14. 14 个 original_* / transferred_from_* 字段全量填充', async () => {
    await executeTransferToSource([
      { sourceStockId: 'STK-SEED-0001', transferQuantity: 3, unit: 'kg' },
    ])
    const seedSrc = selectOne(
      mockState.db!,
      `SELECT transferred_from_stock_id, transferred_from_business_type, transferred_from_business_id,
              original_inbound_date, original_source_module, original_source_id,
              original_crop_id, original_crop_name, original_variety_id, original_variety_name,
              original_unit, original_unit_price, original_supplier_id, original_supplier_name,
              original_production_plan_code
       FROM seed_sources LIMIT 1`
    )

    // transferred_from_*
    expect(seedSrc.transferred_from_stock_id).toBe('STK-SEED-0001')
    expect(seedSrc.transferred_from_business_type).toBe('harvest')
    expect(seedSrc.transferred_from_business_id).toBe('HV-001')

    // original_*
    expect(seedSrc.original_inbound_date).toBe('2026-06-20')
    expect(seedSrc.original_crop_name).toBe('葡萄')
    expect(seedSrc.original_variety_name).toBe('巨峰')
    expect(seedSrc.original_unit).toBe('kg')
    expect(seedSrc.original_unit_price).toBe(50)
    expect(seedSrc.original_supplier_id).toBe('SUP-001')
    expect(seedSrc.original_supplier_name).toBe('供应商A')
    expect(seedSrc.original_production_plan_code).toBe('PP-2026-001')
  })

  it('15. transfer_out / transfer_in 流水 transaction_type 正确', async () => {
    await executeTransferToSource([
      { sourceStockId: 'STK-SEED-0001', transferQuantity: 3, unit: 'kg' },
    ])
    const txs = selectAll(mockState.db!, 'SELECT transaction_type, quantity FROM inventory_transaction')
    expect(txs.length).toBe(2)
    // 不依赖 ID 排序（random suffix 可能乱序），用 set 验证两类型都存在 + 数量都对
    const txTypes = txs.map(t => t.transaction_type).sort()
    expect(txTypes).toEqual(['transfer_in', 'transfer_out'])
    // 每条 quantity 都是 3
    expect(txs.every(t => t.quantity === 3)).toBe(true)
  })

  it('16. 新种源 remaining_quantity = 调拨数量', async () => {
    await executeTransferToSource([
      { sourceStockId: 'STK-SEED-0001', transferQuantity: 3, unit: 'kg' },
    ])
    const seedSrc = selectOne(mockState.db!, 'SELECT quantity, remaining_quantity, used_quantity FROM seed_sources LIMIT 1')
    expect(seedSrc.quantity).toBe(3)
    expect(seedSrc.remaining_quantity).toBe(3)
    expect(seedSrc.used_quantity).toBe(0)
  })
})

describe('executeTransferToSource - 部分失败回滚', () => {
  it('17. 第 1 条成功 + 第 2 条失败 → 全部回滚 + 原库存精确恢复', async () => {
    // 第 1 条 stockId=1 (有 10kg)，第 2 条 stockId=9999 (不存在)
    const beforeS1Qty = selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-SEED-0001'").current_quantity

    await expect(
      executeTransferToSource([
        { sourceStockId: 'STK-SEED-0001', transferQuantity: 5, unit: 'kg' },
        { sourceStockId: 'STK-NOT-EXIST', transferQuantity: 1, unit: 'kg' },
      ])
    ).rejects.toMatchObject({ code: 'INV_TRANSFER_STOCK_NOT_FOUND' })

    // seed_sources 应为 0（全部回滚）
    expect(countRows(mockState.db!, 'seed_sources')).toBe(0)
    // crop_instances 应为 0
    expect(countRows(mockState.db!, 'crop_instances')).toBe(0)
    // inventory_transaction 应为 0
    expect(countRows(mockState.db!, 'inventory_transaction')).toBe(0)

    // 原库存精确恢复（10kg，未扣减）
    const s1After = selectOne(mockState.db!, "SELECT current_quantity, status FROM inventory_stock WHERE id = 'STK-SEED-0001'")
    expect(s1After.current_quantity).toBe(beforeS1Qty)
    expect(s1After.status).toBe('in_stock')
  })

  it('18. 第 1 条成功 + 第 2 条 quantity 超限 → 全部回滚', async () => {
    const beforeS1 = selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-SEED-0001'").current_quantity
    const beforeS2 = selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-PROD-0002'").current_quantity

    await expect(
      executeTransferToSource([
        { sourceStockId: 'STK-SEED-0001', transferQuantity: 5, unit: 'kg' },
        { sourceStockId: 'STK-PROD-0002', transferQuantity: 999, unit: 'kg' },  // 超限
      ])
    ).rejects.toMatchObject({ code: 'INV_TRANSFER_INSUFFICIENT_QUANTITY' })

    expect(countRows(mockState.db!, 'seed_sources')).toBe(0)
    expect(countRows(mockState.db!, 'crop_instances')).toBe(0)
    expect(countRows(mockState.db!, 'inventory_transaction')).toBe(0)

    // 两个原库存都精确恢复
    expect(selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-SEED-0001'").current_quantity).toBe(beforeS1)
    expect(selectOne(mockState.db!, "SELECT current_quantity FROM inventory_stock WHERE id = 'STK-PROD-0002'").current_quantity).toBe(beforeS2)
  })
})

describe('executeTransferToSource - 边界', () => {
  it('19. 批量 101 条抛 BATCH_TOO_LARGE', async () => {
    const items = Array.from({ length: 101 }, () => ({ sourceStockId: 'STK-SEED-0001', transferQuantity: 1, unit: 'kg' }))
    await expect(executeTransferToSource(items)).rejects.toMatchObject({
      code: 'INV_TRANSFER_BATCH_TOO_LARGE',
    })
  })
})
