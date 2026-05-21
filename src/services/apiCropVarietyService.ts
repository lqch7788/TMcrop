/**
 * 作物品种 API 服务
 * 对接后端 /api/crop-varieties
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropVariety } from '../types/crop';
import { CropVarietyOption } from '../types/crop';
import * as cropVarietyService from './cropVarietyService';

/**
 * 将 snake_case 转换为 camelCase
 */
function snakeToCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(snakeToCamel);
  if (typeof obj !== 'object') return obj;

  const result: Record<string, unknown> = {};
  for (const key in obj as Record<string, unknown>) {
    const camelKey = key.replace(/_([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
    let value = (obj as Record<string, unknown>)[key];
    // alias 字段从 JSON 字符串解析为数组
    if (key === 'alias' && typeof value === 'string') {
      try { value = JSON.parse(value); } catch { value = []; }
    }
    result[camelKey] = snakeToCamel(value);
  }
  return result;
}

/** 将 camelCase 转换为 snake_case */
function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

/**
 * 初始化品种数据（优先从 API 获取，失败时用本地缓存）
 */
export function initVarieties(): CropVariety[] {
  return cropVarietyService.initVarieties();
}

/**
 * 获取品种选项列表（用于下拉选择，本地缓存）
 */
export function getVarietyOptions(): CropVarietyOption[] {
  return cropVarietyService.getVarietyOptions();
}

/**
 * 获取所有作物品种
 * 降级策略：API → IndexedDB 缓存
 */
export async function getAllVarieties(): Promise<CropVariety[]> {
  const data = await enhancedApiClient.get<Record<string, unknown>[]>('/crop-varieties');
  return data.map(item => snakeToCamel(item) as CropVariety);
}

/**
 * 根据ID获取单个品种
 * 降级策略：API → IndexedDB 缓存
 */
export async function getVarietyById(id: string): Promise<CropVariety | undefined> {
  const data = await enhancedApiClient.get<any>(`/crop-varieties/${id}`);
  return snakeToCamel(data) as CropVariety;
}

/**
 * 创建品种
 * 降级策略：API → 离线队列
 */
export async function createVariety(data: Partial<CropVariety>): Promise<string> {
  const snakeData = camelToSnake(data as Record<string, unknown>);
  const result = await enhancedApiClient.post<{ id: string }>('/crop-varieties', snakeData);
  return result.id;
}

/**
 * 更新品种
 * 降级策略：API → 离线队列
 */
export async function updateVariety(id: string, data: Partial<CropVariety>): Promise<string | null> {
  const snakeData = camelToSnake(data as Record<string, unknown>);
  const result = await enhancedApiClient.put<{ id: string }>(`/crop-varieties/${id}`, snakeData);
  return result?.id || null;
}

/**
 * 删除品种
 * 降级策略：API → 离线队列
 */
export async function deleteVariety(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/crop-varieties/${id}`);
  return true;
}

/**
 * 批量导入品种（数据迁移用）
 * 将 localStorage 数据批量推送到后端数据库
 */
export async function bulkImportVarieties(varieties: Record<string, unknown>[]): Promise<{ inserted: number; skipped: number; total: number }> {
  const snakeData = varieties.map(v => camelToSnake(v));
  const result = await enhancedApiClient.post<{ inserted: number; skipped: number; total: number }>(
    '/crop-varieties/bulk',
    { varieties: snakeData }
  );
  return result;
}

/**
 * 根据作物名称查找品种
 * 降级策略：API → IndexedDB 缓存
 */
export async function findByCropName(cropName: string): Promise<CropVariety[]> {
  const all = await getAllVarieties();
  return all.filter(v => v.varietyName?.includes(cropName) || v.typeName?.includes(cropName));
}

/**
 * 根据作物编码获取品种信息
 * 降级策略：API → IndexedDB 缓存
 */
export async function getVarietyByCode(cropCode: string): Promise<CropVariety | undefined> {
  const all = await getAllVarieties();
  return all.find(v => v.cropCode === cropCode);
}

/**
 * 获取品种的完整路径字符串
 * 格式：类别名称-类型名称-品种名称-子品种名称
 */
export async function getVarietyPathString(cropCode: string): Promise<string> {
  const variety = await getVarietyByCode(cropCode);
  if (!variety) {
    return '';
  }
  return buildVarietyPathString(variety);
}

/**
 * 根据品种名称查找品种并获取品种路径字符串
 */
export async function getVarietyPathByName(varietyName: string): Promise<string> {
  const all = await getAllVarieties();
  // 优先精确匹配 subVariety1Name，然后匹配 varietyName
  let variety = all.find(v => v.subVariety1Name === varietyName);
  if (!variety) {
    variety = all.find(v => v.varietyName === varietyName);
  }
  if (!variety) {
    // 尝试模糊匹配
    variety = all.find(v =>
      v.varietyName.includes(varietyName) ||
      (v.subVariety1Name && v.subVariety1Name.includes(varietyName))
    );
  }
  if (!variety) {
    // 品种库中没有该品种，返回原始名称
    return varietyName || '';
  }
  return buildVarietyPathString(variety);
}

/**
 * 根据品种名称获取标准作物编码
 */
export async function getStandardCropCode(varietyName: string): Promise<string> {
  const all = await getAllVarieties();
  let variety = all.find(v => v.subVariety1Name === varietyName);
  if (!variety) {
    variety = all.find(v => v.varietyName === varietyName);
  }
  if (!variety) {
    variety = all.find(v =>
      v.varietyName.includes(varietyName) ||
      (v.subVariety1Name && v.subVariety1Name.includes(varietyName))
    );
  }
  return variety?.cropCode || '';
}

/**
 * 获取作物品种（最细分品种名称）
 */
export async function getCropVarietyName(varietyName: string): Promise<string> {
  const all = await getAllVarieties();
  let variety = all.find(v => v.subVariety1Name === varietyName);
  if (!variety) {
    variety = all.find(v => v.varietyName === varietyName);
  }
  if (!variety) {
    variety = all.find(v =>
      v.varietyName.includes(varietyName) ||
      (v.subVariety1Name && v.subVariety1Name.includes(varietyName))
    );
  }
  if (!variety) {
    // 品种库中没有该品种，返回原始名称
    return varietyName || '';
  }
  // 返回最细分的品种名称
  return variety.subVariety1Name || variety.varietyName || '';
}

/**
 * 构建品种路径字符串
 */
function buildVarietyPathString(variety: CropVariety): string {
  const parts: string[] = [];
  if (variety.categoryName) parts.push(variety.categoryName);
  if (variety.typeName) parts.push(variety.typeName);
  if (variety.varietyName) parts.push(variety.varietyName);
  if (variety.subVariety1Name) parts.push(variety.subVariety1Name);
  if (variety.detailVarietyName) parts.push(variety.detailVarietyName);
  return parts.join(' > ');
}
