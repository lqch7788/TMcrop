/**
 * 作物品种 API 服务
 * 对接后端 /api/crop-varieties
 */

import { apiClient, USE_API } from './apiClient';
import { CropVariety } from '../types/crop';
import { CropVarietyOption } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './cropVarietyService';

/**
 * 初始化品种数据（本地缓存）
 */
export function initVarieties(): CropVariety[] {
  return localService.initVarieties();
}

/**
 * 获取品种选项列表（用于下拉选择）
 */
export function getVarietyOptions(): CropVarietyOption[] {
  return localService.getVarietyOptions();
}

/**
 * 将 snake_case 转换为 camelCase
 */
function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(obj[key]);
  }
  return result;
}

/**
 * 获取所有作物品种
 */
export async function getAllVarieties(): Promise<CropVariety[]> {
  if (USE_API) {
    const data = await apiClient.get<any[]>('/crop-varieties');
    return data.map(snakeToCamel);
  }
  // 回退到本地服务
  return localService.getAllVarieties();
}

/**
 * 根据ID获取单个品种
 */
export async function getVarietyById(id: string): Promise<CropVariety | undefined> {
  if (USE_API) {
    const data = await apiClient.get<any>(`/crop-varieties/${id}`);
    return snakeToCamel(data);
  }
  return localService.getVarietyById(id);
}

/**
 * 创建品种
 */
export async function createVariety(data: Partial<CropVariety>): Promise<string> {
  if (USE_API) {
    const result = await apiClient.post<{ id: string }>('/crop-varieties', data);
    return result.id;
  }
  return localService.createVariety(data);
}

/**
 * 更新品种
 */
export async function updateVariety(id: string, data: Partial<CropVariety>): Promise<string | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/crop-varieties/${id}`, data);
    return result.id;
  }
  return localService.updateVariety(id, data);
}

/**
 * 删除品种
 */
export async function deleteVariety(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/crop-varieties/${id}`);
    return true;
  }
  return localService.deleteVariety(id);
}

/**
 * 根据作物名称查找品种
 */
export async function findByCropName(cropName: string): Promise<CropVariety[]> {
  if (USE_API) {
    const all = await getAllVarieties();
    return all.filter(v => v.varietyName?.includes(cropName) || v.typeName?.includes(cropName));
  }
  return localService.findByCropName(cropName);
}

/**
 * 根据作物编码获取品种信息
 * 所有作物必须有编码！品种库中必须存在该编码
 */
export async function getVarietyByCode(cropCode: string): Promise<CropVariety | undefined> {
  if (USE_API) {
    const all = await getAllVarieties();
    return all.find(v => v.cropCode === cropCode);
  }
  return localService.getVarietyByCode(cropCode);
}

/**
 * 获取品种的完整路径字符串
 * 格式：类别名称-类型名称-品种名称-子品种名称
 * 所有作物必须有编码！找不到时应返回空字符串
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
 * @param varietyName 品种名称（最细分品种）
 * 所有作物必须有编码！找不到时应返回原始品种名称
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
 * 所有作物必须有编码！找不到时应返回空字符串，由调用方处理
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
 * 所有作物必须有编码！找不到时应返回原始品种名称
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
