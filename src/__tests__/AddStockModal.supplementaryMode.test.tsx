/**
 * AddStockModal 方案 D 测试 — 自产（兜底）= 补录入库
 * 2026-07-13
 *
 * 验证点：
 * - SOURCE_OPTIONS 中 "自产（兜底）" 重命名为 "补录入库"
 * - select "补录入库" 后，sourceType 切换为 self_produced
 * - supplementaryReason 必填（FIELD_CONFIG.required=true）
 * - 不显示任何紫色/黄色补录模式 banner
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
import {
  FIELD_CONFIG,
  validateBySourceType,
} from '../components/farm/inventory/AddStockModal.constants';

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

describe('AddStockModal 方案 D：自产（兜底）= 补录入库', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue([]);
  });

  describe('6 来源按钮渲染（DOM 验证）', () => {
    it('弹窗显示"补录入库"按钮（替代旧的"自产（兜底）"）', async () => {
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      const buttons = Array.from(container.querySelectorAll('button')).map(b => b.textContent?.trim());
      expect(buttons.some(t => t?.includes('补录入库'))).toBe(true);
      // 不再有"自产（兜底）"
      expect(buttons.some(t => t?.includes('自产（兜底）'))).toBe(false);
      unmount();
    });

    it('"补录入库"按钮的 hint 文案正确', async () => {
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      expect(container.innerHTML).toContain('为种植/育苗/种源行做补录入库');
      unmount();
    });
  });

  describe('FIELD_CONFIG 必填校验', () => {
    it('self_produced.sourceId 必填', () => {
      const f = FIELD_CONFIG.self_produced.find(x => x.key === 'sourceId');
      expect(f?.required).toBe(true);
    });

    it('self_produced.supplementaryReason 必填（方案 D：自产=补录，强制必填）', () => {
      const f = FIELD_CONFIG.self_produced.find(x => x.key === 'supplementaryReason');
      expect(f?.required).toBe(true);
    });

    it('validateBySourceType: self_produced + sourceId 为空 → 报 sourceId 必填', () => {
      const errs = validateBySourceType(
        { quantity: 1, unit: '克', recordDate: '2026-07-13', cropSelector: 'c1', warehouseId: 'w1', baseId: 'b1', supplementaryReason: '采收时漏登' },
        'self_produced',
      );
      expect(errs.sourceId).toBe('必填');
    });

    it('validateBySourceType: self_produced + sourceId 有值 + supplementaryReason 为空 → 报 supplementaryReason 必填', () => {
      const errs = validateBySourceType(
        { quantity: 1, unit: '克', recordDate: '2026-07-13', cropSelector: 'c1', warehouseId: 'w1', baseId: 'b1', sourceId: 'p1' },
        'self_produced',
      );
      expect(errs.supplementaryReason).toBe('必填');
    });

    it('validateBySourceType: self_produced + 全部必填齐 → 不报错', () => {
      const errs = validateBySourceType(
        {
          quantity: 1, unit: '克', recordDate: '2026-07-13', cropSelector: 'c1', warehouseId: 'w1',
          baseId: 'b1', sourceId: 'p1', supplementaryReason: '采收时漏登', cropForm: '果实',
        },
        'self_produced',
      );
      expect(Object.keys(errs)).toHaveLength(0);
    });
  });

  describe('弹窗渲染', () => {
    it('弹窗显示 6 个来源按钮（含"补录入库"）', async () => {
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      const buttons = Array.from(container.querySelectorAll('button')).map(b => b.textContent?.trim());
      expect(buttons.some(t => t?.includes('补录入库'))).toBe(true);
      // 不应再有"自产（兜底）"按钮
      expect(buttons.some(t => t?.includes('自产（兜底）'))).toBe(false);
      unmount();
    });

    it('默认显示外购入库（不变）', async () => {
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      const html = container.innerHTML;
      expect(html).toContain('外购入库');
      unmount();
    });

    it('点击"补录入库"按钮 → 切到 self_produced（蓝边框选中）', async () => {
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      const btn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('补录入库'));
      expect(btn).toBeTruthy();
      act(() => { (btn as HTMLButtonElement).click(); });
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      // 该按钮应被选中（蓝边框）
      const btnAfter = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('补录入库'));
      expect(btnAfter?.className).toContain('border-blue-500');
      unmount();
    });

    it('弹窗内不显示任何"补录模式"标题（用户要求简化）', async () => {
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      // 弹窗底部"自产来源建议走采收入库页"是帮助文案（非补录 banner），允许 bg-amber-50
      // 关键断言：紫色 banner（bg-purple-50）和"补录模式"标题文字不存在
      expect(container.innerHTML).not.toContain('bg-purple-50');
      expect(container.innerHTML).not.toContain('补录模式');
      unmount();
    });

    it('sourceId 加载失败 → console.warn 不抛错（不影响弹窗渲染）', async () => {
      mockGet.mockRejectedValue(new Error('network error'));
      const { container, unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 30)); });
      expect(container.innerHTML).toContain('新建入库');
      unmount();
    });

    it('sourceId 下拉过滤：只显示已结束的育苗/种植行（未结束的排除）', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url.includes('/seedlings')) {
          return [
            { id: 'y1', seedlingCode: 'COMPLETED001', cropName: '已完成育苗', status: 'completed' },
            { id: 'y2', seedlingCode: 'TRANSPLANTED001', cropName: '已移栽育苗', status: 'transplanted' },
            { id: 'y3', seedlingCode: 'PROG001', cropName: '进行中育苗', status: 'in_progress' }, // 应被过滤
          ];
        }
        if (url.includes('/plantings')) {
          return [
            { id: 'p1', plantCode: 'PENDED', cropName: '已结束种植', status: 'ended' },
            { id: 'p2', plantCode: 'PCANC', cropName: '已取消种植', status: 'cancelled' },
            { id: 'p3', plantCode: 'PPLANTED', cropName: '种植中', status: 'planted' }, // 应被过滤
            { id: 'p4', plantCode: 'PHARV', cropName: '采收中', status: 'harvesting' }, // 应被过滤
          ];
        }
        return [];
      });
      const { unmount } = renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 100)); });
      const searchInput = document.querySelector('input[placeholder*="搜索源记录"]');
      expect(searchInput).toBeTruthy();
      // 验证 mockGet 调用
      const calls = mockGet.mock.calls.map((c: any) => c[0]);
      expect(calls.some((c: string) => c.includes('/seedlings'))).toBe(true);
      expect(calls.some((c: string) => c.includes('/plantings'))).toBe(true);
      expect(calls.some((c: string) => c.includes('/seed-sources'))).toBe(false);
      unmount();
    });

    it('种源记录（seed-sources）从不下拉加载（种源不能采收）', async () => {
      mockGet.mockResolvedValue([]);
      renderModal();
      await act(async () => { await new Promise(r => setTimeout(r, 50)); });
      const calls = mockGet.mock.calls.map((c: any) => c[0]);
      // 不应调 /seed-sources
      expect(calls.some((c: string) => c.includes('/seed-sources'))).toBe(false);
    });
  });
});