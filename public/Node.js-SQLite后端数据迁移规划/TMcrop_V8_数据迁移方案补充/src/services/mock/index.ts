/**
 * Mock Services Layer - Complete Implementation
 * src/services/mock/index.ts
 * Provides fallback data when API is unavailable
 */

import {
  seedSources, seedlings, plantings, harvests,
} from '../../data/cropData';
import {
  cropOrders, cropInstances, suppliers as mockSuppliers,
  productionPlans, dailyPlans, monthlyPlans,
} from '../../data/mockData';
import { farmTasks } from '../../data/farmMockData';
import { produceInventories } from '../../data/produceMockData';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const now = () => new Date().toISOString();

// ===== 种源服务 =====
export const mockSeedSourceService = {
  async initSeedSources() { return seedSources || []; },
  async getSeedSources() { return seedSources || []; },
  async getSeedSourceById(id: string) { return (seedSources || []).find(s => s.id === id); },
  async addSeedSource(source: any) {
    const newItem = { ...source, id: generateId(), createTime: now(), updateTime: now() };
    seedSources?.push(newItem); return newItem;
  },
  async updateSeedSource(id: string, updates: any) {
    const idx = (seedSources || []).findIndex(s => s.id === id);
    if (idx >= 0) { seedSources[idx] = { ...seedSources[idx], ...updates, updateTime: now() }; return seedSources[idx]; }
    return null;
  },
  async deleteSeedSource(id: string) {
    const idx = (seedSources || []).findIndex(s => s.id === id);
    if (idx >= 0) { seedSources?.splice(idx, 1); return true; }
    return false;
  },
  async generateSeedCode(dateStr: string) {
    const serial = (seedSources || []).filter(s => s.seedCode?.startsWith(`ZZ${dateStr.replace(/-/g, '')}`)).length;
    return `ZZ${dateStr.replace(/-/g, '')}-${String(serial + 1).padStart(3, '0')}`;
  },
};

// ===== 育苗服务 =====
export const mockSeedlingService = {
  async initSeedlings() { return seedlings || []; },
  async getSeedlings() { return seedlings || []; },
  async getSeedlingById(id: string) { return (seedlings || []).find(s => s.id === id); },
  async addSeedling(seedling: any) {
    const newItem = { ...seedling, id: generateId(), createTime: now(), updateTime: now() };
    seedlings?.push(newItem); return newItem;
  },
  async updateSeedling(id: string, updates: any) {
    const idx = (seedlings || []).findIndex(s => s.id === id);
    if (idx >= 0) { seedlings[idx] = { ...seedlings[idx], ...updates, updateTime: now() }; return seedlings[idx]; }
    return null;
  },
  async deleteSeedling(id: string) {
    const idx = (seedlings || []).findIndex(s => s.id === id);
    if (idx >= 0) { seedlings?.splice(idx, 1); return true; }
    return false;
  },
};

// ===== 种植服务 =====
export const mockPlantingService = {
  async initPlantings() { return plantings || []; },
  async getPlantings() { return plantings || []; },
  async getPlantingById(id: string) { return (plantings || []).find(p => p.id === id); },
  async addPlanting(planting: any) {
    const newItem = { ...planting, id: generateId(), createTime: now(), updateTime: now() };
    plantings?.push(newItem); return newItem;
  },
  async updatePlanting(id: string, updates: any) {
    const idx = (plantings || []).findIndex(p => p.id === id);
    if (idx >= 0) { plantings[idx] = { ...plantings[idx], ...updates, updateTime: now() }; return plantings[idx]; }
    return null;
  },
  async deletePlanting(id: string) {
    const idx = (plantings || []).findIndex(p => p.id === id);
    if (idx >= 0) { plantings?.splice(idx, 1); return true; }
    return false;
  },
};

// ===== 采收服务 =====
export const mockHarvestService = {
  async initHarvestRecords() { return harvests || []; },
  async getHarvestRecords() { return harvests || []; },
  async getHarvestRecordById(id: string) { return (harvests || []).find(h => h.id === id); },
  async addHarvestRecord(record: any) {
    const newItem = { ...record, id: generateId(), createTime: now(), updateTime: now() };
    harvests?.push(newItem); return newItem;
  },
  async updateHarvestRecord(id: string, updates: any) {
    const idx = (harvests || []).findIndex(h => h.id === id);
    if (idx >= 0) { harvests[idx] = { ...harvests[idx], ...updates, updateTime: now() }; return harvests[idx]; }
    return null;
  },
  async deleteHarvestRecord(id: string) {
    const idx = (harvests || []).findIndex(h => h.id === id);
    if (idx >= 0) { harvests?.splice(idx, 1); return true; }
    return false;
  },
};

// ===== 作物实例服务 =====
export const mockCropInstanceService = {
  async initInstances() { return cropInstances || []; },
  async getInstances() { return cropInstances || []; },
  async getInstanceById(id: string) { return (cropInstances || []).find(i => i.id === id); },
  async createInstance(cropInfo: any, sourceOrigin: string, initialQuantity: number, options?: any) {
    const newItem = { id: generateId(), ...cropInfo, sourceOrigin, initialQuantity, currentQuantity: initialQuantity, currentStatus: 'seedling', ...options, createTime: now(), updateTime: now() };
    cropInstances?.push(newItem); return newItem;
  },
  async updateInstance(id: string, updates: any) {
    const idx = (cropInstances || []).findIndex(i => i.id === id);
    if (idx >= 0) { cropInstances[idx] = { ...cropInstances[idx], ...updates, updateTime: now() }; return cropInstances[idx]; }
    return null;
  },
  async deleteInstance(id: string) {
    const idx = (cropInstances || []).findIndex(i => i.id === id);
    if (idx >= 0) { cropInstances?.splice(idx, 1); return true; }
    return false;
  },
};

// ===== 作物订单服务 =====
export const mockCropOrderService = {
  async initOrders() { return cropOrders || []; },
  async getOrders() { return cropOrders || []; },
  async getOrderById(id: string) { return (cropOrders || []).find(o => o.id === id); },
  async createOrder(orderData: any) {
    const newItem = { ...orderData, id: generateId(), orderCode: `DD${Date.now()}`, status: 'pending', createTime: now(), updateTime: now() };
    cropOrders?.push(newItem); return newItem;
  },
  async updateOrder(id: string, updates: any) {
    const idx = (cropOrders || []).findIndex(o => o.id === id);
    if (idx >= 0) { cropOrders[idx] = { ...cropOrders[idx], ...updates, updateTime: now() }; return cropOrders[idx]; }
    return null;
  },
  async deleteOrder(id: string) {
    const idx = (cropOrders || []).findIndex(o => o.id === id);
    if (idx >= 0) { cropOrders?.splice(idx, 1); return true; }
    return false;
  },
};

// ===== 库存服务 =====
export const mockInventoryService = {
  async initInventories() { return produceInventories || []; },
  async getInventories() { return produceInventories || []; },
  async addInventory(item: any) {
    const newItem = { ...item, id: generateId(), createTime: now(), updateTime: now() };
    produceInventories?.push(newItem); return newItem;
  },
};

// ===== 农事任务服务 =====
export const mockFarmTaskService = {
  async initFarmTasks() { return farmTasks || []; },
  async getFarmTasks() { return farmTasks || []; },
  async addFarmTask(task: any) {
    const newItem = { ...task, id: generateId(), createTime: now(), updateTime: now() };
    farmTasks?.push(newItem); return newItem;
  },
};

// ===== 统一导出 =====
export const mockServices = {
  seedSourceService: mockSeedSourceService,
  seedlingService: mockSeedlingService,
  plantingService: mockPlantingService,
  harvestService: mockHarvestService,
  cropInstanceService: mockCropInstanceService,
  cropOrderService: mockCropOrderService,
  inventoryService: mockInventoryService,
  farmTaskService: mockFarmTaskService,
};

export default mockServices;
