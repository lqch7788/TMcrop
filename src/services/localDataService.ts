/**
 * 本地数据服务 - 统一的数据读写入口
 * 所有数据读写都通过这个服务，根据配置决定读写策略
 */

import { DATA_SOURCE_CONFIG, STORAGE_ASSIGNMENT } from '../config/dataSourceConfig';

const STORAGE_KEYS = {
  // 农事管理
  orders: 'crop_orders',
  instances: 'crop_instances',
  seedSources: 'crop_seed_sources',
  seedlings: 'crop_seedlings',
  plantings: 'crop_plantings',
  harvestRecords: 'harvest_records',
  farmTasks: 'farm_tasks',

  // 仓库管理
  warehouses: 'warehouses',
  inventory: 'inventory_stock_v3',

  // 物料相关
  materialRequests: 'material_requests',

  // 系统
  dictionaries: 'yuanxingtu_dictionaries',
  syncMeta: '_sync_metadata',
  pendingChanges: '_pending_changes',
};

class LocalDataService {
  // ========== 数据读取（从localStorage）==========

  getData<T>(key: string, defaultValue: T): T {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  // 物料申请数据
  getMaterialRequests<T = any>(): T {
    return this.getData<T>(STORAGE_KEYS.materialRequests, []);
  }

  setMaterialRequests<T>(data: T): void {
    this.setData(STORAGE_KEYS.materialRequests, data);
  }

  // ========== 数据写入 ==========

  setData<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // 记录变更用于后续同步
      if (DATA_SOURCE_CONFIG.syncEnabled) {
        this.recordChange(key, 'update', value);
      }
    } catch (error) {
      console.error(`[LocalDataService] 保存数据失败: ${key}`, error);
    }
  }

  // ========== 变更追踪 ==========

  private recordChange(tableName: string, operation: string, data: any): void {
    try {
      const changes = this.getData<any[]>(STORAGE_KEYS.pendingChanges, []);
      changes.push({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tableName,
        operation,
        timestamp: new Date().toISOString(),
        synced: false,
        data,
      });
      // 限制待同步数量
      if (changes.length > 500) {
        changes.splice(0, changes.length - 500);
      }
      localStorage.setItem(STORAGE_KEYS.pendingChanges, JSON.stringify(changes));
    } catch (error) {
      console.error('[LocalDataService] 记录变更失败', error);
    }
  }

  getPendingChanges() {
    return this.getData<any[]>(STORAGE_KEYS.pendingChanges, []);
  }

  clearSyncedChanges(syncedIds: string[]): void {
    const changes = this.getPendingChanges();
    const remaining = changes.filter(c => !syncedIds.includes(c.id));
    localStorage.setItem(STORAGE_KEYS.pendingChanges, JSON.stringify(remaining));
  }

  // ========== 数据合并 ==========

  /**
   * 合并本地数据和API数据，服务器优先
   * @param localData 本地数据
   * @param apiData API数据
   * @param idField ID字段名
   * @returns 合并后的数据
   */
  mergeData<T extends Record<string, any>>(
    localData: T[],
    apiData: T[],
    idField: string = 'id'
  ): T[] {
    if (!localData || localData.length === 0) return apiData;
    if (!apiData || apiData.length === 0) return localData;

    // 创建本地数据Map
    const localMap = new Map(localData.map(item => [item[idField], item]));

    // 合并：以API数据为准，本地数据作为补充
    const merged = new Map<string, T>();

    // 先添加API数据
    apiData.forEach(item => merged.set(item[idField], item));

    // 本地数据补充（API没有的）
    localData.forEach(item => {
      if (!merged.has(item[idField])) {
        merged.set(item[idField], item);
      }
    });

    return Array.from(merged.values());
  }
}

export const localDataService = new LocalDataService();
export { STORAGE_KEYS };
