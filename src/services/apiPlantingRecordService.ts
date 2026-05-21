/**
 * 种植季记录 API 服务（基地空间架构 V1.0）
 * 对接后端 /api/planting-records
 */
import { enhancedApiClient } from '../lib/apiClient';

/** 种植季记录 */
export interface PlantingRecord {
  id: number;
  oid: string;
  facilityOid: string;
  blockOid: string;
  seasonCode: string;
  cropVarietyOid: string;
  cropName: string;
  varietyName: string;
  startDate: string;
  endDate: string | null;
  status: string;
  yieldAmount: number | null;
  yieldUnit: string;
  qualityGrade: string | null;
  notes: string;
  facilityName?: string;
  facilityCode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** 查询参数 */
export interface PlantingRecordQuery {
  facility_oid?: string;
  block_oid?: string;
  season_code?: string;
  status?: string;
  year?: string;
}

/** 获取种植季记录列表 */
export async function getPlantingRecords(query?: PlantingRecordQuery): Promise<PlantingRecord[]> {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([k, v]) => { if (v) params.append(k, v); });
  }
  const qs = params.toString();
  const url = qs ? `/planting-records?${qs}` : '/planting-records';
  const records = await enhancedApiClient.get<any[]>(url);
  if (!records) return [];
  // 后端返回 snake_case，转换为 camelCase
  return records.map((r: any) => ({
    id: r.id,
    oid: r.oid,
    facilityOid: r.facility_oid,
    blockOid: r.block_oid || '',
    seasonCode: r.season_code,
    cropVarietyOid: r.crop_variety_oid || '',
    cropName: r.crop_name,
    varietyName: r.variety_name || '',
    startDate: r.start_date,
    endDate: r.end_date || null,
    status: r.status,
    yieldAmount: r.yield_amount ?? null,
    yieldUnit: r.yield_unit || 'kg',
    qualityGrade: r.quality_grade || null,
    notes: r.notes || '',
    facilityName: r.facility_name,
    facilityCode: r.facility_code,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at || null,
  }));
}

/** 获取单条记录 */
export async function getPlantingRecord(oid: string): Promise<PlantingRecord> {
  const r = await enhancedApiClient.get<any>(`/planting-records/${oid}`);
  return {
    id: r.id, oid: r.oid,
    facilityOid: r.facility_oid, blockOid: r.block_oid || '',
    seasonCode: r.season_code, cropVarietyOid: r.crop_variety_oid || '',
    cropName: r.crop_name, varietyName: r.variety_name || '',
    startDate: r.start_date, endDate: r.end_date || null,
    status: r.status, yieldAmount: r.yield_amount ?? null,
    yieldUnit: r.yield_unit || 'kg', qualityGrade: r.quality_grade || null,
    notes: r.notes || '', facilityName: r.facility_name, facilityCode: r.facility_code,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at || null,
  };
}

/** 创建种植季记录 */
export async function createPlantingRecord(data: {
  facility_oid: string; block_oid?: string; crop_variety_oid?: string;
  crop_name: string; variety_name?: string; start_date?: string; notes?: string;
}): Promise<PlantingRecord> {
  const r = await enhancedApiClient.post<any>('/planting-records', data);
  return {
    id: r.id, oid: r.oid,
    facilityOid: r.facility_oid, blockOid: r.block_oid || '',
    seasonCode: r.season_code, cropVarietyOid: r.crop_variety_oid || '',
    cropName: r.crop_name, varietyName: r.variety_name || '',
    startDate: r.start_date, endDate: r.end_date || null,
    status: r.status, yieldAmount: r.yield_amount ?? null,
    yieldUnit: r.yield_unit || 'kg', qualityGrade: r.quality_grade || null,
    notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at,
    deletedAt: r.deleted_at || null,
  };
}

/** 更新种植季记录 */
export async function updatePlantingRecord(oid: string, data: Record<string, any>): Promise<PlantingRecord> {
  const r = await enhancedApiClient.put<any>(`/planting-records/${oid}`, data);
  return {
    id: r.id, oid: r.oid,
    facilityOid: r.facility_oid, blockOid: r.block_oid || '',
    seasonCode: r.season_code, cropVarietyOid: r.crop_variety_oid || '',
    cropName: r.crop_name, varietyName: r.variety_name || '',
    startDate: r.start_date, endDate: r.end_date || null,
    status: r.status, yieldAmount: r.yield_amount ?? null,
    yieldUnit: r.yield_unit || 'kg', qualityGrade: r.quality_grade || null,
    notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at,
    deletedAt: r.deleted_at || null,
  };
}

/** 结束种植季 */
export async function endPlantingSeason(oid: string, data: {
  end_date: string; yield_amount?: number; yield_unit?: string;
  quality_grade?: string; notes?: string;
}): Promise<PlantingRecord> {
  const r = await enhancedApiClient.put<any>(`/planting-records/${oid}/end`, data);
  return {
    id: r.id, oid: r.oid,
    facilityOid: r.facility_oid, blockOid: r.block_oid || '',
    seasonCode: r.season_code, cropVarietyOid: r.crop_variety_oid || '',
    cropName: r.crop_name, varietyName: r.variety_name || '',
    startDate: r.start_date, endDate: r.end_date || null,
    status: r.status, yieldAmount: r.yield_amount ?? null,
    yieldUnit: r.yield_unit || 'kg', qualityGrade: r.quality_grade || null,
    notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at,
    deletedAt: r.deleted_at || null,
  };
}

/** 删除种植季记录（软删除） */
export async function deletePlantingRecord(oid: string): Promise<void> {
  await enhancedApiClient.delete(`/planting-records/${oid}`);
}
