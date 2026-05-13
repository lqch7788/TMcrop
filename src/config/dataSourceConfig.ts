/**
 * 数据源配置
 * 控制数据读取来源和同步行为
 *
 * 借鉴V3架构三模式设计
 */

export enum DataMode {
  OFFLINE = 'offline',     // 演示模式：完全本地，无API依赖
  SYNC = 'sync',           // 开发模式：缓存优先，后台API刷新
  API_ONLY = 'api-only',   // 生产模式：API直连
}

export interface DataSourceConfig {
  mode: DataMode;
  apiBaseUrl: string;
  syncEnabled: boolean;
  syncInterval: number;
  apiCheckInterval: number;
  autoSeed: boolean;
}

const DATA_MODE = (import.meta.env.VITE_DATA_MODE as DataMode) || DataMode.SYNC;

export function getDataSourceConfig(): DataSourceConfig {
  switch (DATA_MODE) {
    case DataMode.OFFLINE:
      return {
        mode: DataMode.OFFLINE,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
        syncEnabled: false,
        syncInterval: 0,
        apiCheckInterval: 0,
        autoSeed: import.meta.env.VITE_AUTO_SEED !== 'false',
      };

    case DataMode.API_ONLY:
      return {
        mode: DataMode.API_ONLY,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
        syncEnabled: false,
        syncInterval: 0,
        apiCheckInterval: 0,
        autoSeed: false,
      };

    case DataMode.SYNC:
    default:
      return {
        mode: DataMode.SYNC,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
        syncEnabled: true,
        syncInterval: 60000,
        apiCheckInterval: 30000,
        autoSeed: false,
      };
  }
}

export const DATA_SOURCE_CONFIG = getDataSourceConfig();

// 存储分配表 - 决定数据存储位置
export const STORAGE_ASSIGNMENT: Record<string, 'indexedDB' | 'localStorage'> = {
  // === IndexedDB（大数据量业务数据）===
  'orders': 'indexedDB',
  'crop-instances': 'indexedDB',
  'harvest-records': 'indexedDB',
  'seedling-records': 'indexedDB',
  'planting-records': 'indexedDB',
  'seed-sources': 'indexedDB',
  'farm-tasks': 'indexedDB',
  'production-plans': 'indexedDB',
  'purchase-plans': 'indexedDB',
  'inventory': 'indexedDB',
  'approvals': 'indexedDB',
  'labor-records': 'indexedDB',
  'material-requests': 'indexedDB',

  // === localStorage（极小配置）===
  'auth-token': 'localStorage',
  'user-preferences': 'localStorage',
  'data-mode': 'localStorage',
};
