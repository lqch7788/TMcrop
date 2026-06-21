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
      create_time TEXT
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
  it('rejects when source insufficient', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`,
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
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 50, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now')`,
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
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC002', 'var2', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now')`,
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
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'growing', 0, null, '2026-06-21', 'now')`,
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

  it('rejects when planting is ended', async () => {
    db.run(
      `INSERT INTO plantings VALUES ('P1', 'ZZ001', 'CC001', 'var1', 'crop1', 'A1', 'area1', 100, 0, 'ended', 0, '2026-06-20', '2026-06-21', 'now')`,
    )
    db.run(
      `INSERT INTO planting_area_stocks VALUES ('STK1', 'P1', 'A1', 'area1', 100, 'migrate', null, 'ZZ001', '2026-06-21', null, 'now', 'now')`,
    )
    db.run(
      `INSERT INTO plantings VALUES ('P2', 'ZZ002', 'CC001', 'var1', 'crop2', 'A2', 'area2', 0, 0, 'growing', 0, null, '2026-06-21', 'now')`,
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
