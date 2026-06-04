/**
 * 出库流水 Service 单元测试 (V3.1)
 * 设计文档：docs/superpowers/plans/2026-06-04-outbound-records.md Task 2.3
 *
 * 5 轮测试：
 * 1. from 缺失 → throw
 * 2. to 缺失 → throw
 * 3. 日期格式错 → throw
 * 4. from > to → throw
 * 5. 正常参数 → 透传 Repository
 *
 * 项目惯例：mock getDatabase（不连真 DB），只测纯逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Repository（不让 SQL 真跑）
vi.mock('../repositories/inventoryTransaction.repository', () => ({
  inventoryTransactionRepository: {
    findOutbound: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
    getStats: vi.fn().mockResolvedValue({
      totalCount: 0, totalQuantity: 0, todayCount: 0,
      byStockType: {}, byBusinessType: {},
    }),
  },
  TransactionQuery: {},
}));

import { inventoryTransactionService } from '../services/inventoryTransaction.service';
import { inventoryTransactionRepository } from '../repositories/inventoryTransaction.repository';

describe('InventoryTransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. from 缺失 → 抛错', async () => {
    await expect(
      inventoryTransactionService.listOutbound({ from: '', to: '2026-06-30' })
    ).rejects.toThrow('from 和 to 是必填参数');
  });

  it('2. to 缺失 → 抛错', async () => {
    await expect(
      inventoryTransactionService.listOutbound({ from: '2026-06-01', to: '' })
    ).rejects.toThrow('from 和 to 是必填参数');
  });

  it('3. 日期格式错 → 抛错（YYYY/MM/DD）', async () => {
    await expect(
      inventoryTransactionService.listOutbound({ from: '2026/06/01', to: '2026-06-30' })
    ).rejects.toThrow('日期格式必须为 YYYY-MM-DD');
  });

  it('3b. 日期格式错 → 抛错（中文）', async () => {
    await expect(
      inventoryTransactionService.getStats({ from: '六月一日', to: '2026-06-30' })
    ).rejects.toThrow('日期格式必须为 YYYY-MM-DD');
  });

  it('4. from > to → 抛错', async () => {
    await expect(
      inventoryTransactionService.listOutbound({ from: '2026-06-30', to: '2026-06-01' })
    ).rejects.toThrow('开始日期不能晚于结束日期');
  });

  it('5. 正常参数 → 透传 Repository（6 维筛选）', async () => {
    const q = {
      from: '2026-06-01',
      to: '2026-06-30',
      stockType: 'product',
      warehouseId: 'WH001',
      cropName: '番茄',
      operatorName: '张三',
      businessType: 'harvest',
      page: 2,
      limit: 100,
    };
    await inventoryTransactionService.listOutbound(q);
    expect(inventoryTransactionRepository.findOutbound).toHaveBeenCalledWith(q);
  });

  it('5b. 正常参数 → 透传 Repository（最小参数）', async () => {
    await inventoryTransactionService.getStats({ from: '2026-06-01', to: '2026-06-30' });
    expect(inventoryTransactionRepository.getStats).toHaveBeenCalledWith({
      from: '2026-06-01', to: '2026-06-30',
    });
  });
});
