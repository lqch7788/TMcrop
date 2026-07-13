/**
 * AddStockModal 方案 B 补录模式测试
 * 2026-07-13
 *
 * 验证点：
 * - supplementaryMode=true → 弹窗 open 时并行加载 3 个 sourceId 列表（种源/育苗/种植）
 * - supplementaryMode=true → 紫色补录模式 banner 显示
 * - supplementaryMode=false → 紫色 banner 不显示
 * - supplementaryMode=true → sourceType 强制 self_produced
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

vi.mock('@/lib/apiClient', () => {
  const sharedGet = vi.fn();
  (globalThis as any).__mockApiClient = { get: sharedGet };
  return { default: { get: sharedGet }, enhancedApiClient: { get: sharedGet } };
});

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ currentUser: { name: '测试员A', realName: '测试员A' } }),
}));

vi.mock('@/stores/useWarehouseStore', () => ({
  useWarehouseStore: (sel?: any) =>
    sel ? sel({ warehouses: [{ oid: 'w1', id: 'w1', name: '主仓' }], loadWarehouses: vi.fn() }) : { warehouses: [], loadWarehouses: vi.fn() },
  getActiveWarehouses: () => [{ oid: 'w1', id: 'w1', name: '主仓' }],
}));

vi.mock('@/stores/useInventoryInboundStore', () => ({
  useInventoryInboundStore: (sel?: any) =>
    sel ? sel({ submitInbound: vi.fn(), recordsBySource: {} }) : { submitInbound: vi.fn(), recordsBySource: {} },
}));

vi.mock('@/stores/useInventoryStore', () => ({
  useInventoryStore: (sel?: any) => sel ? sel({ notifyChange: vi.fn() }) : { notifyChange: vi.fn() },
}));

vi.mock('@/stores/useSupplierStore', () => ({
  useSupplierStore: (sel?: any) => sel ? sel({ items: [], loadItems: vi.fn(), search: () => [] }) : { items: [], loadItems: vi.fn(), search: () => [] },
}));

vi.mock('@/stores/useBaseStore', () => ({
  useBaseStore: (sel?: any) => sel ? sel({ bases: [{ oid: 'b1', id: 'b1', name: '北京基地' }], loadBases: vi.fn() }) : { bases: [], loadBases: vi.fn() },
}));

vi.mock('@/stores/useDictionaryStore', () => ({
  useDictionaryStore: (sel?: any) => sel ? sel({ dictionaries: [], loadDictionaries: vi.fn() }) : { dictionaries: [], loadDictionaries: vi.fn() },
  getDictItems: () => [],
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
  toPayload: vi.fn().mockImplementation((formData, sourceType) => ({ sourceType, ...formData })),
  buildOperatorInfo: vi.fn().mockReturnValue({ operatorName: '测试员A' }),
}));

vi.mock('@/lib/dialogService', () => ({
  showAlert: vi.fn(),
}));

import { AddStockModal } from '../components/farm/inventory/AddStockModal';

const mockGet = (globalThis as any).__mockApiClient.get as ReturnType<typeof vi.fn>;

function renderModal(props: any = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<AddStockModal isOpen onClose={() => {}} {...props} />);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

describe('AddStockModal 方案 B 补录模式', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue([]);
  });

  it('supplementaryMode=true → 弹窗 open 时加载 3 个 sourceId 列表', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/seed-sources')) {
        return [{ id: 's1', seedCode: 'ZY001', cropName: '种源作物' }];
      }
      if (url.includes('/seedlings')) {
        return [{ id: 'y1', seedlingCode: 'YM001', cropName: '育苗作物' }];
      }
      if (url.includes('/plantings')) {
        return [{ id: 'p1', plantCode: 'P001', cropName: '种植作物' }];
      }
      return [];
    });
    const { unmount } = renderModal({ supplementaryMode: true });
    await act(async () => { await new Promise(r => setTimeout(r, 80)); });
    const calls = mockGet.mock.calls.map((c: any) => c[0]);
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/seed-sources/)]));
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/seedlings/)]));
    expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/\/plantings/)]));
    unmount();
  });

  it('supplementaryMode=true → 紫色补录模式 banner 显示', async () => {
    mockGet.mockResolvedValue([]);
    const { container, unmount } = renderModal({ supplementaryMode: true });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    expect(container.innerHTML).toContain('补录模式');
    expect(container.innerHTML).toContain('请从下方');
    unmount();
  });

  it('supplementaryMode=false → 紫色补录 banner 不显示', async () => {
    mockGet.mockResolvedValue([]);
    const { container, unmount } = renderModal({ supplementaryMode: false });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    expect(container.innerHTML).not.toContain('补录模式');
    unmount();
  });

  it('supplementaryMode=true → sourceType 强制 self_produced', async () => {
    mockGet.mockResolvedValue([]);
    const { container, unmount } = renderModal({ supplementaryMode: true });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    // 自产（兜底）按钮被选中（蓝边框 + 白底）
    const selfProdBtn = Array.from(container.querySelectorAll('button')).find((b: any) =>
      b.textContent?.includes('自产（兜底）'),
    );
    expect(selfProdBtn?.className).toContain('border-blue-500');
    unmount();
  });

  it('supplementaryMode=true → 源行下拉显示搜索框', async () => {
    mockGet.mockResolvedValue([]);
    const { container, unmount } = renderModal({ supplementaryMode: true });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    const searchInput = container.querySelector('input[placeholder*="搜索源记录"]');
    expect(searchInput).toBeTruthy();
    unmount();
  });

  it('sourceId 加载失败 → console.warn 不抛错', async () => {
    mockGet.mockRejectedValue(new Error('network error'));
    const { container, unmount } = renderModal({ supplementaryMode: true });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    // 弹窗仍正常渲染（无错误边界触发）
    expect(container.innerHTML).toContain('新建入库');
    unmount();
  });
});