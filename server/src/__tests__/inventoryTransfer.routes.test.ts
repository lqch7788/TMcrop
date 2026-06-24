/**
 * inventoryTransfer.routes 集成测试（2026-06-24）
 * B2 验证门
 *
 * 策略：使用 express app + 内置 http 模块（项目无 supertest 依赖）
 *       + vi.mock 替换 service 依赖（与 inventoryTransfer.service.test.ts 风格一致）
 *
 * 测试覆盖：
 * 1. POST /transfer-to-source 正常调拨 → 201
 * 2. POST /transfer-to-source 空 items → 400
 * 3. POST /transfer-to-source quantity ≤ 0 → 400
 * 4. POST /transfer-to-source batch > 100 → 400
 * 5. POST /transfer-to-source stockId 不存在 → 404 + code
 * 6. POST /transfer-to-source quantity 超限 → 400 + code
 * 7. POST /transfer-to-source unit 不一致 → 400 + code
 * 8. GET /transferable-sources 默认 → 200 + 3 行
 * 9. GET /transferable-sources stockType=seed → 200 + 1 行
 * 10. GET /transferable-sources keyword 筛选 → 200
 * 11. GET /transferable-sources 无效 stockType → 400
 * 12. GET /transferable-sources 无效日期格式 → 400
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import express from 'express'
import http from 'http'
import type { AddressInfo } from 'net'

// ============ Hoisted 共享状态 ============

const mockState = vi.hoisted(() => ({
  db: null as Database | null,
  instanceCounter: 0,
  codeCounter: 0,
}))

// ============ Mock 依赖（与 B1 单元测试一致） ============

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

// 必须在 mock 之后导入
import inventoryTransferRouter from '../routes/inventoryTransfer'

// ============ 建表 SQL ============

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
    supplier_id TEXT,
    supplier_name TEXT,
    production_plan_code TEXT,
    harvest_record_id TEXT,
    status TEXT,
    version INTEGER DEFAULT 1,
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
  db.run(
    `INSERT INTO inventory_stock
      (id, instance_id, stock_type, business_type, business_id, crop_name, variety_name,
       current_quantity, available_quantity, unit, inbound_date, unit_price,
       supplier_id, supplier_name, production_plan_code, status, version, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ['STK-SEED-0001', 'INS-20260624-0001', 'seed', 'harvest', 'HV-001', '葡萄', '巨峰',
     10, 10, 'kg', '2026-06-20', 50, 'SUP-001', '供应商A', 'PP-2026-001', 'in_stock', '2026-06-20T10:00:00.000Z']
  )
  db.run(
    `INSERT INTO inventory_stock
      (id, instance_id, stock_type, business_type, business_id, crop_name, variety_name,
       current_quantity, available_quantity, unit, inbound_date, unit_price,
       supplier_id, supplier_name, production_plan_code, status, version, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ['STK-PROD-0002', 'INS-20260624-0002', 'product', 'harvest', 'HV-002', '葡萄', '巨峰（籽）',
     5, 5, 'kg', '2026-06-21', 200, 'SUP-002', '供应商B', 'PP-2026-002', 'in_stock', '2026-06-21T10:00:00.000Z']
  )
  db.run(
    `INSERT INTO inventory_stock
      (id, instance_id, stock_type, business_type, business_id, crop_name, variety_name,
       current_quantity, available_quantity, unit, inbound_date, unit_price,
       supplier_id, supplier_name, production_plan_code, status, version, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ['STK-SDL-0003', 'INS-20260624-0003', 'seedling', 'harvest', 'HV-003', '葡萄苗', '巨峰',
     8, 8, '株', '2026-06-22', 30, null, null, null, 'in_stock', '2026-06-22T10:00:00.000Z']
  )
}

// ============ HTTP 测试服务器 ============

let server: http.Server | null = null
let baseUrl: string = ''

interface HttpResponse {
  status: number
  body: any
}

function httpRequest(method: string, path: string, body?: any): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path)
    const data = body ? JSON.stringify(body) : undefined
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': String(Buffer.byteLength(data)) } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString()
          let parsed: any = text
          try { parsed = JSON.parse(text) } catch { /* keep as string */ }
          resolve({ status: res.statusCode!, body: parsed })
        })
      }
    )
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

// ============ SQL 辅助函数（用于 P0-2 测试验证 operator 写入流水） ============

function selectAllSql(db: Database, sql: string, params: any[] = []): any[] {
  const result = db.exec(sql, params)
  if (!result || result.length === 0) return []
  const { columns, values } = result[0]
  return values.map((row: any[]) => {
    const obj: any = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

function selectOneSql(db: Database, sql: string, params: any[] = []): any | null {
  return selectAllSql(db, sql, params)[0] || null
}

// ============ 测试夹具 ============

beforeEach(async () => {
  mockState.db = await setupDb()
  mockState.instanceCounter = 0
  mockState.codeCounter = 0
  await seedTestStocks(mockState.db)

  // 每次重建 server（mockState.db 已重建，但 express app 引用 service 单例）
  // 注意：service 在 vi.mock 后是单例，但其内部 db 通过 mockState.db 获取最新值
  if (!server) {
    const app = express()
    app.use(express.json())
    app.use('/api/inventory', inventoryTransferRouter)
    const newServer: http.Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s))
    })
    server = newServer
    const addr = newServer.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${addr.port}/api/inventory`
  }
})

afterAll(async () => {
  const srv = server
  if (srv) {
    await new Promise<void>((resolve) => srv.close(() => resolve()))
  }
})

// ============ 测试用例 ============

describe('POST /api/inventory/transfer-to-source', () => {
  it('1. 正常调拨 1 条 → 201 + 返回新 code', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-SEED-0001', transferQuantity: 3, unit: 'kg' }],
      operatorName: '测试员',
    })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].newSeedSourceCode).toBe('ZZ20260624-001')
  })

  it('2. 空 items → 400', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', { items: [] })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('3. quantity = 0 → 400', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-SEED-0001', transferQuantity: 0, unit: 'kg' }],
    })
    expect(res.status).toBe(400)
  })

  it('4. quantity 负数 → 400', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-SEED-0001', transferQuantity: -1, unit: 'kg' }],
    })
    expect(res.status).toBe(400)
  })

  it('5. 批量 101 条 → 400', async () => {
    const items = Array.from({ length: 101 }, () => ({
      sourceStockId: 'STK-SEED-0001', transferQuantity: 1, unit: 'kg',
    }))
    const res = await httpRequest('POST', '/transfer-to-source', { items })
    expect(res.status).toBe(400)
  })

  it('6. stockId 不存在 → 404 + code', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-NOT-EXIST', transferQuantity: 1, unit: 'kg' }],
    })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('INV_TRANSFER_STOCK_NOT_FOUND')
    expect(res.body.success).toBe(false)
  })

  it('7. quantity 超限 → 400 + code', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-SEED-0001', transferQuantity: 999, unit: 'kg' }],
    })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INV_TRANSFER_INSUFFICIENT_QUANTITY')
  })

  it('8. unit 不一致 → 400 + code', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-SEED-0001', transferQuantity: 1, unit: 'g' }],
    })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('INV_TRANSFER_UNIT_MISMATCH')
  })

  it('9. 缺 items 字段 → 400', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {})
    expect(res.status).toBe(400)
  })

  it('10. 多选调拨 2 条 → 201 + 独立 code', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [
        { sourceStockId: 'STK-SEED-0001', transferQuantity: 2, unit: 'kg' },
        { sourceStockId: 'STK-PROD-0002', transferQuantity: 1, unit: 'kg' },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.data.length).toBe(2)
    expect(res.body.data[0].newSeedSourceCode).toBe('ZZ20260624-001')
    expect(res.body.data[1].newSeedSourceCode).toBe('ZZ20260624-002')
  })

  it('10.5 P0-2 修复验证：operator 参数透传到 inventory_transaction', async () => {
    const res = await httpRequest('POST', '/transfer-to-source', {
      items: [{ sourceStockId: 'STK-SEED-0001', transferQuantity: 1, unit: 'kg' }],
      operatorId: 'USR-007',
      operatorName: '真实操作员',
    })
    expect(res.status).toBe(201)
    // 验证 operator 字段写入流水（间接验证：之前的代码会静默丢失 operator）
    const tx = selectOneSql(
      mockState.db!,
      `SELECT operator_id, operator_name FROM inventory_transaction WHERE transaction_type = 'transfer_in' LIMIT 1`
    )
    expect(tx.operator_name).toBe('真实操作员')
    expect(tx.operator_id).toBe('USR-007')
  })
})

describe('GET /api/inventory/transferable-sources', () => {
  it('11. 默认列出 3 种 stock_type → 200 + total=3', async () => {
    const res = await httpRequest('GET', '/transferable-sources')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.length).toBe(3)
    expect(res.body.meta.total).toBe(3)
  })

  it('12. stockType=seed 筛选 → 200 + 1 行', async () => {
    const res = await httpRequest('GET', '/transferable-sources?stockType=seed')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].stockType).toBe('seed')
  })

  it('13. keyword 筛选匹配 cropName → 200', async () => {
    const res = await httpRequest('GET', '/transferable-sources?keyword=' + encodeURIComponent('巨峰（籽）'))
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(1)
    expect(res.body.data[0].instanceId).toBe('INS-20260624-0002')
  })

  it('14. 多 stockType 逗号分隔 → 200', async () => {
    const res = await httpRequest('GET', '/transferable-sources?stockType=seed,product')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
  })

  it('15. 无效 stockType → 400', async () => {
    const res = await httpRequest('GET', '/transferable-sources?stockType=invalid_type')
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('无效的 stockType')
  })

  it('16. 无效日期格式 → 400', async () => {
    const res = await httpRequest('GET', '/transferable-sources?dateFrom=20260620')
    expect(res.status).toBe(400)
  })

  it('17. 日期范围筛选 → 200', async () => {
    const res = await httpRequest('GET', '/transferable-sources?dateFrom=2026-06-21&dateTo=2026-06-22')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
  })

  it('17.5 P2-8 修复验证：limit/offset 分页参数', async () => {
    // limit=1 只返回 1 条
    const res1 = await httpRequest('GET', '/transferable-sources?limit=1')
    expect(res1.status).toBe(200)
    expect(res1.body.data.length).toBe(1)
    expect(res1.body.meta.limit).toBe(1)

    // limit=1 + offset=1 跳过第 1 条
    const res2 = await httpRequest('GET', '/transferable-sources?limit=1&offset=1')
    expect(res2.status).toBe(200)
    expect(res2.body.data.length).toBe(1)
    expect(res2.body.data[0].id).not.toBe(res1.body.data[0].id)

    // limit 超过 1000 拒绝
    const res3 = await httpRequest('GET', '/transferable-sources?limit=5000')
    expect(res3.status).toBe(400)
  })
})
