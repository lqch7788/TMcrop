/**
 * Service 统一接口定义
 * 所有前端 Service（API / LocalStorage）必须实现这些接口
 */

import {
  SeedSource, Seedling, DailyRecord, Planting,
  CropInstance, CropInstanceStatus, CropTraceChain,
  CropOrder, CropOrderStatus,
} from '@/types/crop';
import { HarvestRecord } from '@/types';
import {
  CropVariety, CreateCropVarietyInput, UpdateCropVarietyInput,
  CropVarietyOption, CropVarietySearchResult,
} from '@/types/cropVariety';
import { ProduceCodeInfo } from '@/data/produceCodeRule';

// ===== 种源 =====
export interface ISeedSourceService {
  initSeedSources(): Promise<SeedSource[]>;
  getSeedSources(): Promise<SeedSource[]>;
  getSeedSourceById(id: string): Promise<SeedSource | undefined>;
  getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]>;
  addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource>;
  updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null>;
  deleteSeedSource(id: string): Promise<boolean>;
  deleteSeedSources(ids: string[]): Promise<boolean>;
  decreaseAvailableCount(id: string, count: number): Promise<boolean>;
  resetSeedSources(): Promise<void>;
  getTodayMaxSeedCodeSerial(dateStr: string): Promise<number>;
  generateSeedCode(dateStr: string): Promise<string>;
}

// ===== 育苗 =====
export interface ISeedlingService {
  initSeedlings(): Promise<Seedling[]>;
  getSeedlings(): Promise<Seedling[]>;
  getSeedlingById(id: string): Promise<Seedling | undefined>;
  getSeedlingsByIds(ids: string[]): Promise<Seedling[]>;
  getSeedlingsBySourceId(sourceId: string): Promise<Seedling[]>;
  addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Promise<Seedling>;
  updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null>;
  deleteSeedling(id: string): Promise<boolean>;
  deleteSeedlings(ids: string[]): Promise<boolean>;
  addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): Promise<DailyRecord | null>;
  deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean>;
  updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): Promise<boolean>;
  increasePlantedCount(id: string, count: number): Promise<boolean>;
  getTransplantReadySeedlings(): Promise<Seedling[]>;
  getAvailableTransplantCount(id: string): Promise<number>;
  resetSeedlings(): Promise<void>;
}

// ===== 种植 =====
export interface IPlantingService {
  initPlantings(): Promise<Planting[]>;
  getPlantings(): Promise<Planting[]>;
  getPlantingById(id: string): Promise<Planting | undefined>;
  getPlantingsByIds(ids: string[]): Promise<Planting[]>;
  getPlantingsBySourceId(sourceId: string): Promise<Planting[]>;
  addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting>;
  updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null>;
  deletePlanting(id: string): Promise<boolean>;
  deletePlantings(ids: string[]): Promise<boolean>;
  harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean>;
  getUnharvestedPlantings(): Promise<Planting[]>;
  getHarvestedPlantings(): Promise<Planting[]>;
  generatePlantCode(sourceCode: string): Promise<string>;
  resetPlantings(): Promise<void>;
}

// ===== 采收 =====
export interface IHarvestService {
  initHarvestRecords(): Promise<HarvestRecord[]>;
  getHarvestRecords(): Promise<HarvestRecord[]>;
  getHarvestRecordById(id: string): Promise<HarvestRecord | undefined>;
  getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]>;
  getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]>;
  addHarvestRecord(record: Omit<HarvestRecord, 'id'>): Promise<HarvestRecord>;
  addHarvestRecords(newRecords: Omit<HarvestRecord, 'id'>[]): Promise<HarvestRecord[]>;
  updateHarvestRecord(id: string, updates: Partial<HarvestRecord>): Promise<HarvestRecord | null>;
  deleteHarvestRecord(id: string): Promise<boolean>;
  deleteHarvestRecords(ids: string[]): Promise<boolean>;
  generateHarvestCode(): Promise<string>;
  resetHarvestRecords(): Promise<void>;
}

// ===== 作物实例 =====
export interface ICropInstanceService {
  initInstances(): Promise<CropInstance[]>;
  getInstances(): Promise<CropInstance[]>;
  getInstanceById(id: string): Promise<CropInstance | undefined>;
  getInstancesByIds(ids: string[]): Promise<CropInstance[]>;
  getInstancesByOrderId(orderId: string): Promise<CropInstance[]>;
  createInstance(
    cropInfo: { cropCategory: string; cropName: string; cropVariety: string },
    sourceOrigin: string,
    initialQuantity: number,
    options?: { orderId?: string; orderCode?: string; sourceDescription?: string; sourceInstanceId?: string }
  ): Promise<CropInstance>;
  updateInstance(id: string, updates: Partial<CropInstance>): Promise<CropInstance | null>;
  deleteInstance(id: string): Promise<boolean>;
  deleteInstances(ids: string[]): Promise<boolean>;
  updateQuantity(id: string, type: 'seedling' | 'plant' | 'harvest', quantity: number): Promise<boolean>;
  updateStatus(id: string, status: CropInstanceStatus): Promise<boolean>;
  getTraceChain(id: string): Promise<CropTraceChain | null>;
  resetInstances(): Promise<void>;
}

// ===== 作物订单 =====
export interface ICropOrderService {
  initOrders(): Promise<CropOrder[]>;
  getOrders(): Promise<CropOrder[]>;
  getOrderById(id: string): Promise<CropOrder | undefined>;
  getOrdersByIds(ids: string[]): Promise<CropOrder[]>;
  createOrder(orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>): Promise<CropOrder>;
  updateOrder(id: string, updates: Partial<CropOrder>): Promise<CropOrder | null>;
  deleteOrder(id: string): Promise<boolean>;
  deleteOrders(ids: string[]): Promise<boolean>;
  linkInstances(orderId: string, instanceIds: string[]): Promise<boolean>;
  unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean>;
  updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean>;
  getOrderDetail(id: string): Promise<(CropOrder & { instances: string[] }) | null>;
  resetOrders(): Promise<void>;
}

// ===== 品种库 =====
export interface ICropVarietyService {
  initVarieties(): Promise<CropVariety[]>;
  getAllVarieties(): Promise<CropVariety[]>;
  getVarietiesByCategory(categoryCode: string): Promise<CropVariety[]>;
  getVarietyById(id: string): Promise<CropVariety | undefined>;
  getVarietyByCode(cropCode: string): Promise<CropVariety | undefined>;
  getVarietyByName(varietyName: string): Promise<CropVariety | undefined>;
  searchVarieties(keyword: string): Promise<CropVarietySearchResult[]>;
  getVarietyOptions(): Promise<CropVarietyOption[]>;
  getCategoryOptions(): Promise<Array<{ value: string; label: string }>>;
  getTypeOptionsByCategory(categoryCode: string): Promise<Array<{ value: string; label: string }>>;
  getVarietyOptionsByType(categoryCode: string, typeCode: string): Promise<Array<{ value: string; label: string }>>;
  getSubVariety1Options(categoryCode: string, typeCode: string, varietyCode: string): Promise<Array<{ value: string; label: string }>>;
  getSubVariety2Options(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code: string): Promise<Array<{ value: string; label: string }>>;
  generateCropCode(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code?: string, detailVarietyCode?: string): Promise<string>;
  getMaxDetailVarietyCode(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code?: string): Promise<string>;
  addVariety(input: CreateCropVarietyInput): Promise<CropVariety>;
  updateVariety(id: string, updates: UpdateCropVarietyInput): Promise<CropVariety | null>;
  deleteVariety(id: string): Promise<boolean>;
  deactivateVariety(id: string): Promise<CropVariety | null>;
  activateVariety(id: string): Promise<CropVariety | null>;
  getVarietyStats(): Promise<{ total: number; active: number; inactive: number; byCategory: Record<string, number> }>;
  resetVarieties(): Promise<void>;
  findVarietyByCropName(cropName: string): Promise<CropVariety | undefined>;
  getCropCodeInfo(cropName: string): Promise<ProduceCodeInfo | null>;
  checkDuplicateVariety(
    categoryCode: string, typeCode: string, varietyCode: string,
    subVariety1Code: string | undefined, subVariety2Code: string | undefined,
    varietyName: string, excludeId?: string
  ): Promise<{ isDuplicate: boolean; existingVariety?: CropVariety }>;
  getMaxSubVarietyCode(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code?: string): Promise<string>;
  getMaxSubVariety2Code(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code: string): Promise<string>;
}
