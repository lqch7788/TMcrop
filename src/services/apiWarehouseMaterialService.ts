/**
 * 仓库物料 API 服务
 * 对接后端 /api/materials
 * API失败时降级到 localStorage
 */

import { apiClient } from './apiClient';

// localStorage 配置
const STORAGE_KEY = 'yuanxingtu_warehouse_materials';
const INBOUND_STORAGE_KEY = 'yuanxingtu_warehouse_inbound';

// 物料类型
export interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  barcode: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: string;
}

// 入库记录类型
export interface InboundRecord {
  id: number;
  code: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  inboundDate: string;
  supplier: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  warehouse: string;
  location: string;
  operator: string;
  remarks: string;
  createTime: string;
}

// 默认空数据
const defaultMaterials: Material[] = [];
const defaultInboundRecords: InboundRecord[] = [];

// 从 localStorage 读取数据
function getStoredMaterials(): Material[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultMaterials;
  } catch {
    return defaultMaterials;
  }
}

function getStoredInboundRecords(): InboundRecord[] {
  try {
    const stored = localStorage.getItem(INBOUND_STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultInboundRecords;
  } catch {
    return defaultInboundRecords;
  }
}

// 保存数据到 localStorage
function saveMaterials(data: Material[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function saveInboundRecords(data: InboundRecord[]): void {
  localStorage.setItem(INBOUND_STORAGE_KEY, JSON.stringify(data));
}

/**
 * 获取物料列表（带localStorage降级）
 */
export async function getMaterials(): Promise<Material[]> {
  try {
    const data = await apiClient.get<Material[]>('/materials');
    saveMaterials(data);
    return data;
  } catch (error) {
    console.warn('[物料API] 获取物料列表失败，降级到localStorage:', error);
    return getStoredMaterials();
  }
}

/**
 * 获取入库记录列表（带localStorage降级）
 */
export async function getInboundRecords(): Promise<InboundRecord[]> {
  try {
    const data = await apiClient.get<InboundRecord[]>('/materials/inbound');
    saveInboundRecords(data);
    return data;
  } catch (error) {
    console.warn('[物料API] 获取入库记录失败，降级到localStorage:', error);
    return getStoredInboundRecords();
  }
}

/**
 * 创建入库记录（带localStorage降级）
 */
export async function createInboundRecord(record: Omit<InboundRecord, 'id'>): Promise<InboundRecord> {
  try {
    const id = await apiClient.post<number>('/materials/inbound', record);
    const newRecord: InboundRecord = { ...record, id };
    // 同步到 localStorage
    const stored = getStoredInboundRecords();
    stored.unshift(newRecord);
    saveInboundRecords(stored);
    return newRecord;
  } catch (error) {
    console.warn('[物料API] 创建入库记录失败，降级到localStorage:', error);
    const localRecord: InboundRecord = { ...record, id: Date.now() };
    const stored = getStoredInboundRecords();
    stored.unshift(localRecord);
    saveInboundRecords(stored);
    return localRecord;
  }
}

/**
 * 更新物料（带localStorage降级）
 */
export async function updateMaterial(id: number, updates: Partial<Material>): Promise<Material | null> {
  try {
    await apiClient.put(`/materials/${id}`, updates);
    // 同步到 localStorage
    const stored = getStoredMaterials();
    const index = stored.findIndex(m => m.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveMaterials(stored);
    }
    return stored[index] || null;
  } catch (error) {
    console.warn('[物料API] 更新物料失败，降级到localStorage:', error);
    const stored = getStoredMaterials();
    const index = stored.findIndex(m => m.id === id);
    if (index !== -1) {
      stored[index] = { ...stored[index], ...updates };
      saveMaterials(stored);
      return stored[index];
    }
    return null;
  }
}

/**
 * 删除物料（带localStorage降级）
 */
export async function deleteMaterial(id: number): Promise<boolean> {
  try {
    await apiClient.delete(`/materials/${id}`);
    // 从 localStorage 移除
    const stored = getStoredMaterials();
    const filtered = stored.filter(m => m.id !== id);
    saveMaterials(filtered);
    return true;
  } catch (error) {
    console.warn('[物料API] 删除物料失败，降级到localStorage:', error);
    const stored = getStoredMaterials();
    const filtered = stored.filter(m => m.id !== id);
    saveMaterials(filtered);
    return true;
  }
}
