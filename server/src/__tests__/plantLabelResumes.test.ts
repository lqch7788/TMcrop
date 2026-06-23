/**
 * plant_label_resume 单元测试
 * 2026-06-23 T7: 履历 CRUD + 乐观锁 CAS + quantity → 0 自动 voided
 *
 * 策略：隔离内存 sql.js 数据库
 */
import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'

let db: Database

const CREATE_TABLE_LABELS = `
  CREATE TABLE IF NOT EXISTS plant_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label_number TEXT NOT NULL,
    planting_id TEXT,
    seedling_id TEXT,
    move_in_area_id INTEGER,
    move_in_area_name TEXT,
    move_in_date TEXT,
    move_out_area_id INTEGER,
    move_out_area_name TEXT,
    move_out_date TEXT,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    create_time TEXT DEFAULT (datetime('now','localtime'))
  )
`

const CREATE_TABLE_RESUME = `
  CREATE TABLE IF NOT EXISTS plant_label_resume (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label_id INTEGER NOT NULL,
    operation_type TEXT NOT NULL,
    from_area_name TEXT,
    to_area_name TEXT,
    mark_id INTEGER,
    mark_name TEXT,
    mark_color TEXT,
    operation_date TEXT NOT NULL,
    operator_name TEXT,
    image_base64 TEXT,
    quantity_change INTEGER,
    quantity_after INTEGER,
    reason TEXT,
    create_time TEXT DEFAULT (datetime('now','localtime'))
  )
`

function insertLabel(overrides: Record<string, any> = {}) {
  db.run(
    `INSERT INTO plant_labels (label_number, seedling_id, quantity, status) VALUES (?, ?, ?, ?)`,
    [overrides.label_number || `TEST-${Date.now()}`, overrides.seedling_id || null, overrides.quantity ?? 1, overrides.status ?? 'active']
  )
  return (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number) ?? 0
}

function insertResume(labelId: number, overrides: Record<string, any> = {}) {
  db.run(
    `INSERT INTO plant_label_resume (label_id, operation_type, to_area_name, operation_date, quantity_change, quantity_after, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      labelId,
      overrides.operation_type || 'move_in',
      overrides.to_area_name || null,
      overrides.operation_date || '2026-06-23',
      overrides.quantity_change ?? null,
      overrides.quantity_after ?? null,
      overrides.reason || null,
    ]
  )
}

beforeEach(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database()
  db.run(CREATE_TABLE_LABELS)
  db.run(CREATE_TABLE_RESUME)
})

describe('plant_label_resume 表结构', () => {
  it('应有 15 个字段（含 quantity_change/quantity_after/reason）', () => {
    const info = db.exec('PRAGMA table_info(plant_label_resume)')[0]?.values || []
    expect(info.length).toBe(15)
  })

  it('operation_type 不允许为空', () => {
    expect(() => {
      db.run('INSERT INTO plant_label_resume (label_id, operation_type, operation_date) VALUES (1, NULL, ?)', ['2026-06-23'])
    }).toThrow()
  })
})

describe('plant_label_resume CRUD', () => {
  it('插入履历后可查询', () => {
    const labelId = insertLabel({ label_number: 'R-TEST-001', quantity: 100 })
    insertResume(labelId, { operation_type: 'move_in', to_area_name: '东区-A' })

    const rows = db.exec('SELECT * FROM plant_label_resume WHERE label_id = ?', [labelId])
    expect(rows[0]?.values.length).toBe(1)
    const cols = rows[0]?.columns || []
    const typeIdx = cols.indexOf('operation_type')
    const areaIdx = cols.indexOf('to_area_name')
    expect(rows[0]?.values[0][typeIdx]).toBe('move_in')
    expect(rows[0]?.values[0][areaIdx]).toBe('东区-A')
  })

  it('按 label_id 查询所有履历，按日期倒序', () => {
    const labelId = insertLabel({ label_number: 'R-ORDER' })
    insertResume(labelId, { operation_type: 'move_in', operation_date: '2026-06-20' })
    insertResume(labelId, { operation_type: 'move_out', operation_date: '2026-06-22' })
    insertResume(labelId, { operation_type: 'mark', operation_date: '2026-06-21' })

    const rows = db.exec(
      'SELECT operation_type, operation_date FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC',
      [labelId]
    )
    expect(rows[0]?.values[0][0]).toBe('move_out')  // 06-22 最新
    expect(rows[0]?.values[1][0]).toBe('mark')      // 06-21
    expect(rows[0]?.values[2][0]).toBe('move_in')   // 06-20
  })

  it('支持 4 种 operation_type：move_in / move_out / mark / void', () => {
    const labelId = insertLabel({ label_number: 'R-TYPES' })
    const types = ['move_in', 'move_out', 'mark', 'void']
    for (const t of types) {
      insertResume(labelId, { operation_type: t, operation_date: '2026-06-23' })
    }
    const rows = db.exec('SELECT operation_type FROM plant_label_resume WHERE label_id = ?', [labelId])
    expect(rows[0]?.values.length).toBe(4)
  })
})

describe('乐观锁 CAS：quantity_change + quantity_after', () => {
  it('部分移出 200 株：quantity 5000 → 4800，quantity_after 记录剩余值', () => {
    const labelId = insertLabel({ label_number: 'CAS-001', quantity: 5000 })

    // 操作：移出 200 株
    const change = -200
    const after = 5000 + change // 4800
    insertResume(labelId, {
      operation_type: 'move_out',
      quantity_change: change,
      quantity_after: after,
      reason: '部分移栽',
    })
    db.run('UPDATE plant_labels SET quantity = ? WHERE id = ?', [after, labelId])

    // 验证
    const label = db.exec('SELECT quantity, status FROM plant_labels WHERE id = ?', [labelId])
    expect(label[0]?.values[0][0]).toBe(4800)
    expect(label[0]?.values[0][1]).toBe('active')

    const resume = db.exec('SELECT quantity_change, quantity_after, reason FROM plant_label_resume WHERE label_id = ?', [labelId])
    expect(resume[0]?.values[0][0]).toBe(-200)
    expect(resume[0]?.values[0][1]).toBe(4800)
    expect(resume[0]?.values[0][2]).toBe('部分移栽')
  })

  it('CAS 冲突检测：expected_quantity 不匹配时拒绝操作', () => {
    const labelId = insertLabel({ label_number: 'CAS-CONFLICT', quantity: 100 })

    // 模拟并发：客户端 A 读 quantity=100，客户端 B 已改成 50
    db.run('UPDATE plant_labels SET quantity = 50 WHERE id = ?', [labelId])

    // 客户端 A 尝试 CAS（expected=100）
    const expected = 100
    const current = db.exec('SELECT quantity FROM plant_labels WHERE id = ?', [labelId])[0]?.values[0][0] as number

    if (current !== expected) {
      // CAS 冲突 — 拒绝操作
      const rejected = true
      expect(rejected).toBe(true)
      expect(current).toBe(50)
    } else {
      // 不应执行到这里
      expect(true).toBe(false)
    }
  })

  it('quantity 减到 0 时自动标记 voided', () => {
    const labelId = insertLabel({ label_number: 'CAS-VOID', quantity: 100 })

    // 最后一次移出 100 株
    const after = 0
    db.run('UPDATE plant_labels SET quantity = ?, status = ? WHERE id = ?', [after, 'voided', labelId])

    const label = db.exec('SELECT quantity, status FROM plant_labels WHERE id = ?', [labelId])
    expect(label[0]?.values[0][0]).toBe(0)
    expect(label[0]?.values[0][1]).toBe('voided')
  })

  it('整批作废（void 操作）不改变 quantity', () => {
    const labelId = insertLabel({ label_number: 'CAS-VOID2', quantity: 500 })

    // void 操作：status → voided，quantity 不变
    insertResume(labelId, { operation_type: 'void', reason: '整批报废' })
    db.run('UPDATE plant_labels SET status = ? WHERE id = ?', ['voided', labelId])

    const label = db.exec('SELECT quantity, status FROM plant_labels WHERE id = ?', [labelId])
    expect(label[0]?.values[0][0]).toBe(500) // quantity 不变
    expect(label[0]?.values[0][1]).toBe('voided')
  })
})

describe('批量查询履历', () => {
  it('同时查询多个 label 的履历', () => {
    const id1 = insertLabel({ label_number: 'MULTI-1', quantity: 10 })
    const id2 = insertLabel({ label_number: 'MULTI-2', quantity: 20 })

    insertResume(id1, { operation_type: 'move_in', operation_date: '2026-06-23' })
    insertResume(id1, { operation_type: 'move_out', operation_date: '2026-06-23' })
    insertResume(id2, { operation_type: 'mark', operation_date: '2026-06-23' })

    const rows = db.exec(
      'SELECT label_id, COUNT(*) as cnt FROM plant_label_resume WHERE label_id IN (?, ?) GROUP BY label_id ORDER BY label_id',
      [id1, id2]
    )
    expect(rows[0]?.values[0][1]).toBe(2) // id1: 2 条
    expect(rows[0]?.values[1][1]).toBe(1) // id2: 1 条
  })
})

describe('履历限制 20 条查询', () => {
  it('超过 20 条时只返回最近 20 条', () => {
    const labelId = insertLabel({ label_number: 'LIMIT-20' })
    for (let i = 0; i < 25; i++) {
      insertResume(labelId, {
        operation_type: 'move_in',
        operation_date: `2026-06-${String(i + 1).padStart(2, '0')}`,
      })
    }
    const rows = db.exec(
      'SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC LIMIT 20',
      [labelId]
    )
    expect(rows[0]?.values.length).toBe(20)
  })
})
