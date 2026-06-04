/**
 * 供应商服务 (V2.1 架构 - 直连 API)
 *
 * 兼容层：保持原函数签名（同步返回），但内部数据源从 useSupplierStore 内存读
 * 业务数据不落任何缓存层（V2.1 铁律：API 直连）
 *
 * 数据流：API → useSupplierStore（内存） → supplierService（兼容层） → 组件
 *
 * 使用方（如 AddModal/EditModal）应优先用 useSupplierStore() 直接订阅
 */

import { useSupplierStore } from '../stores/useSupplierStore';
import { Supplier } from '../components/supplier/types';

/**
 * 触发加载（全量供应商列表）
 * 异步、不阻塞调用方；store 内部有 5 分钟去重
 */
export function initSuppliers(): Supplier[] {
  // 触发后台加载（不 await）
  void useSupplierStore.getState().loadItems();
  // 同步返回当前内存数据（首次可能为空，store 加载完成后组件会重渲染）
  return useSupplierStore.getState().items;
}

/**
 * 同步获取当前内存中全部供应商
 * 注意：首次 mount 时若未触发 loadItems，可能返回空数组
 */
export function getAllSuppliers(): Supplier[] {
  return useSupplierStore.getState().items;
}

/**
 * 关键字搜索（前端内存过滤）
 */
export function searchSuppliers(keyword: string): Supplier[] {
  return useSupplierStore.getState().search(keyword);
}

/**
 * 根据 ID 查找供应商
 */
export function getSupplierById(id: number): Supplier | undefined {
  return useSupplierStore.getState().items.find(s => s.id === id);
}

/**
 * 合作中的供应商下拉选项
 */
export function getActiveSuppliers(): Array<{ value: string; label: string; code: string }> {
  return useSupplierStore.getState().getActiveOptions();
}
