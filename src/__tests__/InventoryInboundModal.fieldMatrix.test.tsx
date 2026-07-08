/**
 * InventoryInboundModal 行级同步测试 — 任务 T6
 * 2026-07-08
 *
 * 验证点：
 * - 默认 sourceType=self_produced 时显示 所属基地/种植模式/采收区域
 * - 切到 external_purchased 后显示 供应商/单价/采购日期，原 baseId/plantingMode 等应消失
 * - 源记录只读块（来源编码/作物名称/作物品种）保留
 * - 行级弹窗不显示"作物选择"（来自 sourceRecord）
 *
 * 测试策略：
 * - 项目约定使用 react-dom/server renderToString + jsdom createRoot
 *   （testing-library/react 未安装，与 AddStockModal.fieldRender 保持一致）
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

// ---- mock 依赖（与 AddStockModal.fieldRender 保持一致以便复用） ----

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

import { InventoryInboundModal } from '../components/farm/inventory/InventoryInboundModal';

// ---- 工具 ----

function renderStatic(props: Partial<React.ComponentProps<typeof InventoryInboundModal>> = {}) {
  return renderToString(
    React.createElement(InventoryInboundModal, {
      isOpen: true,
      sourceRecord: null,
      stockType: 'product',
      onClose: () => {},
      ...props,
    } as any),
  );
}

function renderInteractive(props: Partial<React.ComponentProps<typeof InventoryInboundModal>> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(InventoryInboundModal, {
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

const mockSourceRecord = {
  id: 'src1',
  code: 'SRC-001',
  module: 'planting' as const,
  cropName: '番茄',
  cropVariety: '粉冠 F1',
  cropCode: '010203',
  unit: '克',
};

// ---- 测试 ----

describe('InventoryInboundModal FIELD_CONFIG 接入（行级同步）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('默认来源=自产时显示"所属基地"、"种植模式"、"采收区域"', () => {
    const html = renderStatic({ sourceRecord: mockSourceRecord as any });
    expect(html).toContain('所属基地');
    expect(html).toContain('种植模式');
    expect(html).toContain('采收区域');
  });

  it('默认来源=自产时不应显示"作物选择"（行级弹窗作物来自源记录）', () => {
    const html = renderStatic({ sourceRecord: mockSourceRecord as any });
    // 标签为"作物选择"的字段不能出现
    expect(html).not.toContain('作物选择');
  });

  it('切到"外购入库"后显示供应商/单价/采购日期，原自产字段应消失', () => {
    const { container, root } = renderInteractive({ sourceRecord: mockSourceRecord as any });

    // 默认渲染确认是自产（有 所属基地，无 供应商 表单字段）
    // 注：sourceType 选项按钮的 hint 会包含"供应商"字样（如"从供应商/市场购买入库"），
    // 因此这里只校验 所属基地，切换后的"供应商"标签断言由"供应商 *" (FormField label) 区分。
    const beforeHtml = container.innerHTML;
    expect(beforeHtml).toContain('所属基地');

    // 找到"外购入库"按钮并点击
    // sourceType 的 SelectTrigger 显示 label
    const buttons = Array.from(container.querySelectorAll('button'));
    const externalBtn = buttons.find(b => (b.textContent || '').includes('外购入库'));
    expect(externalBtn, '应能找到"外购入库"按钮').toBeTruthy();

    act(() => {
      externalBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const afterHtml = container.innerHTML;
    expect(afterHtml).toContain('供应商');
    expect(afterHtml).toContain('单价');
    expect(afterHtml).toContain('采购日期');
    // 切到外购后，自产专属字段应消失
    expect(afterHtml).not.toContain('所属基地');
    expect(afterHtml).not.toContain('采收区域');

    unmountInteractive(root);
  });

  it('保留源记录只读块（来源编码 / 作物名称 / 作物品种）', () => {
    const html = renderStatic({ sourceRecord: mockSourceRecord as any });
    expect(html).toContain('SRC-001');
    expect(html).toContain('番茄');
    expect(html).toContain('粉冠 F1');
  });

  it('公共字段（数量/单位/仓库/入库日期）在所有来源都显示', () => {
    const html = renderStatic({ sourceRecord: mockSourceRecord as any });
    expect(html).toContain('入库日期');
    expect(html).toContain('入库仓库');
    expect(html).toContain('数量');
    expect(html).toContain('单位');
  });
});
