/**
 * plant_marks 单元测试
 * 2026-06-23 T7: 标记 CRUD + 分配标签
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

const CREATE_TABLE_MARKS = `
  CREATE TABLE IF NOT EXISTS plant_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    parent_id INTEGER DEFAULT 0,
    mark_aid TEXT,
    is_use INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )
`

// 预置 4 个默认标记（与前端 DEFAULT_MARKS 一致）
const DEFAULT_MARKS = [
  { name: '正常', color: '#22c55e', icon: 'CheckCircle', mark_aid: 'normal', sort_order: 1 },
  { name: '关注', color: '#f59e0b', icon: 'AlertTriangle', mark_aid: 'normal', sort_order: 2 },
  { name: '问题', color: '#ef4444', icon: 'AlertCircle', mark_aid: 'normal', sort_order: 3 },
  { name: '优质', color: '#3b82f6', icon: 'Star', mark_aid: 'normal', sort_order: 4 },
]

function seedDefaultMarks() {
  const stmt = db.prepare(
    'INSERT INTO plant_marks (name, color, icon, mark_aid, sort_order) VALUES (?, ?, ?, ?, ?)'
  )
  for (const m of DEFAULT_MARKS) {
    stmt.run([m.name, m.color, m.icon, m.mark_aid, m.sort_order])
  }
  stmt.free()
}

function insertLabel(overrides: Record<string, any> = {}) {
  db.run(
    `INSERT INTO plant_labels (label_number, seedling_id, quantity, status) VALUES (?, ?, ?, ?)`,
    [overrides.label_number || `TEST-${Date.now()}`, overrides.seedling_id || null, overrides.quantity ?? 1, overrides.status ?? 'active']
  )
  return (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number) ?? 0
}

function markResumeExists(labelId: number, markId: number, markName: string): boolean {
  const rows = db.exec(
    'SELECT COUNT(*) as cnt FROM plant_label_resume WHERE label_id = ? AND operation_type = ? AND mark_id = ? AND mark_name = ?',
    [labelId, 'mark', markId, markName]
  )
  return (rows[0]?.values[0][0] as number) > 0
}

beforeEach(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database()
  db.run(CREATE_TABLE_LABELS)
  db.run(CREATE_TABLE_RESUME)
  db.run(CREATE_TABLE_MARKS)
  seedDefaultMarks()
})

describe('plant_marks 表结构', () => {
  it('应有 8 个字段', () => {
    const info = db.exec('PRAGMA table_info(plant_marks)')[0]?.values || []
    expect(info.length).toBe(8)
  })

  it('预置 4 个默认标记', () => {
    const rows = db.exec('SELECT COUNT(*) as cnt FROM plant_marks')
    expect(rows[0]?.values[0][0]).toBe(4)
  })
})

describe('标记查询', () => {
  it('查询所有标记', () => {
    const rows = db.exec('SELECT * FROM plant_marks ORDER BY sort_order')
    expect(rows[0]?.values.length).toBe(4)
    const cols = rows[0]?.columns || []
    const nameIdx = cols.indexOf('name')
    expect(rows[0]?.values[0][nameIdx]).toBe('正常')
    expect(rows[0]?.values[1][nameIdx]).toBe('关注')
    expect(rows[0]?.values[2][nameIdx]).toBe('问题')
    expect(rows[0]?.values[3][nameIdx]).toBe('优质')
  })

  it('标记包含颜色和图标', () => {
    const rows = db.exec('SELECT name, color, icon FROM plant_marks WHERE name = ?', ['正常'])
    expect(rows[0]?.values[0]).toEqual(['正常', '#22c55e', 'CheckCircle'])
  })
})

describe('分配标记给标签', () => {
  it('给单个标签分配标记 → 履历中生成 mark 记录', () => {
    const labelId = insertLabel({ label_number: 'MARK-A-001', quantity: 100 })
    const markId = 2 // "关注"
    const markName = '关注'
    const markColor = '#f59e0b'
    const now = '2026-06-23 10:00:00'

    // 分配标记：插入履历 + 更新标签（如需要）
    db.run(
      `INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date, create_time)
       VALUES (?, 'mark', ?, ?, ?, ?, ?)`,
      [labelId, markId, markName, markColor, '2026-06-23', now]
    )

    // 验证履历中包含标记记录
    expect(markResumeExists(labelId, markId, markName)).toBe(true)

    const resume = db.exec('SELECT operation_type, mark_name, mark_color FROM plant_label_resume WHERE label_id = ?', [labelId])
    expect(resume[0]?.values[0][0]).toBe('mark')
    expect(resume[0]?.values[0][1]).toBe('关注')
    expect(resume[0]?.values[0][2]).toBe('#f59e0b')
  })

  it('给多个标签分配同一标记', () => {
    const id1 = insertLabel({ label_number: 'MARK-M-001' })
    const id2 = insertLabel({ label_number: 'MARK-M-002' })
    const id3 = insertLabel({ label_number: 'MARK-M-003' })
    const markId = 3 // "问题"

    const stmt = db.prepare(
      `INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date)
       VALUES (?, 'mark', ?, '问题', '#ef4444', '2026-06-23')`
    )
    stmt.run([id1, markId])
    stmt.run([id2, markId])
    stmt.run([id3, markId])
    stmt.free()

    const rows = db.exec(
      'SELECT COUNT(*) as cnt FROM plant_label_resume WHERE mark_id = ?',
      [markId]
    )
    expect(rows[0]?.values[0][0]).toBe(3)
  })

  it('标签可多次分配不同标记', () => {
    const labelId = insertLabel({ label_number: 'MARK-MULTI' })

    // 先标记"关注"
    db.run(
      `INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date)
       VALUES (?, 'mark', 2, '关注', '#f59e0b', '2026-06-20')`,
      [labelId]
    )
    // 再标记"优质"
    db.run(
      `INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date)
       VALUES (?, 'mark', 4, '优质', '#3b82f6', '2026-06-22')`,
      [labelId]
    )

    const rows = db.exec(
      'SELECT mark_name FROM plant_label_resume WHERE label_id = ? AND operation_type = ? ORDER BY operation_date DESC',
      [labelId, 'mark']
    )
    expect(rows[0]?.values.length).toBe(2)
    expect(rows[0]?.values[0][0]).toBe('优质') // 最新
    expect(rows[0]?.values[1][0]).toBe('关注')
  })
})

describe('标记排序', () => {
  it('按 sort_order 升序排列', () => {
    const rows = db.exec('SELECT name, sort_order FROM plant_marks ORDER BY sort_order')
    const vals = rows[0]?.values || []
    expect(vals[0][0]).toBe('正常')
    expect(vals[0][1]).toBe(1)
    expect(vals[3][0]).toBe('优质')
    expect(vals[3][1]).toBe(4)
  })
})
