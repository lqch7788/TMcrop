/**
 * 作物实例 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 * 核心功能：管理作物实例的全生命周期
 */

import { db } from './db';
import { ICropInstanceService } from '../interfaces';
import {
  CropInstance, CropInstanceStatus, CropTraceChain,
  SourceOrigin,
} from '@/types/crop';
import { findProduceCodeByName } from '@/data/produceCodeRule';
import { nowString, generateId } from './utils';

const TABLE = db.cropInstances;

function generateInstanceCode(cropName: string): string {
  const cropInfo = findProduceCodeByName(cropName);
  if (!cropInfo) {
    throw new Error(`找不到作物 ${cropName} 对应的编码信息`);
  }

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 这里用全表过滤，因为索引不支持 substring 查询
  const allInstances = TABLE.toArray();
  // 异步计算在 createInstance 中完成，这里先抛出一个临时值
  // 实际逻辑在 createInstance 中处理
  return `${cropInfo.categoryCode}${cropInfo.typeCode}${cropInfo.subCode}${dateStr}001`;
}

export async function initInstances(): Promise<CropInstance[]> {
  const count = await TABLE.count();
  if (count === 0) {
    return [];
  }
  return TABLE.toArray();
}

export async function getInstances(): Promise<CropInstance[]> {
  return TABLE.toArray();
}

export async function getInstanceById(id: string): Promise<CropInstance | undefined> {
  return TABLE.get(id);
}

export async function getInstancesByIds(ids: string[]): Promise<CropInstance[]> {
  return TABLE.where('id').anyOf(ids).toArray();
}

export async function getInstancesByOrderId(orderId: string): Promise<CropInstance[]> {
  return TABLE.where('orderId').equals(orderId).toArray();
}

export async function createInstance(
  cropInfo: { cropCategory: string; cropName: string; cropVariety: string },
  sourceOrigin: SourceOrigin,
  initialQuantity: number,
  options?: { orderId?: string; orderCode?: string; sourceDescription?: string; sourceInstanceId?: string }
): Promise<CropInstance> {
  const produceInfo = findProduceCodeByName(cropInfo.cropName);
  if (!produceInfo) {
    throw new Error(`找不到作物 ${cropInfo.cropName} 对应的编码信息`);
  }

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const prefix = `${produceInfo.categoryCode}${produceInfo.typeCode}${produceInfo.subCode}${dateStr}`;
  const existingInstances = await TABLE.where('instanceCode').startsWith(prefix).toArray();
  const seq = existingInstances.length + 1;
  const seqStr = String(seq).padStart(3, '0');
  const instanceCode = `${produceInfo.categoryCode}${produceInfo.typeCode}${produceInfo.subCode}${dateStr}${seqStr}`;

  const timeStr = nowString();
  const newInstance: CropInstance = {
    id: generateId('CI'),
    instanceCode,
    orderId: options?.orderId,
    orderCode: options?.orderCode,
    cropCategory: cropInfo.cropCategory,
    cropName: cropInfo.cropName,
    cropVariety: cropInfo.cropVariety,
    categoryCode: produceInfo.categoryCode,
    typeCode: produceInfo.typeCode,
    subCode: produceInfo.subCode,
    sourceOrigin,
    sourceDescription: options?.sourceDescription,
    initialQuantity,
    currentQuantity: initialQuantity,
    plantedQuantity: 0,
    harvestedQuantity: 0,
    status: 'seedling',
    seedEntryDate: sourceOrigin === 'internal_seed' ? timeStr : undefined,
    seedlingStartDate: ['tissue_culture', 'grafting', 'seedling_split', 'cutting', 'direct_seedling'].includes(sourceOrigin) ? timeStr : undefined,
    sourceInstanceId: options?.sourceInstanceId,
    createBy: '系统',
    createTime: timeStr,
    updateTime: timeStr,
  };

  await TABLE.add(newInstance);
  return newInstance;
}

export async function updateInstance(id: string, updates: Partial<CropInstance>): Promise<CropInstance | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: CropInstance = {
    ...existing,
    ...updates,
    id,
    updateTime: nowString(),
  };
  await TABLE.put(updated);
  return updated;
}

export async function deleteInstance(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;
  await TABLE.delete(id);
  return true;
}

export async function deleteInstances(ids: string[]): Promise<boolean> {
  await TABLE.bulkDelete(ids);
  return true;
}

export async function updateQuantity(
  id: string,
  type: 'seedling' | 'plant' | 'harvest',
  quantity: number
): Promise<boolean> {
  const instance = await TABLE.get(id);
  if (!instance) return false;

  const now = nowString();
  const updates: Partial<CropInstance> = {};

  if (type === 'seedling') {
    updates.seedlingStartDate = instance.seedlingStartDate || now;
    updates.status = 'seedling';
  } else if (type === 'plant') {
    const newPlanted = instance.plantedQuantity + quantity;
    const newCurrent = instance.currentQuantity - quantity;
    updates.plantedQuantity = newPlanted;
    updates.currentQuantity = Math.max(0, newCurrent);
    updates.plantingDate = instance.plantingDate || now;
    updates.status = newCurrent <= 0 ? 'planted' : 'growing';
  } else if (type === 'harvest') {
    const newHarvested = instance.harvestedQuantity + quantity;
    const newCurrent = instance.currentQuantity - quantity;
    updates.harvestedQuantity = newHarvested;
    updates.currentQuantity = Math.max(0, newCurrent);
    updates.harvestDate = instance.harvestDate || now;
    updates.status = newCurrent <= 0 ? 'harvested' : 'growing';
  }

  updates.updateTime = now;
  await TABLE.update(id, updates);
  return true;
}

export async function updateStatus(id: string, status: CropInstanceStatus): Promise<boolean> {
  const instance = await TABLE.get(id);
  if (!instance) return false;
  await TABLE.update(id, { status, updateTime: nowString() });
  return true;
}

export async function getTraceChain(id: string): Promise<CropTraceChain | null> {
  const instance = await TABLE.get(id);
  if (!instance) return null;

  // 获取关联的种源
  let seedSource = undefined;
  if (instance.sourceOrigin === 'internal_seed') {
    const seedSources = await db.seedSources.where('instanceId').equals(id).toArray();
    seedSource = seedSources[0];
  }

  // 获取关联的育苗记录
  const seedlings = await db.seedlings.where('instanceId').equals(id).toArray();

  // 获取关联的种植记录
  const plantings = await db.plantings.where('instanceId').equals(id).toArray();

  // 获取关联的采收记录
  const harvests = await db.harvests.where('instanceId').equals(id).toArray();

  return {
    instance,
    order: undefined, // 暂不关联订单（避免循环依赖）
    seedSource,
    seedlings: seedlings.length > 0 ? seedlings : undefined,
    plantings: plantings.length > 0 ? plantings : undefined,
    harvests: harvests.length > 0 ? harvests : undefined,
  };
}

export async function resetInstances(): Promise<void> {
  await TABLE.clear();
}
