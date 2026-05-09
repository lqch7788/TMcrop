/**
 * 作物编码规则页面类型定义
 */
import {
  produceCategories as initialCategories,
  getProduceTypesByCategory,
  ProduceCategoryCode,
  ProduceCategory,
  ProduceType,
  ProduceSubType,
} from '../../../../data/produceCodeRule';

/** 分类数据状态 */
export type ProduceCategories = ProduceCategory[];

/** 默认分类数据 */
export const DEFAULT_CATEGORIES = initialCategories;

/** 获取类型列表 */
export const getTypesByCategory = getProduceTypesByCategory;

/** 编辑单元格类型 */
export type EditCellType = 'category' | 'type' | 'sub';

/** 编辑状态 */
export interface EditingCell {
  type: EditCellType;
  categoryCode: string;
  typeCode?: string;
  subCode?: string;
}

/** 添加类型弹窗状态 */
export interface AddTypeState {
  categoryCode: string;
}

/** 添加品种弹窗状态 */
export interface AddSubState {
  categoryCode: string;
  typeCode: string;
}

/** 添加子品种1弹窗状态 */
export interface AddSubVariety1State {
  categoryCode: string;
  typeCode: string;
  subCode: string;
}

/** 深拷贝函数 */
export function deepCloneCategories<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
