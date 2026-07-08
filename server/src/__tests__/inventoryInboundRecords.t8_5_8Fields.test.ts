/**
 * T8.5 测试：inventory_inbound_records 表 + 2 个 INSERT 补 9 列
 *
 * 2026-07-08 T8.5：作物库存入库弹窗重设计
 *
 * 背景：
 * T2 设计的 6 套字段矩阵用了 8 个新字段（前端类型已扩展，后端表 inventory_inbound_records 无这些列）。
 * T8.5 把后端 schema 同步起来，让 8 字段能真的入库（实际是 9 个 DB 列，因为 baseId/baseName 是 2 个独立字段）。
 *
 * 字段清单：
 * | # | 字段（前端 camelCase） | DB 列（snake_case）       | 来源            |
 * |---|------------------------|---------------------------|-----------------|
 * | 1 | supplierPhone          | supplier_phone            | external_purchased |
 * | 2 | giftFrom               | gift_from                 | gift            |
 * | 3 | consignor              | consignor                 | commissioned    |
 * | 4 | sourceWarehouseName    | source_warehouse_name     | transfer        |
 * | 5 | stocktakeNo            | stocktake_no              | manual          |
 * | 6 | baseId                 | base_id                   | self_produced   |
 * | 7 | baseName               | base_name                 | self_produced   |
 * | 8 | plantingMode           | planting_mode             | self_produced   |
 * | 9 | greenhouseName         | greenhouse_name           | self_produced   |
 *
 * 测试策略：源码审计（grep + 正则）+ Zod 真实解析 + ALTER TABLE 存在性验证
 * 这样不依赖启动 server / mock db，验证快速可靠。
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { ProductSchema, InboundFromSourceSchema } from '../routes/inventoryInboundFromSource'

const SCHEMA_PATH = path.resolve(__dirname, '../db/fixMissingSchema.ts')
const ROUTES_INVENTORY_PATH = path.resolve(__dirname, '../routes/inventory.ts')
const ROUTES_INBOUND_FROM_SOURCE_PATH = path.resolve(__dirname, '../routes/inventoryInboundFromSource.ts')
const SERVICE_INBOUND_FROM_SOURCE_PATH = path.resolve(__dirname, '../services/inventoryInboundFromSource.service.ts')

describe('T8.5：inventory_inbound_records 补 9 列 + 2 个 INSERT 同步', () => {
  const schemaSrc = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  const routesInventorySrc = fs.readFileSync(ROUTES_INVENTORY_PATH, 'utf-8')
  const routesInboundSrc = fs.readFileSync(ROUTES_INBOUND_FROM_SOURCE_PATH, 'utf-8')
  const serviceInboundSrc = fs.readFileSync(SERVICE_INBOUND_FROM_SOURCE_PATH, 'utf-8')

  // ============================================================
  // 1. fixMissingSchema.ts 必须补 9 列（CREATE TABLE + ALTER TABLE）
  // ============================================================
  describe('1. fixMissingSchema.ts 9 列 schema 同步', () => {
    it('CREATE TABLE 包含 9 个新列（snake_case）', () => {
      // CREATE TABLE IF NOT EXISTS inventory_inbound_records (...) 块
      const createMatch = schemaSrc.match(
        /CREATE TABLE IF NOT EXISTS inventory_inbound_records\s*\(([\s\S]*?)\)/i
      )
      expect(createMatch).not.toBeNull()
      const createBlock = createMatch![1]
      expect(createBlock).toMatch(/supplier_phone\s+TEXT/i)
      expect(createBlock).toMatch(/gift_from\s+TEXT/i)
      expect(createBlock).toMatch(/consignor\s+TEXT/i)
      expect(createBlock).toMatch(/source_warehouse_name\s+TEXT/i)
      expect(createBlock).toMatch(/stocktake_no\s+TEXT/i)
      expect(createBlock).toMatch(/base_id\s+TEXT/i)
      expect(createBlock).toMatch(/base_name\s+TEXT/i)
      expect(createBlock).toMatch(/planting_mode\s+TEXT/i)
      expect(createBlock).toMatch(/greenhouse_name\s+TEXT/i)
    })

    it('包含 9 条 ALTER TABLE ADD COLUMN 语句（已存在 DB 的兜底迁移）', () => {
      // 每个 ALTER TABLE ADD COLUMN 必须在 inventory_inbound_records 表上
      const expectedColumns = [
        'supplier_phone',
        'gift_from',
        'consignor',
        'source_warehouse_name',
        'stocktake_no',
        'base_id',
        'base_name',
        'planting_mode',
        'greenhouse_name',
      ]
      for (const col of expectedColumns) {
        const re = new RegExp(
          `ALTER TABLE inventory_inbound_records\\s+ADD COLUMN\\s+${col}\\s+TEXT`,
          'i'
        )
        expect(schemaSrc).toMatch(re)
      }
    })

    it('ALTER TABLE 包裹在 try { ... } catch (e: any) { /* duplicate column */ } 中（防 duplicate column 错误）', () => {
      // 9 条 ALTER TABLE 都应该有 try/catch 包裹
      const tryCatchBlock = schemaSrc.match(
        /try\s*{\s*db\.run\('ALTER TABLE inventory_inbound_records ADD COLUMN supplier_phone TEXT'\)\s*;?\s*}\s*catch[\s\S]*?ALTER TABLE inventory_inbound_records ADD COLUMN greenhouse_name[\s\S]*?duplicate column/i
      )
      expect(tryCatchBlock).not.toBeNull()
    })
  })

  // ============================================================
  // 2. routes/inventory.ts InboundSchema 补 8 字段 + INSERT 补 9 列
  // ============================================================
  describe('2. routes/inventory.ts InboundSchema + INSERT 同步', () => {
    it('InboundSchema 含 8 个新字段（camelCase）', () => {
      // InboundSchema 在 routes/inventory.ts 中
      const schemaStart = routesInventorySrc.indexOf('const InboundSchema')
      expect(schemaStart).toBeGreaterThan(0)
      // 找到对应的 }) 结束位置
      let depth = 0, schemaEnd = -1
      for (let i = schemaStart; i < routesInventorySrc.length; i++) {
        if (routesInventorySrc[i] === '{') depth++
        else if (routesInventorySrc[i] === '}') {
          depth--
          if (depth === 0) { schemaEnd = i; break }
        }
      }
      expect(schemaEnd).toBeGreaterThan(schemaStart)
      const schemaBlock = routesInventorySrc.slice(schemaStart, schemaEnd)
      expect(schemaBlock).toMatch(/supplierPhone:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/giftFrom:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/consignor:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/sourceWarehouseName:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/stocktakeNo:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/baseId:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/baseName:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/plantingMode:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/greenhouseName:\s*z\.string\(\)\.optional\(\)/)
    })

    it('POST /inbound-record 的 INSERT 含 9 个新列（snake_case）', () => {
      // /inbound-record 路由的 INSERT 块
      // 2026-07-08 P0：路由加了 sourceId 必填豁免逻辑（约 100 字符），窗口 5000→6000
      const inboundRouteIdx = routesInventorySrc.indexOf("router.post('/inbound-record'")
      expect(inboundRouteIdx).toBeGreaterThan(0)
      // 在这个路由范围内找第一个 INSERT INTO inventory_inbound_records
      const routeBlock = routesInventorySrc.slice(inboundRouteIdx, inboundRouteIdx + 6000)
      const insertStart = routeBlock.indexOf('INSERT INTO inventory_inbound_records')
      expect(insertStart).toBeGreaterThan(0)
      const insertBlock = routeBlock.slice(insertStart, insertStart + 3000)
      // 找到 VALUES 后的闭合括号
      const valuesStart = insertBlock.indexOf('VALUES')
      const closing = insertBlock.indexOf(')', valuesStart)
      const columnBlock = insertBlock.slice(0, valuesStart)
      expect(columnBlock).toMatch(/supplier_phone/)
      expect(columnBlock).toMatch(/gift_from/)
      expect(columnBlock).toMatch(/consignor/)
      expect(columnBlock).toMatch(/source_warehouse_name/)
      expect(columnBlock).toMatch(/stocktake_no/)
      expect(columnBlock).toMatch(/base_id/)
      expect(columnBlock).toMatch(/base_name/)
      expect(columnBlock).toMatch(/planting_mode/)
      expect(columnBlock).toMatch(/greenhouse_name/)
    })

    it('POST /inbound-record 的 INSERT 占位符数 = 列数（含 1 个 inbound literal）', () => {
      const inboundRouteIdx = routesInventorySrc.indexOf("router.post('/inbound-record'")
      expect(inboundRouteIdx).toBeGreaterThan(0)
      const routeBlock = routesInventorySrc.slice(inboundRouteIdx, inboundRouteIdx + 6000)
      const insertStart = routeBlock.indexOf('INSERT INTO inventory_inbound_records')
      const insertBlock = routeBlock.slice(insertStart, insertStart + 3000)
      // 列
      const columnListMatch = insertBlock.match(/\(([\s\S]*?)\)\s*VALUES/)
      const columns = columnListMatch![1].split(',').map(s => s.trim()).filter(s => s)
      // VALUES 占位符 + literal
      const valuesMatch = insertBlock.match(/VALUES\s*\(([\s\S]*?)\)/)
      const phCount = (valuesMatch![1].match(/\?/g) || []).length
      const literalCount = (valuesMatch![1].match(/'inbound'/g) || []).length
      expect(columns.length).toBe(phCount + literalCount)
    })
  })

  // ============================================================
  // 3. routes/inventoryInboundFromSource.ts Zod 补字段
  // ============================================================
  describe('3. routes/inventoryInboundFromSource.ts Zod 同步', () => {
    it('InboundFromSourceSchema 顶级含 5 个新字段（camelCase）', () => {
      const schemaStart = routesInboundSrc.indexOf('const InboundFromSourceSchema')
      expect(schemaStart).toBeGreaterThan(0)
      let depth = 0, schemaEnd = -1
      for (let i = schemaStart; i < routesInboundSrc.length; i++) {
        if (routesInboundSrc[i] === '{') depth++
        else if (routesInboundSrc[i] === '}') {
          depth--
          if (depth === 0) { schemaEnd = i; break }
        }
      }
      expect(schemaEnd).toBeGreaterThan(schemaStart)
      const schemaBlock = routesInboundSrc.slice(schemaStart, schemaEnd)
      expect(schemaBlock).toMatch(/consignor:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/sourceWarehouseName:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/stocktakeNo:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/plantingMode:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/greenhouseName:\s*z\.string\(\)\.optional\(\)/)
    })

    it('ProductSchema 子对象含 4 个新字段（camelCase）', () => {
      const schemaStart = routesInboundSrc.indexOf('const ProductSchema')
      expect(schemaStart).toBeGreaterThan(0)
      let depth = 0, schemaEnd = -1
      for (let i = schemaStart; i < routesInboundSrc.length; i++) {
        if (routesInboundSrc[i] === '{') depth++
        else if (routesInboundSrc[i] === '}') {
          depth--
          if (depth === 0) { schemaEnd = i; break }
        }
      }
      expect(schemaEnd).toBeGreaterThan(schemaStart)
      const schemaBlock = routesInboundSrc.slice(schemaStart, schemaEnd)
      expect(schemaBlock).toMatch(/supplierPhone:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/giftFrom:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/baseId:\s*z\.string\(\)\.optional\(\)/)
      expect(schemaBlock).toMatch(/baseName:\s*z\.string\(\)\.optional\(\)/)
    })

    it('ProductSchema 接受 supplierPhone/giftFrom/baseId/baseName 入参（真实 Zod 解析）', () => {
      const result = ProductSchema.safeParse({
        cropName: '葡萄',
        harvestQuantity: 10,
        unit: 'kg',
        supplierPhone: '13900000000',
        giftFrom: '张三',
        baseId: 'b_001',
        baseName: '测试基地',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.supplierPhone).toBe('13900000000')
        expect(result.data.giftFrom).toBe('张三')
        expect(result.data.baseId).toBe('b_001')
        expect(result.data.baseName).toBe('测试基地')
      }
    })

    it('InboundFromSourceSchema 顶级接受 consignor/sourceWarehouseName/stocktakeNo/plantingMode/greenhouseName（真实 Zod 解析）', () => {
      const result = InboundFromSourceSchema.safeParse({
        stockType: 'product',
        sourceModule: 'planting',
        sourceRecordId: 'pi_001',
        sourceRecordCode: 'PI20260708001',
        harvestDate: '2026-07-08',
        unit: 'kg',
        warehouseId: 'wh_001',
        products: [{ cropName: '葡萄', harvestQuantity: 10, unit: 'kg' }],
        consignor: '李四',
        sourceWarehouseName: '源仓 A',
        stocktakeNo: 'PD20260708001',
        plantingMode: '盆栽',
        greenhouseName: '温室 B',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.consignor).toBe('李四')
        expect(result.data.sourceWarehouseName).toBe('源仓 A')
        expect(result.data.stocktakeNo).toBe('PD20260708001')
        expect(result.data.plantingMode).toBe('盆栽')
        expect(result.data.greenhouseName).toBe('温室 B')
      }
    })
  })

  // ============================================================
  // 4. service INSERT 补 9 列
  // ============================================================
  describe('4. services/inventoryInboundFromSource.service.ts INSERT 同步', () => {
    it('executeInboundFromSource INSERT 含 9 个新列（snake_case）', () => {
      const insertStart = serviceInboundSrc.indexOf('INSERT INTO inventory_inbound_records')
      expect(insertStart).toBeGreaterThan(0)
      const insertBlock = serviceInboundSrc.slice(insertStart, insertStart + 2500)
      const valuesStart = insertBlock.indexOf('VALUES')
      const columnBlock = insertBlock.slice(0, valuesStart)
      expect(columnBlock).toMatch(/supplier_phone/)
      expect(columnBlock).toMatch(/gift_from/)
      expect(columnBlock).toMatch(/consignor/)
      expect(columnBlock).toMatch(/source_warehouse_name/)
      expect(columnBlock).toMatch(/stocktake_no/)
      expect(columnBlock).toMatch(/base_id/)
      expect(columnBlock).toMatch(/base_name/)
      expect(columnBlock).toMatch(/planting_mode/)
      expect(columnBlock).toMatch(/greenhouse_name/)
    })

    it('executeInboundFromSource INSERT 占位符数 = 列数（无 literal，全部 ?）', () => {
      const insertStart = serviceInboundSrc.indexOf('INSERT INTO inventory_inbound_records')
      const insertBlock = serviceInboundSrc.slice(insertStart, insertStart + 2500)
      const columnListMatch = insertBlock.match(/\(([\s\S]*?)\)\s*VALUES/)
      const columns = columnListMatch![1].split(',').map(s => s.trim()).filter(s => s)
      const valuesMatch = insertBlock.match(/VALUES\s*\(([\s\S]*?)\)/)
      const phCount = (valuesMatch![1].match(/\?/g) || []).length
      expect(columns.length).toBe(phCount)
    })

    it('InboundFromSourceInput 类型含 5 个顶级新字段', () => {
      const inputTypeStart = serviceInboundSrc.indexOf('export interface InboundFromSourceInput')
      expect(inputTypeStart).toBeGreaterThan(0)
      let depth = 0, typeEnd = -1
      for (let i = inputTypeStart; i < serviceInboundSrc.length; i++) {
        if (serviceInboundSrc[i] === '{') depth++
        else if (serviceInboundSrc[i] === '}') {
          depth--
          if (depth === 0) { typeEnd = i; break }
        }
      }
      expect(typeEnd).toBeGreaterThan(inputTypeStart)
      const typeBlock = serviceInboundSrc.slice(inputTypeStart, typeEnd)
      expect(typeBlock).toMatch(/consignor\?:\s*string/)
      expect(typeBlock).toMatch(/sourceWarehouseName\?:\s*string/)
      expect(typeBlock).toMatch(/stocktakeNo\?:\s*string/)
      expect(typeBlock).toMatch(/plantingMode\?:\s*string/)
      expect(typeBlock).toMatch(/greenhouseName\?:\s*string/)
    })

    it('InboundProduct 类型含 4 个新字段', () => {
      const productTypeStart = serviceInboundSrc.indexOf('export interface InboundProduct')
      expect(productTypeStart).toBeGreaterThan(0)
      let depth = 0, typeEnd = -1
      for (let i = productTypeStart; i < serviceInboundSrc.length; i++) {
        if (serviceInboundSrc[i] === '{') depth++
        else if (serviceInboundSrc[i] === '}') {
          depth--
          if (depth === 0) { typeEnd = i; break }
        }
      }
      expect(typeEnd).toBeGreaterThan(productTypeStart)
      const typeBlock = serviceInboundSrc.slice(productTypeStart, typeEnd)
      expect(typeBlock).toMatch(/supplierPhone\?:\s*string/)
      expect(typeBlock).toMatch(/giftFrom\?:\s*string/)
      expect(typeBlock).toMatch(/baseId\?:\s*string/)
      expect(typeBlock).toMatch(/baseName\?:\s*string/)
    })
  })
})
