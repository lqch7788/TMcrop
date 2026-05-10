/**
 * 数据源相关类型定义
 */

// 数据读取优先级
export type DataSource = 'memory' | 'indexedDB' | 'localStorage' | 'api';

// 同步状态
export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

// 同步记录
export interface SyncRecord {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: string;
  synced: boolean;
  error?: string;
}

// 数据源状态
export interface DataSourceStatus {
  currentSource: DataSource;
  apiAvailable: boolean;
  lastSyncTime: string | null;
  pendingSyncCount: number;
  syncState: SyncState;
}

// 待同步变更
export interface PendingChange {
  id: string;
  key: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

// 种子数据元数据
export interface SeedMeta {
  source: 'localStorage' | 'api' | 'generated';
  migratedAt: string;
  version: string;
}
