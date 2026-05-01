/**
 * 作物实例数据服务
 * 使用 localStorage 实现数据持久化
 * 核心功能：管理作物实例的全生命周期
 */

import {
  CropInstance,
  CropInstanceStatus,
  SourceOrigin,
  CropTraceChain,
  SeedSource,
  Seedling,
  Planting,
} from '../types/crop';
import { HarvestRecord } from '../types/index';
import * as cropVarietyService from './cropVarietyService';
import * as seedSourceService from './seedSourceService';
import * as seedlingService from './seedlingService';
import * as plantingService from './plantingService';
import * as cropOrderService from './cropOrderService';
import * as harvestService from './harvestService';

const STORAGE_KEY = 'crop_instances';

/**
 * 生成作物实例编码
 * 格式: 品种编码(11位) + 年月日(6位) + 流水号(3位) = 20位
 * 品种编码 = 类别码(2字母) + 类型码(2位) + 品种码(2位) + 子品种码(3位) + 详细码(2位)
 * 示例: PD0301004001260501001 (PD0301004001=红果番茄 260501=2026年5月1日 001=当日第1条)
 */
function generateInstanceCode(cropName: string): string {
  // 使用 cropVarietyService 获取完整的 11 位品种编码
  const variety = cropVarietyService.getVarietyByName(cropName);
  if (!variety) {
    throw new Error(`找不到作物 ${cropName} 对应的品种信息`);
  }

  const cropCode = variety.cropCode; // 11位品种编码

  // 获取当前日期
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 获取当日该品种的流水号
  const existingInstances = getInstances().filter(inst => {
    const instDate = inst.instanceCode.slice(-6, -2);
    return instDate === dateStr && inst.cropName === cropName;
  });

  const seq = existingInstances.length + 1;
  const seqStr = String(seq).padStart(3, '0');

  return `${cropCode}${dateStr}${seqStr}`;
}

/**
 * 初始化默认数据
 */
const defaultData: CropInstance[] = [];

/**
 * 统一的数据读取函数 - 从localStorage读取并解析
 */
function getStoredData(): CropInstance[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('作物实例数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 初始化数据 - 从localStorage读取或使用默认数据
 */
export function initInstances(): CropInstance[] {
  const data = getStoredData();
  if (data.length === 0 && localStorage.getItem(STORAGE_KEY) === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  }
  return data.length > 0 ? data : defaultData;
}

/**
 * 获取所有作物实例
 */
export function getInstances(): CropInstance[] {
  return getStoredData();
}

/**
 * 根据ID获取单个作物实例
 */
export function getInstanceById(id: string): CropInstance | undefined {
  const instances = getInstances();
  return instances.find(inst => inst.id === id);
}

/**
 * 根据ID数组获取多个作物实例
 */
export function getInstancesByIds(ids: string[]): CropInstance[] {
  const instances = getInstances();
  return instances.filter(inst => ids.includes(inst.id));
}

/**
 * 根据订单ID获取关联的作物实例
 */
export function getInstancesByOrderId(orderId: string): CropInstance[] {
  const instances = getInstances();
  return instances.filter(inst => inst.orderId === orderId);
}

/**
 * 创建作物实例
 * @param orderId 可选的订单ID
 * @param cropInfo 作物信息
 * @param sourceOrigin 来源类型
 * @param sourceDescription 来源描述
 * @param initialQuantity 初始数量
 * @param sourceInstanceId 可选的来源实例ID（用于繁殖类操作）
 */
export function createInstance(
  cropInfo: {
    cropCategory: string;
    cropName: string;
    cropVariety: string;
  },
  sourceOrigin: SourceOrigin,
  initialQuantity: number,
  options?: {
    orderId?: string;
    orderCode?: string;
    sourceDescription?: string;
    sourceInstanceId?: string;
  }
): CropInstance {
  const instances = getInstances();

  // 使用 cropVarietyService 获取完整的品种信息
  const varietyInfo = cropVarietyService.getVarietyByName(cropInfo.cropName);
  if (!varietyInfo) {
    throw new Error(`找不到作物 ${cropInfo.cropName} 对应的品种信息`);
  }

  // 生成实例编码（使用完整的 11 位品种编码）
  const instanceCode = generateInstanceCode(cropInfo.cropName);

  const now = new Date().toLocaleString('zh-CN');

  const newInstance: CropInstance = {
    id: 'CI' + Date.now(),
    instanceCode,
    orderId: options?.orderId,
    orderCode: options?.orderCode,
    cropCategory: cropInfo.cropCategory,
    cropName: cropInfo.cropName,
    cropVariety: cropInfo.cropVariety,
    categoryCode: varietyInfo.categoryCode,
    typeCode: varietyInfo.typeCode,
    subCode: varietyInfo.varietyCode,  // 使用 CropVariety 的 varietyCode 作为 subCode
    sourceOrigin,
    sourceDescription: options?.sourceDescription,
    initialQuantity,
    currentQuantity: initialQuantity,
    plantedQuantity: 0,
    harvestedQuantity: 0,
    status: 'seedling',
    seedEntryDate: sourceOrigin === 'internal_seed' ? now : undefined,
    seedlingStartDate: ['tissue_culture', 'grafting', 'seedling_split', 'cutting', 'direct_seedling'].includes(sourceOrigin) ? now : undefined,
    sourceInstanceId: options?.sourceInstanceId,
    createBy: '系统',
    createTime: now,
    updateTime: now,
  };

  instances.push(newInstance);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  return newInstance;
}

/**
 * 更新作物实例
 */
export function updateInstance(id: string, updates: Partial<CropInstance>): CropInstance | null {
  const instances = getInstances();
  const index = instances.findIndex(inst => inst.id === id);
  if (index === -1) return null;

  instances[index] = {
    ...instances[index],
    ...updates,
    updateTime: new Date().toLocaleString('zh-CN'),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  return instances[index];
}

/**
 * 删除作物实例
 */
export function deleteInstance(id: string): boolean {
  const instances = getInstances();
  const index = instances.findIndex(inst => inst.id === id);
  if (index === -1) return false;

  instances.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  return true;
}

/**
 * 批量删除作物实例
 */
export function deleteInstances(ids: string[]): boolean {
  const instances = getInstances();
  const filtered = instances.filter(inst => !ids.includes(inst.id));
  if (filtered.length === instances.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 更新实例数量
 * @param id 实例ID
 * @param type 操作类型：seedling-育苗，plant-定植，harvest-采收
 * @param quantity 数量变化
 */
export function updateQuantity(id: string, type: 'seedling' | 'plant' | 'harvest', quantity: number): boolean {
  const instance = getInstanceById(id);
  if (!instance) return false;

  const now = new Date().toLocaleString('zh-CN');

  if (type === 'seedling') {
    // 育苗操作
    updateInstance(id, {
      seedlingStartDate: instance.seedlingStartDate || now,
      status: 'seedling',
    });
  } else if (type === 'plant') {
    // 定植操作
    const newPlanted = instance.plantedQuantity + quantity;
    const newCurrent = instance.currentQuantity - quantity;

    updateInstance(id, {
      plantedQuantity: newPlanted,
      currentQuantity: Math.max(0, newCurrent),
      plantingDate: instance.plantingDate || now,
      status: newCurrent <= 0 ? 'planted' : 'growing',
    });
  } else if (type === 'harvest') {
    // 采收操作
    const newHarvested = instance.harvestedQuantity + quantity;
    const newCurrent = instance.currentQuantity - quantity;

    updateInstance(id, {
      harvestedQuantity: newHarvested,
      currentQuantity: Math.max(0, newCurrent),
      harvestDate: instance.harvestDate || now,
      status: newCurrent <= 0 ? 'harvested' : 'growing',
    });
  }

  return true;
}

/**
 * 更新实例状态
 */
export function updateStatus(id: string, status: CropInstanceStatus): boolean {
  const instance = getInstanceById(id);
  if (!instance) return false;

  updateInstance(id, { status });
  return true;
}

/**
 * 获取实例的完整溯源链
 */
export function getTraceChain(id: string): CropTraceChain | null {
  const instance = getInstanceById(id);
  if (!instance) return null;

  // 获取关联的订单
  let order;
  if (instance.orderId) {
    order = cropOrderService.getOrderById(instance.orderId);
  }

  // 获取关联的种源（不限制 sourceOrigin，查询所有关联到该实例的种源）
  const allSeedSources = seedSourceService.getSeedSources().filter(s => s.instanceId === id);
  const seedSource = allSeedSources[0]; // 保留第一条（兼容）

  // 获取关联的育苗记录
  const seedlings = seedlingService.getSeedlings().filter(s => s.instanceId === id);

  // 获取关联的种植记录
  const plantings = plantingService.getPlantings().filter(p => p.instanceId === id);

  // 获取关联的采收记录
  const allHarvests = harvestService.getHarvestRecords();
  const harvests = allHarvests.filter(h => h.instanceId === id);

  return {
    instance,
    order,
    seedSource: seedSource || undefined,          // 保留第一条（兼容）
    seedSources: allSeedSources.length > 0 ? allSeedSources : undefined,  // 新增：所有种源
    seedlings: seedlings.length > 0 ? seedlings : undefined,
    plantings: plantings.length > 0 ? plantings : undefined,
    harvests: harvests.length > 0 ? harvests : undefined,
  };
}

/**
 * 重置数据到默认状态
 */
export function resetInstances(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}
