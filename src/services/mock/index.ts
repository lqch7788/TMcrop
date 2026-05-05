/**
 * Mock Services Layer - 完整实现
 * src/services/mock/index.ts
 *
 * 当API不可用时提供后备数据支持
 * 用于localStorage和mockData双轨制
 */

import {
  seedSources,
  seedlings,
  plantings,
  harvests,
  cropOrders,
  cropInstances,
  suppliers,
  farmTasks,
  produceInventories,
} from '../../data/mockData';
import { SeedSource } from '../../types/crop';
import { Seedling } from '../../types/crop';
import { Planting } from '../../types/crop';
import { HarvestRecord } from '../../types/index';
import { CropInstance } from '../../types/crop';
import { CropOrder } from '../../types/crop';
import { ProduceInventory } from '../../types/inventory';

// Helper functions - 生成ID和时间戳
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const now = () => new Date().toISOString();

// 通用更新类型 - 用于部分更新场景
type UpdateRecord<T> = Partial<T> & { id?: string };

// 每日记录类型（用于育苗每日记录）
interface DailyRecord {
  id: string;
  seedlingId: string;
  recordDate: string;
  plantHeight?: number;
  leafCount?: number;
  temperature?: number;
  humidity?: number;
  remarks?: string;
  [key: string]: unknown;
}

// 供应商类型
interface Supplier {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
  [key: string]: unknown;
}

// 农事任务类型
interface FarmTask {
  id: string;
  taskCode: string;
  title: string;
  status: string;
  [key: string]: unknown;
}

// ===== 种源服务 =====
export const mockSeedSourceService = {
  async initSeedSources() {
    return seedSources || [];
  },

  async getSeedSources() {
    return seedSources || [];
  },

  async getSeedSourceById(id: string) {
    return (seedSources || []).find((s) => s.id === id);
  },

  async getSeedSourcesByIds(ids: string[]) {
    return (seedSources || []).filter((s) => ids.includes(s.id));
  },

  async addSeedSource(source: Partial<SeedSource>) {
    const newItem = {
      ...source,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as SeedSource;
    seedSources?.push(newItem);
    return newItem;
  },

  async updateSeedSource(id: string, updates: Partial<SeedSource>) {
    const idx = (seedSources || []).findIndex((s) => s.id === id);
    if (idx >= 0) {
      seedSources[idx] = { ...seedSources[idx], ...updates, updateTime: now() };
      return seedSources[idx];
    }
    return null;
  },

  async deleteSeedSource(id: string) {
    const idx = (seedSources || []).findIndex((s) => s.id === id);
    if (idx >= 0) {
      seedSources?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deleteSeedSources(ids: string[]) {
    let count = 0;
    ids.forEach((id) => {
      const idx = (seedSources || []).findIndex((s) => s.id === id);
      if (idx >= 0) {
        seedSources?.splice(idx, 1);
        count++;
      }
    });
    return count > 0;
  },

  async decreaseAvailableCount(id: string, count: number) {
    const item = (seedSources || []).find((s) => s.id === id);
    if (item) {
      item.quantity = Math.max(0, (item.quantity || 0) - count);
      item.updateTime = now();
      return true;
    }
    return false;
  },

  async resetSeedSources() {
    if (seedSources) seedSources.length = 0;
  },

  async getTodayMaxSeedCodeSerial(dateStr: string) {
    const prefix = `ZZ${dateStr.replace(/-/g, '')}`;
    const codes = (seedSources || [])
      .filter((s) => s.seedCode?.startsWith(prefix))
      .map((s) => parseInt(s.seedCode.split('-')[1] || '0'));
    return Math.max(0, ...codes);
  },

  async generateSeedCode(dateStr: string) {
    const serial = await this.getTodayMaxSeedCodeSerial(dateStr);
    return `ZZ${dateStr.replace(/-/g, '')}-${String(serial + 1).padStart(3, '0')}`;
  },
};

// ===== 育苗服务 =====
export const mockSeedlingService = {
  async initSeedlings() {
    return seedlings || [];
  },

  async getSeedlings() {
    return seedlings || [];
  },

  async getSeedlingById(id: string) {
    return (seedlings || []).find((s) => s.id === id);
  },

  async getSeedlingsByIds(ids: string[]) {
    return (seedings || []).filter((s) => ids.includes(s.id));
  },

  async getSeedlingsBySourceId(sourceId: string) {
    return (seedlings || []).filter((s) => s.sourceId === sourceId);
  },

  async addSeedling(seedling: Partial<Seedling>) {
    const newItem = {
      ...seedling,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as Seedling;
    seedlings?.push(newItem);
    return newItem;
  },

  async updateSeedling(id: string, updates: Partial<Seedling>) {
    const idx = (seedlings || []).findIndex((s) => s.id === id);
    if (idx >= 0) {
      seedlings[idx] = { ...seedings[idx], ...updates, updateTime: now() };
      return seedlings[idx];
    }
    return null;
  },

  async deleteSeedling(id: string) {
    const idx = (seedlings || []).findIndex((s) => s.id === id);
    if (idx >= 0) {
      seedlings?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deleteSeedlings(ids: string[]) {
    let count = 0;
    ids.forEach((id) => {
      const idx = (seedlings || []).findIndex((s) => s.id === id);
      if (idx >= 0) {
        seedlings?.splice(idx, 1);
        count++;
      }
    });
    return count > 0;
  },

  async addDailyRecord(seedlingId: string, record: Partial<DailyRecord>) {
    const seedling = (seedlings || []).find((s) => s.id === seedlingId);
    if (seedling) {
      if (!seedling.dailyRecords) seedling.dailyRecords = [];
      const newRecord = { ...record, id: generateId(), seedlingId };
      seedling.dailyRecords.push(newRecord);
      return newRecord;
    }
    return null;
  },

  async deleteDailyRecord(seedlingId: string, recordId: string) {
    const seedling = (seedlings || []).find((s) => s.id === seedlingId);
    if (seedling && seedling.dailyRecords) {
      const idx = seedling.dailyRecords.findIndex((r: DailyRecord) => r.id === recordId);
      if (idx >= 0) {
        seedling.dailyRecords.splice(idx, 1);
        return true;
      }
    }
    return false;
  },

  async increasePlantedCount(id: string, count: number) {
    const item = (seedlings || []).find((s) => s.id === id);
    if (item) {
      item.plantedCount = (item.plantedCount || 0) + count;
      item.updateTime = now();
      return true;
    }
    return false;
  },

  async getTransplantReadySeedlings() {
    return (seedlings || []).filter((s) => s.status === 'ready_for_transplant');
  },

  async getAvailableTransplantCount(id: string) {
    const item = (seedlings || []).find((s) => s.id === id);
    return item ? (item.seedQuantity || 0) - (item.plantedCount || 0) : 0;
  },

  async resetSeedlings() {
    if (seedlings) seedlings.length = 0;
  },
};

// ===== 种植服务 =====
export const mockPlantingService = {
  async initPlantings() {
    return plantings || [];
  },

  async getPlantings() {
    return plantings || [];
  },

  async getPlantingById(id: string) {
    return (plantings || []).find((p) => p.id === id);
  },

  async getPlantingsByIds(ids: string[]) {
    return (plantings || []).filter((p) => ids.includes(p.id));
  },

  async getPlantingsBySourceId(sourceId: string) {
    return (plantings || []).filter((p) => p.sourceId === sourceId);
  },

  async addPlanting(planting: Partial<Planting>) {
    const newItem = {
      ...planting,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as Planting;
    plantings?.push(newItem);
    return newItem;
  },

  async updatePlanting(id: string, updates: Partial<Planting>) {
    const idx = (plantings || []).findIndex((p) => p.id === id);
    if (idx >= 0) {
      plantings[idx] = { ...plantings[idx], ...updates, updateTime: now() };
      return plantings[idx];
    }
    return null;
  },

  async deletePlanting(id: string) {
    const idx = (plantings || []).findIndex((p) => p.id === id);
    if (idx >= 0) {
      plantings?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deletePlantings(ids: string[]) {
    let count = 0;
    ids.forEach((id) => {
      const idx = (plantings || []).findIndex((p) => p.id === id);
      if (idx >= 0) {
        plantings?.splice(idx, 1);
        count++;
      }
    });
    return count > 0;
  },

  async harvestPlanting(id: string, harvestDate: string, harvestCount?: number) {
    const item = (plantings || []).find((p) => p.id === id);
    if (item) {
      item.status = 'harvested';
      item.actualHarvestDate = harvestDate;
      item.harvestCount = harvestCount || item.plantQuantity;
      item.updateTime = now();
      return true;
    }
    return false;
  },

  async getUnharvestedPlantings() {
    return (plantings || []).filter((p) => p.status !== 'harvested');
  },

  async getHarvestedPlantings() {
    return (plantings || []).filter((p) => p.status === 'harvested');
  },

  async generatePlantCode(sourceCode: string) {
    const count = (plantings || []).filter((p) => p.plantCode?.startsWith(sourceCode)).length;
    return `${sourceCode}-${String(count + 1).padStart(2, '0')}`;
  },

  async resetPlantings() {
    if (plantings) plantings.length = 0;
  },
};

// ===== 采收服务 =====
export const mockHarvestService = {
  async initHarvestRecords() {
    return harvests || [];
  },

  async getHarvestRecords() {
    return harvests || [];
  },

  async getHarvestRecordById(id: string) {
    return (harvests || []).find((h) => h.id === id);
  },

  async getHarvestRecordsByIds(ids: string[]) {
    return (harvests || []).filter((h) => ids.includes(h.id));
  },

  async getHarvestRecordsByBatchCode(batchCode: string) {
    return (harvests || []).filter((h) => h.batchCode === batchCode);
  },

  async addHarvestRecord(record: Partial<HarvestRecord>) {
    const newItem = {
      ...record,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as HarvestRecord;
    harvests?.push(newItem);
    return newItem;
  },

  async addHarvestRecords(newRecords: Partial<HarvestRecord>[]) {
    const items = newRecords.map((r) => ({
      ...r,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    })) as HarvestRecord[];
    harvests?.push(...items);
    return items;
  },

  async updateHarvestRecord(id: string, updates: Partial<HarvestRecord>) {
    const idx = (harvests || []).findIndex((h) => h.id === id);
    if (idx >= 0) {
      harvests[idx] = { ...harvests[idx], ...updates, updateTime: now() };
      return harvests[idx];
    }
    return null;
  },

  async deleteHarvestRecord(id: string) {
    const idx = (harvests || []).findIndex((h) => h.id === id);
    if (idx >= 0) {
      harvests?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deleteHarvestRecords(ids: string[]) {
    let count = 0;
    ids.forEach((id) => {
      const idx = (harvests || []).findIndex((h) => h.id === id);
      if (idx >= 0) {
        harvests?.splice(idx, 1);
        count++;
      }
    });
    return count > 0;
  },

  async generateHarvestCode() {
    const count = (harvests || []).length;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `CS${date}${String(count + 1).padStart(3, '0')}`;
  },

  async resetHarvestRecords() {
    if (harvests) harvests.length = 0;
  },
};

// ===== 作物实例服务 =====
export const mockCropInstanceService = {
  async initInstances() {
    return cropInstances || [];
  },

  async getInstances() {
    return cropInstances || [];
  },

  async getInstanceById(id: string) {
    return (cropInstances || []).find((i) => i.id === id);
  },

  async getInstancesByIds(ids: string[]) {
    return (cropInstances || []).filter((i) => ids.includes(i.id));
  },

  async getInstancesByOrderId(orderId: string) {
    return (cropInstances || []).filter((i) => i.orderId === orderId);
  },

  async createInstance(cropInfo: Partial<CropInstance>, sourceOrigin: string, initialQuantity: number, options?: Partial<CropInstance>) {
    const newItem = {
      id: generateId(),
      ...cropInfo,
      sourceOrigin,
      initialQuantity,
      currentQuantity: initialQuantity,
      currentStatus: 'seedling',
      ...options,
      createTime: now(),
      updateTime: now(),
    } as CropInstance;
    cropInstances?.push(newItem);
    return newItem;
  },

  async updateInstance(id: string, updates: Partial<CropInstance>) {
    const idx = (cropInstances || []).findIndex((i) => i.id === id);
    if (idx >= 0) {
      cropInstances[idx] = { ...cropInstances[idx], ...updates, updateTime: now() };
      return cropInstances[idx];
    }
    return null;
  },

  async deleteInstance(id: string) {
    const idx = (cropInstances || []).findIndex((i) => i.id === id);
    if (idx >= 0) {
      cropInstances?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deleteInstances(ids: string[]) {
    let count = 0;
    ids.forEach((id) => {
      const idx = (cropInstances || []).findIndex((i) => i.id === id);
      if (idx >= 0) {
        cropInstances?.splice(idx, 1);
        count++;
      }
    });
    return count > 0;
  },

  async updateQuantity(id: string, quantity: number) {
    const item = (cropInstances || []).find((i) => i.id === id);
    if (item) {
      item.currentQuantity = quantity;
      item.updateTime = now();
      return true;
    }
    return false;
  },

  async updateStatus(id: string, status: string) {
    const item = (cropInstances || []).find((i) => i.id === id);
    if (item) {
      item.currentStatus = status;
      item.updateTime = now();
      return true;
    }
    return false;
  },

  async getTraceChain(id: string) {
    const instance = (cropInstances || []).find((i) => i.id === id);
    return instance?.traceChain || null;
  },

  async resetInstances() {
    if (cropInstances) cropInstances.length = 0;
  },
};

// ===== 作物订单服务 =====
export const mockCropOrderService = {
  async initOrders() {
    return cropOrders || [];
  },

  async getOrders() {
    return cropOrders || [];
  },

  async getOrderById(id: string) {
    return (cropOrders || []).find((o) => o.id === id);
  },

  async getOrdersByIds(ids: string[]) {
    return (cropOrders || []).filter((o) => ids.includes(o.id));
  },

  async createOrder(orderData: Partial<CropOrder>) {
    const newItem = {
      ...orderData,
      id: generateId(),
      orderCode: `DD${Date.now()}`,
      status: 'pending',
      createTime: now(),
      updateTime: now(),
    } as CropOrder;
    cropOrders?.push(newItem);
    return newItem;
  },

  async updateOrder(id: string, updates: Partial<CropOrder>) {
    const idx = (cropOrders || []).findIndex((o) => o.id === id);
    if (idx >= 0) {
      cropOrders[idx] = { ...cropOrders[idx], ...updates, updateTime: now() };
      return cropOrders[idx];
    }
    return null;
  },

  async deleteOrder(id: string) {
    const idx = (cropOrders || []).findIndex((o) => o.id === id);
    if (idx >= 0) {
      cropOrders?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async deleteOrders(ids: string[]) {
    let count = 0;
    ids.forEach((id) => {
      const idx = (cropOrders || []).findIndex((o) => o.id === id);
      if (idx >= 0) {
        cropOrders?.splice(idx, 1);
        count++;
      }
    });
    return count > 0;
  },

  async linkInstances(orderId: string, instanceIds: string[]) {
    const order = (cropOrders || []).find((o) => o.id === orderId);
    if (order) {
      order.instanceIds = [...(order.instanceIds || []), ...instanceIds];
      order.updateTime = now();
      return true;
    }
    return false;
  },

  async unlinkInstances(orderId: string, instanceIds: string[]) {
    const order = (cropOrders || []).find((o) => o.id === orderId);
    if (order && order.instanceIds) {
      order.instanceIds = order.instanceIds.filter((id: string) => !instanceIds.includes(id));
      order.updateTime = now();
      return true;
    }
    return false;
  },

  async updateOrderStatus(id: string, status: string) {
    const order = (cropOrders || []).find((o) => o.id === id);
    if (order) {
      order.status = status;
      order.updateTime = now();
      return true;
    }
    return false;
  },

  async getOrderDetail(id: string) {
    const order = (cropOrders || []).find((o) => o.id === id);
    if (order) {
      return { ...order, instances: order.instanceIds || [] };
    }
    return null;
  },

  async resetOrders() {
    if (cropOrders) cropOrders.length = 0;
  },
};

// ===== 供应商服务 =====
export const mockSupplierService = {
  async initSuppliers() {
    return suppliers || [];
  },

  async getSuppliers() {
    return suppliers || [];
  },

  async getSupplierById(id: string) {
    return (suppliers || []).find((s) => s.id === id);
  },

  async addSupplier(supplier: Partial<Supplier>) {
    const newItem = {
      ...supplier,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as Supplier;
    suppliers?.push(newItem);
    return newItem;
  },

  async updateSupplier(id: string, updates: Partial<Supplier>) {
    const idx = (suppliers || []).findIndex((s) => s.id === id);
    if (idx >= 0) {
      suppliers[idx] = { ...suppliers[idx], ...updates, updateTime: now() };
      return suppliers[idx];
    }
    return null;
  },

  async deleteSupplier(id: string) {
    const idx = (suppliers || []).findIndex((s) => s.id === id);
    if (idx >= 0) {
      suppliers?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async resetSuppliers() {
    if (suppliers) suppliers.length = 0;
  },
};

// ===== 库存服务 =====
export const mockInventoryService = {
  async initInventories() {
    return produceInventories || [];
  },

  async getInventories() {
    return produceInventories || [];
  },

  async getInventoryById(id: string) {
    return (produceInventories || []).find((i) => i.id === id);
  },

  async getInventoriesByBatchCode(batchCode: string) {
    return (produceInventories || []).filter((i) => i.batchCode === batchCode);
  },

  async addInventory(inventory: Partial<ProduceInventory>) {
    const newItem = {
      ...inventory,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as ProduceInventory;
    produceInventories?.push(newItem);
    return newItem;
  },

  async updateInventory(id: string, updates: Partial<ProduceInventory>) {
    const idx = (produceInventories || []).findIndex((i) => i.id === id);
    if (idx >= 0) {
      produceInventories[idx] = { ...produceInventories[idx], ...updates, updateTime: now() };
      return produceInventories[idx];
    }
    return null;
  },

  async deleteInventory(id: string) {
    const idx = (produceInventories || []).findIndex((i) => i.id === id);
    if (idx >= 0) {
      produceInventories?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async adjustQuantity(id: string, quantity: number) {
    const item = (produceInventories || []).find((i) => i.id === id);
    if (item) {
      item.quantity = quantity;
      item.updateTime = now();
      return true;
    }
    return false;
  },

  async resetInventories() {
    if (produceInventories) produceInventories.length = 0;
  },
};

// ===== 农事任务服务 =====
export const mockFarmTaskService = {
  async initFarmTasks() {
    return farmTasks || [];
  },

  async getFarmTasks() {
    return farmTasks || [];
  },

  async getFarmTaskById(id: string) {
    return (farmTasks || []).find((t) => t.id === id);
  },

  async addFarmTask(task: Partial<FarmTask>) {
    const newItem = {
      ...task,
      id: generateId(),
      createTime: now(),
      updateTime: now(),
    } as FarmTask;
    farmTasks?.push(newItem);
    return newItem;
  },

  async updateFarmTask(id: string, updates: Partial<FarmTask>) {
    const idx = (farmTasks || []).findIndex((t) => t.id === id);
    if (idx >= 0) {
      farmTasks[idx] = { ...farmTasks[idx], ...updates, updateTime: now() };
      return farmTasks[idx];
    }
    return null;
  },

  async deleteFarmTask(id: string) {
    const idx = (farmTasks || []).findIndex((t) => t.id === id);
    if (idx >= 0) {
      farmTasks?.splice(idx, 1);
      return true;
    }
    return false;
  },

  async completeFarmTask(id: string, completionNote?: string) {
    const task = (farmTasks || []).find((t) => t.id === id);
    if (task) {
      task.status = 'completed';
      task.completionNote = completionNote;
      task.completionDate = now();
      task.updateTime = now();
      return true;
    }
    return false;
  },

  async resetFarmTasks() {
    if (farmTasks) farmTasks.length = 0;
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
  supplierService: mockSupplierService,
  inventoryService: mockInventoryService,
  farmTaskService: mockFarmTaskService,
};

// 导出所有单独的service
export {
  mockSeedSourceService,
  mockSeedlingService,
  mockPlantingService,
  mockHarvestService,
  mockCropInstanceService,
  mockCropOrderService,
  mockSupplierService,
  mockInventoryService,
  mockFarmTaskService,
};
