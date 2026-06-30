/**
 * 种植移入/移出（POST /:id/move）V2 单测
 * 2026-06-21：覆盖 5 个校验分支
 *
 * 策略：
 *   - 隔离内存 sql.js DB（与 plantingAreaStocks.test.ts / plantingHarvestRecords.test.ts 风格一致）
 *   - 不启动 server，不污染主 DB
 *   - 直接调 handleMove(db, plantingId, body, user) 纯函数（handler 核心逻辑）
 *     不调路由（项目其他测试也遵循"测纯函数 + 内存 DB"模式，无 supertest）
 *
 * 覆盖：
 *   1. 调入：来源库存不足 → 400 + 提示"库存不足"
 *   2. 调出：调出区域库存不足 → 400 + 提示"调出区域...不足"
 *   3. 调出：目标订单作物不一致 → 400 + 提示"作物不一致"
 *   4. 调出：源区域与目标区域相同（self-move） → 400 + 提示"源区域与目标区域相同"
 *   5. 调出：订单已结束 → 400 + 提示"已结束/已采收"
 */
import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import { handleMove } from '../services/plantingMoveHandler'
import { queryToObjects } from '../utils/queryHelper'

let db: Database

/**
 * 与 server/src/db/fixMissingSchema.ts:2599 + schema.ts:568 保持一致的真实建表 SQL
 * 注意：planting_move_records 实际只有 13 列，没有 task 文档描述的 target_type/target_id/target_code
 * （扩表超出任务 6 范围，handler 只写现有列）
 */
const CREATE_PLANTING_MOVE_RECORDS = `
  CREATE TABLE planting_move_records (
    id TEXT PRIMARY KEY,
    planting_id TEXT NOT NULL,
    planting_code TEXT,
    operation_type TEXT NOT NULL CHECK(operation_type IN ('move_in','move_out')),
    from_area_id TEXT,
    from_area_name TEXT,
    to_area_id TEXT,
    to_area_name TEXT,
    quantity INTEGER DEFAULT 0,
    operation_date TEXT,
    operator_name TEXT,
    remarks TEXT,
    create_time TEXT
  )
`

beforeEach(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database()

  // 主表：plantings（最小列集）
  db.run(`
    CREATE TABLE plantings (
      id TEXT PRIMARY KEY,
      planting_code TEXT,
      crop_code TEXT,
      crop_variety TEXT,
      crop_name TEXT,
      area_id TEXT,
      area_name TEXT,
      planting_quantity INTEGER DEFAULT 0,
      planted_quantity INTEGER DEFAULT 0,
      status TEXT,
      is_harvest_locked INTEGER DEFAULT 0,
      end_time TEXT,
      planting_date TEXT,
      create_time TEXT,
      update_time TEXT  -- 2026-06-30 Bug 修复：调入同步累加 planting_quantity 时需要此列
    )
  `)

  // 来源表：seed_sources（最小列集 — handler 只读 crop_code/variety/remaining/status/area_id/source_code）
  db.run(`
    CREATE TABLE seed_sources (
      id TEXT PRIMARY KEY,
      source_code TEXT,
      source_type TEXT,
      crop_code TEXT,
      crop_variety TEXT,
      source_name TEXT,
      remaining_quantity INTEGER DEFAULT 0,
      used_quantity INTEGER DEFAULT 0,
      status TEXT,
      area_id TEXT
    )
  `)

  // 区域库存表：planting_area_stocks（与 plantingAreaStocks.ts 一致）
  db.run(`
    CREATE TABLE planting_area_stocks (
      id TEXT PRIMARY KEY,
      planting_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      area_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      source_type TEXT,
      source_id TEXT,
      source_code TEXT,
      operation_date TEXT,
      remarks TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL
    )
  `)

  db.run(CREATE_PLANTING_MOVE_RECORDS)
})

// 默认 user（handler 内部取 user.realName/username）
const TEST_USER = { realName: 'tester', username: 'tester' }

describe('POST /:id/move — 调入', () => {
  // 2026-06-30 Bug 修复回归：planting_area_stocks 为空时（新建订单不写 stocks），
  // 用 planting.area_id 作为 toAreaId 调入应成功，handler 应 INSERT 一条新行
  it('successfully moves in when planting_area_stocks is empty (fallback to planting.area_id)', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    // 注意：不写 planting_area_stocks — 模拟新建订单（只有 plantings 主表有 area_id）
    db.run(
      `INSERT INTO seed_sources VALUES ('S1', 'SRC001', 'seed', 'CC001', 'var1', 'src1', 200, 0, 'sufficient', 'src_area')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_in',
      toAreaId: 'A1',          // 来自 plantings.area_id（前端兜底）
      toAreaName: 'area1',     // 来自 plantings.area_name（前端兜底）
      sourceType: 'seed',
      sourceId: 'S1',
      sourceCode: 'SRC001',
      quantity: 50,
    }, TEST_USER)

    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)

    // 断言 1：planting_area_stocks 新行（handler 应 INSERT）
    const newStocks = queryToObjects<any>(db, `SELECT * FROM planting_area_stocks WHERE planting_id = 'P1'`)
    expect(newStocks).toHaveLength(1)
    expect(newStocks[0].areaId).toBe('A1')
    expect(newStocks[0].areaName).toBe('area1')
    expect(newStocks[0].quantity).toBe(50)

    // 断言 2：seed_sources 扣减
    const src = queryToObjects<any>(db, `SELECT remaining_quantity, used_quantity FROM seed_sources WHERE id = 'S1'`)[0]
    expect(src.remainingQuantity).toBe(150)
    expect(src.usedQuantity).toBe(50)

    // 断言 3：planting_move_records 新行
    const moves = queryToObjects<any>(db, `SELECT * FROM planting_move_records WHERE planting_id = 'P1'`)
    expect(moves).toHaveLength(1)
    expect(moves[0].operationType).toBe('move_in')
    expect(moves[0].toAreaId).toBe('A1')
    expect(moves[0].toAreaName).toBe('area1')
    expect(moves[0].quantity).toBe(50)
  })

  // 2026-06-30 Bug 修复回归：连续 2 次调入，主表 planting_quantity 应累加（10+3=13）
  it('accumulates plantings.planting_quantity on consecutive move_in', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 10, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO seed_sources VALUES ('S1', 'SRC001', 'seed', 'CC001', 'var1', 'src1', 200, 0, 'sufficient', 'src_area')`,
    )

    // 第一次调入 3
    const r1 = await handleMove(db, 'P1', {
      operationType: 'move_in',
      toAreaId: 'A1',
      toAreaName: 'area1',
      sourceType: 'seed',
      sourceId: 'S1',
      sourceCode: 'SRC001',
      quantity: 3,
    }, TEST_USER)
    expect(r1.status).toBe(200)

    // 第二次调入 10
    const r2 = await handleMove(db, 'P1', {
      operationType: 'move_in',
      toAreaId: 'A1',
      toAreaName: 'area1',
      sourceType: 'seed',
      sourceId: 'S1',
      sourceCode: 'SRC001',
      quantity: 10,
    }, TEST_USER)
    expect(r2.status).toBe(200)

    // 断言主表累加：10 (初始) + 3 (第1次) + 10 (第2次) = 23
    const p = queryToObjects<any>(db, `SELECT planting_quantity FROM plantings WHERE id = 'P1'`)[0]
    expect(p.plantingQuantity).toBe(23)

    // 断言 area_stocks 累加：3 + 10 = 13
    const s = queryToObjects<any>(db, `SELECT quantity FROM planting_area_stocks WHERE planting_id = 'P1'`)[0]
    expect(s.quantity).toBe(13)
  })

  it('rejects when source insufficient', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO seed_sources VALUES ('S1', 'SRC001', 'seed', 'CC001', 'var1', 'src1', 50, 0, 'sufficient', 'src_area')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_in',
      toAreaId: 'A1',
      toAreaName: 'area1',
      sourceType: 'seed',
      sourceId: 'S1',
      sourceCode: 'SRC001',
      quantity: 100,
    }, TEST_USER)

    expect(result.status).toBe(400)
    expect(result.body.error).toMatch(/库存不足/)
  })
})

describe('POST /:id/move — 调出', () => {
  it('rejects when from area stock insufficient', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 50, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_out',
      fromAreaId: 'A1',
      fromAreaName: 'area1',
      toAreaId: 'A2',
      toAreaName: 'area2',
      targetPlantingId: 'P2',
      quantity: 100,
    }, TEST_USER)

    expect(result.status).toBe(400)
    expect(result.body.error).toMatch(/调出区域.*不足/)
  })

  it('rejects when crop code mismatch', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC002', 'var2', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_out',
      fromAreaId: 'A1',
      fromAreaName: 'area1',
      toAreaId: 'A2',
      toAreaName: 'area2',
      targetPlantingId: 'P2',
      quantity: 50,
    }, TEST_USER)

    expect(result.status).toBe(400)
    expect(result.body.error).toMatch(/作物不一致/)
  })

  it('rejects self-move (same area)', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_out',
      fromAreaId: 'A1',
      fromAreaName: 'area1',
      toAreaId: 'A1',
      toAreaName: 'area1',
      targetPlantingId: 'P1',
      quantity: 50,
    }, TEST_USER)

    expect(result.status).toBe(400)
    expect(result.body.error).toMatch(/源区域与目标区域相同/)
  })

  // 2026-06-30 Bug 修复回归：调出同步扣减源主表 + 累加目标主表
  it('accumulates plantings.planting_quantity on move_out (source -qty, target +qty)', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK2', 'P2', 'A2', 'area2', 0, 'migrate', null, 'ZZ002', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 20, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_out',
      fromAreaId: 'A1',
      fromAreaName: 'area1',
      toAreaId: 'A2',
      toAreaName: 'area2',
      targetPlantingId: 'P2',
      quantity: 30,
    }, TEST_USER)
    expect(result.status).toBe(200)

    // 断言：源主表 100 - 30 = 70
    const p1 = queryToObjects<any>(db, `SELECT planting_quantity FROM plantings WHERE id = 'P1'`)[0]
    expect(p1.plantingQuantity).toBe(70)
    // 断言：目标主表 20 + 30 = 50
    const p2 = queryToObjects<any>(db, `SELECT planting_quantity FROM plantings WHERE id = 'P2'`)[0]
    expect(p2.plantingQuantity).toBe(50)
    // 断言：源 area_stocks 100 - 30 = 70
    const s1 = queryToObjects<any>(db, `SELECT quantity FROM planting_area_stocks WHERE planting_id = 'P1' AND area_id = 'A1'`)[0]
    expect(s1.quantity).toBe(70)
    // 断言：目标 area_stocks 0 + 30 = 30
    const s2 = queryToObjects<any>(db, `SELECT quantity FROM planting_area_stocks WHERE planting_id = 'P2' AND area_id = 'A2'`)[0]
    expect(s2.quantity).toBe(30)
  })

  it('rejects when planting is ended', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'ended', 0, '2026-06-20', '2026-06-21', 'now', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now', 'now')`,
    )

    const result = await handleMove(db, 'P1', {
      operationType: 'move_out',
      fromAreaId: 'A1',
      fromAreaName: 'area1',
      toAreaId: 'A2',
      toAreaName: 'area2',
      targetPlantingId: 'P2',
      quantity: 50,
    }, TEST_USER)

    expect(result.status).toBe(400)
    expect(result.body.error).toMatch(/已结束|已采收/)
  })
})

/**
 * 2026-06-30：任务 11 后端单测补充 — seed_form 回填
 *
 * 回填逻辑位于 fixMissingSchema.ts:2411-2426 的 try/catch 块内，
 * 无法独立导出，因此按"等价 SQL + 断言映射正确性"模式验证：
 *   对每种 source_type 跑一遍 UPDATE 后查 seed_form
 *
 * 映射表（与 fixMissingSchema.ts 保持一致）：
 *   seed       → 种子
 *   seedling   → 种苗
 *   cutting    → 穗条
 *   grafting   → 枝条
 *   tissue_culture → 其他
 *   split      → 整株
 *   bulb       → 鳞茎
 *   other      → 其他
 *
 * 边界：seed_form 已存在（非空）时不被覆盖（WHERE seed_form IS NULL OR seed_form = ''）
 */
describe('seed_form 回填（任务 1 引入的 source_type → seed_form 映射）', () => {
  /**
   * 与 fixMissingSchema.ts:2412-2416 完全一致的映射表
   * 测试覆盖：复制粘贴以确保两边同步；如未来调整映射，此处必须同步更新
   */
  const SEED_FORM_MAP: Array<[string, string]> = [
    ['seed', '种子'], ['seedling', '种苗'], ['cutting', '穗条'],
    ['grafting', '枝条'], ['tissue_culture', '其他'], ['split', '整株'],
    ['bulb', '鳞茎'], ['other', '其他'],
  ]

  /**
   * 给当前 db 注入 seed_form 列（等价 fixMissingSchema.ts:1654 的 ALTER TABLE）
   */
  function addSeedFormColumn() {
    db.run(`ALTER TABLE seed_sources ADD COLUMN seed_form TEXT`)
  }

  /**
   * 执行回填逻辑（与 fixMissingSchema.ts:2417-2422 完全等价）
   */
  function backfillSeedForm() {
    for (const [srcType, seedForm] of SEED_FORM_MAP) {
      db.run(
        `UPDATE seed_sources SET seed_form = ? WHERE source_type = ? AND (seed_form IS NULL OR seed_form = '')`,
        [seedForm, srcType]
      )
    }
  }

  it('回填后 8 种 source_type 都映射到正确的 seed_form', () => {
    addSeedFormColumn()

    // 插入 8 条不同 source_type 的种源（seed_form 全空）
    db.run(
      `INSERT INTO seed_sources VALUES
        ('S_seed', 'SRC_S', 'seed', 'C1', 'v1', 'src_seed', 10, 0, 'sufficient', 'A1', NULL),
        ('S_seedling', 'SRC_SL', 'seedling', 'C1', 'v1', 'src_seedling', 10, 0, 'sufficient', 'A1', NULL),
        ('S_cutting', 'SRC_C', 'cutting', 'C1', 'v1', 'src_cutting', 10, 0, 'sufficient', 'A1', NULL),
        ('S_grafting', 'SRC_G', 'grafting', 'C1', 'v1', 'src_grafting', 10, 0, 'sufficient', 'A1', NULL),
        ('S_tc', 'SRC_TC', 'tissue_culture', 'C1', 'v1', 'src_tc', 10, 0, 'sufficient', 'A1', NULL),
        ('S_split', 'SRC_SP', 'split', 'C1', 'v1', 'src_split', 10, 0, 'sufficient', 'A1', NULL),
        ('S_bulb', 'SRC_B', 'bulb', 'C1', 'v1', 'src_bulb', 10, 0, 'sufficient', 'A1', NULL),
        ('S_other', 'SRC_O', 'other', 'C1', 'v1', 'src_other', 10, 0, 'sufficient', 'A1', NULL)`
    )

    backfillSeedForm()

    // 断言：每条种源的 seed_form 都被正确设置
    const rows = queryToObjects<any>(
      db,
      `SELECT id, source_type AS sourceType, seed_form AS seedForm FROM seed_sources`,
      []
    )
    const byId = Object.fromEntries(rows.map(r => [r.id, r]))
    expect(byId['S_seed'].seedForm).toBe('种子')
    expect(byId['S_seedling'].seedForm).toBe('种苗')
    expect(byId['S_cutting'].seedForm).toBe('穗条')
    expect(byId['S_grafting'].seedForm).toBe('枝条')
    expect(byId['S_tc'].seedForm).toBe('其他')        // tissue_culture → 其他
    expect(byId['S_split'].seedForm).toBe('整株')
    expect(byId['S_bulb'].seedForm).toBe('鳞茎')
    expect(byId['S_other'].seedForm).toBe('其他')
  })

  it('已存在 seed_form（非空）不被回填覆盖', () => {
    addSeedFormColumn()

    db.run(
      `INSERT INTO seed_sources VALUES
        ('S1', 'SRC1', 'seed', 'C1', 'v1', 'src1', 10, 0, 'sufficient', 'A1', '用户自定义形态'),
        ('S2', 'SRC2', 'seed', 'C1', 'v1', 'src2', 10, 0, 'sufficient', 'A1', NULL)`
    )

    backfillSeedForm()

    const rows = queryToObjects<any>(
      db,
      `SELECT id, seed_form AS seedForm FROM seed_sources ORDER BY id`,
      []
    )
    expect(rows[0].seedForm).toBe('用户自定义形态')  // 不被覆盖
    expect(rows[1].seedForm).toBe('种子')            // 空值被回填
  })

  it('未在映射表中的 source_type 不被回填（保持 NULL）', () => {
    addSeedFormColumn()

    db.run(
      `INSERT INTO seed_sources VALUES
        ('S_unknown', 'SRC_U', 'unknown_type', 'C1', 'v1', 'src_u', 10, 0, 'sufficient', 'A1', NULL)`
    )

    backfillSeedForm()

    const rows = queryToObjects<any>(
      db,
      `SELECT seed_form AS seedForm FROM seed_sources WHERE id = 'S_unknown'`,
      []
    )
    expect(rows[0].seedForm).toBeNull()
  })
})

/**
 * 2026-06-30：任务 11 后端单测补充 — GET /api/seed-sources/lookup 端点的 SQL 行为
 *
 * 路由 handler 含 queryToObjects 调用 + 参数归一化 + try/catch，
 * 但核心行为由 SQL 决定：
 *   1. 固定条件：remaining_quantity > 0 AND status NOT IN ('depleted', 'cancelled')
 *   2. 可选条件：crop_name LIKE、crop_variety LIKE、seed_form =
 *   3. 排序 + LIMIT
 *
 * 测试策略：直接复用路由文件中的 SQL，断言过滤行为（不启动 HTTP 层）
 */
describe('GET /api/seed-sources/lookup — SQL 行为（任务 2）', () => {
  /**
   * 与 routes/seedSource.ts:202-216 保持一致的 lookup SQL
   * 注意：使用 mapToCamelCase 后查询结果是 camelCase 字段
   */
  const LOOKUP_SQL = `
    SELECT id,
           source_code AS sourceCode,
           crop_name AS cropName,
           crop_variety AS cropVariety,
           seed_form AS seedForm,
           remaining_quantity AS remainingQuantity,
           unit,
           source_type AS sourceType,
           status
    FROM seed_sources
    WHERE remaining_quantity > 0
      AND status NOT IN ('depleted', 'cancelled')
      AND (? = '' OR crop_name LIKE ?)
      AND (? = '' OR crop_variety LIKE ?)
      AND (? = '' OR seed_form = ?)
    ORDER BY create_time DESC
    LIMIT ?
  `

  /**
   * 构造 lookup 路由内的参数归一化逻辑（routes/seedSource.ts:175-179）
   */
  function buildParams(cropName: string, cropVariety: string, seedForm: string, limit: number) {
    return [
      cropName,
      `%${cropName}%`,
      cropVariety,
      `%${cropVariety}%`,
      seedForm,
      seedForm,
      limit,
    ]
  }

  beforeEach(() => {
    // 给 seed_sources 加 lookup SQL 所需的列（等价 fixMissingSchema.ts）
    // 外层 beforeEach 建表已有 crop_code/crop_variety/source_type/source_name
    // 缺少：crop_name / seed_form / create_time / unit（lookup SQL 用到）
    db.run(`ALTER TABLE seed_sources ADD COLUMN seed_form TEXT`)
    db.run(`ALTER TABLE seed_sources ADD COLUMN create_time TEXT`)
    db.run(`ALTER TABLE seed_sources ADD COLUMN unit TEXT`)
    db.run(`ALTER TABLE seed_sources ADD COLUMN crop_name TEXT`)

    // 6 条覆盖各种过滤维度的种源
    // 列顺序：id, source_code, source_type, crop_code, crop_variety, source_name,
    //         remaining_quantity, used_quantity, status, area_id, seed_form, unit, create_time, crop_name
    db.run(
      `INSERT INTO seed_sources VALUES
        ('S_grape', 'SRC_GR', 'seed', 'C_GRAPE', '巨峰', 'grape_seed', 100, 0, 'sufficient', 'A1', '种子', '克', '2026-06-01', '葡萄'),
        ('S_grape_seedling', 'SRC_GRSL', 'seedling', 'C_GRAPE', '巨峰', 'grape_seedling', 50, 0, 'sufficient', 'A1', '种苗', '株', '2026-06-02', '葡萄'),
        ('S_apple', 'SRC_AP', 'seed', 'C_APPLE', '红富士', 'apple_seed', 80, 0, 'sufficient', 'A1', '种子', '克', '2026-06-03', '苹果'),
        ('S_apple_red', 'SRC_APR', 'seed', 'C_APPLE', '红星', 'apple_red_seed', 60, 0, 'sufficient', 'A1', '种子', '克', '2026-06-04', '苹果'),
        ('S_grape_cutting', 'SRC_GRC', 'cutting', 'C_GRAPE', '巨峰', 'grape_cutting', 30, 0, 'sufficient', 'A1', '穗条', '根', '2026-06-05', '葡萄'),
        ('S_grape_depleted', 'SRC_GRD', 'seed', 'C_GRAPE', '巨峰', 'grape_depleted', 0, 100, 'depleted', 'A1', '种子', '克', '2026-06-06', '葡萄')`
    )
  })

  it('cropName LIKE 过滤：传入"葡"匹配所有葡萄相关种源', () => {
    // crop_name='葡萄'/'苹果'，LIKE '%葡%' 应匹配 3 条葡萄（不含 depleted）
    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('葡', '', '', 50))

    expect(rows.length).toBe(3)
    const codes = rows.map(r => r.sourceCode).sort()
    expect(codes).toEqual(['SRC_GR', 'SRC_GRC', 'SRC_GRSL'])
  })

  it('cropName LIKE 过滤：空字符串 = 不过滤', () => {
    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '', '', 50))

    // 6 条数据，depleted 那条被 status 过滤掉 → 5 条
    expect(rows.length).toBe(5)
    const codes = rows.map(r => r.sourceCode).sort()
    expect(codes).not.toContain('SRC_GRD')  // depleted 被排除
  })

  it('cropVariety LIKE 过滤：只匹配品种', () => {
    // crop_variety='红富士'/'红星'/'巨峰'，LIKE '%富士%' 只匹配 SRC_AP
    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '富士', '', 50))
    expect(rows.length).toBe(1)
    expect(rows[0].sourceCode).toBe('SRC_AP')
  })

  it('seedForm 精确匹配：只返回对应形态', () => {
    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '', '穗条', 50))

    expect(rows.length).toBe(1)
    expect(rows[0].sourceCode).toBe('SRC_GRC')
    expect(rows[0].seedForm).toBe('穗条')
  })

  it('status=depleted 始终被排除（即使 remaining_quantity > 0 也排除）', () => {
    // 额外构造：depleted 但 remaining_quantity > 0（异常数据也应被排除）
    db.run(`INSERT INTO seed_sources VALUES
      ('S_depleted_with_stock', 'SRC_DWS', 'seed', 'C_X', '未知', 'src_dws', 50, 0, 'depleted', 'A1', '种子', '克', '2026-06-07', '未知')`)

    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '', '', 50))

    // depleted 状态的 2 条都不应出现（S_grape_depleted + S_depleted_with_stock）
    const codes = rows.map(r => r.sourceCode)
    expect(codes).not.toContain('SRC_GRD')
    expect(codes).not.toContain('SRC_DWS')
  })

  it('status=cancelled 同样被排除', () => {
    db.run(`INSERT INTO seed_sources VALUES
      ('S_cancelled', 'SRC_CNL', 'seed', 'C_X', '未知', 'src_cnl', 50, 0, 'cancelled', 'A1', '种子', '克', '2026-06-08', '未知')`)

    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '', '', 50))
    expect(rows.map(r => r.sourceCode)).not.toContain('SRC_CNL')
  })

  it('remaining_quantity = 0 被排除', () => {
    db.run(`INSERT INTO seed_sources VALUES
      ('S_zero_stock', 'SRC_ZS', 'seed', 'C_X', '未知', 'src_zs', 0, 0, 'sufficient', 'A1', '种子', '克', '2026-06-09', '未知')`)

    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '', '', 50))
    expect(rows.map(r => r.sourceCode)).not.toContain('SRC_ZS')
  })

  it('LIMIT 生效', () => {
    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('', '', '', 2))
    expect(rows.length).toBe(2)
  })

  it('复合过滤：cropName + seedForm 同时生效', () => {
    // '葡' + '穗条' → 只有 SRC_GRC（葡萄 + 穗条）
    const rows = queryToObjects<any>(db, LOOKUP_SQL, buildParams('葡', '', '穗条', 50))
    expect(rows.length).toBe(1)
    expect(rows[0].sourceCode).toBe('SRC_GRC')
  })
})

/**
 * 2026-06-30：任务 11 后端单测补充 — GET /api/seed-sources/:id/move-records 端点的 SQL 行为
 *
 * 核心断言：只返回 source_id = :id 且 source_type = 'seed' 的记录
 * - 调入 2 次同一种源（seed）→ 返回 2 条
 * - 调入 1 次 seedling 类型 → 不返回（即使 source_id 相同）
 *
 * SQL 与 routes/seedSource.ts:233-246 保持一致
 */
describe('GET /api/seed-sources/:id/move-records — SQL 行为（任务 3）', () => {
  /**
   * 与 routes/seedSource.ts:233-246 保持一致的 move-records SQL
   * 注意：当前 schema 中 planting_move_records 没有 source_type 列
   * （schema.ts 历史原因），但 SQL 仍按 seedSource.ts 写法运行。
   * 本测试通过扩展 schema 加 source_type 列来匹配 SQL 真实行为。
   */
  const MOVE_RECORDS_SQL = `
    SELECT id, operation_date AS operationDate,
           operation_type AS operationType, quantity,
           source_id AS sourceId, source_code AS sourceCode,
           planting_id AS plantingId, planting_code AS plantingCode,
           to_area_id AS toAreaId, to_area_name AS toAreaName,
           from_area_id AS fromAreaId, from_area_name AS fromAreaName,
           operator_name AS operatorName, remarks,
           create_time AS createTime
    FROM planting_move_records
    WHERE source_id = ? AND source_type = 'seed'
    ORDER BY operation_date DESC, create_time DESC
  `

  beforeEach(() => {
    // 给 planting_move_records 加 source_type 列（与生产 schema 对齐）
    db.run(`ALTER TABLE planting_move_records ADD COLUMN source_type TEXT`)
    db.run(`ALTER TABLE planting_move_records ADD COLUMN source_id TEXT`)
    db.run(`ALTER TABLE planting_move_records ADD COLUMN source_code TEXT`)
  })

  it('调入 2 次后查 move-records 返回 2 条', () => {
    // 同一种源（S1）调入 2 次
    db.run(
      `INSERT INTO planting_move_records VALUES
        ('R1', 'P1', 'ZZ001', 'move_in', NULL, NULL, 'A1', 'area1', 30, '2026-06-01', 'op1', NULL, '2026-06-01 10:00', 'seed', 'S1', 'SRC1'),
        ('R2', 'P2', 'ZZ002', 'move_in', NULL, NULL, 'A2', 'area2', 20, '2026-06-02', 'op1', NULL, '2026-06-02 11:00', 'seed', 'S1', 'SRC1')`
    )

    const rows = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S1'])
    expect(rows.length).toBe(2)
    // 验证排序：按 operation_date DESC
    expect(rows[0].operationDate).toBe('2026-06-02')
    expect(rows[1].operationDate).toBe('2026-06-01')
  })

  it('source_type=seedling 不在结果内（即使 source_id 相同）', () => {
    db.run(
      `INSERT INTO planting_move_records VALUES
        ('R1', 'P1', 'ZZ001', 'move_in', NULL, NULL, 'A1', 'area1', 30, '2026-06-01', 'op1', NULL, '2026-06-01 10:00', 'seed',     'S1', 'SRC1'),
        ('R2', 'P2', 'ZZ002', 'move_in', NULL, NULL, 'A2', 'area2', 20, '2026-06-02', 'op1', NULL, '2026-06-02 11:00', 'seedling', 'S1', 'SRC1')`
    )

    const rows = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S1'])
    // 只返回 source_type='seed' 那条
    expect(rows.length).toBe(1)
    expect(rows[0].id).toBe('R1')
  })

  it('不同种源的记录互不干扰', () => {
    db.run(
      `INSERT INTO planting_move_records VALUES
        ('R1', 'P1', 'ZZ001', 'move_in', NULL, NULL, 'A1', 'area1', 30, '2026-06-01', 'op1', NULL, '2026-06-01 10:00', 'seed', 'S1', 'SRC1'),
        ('R2', 'P2', 'ZZ002', 'move_in', NULL, NULL, 'A2', 'area2', 20, '2026-06-02', 'op1', NULL, '2026-06-02 11:00', 'seed', 'S2', 'SRC2')`
    )

    const rowsS1 = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S1'])
    const rowsS2 = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S2'])

    expect(rowsS1.length).toBe(1)
    expect(rowsS1[0].id).toBe('R1')
    expect(rowsS2.length).toBe(1)
    expect(rowsS2[0].id).toBe('R2')
  })

  it('move_out 操作类型也返回（SQL 不按 operation_type 过滤）', () => {
    // 注意：move-records 端点只按 source_id + source_type 过滤，
    // 不按 operation_type 过滤（调入和调出都展示）
    db.run(
      `INSERT INTO planting_move_records VALUES
        ('R_in',  'P1', 'ZZ001', 'move_in',  NULL, NULL, 'A1', 'area1', 30, '2026-06-01', 'op1', NULL, '2026-06-01 10:00', 'seed', 'S1', 'SRC1'),
        ('R_out', 'P1', 'ZZ001', 'move_out', 'A1', 'area1', 'A2', 'area2', 5, '2026-06-02', 'op1', NULL, '2026-06-02 11:00', 'seed', 'S1', 'SRC1')`
    )

    const rows = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S1'])
    expect(rows.length).toBe(2)
    const ops = rows.map(r => r.operationType).sort()
    expect(ops).toEqual(['move_in', 'move_out'])
  })

  it('空结果：没有匹配的 source_id', () => {
    db.run(
      `INSERT INTO planting_move_records VALUES
        ('R1', 'P1', 'ZZ001', 'move_in', NULL, NULL, 'A1', 'area1', 30, '2026-06-01', 'op1', NULL, '2026-06-01 10:00', 'seed', 'S1', 'SRC1')`
    )

    const rows = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S_NOT_EXIST'])
    expect(rows.length).toBe(0)
  })

  it('返回字段驼峰转换正确', () => {
    db.run(
      `INSERT INTO planting_move_records VALUES
        ('R1', 'P1', 'ZZ001', 'move_in', NULL, NULL, 'A1', 'area1', 30, '2026-06-01', 'op1', NULL, '2026-06-01 10:00', 'seed', 'S1', 'SRC1')`
    )

    const rows = queryToObjects<any>(db, MOVE_RECORDS_SQL, ['S1'])
    expect(rows.length).toBe(1)
    // 验证驼峰字段名映射（snake_case → camelCase）
    const row = rows[0]
    expect(row.operationDate).toBe('2026-06-01')
    expect(row.operationType).toBe('move_in')
    expect(row.sourceId).toBe('S1')
    expect(row.sourceCode).toBe('SRC1')
    expect(row.plantingId).toBe('P1')
    expect(row.plantingCode).toBe('ZZ001')
    expect(row.toAreaId).toBe('A1')
    expect(row.toAreaName).toBe('area1')
    expect(row.operatorName).toBe('op1')
    expect(row.createTime).toBe('2026-06-01 10:00')
  })
})
