/**
 * 种植 Service - Dexie.js 实现（第三种存储方案）
 * 基于 IndexedDB，纯前端持久化，适用于演示版/原型阶段
 */

import { db } from './db';
import { IPlantingService } from '../interfaces';
import { Planting, PlantingStatus, SourceType } from '@/types/crop';
import { nowString, generateId } from './utils';

const TABLE = db.plantings;

export async function initPlantings(): Promise<Planting[]> {
  const count = await TABLE.count();
  if (count === 0) {
    const { plantings } = await import('@/data/cropData');
    await TABLE.bulkAdd(plantings);
    return plantings;
  }
  return TABLE.toArray();
}

export async function getPlantings(): Promise<Planting[]> {
  return TABLE.toArray();
}

export async function getPlantingById(id: string): Promise<Planting | undefined> {
  return TABLE.get(id);
}

export async function getPlantingsByIds(ids: string[]): Promise<Planting[]> {
  return TABLE.where('id').anyOf(ids).toArray();
}

export async function getPlantingsBySourceId(sourceId: string): Promise<Planting[]> {
  return TABLE.where('sourceId').equals(sourceId).toArray();
}

export async function addPlanting(
  planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>
): Promise<Planting> {
  const now = nowString();
  const newPlanting: Planting = {
    ...planting,
    id: generateId('PL'),
    createTime: now,
    updateTime: now,
  };
  await TABLE.add(newPlanting);
  return newPlanting;
}

export async function updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null> {
  const existing = await TABLE.get(id);
  if (!existing) return null;

  const updated: Planting = {
    ...existing,
    ...updates,
    id,
    updateTime: nowString(),
  };
  await TABLE.put(updated);
  return updated;
}

export async function deletePlanting(id: string): Promise<boolean> {
  const existing = await TABLE.get(id);
  if (!existing) return false;
  await TABLE.delete(id);
  return true;
}

export async function deletePlantings(ids: string[]): Promise<boolean> {
  await TABLE.bulkDelete(ids);
  return true;
}

export async function harvestPlanting(
  id: string,
  harvestDate: string,
  harvestCount?: number
): Promise<boolean> {
  const planting = await TABLE.get(id);
  if (!planting) return false;

  const attritionRate = harvestCount
    ? Math.round((1 - harvestCount / planting.plantingCount) * 100)
    : planting.attritionRate;

  await TABLE.update(id, {
    isHarvest: true,
    harvestDate,
    status: PlantingStatus.HARVESTED,
    attritionRate,
    updateTime: nowString(),
  });
  return true;
}

export async function getUnharvestedPlantings(): Promise<Planting[]> {
  const all = await TABLE.toArray();
  return all.filter(p => !p.isHarvest);
}

export async function getHarvestedPlantings(): Promise<Planting[]> {
  const all = await TABLE.toArray();
  return all.filter(p => p.isHarvest);
}

export async function generatePlantCode(sourceCode: string): Promise<string> {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${sourceCode}-${dateStr}`;
}

export async function resetPlantings(): Promise<void> {
  await TABLE.clear();
}
