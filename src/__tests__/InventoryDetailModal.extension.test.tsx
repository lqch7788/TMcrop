/**
 * InventoryDetailModal 扩展信息 4 分组（财务/审计/业务/来源专属）测试
 * 2026-07-08 任务 T7
 *
 * 使用 react-dom/server 的 renderToString 同步渲染为 HTML 字符串后做包含断言。
 * 理由：项目未安装 @testing-library/react；服务端渲染能避开 useEffect/异步副作用，
 *       让测试聚焦在"分组标题 + 字段标签 + 字段值"的可见输出上。
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

// 关键依赖 mock：inventoryService 会 import enhancedApiClient，浏览器专属；
// 在测试里全部返回空数据 / 假成功即可。
vi.mock('@/services/inventoryService', () => ({
  getTransactions: vi.fn().mockResolvedValue([]),
  getFreezes: vi.fn().mockResolvedValue([]),
  traceUpstream: vi.fn().mockResolvedValue([]),
  traceDownstream: vi.fn().mockResolvedValue([]),
  getInventoryByInstanceId: vi.fn().mockResolvedValue({}),
  unfreezeInventory: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/dialogService', () => ({
  showAlert: vi.fn(),
}));

vi.mock('@/constants/cropConstants', () => ({
  QUALITY_GRADE_MAP: {},
  INVENTORY_STATUS_MAP: {
    in_stock: { label: '在库', bg: 'bg-emerald-500', text: 'text-white' },
  },
  getPlantingModeLabel: (v: string) => v,
  SOURCE_ORIGIN_MAP: {
    self_produced: { label: '自产', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  },
}));

import { InventoryDetailModal } from '../components/farm/inventory/InventoryDetailModal';

const mockStock = {
  instanceId: 'INS-001',
  stockType: 'product',
  cropName: '番茄',
  varietyName: '粉冠 F1',
  currentQuantity: 100,
  frozenQuantity: 0,
  unit: '克',
  warehouseName: '主仓',
  sourceType: 'self_produced',
  status: 'in_stock',
  inboundDate: '2026-07-08',
  // 13 个新字段
  supplierName: '供应商A',
  supplierPhone: '13900000000',
  unitPrice: 5.5,
  totalAmount: 550,
  purchaseDate: '2026-07-01',
  operatorName: '测试员A',
  createBy: '测试员A',
  createTime: '2026-07-08T10:00:00Z',
  updateTime: '2026-07-08T10:00:00Z',
  remarks: '入库备注',
  businessId: 'bid1',
  businessType: 'inbound',
  businessCode: 'BC001',
  giftFrom: '张三',
  consignor: 'A公司',
  sourceWarehouseName: '上海仓',
  stocktakeNo: 'PD-001',
  baseName: '北京基地',
  plantingMode: '盆栽',
  greenhouseName: 'A区',
};

function renderModal(stockOverride: Record<string, unknown> = {}) {
  return renderToString(
    React.createElement(InventoryDetailModal, {
      isOpen: true,
      stock: { ...mockStock, ...stockOverride } as any,
      onClose: () => {},
    })
  );
}

describe('InventoryDetailModal 扩展信息 4 分组', () => {
  it('basic tab 显示 4 个分组标题：财务信息 / 审计信息 / 业务信息 / 来源专属', () => {
    const html = renderModal();
    expect(html).toContain('财务信息');
    expect(html).toContain('审计信息');
    expect(html).toContain('业务信息');
    expect(html).toContain('来源专属');
  });

  it('财务信息分组显示 5 个字段', () => {
    const html = renderModal();
    expect(html).toContain('供应商');
    expect(html).toContain('供应商电话');
    expect(html).toContain('单价');
    expect(html).toContain('总金额');
    expect(html).toContain('采购日期');
  });

  it('财务信息字段值正确显示（带 ¥ 前缀）', () => {
    const html = renderModal();
    expect(html).toContain('供应商A');
    expect(html).toContain('13900000000');
    expect(html).toContain('¥ 5.50');
    expect(html).toContain('¥ 550.00');
  });

  it('审计信息分组显示 4 个字段（操作员/创建人/创建时间/更新时间）', () => {
    const html = renderModal();
    expect(html).toContain('操作员');
    expect(html).toContain('创建人');
    expect(html).toContain('创建时间');
    expect(html).toContain('更新时间');
  });

  it('业务信息分组显示 4 个字段（备注/业务 ID/业务类型/业务编码）', () => {
    const html = renderModal();
    expect(html).toContain('业务 ID');
    expect(html).toContain('业务类型');
    expect(html).toContain('业务编码');
  });

  it('来源专属分组显示 7 个字段（赠方/委托方/调出仓库/盘点单号/所属基地/种植模式/采收区域）', () => {
    const html = renderModal();
    expect(html).toContain('赠方名称');
    expect(html).toContain('委托方');
    expect(html).toContain('调出仓库');
    expect(html).toContain('盘点单号');
    expect(html).toContain('所属基地');
    expect(html).toContain('种植模式');
    expect(html).toContain('采收区域');
  });

  it('字段为空时显示"-"占位（不抛错）', () => {
    const html = renderModal({
      supplierName: null,
      supplierPhone: null,
      unitPrice: null,
      totalAmount: null,
      giftFrom: null,
    });
    // "-" 在多处出现，不限定数量但要存在
    expect(html).toContain('-');
    // 关键字段被替换为 -，不应再出现原值
    expect(html).not.toContain('供应商A');
    expect(html).not.toContain('13900000000');
  });

  it('原 5 个分组（基础/品种/数量/来源/仓库）依然存在 — 不破坏现有 basic tab', () => {
    const html = renderModal();
    expect(html).toContain('基础信息');
    expect(html).toContain('品种信息');
    expect(html).toContain('数量信息');
    expect(html).toContain('来源信息');
    expect(html).toContain('仓库与审核');
  });
});
