/**
 * InventoryInboundInput / InventoryInboundRecord 字段扩展的类型测试
 * 2026-07-08 任务 T1：扩展前端类型定义（6 种入库来源专属字段 + returnedQuantity/recordType）
 *
 * 这是一个纯静态类型测试 —— 它只验证"类型能编译通过 + 字段可赋值"。
 * 任务描述要求写一个轻量测试，确保新增字段没遗漏。
 */

import { describe, it, expect } from 'vitest'
import type {
  InventoryInboundInput,
  InventoryInboundRecord,
} from '../types/inventoryInbound'

describe('InventoryInboundInput 新增字段', () => {
  it('外购入库应能赋 supplierPhone', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'external_purchased',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      supplierPhone: '13800000000',
    }
    expect(input.supplierPhone).toBe('13800000000')
  })

  it('赠送应能赋 giftFrom', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'gift',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      giftFrom: '张三赠送',
    }
    expect(input.giftFrom).toBe('张三赠送')
  })

  it('委托应能赋 consignor', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'commissioned',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      consignor: 'A 公司',
    }
    expect(input.consignor).toBe('A 公司')
  })

  it('调拨应能赋 sourceWarehouseName', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'transfer',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      sourceWarehouseName: '上海仓',
    }
    expect(input.sourceWarehouseName).toBe('上海仓')
  })

  it('手动录入应能赋 stocktakeNo', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'manual',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      stocktakeNo: 'PD-2026-001',
    }
    expect(input.stocktakeNo).toBe('PD-2026-001')
  })

  it('自产应能赋 baseId/baseName', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'self_produced',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      baseId: 'b1',
      baseName: '北京基地',
    }
    expect(input.baseId).toBe('b1')
    expect(input.baseName).toBe('北京基地')
  })

  it('通用字段 warehouseName/cropId/cropCode/cropName/varietyName 应可赋', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'self_produced',
      warehouseId: 'w1',
      warehouseName: '一号仓',
      cropId: 'c1',
      cropCode: 'GRAPE',
      cropName: '葡萄',
      varietyName: '巨峰',
      quantity: 10,
      unit: '克',
    }
    expect(input.warehouseName).toBe('一号仓')
    expect(input.cropName).toBe('葡萄')
    expect(input.varietyName).toBe('巨峰')
  })

  it('向后兼容：所有新字段均为可选，最小入参仍合法', () => {
    const input: InventoryInboundInput = {
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'self_produced',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
    }
    expect(input.supplierPhone).toBeUndefined()
    expect(input.giftFrom).toBeUndefined()
    expect(input.consignor).toBeUndefined()
    expect(input.sourceWarehouseName).toBeUndefined()
    expect(input.stocktakeNo).toBeUndefined()
    expect(input.baseId).toBeUndefined()
    expect(input.baseName).toBeUndefined()
  })
})

describe('InventoryInboundRecord 新增字段', () => {
  it('入库记录应能包含 returnedQuantity', () => {
    const rec: InventoryInboundRecord = {
      id: 'rec1',
      recordDate: '2026-07-08',
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'self_produced',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      returnedQuantity: 2,
    }
    expect(rec.returnedQuantity).toBe(2)
  })

  it('入库记录应能包含 recordType', () => {
    const rec: InventoryInboundRecord = {
      id: 'rec1',
      recordDate: '2026-07-08',
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'self_produced',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
      recordType: 'inbound',
    }
    expect(rec.recordType).toBe('inbound')
  })

  it('向后兼容：所有新字段均为可选，最小记录仍合法', () => {
    const rec: InventoryInboundRecord = {
      id: 'rec1',
      recordDate: '2026-07-08',
      sourceModule: 'manual',
      sourceId: 's1',
      stockType: 'product',
      sourceType: 'self_produced',
      warehouseId: 'w1',
      quantity: 10,
      unit: '克',
    }
    expect(rec.recordType).toBeUndefined()
    expect(rec.returnedQuantity).toBeUndefined()
  })
})