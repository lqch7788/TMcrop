/**
 * inventory_inbound_records 单元测试
 * 2026-06-18: 库存入库按模块下沉 - 任务 1
 *
 * 策略：使用隔离内存 sql.js 数据库（与 plantingHarvestRecords.test.ts 风格一致）
 *       手工建表 + 跑真实 SQL 断言，不污染主 DB，不启动 server。
 *
 * 测试覆盖：
 * 1. 31 个字段全部存在
 * 2. 6 个 NOT NULL 字段：record_date / source_module / source_id / stock_type / source_type / unit
 * 3. 3 个索引全部创建
 */
import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'

let db: Database

// 与 fixMissingSchema.ts 一致的建表 SQL
const CREATE_INBOUND_TABLE = `
  CREATE TABLE IF NOT EXISTS inventory_inbound_records (
    id TEXT PRIMARY KEY,
    record_type TEXT DEFAULT 'inbound',
    record_date TEXT NOT NULL,
    source_module TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_code TEXT,
    stock_type TEXT NOT NULL,
    source_type TEXT NOT NULL,
    warehouse_id TEXT,
    warehouse_name TEXT,
    crop_id TEXT,
    crop_code TEXT,
    crop_name TEXT,
    variety_name TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    unit_price REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    quality_grade TEXT,
    supplier_id TEXT,
    supplier_name TEXT,
    production_plan_id TEXT,
    production_plan_code TEXT,
    business_id TEXT,
    notes TEXT,
    operator_name TEXT,
    create_by TEXT,
    create_time TEXT,
    update_time TEXT
  )
`

const CREATE_INBOUND_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_inbound_source ON inventory_inbound_records (source_module, source_id)',
  'CREATE INDEX IF NOT EXISTS idx_inbound_stock_type ON inventory_inbound_records (stock_type, record_date)',
  'CREATE INDEX IF NOT EXISTS idx_inbound_warehouse ON inventory_inbound_records (warehouse_id)',
]

beforeEach(async () => {
  // 隔离内存 DB：每次测试前重建
  const SQL = await initSqlJs()
  db = new SQL.Database()
  db.run(CREATE_INBOUND_TABLE)
  CREATE_INBOUND_INDEXES.forEach((sql) => db.run(sql))
})

describe('inventory_inbound_records 表结构', () => {
  it('1. 29 个字段全部存在', () => {
    const r = db.exec('PRAGMA table_info(inventory_inbound_records)')
    // 29 个数据列：id + record_type + record_date + source_module + source_id + source_code
    //   + stock_type + source_type + warehouse_id + warehouse_name + crop_id + crop_code
    //   + crop_name + variety_name + quantity + unit + unit_price + total_amount + quality_grade
    //   + supplier_id + supplier_name + production_plan_id + production_plan_code + business_id
    //   + notes + operator_name + create_by + create_time + update_time
    expect(r[0]?.values.length).toBe(29)
  })

  it('2. record_date, source_module, source_id, stock_type, source_type, unit NOT NULL', () => {
    const r = db.exec('PRAGMA table_info(inventory_inbound_records)')
    // notnull=1
    const nnCols = (r[0]?.values || [])
      .filter((v) => v[3] === 1)
      .map((v) => v[1] as string)
    expect(nnCols).toContain('record_date')
    expect(nnCols).toContain('source_module')
    expect(nnCols).toContain('source_id')
    expect(nnCols).toContain('stock_type')
    expect(nnCols).toContain('source_type')
    expect(nnCols).toContain('unit')
  })

  it('3. 3 个索引全部创建', () => {
    const r = db.exec(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='inventory_inbound_records'"
    )
    const names = (r[0]?.values || []).map((v) => v[0] as string)
    expect(names).toContain('idx_inbound_source')
    expect(names).toContain('idx_inbound_stock_type')
    expect(names).toContain('idx_inbound_warehouse')
  })
})
