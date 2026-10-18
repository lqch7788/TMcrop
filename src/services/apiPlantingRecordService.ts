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
  /**
   * 2026-10-11：所属区域 oid（planting_records.zone_oid）。
   * BaseOperationsCenterV2 的"区域→种植"树按该字段分组，后端响应实际带该列
   */
  zoneOid?: string;
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

/**
 * 2026-10-18 P1 修复：/api 响应已由中间件深转 camelCase（queryToObjects 亦返回 camelCase），
 * 原实现只读 snake_case，导致 facilityOid/startDate/yieldAmount 等全部 undefined。
 * 统一归一化，兼容两种来源。
 */
function mapRecord(r: any): PlantingRecord {
  return {
    id: r.id,
    oid: r.oid,
    facilityOid: r.facilityOid ?? r.facility_oid,
    blockOid: r.blockOid ?? r.block_oid ?? '',
    seasonCode: r.seasonCode ?? r.season_code,
    cropVarietyOid: r.cropVarietyOid ?? r.crop_variety_oid ?? '',
    cropName: r.cropName ?? r.crop_name,
    varietyName: r.varietyName ?? r.variety_name ?? '',
    startDate: r.startDate ?? r.start_date,
    endDate: r.endDate ?? r.end_date ?? null,
    status: r.status,
    yieldAmount: r.yieldAmount ?? r.yield_amount ?? null,
    yieldUnit: r.yieldUnit ?? r.yield_unit ?? 'kg',
    qualityGrade: r.qualityGrade ?? r.quality_grade ?? null,
    notes: r.notes ?? '',
    facilityName: r.facilityName ?? r.facility_name,
    facilityCode: r.facilityCode ?? r.facility_code,
    createdAt: r.createdAt ?? r.created_at,
    updatedAt: r.updatedAt ?? r.updated_at,
    deletedAt: r.deletedAt ?? r.deleted_at ?? null,
  };
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
  return records.map(mapRecord);
}

/** 获取单条记录 */
export async function getPlantingRecord(oid: string): Promise<PlantingRecord> {
  const r = await enhancedApiClient.get<any>(`/planting-records/${oid}`);
  return mapRecord(r);
}

/** 创建种植季记录 */
export async function createPlantingRecord(data: {
  facility_oid: string; block_oid?: string; crop_variety_oid?: string;
  crop_name: string; variety_name?: string; start_date?: string; notes?: string;
}): Promise<PlantingRecord> {
  const r = await enhancedApiClient.post<any>('/planting-records', data);
  return mapRecord(r);
}

/** 更新种植季记录 */
export async function updatePlantingRecord(oid: string, data: Record<string, any>): Promise<PlantingRecord> {
  const r = await enhancedApiClient.put<any>(`/planting-records/${oid}`, data);
  return mapRecord(r);
}

/** 结束种植季 */
export async function endPlantingSeason(oid: string, data: {
  end_date: string; yield_amount?: number; yield_unit?: string;
  quality_grade?: string; notes?: string;
}): Promise<PlantingRecord> {
  const r = await enhancedApiClient.put<any>(`/planting-records/${oid}/end`, data);
  return mapRecord(r);
}

/** 删除种植季记录（软删除） */
export async function deletePlantingRecord(oid: string): Promise<void> {
  await enhancedApiClient.delete(`/planting-records/${oid}`);
}
