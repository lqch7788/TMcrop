/**
 * AddStockModal 补录模式相关测试
 * 2026-07-13 v6
 *
 * 验证点：
 * - sourceId 按 prefillStockType 动态加载（seed → /seed-sources；seedling → /seedlings；product → /plantings）
 * - 预填 formData.sourceId/sourceModule/sourceCode/cropName/cropCode
 * - 补录模式锁定 stockType + sourceType（isSupplementaryMode）
 * - 紫色锁定 banner 显示
 * - 补录原因字段由 SupplementaryReasonInput 渲染（下拉 5 预设）
 *
 * 测试策略：使用项目已有的 renderToString + createRoot+act 模式
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// ---- mock 依赖（与 AddStockModal.fieldRender.test.tsx 保持一致）----

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

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
  getVarietyByCode: vi.fn().mockReturnValue(null),
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

// ---- import 被测组件 + mock apiClient ----

import { AddStockModal } from '../components/farm/inventory/AddStockModal';
import apiClient from '@/lib/apiClient';
const mockApiClient = apiClient as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

// ---- 工具 ----

function renderInContainer(props: Partial<React.ComponentProps<typeof AddStockModal>>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(AddStockModal, {
        isOpen: true,
        onClose: () => {},
        ...props,
      } as any),
    );
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

// ---- 测试 ----

describe('AddStockModal sourceId 按 stockType 动态加载', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefillStockType=product → 调 /plantings，不调 /seedlings', async () => {
    mockApiClient.get.mockResolvedValue({
      data: { items: [{ id: 'p1', plantingCode: 'P001', cropName: '苹果', cropCode: '010203' }] },
    });
    const { unmount } = renderInContainer({
      prefillSourceId: 'p1',
      prefillSourceModule: 'planting',
      prefillStockType: 'product',
      prefillMode: 'supplementary',
    });
    // 等待异步 effect 完成
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const calls = mockApiClient.get.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/plantings/)]));
    expect(calls).not.toEqual(expect.arrayContaining([expect.stringMatching(/\/seedlings/)]));
    expect(calls).not.toEqual(expect.arrayContaining([expect.stringMatching(/\/seed-sources/)]));
    unmount();
  });

  it('prefillStockType=seedling → 调 /seedlings，不调 /plantings', async () => {
    mockApiClient.get.mockResolvedValue({
      data: { items: [{ id: 's1', seedlingCode: 'Y001', cropName: '番茄', cropCode: '020101' }] },
    });
    const { unmount } = renderInContainer({
      prefillSourceId: 's1',
      prefillSourceModule: 'seedling',
      prefillStockType: 'seedling',
      prefillMode: 'supplementary',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const calls = mockApiClient.get.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/seedlings/)]));
    expect(calls).not.toEqual(expect.arrayContaining([expect.stringMatching(/\/plantings/)]));
    unmount();
  });

  it('prefillStockType=seed → 调 /seed-sources', async () => {
    mockApiClient.get.mockResolvedValue({
      data: { items: [{ id: 'ss1', sourceCode: 'ZY001', cropName: '葡萄枝条', cropCode: '0305' }] },
    });
    const { unmount } = renderInContainer({
      prefillSourceId: 'ss1',
      prefillSourceModule: 'seed-source',
      prefillStockType: 'seed',
      prefillMode: 'supplementary',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const calls = mockApiClient.get.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/seed-sources/)]));
    unmount();
  });

  it('prefillStockType 未传 → 兜底 /plantings', async () => {
    mockApiClient.get.mockResolvedValue({ data: { items: [] } });
    const { unmount } = renderInContainer({
      prefillSourceId: 'p1',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const calls = mockApiClient.get.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/plantings/)]));
    unmount();
  });
});

describe('AddStockModal 补录模式锁定', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefillMode=supplementary + prefillSourceId → 显示紫色锁定 banner', async () => {
    mockApiClient.get.mockResolvedValue({
      data: { items: [{ id: 'p1', plantingCode: 'YY2025-001', cropName: '苹果', cropCode: '010203' }] },
    });
    const { container, unmount } = renderInContainer({
      prefillSourceId: 'p1',
      prefillSourceCode: 'YY2025-001',
      prefillSourceModule: 'planting',
      prefillStockType: 'product',
      prefillMode: 'supplementary',
    });
    // 等待异步 effect 完成（sourceId 预填）
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    // 紫色锁定 banner
    expect(html).toContain('bg-purple-50');
    expect(html).toContain('补录模式');
    expect(html).toContain('YY2025-001');
    unmount();
  });

  it('补录模式 → 6 个来源按钮全部 disabled', async () => {
    mockApiClient.get.mockResolvedValue({ data: { items: [] } });
    const { container, unmount } = renderInContainer({
      prefillSourceId: 'p1',
      prefillSourceModule: 'planting',
      prefillStockType: 'product',
      prefillMode: 'supplementary',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // 检查 6 个来源按钮（外购/赠送/委托/调拨/手动/自产）全部 disabled
    const allButtons = container.querySelectorAll('button[type="button"]');
    const sourceButtons = Array.from(allButtons).filter((b) =>
      ['外购入库', '赠送/受赠', '委托生产', '调拨入库', '手动录入', '自产（兜底）'].some((label) =>
        b.textContent?.includes(label),
      ),
    );
    expect(sourceButtons.length).toBeGreaterThanOrEqual(6);
    for (const btn of sourceButtons) {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    }
    unmount();
  });

  it('补录模式 → 库存类型 Select disabled', async () => {
    mockApiClient.get.mockResolvedValue({ data: { items: [] } });
    const { container, unmount } = renderInContainer({
      prefillSourceId: 'p1',
      prefillSourceModule: 'planting',
      prefillStockType: 'product',
      prefillMode: 'supplementary',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // 找第一个 combobox role（库存类型 Select trigger）
    const comboboxes = container.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThan(0);
    const stockTypeCombobox = comboboxes[0] as HTMLElement;
    // Radix Select disabled 时 trigger 元素上无 data-disabled，但 SelectTrigger 内部 button 有 disabled 属性
    // 检查 trigger 是否包含 disabled 子 button 或 trigger 本身有 disabled
    const innerButton = stockTypeCombobox.querySelector('button') || (stockTypeCombobox.tagName === 'BUTTON' ? stockTypeCombobox : null);
    if (innerButton) {
      expect((innerButton as HTMLButtonElement).disabled).toBe(true);
    } else {
      // fallback：trigger 本身
      expect(stockTypeCombobox.hasAttribute('disabled')).toBe(true);
    }
    unmount();
  });

  it('非补录模式 → 不显示紫色锁定 banner，6 来源按钮可点', async () => {
    mockApiClient.get.mockResolvedValue({ data: { items: [] } });
    const { container, unmount } = renderInContainer({
      // 不传 prefillMode 和 prefillSourceId
      prefillStockType: 'product',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = container.innerHTML;
    expect(html).not.toContain('bg-purple-50');
    // 来源按钮 disabled 应为 false
    const allButtons = container.querySelectorAll('button[type="button"]');
    const sourceButtons = Array.from(allButtons).filter((b) =>
      ['外购入库', '赠送/受赠', '委托生产', '调拨入库', '手动录入', '自产（兜底）'].some((label) =>
        b.textContent?.includes(label),
      ),
    );
    for (const btn of sourceButtons) {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    }
    unmount();
  });

  it('补录模式 → 补录原因字段由 SupplementaryReasonInput 渲染（下拉 combobox）', async () => {
    mockApiClient.get.mockResolvedValue({ data: { items: [] } });
    const { container, unmount } = renderInContainer({
      prefillSourceId: 'p1',
      prefillSourceModule: 'planting',
      prefillStockType: 'product',
      prefillMode: 'supplementary',
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // 至少 2 个 combobox role（库存类型 + 补录原因）
    const comboboxes = container.querySelectorAll('[role="combobox"]');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    unmount();
  });
});