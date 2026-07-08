/**
 * AddStockModal FIELD_CONFIG 接入渲染测试
 * 2026-07-08 任务 T3
 *
 * 验证点：
 * - 默认 sourceType=self_produced 时显示 所属基地/种植模式/采收区域
 * - 默认时不应显示 供应商/单价（外购专属）
 * - 切到 external_purchased 后应显示 供应商/单价/采购日期，原 baseId 等应消失
 * - 公共字段（数量/单位/仓库/入库日期）所有来源都显示
 *
 * 测试策略：
 * - 用 react-dom/server 的 renderToString 同步渲染（项目约定 — 见
 *   src/__tests__/InventoryDetailModal.extension.test.tsx）
 * - 切换 sourceType 通过 sourceRecord.sourceType 间接指定初始值
 * - 不依赖 @testing-library/react（项目未安装）
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';

// ---- mock 依赖 ----

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ currentUser: { name: '测试员A', realName: '测试员A' } }),
}));

vi.mock('@/stores/useWarehouseStore', () => ({
  useWarehouseStore: (selector?: (s: any) => any) => {
    const state = {
      warehouses: [{ oid: 'w1', id: 'w1', name: '主仓', warehouseType: '成品仓' }],
      loadWarehouses: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
  getActiveWarehouses: () => [{ oid: 'w1', id: 'w1', name: '主仓', warehouseType: '成品仓' }],
}));

vi.mock('@/stores/useInventoryInboundStore', () => ({
  useInventoryInboundStore: (selector?: (s: any) => any) => {
    const state = {
      submitInbound: vi.fn().mockResolvedValue({ stockId: 's1', recordId: 'r1' }),
      recordsBySource: {},
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/useInventoryStore', () => ({
  useInventoryStore: (selector?: (s: any) => any) => {
    const state = { notifyChange: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/useSupplierStore', () => ({
  useSupplierStore: (selector?: (s: any) => any) => {
    const state = {
      items: [],
      loadItems: vi.fn().mockResolvedValue(undefined),
      search: () => [],
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/useBaseStore', () => ({
  useBaseStore: (selector?: (s: any) => any) => {
    const state = {
      bases: [{ oid: 'b1', id: 'b1', name: '北京基地' }],
      loadBases: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/services/cropVarietyService', () => ({
  initVarieties: vi.fn(),
  getVarietyByName: vi.fn().mockReturnValue(null),
  getCategoryOptions: () => [],
  getVarietyOptions: () => [],
  searchVarieties: () => [],
}));

vi.mock('@/services/addStockFormAdapter', () => ({
  toPayload: vi.fn().mockImplementation((formData, sourceType) => ({
    sourceType,
    ...formData,
  })),
  buildOperatorInfo: vi.fn().mockReturnValue({ operatorName: '测试员A' }),
}));

vi.mock('@/lib/dialogService', () => ({
  showAlert: vi.fn(),
}));

// ---- import 被测组件 ----

import { AddStockModal } from '../components/farm/inventory/AddStockModal';

// ---- 工具 ----

function renderStatic(props: Partial<React.ComponentProps<typeof AddStockModal>> = {}) {
  return renderToString(
    React.createElement(AddStockModal, {
      isOpen: true,
      sourceRecord: null,
      stockType: 'product',
      onClose: () => {},
      ...props,
    } as any),
  );
}

// ---- 测试 ----

describe('AddStockModal FIELD_CONFIG 接入', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认来源=自产时显示"所属基地"、"种植模式"、"采收区域"', () => {
    const html = renderStatic();
    expect(html).toContain('所属基地');
    expect(html).toContain('种植模式');
    expect(html).toContain('采收区域');
  });

  it('默认来源=自产时不应显示"供应商"和"单价"', () => {
    const html = renderStatic();
    // "单价" 是外购专属；"供应商" 默认自产视图不出现
    expect(html).not.toContain('单价');
    expect(html).not.toContain('供应商');
  });

  it('切到"外购入库"后专属字段变为供应商/单价/采购日期', () => {
    // 通过 sourceRecord.sourceType 指定外购作为初始来源
    const html = renderStatic({
      sourceRecord: {
        module: 'planting',
        id: 'src-1',
        code: 'P001',
        cropName: '番茄',
        cropVariety: '粉冠F1',
        cropCode: '010203040501',
        sourceType: 'external_purchased',
      } as any,
    });
    expect(html).toContain('供应商');
    expect(html).toContain('单价');
    expect(html).toContain('采购日期');
    // 切到外购后，自产专属字段应消失
    expect(html).not.toContain('所属基地');
    expect(html).not.toContain('采收区域');
  });

  it('公共字段（数量/单位/仓库/入库日期）在默认自产视图都显示', () => {
    const html = renderStatic();
    expect(html).toContain('数量');
    expect(html).toContain('单位');
    expect(html).toContain('入库仓库');
    expect(html).toContain('入库日期');
  });

  it('外购视图下也包含公共字段', () => {
    const html = renderStatic({
      sourceRecord: {
        module: 'planting',
        id: 'src-1',
        code: 'P001',
        cropName: '番茄',
        cropVariety: '粉冠F1',
        cropCode: '010203040501',
        sourceType: 'external_purchased',
      } as any,
    });
    expect(html).toContain('数量');
    expect(html).toContain('单位');
    expect(html).toContain('入库仓库');
    expect(html).toContain('入库日期');
  });

  it('委托生产视图显示"委托方"且不含"所属基地"', () => {
    const html = renderStatic({
      sourceRecord: {
        module: 'planting',
        id: 'src-2',
        code: 'P002',
        cropName: '番茄',
        cropVariety: '粉冠F1',
        cropCode: '010203040501',
        sourceType: 'commissioned',
      } as any,
    });
    expect(html).toContain('委托方');
    expect(html).not.toContain('所属基地');
    expect(html).not.toContain('单价');
  });

  it('调拨入库视图显示"调出仓库"且不含"供应商"', () => {
    const html = renderStatic({
      sourceRecord: {
        module: 'planting',
        id: 'src-3',
        code: 'P003',
        cropName: '番茄',
        cropVariety: '粉冠F1',
        cropCode: '010203040501',
        sourceType: 'transfer',
      } as any,
    });
    expect(html).toContain('调出仓库');
    expect(html).not.toContain('供应商');
    expect(html).not.toContain('所属基地');
  });
});
