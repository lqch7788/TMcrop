/**
 * 2026-07-04 v2: 育苗无性繁殖记录子表 Service
 * 复用现有 propagation_records 表（带 seedling_id 列）
 * 与种植/RecordModal 的 asexual 分支对齐：完整记录无性繁殖全过程
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { PropagationMethod } from '@/services/apiPlantingSubRecordService';

export type SeedlingStatus = 'healthy' | 'weak' | 'diseased';
/** 7 个有性 + 6 个无性 = 13 种繁殖操作类型 */
export type AsexualOperationType = 'clonal' | 'cutting' | 'grafting' | 'layering' | 'tissue' | 'division';
export type SexualOperationType = 'cross' | 'self' | 'backcross' | 'selection' | 'marker' | 'other';
export type PropagationOperationType = SexualOperationType | AsexualOperationType;
export type ReproductionMode = 'sexual' | 'asexual';

export interface PropagationRecord {
  id: string;
  seedlingId: string;
  recordDate: string;
  // 基础环境
  temperature: number | null;
  humidity: number | null;
  // 数量
  motherPlantCount: number | null;
  seedlingOutput: number | null;
  seedlingStatus: SeedlingStatus | null;
  transplantPosition: string | null;
  operator: string | null;
  remarks: string | null;
  // 2026-07-04 v2：无性繁殖完整字段（与种植/RecordModal 的 asexual 分支对齐）
  operationType: PropagationOperationType | string | null;
  reproductionMode: ReproductionMode | null;
  motherPlantCode: string | null;
  propagationMethod: PropagationMethod | string | null;
  inoculationCount: number | null;
  survivalCountAsexual: number | null;
  targetTraits: string[] | null;
  generation: string | null;
  parentMaleCode: string | null;
  parentFemaleCode: string | null;
  createTime: string;
}

export interface PropagationRecordInput {
  recordDate: string;
  temperature?: number | null;
  humidity?: number | null;
  motherPlantCount?: number | null;
  seedlingOutput?: number | null;
  seedlingStatus?: SeedlingStatus | null;
  transplantPosition?: string | null;
  operator?: string | null;
  remarks?: string | null;
  // 2026-07-04 v2：无性繁殖完整字段
  operationType?: PropagationOperationType | string | null;
  reproductionMode?: ReproductionMode | null;
  motherPlantCode?: string | null;
  propagationMethod?: PropagationMethod | string | null;
  inoculationCount?: number | null;
  survivalCountAsexual?: number | null;
  targetTraits?: string[] | null;
  generation?: string | null;
  parentMaleCode?: string | null;
  parentFemaleCode?: string | null;
}

/**
 * 关键服务端响应字段映射：服务端用 snake_case（record_date、mother_plant_count），
 * 前端 camelCase。enhancedApiClient 自动解包 data，但字段名需手工转换。
 */
function rowToRecord(row: any): PropagationRecord {
  // target_traits 可能是字符串 JSON 或已经是数组
  let targetTraits: string[] | null = row.target_traits ?? null;
  if (typeof targetTraits === 'string') {
    try {
      const parsed = JSON.parse(targetTraits);
      if (Array.isArray(parsed)) targetTraits = parsed as string[];
    } catch {
      targetTraits = null;
    }
  }
  return {
    id: row.id,
    seedlingId: row.seedling_id ?? '',
    recordDate: row.record_date ?? '',
    temperature: row.temperature ?? null,
    humidity: row.humidity ?? null,
    motherPlantCount: row.mother_plant_count ?? null,
    seedlingOutput: row.seedling_output ?? null,
    seedlingStatus: row.seedling_status ?? null,
    transplantPosition: row.transplant_position ?? null,
    operator: row.operator ?? null,
    remarks: row.remarks ?? null,
    operationType: row.operation_type ?? null,
    reproductionMode: row.reproduction_mode ?? null,
    motherPlantCode: row.mother_plant_code ?? null,
    propagationMethod: row.propagation_method ?? null,
    inoculationCount: row.inoculation_count ?? null,
    survivalCountAsexual: row.survival_count_asexual ?? null,
    targetTraits,
    generation: row.generation ?? null,
    parentMaleCode: row.parent_male_code ?? null,
    parentFemaleCode: row.parent_female_code ?? null,
    createTime: row.create_time ?? '',
  };
}

export const apiSeedlingPropagationService = {
  async list(seedlingId: string | number): Promise<PropagationRecord[]> {
    const data = await enhancedApiClient.get<unknown>(
      `/seedlings/${seedlingId}/propagation-records`
    );
    if (!Array.isArray(data)) return [];
    return (data as any[]).map(rowToRecord);
  },

  async create(seedlingId: string | number, input: PropagationRecordInput): Promise<{ id: string }> {
    return await enhancedApiClient.post<{ id: string }>(
      `/seedlings/${seedlingId}/propagation-records`, input
    );
  },

  async update(seedlingId: string | number, recordId: string, input: Partial<PropagationRecordInput>): Promise<void> {
    await enhancedApiClient.put<void>(
      `/seedlings/${seedlingId}/propagation-records/${recordId}`, input
    );
  },

  async delete(seedlingId: string | number, recordId: string): Promise<void> {
    await enhancedApiClient.delete<void>(
      `/seedlings/${seedlingId}/propagation-records/${recordId}`
    );
  },
};

export default apiSeedlingPropagationService;
