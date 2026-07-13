/**
 * InventoryV3 URL 参数预填测试
 * 2026-07-13 v6
 *
 * 验证点：
 * - URL 带 openStockModal=true → AddStockModal 自动打开
 * - URL 无 openStockModal → AddStockModal 不自动打开
 *
 * 测试策略：使用 MemoryRouter + Routes，模拟浏览器 URL 参数
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ---- mock 所有依赖 ----

vi.mock('@/lib/apiClient', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { items: [] } }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/stores', () => ({
  useInventoryStore: (selector?: (s: any) => any) => {
    const state = {
      items: [],
      stats: {},
      loading: false,
      version: 0,
      loadAll: vi.fn(),
      deleteBatch: vi.fn().mockResolvedValue({ success: true, deletedCount: 0 }),
      notifyChange: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useWarehouseStore: (selector?: (s: any) => any) => {
    const state = { warehouses: [], loadWarehouses: vi.fn() };
    return selector ? selector(state) : state;
  },
  useSupplierStore: (selector?: (s: any) => any) => {
    const state = { items: [], loadItems: vi.fn() };
    return selector ? selector(state) : state;
  },
  useBaseStore: (selector?: (s: any) => any) => {
    const state = { bases: [], loadBases: vi.fn() };
    return selector ? selector(state) : state;
  },
  useInventoryInboundStore: (selector?: (s: any) => any) => {
    const state = { submitInbound: vi.fn() };
    return selector ? selector(state) : state;
  },
  useDictionaryStore: (selector?: (s: any) => any) => {
    const state = { dictionaries: [], loadDictionaries: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/services/exporters', () => ({
  exportCsv: vi.fn(),
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
  toPayload: vi.fn(),
  buildOperatorInfo: vi.fn().mockReturnValue({ operatorName: 'system' }),
}));

vi.mock('@/lib/dialogService', () => ({
  showAlert: vi.fn(),
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ currentUser: { name: '测试员A', realName: '测试员A' } }),
}));

// AddStockModal 简化 mock（避免渲染完整逻辑）
vi.mock('../components/farm/inventory/AddStockModal', () => ({
  AddStockModal: (props: any) => {
    // 暴露 prefillSourceCode 是否被传入
    const propsDataAttr = `data-prefill-source-code="${props.prefillSourceCode || ''}" data-prefill-source-id="${props.prefillSourceId || ''}" data-prefill-mode="${props.prefillMode || ''}" data-prefill-stock-type="${props.prefillStockType || ''}"`;
    return (
      <div data-testid="add-stock-modal" {...{ 'data-is-open': props.isOpen ? 'true' : 'false' }} data-prefill={propsDataAttr}>
        AddStockModal Mock
      </div>
    );
  },
}));

vi.mock('../components/farm/inventory/FreezeModal', () => ({
  FreezeModal: () => null,
}));

vi.mock('../components/farm/inventory/InventoryDetailModal', () => ({
  InventoryDetailModal: () => null,
}));

vi.mock('../components/warehouse/OutboundModal', () => ({
  OutboundModal: () => null,
}));

vi.mock('../components/farm/inventory/InventoryTable', () => ({
  InventoryTable: () => null,
}));

vi.mock('../components/farm/inventory/InventoryFilter', () => ({
  InventoryFilter: () => null,
  InventoryFilterState: {},
}));

vi.mock('../components/warehouse/ActionToolbar', () => ({
  default: () => null,
}));

// ---- import 被测组件 ----

import InventoryV3Page from '../pages/InventoryV3';

// ---- 工具 ----

function renderAtUrl(url: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/crop-inventory" element={<InventoryV3Page />} />
        </Routes>
      </MemoryRouter>,
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

describe('InventoryV3 URL 参数自动开弹窗', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('URL 带 openStockModal=true → AddStockModal isOpen=true', async () => {
    const { container, unmount } = renderAtUrl(
      '/crop-inventory?openStockModal=true&sourceId=p1&sourceCode=YY001&sourceModule=planting&stockType=product&mode=supplementary',
    );
    // 等待 useEffect 触发
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    const modal = container.querySelector('[data-testid="add-stock-modal"]') as HTMLElement;
    expect(modal).toBeTruthy();
    expect(modal.getAttribute('data-is-open')).toBe('true');
    // 验证 prefill props 已传入
    expect(modal.getAttribute('data-prefill')).toContain('data-prefill-source-id="p1"');
    expect(modal.getAttribute('data-prefill')).toContain('data-prefill-source-code="YY001"');
    expect(modal.getAttribute('data-prefill')).toContain('data-prefill-mode="supplementary"');
    expect(modal.getAttribute('data-prefill')).toContain('data-prefill-stock-type="product"');
    unmount();
  });

  it('URL 无 openStockModal → AddStockModal isOpen=false', async () => {
    const { container, unmount } = renderAtUrl('/crop-inventory');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    const modal = container.querySelector('[data-testid="add-stock-modal"]') as HTMLElement;
    expect(modal).toBeTruthy();
    expect(modal.getAttribute('data-is-open')).toBe('false');
    unmount();
  });
});