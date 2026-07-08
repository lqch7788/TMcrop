/**
 * inventoryController.getList 解构 query 参数测试（T10）
 *
 * P0 bug 验证：controller 当前不解构 status / source_type，过滤器被后端静默丢弃。
 * 本测试确保 controller 正确把 status / source_type 透传给 inventoryService.getList。
 *
 * 注意：
 * 1. controller 实际调用的是 inventoryService.getList（不是 inventoryRepository.findAll）。
 * 2. camelCaseRequestMiddleware 只转换 req.body，不转换 req.query，所以 query 字段是 snake_case。
 * 3. T11 任务负责改 service / repository 真正在 SQL 中使用 status / sourceType；
 *    T10 只验证 controller 端解构与透传，service / repository 是否消费字段不在本测试范围。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryController } from '../controllers/inventory.controller';
import * as inventoryServiceModule from '../services/inventory.service';

describe('inventoryController.getList 解构 query', () => {
  // 用 vi.spyOn 监控 inventoryService.getList 的入参
  // 类型用 any：vitest spy 的派生类型与对象方法签名推导有冲突，不影响运行时
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getListSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    getListSpy = vi
      .spyOn(inventoryServiceModule.inventoryService, 'getList')
      .mockResolvedValue({ data: [], total: 0 });
  });

  it('req.query 含 status + source_type 时传递给 inventoryService.getList', async () => {
    const req = {
      query: {
        stock_type: 'product',
        warehouse_id: 'w1',
        crop_name: '番茄',
        status: 'frozen',
        source_type: 'external_purchased',
        page: '1',
        limit: '50',
      },
    };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    const ctrl = new InventoryController();
    await ctrl.getList(req as any, res as any);

    expect(getListSpy).toHaveBeenCalledTimes(1);
    expect(getListSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stockType: 'product',
        warehouseId: 'w1',
        cropName: '番茄',
        status: 'frozen',
        sourceType: 'external_purchased',
        page: 1,
        limit: 50,
      })
    );
  });

  it('req.query 不含 status / source_type 时,getList 仍被调用且不阻塞', async () => {
    // 关键：不传 status / source_type 时，service.getList 必须被调用（不能因为字段缺失就 500）
    const req = {
      query: {
        stock_type: 'product',
        page: '1',
        limit: '50',
      },
    };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    const ctrl = new InventoryController();
    await ctrl.getList(req as any, res as any);

    expect(getListSpy).toHaveBeenCalledTimes(1);
    // 透传的字段值不强制要求是 undefined（实现可省略字段或传 undefined 都行），
    // 但 stockType / page / limit 必须正确传
    const arg = getListSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.stockType).toBe('product');
    expect(arg.page).toBe(1);
    expect(arg.limit).toBe(50);
  });

  it('getList 抛错时 controller 返回 500（不静默吞错）', async () => {
    getListSpy.mockRejectedValueOnce(new Error('DB 连接失败'));

    const req = { query: { stock_type: 'product' } };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    const ctrl = new InventoryController();
    await ctrl.getList(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});