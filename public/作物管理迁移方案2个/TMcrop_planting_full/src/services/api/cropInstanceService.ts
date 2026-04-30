/**
 * 作物实例 Service - API 实现
 */

import { CropInstance, CropInstanceStatus, CropTraceChain } from '@/types/crop';
import { ICropInstanceService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixInstance(item: any): CropInstance {
  return {
    ...item,
    seedEntryDate: item.seed_entry_date || item.seedEntryDate,
    seedlingStartDate: item.seedling_start_date || item.seedlingStartDate,
    plantingDate: item.planting_date || item.plantingDate,
    harvestDate: item.harvest_date || item.harvestDate,
    currentQuantity: item.current_quantity || item.currentQuantity,
    plantedQuantity: item.planted_quantity || item.plantedQuantity,
    harvestedQuantity: item.harvested_quantity || item.harvestedQuantity,
    initialQuantity: item.initial_quantity || item.initialQuantity,
    sourceOrigin: item.source_origin || item.sourceOrigin,
    sourceDescription: item.source_description || item.sourceDescription,
    sourceInstanceId: item.source_instance_id || item.sourceInstanceId,
    categoryCode: item.category_code || item.categoryCode,
    typeCode: item.type_code || item.typeCode,
    subCode: item.sub_code || item.subCode,
    instanceCode: item.instance_code || item.instanceCode,
    orderId: item.order_id || item.orderId,
    orderCode: item.order_code || item.orderCode,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const cropInstanceService: ICropInstanceService = {
  async initInstances() {
    return this.getInstances();
  },
  async getInstances() {
    const res = await apiClient.get<PaginatedResponse<CropInstance>>('/crop-instances');
    return res.data.map(fixInstance);
  },
  async getInstanceById(id) {
    const res = await apiClient.get<any>('/crop-instances/' + id);
    return fixInstance(res);
  },
  async getInstancesByIds(ids) {
    const all = await this.getInstances();
    return all.filter(i => ids.includes(i.id));
  },
  async getInstancesByOrderId(orderId) {
    const res = await apiClient.get<PaginatedResponse<CropInstance>>('/crop-instances?order_id=' + orderId);
    return res.data.map(fixInstance);
  },
  async createInstance(cropInfo, sourceOrigin, initialQuantity, options) {
    const res = await apiClient.post<any>('/crop-instances', {
      crop_category: cropInfo.cropCategory,
      crop_name: cropInfo.cropName,
      crop_variety: cropInfo.cropVariety,
      source_origin: sourceOrigin,
      initial_quantity: initialQuantity,
      order_id: options?.orderId,
      order_code: options?.orderCode,
      source_description: options?.sourceDescription,
      source_instance_id: options?.sourceInstanceId,
    });
    return fixInstance(res);
  },
  async updateInstance(id, updates) {
    const res = await apiClient.put<any>('/crop-instances/' + id, updates);
    return fixInstance(res);
  },
  async deleteInstance(id) {
    await apiClient.del<any>('/crop-instances/' + id);
    return true;
  },
  async deleteInstances(ids) {
    await apiClient.del<any>('/crop-instances', { ids });
    return true;
  },
  async updateQuantity(id, type, quantity) {
    await apiClient.put<any>('/crop-instances/' + id + '/quantity', { type, quantity });
    return true;
  },
  async updateStatus(id, status) {
    await apiClient.put<any>('/crop-instances/' + id + '/status', { status });
    return true;
  },
  async getTraceChain(id) {
    const res = await apiClient.get<any>('/crop-instances/' + id + '/trace-chain');
    return res as CropTraceChain | null;
  },
  async resetInstances() {
    await apiClient.post<any>('/system/clear-all');
  },
};
