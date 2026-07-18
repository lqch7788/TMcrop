/**
 * circulationService 单元测试
 * 任务 7: Phase 2 业务逻辑
 *
 * 验证:
 * 1. PROPAGATION 建新种源 + 写 circulation 记录
 * 2. QUANTITY 回种源: 原种源 availableCount += quantity
 * 3. QUANTITY 入库存: 写 inventory_stock (disposition='SALES')
 * 4. DISPOSAL: 只写记录, 不动种源
 * 5. destination=inventory_stock 校验 (warehouseId 必填, quantity>0)
 * 6. PROPAGATION + destination=inventory_stock 抛错
 * 7. revokeCirculation: 软删除 + 数量回退
 * 8. PROPAGATION source_origin 派生
 * 9. listCirculations 查询
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 用 mock 模拟 db (与项目 schema.test.ts 风格一致)
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

vi.mock('../utils/dateUtil', () => ({
  formatLocalDateISO: () => '2026-06-11',
}))

import {
  executeCirculation,
  revokeCirculation,
  listCirculations,
  CirculationInputSchema,
} from '../services/circulation.service'

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.run.mockImplementation(() => {})
  mockDb.prepare.mockReturnValue({
    get: vi.fn(() => null),
    all: vi.fn(() => []),
    run: vi.fn(() => ({ changes: 0 })),
    bind: vi.fn(),
    step: vi.fn(() => false),
    getAsObject: vi.fn(() => ({})),
    free: vi.fn(),
  })
})

describe('executeCirculation PROPAGATION', () => {
  it('应建新种源 + 写 circulation 记录 + 返回 newSourceId', async () => {
    const result = await executeCirculation({
      circulationType: 'PROPAGATION',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      subType: 'seed_saving',
      unit: 'g',
    })
    expect(result.circulationId).toBeDefined()
    expect(result.newSourceId).toBeDefined()
    expect(result.stockId).toBeUndefined()

    // 验证: 至少 2 次 db.run (INSERT seed_sources + INSERT crop_circulation_records)
    expect(mockDb.run).toHaveBeenCalled()
    const insertCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('INSERT INTO seed_sources'))
    expect(insertCalls.length).toBe(1)
    const circInsertCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('INSERT INTO crop_circulation_records'))
    expect(circInsertCalls.length).toBe(1)
  })

  it('PROPAGATION + destination=inventory_stock 应抛错', () => {
    expect(() => executeCirculation({
      circulationType: 'PROPAGATION',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      subType: 'seed_saving',
      destination: 'inventory_stock',
    })).toThrow('只能 destination=seed_source')
  })

  it('PROPAGATION + subType=cutting 应派生 source_origin=cutting', async () => {
    await executeCirculation({
      circulationType: 'PROPAGATION',
      sourceModule: 'planting',
      sourceId: 'pl-1',
      parentSourceId: 'ss-parent',
      subType: 'cutting',
    })
    const insertCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('INSERT INTO seed_sources'))
    // db.run(SQL, paramsArray): SQL is c[0], params is c[1]
    // params = [newSourceId, sourceCode, sourceOrigin, parentSourceId]
    // source_origin is params[2]
    expect(insertCalls[0][1][2]).toBe('cutting')
  })
})

describe('executeCirculation QUANTITY', () => {
  it('回种源: 应 UPDATE seed_sources.availableCount', async () => {
    const result = await executeCirculation({
      circulationType: 'QUANTITY',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      quantity: 50,
      unit: 'g',
    })
    expect(result.circulationId).toBeDefined()
    expect(result.stockId).toBeUndefined()

    const updateCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('UPDATE seed_sources'))
    expect(updateCalls.length).toBe(1)
    // db.run(SQL, [quantity, parentSourceId]): quantity is params[0]
    expect(updateCalls[0][1][0]).toBe(50)
  })

  it('入库存: 应 INSERT inventory_stock (disposition=SALES)', async () => {
    const result = await executeCirculation({
      circulationType: 'QUANTITY',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      destination: 'inventory_stock',
      warehouseId: 'wh-1',
      quantity: 30,
      unit: 'kg',
    })
    expect(result.stockId).toBeDefined()

    const invInsertCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('INSERT INTO inventory_stock'))
    expect(invInsertCalls.length).toBe(1)
    // db.run(SQL, [stockId, circId, quantity, unit, warehouseId]): stock_type='residue' 是 SQL 里的字面量
    // business_id=cricId params[1], business_type='circulation' 是 SQL 字面量
    expect(invInsertCalls[0][1][1]).toBeDefined() // circId
  })

  it('入库存无 warehouseId 应抛错', () => {
    expect(() => executeCirculation({
      circulationType: 'QUANTITY',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      destination: 'inventory_stock',
      quantity: 30,
    })).toThrow('warehouseId')
  })

  it('入库存无 quantity 应抛错', () => {
    expect(() => executeCirculation({
      circulationType: 'QUANTITY',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      destination: 'inventory_stock',
      warehouseId: 'wh-1',
    })).toThrow('quantity')
  })
})

describe('executeCirculation DISPOSAL', () => {
  it('应只写 circulation 记录, 不动种源/库存', async () => {
    const result = await executeCirculation({
      circulationType: 'DISPOSAL',
      sourceModule: 'harvest',
      sourceId: 'hrv-1',
      parentSourceId: 'ss-parent',
      quantity: 20,
      unit: 'g',
    })
    expect(result.circulationId).toBeDefined()
    expect(result.newSourceId).toBeUndefined()
    expect(result.stockId).toBeUndefined()

    // 不应有 UPDATE seed_sources 或 INSERT inventory_stock
    const updateCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('UPDATE seed_sources'))
    expect(updateCalls.length).toBe(0)
    const invInsertCalls = mockDb.run.mock.calls.filter((c: any) => c[0].includes('INSERT INTO inventory_stock'))
    expect(invInsertCalls.length).toBe(0)
  })
})

describe('CirculationInputSchema 校验', () => {
  it('缺失 circulationType 应失败', () => {
    expect(() => CirculationInputSchema.parse({ sourceModule: 'planting', sourceId: 'a', parentSourceId: 'b' })).toThrow()
  })
  it('无效 circulationType 枚举应失败', () => {
    expect(() => CirculationInputSchema.parse({ circulationType: 'INVALID', sourceModule: 'planting', sourceId: 'a', parentSourceId: 'b' })).toThrow()
  })
  it('有效输入应通过', () => {
    expect(() => CirculationInputSchema.parse({ circulationType: 'QUANTITY', sourceModule: 'planting', sourceId: 'a', parentSourceId: 'b' })).not.toThrow()
  })
  it('destination 默认 seed_source', () => {
    const result = CirculationInputSchema.parse({ circulationType: 'QUANTITY', sourceModule: 'planting', sourceId: 'a', parentSourceId: 'b' })
    expect(result.destination).toBe('seed_source')
  })
})

describe('revokeCirculation', () => {
  it('QUANTITY 回种源撤销应回退数量', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({
        id: 'circ-1',
        circulation_type: 'QUANTITY',
        quantity: 50,
        parent_source_id: 'ss-parent',
        disposition: null,
        is_revoked: 0,
      })),
      all: vi.fn(() => []),
      run: vi.fn(() => ({ changes: 0 })),
    })

    revokeCirculation('circ-1', { reason: '测试撤销', operatorId: 'op-1' })

    // 应有 1 次 UPDATE seed_sources (回退) + 1 次 UPDATE crop_circulation_records (软删除)
    const updateSeed = mockDb.run.mock.calls.filter((c: any) => c[0].includes('UPDATE seed_sources'))
    expect(updateSeed.length).toBe(1)
    const updateCirc = mockDb.run.mock.calls.filter((c: any) => c[0].includes('UPDATE crop_circulation_records'))
    expect(updateCirc.length).toBe(1)
    expect(updateCirc[0][0]).toContain('is_revoked = 1')
  })

  it('已撤销的记录应抛错', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ id: 'circ-1', is_revoked: 1 })),
      all: vi.fn(() => []),
      run: vi.fn(() => ({ changes: 0 })),
    })
    expect(() => revokeCirculation('circ-1', { reason: 'r', operatorId: 'op-1' })).toThrow('已撤销')
  })

  it('不存在的记录应抛错', () => {
    expect(() => revokeCirculation('circ-unknown', { reason: 'r', operatorId: 'op-1' })).toThrow('不存在')
  })

  it('缺 reason 应抛 ZodError', () => {
    expect(() => revokeCirculation('circ-1', { operatorId: 'op-1' })).toThrow()
  })
})

describe('listCirculations', () => {
  it('应支持 parentSourceId 过滤', () => {
    listCirculations({ parentSourceId: 'ss-1' })
    const calls = mockDb.prepare.mock.calls
    const lastPrepareCall = calls[calls.length - 1]
    expect(lastPrepareCall[0]).toContain('parent_source_id = ?')
  })
})
