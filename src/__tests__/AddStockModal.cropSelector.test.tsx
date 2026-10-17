/**
 * AddStockModal CropCodeSelector 接入测试 — 任务 T4
 * 2026-07-08
 *
 * 验证点：
 * - T3 暂用的 Input 文本框（placeholder "作物名称（T4 升级 CropCodeSelector）"）
 *   升级为 CropCodeSelector 触发器（默认 placeholder "搜索或选择作物品种..."）
 * - 点击触发器展开下拉，搜索 input 出现（placeholder "搜索品种名称或编码..."）
 * - sourceRecord 预填 cropCode 后触发器显示完整品种路径
 *
 * 测试策略：项目约定使用 renderToString（静态）+ createRoot+act（交互）
 * 与 AddStockModal.fieldRender.test.tsx / InventoryInboundModal.fieldMatrix.test.tsx
 * 保持一致。
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// ---- mock 依赖（与 AddStockModal.fieldRender 保持一致） ----

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

// CropCodeSelector 调用 cropVarietyService 的多个方法，全部 mock
// getVarietyByCode 单测里按需覆写返回测试品种
vi.mock('@/services/cropVarietyService', () => ({
  initVarieties: vi.fn(),
  getVarietyByName: vi.fn().mockReturnValue(null),
  getCategoryOptions: () => [],
  getVarietyOptions: () => [],
  searchVarieties: () => [],
  getVarietyByCode: vi.fn().mockReturnValue(null),
  findOrCreateVarietyByName: vi.fn().mockReturnValue(null),
}));

// 2026-10-17：CropCodeSelector 主数据源改为 API 品种库（9 位编码），需 mock 该服务
//   （原先只 mock 旧库；组件现在优先查 API 库，再回退旧库兜底）
vi.mock('@/services/apiCropVarietyService', () => ({
  getAllVarieties: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/addStockFormAdapter', () => ({
  toPayload: vi.fn().mockImplementation((formData, sourceType) => ({ sourceType, ...formData })),
  buildOperatorInfo: vi.fn().mockReturnValue({ operatorName: '测试员A' }),
}));

vi.mock('@/lib/dialogService', () => ({
  showAlert: vi.fn(),
}));

// ---- import 被测组件 ----

import { AddStockModal } from '../components/farm/inventory/AddStockModal';
import * as cropVarietyService from '@/services/cropVarietyService';

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

function renderInteractive(props: Partial<React.ComponentProps<typeof AddStockModal>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(AddStockModal, {
        isOpen: true,
        sourceRecord: null,
        stockType: 'product',
        onClose: () => {},
        ...props,
      } as any),
    );
  });
  return { container, root };
}

function unmountInteractive(root: ReturnType<typeof createRoot>) {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = '';
}

// 2026-10-17：删除未再使用的 fakeVariety（源行带出场景已改为只读展示，不再依赖品种库解析）

// ---- 测试 ----

describe('AddStockModal CropCodeSelector 接入（T4）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // 默认 getVarietyByCode 返回 null
    (cropVarietyService.getVarietyByCode as any).mockReturnValue(null);
  });

  it('"作物选择"字段渲染为 CropCodeSelector 触发器（默认 placeholder）', () => {
    const html = renderStatic();
    // CropCodeSelector 默认 placeholder
    expect(html).toContain('搜索或选择作物品种');
    // 旧的 T3 Input placeholder "作物名称（T4 升级 CropCodeSelector）" 不应再出现
    expect(html).not.toContain('T4 升级');
    expect(html).not.toContain('作物名称（T4');
  });

  it('点击触发器展开下拉，显示搜索 input', () => {
    const { container, root } = renderInteractive();

    // 找到 placeholder 为"搜索或选择作物品种..."的触发按钮
    const buttons = Array.from(container.querySelectorAll('button'));
    const trigger = buttons.find(
      (b) => (b.textContent || '').includes('搜索或选择作物品种'),
    );
    expect(trigger, '应能找到 CropCodeSelector 触发器').toBeTruthy();

    act(() => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // 展开后应有搜索 input，placeholder 为 "搜索品种名称或编码..."
    const searchInput = container.querySelector('input[placeholder*="搜索品种名称或编码"]');
    expect(searchInput, '展开后应显示搜索 input').toBeTruthy();

    unmountInteractive(root);
  });

  it('sourceRecord 预填 cropCode 后作物由源行自动带出（只读展示，不再出现选择器）', () => {
    // 2026-10-17 更新：2026-10-09 起，self_produced + cropCode 有值时作物改为只读展示
    //   （作物由源种植/育苗行唯一决定，避免作物与源行不一致的脏数据），
    //   原测试仍按 7 月的旧行为断言"触发器显示完整品种路径"，已不符合当前设计。
    const html = renderStatic({
      sourceRecord: {
        module: 'planting',
        id: 'src-1',
        code: 'P001',
        cropName: '草莓',
        cropVariety: '大叶红颜',
        cropCode: 'FR010100101',
        sourceType: 'self_produced',
      } as any,
    });

    // 只读展示源行带出的作物信息
    expect(html).toContain('源行自动带出');
    expect(html).toContain('草莓');
    expect(html).toContain('大叶红颜');
    // 不再出现可选择的品种选择器
    expect(html).not.toContain('搜索或选择作物品种');
  });
});
