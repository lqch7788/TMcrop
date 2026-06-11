/**
 * inventoryService 任务 8 测试
 *
 * 验证:
 * 1. inboundFromSource 4 种 businessType 路由都实现
 * 2. traceInventorySource 4 种路由
 * 3. 入参校验 (Zod)
 * 4. 不存在的 stockId 抛错
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockDb = {
  run: vi.fn(),
  prepare: vi.fn(),
  exec: vi.fn(),
}
const mockSaveDb = vi.fn()

vi.mock('../db', () => ({
  getDatabase: () => mockDb,
  saveDatabase: () => mockSaveDb(),
}))

import {
  inboundFromSource,
  traceInventorySource,
  InboundFromSourceInputSchema,
} from '../services/inventory.service'

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.run.mockImplementation(() => {})
  // 默认 prepare().get() 返回 null (不存在的 stockId 场景)
  mockDb.prepare.mockReturnValue({
    get: vi.fn(() => null),
    all: vi.fn(() => []),
    run: vi.fn(() => ({ changes: 0 })),
  })
})

describe('inboundFromSource 4 种 businessType 路由', () => {
  it('harvest (采收入库) 应写入 stockType=product', () => {
    const result = inboundFromSource({
      stockType: 'product',
      businessType: 'harvest',
      businessId: 'hrv-1',
      quantity: 100,
      unit: 'kg',
      warehouseId: 'wh-1',
    })
    expect(result.stockId).toBeDefined()
    const insertCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('INSERT INTO inventory_stock'))
    expect(insertCalls.length).toBe(1)
    // params = [stockId, stockType, businessId, businessType, quantity, unit, warehouseId]
    expect(insertCalls[0][1][1]).toBe('product') // stockType
    expect(insertCalls[0][1][3]).toBe('harvest') // businessType
  })

  it('circulation (回流后入库存) 应写入 stockType=residue', () => {
    const result = inboundFromSource({
      stockType: 'residue',
      businessType: 'circulation',
      businessId: 'circ-1',
      quantity: 30,
      unit: 'kg',
      warehouseId: 'wh-1',
    })
    expect(result.stockId).toBeDefined()
  })

  it('seedling (路由代码预留) 应可调用', () => {
    expect(() => inboundFromSource({
      stockType: 'seedling',
      businessType: 'seedling',
      businessId: 'sl-1',
      quantity: 50,
      unit: '株',
      warehouseId: 'wh-1',
    })).not.toThrow()
  })

  it('seed (路由代码预留) 应可调用', () => {
    expect(() => inboundFromSource({
      stockType: 'seed',
      businessType: 'seed',
      businessId: 'sd-1',
      quantity: 200,
      unit: 'g',
      warehouseId: 'wh-1',
    })).not.toThrow()
  })
})

describe('InboundFromSourceInputSchema 校验', () => {
  it('quantity 必须 > 0', () => {
    expect(() => InboundFromSourceInputSchema.parse({
      stockType: 'product', businessType: 'harvest', businessId: 'a', quantity: 0, unit: 'kg', warehouseId: 'wh',
    })).toThrow()
  })
  it('缺 warehouseId 应失败', () => {
    expect(() => InboundFromSourceInputSchema.parse({
      stockType: 'product', businessType: 'harvest', businessId: 'a', quantity: 10, unit: 'kg',
    })).toThrow()
  })
})

describe('traceInventorySource 4 种路由', () => {
  it('harvest → /farm/harvest/{id}', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ id: 'stk-1', business_type: 'harvest', business_id: 'hrv-1' })),
      all: vi.fn(() => []),
      run: vi.fn(() => ({ changes: 0 })),
    })
    const result = traceInventorySource('stk-1')
    expect(result.detailUrl).toBe('/farm/harvest/hrv-1')
  })

  it('circulation → /farm/circulation/{id}', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ id: 'stk-2', business_type: 'circulation', business_id: 'circ-1' })),
      all: vi.fn(() => []),
      run: vi.fn(() => ({ changes: 0 })),
    })
    const result = traceInventorySource('stk-2')
    expect(result.detailUrl).toBe('/farm/circulation/circ-1')
  })

  it('seedling → /farm/seedling/{id} (路由代码预留)', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ id: 'stk-3', business_type: 'seedling', business_id: 'sl-1' })),
      all: vi.fn(() => []),
      run: vi.fn(() => ({ changes: 0 })),
    })
    const result = traceInventorySource('stk-3')
    expect(result.detailUrl).toBe('/farm/seedling/sl-1')
  })

  it('seed → /farm/seed-source/{id} (路由代码预留)', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ id: 'stk-4', business_type: 'seed', business_id: 'sd-1' })),
      all: vi.fn(() => []),
      run: vi.fn(() => ({ changes: 0 })),
    })
    const result = traceInventorySource('stk-4')
    expect(result.detailUrl).toBe('/farm/seed-source/sd-1')
  })

  it('不存在的 stockId 应抛错', () => {
    expect(() => traceInventorySource('unknown')).toThrow('不存在')
  })
})
