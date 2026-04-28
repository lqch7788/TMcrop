/**
 * 作物品种库服务
 * 单一数据源，提供品种的 CRUD 和搜索功能
 */

import {
  CropVariety,
  CreateCropVarietyInput,
  UpdateCropVarietyInput,
  CropVarietyOption,
  CropVarietySearchResult,
  CropVarietyStatus
} from '../types/cropVariety';
import {
  produceCategories,
  getProduceTypesByCategory,
  ProduceCategoryCode,
  ProduceCodeInfo,
  findProduceCodeByName
} from '../data/produceCodeRule';

// localStorage 存储键
const STORAGE_KEY = 'crop_varieties';

// 品种库初始化状态
let isInitialized = false;

// ============================================
// 默认品种数据（从 produceCodeRule 导入）
// ============================================

/**
 * 从 produceCodeRule 导入默认品种数据
 * 编码结构：类别(2) + 类型(2) + 品种(2) + 子品种1(3) = 9位
 * 注意：子品种2（详细名称）由用户在录入时手工输入
 */
function importDefaultVarieties(): CropVariety[] {
  const varieties: CropVariety[] = [];
  let index = 1;

  for (const category of produceCategories) {
    const types = getProduceTypesByCategory(category.code);

    for (const type of types) {
      for (const sub of type.subCategories) {
        // 检查是否有子品种配置
        if (sub.subVarieties && sub.subVarieties.length > 0) {
          // 有子品种1配置
          for (const subVar of sub.subVarieties) {
            const sub1Code = subVar.code.padStart(3, '0');
            const cropCode = `${category.code}${type.code}${sub.code}${sub1Code}`;
            varieties.push({
              id: `CV${String(index).padStart(4, '0')}`,
              cropCode,
              categoryCode: category.code,
              categoryName: category.name,
              typeCode: type.code,
              typeName: type.name,
              varietyCode: sub.code,
              varietyName: sub.name,
              subVariety1Code: sub1Code,
              subVariety1Name: subVar.name,
              status: 'active',
              createTime: new Date().toLocaleString('zh-CN'),
              updateTime: new Date().toLocaleString('zh-CN')
            });
            index++;
          }
        } else {
          // 没有子品种的基础品种
          const cropCode = `${category.code}${type.code}${sub.code}000`;
          varieties.push({
            id: `CV${String(index).padStart(4, '0')}`,
            cropCode,
            categoryCode: category.code,
            categoryName: category.name,
            typeCode: type.code,
            typeName: type.name,
            varietyCode: sub.code,
            varietyName: sub.name,
            status: 'active',
            createTime: new Date().toLocaleString('zh-CN'),
            updateTime: new Date().toLocaleString('zh-CN')
          });
          index++;
        }
      }
    }
  }

  return varieties;
}

// ============================================
// 存储操作
// ============================================

/**
 * 获取本地存储的品种数据
 */
function getStoredVarieties(): CropVariety[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return importDefaultVarieties();
    }
  }
  return importDefaultVarieties();
}

/**
 * 保存品种数据到本地存储
 */
function saveVarieties(varieties: CropVariety[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(varieties));
}

// ============================================
// 服务方法
// ============================================

/**
 * 初始化品种库
 * 首次加载时从 produceCodeRule 导入默认数据
 */
export function initVarieties(): CropVariety[] {
  if (isInitialized) {
    return getStoredVarieties();
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // 首次使用，导入默认数据
    const defaultData = importDefaultVarieties();
    saveVarieties(defaultData);
  }

  isInitialized = true;
  return getStoredVarieties();
}

/**
 * 获取所有品种
 */
export function getAllVarieties(): CropVariety[] {
  initVarieties();
  return getStoredVarieties();
}

/**
 * 按类别获取品种
 */
export function getVarietiesByCategory(categoryCode: string): CropVariety[] {
  const varieties = getAllVarieties();
  return varieties.filter(v => v.categoryCode === categoryCode);
}

/**
 * 根据ID获取品种
 */
export function getVarietyById(id: string): CropVariety | undefined {
  const varieties = getAllVarieties();
  return varieties.find(v => v.id === id);
}

/**
 * 根据编码获取品种
 */
export function getVarietyByCode(cropCode: string): CropVariety | undefined {
  const varieties = getAllVarieties();
  return varieties.find(v => v.cropCode === cropCode);
}

/**
 * 根据品种名称获取品种
 */
export function getVarietyByName(varietyName: string): CropVariety | undefined {
  const varieties = getAllVarieties();
  return varieties.find(v => v.varietyName === varietyName);
}

/**
 * 搜索品种（按编码、名称、别名搜索）
 */
export function searchVarieties(keyword: string): CropVarietySearchResult[] {
  if (!keyword.trim()) {
    return [];
  }

  const varieties = getAllVarieties();
  const lowerKeyword = keyword.toLowerCase().trim();
  const results: CropVarietySearchResult[] = [];

  for (const variety of varieties) {
    // 匹配编码
    if (variety.cropCode.toLowerCase().includes(lowerKeyword)) {
      results.push({ variety, matchField: 'cropCode', matchText: variety.cropCode });
      continue;
    }

    // 匹配品种名称
    if (variety.varietyName.toLowerCase().includes(lowerKeyword)) {
      results.push({ variety, matchField: 'varietyName', matchText: variety.varietyName });
      continue;
    }

    // 匹配别名
    if (variety.alias && variety.alias.some(a => a.toLowerCase().includes(lowerKeyword))) {
      const matchedAlias = variety.alias.find(a => a.toLowerCase().includes(lowerKeyword));
      results.push({ variety, matchField: 'alias', matchText: matchedAlias! });
    }
  }

  return results;
}

/**
 * 获取品种选择器的选项格式（用于下拉选择）
 */
export function getVarietyOptions(): CropVarietyOption[] {
  const varieties = getAllVarieties();
  return varieties
    .filter(v => v.status === 'active')
    .map(v => ({
      value: v.cropCode,
      label: v.varietyName,
      category: v.categoryName,
      categoryCode: v.categoryCode,
      typeName: v.typeName,
      typeCode: v.typeCode,
      varietyCode: v.varietyCode,
      subVariety1Name: v.subVariety1Name,
      subVariety1Code: v.subVariety1Code,
      detailVarietyCode: v.detailVarietyCode,
      alias: v.alias,
      fullPath: `${v.categoryName} > ${v.typeName} > ${v.varietyName}${v.subVariety1Name ? ` > ${v.subVariety1Name}` : ''}${v.detailVarietyCode ? ` > ${v.varietyName}` : ''}`
    }));
}

/**
 * 获取所有类别选项
 */
export function getCategoryOptions(): Array<{ value: string; label: string }> {
  return produceCategories.map(c => ({
    value: c.code,
    label: c.name
  }));
}

/**
 * 根据类别获取类型选项
 */
export function getTypeOptionsByCategory(categoryCode: string): Array<{ value: string; label: string }> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  return types.map(t => ({
    value: t.code,
    label: t.name
  }));
}

/**
 * 根据类别和类型获取品种选项
 */
export function getVarietyOptionsByType(
  categoryCode: string,
  typeCode: string
): Array<{ value: string; label: string }> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];

  return type.subCategories.map(s => ({
    value: s.code,
    label: s.name
  }));
}

/**
 * 根据类别、类型和品种获取子品种1选项
 * 从 produceCodeRule 的预配置数据中获取
 */
export function getSubVariety1Options(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): Array<{ value: string; label: string }> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];

  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety || !variety.subVarieties) return [];

  return variety.subVarieties.map(s => ({
    value: s.code,
    label: s.name
  }));
}

/**
 * 根据类别、类型、品种和子品种1获取子品种2选项
 */
export function getSubVariety2Options(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string
): Array<{ value: string; label: string }> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];

  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety || !variety.subVarieties) return [];

  const subVariety1 = variety.subVarieties.find(s => s.code === subVariety1Code);
  if (!subVariety1 || !subVariety1.subVarieties) return [];

  return subVariety1.subVarieties.map(s => ({
    value: s.code,
    label: s.name
  }));
}

/**
 * 生成新的作物编码
 * @param categoryCode 类别代码
 * @param typeCode 类型代码
 * @param varietyCode 品种代码
 * @param subVariety1Code 子品种1代码（可选，3位）
 * @param detailVarietyCode 详细品种代码（可选，2位）
 * @returns 新的11位作物编码
 */
export function generateCropCode(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string,
  detailVarietyCode?: string
): string {
  // 编码结构：类别(2) + 类型(2) + 品种(2) + 子品种1(3) + 详细品种(2) = 11位
  const sub1 = subVariety1Code ? subVariety1Code.padStart(3, '0') : '000';
  const detail = detailVarietyCode ? detailVarietyCode.padStart(2, '0') : '00';
  return `${categoryCode}${typeCode}${varietyCode}${sub1}${detail}`;
}

/**
 * 获取指定子品种1下的最大详细品种代码
 * @param categoryCode 类别代码
 * @param typeCode 类型代码
 * @param varietyCode 品种代码
 * @param subVariety1Code 子品种1代码
 * @returns 最大代码，没有则返回 '01'
 */
export function getMaxDetailVarietyCode(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string
): string {
  const varieties = getAllVarieties();
  let maxCode = 0;

  for (const v of varieties) {
    if (v.categoryCode === categoryCode &&
        v.typeCode === typeCode &&
        v.varietyCode === varietyCode &&
        v.subVariety1Code === (subVariety1Code || '')) {
      const code = parseInt(v.detailVarietyCode || '0', 10);
      if (code > maxCode) {
        maxCode = code;
      }
    }
  }

  // 返回下一个序号
  const nextCode = maxCode + 1;
  return String(nextCode).padStart(2, '0');
}

/**
 * 新增品种
 */
export function addVariety(input: CreateCropVarietyInput): CropVariety {
  const varieties = getAllVarieties();

  // 生成新编码（包含子品种信息和详细品种代码）
  const cropCode = generateCropCode(
    input.categoryCode,
    input.typeCode,
    input.varietyCode,
    input.subVariety1Code,
    input.detailVarietyCode
  );

  const now = new Date().toLocaleString('zh-CN');
  const newVariety: CropVariety = {
    ...input,
    id: `CV${Date.now()}`,
    cropCode,
    createTime: now,
    updateTime: now
  };

  varieties.push(newVariety);
  saveVarieties(varieties);

  return newVariety;
}

/**
 * 更新品种（仅允许更新 alias, growthCycle, targetYield, yieldUnit, status, remarks, varietyName）
 */
export function updateVariety(id: string, updates: UpdateCropVarietyInput): CropVariety | null {
  const varieties = getStoredVarieties();
  const index = varieties.findIndex(v => v.id === id);

  if (index === -1) return null;

  varieties[index] = {
    ...varieties[index],
    ...updates,
    updateTime: new Date().toLocaleString('zh-CN')
  };

  saveVarieties(varieties);
  return varieties[index];
}

/**
 * 删除品种
 */
export function deleteVariety(id: string): boolean {
  const varieties = getStoredVarieties();
  const filtered = varieties.filter(v => v.id !== id);

  if (filtered.length === varieties.length) return false;

  saveVarieties(filtered);
  return true;
}

/**
 * 停用品种
 */
export function deactivateVariety(id: string): CropVariety | null {
  return updateVariety(id, { status: 'inactive' });
}

/**
 * 启用品种
 */
export function activateVariety(id: string): CropVariety | null {
  return updateVariety(id, { status: 'active' });
}

/**
 * 获取品种统计信息
 */
export function getVarietyStats(): {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
} {
  const varieties = getAllVarieties();
  const stats = {
    total: varieties.length,
    active: 0,
    inactive: 0,
    byCategory: {} as Record<string, number>
  };

  for (const v of varieties) {
    if (v.status === 'active') stats.active++;
    else stats.inactive++;

    if (!stats.byCategory[v.categoryName]) {
      stats.byCategory[v.categoryName] = 0;
    }
    stats.byCategory[v.categoryName]++;
  }

  return stats;
}

/**
 * 重置品种库到默认状态
 */
export function resetVarieties(): void {
  const defaultData = importDefaultVarieties();
  saveVarieties(defaultData);
}

/**
 * 根据作物名称查找品种信息（兼容旧接口）
 */
export function findVarietyByCropName(cropName: string): CropVariety | undefined {
  return getVarietyByName(cropName);
}

/**
 * 根据作物名称获取编码信息（兼容旧接口 findProduceCodeByName）
 */
export function getCropCodeInfo(cropName: string): ProduceCodeInfo | null {
  return findProduceCodeByName(cropName);
}

/**
 * 检测品种重名
 * @param categoryCode 类别代码
 * @param typeCode 类型代码
 * @param varietyCode 品种代码
 * @param subVariety1Code 子品种1代码
 * @param subVariety2Code 子品种2代码
 * @param varietyName 品种名称
 * @param excludeId 排除的ID（编辑时用）
 * @returns 如果重名返回重名的品种信息，否则返回null
 */
export function checkDuplicateVariety(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string | undefined,
  subVariety2Code: string | undefined,
  varietyName: string,
  excludeId?: string
): { isDuplicate: boolean; existingVariety?: CropVariety } {
  const varieties = getAllVarieties();

  for (const v of varieties) {
    // 排除自己（编辑时）
    if (excludeId && v.id === excludeId) continue;

    // 完全匹配检查：类别+类型+品种+子品种1+子品种2+名称
    if (v.categoryCode === categoryCode &&
        v.typeCode === typeCode &&
        v.varietyCode === varietyCode &&
        v.subVariety1Code === (subVariety1Code || '') &&
        v.subVariety2Code === (subVariety2Code || '') &&
        v.varietyName === varietyName) {
      return { isDuplicate: true, existingVariety: v };
    }
  }

  return { isDuplicate: false };
}

/**
 * 获取指定父级下的最大子品种代码
 * @param categoryCode 类别代码
 * @param typeCode 类型代码
 * @param varietyCode 品种代码
 * @param subVariety1Code 子品种1代码（可选）
 * @returns 最大代码，没有则返回 '00'
 */
export function getMaxSubVarietyCode(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string
): string {
  const varieties = getAllVarieties();
  let maxCode = 0;

  for (const v of varieties) {
    if (v.categoryCode === categoryCode &&
        v.typeCode === typeCode &&
        v.varietyCode === varietyCode &&
        v.subVariety1Code === (subVariety1Code || '')) {
      // 子品种2代码
      const code = parseInt(v.subVariety2Code || '0', 10);
      if (code > maxCode) {
        maxCode = code;
      }
    }
  }

  return String(maxCode).padStart(2, '0');
}

/**
 * 获取指定子品种1下的最大子品种2代码
 */
export function getMaxSubVariety2Code(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string
): string {
  const varieties = getAllVarieties();
  let maxCode = 0;

  for (const v of varieties) {
    if (v.categoryCode === categoryCode &&
        v.typeCode === typeCode &&
        v.varietyCode === varietyCode &&
        v.subVariety1Code === subVariety1Code) {
      const code = parseInt(v.subVariety2Code || '0', 10);
      if (code > maxCode) {
        maxCode = code;
      }
    }
  }

  return String(maxCode).padStart(2, '0');
}
