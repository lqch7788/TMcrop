// 供应商管理辅助数据（2026-09-28 审计修复：已删除死常量 supplierCategories 与 15 条 mock suppliers，
// 二者全仓无引用且 mock 的 id 形态与 DB TEXT 主键不一致，易被误当数据源）
import { useSupplierCodeRuleStore } from '../../stores';

// 供应商分类数据

// 获取供应商类型中文名称（从Store动态读取，与编码规则页同步）
export const getSupplierTypeName = (code: string): string => {
  const categories = useSupplierCodeRuleStore.getState().categories;
  const category = categories.find(c => c.code === code);
  return category?.name || code;
};

// 供应商数据
