/**
 * 作物品种库扩展服务
 * 调用后端 API 存储用户新增的类型、品种、子品种
 * API 直连版本（V2.1 铁律）
 */

import type {
  CategoryExtension,
  TypeExtension,
  VarietyExtension,
  SubVariety1Extension
} from './apiCropVarietyExtensionService';
import {
  getAllCategoryExtensions,
  addCategoryExtension as apiAddCategoryExtension,
  deleteCategoryExtension,
  updateCategoryExtension as apiUpdateCategoryExtension,
  getAllTypeExtensions,
  getTypeExtensionsByCategory,
  addTypeExtension as apiAddTypeExtension,
  deleteTypeExtension,
  updateTypeExtension as apiUpdateTypeExtension,
  getAllVarietyExtensions,
  getVarietyExtensionsByType,
  addVarietyExtension as apiAddVarietyExtension,
  deleteVarietyExtension,
  updateVarietyExtension as apiUpdateVarietyExtension,
  getAllSubVariety1Extensions,
  getSubVariety1ExtensionsByVariety,
  addSubVariety1Extension as apiAddSubVariety1Extension,
  deleteSubVariety1Extension,
  updateSubVariety1Extension as apiUpdateSubVariety1Extension
} from './apiCropVarietyExtensionService';
import {
  getSubVariety1Options as getConfigSubVariety1Options,
  getTypeOptionsByCategory as getConfigTypeOptionsByCategory,
  getVarietyOptionsByType as getConfigVarietyOptionsByType
} from './cropVarietyService';

export { CategoryExtension, TypeExtension, VarietyExtension, SubVariety1Extension };

// 内存缓存
let categoryExtensionsCache: CategoryExtension[] = [];
let typeExtensionsCache: TypeExtension[] = [];
let varietyExtensionsCache: VarietyExtension[] = [];
let subVariety1ExtensionsCache: SubVariety1Extension[] = [];
let isCacheInitialized = false;

// 初始化缓存
export async function initExtensionCache(): Promise<void> {
  if (isCacheInitialized) return;
  try {
    const [categories, types, varieties, subVarieties] = await Promise.all([
      getAllCategoryExtensions(),
      getAllTypeExtensions(),
      getAllVarietyExtensions(),
      getAllSubVariety1Extensions()
    ]);
    categoryExtensionsCache = categories;
    typeExtensionsCache = types;
    varietyExtensionsCache = varieties;
    subVariety1ExtensionsCache = subVarieties;
    isCacheInitialized = true;
  } catch (error) {
    console.error('初始化扩展缓存失败:', error);
  }
}

// 强制刷新缓存
async function refreshCache(): Promise<void> {
  try {
    const [categories, types, varieties, subVarieties] = await Promise.all([
      getAllCategoryExtensions(),
      getAllTypeExtensions(),
      getAllVarietyExtensions(),
      getAllSubVariety1Extensions()
    ]);
    categoryExtensionsCache = categories;
    typeExtensionsCache = types;
    varietyExtensionsCache = varieties;
    subVariety1ExtensionsCache = subVarieties;
  } catch (error) {
    console.error('刷新扩展缓存失败:', error);
    throw error;
  }
}

// ==================== 类别扩展 ====================

/** 获取所有扩展类别 */
export function getCategoryExtensions(): CategoryExtension[] {
  return categoryExtensionsCache.filter(c => c.status !== 'inactive');
}

/** 添加类别扩展 */
export async function addCategoryExtension(
  categoryCode: string,
  categoryName: string
): Promise<void> {
  const exists = categoryExtensionsCache.some(c => c.category_code === categoryCode);
  if (exists) {
    throw new Error('该类别编码已存在');
  }
  await apiAddCategoryExtension(categoryCode, categoryName);
  await refreshCache();
}

/** 删除类别扩展 */
export async function removeCategoryExtension(id: string): Promise<void> {
  await deleteCategoryExtension(id);
  await refreshCache();
}

/** 更新类别扩展 */
export async function updateCategoryExtension(
  id: string,
  categoryName: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  await apiUpdateCategoryExtension(id, categoryName, sortOrder, status);
  await refreshCache();
}

// 获取指定类别的所有扩展类型
export function getTypeExtensions(categoryCode: string): TypeExtension[] {
  return typeExtensionsCache.filter(t => t.category_code === categoryCode);
}

// 添加类型扩展
export async function addTypeExtension(
  categoryCode: string,
  typeCode: string,
  typeName: string
): Promise<void> {
  // 检查是否已存在
  const exists = typeExtensionsCache.some(
    t => t.category_code === categoryCode && t.type_code === typeCode
  );
  if (exists) {
    throw new Error('该类型编码已存在');
  }

  await apiAddTypeExtension(categoryCode, '', typeCode, typeName);
  await refreshCache();
}

// 删除类型扩展
export async function removeTypeExtension(id: string): Promise<void> {
  await deleteTypeExtension(id);
  await refreshCache();
}

// 更新类型扩展
export async function updateTypeExtension(
  id: string,
  typeName: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  await apiUpdateTypeExtension(id, typeName, sortOrder, status);
  await refreshCache();
}

// 获取指定类型的所有扩展品种
export function getVarietyExtensions(categoryCode: string, typeCode: string): VarietyExtension[] {
  return varietyExtensionsCache.filter(
    v => v.category_code === categoryCode && v.type_code === typeCode
  );
}

// 添加品种扩展
export async function addVarietyExtension(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  varietyName: string
): Promise<void> {
  // 检查是否已存在
  const exists = varietyExtensionsCache.some(
    v => v.category_code === categoryCode && v.type_code === typeCode && v.variety_code === varietyCode
  );
  if (exists) {
    throw new Error('该品种编码已存在');
  }

  await apiAddVarietyExtension(categoryCode, typeCode, varietyCode, varietyName);
  await refreshCache();
}

// 删除品种扩展
export async function removeVarietyExtension(id: string): Promise<void> {
  await deleteVarietyExtension(id);
  await refreshCache();
}

// 更新品种扩展
export async function updateVarietyExtension(
  id: string,
  varietyName: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  await apiUpdateVarietyExtension(id, varietyName, sortOrder, status);
  await refreshCache();
}

// 获取指定类别的类型选项（合并预配置和扩展数据）
export function getTypeOptionsByCategory(
  categoryCode: string
): Array<{ value: string; label: string }> {
  // 从预配置数据获取类型选项
  const configOptions = getConfigTypeOptionsByCategory(categoryCode);

  // 从扩展缓存获取用户新增的类型
  const extensions = typeExtensionsCache.filter(
    t => t.category_code === categoryCode
  );

  const extensionOptions = extensions.map(e => ({
    value: e.type_code,
    label: e.type_name
  }));

  // 合并选项（扩展选项在前，预配置选项在后去重）
  const allOptions = [...extensionOptions];
  configOptions.forEach(opt => {
    if (!allOptions.some(o => o.value === opt.value)) {
      allOptions.push(opt);
    }
  });

  return allOptions;
}

// 获取指定类型下的品种选项（合并预配置和扩展数据）
export function getVarietyOptionsByType(
  categoryCode: string,
  typeCode: string
): Array<{ value: string; label: string }> {
  // 从预配置数据获取品种选项
  const configOptions = getConfigVarietyOptionsByType(categoryCode, typeCode);

  // 从扩展缓存获取用户新增的品种
  const extensions = varietyExtensionsCache.filter(
    v => v.category_code === categoryCode && v.type_code === typeCode
  );

  const extensionOptions = extensions.map(e => ({
    value: e.variety_code,
    label: e.variety_name
  }));

  // 合并选项（扩展选项在前，预配置选项在后去重）
  const allOptions = [...extensionOptions];
  configOptions.forEach(opt => {
    if (!allOptions.some(o => o.value === opt.value)) {
      allOptions.push(opt);
    }
  });

  return allOptions;
}

// 获取指定品种的所有扩展子品种1
export function getSubVariety1Extensions(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): SubVariety1Extension[] {
  return subVariety1ExtensionsCache.filter(
    s => s.category_code === categoryCode && s.type_code === typeCode && s.variety_code === varietyCode
  );
}

// 获取指定品种的子品种选项（合并预配置和扩展数据）
export function getSubVariety1Options(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): Array<{ value: string; label: string }> {
  // 从预配置数据获取子品种选项
  const configOptions = getConfigSubVariety1Options(categoryCode, typeCode, varietyCode);

  // 从扩展缓存获取用户新增的子品种
  const extensions = subVariety1ExtensionsCache.filter(
    s => s.category_code === categoryCode && s.type_code === typeCode && s.variety_code === varietyCode
  );

  const extensionOptions = extensions.map(e => ({
    value: e.sub_variety1_code,
    label: e.sub_variety1_name
  }));

  // 合并选项（扩展选项在前，预配置选项在后去重）
  const allOptions = [...extensionOptions];
  configOptions.forEach(opt => {
    if (!allOptions.some(o => o.value === opt.value)) {
      allOptions.push(opt);
    }
  });

  return allOptions;
}

// 添加子品种1扩展
export async function addSubVariety1Extension(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string,
  subVariety1Name: string
): Promise<void> {
  // 检查是否已存在
  const exists = subVariety1ExtensionsCache.some(
    s => s.category_code === categoryCode &&
         s.type_code === typeCode &&
         s.variety_code === varietyCode &&
         s.sub_variety1_code === subVariety1Code
  );
  if (exists) {
    throw new Error('该子品种编码已存在');
  }

  await apiAddSubVariety1Extension(categoryCode, typeCode, varietyCode, subVariety1Code, subVariety1Name);
  await refreshCache();
}

// 删除子品种1扩展
export async function removeSubVariety1Extension(id: string): Promise<void> {
  await deleteSubVariety1Extension(id);
  await refreshCache();
}

// 更新子品种1扩展
export async function updateSubVariety1Extension(
  id: string,
  subVariety1Name: string,
  sortOrder?: number,
  status?: string
): Promise<void> {
  await apiUpdateSubVariety1Extension(id, subVariety1Name, sortOrder, status);
  await refreshCache();
}

// 获取所有扩展数据（用于调试）
export function getAllExtensions() {
  return {
    types: typeExtensionsCache,
    varieties: varietyExtensionsCache,
    subVariety1s: subVariety1ExtensionsCache
  };
}
