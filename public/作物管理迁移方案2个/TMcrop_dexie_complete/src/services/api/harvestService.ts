/**
 * 采收 Service - API 实现
 */

import { HarvestRecord } from '@/types';
import { IHarvestService } from '../interfaces';
import { apiClient, PaginatedResponse } from './client';

function fixHarvest(item: any): HarvestRecord {
  return {
    ...item,
    harvesterIds: typeof item.harvester_ids === 'string' ? JSON.parse(item.harvester_ids || '[]') : (item.harvesterIds || []),
    harvesterNames: typeof item.harvester_names === 'string' ? JSON.parse(item.harvester_names || '[]') : (item.harvesterNames || []),
    pictures: typeof item.pictures === 'string' ? JSON.parse(item.pictures || '[]') : (item.pictures || []),
    products: typeof item.products === 'string' ? JSON.parse(item.products || '[]') : (item.products || []),
    relatedTaskId: item.related_task_id || item.relatedTaskId,
    relatedTaskCode: item.related_task_code || item.relatedTaskCode,
    batchId: item.batch_id || item.batchId,
    batchCode: item.batch_code || item.batchCode,
    greenhouseId: item.greenhouse_id || item.greenhouseId,
    greenhouseName: item.greenhouse_name || item.greenhouseName,
    warehouseId: item.warehouse_id || item.warehouseId,
    warehouseName: item.warehouse_name || item.warehouseName,
    harvestDate: item.harvest_date || item.harvestDate,
    harvestArea: item.harvest_area || item.harvestArea,
    harvestQuantity: item.harvest_quantity || item.harvestQuantity,
    harvestCode: item.harvest_code || item.harvestCode,
    targetYield: item.target_yield || item.targetYield,
    plantingMode: item.planting_mode || item.plantingMode,
    createTime: item.created_at || item.createTime,
    updateTime: item.updated_at || item.updateTime,
  };
}

export const harvestService: IHarvestService = {
  async initHarvestRecords() {
    return this.getHarvestRecords();
  },
  async getHarvestRecords() {
    const res = await apiClient.get<PaginatedResponse<HarvestRecord>>('/harvests');
    return res.data.map(fixHarvest);
  },
  async getHarvestRecordById(id) {
    const res = await apiClient.get<any>('/harvests/' + id);
    return fixHarvest(res);
  },
  async getHarvestRecordsByIds(ids) {
    const all = await this.getHarvestRecords();
    return all.filter(r => ids.includes(r.id));
  },
  async getHarvestRecordsByBatchCode(batchCode) {
    const res = await apiClient.get<PaginatedResponse<HarvestRecord>>('/harvests?batch_code=' + batchCode);
    return res.data.map(fixHarvest);
  },
  async addHarvestRecord(record) {
    const res = await apiClient.post<any>('/harvests', record);
    return fixHarvest(res);
  },
  async addHarvestRecords(newRecords) {
    const created: HarvestRecord[] = [];
    for (const r of newRecords) {
      created.push(await this.addHarvestRecord(r));
    }
    return created;
  },
  async updateHarvestRecord(id, updates) {
    const res = await apiClient.put<any>('/harvests/' + id, updates);
    return fixHarvest(res);
  },
  async deleteHarvestRecord(id) {
    await apiClient.del<any>('/harvests/' + id);
    return true;
  },
  async deleteHarvestRecords(ids) {
    await apiClient.del<any>('/harvests', { ids });
    return true;
  },
  async generateHarvestCode() {
    const now = new Date();
    const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const res = await apiClient.get<PaginatedResponse<HarvestRecord>>('/harvests?harvest_code=HS' + dateStr);
    const seq = res.total + 1;
    return 'HS' + dateStr + String(seq).padStart(3, '0');
  },
  async resetHarvestRecords() {
    await apiClient.post<any>('/system/clear-all');
  },
};
