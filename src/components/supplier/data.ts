// 供应商管理辅助数据（2026-09-28 审计修复：已删除死常量 supplierCategories 与 15 条 mock suppliers，
// 二者全仓无引用且 mock 的 id 形态与 DB TEXT 主键不一致，易被误当数据源）
import { useSupplierCodeRuleStore } from '../../stores';
import { isSupplierSelectable } from '../../stores/useSupplierStore';

// 供应商分类数据

// 获取供应商类型中文名称（从Store动态读取，与编码规则页同步）
export const getSupplierTypeName = (code: string): string => {
  const categories = useSupplierCodeRuleStore.getState().categories;
  const category = categories.find(c => c.code === code);
  return category?.name || code;
};

/**
 * 构建供应商下拉选项（2026-09-29 审计新增）
 *
 * 仅纳入「合作中」的供应商 —— 「暂停/终止」不应能被选中建立新的入库/采购业务。
 * 同时保证 currentValue 一定出现在选项中：历史单据里的供应商名称可能不在主数据里
 * （改名、测试残留等），不放回选项会让 Select 显示空白（项目已知的 placeholder 陷阱）。
 *
 * @param items        供应商列表（Store items）
 * @param currentValue 当前已选值（供应商名称）
 */
export function buildSupplierOptions(
  items: Array<{ name: string; status?: string }>,
  currentValue?: string
): Array<{ value: string; label: string }> {
  const selectable = items.filter((s) => isSupplierSelectable(s.status));
  const options = selectable.map((s) => ({ value: s.name, label: s.name }));
  const cur = String(currentValue ?? '').trim();
  if (cur && !options.some((o) => o.value === cur)) {
    options.unshift({ value: cur, label: `${cur}（不在供应商主数据）` });
  }
  return options;
}

// 供应商数据
