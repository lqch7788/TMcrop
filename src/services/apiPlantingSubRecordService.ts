/**
 * 2026-06-25 v3: 种植动态记录子表 Service
 * - 育种记录 (planting_breeding_records) — isBreeding=true 的种植
 * - 留种记录 (planting_seed_saving_records) — isSeedSaving=true 的种植
 *
 * 数据流：V2.1 铁律 — 无缓存降级
 */

import { enhancedApiClient } from '../lib/apiClient';

// ============ 类型定义 ============

// 2026-07-03 v3：扩 enum，区分有性/无性
// 有性：cross(杂交)/self(自交)/backcross(回交)/selection(选育-有种)/marker(标记)/other
// 无性：clonal(无性选育)/cutting(扦插)/grafting(嫁接)/layering(压条)/tissue(组培)/division(分株)
export type BreedingOperationType =
  | 'cross' | 'self' | 'backcross' | 'selection' | 'marker' | 'other'
  | 'clonal' | 'cutting' | 'grafting' | 'layering' | 'tissue' | 'division';
export type ParentSource = 'seed_source' | 'planting' | 'free';
// 2026-07-03 v3：繁殖方式（无性繁殖专用）
export type PropagationMethod =
  | 'cutting' | 'grafting' | 'layering' | 'tissue_culture' | 'division' | 'bulb' | 'tuber' | 'runner';
// 2026-07-03 v3：繁殖模式
export type ReproductionMode = 'sexual' | 'asexual';
// 2026-07-03 v4：扩枚举（加无性繁殖器官）
export type SeedSavingPart = 'fruit' | 'seed' | 'whole_plant' | 'root' | 'stem' | 'leaf' | 'other'
  | 'tuber' | 'bulb' | 'corm' | 'rhizome' | 'cutting' | 'stolon';
// 2026-07-03 v4：保存模式
export type SeedPreservationMode = 'seed' | 'vegetative';

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
  // 2026-07-03：3 个通用专业字段
  targetTraits: string[] | null;   // 目标性状：抗病/优质/早熟/丰产/抗逆/雄性不育/其他
  fruitCount: number | null;       // 结实数
  seedCount: number | null;        // 收获种子数
  // 2026-07-03 v2：授粉花数（计算结实率用）
  pollinatedFlowerCount: number | null;
  // 2026-07-03 v3：无性繁殖专用字段
  motherPlantCode: string | null;             // 母株编码
  propagationMethod: PropagationMethod | null; // 繁殖方式
  inoculationCount: number | null;            // 接种数
  survivalCount: number | null;               // 成活数
  // 2026-07-03 v3：繁殖模式
  reproductionMode: ReproductionMode | null;
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
  // 2026-07-03：3 个通用专业字段
  targetTraits?: string[] | null;
  fruitCount?: number | null;
  seedCount?: number | null;
  // 2026-07-03 v2：授粉花数（计算结实率用）
  pollinatedFlowerCount?: number | null;
  // 2026-07-03 v3：无性繁殖专用字段
  motherPlantCode?: string | null;
  propagationMethod?: PropagationMethod | null;
  inoculationCount?: number | null;
  survivalCount?: number | null;
  // 2026-07-03 v3：繁殖模式
  reproductionMode?: ReproductionMode | null;
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
  // 2026-07-03 v4：保存模式 + 共享字段
  preservationMode: SeedPreservationMode | null;
  lotNumber: string | null;
  purpose: string | null;
  processingMethod: string | null;
  storageLocation: string | null;
  containerType: string | null;
  // 种子保存专用
  germinationRate: number | null;       // 发芽率(%)
  thousandSeedWeight: number | null;   // 千粒重(g)
  purity: number | null;               // 纯度(%)
  moistureContent: number | null;      // 含水率(%)
  seedTreatment: string | null;        // 种子处理
  maturityStage: string | null;        // 成熟度
  // 营养体保存专用
  sizeGrade: string | null;           // 规格等级
  budNodeCount: number | null;        // 芽眼/节数
  healthStatus: string | null;        // 检疫状态
  dormancyState: string | null;       // 休眠状态
}

export interface SeedSavingRecordInput {
  recordDate: string;
  plantMarker: string;
  harvestPart?: SeedSavingPart | null;
  quantity?: number | null;
  unit?: string | null;
  operator?: string | null;
  remarks?: string | null;
  // 2026-07-03 v4
  preservationMode?: SeedPreservationMode | null;
  lotNumber?: string | null;
  purpose?: string | null;
  processingMethod?: string | null;
  storageLocation?: string | null;
  containerType?: string | null;
  germinationRate?: number | null;
  thousandSeedWeight?: number | null;
  purity?: number | null;
  moistureContent?: number | null;
  seedTreatment?: string | null;
  maturityStage?: string | null;
  sizeGrade?: string | null;
  budNodeCount?: number | null;
  healthStatus?: string | null;
  dormancyState?: string | null;
}

// ============ Service ============

export const apiPlantingSubRecordService = {
  // ===== 育种记录 =====
  async listBreedingRecords(plantingId: string): Promise<BreedingRecord[]> {
    const data = await enhancedApiClient.get<unknown>(
      `/plantings/${plantingId}/breeding-records`
    );
    if (!Array.isArray(data)) return [];
    // 2026-07-03：后端返回的 targetTraits 是 JSON 字符串，前端解析为数组
    return (data as BreedingRecord[]).map((r) => ({
      ...r,
      targetTraits: typeof r.targetTraits === 'string'
        ? (() => { try { return JSON.parse(r.targetTraits as string) } catch { return [] } })()
        : r.targetTraits ?? [],
    }));
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
