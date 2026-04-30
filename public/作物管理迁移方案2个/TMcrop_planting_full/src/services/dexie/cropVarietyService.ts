/**
 * 作物品种库 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 * 单一数据源，提供品种的 CRUD 和搜索功能
 */

import { db } from './db';
import { ICropVarietyService } from '../interfaces';
import {
  CropVariety, CreateCropVarietyInput, UpdateCropVarietyInput,
  CropVarietyOption, CropVarietySearchResult,
} from '@/types/cropVariety';
import {
  produceCategories,
  getProduceTypesByCategory,
  ProduceCategoryCode,
  ProduceCodeInfo,
  findProduceCodeByName,
} from '@/data/produceCodeRule';
import { nowString, generateId } from './utils';

const TABLE = db.cropVarieties;
const VERSION_KEY = 'dexie_crop_varieties_version';
const CURRENT_VERSION = 2;

/**
 * 从 produceCodeRule 导入默认品种数据
 */
function importDefaultVarieties(): CropVariety[] {
  const varieties: CropVariety[] = [];
  let index = 1;

  for (const category of produceCategories) {
    const types = getProduceTypesByCategory(category.code);
    for (const type of types) {
      for (const sub of type.subCategories) {
        if (sub.subVarieties && sub.subVarieties.length > 0) {
          for (const subVar of sub.subVarieties) {
            const sub1Code = subVar.code.padStart(3, '0');
            const cropCode = `${category.code}${type.code}${sub.code}${sub1Code}00`;
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
              detailVarietyCode: '00',
              status: 'active',
              createTime: nowString(),
              updateTime: nowString(),
            });
            index++;
          }
        } else {
          const cropCode = `${category.code}${type.code}${sub.code}00000`;
          varieties.push({
            id: `CV${String(index).padStart(4, '0')}`,
            cropCode,
            categoryCode: category.code,
            categoryName: category.name,
            typeCode: type.code,
            typeName: type.name,
            varietyCode: sub.code,
            varietyName: sub.name,
            detailVarietyCode: '00',
            status: 'active',
            createTime: nowString(),
            updateTime: nowString(),
          });
          index++;
        }
      }
    }
  }

  return varieties;
}

/**
 * 迁移旧版本数据
 */
function migrateDataToV2(varieties: CropVariety[]): CropVariety[] {
  return varieties.map(v => {
    if (v.cropCode && v.cropCode.length === 11) return v;
    if (v.cropCode && v.cropCode.length === 9) {
      return { ...v, cropCode: v.cropCode + '00', detailVarietyCode: '00' };
    }
    return v;
  });
}

/**
 * 检查并执行版本迁移
 */
async function checkMigration(): Promise<void> {
  const version = localStorage.getItem(VERSION_KEY);
  if (!version || parseInt(version, 10) < CURRENT_VERSION) {
    const varieties = await TABLE.toArray();
    if (varieties.length > 0) {
      const migrated = migrateDataToV2(varieties);
      await TABLE.clear();
      await TABLE.bulkAdd(migrated);
    }
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
  }
}

export async function initVarieties(): Promise<CropVariety[]> {
  const count = await TABLE.count();
  if (count === 0) {
    const defaultData = importDefaultVarieties();
    await TABLE.bulkAdd(defaultData);
    localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
    return defaultData;
  }
  await checkMigration();
  return TABLE.toArray();
}

export async function getAllVarieties(): Promise<CropVariety[]> {
  await initVarieties();
  return TABLE.toArray();
}

export async function getVarietiesByCategory(categoryCode: string): Promise<CropVariety[]> {
  return TABLE.where('categoryCode').equals(categoryCode).toArray();
}

export async function getVarietyById(id: string): Promise<CropVariety | undefined> {
  return TABLE.get(id);
}

export async function getVarietyByCode(cropCode: string): Promise<CropVariety | undefined> {
  return TABLE.where('cropCode').equals(cropCode).first();
}

export async function getVarietyByName(varietyName: string): Promise<CropVariety | undefined> {
  return TABLE.where('varietyName').equals(varietyName).first();
}

export async function searchVarieties(keyword: string): Promise<CropVarietySearchResult[]> {
  if (!keyword.trim()) return [];
  const lower = keyword.toLowerCase().trim();

  const varieties = await TABLE.toArray();
  const results: CropVarietySearchResult[] = [];

  for (const variety of varieties) {
    if (variety.cropCode.toLowerCase().includes(lower)) {
      results.push({ variety, matchField: 'cropCode', matchText: variety.cropCode });
      continue;
    }
    if (variety.varietyName.toLowerCase().includes(lower)) {
      results.push({ variety, matchField: 'varietyName', matchText: variety.varietyName });
      continue;
    }
    if (variety.subVariety1Name && variety.subVariety1Name.toLowerCase().includes(lower)) {
      results.push({ variety, matchField: 'alias' as any, matchText: variety.subVariety1Name });
      continue;
    }
    if (variety.alias && variety.alias.some(a => a.toLowerCase().includes(lower))) {
      const matchedAlias = variety.alias.find(a => a.toLowerCase().includes(lower));
      results.push({ variety, matchField: 'alias', matchText: matchedAlias! });
    }
  }

  return results;
}

export async function getVarietyOptions(): Promise<CropVarietyOption[]> {
  const varieties = await TABLE.where('status').equals('active').toArray();
  return varieties.map(v => ({
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
    fullPath: `${v.categoryName} > ${v.typeName} > ${v.varietyName}${v.subVariety1Name ? ` > ${v.subVariety1Name}` : ''}${v.detailVarietyCode ? ` > ${v.varietyName}` : ''}`,
  }));
}

export async function getCategoryOptions(): Promise<Array<{ value: string; label: string }>> {
  return produceCategories.map(c => ({ value: c.code, label: c.name }));
}

export async function getTypeOptionsByCategory(categoryCode: string): Promise<Array<{ value: string; label: string }>> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  return types.map(t => ({ value: t.code, label: t.name }));
}

export async function getVarietyOptionsByType(
  categoryCode: string,
  typeCode: string
): Promise<Array<{ value: string; label: string }>> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];
  return type.subCategories.map(s => ({ value: s.code, label: s.name }));
}

export async function getSubVariety1Options(
  categoryCode: string,
  typeCode: string,
  varietyCode: string
): Promise<Array<{ value: string; label: string }>> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];
  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety || !variety.subVarieties) return [];
  return variety.subVarieties.map(s => ({ value: s.code, label: s.name }));
}

export async function getSubVariety2Options(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string
): Promise<Array<{ value: string; label: string }>> {
  const types = getProduceTypesByCategory(categoryCode as ProduceCategoryCode);
  const type = types.find(t => t.code === typeCode);
  if (!type) return [];
  const variety = type.subCategories.find(v => v.code === varietyCode);
  if (!variety || !variety.subVarieties) return [];
  const subVariety1 = variety.subVarieties.find(s => s.code === subVariety1Code);
  if (!subVariety1 || !subVariety1.subVarieties) return [];
  return subVariety1.subVarieties.map(s => ({ value: s.code, label: s.name }));
}

export async function generateCropCode(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string,
  detailVarietyCode?: string
): Promise<string> {
  const sub1 = subVariety1Code ? subVariety1Code.padStart(3, '0') : '000';
  const detail = detailVarietyCode ? detailVarietyCode.padStart(2, '0') : '00';
  return `${categoryCode}${typeCode}${varietyCode}${sub1}${detail}`;
}

export async function getMaxDetailVarietyCode(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string
): Promise<string> {
  const varieties = await TABLE.where({
    categoryCode,
    typeCode,
    varietyCode,
    subVariety1Code: subVariety1Code || '',
  }).toArray();

  let maxCode = 0;
  for (const v of varieties) {
    const code = parseInt(v.detailVarietyCode || '0', 10);
    if (code > maxCode) maxCode = code;
  }

  return String(maxCode + 1).padStart(2, '0');
}

export async function addVariety(input: CreateCropVarietyInput): Promise<CropVariety> {
  const cropCode = await generateCropCode(
    input.categoryCode,
    input.typeCode,
    input.varietyCode,
    input.subVariety1Code,
    input.detailVarietyCode,
  );

  const now = nowString();
  const newVariety: CropVariety = {
    ...input,
    id: generateId('CV'),
    cropCode,
    createTime: now,
    updateTime: now,
  };

  await TABLE.add(newVariety);
  return newVariety;
}

export async function updateVariety(id: string, updates: UpdateCropVarietyInput): Promise<CropVariety | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: CropVariety = {
    ...existing,
    ...updates,
    id,
    updateTime: nowString(),
  };
  await TABLE.put(updated);
  return updated;
}

export async function deleteVariety(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;
  await TABLE.delete(id);
  return true;
}

export async function deactivateVariety(id: string): Promise<CropVariety | null> {
  return updateVariety(id, { status: 'inactive' });
}

export async function activateVariety(id: string): Promise<CropVariety | null> {
  return updateVariety(id, { status: 'active' });
}

export async function getVarietyStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
}> {
  const varieties = await TABLE.toArray();
  const stats = {
    total: varieties.length,
    active: 0,
    inactive: 0,
    byCategory: {} as Record<string, number>,
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

export async function resetVarieties(): Promise<void> {
  await TABLE.clear();
  const defaultData = importDefaultVarieties();
  await TABLE.bulkAdd(defaultData);
  localStorage.setItem(VERSION_KEY, String(CURRENT_VERSION));
}

export async function findVarietyByCropName(cropName: string): Promise<CropVariety | undefined> {
  return getVarietyByName(cropName);
}

export async function getCropCodeInfo(cropName: string): Promise<ProduceCodeInfo | null> {
  return findProduceCodeByName(cropName);
}

export async function checkDuplicateVariety(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string | undefined,
  subVariety2Code: string | undefined,
  varietyName: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; existingVariety?: CropVariety }> {
  const varieties = await TABLE.toArray();

  for (const v of varieties) {
    if (excludeId && v.id === excludeId) continue;
    if (
      v.categoryCode === categoryCode &&
      v.typeCode === typeCode &&
      v.varietyCode === varietyCode &&
      v.subVariety1Code === (subVariety1Code || '') &&
      v.subVariety2Code === (subVariety2Code || '') &&
      v.varietyName === varietyName
    ) {
      return { isDuplicate: true, existingVariety: v };
    }
  }

  return { isDuplicate: false };
}

export async function getMaxSubVarietyCode(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code?: string
): Promise<string> {
  const varieties = await TABLE.where({
    categoryCode,
    typeCode,
    varietyCode,
    subVariety1Code: subVariety1Code || '',
  }).toArray();

  let maxCode = 0;
  for (const v of varieties) {
    const code = parseInt(v.subVariety2Code || '0', 10);
    if (code > maxCode) maxCode = code;
  }

  return String(maxCode).padStart(2, '0');
}

export async function getMaxSubVariety2Code(
  categoryCode: string,
  typeCode: string,
  varietyCode: string,
  subVariety1Code: string
): Promise<string> {
  const varieties = await TABLE.where({
    categoryCode,
    typeCode,
    varietyCode,
    subVariety1Code,
  }).toArray();

  let maxCode = 0;
  for (const v of varieties) {
    const code = parseInt(v.subVariety2Code || '0', 10);
    if (code > maxCode) maxCode = code;
  }

  return String(maxCode).padStart(2, '0');
}
