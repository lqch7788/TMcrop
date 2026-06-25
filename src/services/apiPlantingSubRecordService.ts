/**
 * 2026-06-25 v3: 种植动态记录子表 Service
 * - 育种记录 (planting_breeding_records) — isBreeding=true 的种植
 * - 留种记录 (planting_seed_saving_records) — isSeedSaving=true 的种植
 *
 * 数据流：V2.1 铁律 — 无缓存降级
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============ 类型定义 ============

export type BreedingOperationType = 'cross' | 'self' | 'selection' | 'backcross' | 'marker' | 'other';
export type ParentSource = 'seed_source' | 'planting' | 'free';
export type SeedSavingPart = 'fruit' | 'seed' | 'whole_plant' | 'root' | 'stem' | 'leaf' | 'other';

export interface BreedingRecord {
  id: string;
  plantingId: string;
  recordDate: string;
  operationType: BreedingOperationType;
  generation: string | null;
  parentMaleCode: string | null;
  parentMaleSource: ParentSource | null;
  parentFemaleCode: string | null;
  parentFemaleSource: ParentSource | null;
  operator: string | null;
  remarks: string | null;
  createTime: string;
}

export interface BreedingRecordInput {
  recordDate: string;
  operationType: BreedingOperationType;
  generation?: string | null;
  parentMaleCode?: string | null;
  parentMaleSource?: ParentSource | null;
  parentFemaleCode?: string | null;
  parentFemaleSource?: ParentSource | null;
  operator?: string | null;
  remarks?: string | null;
}

export interface SeedSavingRecord {
  id: string;
  plantingId: string;
  recordDate: string;
  plantMarker: string;
  harvestPart: SeedSavingPart | null;
  quantity: number | null;
  unit: string | null;
  operator: string | null;
  remarks: string | null;
  createTime: string;
}

export interface SeedSavingRecordInput {
  recordDate: string;
  plantMarker: string;
  harvestPart?: SeedSavingPart | null;
  quantity?: number | null;
  unit?: string | null;
  operator?: string | null;
  remarks?: string | null;
}

// ============ Service ============

export const apiPlantingSubRecordService = {
  // ===== 育种记录 =====
  async listBreedingRecords(plantingId: string): Promise<BreedingRecord[]> {
    const data = await enhancedApiClient.get<unknown>(
      `/plantings/${plantingId}/breeding-records`
    );
    return Array.isArray(data) ? (data as BreedingRecord[]) : [];
  },

  async createBreedingRecord(plantingId: string, input: BreedingRecordInput): Promise<{ id: string }> {
    return await enhancedApiClient.post<{ id: string }>(
      `/plantings/${plantingId}/breeding-records`,
      input
    );
  },

  async updateBreedingRecord(
    plantingId: string,
    recordId: string,
    input: Partial<BreedingRecordInput>
  ): Promise<void> {
    await enhancedApiClient.put<void>(
      `/plantings/${plantingId}/breeding-records/${recordId}`,
      input
    );
  },

  async deleteBreedingRecord(plantingId: string, recordId: string): Promise<void> {
    await enhancedApiClient.delete<void>(
      `/plantings/${plantingId}/breeding-records/${recordId}`
    );
  },

  // ===== 留种记录 =====
  async listSeedSavingRecords(plantingId: string): Promise<SeedSavingRecord[]> {
    const data = await enhancedApiClient.get<unknown>(
      `/plantings/${plantingId}/seed-saving-records`
    );
    return Array.isArray(data) ? (data as SeedSavingRecord[]) : [];
  },

  async createSeedSavingRecord(
    plantingId: string,
    input: SeedSavingRecordInput
  ): Promise<{ id: string }> {
    return await enhancedApiClient.post<{ id: string }>(
      `/plantings/${plantingId}/seed-saving-records`,
      input
    );
  },

  async updateSeedSavingRecord(
    plantingId: string,
    recordId: string,
    input: Partial<SeedSavingRecordInput>
  ): Promise<void> {
    await enhancedApiClient.put<void>(
      `/plantings/${plantingId}/seed-saving-records/${recordId}`,
      input
    );
  },

  async deleteSeedSavingRecord(plantingId: string, recordId: string): Promise<void> {
    await enhancedApiClient.delete<void>(
      `/plantings/${plantingId}/seed-saving-records/${recordId}`
    );
  },
};

export default apiPlantingSubRecordService;
