/**
 * 作物品种库扩展服务
 * 调用后端 API 存储用户新增的类型、品种、子品种
 * 本地缓存版本，使用内存缓存 + API 调用
 */

import type {
  TypeExtension,
  VarietyExtension,
  SubVariety1Extension
} from './apiCropVarietyExtensionService';
import {
  getAllTypeExtensions,
  getTypeExtensionsByCategory,
  addTypeExtension as apiAddTypeExtension,
  deleteTypeExtension,
  getAllVarietyExtensions,
  getVarietyExtensionsByType,
  addVarietyExtension as apiAddVarietyExtension,
  deleteVarietyExtension,
  getAllSubVariety1Extensions,
  getSubVariety1ExtensionsByVariety,
  addSubVariety1Extension as apiAddSubVariety1Extension,
  deleteSubVariety1Extension
} from './apiCropVarietyExtensionService';

export { TypeExtension, VarietyExtension, SubVariety1Extension };

// 内存缓存
let typeExtensionsCache: TypeExtension[] = [];
let varietyExtensionsCache: VarietyExtension[] = [];
let subVariety1ExtensionsCache: SubVariety1Extension[] = [];
let isCacheInitialized = false;

// 初始化缓存
export async function initExtensionCache(): Promise<void> {
  if (isCacheInitialized) return;
  try {
    const [types, varieties, subVarieties] = await Promise.all([
      getAllTypeExtensions(),
      getAllVarietyExtensions(),
      getAllSubVariety1Extensions()
    ]);
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
    const [types, varieties, subVarieties] = await Promise.all([
      getAllTypeExtensions(),
      getAllVarietyExtensions(),
      getAllSubVariety1Extensions()
    ]);
    typeExtensionsCache = types;
    varietyExtensionsCache = varieties;
    subVariety1ExtensionsCache = subVarieties;
  } catch (error) {
    console.error('刷新扩展缓存失败:', error);
    throw error;
  }
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

// 获取所有扩展数据（用于调试）
export function getAllExtensions() {
  return {
    types: typeExtensionsCache,
    varieties: varietyExtensionsCache,
    subVariety1s: subVariety1ExtensionsCache
  };
}
