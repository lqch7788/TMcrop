/**
 * 品种库 Service - API 实现
 */

import {
  CropVariety, CreateCropVarietyInput, UpdateCropVarietyInput,
  CropVarietyOption, CropVarietySearchResult,
} from '@/types/cropVariety';
import { ProduceCodeInfo } from '@/data/produceCodeRule';
import { ICropVarietyService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixVariety(item: any): CropVariety {
  return {
    ...item,
    alias: typeof item.alias === 'string' ? JSON.parse(item.alias || '[]') : (item.alias || []),
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
    categoryCode: item.category_code || item.categoryCode,
    categoryName: item.category_name || item.categoryName,
    typeCode: item.type_code || item.typeCode,
    typeName: item.type_name || item.typeName,
    varietyCode: item.variety_code || item.varietyCode,
    varietyName: item.variety_name || item.varietyName,
    subVariety1Code: item.sub_variety1_code || item.subVariety1Code,
    subVariety1Name: item.sub_variety1_name || item.subVariety1Name,
    subVariety2Code: item.sub_variety2_code || item.subVariety2Code,
    subVariety2Name: item.sub_variety2_name || item.subVariety2Name,
    detailVarietyCode: item.detail_variety_code || item.detailVarietyCode,
    growthCycle: item.growth_cycle || item.growthCycle,
    targetYield: item.target_yield || item.targetYield,
    yieldUnit: item.yield_unit || item.yieldUnit,
  };
}

export const cropVarietyService: ICropVarietyService = {
  async initVarieties() {
    return this.getAllVarieties();
  },
  async getAllVarieties() {
    const res = await apiClient.get<PaginatedResponse<CropVariety>>('/crop-varieties');
    return res.data.map(fixVariety);
  },
  async getVarietiesByCategory(categoryCode) {
    const res = await apiClient.get<any>('/crop-varieties/filter/category/' + categoryCode);
    return (res || []).map(fixVariety);
  },
  async getVarietyById(id) {
    const res = await apiClient.get<any>('/crop-varieties/' + id);
    return fixVariety(res);
  },
  async getVarietyByCode(cropCode) {
    const res = await apiClient.get<any>('/crop-varieties/by-code/' + cropCode);
    return fixVariety(res);
  },
  async getVarietyByName(varietyName) {
    const res = await apiClient.get<PaginatedResponse<CropVariety>>('/crop-varieties?q=' + varietyName);
    const found = res.data.find(v => v.varietyName === varietyName);
    return found ? fixVariety(found) : undefined;
  },
  async searchVarieties(keyword) {
    const res = await apiClient.get<PaginatedResponse<CropVariety>>('/crop-varieties?q=' + keyword);
    return res.data.map(v => ({ variety: fixVariety(v), matchField: 'varietyName', matchText: v.varietyName } as CropVarietySearchResult));
  },
  async getVarietyOptions() {
    const all = await this.getAllVarieties();
    return all
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
        fullPath: v.categoryName + ' > ' + v.typeName + ' > ' + v.varietyName + (v.subVariety1Name ? ' > ' + v.subVariety1Name : '') + (v.detailVarietyCode ? ' > ' + v.varietyName : ''),
      } as CropVarietyOption));
  },
  async getCategoryOptions() {
    const all = await this.getAllVarieties();
    const map = new Map<string, string>();
    for (const v of all) map.set(v.categoryCode, v.categoryName);
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  },
  async getTypeOptionsByCategory(categoryCode) {
    const all = await this.getAllVarieties();
    const map = new Map<string, string>();
    for (const v of all) {
      if (v.categoryCode === categoryCode) map.set(v.typeCode, v.typeName);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  },
  async getVarietyOptionsByType(categoryCode, typeCode) {
    const all = await this.getAllVarieties();
    const map = new Map<string, string>();
    for (const v of all) {
      if (v.categoryCode === categoryCode && v.typeCode === typeCode) map.set(v.varietyCode, v.varietyName);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  },
  async getSubVariety1Options(categoryCode, typeCode, varietyCode) {
    const all = await this.getAllVarieties();
    const map = new Map<string, string>();
    for (const v of all) {
      if (v.categoryCode === categoryCode && v.typeCode === typeCode && v.varietyCode === varietyCode) {
        if (v.subVariety1Code) map.set(v.subVariety1Code, v.subVariety1Name || '');
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  },
  async getSubVariety2Options(categoryCode, typeCode, varietyCode, subVariety1Code) {
    const all = await this.getAllVarieties();
    const map = new Map<string, string>();
    for (const v of all) {
      if (v.categoryCode === categoryCode && v.typeCode === typeCode && v.varietyCode === varietyCode && v.subVariety1Code === subVariety1Code) {
        if (v.subVariety2Code) map.set(v.subVariety2Code, v.subVariety2Name || '');
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  },
  async generateCropCode(categoryCode, typeCode, varietyCode, subVariety1Code, detailVarietyCode) {
    const sub1 = subVariety1Code ? subVariety1Code.padStart(3, '0') : '000';
    const detail = detailVarietyCode ? detailVarietyCode.padStart(2, '0') : '00';
    return categoryCode + typeCode + varietyCode + sub1 + detail;
  },
  async getMaxDetailVarietyCode(categoryCode, typeCode, varietyCode, subVariety1Code) {
    const res = await apiClient.get<any>('/crop-varieties/max-detail-code?categoryCode=' + categoryCode + '&typeCode=' + typeCode + '&varietyCode=' + varietyCode + '&subVariety1Code=' + (subVariety1Code || ''));
    return res.nextCode || '01';
  },
  async addVariety(input) {
    const res = await apiClient.post<any>('/crop-varieties', input);
    return fixVariety(res);
  },
  async updateVariety(id, updates) {
    const res = await apiClient.put<any>('/crop-varieties/' + id, updates);
    return fixVariety(res);
  },
  async deleteVariety(id) {
    await apiClient.del<any>('/crop-varieties/' + id);
    return true;
  },
  async deactivateVariety(id) {
    return this.updateVariety(id, { status: 'inactive' });
  },
  async activateVariety(id) {
    return this.updateVariety(id, { status: 'active' });
  },
  async getVarietyStats() {
    const res = await apiClient.get<any>('/crop-varieties/stats/overview');
    return res;
  },
  async resetVarieties() {
    await apiClient.post<any>('/system/clear-all');
  },
  async findVarietyByCropName(cropName) {
    return this.getVarietyByName(cropName);
  },
  async getCropCodeInfo(cropName) {
    const v = await this.getVarietyByName(cropName);
    if (!v) return null;
    return {
      categoryCode: v.categoryCode,
      typeCode: v.typeCode,
      varietyCode: v.varietyCode,
      subVariety1Code: v.subVariety1Code,
      subVariety2Code: v.subVariety2Code,
      detailVarietyCode: v.detailVarietyCode,
      name: v.varietyName,
    } as ProduceCodeInfo;
  },
  async checkDuplicateVariety(categoryCode, typeCode, varietyCode, subVariety1Code, subVariety2Code, varietyName, excludeId) {
    const all = await this.getAllVarieties();
    for (const v of all) {
      if (excludeId && v.id === excludeId) continue;
      if (v.categoryCode === categoryCode && v.typeCode === typeCode && v.varietyCode === varietyCode &&
          v.subVariety1Code === (subVariety1Code || '') && v.subVariety2Code === (subVariety2Code || '') &&
          v.varietyName === varietyName) {
        return { isDuplicate: true, existingVariety: v };
      }
    }
    return { isDuplicate: false };
  },
  async getMaxSubVarietyCode(categoryCode, typeCode, varietyCode, subVariety1Code) {
    const all = await this.getAllVarieties();
    let maxCode = 0;
    for (const v of all) {
      if (v.categoryCode === categoryCode && v.typeCode === typeCode && v.varietyCode === varietyCode && v.subVariety1Code === (subVariety1Code || '')) {
        const code = parseInt(v.subVariety2Code || '0', 10);
        if (!isNaN(code) && code > maxCode) maxCode = code;
      }
    }
    return String(maxCode).padStart(2, '0');
  },
  async getMaxSubVariety2Code(categoryCode, typeCode, varietyCode, subVariety1Code) {
    return this.getMaxSubVarietyCode(categoryCode, typeCode, varietyCode, subVariety1Code);
  },
};
