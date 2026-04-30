/**
 * 种植模式 Service - Dexie.js 实现
 * 基于 IndexedDB，纯前端持久化
 */

import { db } from './db';
import { IPlantingConfigService } from '../interfaces';
import { nowString, generateId } from './utils';

const PLANTINGMODES_TABLE = db.plantingModes;
const PLANTAREAS_TABLE = db.plantAreas;
const BLOCKS_TABLE = db.blocks;

// ===== PlantingMode =====
export async function initPlantingModes(): Promise<PlantingMode[]> {
  const count = await PLANTINGMODES_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultPlantingModes();
    if (defaults.length > 0) {
      await PLANTINGMODES_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return PLANTINGMODES_TABLE.toArray();
}

export async function getPlantingModes(): Promise<PlantingMode[]> {
  return PLANTINGMODES_TABLE.toArray();
}

export async function getPlantingModeById(id: string): Promise<PlantingMode | undefined> {
  return PLANTINGMODES_TABLE.get(id);
}

export async function addPlantingMode(
  item: Omit<PlantingMode, 'id' | 'createTime' | 'updateTime'>
): Promise<PlantingMode> {
  const now = nowString();
  const newItem: PlantingMode = { ...item, id: generateId('PL'), createTime: now, updateTime: now };
  await PLANTINGMODES_TABLE.add(newItem);
  return newItem;
}

export async function updatePlantingMode(id: string, updates: Partial<PlantingMode>): Promise<PlantingMode | null> {
  const existing = await PLANTINGMODES_TABLE.get(id);
  if (!existing) return null;
  const updated: PlantingMode = { ...existing, ...updates, id, updateTime: nowString() };
  await PLANTINGMODES_TABLE.put(updated);
  return updated;
}

export async function deletePlantingMode(id: string): Promise<boolean> {
  const existing = await PLANTINGMODES_TABLE.get(id);
  if (!existing) return false;
  await PLANTINGMODES_TABLE.delete(id);
  return true;
}

export async function deletePlantingModes(ids: string[]): Promise<boolean> {
  await PLANTINGMODES_TABLE.bulkDelete(ids);
  return true;
}

export async function resetPlantingModes(): Promise<void> {
  await PLANTINGMODES_TABLE.clear();
}

function getDefaultPlantingModes(): PlantingMode[] {
  return [];
}

// ===== PlantArea =====
export async function initPlantAreas(): Promise<PlantArea[]> {
  const count = await PLANTAREAS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultPlantAreas();
    if (defaults.length > 0) {
      await PLANTAREAS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return PLANTAREAS_TABLE.toArray();
}

export async function getPlantAreas(): Promise<PlantArea[]> {
  return PLANTAREAS_TABLE.toArray();
}

export async function getPlantAreaById(id: string): Promise<PlantArea | undefined> {
  return PLANTAREAS_TABLE.get(id);
}

export async function addPlantArea(
  item: Omit<PlantArea, 'id' | 'createTime' | 'updateTime'>
): Promise<PlantArea> {
  const now = nowString();
  const newItem: PlantArea = { ...item, id: generateId('PL'), createTime: now, updateTime: now };
  await PLANTAREAS_TABLE.add(newItem);
  return newItem;
}

export async function updatePlantArea(id: string, updates: Partial<PlantArea>): Promise<PlantArea | null> {
  const existing = await PLANTAREAS_TABLE.get(id);
  if (!existing) return null;
  const updated: PlantArea = { ...existing, ...updates, id, updateTime: nowString() };
  await PLANTAREAS_TABLE.put(updated);
  return updated;
}

export async function deletePlantArea(id: string): Promise<boolean> {
  const existing = await PLANTAREAS_TABLE.get(id);
  if (!existing) return false;
  await PLANTAREAS_TABLE.delete(id);
  return true;
}

export async function deletePlantAreas(ids: string[]): Promise<boolean> {
  await PLANTAREAS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetPlantAreas(): Promise<void> {
  await PLANTAREAS_TABLE.clear();
}

function getDefaultPlantAreas(): PlantArea[] {
  return [];
}

// ===== Block =====
export async function initBlocks(): Promise<Block[]> {
  const count = await BLOCKS_TABLE.count();
  if (count === 0) {
    const defaults = getDefaultBlocks();
    if (defaults.length > 0) {
      await BLOCKS_TABLE.bulkAdd(defaults);
      return defaults;
    }
  }
  return BLOCKS_TABLE.toArray();
}

export async function getBlocks(): Promise<Block[]> {
  return BLOCKS_TABLE.toArray();
}

export async function getBlockById(id: string): Promise<Block | undefined> {
  return BLOCKS_TABLE.get(id);
}

export async function addBlock(
  item: Omit<Block, 'id' | 'createTime' | 'updateTime'>
): Promise<Block> {
  const now = nowString();
  const newItem: Block = { ...item, id: generateId('BL'), createTime: now, updateTime: now };
  await BLOCKS_TABLE.add(newItem);
  return newItem;
}

export async function updateBlock(id: string, updates: Partial<Block>): Promise<Block | null> {
  const existing = await BLOCKS_TABLE.get(id);
  if (!existing) return null;
  const updated: Block = { ...existing, ...updates, id, updateTime: nowString() };
  await BLOCKS_TABLE.put(updated);
  return updated;
}

export async function deleteBlock(id: string): Promise<boolean> {
  const existing = await BLOCKS_TABLE.get(id);
  if (!existing) return false;
  await BLOCKS_TABLE.delete(id);
  return true;
}

export async function deleteBlocks(ids: string[]): Promise<boolean> {
  await BLOCKS_TABLE.bulkDelete(ids);
  return true;
}

export async function resetBlocks(): Promise<void> {
  await BLOCKS_TABLE.clear();
}

function getDefaultBlocks(): Block[] {
  return [];
}
