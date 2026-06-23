/**
 * plant_labels 单元测试
 * 2026-06-23 T7: 标签 CRUD + 扫码查询 + 批量生成 + 分页
 *
 * 策略：隔离内存 sql.js 数据库，手工建表 + 真实 SQL 断言
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
  const fields = ['label_number', 'planting_id', 'seedling_id', 'move_in_area_name', 'move_in_date', 'quantity', 'status']
  const values = fields.map((f) => overrides[f] ?? null)
  // label_number 必填
  const labelNumber = overrides.label_number || `TEST-${Date.now()}`
  db.run(
    `INSERT INTO plant_labels (label_number, planting_id, seedling_id, move_in_area_name, move_in_date, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [labelNumber, overrides.planting_id ?? null, overrides.seedling_id ?? null, overrides.move_in_area_name ?? null, overrides.move_in_date ?? null, overrides.quantity ?? 1, overrides.status ?? 'active']
  )
  const row = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]
  return (row?.[0] as number) ?? 0
}

beforeEach(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database()
  db.run(CREATE_TABLE_LABELS)
  db.run(CREATE_TABLE_RESUME)
})

describe('plant_labels 表结构', () => {
  it('应有 13 个字段（含 quantity/status）', () => {
    const info = db.exec('PRAGMA table_info(plant_labels)')[0]?.values || []
    expect(info.length).toBe(13)
  })

  it('quantity 默认值为 1', () => {
    insertLabel({ label_number: 'Q-DEFAULT' })
    const rows = db.exec('SELECT quantity FROM plant_labels WHERE label_number = ?', ['Q-DEFAULT'])
    expect(rows[0]?.values[0][0]).toBe(1)
  })

  it('status 默认值为 active', () => {
    insertLabel({ label_number: 'S-DEFAULT' })
    const rows = db.exec('SELECT status FROM plant_labels WHERE label_number = ?', ['S-DEFAULT'])
    expect(rows[0]?.values[0][0]).toBe('active')
  })

  it('不允许 label_number 为空', () => {
    expect(() => {
      db.run('INSERT INTO plant_labels (label_number) VALUES (NULL)')
    }).toThrow()
  })
})

describe('plant_labels CRUD', () => {
  it('插入标签后可查询', () => {
    const id = insertLabel({ label_number: 'YM20260623-001-0001', quantity: 5000, status: 'active' })
    const rows = db.exec('SELECT * FROM plant_labels WHERE id = ?', [id])
    const row = rows[0]?.values[0] as any[]
    expect(row).toBeDefined()
    // label_number 是 TEXT 第 2 列（索引 1）
    // 列顺序: id(0), label_number(1), planting_id(2), seedling_id(3), move_in_area_id(4),
    //          move_in_area_name(5), move_in_date(6), move_out_area_id(7),
    //          move_out_area_name(8), move_out_date(9), quantity(10), status(11), create_time(12)
    const cols = rows[0]?.columns || []
    const labelIdx = cols.indexOf('label_number')
    const qtyIdx = cols.indexOf('quantity')
    const statusIdx = cols.indexOf('status')
    expect(row[labelIdx]).toBe('YM20260623-001-0001')
    expect(row[qtyIdx]).toBe(5000)
    expect(row[statusIdx]).toBe('active')
  })

  it('按 seedling_id 过滤', () => {
    insertLabel({ label_number: 'YM-A-0001', seedling_id: 'SD-1', quantity: 10 })
    insertLabel({ label_number: 'YM-A-0002', seedling_id: 'SD-1', quantity: 20 })
    insertLabel({ label_number: 'YM-B-0001', seedling_id: 'SD-2', quantity: 30 })

    const rows = db.exec('SELECT COUNT(*) as cnt FROM plant_labels WHERE seedling_id = ?', ['SD-1'])
    expect(rows[0]?.values[0][0]).toBe(2)
  })

  it('更新 quantity 和 status', () => {
    const id = insertLabel({ label_number: 'YM-UPDATE', quantity: 100, status: 'active' })
    db.run('UPDATE plant_labels SET quantity = 50, status = ? WHERE id = ?', ['moved_out', id])
    const rows = db.exec('SELECT quantity, status FROM plant_labels WHERE id = ?', [id])
    expect(rows[0]?.values[0][0]).toBe(50)
    expect(rows[0]?.values[0][1]).toBe('moved_out')
  })

  it('删除标签同时删除关联履历', () => {
    const id = insertLabel({ label_number: 'YM-DELETE' })
    // 插入一条履历
    db.run(
      'INSERT INTO plant_label_resume (label_id, operation_type, operation_date) VALUES (?, ?, ?)',
      [id, 'move_in', '2026-06-23']
    )
    // 确认履历存在
    let rows = db.exec('SELECT COUNT(*) as cnt FROM plant_label_resume WHERE label_id = ?', [id])
    expect(rows[0]?.values[0][0]).toBe(1)
    // 删除标签和履历
    db.run('DELETE FROM plant_label_resume WHERE label_id = ?', [id])
    db.run('DELETE FROM plant_labels WHERE id = ?', [id])
    rows = db.exec('SELECT COUNT(*) as cnt FROM plant_labels WHERE id = ?', [id])
    expect(rows[0]?.values[0][0]).toBe(0)
    rows = db.exec('SELECT COUNT(*) as cnt FROM plant_label_resume WHERE label_id = ?', [id])
    expect(rows[0]?.values[0][0]).toBe(0)
  })
})

describe('批量创建（batch-create）', () => {
  it('批量 INSERT 多条标签，每标签带 quantity', () => {
    const labels = [
      { ln: 'BATCH-001', qty: 5000 },
      { ln: 'BATCH-002', qty: 3000 },
      { ln: 'BATCH-003', qty: 1 },
    ]
    const stmt = db.prepare(
      'INSERT INTO plant_labels (label_number, seedling_id, quantity, status) VALUES (?, ?, ?, ?)'
    )
    for (const l of labels) {
      stmt.run([l.ln, 'SD-BATCH', l.qty, 'active'])
    }
    stmt.free()

    const rows = db.exec('SELECT COUNT(*) as cnt FROM plant_labels WHERE seedling_id = ?', ['SD-BATCH'])
    expect(rows[0]?.values[0][0]).toBe(3)

    // 验证 quantity
    const all = db.exec('SELECT label_number, quantity FROM plant_labels WHERE seedling_id = ? ORDER BY id', ['SD-BATCH'])
    expect(all[0]?.values[0][0]).toBe('BATCH-001')
    expect(all[0]?.values[0][1]).toBe(5000)
    expect(all[0]?.values[1][1]).toBe(3000)
    expect(all[0]?.values[2][1]).toBe(1)
  })

  it('批量 INSERT 使用多行 VALUES 语法', () => {
    // 模拟 generateBatchLabels 的多行 INSERT
    const now = '2026-06-23 10:00:00'
    db.run(`
      INSERT INTO plant_labels (label_number, seedling_id, move_in_area_name, move_in_date, quantity, create_time)
      VALUES
        ('GEN-001', 'SD-GEN', '东区', '2026-06-23', 100, '${now}'),
        ('GEN-002', 'SD-GEN', '东区', '2026-06-23', 100, '${now}'),
        ('GEN-003', 'SD-GEN', '东区', '2026-06-23', 100, '${now}')
    `)
    const rows = db.exec('SELECT COUNT(*) as cnt FROM plant_labels WHERE seedling_id = ?', ['SD-GEN'])
    expect(rows[0]?.values[0][0]).toBe(3)
  })
})

describe('按编号扫码查询（by-number）', () => {
  it('根据 label_number 精确查询标签 + 履历', () => {
    const id = insertLabel({ label_number: 'SCAN-001', seedling_id: 'SD-SCAN', quantity: 50 })
    // 插入 3 条履历
    for (let i = 0; i < 3; i++) {
      db.run(
        'INSERT INTO plant_label_resume (label_id, operation_type, operation_date, to_area_name) VALUES (?, ?, ?, ?)',
        [id, 'move_in', `2026-06-${20 + i}`, `区域${i}`]
      )
    }

    // 查询标签
    const labelRows = db.exec('SELECT * FROM plant_labels WHERE label_number = ?', ['SCAN-001'])
    expect(labelRows[0]?.values.length).toBe(1)

    // 查询履历（最近 20 条）
    const resumeRows = db.exec(
      'SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC LIMIT 20',
      [id]
    )
    expect(resumeRows[0]?.values.length).toBe(3)
  })

  it('查询不存在的标签返回空', () => {
    const rows = db.exec('SELECT * FROM plant_labels WHERE label_number = ?', ['NONEXISTENT'])
    expect(rows.length).toBe(0)
  })
})

describe('分页查询', () => {
  it('LIMIT + OFFSET 分页正确', () => {
    // 插入 25 条记录
    for (let i = 0; i < 25; i++) {
      insertLabel({ label_number: `PAGE-${String(i + 1).padStart(3, '0')}`, seedling_id: 'SD-PAGE', quantity: 1 })
    }

    // 第 1 页：20 条
    let rows = db.exec('SELECT * FROM plant_labels WHERE seedling_id = ? ORDER BY id DESC LIMIT 20 OFFSET 0', ['SD-PAGE'])
    expect(rows[0]?.values.length).toBe(20)

    // 第 2 页：5 条
    rows = db.exec('SELECT * FROM plant_labels WHERE seedling_id = ? ORDER BY id DESC LIMIT 20 OFFSET 20', ['SD-PAGE'])
    expect(rows[0]?.values.length).toBe(5)

    // 第 3 页：0 条
    rows = db.exec('SELECT * FROM plant_labels WHERE seedling_id = ? ORDER BY id DESC LIMIT 20 OFFSET 40', ['SD-PAGE'])
    expect(rows.length).toBe(0)
  })
})
