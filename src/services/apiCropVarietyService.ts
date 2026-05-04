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
 * 获取所有作物品种
 */
export async function getAllVarieties(): Promise<CropVariety[]> {
  if (USE_API) {
    return apiClient.get<CropVariety[]>('/crop-varieties');
  }
  // 回退到本地服务
  return localService.getAllVarieties();
}

/**
 * 根据ID获取单个品种
 */
export async function getVarietyById(id: string): Promise<CropVariety | undefined> {
  if (USE_API) {
    return apiClient.get<CropVariety>(`/crop-varieties/${id}`);
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
    return all.filter(v => v.variety_name?.includes(cropName) || v.type_name?.includes(cropName));
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
    return all.find(v => v.crop_code === cropCode);
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
  // 优先精确匹配 sub_variety1_name，然后匹配 variety_name
  let variety = all.find(v => v.sub_variety1_name === varietyName);
  if (!variety) {
    variety = all.find(v => v.variety_name === varietyName);
  }
  if (!variety) {
    // 尝试模糊匹配
    variety = all.find(v =>
      v.variety_name.includes(varietyName) ||
      (v.sub_variety1_name && v.sub_variety1_name.includes(varietyName))
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
  let variety = all.find(v => v.sub_variety1_name === varietyName);
  if (!variety) {
    variety = all.find(v => v.variety_name === varietyName);
  }
  if (!variety) {
    variety = all.find(v =>
      v.variety_name.includes(varietyName) ||
      (v.sub_variety1_name && v.sub_variety1_name.includes(varietyName))
    );
  }
  return variety?.crop_code || '';
}

/**
 * 获取作物品种（最细分品种名称）
 * 所有作物必须有编码！找不到时应返回原始品种名称
 */
export async function getCropVarietyName(varietyName: string): Promise<string> {
  const all = await getAllVarieties();
  let variety = all.find(v => v.sub_variety1_name === varietyName);
  if (!variety) {
    variety = all.find(v => v.variety_name === varietyName);
  }
  if (!variety) {
    variety = all.find(v =>
      v.variety_name.includes(varietyName) ||
      (v.sub_variety1_name && v.sub_variety1_name.includes(varietyName))
    );
  }
  if (!variety) {
    // 品种库中没有该品种，返回原始名称
    return varietyName || '';
  }
  // 返回最细分的品种名称
  return variety.sub_variety1_name || variety.variety_name || '';
}

/**
 * 构建品种路径字符串
 */
function buildVarietyPathString(variety: CropVariety): string {
  const parts: string[] = [];
  if (variety.category_name) parts.push(variety.category_name);
  if (variety.type_name) parts.push(variety.type_name);
  if (variety.variety_name) parts.push(variety.variety_name);
  if (variety.sub_variety1_name) parts.push(variety.sub_variety1_name);
  return parts.join('-');
}
