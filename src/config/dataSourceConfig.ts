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
// P2 #17 修复: V2.1 架构铁律——业务数据不落 IndexedDB / localStorage，全部走 API → Store 内存
// 此配置仅保留 'api' / 'localStorage' 标记以兼容旧代码引用
// 业务数据（orders, seed-sources 等）必须 'api'，唯一允许 'localStorage' 的是认证 token / 用户偏好（非业务）
export const STORAGE_ASSIGNMENT: Record<string, 'api' | 'localStorage'> = {
  // === API 直连（所有业务数据）===
  'orders': 'api',
  'crop-instances': 'api',
  'harvest-records': 'api',
  'seedling-records': 'api',
  'planting-records': 'api',
  'seed-sources': 'api',
  'farm-tasks': 'api',
  'production-plans': 'api',
  'purchase-plans': 'api',
  'inventory': 'api',
  'approvals': 'api',
  'labor-records': 'api',
  'material-requests': 'api',

  // === localStorage（仅允许非业务数据：认证/偏好）===
  'auth-token': 'localStorage',     // JWT token 持久化（认证必须，跨会话保留）
  'user-preferences': 'localStorage', // 主题/UI 偏好（非业务）
  'data-mode': 'localStorage',         // 演示模式开关（非业务）
};
