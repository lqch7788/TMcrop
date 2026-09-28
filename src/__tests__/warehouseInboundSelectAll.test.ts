/**
 * 物料入库列表 全选/取消全选 逻辑测试
 * 2026-09-28 审计修复配套（P1：删除模式"全选"是死键）
 *
 * 修复前缺陷：
 * 1. deleteMode 分支只认 status==='pending' 的记录；库里 pending=0 时 `[].every()` 恒为 true
 *    → 点"全选"永远走"取消"分支且过滤集为空 → 按钮完全失效（浏览器实测"已选择"恒为 0）
 * 2. 非 deleteMode 分支用"长度相等"判定 → 跨页全选时误判，再点一次会把前一页的选择静默清空
 */
import { describe, it, expect, vi } from 'vitest';
import { handleSelectAll, isAllSelected } from '../pages/warehouse/utils/warehouseInbound.utils';
import type { InboundRecord } from '../types/warehouseInbound.types';

/** 造一条最小可用记录（只用到 id/status 两个字段） */
const rec = (id: number, status: string): InboundRecord => ({
  id,
  code: `RK-${id}`,
  inboundDate: '2026-09-28',
  supplier: '测试供应商',
  operator: '测试员',
  status,
  materials: [],
} as unknown as InboundRecord);

describe('物料入库列表 全选逻辑', () => {
  it('删除模式下也能全选（历史 bug：库里无 pending 记录时按钮完全失效）', () => {
    const page = [rec(1, 'completed'), rec(2, 'voided'), rec(3, 'completed')];
    const setter = vi.fn();

    handleSelectAll(page, [], true, setter as never);

    expect(setter).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('已全选时再点一次 → 只取消当前页，不影响其它页已勾选', () => {
    const page = [rec(3, 'completed')];
    const setter = vi.fn();

    handleSelectAll(page, [1, 2, 3], false, setter as never); // 第 1、2 条来自其它页

    expect(setter).toHaveBeenCalledWith([1, 2]);
  });

  it('跨页勾选后 isAllSelected 只按当前页判定（长度相等判定会误判）', () => {
    const page = [rec(1, 'completed'), rec(2, 'completed')];
    // 已勾选 4 条（含其它页 2 条），但当前页 2 条都勾了 → 应判定为"已全选"
    expect(isAllSelected(page, [1, 2, 3, 4])).toBe(true);
    // 当前页只勾了 1 条 → 未全选
    expect(isAllSelected(page, [1, 3, 4])).toBe(false);
  });

  it('空列表不算全选（避免空页面显示"全不选"）', () => {
    expect(isAllSelected([], [])).toBe(false);
  });
});
