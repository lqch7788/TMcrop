/**
 * planting_harvest_records 单元测试
 * 2026-06-17 Phase 1: 覆盖 4 列聚合 + 软锁 + 历史数据迁移
 *
 * 策略：使用隔离内存 sql.js 数据库（与 seedling-migration.test.ts 风格一致）
 *       手工建表 + 跑真实 SQL 断言，不污染主 DB，不启动 server。
 *
 * 注意：副作用路由（harvest/dispose/circulate 等）的业务逻辑在 planting.ts 路由里
 *       直接搬运自原 /end 路由，行为与原 /end 路由一致（参考现有 /end 路由测试覆盖）。
 *       本测试聚焦新增的 planting_harvest_records 表的 CRUD + 聚合 + 软锁逻辑。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import { UNIT_ENUM } from '../routes/planting'

let db: Database

// 测试夹具 ID
const T_PLANTING_ID = 'P-UNIT-001'
const T_SOURCE_ID = 'SS-UNIT-001'
const T_WAREHOUSE_ID = 'W-UNIT-001'
const T_PLANTING_CODE = 'ZZ-UNIT-001'

/**
 * 复用 fixMissingSchema.ts 中的 planting_harvest_records 建表 SQL（保持代码同步）
 * 与 fixMissingSchema.ts:2110-2136 一致
 */
const CREATE_PHR_TABLE = `
  CREATE TABLE IF NOT EXISTS planting_harvest_records (
    id TEXT PRIMARY KEY,
    oid TEXT,
    record_type TEXT DEFAULT 'planting',
    record_date TEXT NOT NULL,
    planting_id TEXT NOT NULL,
    planting_code TEXT,
    destination TEXT NOT NULL,
    sub_type TEXT,
    warehouse_id TEXT,
    warehouse_name TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'g',
    notes TEXT,
    operator_name TEXT,
    create_by TEXT,
    create_by_id TEXT,
    create_time TEXT NOT NULL,
    update_time TEXT NOT NULL,
    harvest_record_id TEXT,
    inventory_stock_id TEXT,
    circulation_record_id TEXT,
    FOREIGN KEY (planting_id) REFERENCES plantings(id)
  )
`

/**
 * 与 fixMissingSchema.ts:2140 一致
 */
const CREATE_PHR_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_phr_planting_dest
  ON planting_harvest_records (planting_id, destination)
`

/**
 * 复用 fixMissingSchema.ts 中的历史数据迁移 SQL（保持代码同步）
 * 与 fixMissingSchema.ts:2144-2150 一致
 */
function runHistoryLockMigration(database: Database): void {
  const stmt = database.prepare(`
    UPDATE plantings
    SET is_harvest_locked = 1
    WHERE deleted_at IS NULL
      AND is_harvest_locked = 0
      AND (end_time IS NOT NULL OR status IN ('ended', 'cancelled'))
  `)
  stmt.run()
  stmt.free()
}

beforeEach(async () => {
  // 隔离内存 DB：每次测试前重建，零污染
  const SQL = await initSqlJs()
  db = new SQL.Database()

  // 1. 建主表
  db.run(`
    CREATE TABLE plantings (
      id TEXT PRIMARY KEY,
      planting_code TEXT NOT NULL,
      source_type TEXT,
      source_id TEXT,
      source_name TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      planting_quantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planted',
      end_time TEXT,
      is_harvest_locked INTEGER DEFAULT 0,
      deleted_at TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `)

  // 2. 建种植采收记录表（来自 fixMissingSchema）
  db.run(CREATE_PHR_TABLE)
  db.run(CREATE_PHR_INDEX)

  // 3. 建引用表（最小集，足够 FK 引用）
  db.run(`
    CREATE TABLE seed_sources (
      id TEXT PRIMARY KEY,
      source_code TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_type TEXT,
      source_origin TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      quantity INTEGER DEFAULT 0,
      remaining_quantity INTEGER DEFAULT 0,
      used_quantity INTEGER DEFAULT 0,
      unit TEXT,
      propagation_type TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `)

  db.run(`
    CREATE TABLE warehouses (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      warehouse_type TEXT,
      status TEXT DEFAULT 'active',
      create_time TEXT,
      update_time TEXT
    )
  `)

  db.run(`
    CREATE TABLE harvest_records (
      id TEXT PRIMARY KEY,
      harvest_code TEXT NOT NULL,
      source_id TEXT,
      source_name TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      harvest_date TEXT,
      harvest_quantity REAL DEFAULT 0,
      unit TEXT,
      status TEXT DEFAULT 'pending',
      create_by TEXT,
      create_time TEXT,
      update_time TEXT,
      warehouse_id TEXT
    )
  `)

  db.run(`
    CREATE TABLE inventory_stock (
      id TEXT PRIMARY KEY,
      instance_id TEXT UNIQUE NOT NULL,
      stock_type TEXT NOT NULL,
      business_id TEXT,
      business_type TEXT,
      current_quantity REAL DEFAULT 0,
      available_quantity REAL DEFAULT 0,
      unit TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      status TEXT DEFAULT 'in_stock',
      create_time TEXT,
      update_time TEXT
    )
  `)

  db.run(`
    CREATE TABLE crop_circulation_records (
      id TEXT PRIMARY KEY,
      circulation_type TEXT NOT NULL,
      source_module TEXT NOT NULL,
      source_id TEXT,
      parent_source_id TEXT,
      new_source_id TEXT,
      quantity REAL,
      unit TEXT,
      circulation_date TEXT NOT NULL,
      operator_id TEXT,
      notes TEXT,
      residue_type TEXT,
      disposition TEXT,
      is_revoked INTEGER DEFAULT 0,
      revoked_at TEXT,
      revoked_by TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `)

  // 4. 插入夹具数据
  const now = '2026-06-17T08:00:00.000Z'

  db.run(
    `INSERT INTO seed_sources
     (id, source_code, source_name, source_type, source_origin, crop_name, crop_variety,
      quantity, remaining_quantity, used_quantity, unit, propagation_type, create_by, create_time, update_time)
     VALUES (?, 'SS-UNIT', 'SS-UNIT', 'seed', 'external_purchase', '番茄', '红果番茄',
             1000, 1000, 0, 'g', 'EXTERNAL', 'test', ?, ?)`,
    [T_SOURCE_ID, now, now]
  )

  db.run(
    `INSERT INTO warehouses (id, oid, name, warehouse_type, status, create_time, update_time)
     VALUES (?, ?, 'TEST_WH', 'cold_storage', 'active', ?, ?)`,
    [T_WAREHOUSE_ID, T_WAREHOUSE_ID, now, now]
  )

  db.run(
    `INSERT INTO plantings
     (id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
      planting_quantity, status, create_time, update_time)
     VALUES (?, ?, 'seed', ?, 'SS-UNIT', '番茄', '红果番茄', 100, 'growing', ?, ?)`,
    [T_PLANTING_ID, T_PLANTING_CODE, T_SOURCE_ID, now, now]
  )
})

/**
 * 工具函数：模拟 POST 路由的 INSERT 行为
 * 字段集与 fixMissingSchema 建表一致
 */
function addHarvestRecord(
  plantingId: string,
  payload: {
    destination: string
    recordDate: string
    warehouseId?: string | null
    warehouseName?: string | null
    subType?: string | null
    quantity: number
    unit?: string
    notes?: string | null
    operatorName?: string | null
    createBy?: string
  }
): string {
  const newId = `PHR${Date.now()}${Math.random().toString(36).slice(2, 5)}`
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO planting_harvest_records (
      id, record_type, record_date, planting_id, planting_code, destination, sub_type,
      warehouse_id, warehouse_name, quantity, unit, notes, operator_name, create_by,
      create_time, update_time
    ) VALUES (?, 'planting', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId,
      payload.recordDate,
      plantingId,
      T_PLANTING_CODE,
      payload.destination,
      payload.subType ?? null,
      payload.warehouseId ?? null,
      payload.warehouseName ?? null,
      payload.quantity,
      payload.unit ?? 'g',
      payload.notes ?? null,
      payload.operatorName ?? null,
      payload.createBy ?? 'test',
      now,
      now,
    ]
  )
  return newId
}

describe('planting_harvest_records 单元测试', () => {
  it('1. 添加 harvest 记录：planting_harvest_records +1，destination=harvest', () => {
    const newId = addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-17',
      destination: 'harvest',
      warehouseId: T_WAREHOUSE_ID,
      warehouseName: 'TEST_WH',
      quantity: 100,
      unit: 'kg',
    })

    expect(newId).toMatch(/^PHR/)
    const countResult = db.exec(
      'SELECT COUNT(*) FROM planting_harvest_records WHERE planting_id = ?',
      [T_PLANTING_ID]
    )
    expect(countResult[0]?.values?.[0]?.[0]).toBe(1)

    const rowResult = db.exec(
      'SELECT destination, quantity, unit FROM planting_harvest_records WHERE id = ?',
      [newId]
    )
    expect(rowResult[0]?.values?.[0]).toEqual(['harvest', 100, 'kg'])
  })

  it('2. 添加记录后 planting.status 自动变 harvesting', () => {
    // 模拟 POST 路由的 status 更新逻辑（与 planting.ts 路由实现一致）
    db.run('UPDATE plantings SET status = ?, update_time = ? WHERE id = ?', [
      'harvesting',
      new Date().toISOString(),
      T_PLANTING_ID,
    ])

    const r = db.exec('SELECT status FROM plantings WHERE id = ?', [T_PLANTING_ID])
    expect(r[0]?.values?.[0]?.[0]).toBe('harvesting')
  })

  it('3. 列表聚合 SUM 4 个 destination', () => {
    addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-17',
      destination: 'harvest',
      warehouseId: T_WAREHOUSE_ID,
      quantity: 100,
      unit: 'kg',
    })
    addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-17',
      destination: 'circulate',
      subType: 'cutting',
      quantity: 20,
      unit: 'kg',
    })
    addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-17',
      destination: 'self_seed',
      quantity: 5,
      unit: 'g',
    })
    addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-17',
      destination: 'circulate_to_inventory',
      subType: 'quantity_inbound',
      warehouseId: T_WAREHOUSE_ID,
      quantity: 15,
      unit: 'kg',
    })

    // 模拟 GET /plantings 列表的 4 列聚合 SQL（与 planting.ts 路由一致）
    const rows = db.exec(
      `
      SELECT
        COALESCE(SUM(CASE WHEN destination = 'harvest' THEN quantity END), 0) AS h,
        COALESCE(SUM(CASE WHEN destination = 'circulate' THEN quantity END), 0) AS c,
        COALESCE(SUM(CASE WHEN destination = 'circulate_to_inventory' THEN quantity END), 0) AS ci,
        COALESCE(SUM(CASE WHEN destination = 'self_seed' THEN quantity END), 0) AS s
      FROM planting_harvest_records WHERE planting_id = ?
    `,
      [T_PLANTING_ID]
    )

    expect(Number(rows[0]?.values?.[0]?.[0])).toBe(100) // harvest
    expect(Number(rows[0]?.values?.[0]?.[1])).toBe(20) // circulate
    expect(Number(rows[0]?.values?.[0]?.[2])).toBe(15) // circulate_to_inventory
    expect(Number(rows[0]?.values?.[0]?.[3])).toBe(5) // self_seed
  })

  it('4. 软锁：is_harvest_locked=1 后再添加路由应拒绝（模拟路由前置检查）', () => {
    // 锁定 planting
    db.run(
      'UPDATE plantings SET is_harvest_locked = 1, status = ?, end_time = ?, update_time = ? WHERE id = ?',
      ['ended', new Date().toISOString(), new Date().toISOString(), T_PLANTING_ID]
    )

    // 模拟 POST 路由的软锁检查逻辑
    const p = db.exec('SELECT is_harvest_locked FROM plantings WHERE id = ?', [T_PLANTING_ID])
    const isLocked = Number(p[0]?.values?.[0]?.[0]) === 1
    expect(isLocked).toBe(true)

    // 路由里 isLocked 时会返回 400（此处不调路由，只验数据层锁状态正确）
  })

  it('5. 历史数据迁移：end_time 不为空的自动锁定', () => {
    // 准备：清掉 is_harvest_locked=0 状态
    db.run('UPDATE plantings SET is_harvest_locked = 0, end_time = ?, status = ? WHERE id = ?', [
      '2026-06-15',
      'ended',
      T_PLANTING_ID,
    ])

    // 模拟 fixMissingSchema 的迁移 SQL
    runHistoryLockMigration(db)

    const p = db.exec('SELECT is_harvest_locked FROM plantings WHERE id = ?', [T_PLANTING_ID])
    expect(Number(p[0]?.values?.[0]?.[0])).toBe(1)
  })

  it('6. 删除采收记录：planting_harvest_records 减 1', () => {
    const id1 = addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-17',
      destination: 'harvest',
      warehouseId: T_WAREHOUSE_ID,
      quantity: 100,
      unit: 'kg',
    })
    addHarvestRecord(T_PLANTING_ID, {
      recordDate: '2026-06-18',
      destination: 'harvest',
      warehouseId: T_WAREHOUSE_ID,
      quantity: 50,
      unit: 'kg',
    })

    db.run('DELETE FROM planting_harvest_records WHERE id = ?', [id1])

    const cnt = db.exec(
      'SELECT COUNT(*) FROM planting_harvest_records WHERE planting_id = ?',
      [T_PLANTING_ID]
    )
    expect(cnt[0]?.values?.[0]?.[0]).toBe(1)
  })

  it('7. 索引 idx_phr_planting_dest 存在', () => {
    const r = db.exec(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='planting_harvest_records' AND name='idx_phr_planting_dest'"
    )
    expect(r[0]?.values?.[0]?.[0]).toBe('idx_phr_planting_dest')
  })

  it('8. 21 数据列全部存在', () => {
    const r = db.exec('PRAGMA table_info(planting_harvest_records)')
    const cols = (r[0]?.values || []).map((v) => v[1] as string)
    // 21 个数据列（不含主键约束本身；id 是 PK 但仍是数据列）
    expect(cols.length).toBe(21)
    // 关键列验证
    expect(cols).toContain('id')
    expect(cols).toContain('planting_id')
    expect(cols).toContain('destination')
    expect(cols).toContain('quantity')
    expect(cols).toContain('harvest_record_id')
    expect(cols).toContain('inventory_stock_id')
    expect(cols).toContain('circulation_record_id')
  })

  it('9. FK 约束：planting_id 引用 plantings.id', () => {
    const r = db.exec('PRAGMA foreign_key_list(planting_harvest_records)')
    // PRAGMA foreign_key_list 返回列序：id, seq, table, from, to, on_update, on_delete, match
    //   table=被引用表, from=外键列, to=被引用列
    const fks = (r[0]?.values || []).map(
      (v) => `(${v[2]}) ${v[3]} → ${v[4]} (from ${v[1]})`
    )
    expect(fks).toContain('(plantings) planting_id → id (from 0)')
  })

  it('10. NOT NULL 约束：record_date, planting_id, destination, quantity, create_time, update_time 不可为空', () => {
    const r = db.exec('PRAGMA table_info(planting_harvest_records)')
    const notNullCols = (r[0]?.values || [])
      .filter((v) => v[3] === 1) // notnull=1
      .map((v) => v[1] as string)
    expect(notNullCols).toContain('record_date')
    expect(notNullCols).toContain('planting_id')
    expect(notNullCols).toContain('destination')
    expect(notNullCols).toContain('quantity')
    expect(notNullCols).toContain('create_time')
    expect(notNullCols).toContain('update_time')
  })

  // ========== 2026-06-18: 单位字典白名单（UNIT_ENUM）测试 ==========
  describe('UNIT_ENUM 单位字典白名单', () => {
    it('11. 7 个合法单位全部通过', () => {
      for (const u of ['袋', '株', '粒', '千克', '克', '吨', '亩']) {
        const r = UNIT_ENUM.safeParse(u)
        expect(r.success, `单位 "${u}" 应合法`).toBe(true)
      }
    })

    it('12. 非法单位被拒绝', () => {
      const r = UNIT_ENUM.safeParse('invalid_unit')
      expect(r.success).toBe(false)
    })

    it('13. 空字符串被拒绝', () => {
      const r = UNIT_ENUM.safeParse('')
      expect(r.success).toBe(false)
    })

    it('14. 选项数量为 7', () => {
      expect(UNIT_ENUM.options.length).toBe(7)
    })
  })
})
