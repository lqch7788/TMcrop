/**
 * UnifiedRowHarvestInboundModal 育苗入库软校验组件测试（2026-08-14）
 * 验证点：
 * - 育苗行入库量超出剩余可入库 → showConfirm 被调用（软校验触发）
 * - showConfirm 取消 → submitUnifiedInbound 不被调用（留在弹窗）
 * - showConfirm 确认 → submitUnifiedInbound 被调用（放行）
 * - 入库量 ≤ 剩余可入库 → 不弹确认框直接提交
 * - 种植行（字段缺失）→ 跳过软校验
 *
 * 测试策略：项目约定 createRoot + act 交互测试（对齐 AddStockModal.cropSelector.test.tsx）
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// ---- mock 依赖 ----

// 弹窗从 @/stores barrel 导入 useWarehouseStore / useInventoryStore
vi.mock('@/stores', () => ({
  useWarehouseStore: (selector?: (s: any) => any) => {
    const state = {
      warehouses: [{ oid: 'w1', id: 'w1', name: '种苗B库' }],
      loadWarehouses: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
  useInventoryStore: (selector?: (s: any) => any) => {
    const state = { notifyChange: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/useDictionaryStore', () => ({
  useDictionaryStore: (selector?: (s: any) => any) => {
    const state = { dictionaries: [], loadDictionaries: vi.fn().mockResolvedValue(undefined) };
    return selector ? selector(state) : state;
  },
  getDictItems: () => [],
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { currentUser: { realName: '测试员' } };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/useUserStore', () => ({
  useUserStore: (selector?: (s: any) => any) => {
    const state = { users: [], loadUsers: vi.fn().mockResolvedValue(undefined) };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/useHarvestRecordStore', () => ({
  useHarvestRecordStore: (selector?: (s: any) => any) => {
    const state = {
      recordsByKey: {},
      loadingByKey: {},
      loadRecords: vi.fn().mockResolvedValue(undefined),
      prependRecord: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/usePlantingStore', () => ({
  usePlantingStore: () => ({ addHarvestRecord: vi.fn().mockResolvedValue(undefined) }),
}));

// dialogService：捕获确认框调用，返回可控结果
const showConfirmMock = vi.fn();
vi.mock('@/lib/dialogService', () => ({
  showAlert: vi.fn().mockResolvedValue(undefined),
  showConfirm: (message: string) => {
    showConfirmMock(message);
    return Promise.resolve(showConfirmMock.getMockImplementation()?.() ?? false);
  },
}));

// 软校验纯函数用真实实现；validate/submit mock 掉（避免真实 API 调用）
const submitUnifiedInboundMock = vi.fn();
vi.mock('@/services/unifiedHarvestInboundService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/unifiedHarvestInboundService')>();
  return {
    ...actual,
    validateUnifiedInboundInput: () => ({ ok: true }),
    submitUnifiedInbound: (input: unknown) => {
      submitUnifiedInboundMock(input);
      return Promise.resolve({ success: true, data: { harvestCode: 'HS-TEST', stockIds: ['s1'] } });
    },
  };
});

// 真实组件（mock 之后 import，保证 vi.mock 先注册）
import { UnifiedRowHarvestInboundModal } from '../components/farm/inventory/UnifiedRowHarvestInboundModal';

// ---- 测试辅助 ----

const BASE_SOURCE_RECORD = {
  id: 'SD1',
  code: 'YM2026-001',
  cropName: '草莓',
  cropVariety: '宁玉',
  cropCode: 'FR0101003',
  unit: '株',
  // 剩余可入库 = 100 − 13 − 10 = 77
  expandedPlantCount: 100,
  seedlingLossCount: 13,
  harvestStockedCount: 10,
};

function renderModal(sourceRecord: Record<string, unknown>, sourceModule: string = 'seedling') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(UnifiedRowHarvestInboundModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        stockType: 'seedling',
        sourceModule: sourceModule as 'seedling',
        sourceRecord: sourceRecord as never,
      }),
    );
  });
  return container;
}

/** 设置采收数量输入框值（NumberInput 组件：input 事件更新内部 state，blur 才通知父组件 onChange） */
function setHarvestQuantity(container: HTMLElement, value: string) {
  const input = [...container.querySelectorAll('input')].find((i) => i.placeholder === '0.00') as HTMLInputElement;
  expect(input).toBeTruthy();
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // NumberInput 仅在 blur 时调用父组件 onChange（避免输入过程频繁更新）
    // React 17+ onBlur 在 root 上监听 focusout（jsdom 中 dispatch blur 不会触发 React onBlur）
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  });
}

function clickSubmit(container: HTMLElement) {
  const btn = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === '确认入库') as HTMLButtonElement;
  expect(btn).toBeTruthy();
  act(() => {
    btn.click();
  });
}

// ---- 用例 ----

beforeEach(() => {
  showConfirmMock.mockReset();
  showConfirmMock.mockImplementation(() => false); // 默认取消
  submitUnifiedInboundMock.mockClear();
});

describe('UnifiedRowHarvestInboundModal 育苗入库软校验', () => {
  it('入库量超出剩余可入库（77）→ showConfirm 被调用，文案含可入库与超出数', async () => {
    const container = renderModal(BASE_SOURCE_RECORD);
    setHarvestQuantity(container, '100'); // > 77
    await act(async () => {
      clickSubmit(container);
    });
    expect(showConfirmMock).toHaveBeenCalledTimes(1);
    const msg = showConfirmMock.mock.calls[0][0] as string;
    expect(msg).toContain('可入库数量不足');
    expect(msg).toContain('77');      // 当前可入库
    expect(msg).toContain('100');     // 本次入库
    expect(msg).toContain('23');      // 超出量
  });

  it('showConfirm 取消 → submitUnifiedInbound 不被调用（留在弹窗不提交）', async () => {
    const container = renderModal(BASE_SOURCE_RECORD);
    setHarvestQuantity(container, '100');
    showConfirmMock.mockImplementation(() => false); // 用户点取消
    await act(async () => {
      clickSubmit(container);
    });
    expect(showConfirmMock).toHaveBeenCalledTimes(1);
    expect(submitUnifiedInboundMock).not.toHaveBeenCalled();
  });

  it('showConfirm 确认 → submitUnifiedInbound 被调用（放行入库）', async () => {
    const container = renderModal(BASE_SOURCE_RECORD);
    setHarvestQuantity(container, '100');
    showConfirmMock.mockImplementation(() => true); // 用户点确认
    await act(async () => {
      clickSubmit(container);
    });
    expect(showConfirmMock).toHaveBeenCalledTimes(1);
    expect(submitUnifiedInboundMock).toHaveBeenCalledTimes(1);
    const payload = submitUnifiedInboundMock.mock.calls[0][0] as { products: { harvestQuantity: number }[] };
    expect(payload.products[0].harvestQuantity).toBe(100);
  });

  it('入库量 ≤ 剩余可入库 → 不弹确认框，直接提交', async () => {
    const container = renderModal(BASE_SOURCE_RECORD);
    setHarvestQuantity(container, '50'); // ≤ 77
    await act(async () => {
      clickSubmit(container);
    });
    expect(showConfirmMock).not.toHaveBeenCalled();
    expect(submitUnifiedInboundMock).toHaveBeenCalledTimes(1);
  });

  it('未传数量字段（种植/种源行场景）→ 跳过软校验直接提交', async () => {
    const container = renderModal({
      id: 'P1',
      code: 'PL2026-001',
      cropName: '苹果',
      cropVariety: '红富士',
      cropCode: 'FR0301001',
      unit: 'kg',
      // 无 expandedPlantCount 等字段
    }, 'planting');
    setHarvestQuantity(container, '100');
    await act(async () => {
      clickSubmit(container);
    });
    expect(showConfirmMock).not.toHaveBeenCalled();
    expect(submitUnifiedInboundMock).toHaveBeenCalledTimes(1);
  });
});
