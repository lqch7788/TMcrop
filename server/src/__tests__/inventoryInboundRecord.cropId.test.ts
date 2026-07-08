/**
 * inventoryInboundRecord INSERT crop_id 测试
 * 2026-07-08 任务 T8：后端 /inbound-record INSERT 加 crop_id 列
 *
 * 测试范围：
 * 1. POST /inbound-record 路由的 InboundSchema 接受 cropId 入参
 * 2. POST /inbound-record 路由的 INSERT INTO inventory_inbound_records SQL 包含 crop_id 列
 * 3. INSERT 的 values 占位符数与 params 数量一致（避免 SQL 错位）
 * 4. inventory_inbound_records 表 schema 含 crop_id 列（已存在则不动）
 *
 * 策略：源码审计式测试（grep + 正则）+ schema 验证。
 * 这样不依赖启动 server / mock db，验证快速可靠。
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROUTES_PATH = path.resolve(__dirname, '../routes/inventory.ts')
const SCHEMA_PATH = path.resolve(__dirname, '../db/fixMissingSchema.ts')

describe('T8: POST /inbound-record INSERT 加 crop_id 列', () => {
  const src = fs.readFileSync(ROUTES_PATH, 'utf-8')
  const schemaSrc = fs.readFileSync(SCHEMA_PATH, 'utf-8')

  /**
   * 截取 POST /inbound-record 路由体内第一个 INSERT INTO inventory_inbound_records 块。
   * 用 db.run(`...` 的起始 `db.run(\`` 到对应 INSERT 块结束的 `)` 抓取。
   * 这里简化：用第一个 "INSERT INTO inventory_inbound_records" 起始到下个 "saveDatabase()" 之间。
   */
  function extractInboundInsertBlock(source: string): string {
    const start = source.indexOf('INSERT INTO inventory_inbound_records')
    if (start === -1) return ''
    // 找 VALUES (...) 后的闭合括号
    const afterValuesStart = source.indexOf('VALUES', start)
    const closing = source.indexOf(')', afterValuesStart)
    return source.slice(start, closing + 1)
  }

  it('1. inventory_inbound_records 表 schema 含 crop_id 列', () => {
    // fixMissingSchema.ts: CREATE TABLE IF NOT EXISTS inventory_inbound_records ...
    expect(schemaSrc).toMatch(
      /CREATE TABLE IF NOT EXISTS inventory_inbound_records[\s\S]*?crop_id\s+TEXT/i,
    )
  })

  it('2. InboundSchema 接受 cropId 入参（z.string().optional()）', () => {
    // 在 routes/inventory.ts 中，InboundSchema 定义中包含 cropId 字段
    // 找 InboundSchema 块
    const schemaStart = src.indexOf('const InboundSchema')
    expect(schemaStart).toBeGreaterThan(0)
    // 找 InboundSchema 块结束 — 找 router.post('/inbound-record' 之前
    const schemaEnd = src.indexOf("router.post('/inbound-record'", schemaStart)
    const schemaBlock = src.slice(schemaStart, schemaEnd)
    expect(schemaBlock).toMatch(/cropId:\s*z\.string\(\)\.optional\(\)/)
  })

  it('3. INSERT INTO inventory_inbound_records SQL 包含 crop_id 列', () => {
    const insertBlock = extractInboundInsertBlock(src)
    expect(insertBlock.length).toBeGreaterThan(0)
    // SQL 列名中应包含 crop_id
    expect(insertBlock).toMatch(/\bcrop_id\b/i)
  })

  it('4. INSERT 的占位符数与 params 数量一致（防止 SQL 错位）', () => {
    // 抓 INSERT INTO inventory_inbound_records 块的 db.run 调用
    // 用 SQL 字符串中 INSERT 的位置 + VALUES 段的精确边界
    const insertStart = src.indexOf('INSERT INTO inventory_inbound_records')
    expect(insertStart).toBeGreaterThan(0)

    // 提取 db.run(` ... `, [ ... ]) 整体
    // 找 db.run(\`` 开始
    const dbRunStart = src.lastIndexOf('db.run(`', insertStart)
    expect(dbRunStart).toBeGreaterThan(0)
    // 找 SQL 字符串结束（`）
    const sqlEnd = src.indexOf('`, [', dbRunStart)
    expect(sqlEnd).toBeGreaterThan(0)

    // SQL 占位符数：VALUES 子句中的 ? 数量
    const sqlBlock = src.slice(dbRunStart, sqlEnd)
    const valuesStart = sqlBlock.indexOf('VALUES')
    const valuesParenStart = sqlBlock.indexOf('(', valuesStart)
    const valuesParenEnd = sqlBlock.indexOf(')', valuesParenStart)
    const valuesClause = sqlBlock.slice(valuesParenStart + 1, valuesParenEnd)
    const placeholderCount = (valuesClause.match(/\?/g) || []).length

    // params 数组：从 sqlEnd 后的 '[' 到对应闭合 ']'
    const paramsStart = sqlEnd + '`, ['.length - 1 // 指向 [
    // 找 params 数组结束（],)  紧跟闭合
    // 用深度匹配
    let depth = 0
    let paramsEnd = -1
    for (let i = paramsStart; i < src.length; i++) {
      if (src[i] === '[') depth++
      else if (src[i] === ']') {
        depth--
        if (depth === 0) {
          paramsEnd = i
          break
        }
      }
    }
    expect(paramsEnd).toBeGreaterThan(paramsStart)
    const paramsBlock = src.slice(paramsStart + 1, paramsEnd)

    // params 元素数：数顶层逗号数 + 1（顶层逗号 = 不在 ( ) [ ] { } ' ' " " 内的，跳过 // 单行注释）
    // 先去掉 // 单行注释
    const cleanedParams = paramsBlock.replace(/\/\/[^\n]*/g, '')
    let paramCount = 0
    depth = 0
    let inSingleQuote = false
    let inDoubleQuote = false
    let prevWasEscape = false
    let elementStart = 0
    const elements: string[] = []
    for (let i = 0; i < cleanedParams.length; i++) {
      const c = cleanedParams[i]
      if (prevWasEscape) { prevWasEscape = false; continue }
      if (c === '\\') { prevWasEscape = true; continue }
      if (c === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote
      else if (c === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote
      else if (!inSingleQuote && !inDoubleQuote) {
        if (c === '(' || c === '[' || c === '{') depth++
        else if (c === ')' || c === ']' || c === '}') depth--
        else if (c === ',' && depth === 0) {
          elements.push(cleanedParams.slice(elementStart, i).trim())
          elementStart = i + 1
        }
      }
    }
    const lastElement = cleanedParams.slice(elementStart).trim()
    // 忽略末尾空字符串（trailing comma 产生的）
    if (lastElement) {
      elements.push(lastElement)
    }
    paramCount = elements.length

    expect(placeholderCount).toBe(paramCount)
  })

  it('5. fetchSourceRow 返回 source.cropId（育苗源记录有 crop_id 列）', () => {
    // 验证 fetchSourceRow 函数正确返回 cropId（用于后面 params 注入）
    // 抓 fetchSourceRow 函数体到 '}' 第一个匹配结束
    const funcStart = src.indexOf('function fetchSourceRow')
    expect(funcStart).toBeGreaterThan(0)
    // 找函数结束 — 用 '} | null {' 模式的反向锚点
    // 简化：抓 'return {' 后到 '}'
    const returnStart = src.indexOf('return {', funcStart)
    expect(returnStart).toBeGreaterThan(0)
    const returnBlockStart = returnStart
    // 找对应 '}' （考虑嵌套）
    let depth = 0
    let returnEnd = -1
    for (let i = returnBlockStart; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') {
        depth--
        if (depth === 0) {
          returnEnd = i
          break
        }
      }
    }
    const returnBlock = src.slice(returnBlockStart, returnEnd + 1)
    expect(returnBlock).toMatch(/cropId:\s*row\.crop_id/)
  })

  it('6. /inbound-record 路由 INSERT params 包含 crop_id 占位符对应的 source.cropId 或 input.cropId 表达式', () => {
    // 找 POST /inbound-record 路由体的 params 数组
    const routeStart = src.indexOf("router.post('/inbound-record'")
    expect(routeStart).toBeGreaterThan(0)
    // 找 'inventory_inbound_records' 后的 INSERT 块
    const insertStart = src.indexOf('INSERT INTO inventory_inbound_records', routeStart)
    expect(insertStart).toBeGreaterThan(0)
    // 找 params 数组结束 - '])\n    }'  紧跟在 INSERT 块后
    // 简化：抓 INSERT 块后到 '\n    )\n    // 4.' （即 "// 4. 补仓库名" 注释）之间
    const sectionEnd = src.indexOf('// 4.', insertStart)
    expect(sectionEnd).toBeGreaterThan(0)
    const section = src.slice(insertStart, sectionEnd)
    // crop_id 占位符对应的表达式应是 source.cropId 或 input.cropId
    // 用宽松匹配：找含 cropId 的行
    expect(section).toMatch(/source\.cropId\s*\|\|\s*input\.cropId\s*\|\|\s*null/)
  })
})