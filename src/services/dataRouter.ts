/**
 * 数据路由器 - DataRouter
 *
 * 借鉴V3架构核心设计
 * 负责数据读取/写入的路由选择
 */

import { DataMode, DATA_SOURCE_CONFIG } from '../config/dataSourceConfig';
import { unifiedCache } from './unifiedCache';
import { PendingChange } from '../types/dataSource';

const PENDING_CHANGES_KEY = '_pending_changes';

/**
 * 数据路由配置
 */
export interface DataRouteConfig<T = unknown> {
  key: string;
  apiRead?: () => Promise<T>;
  apiWrite?: (data: T) => Promise<T>;
  localRead?: () => T;
  localWrite?: (data: T) => void;
}

/**
 * DataRouter - 数据路由器
 */
class DataRouter {
  private pendingChanges: PendingChange[] = [];

  constructor() {
    this.loadPendingChanges();
  }

  // ========== 读取 ==========

  /**
   * 读取数据（根据模式自动路由）
   */
  async read<T>(config: DataRouteConfig<T>): Promise<T | null> {
    const { key, apiRead } = config;

    switch (DATA_SOURCE_CONFIG.mode) {
      case DataMode.OFFLINE:
        return this.readOffline<T>(key);

      case DataMode.SYNC:
        return this.readSync<T>(key, apiRead);

      case DataMode.API_ONLY:
        return this.readApiOnly<T>(key, apiRead);
    }
  }

  /**
   * OFFLINE模式：只从本地读取
   */
  private async readOffline<T>(key: string): Promise<T | null> {
    // 1. 检查缓存
    const cached = await unifiedCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. 返回空（等待种子数据填充）
    return null;
  }

  /**
   * SYNC模式：缓存优先，后台API刷新
   */
  private async readSync<T>(key: string, apiRead?: () => Promise<T>): Promise<T | null> {
    // 1. 立即返回缓存（不白屏）
    const cached = await unifiedCache.get<T>(key);

    // 2. 后台调API刷新
    if (apiRead && navigator.onLine) {
      apiRead()
        .then(apiData => {
          unifiedCache.set(key, apiData);
          this.notifySubscribers(key, apiData);
        })
        .catch(err => {
          console.warn(`[DataRouter] API刷新失败 ${key}:`, err.message);
        });
    }

    return cached;
  }

  /**
   * API_ONLY模式：只从API读取
   */
  private async readApiOnly<T>(key: string, apiRead?: () => Promise<T>): Promise<T | null> {
    if (!apiRead) {
      throw new Error(`生产模式需要apiRead: ${key}`);
    }

    try {
      const apiData = await apiRead();
      // 回填缓存加速下次访问
      await unifiedCache.set(key, apiData);
      return apiData;
    } catch (error) {
      console.error(`[DataRouter] API读取失败 ${key}:`, error);
      return null;
    }
  }

  // ========== 写入 ==========

  /**
   * 写入数据（根据模式自动路由）
   */
  async write<T>(config: DataRouteConfig<T>, data: T): Promise<T> {
    const { key, apiWrite, localWrite } = config;

    switch (DATA_SOURCE_CONFIG.mode) {
      case DataMode.OFFLINE:
        return this.writeOffline<T>(key, data, localWrite);

      case DataMode.SYNC:
        return this.writeSync<T>(key, data, apiWrite, localWrite);

      case DataMode.API_ONLY:
        return this.writeApiOnly<T>(key, data, apiWrite);
    }
  }

  /**
   * OFFLINE模式：只写本地
   */
  private writeOffline<T>(key: string, data: T, localWrite?: (data: T) => void): T {
    if (localWrite) {
      localWrite(data);
    }
    unifiedCache.set(key, data);
    return data;
  }

  /**
   * SYNC模式：优先API，失败写本地队列
   */
  private async writeSync<T>(
    key: string,
    data: T,
    apiWrite?: (data: T) => Promise<T>,
    localWrite?: (data: T) => void
  ): Promise<T> {
    // API 直连模式（V2.1 铁律）
    if (localWrite) {
      localWrite(data);
    }
    await unifiedCache.set(key, data);

    // 尝试API写入
    if (apiWrite && navigator.onLine) {
      try {
        const result = await apiWrite(data);
        await unifiedCache.set(key, result);
        return result;
      } catch (error) {
        console.warn(`[DataRouter] API写入失败 ${key}，加入待同步队列:`, error);
        this.addToPendingQueue(key, data);
      }
    } else {
      this.addToPendingQueue(key, data);
    }

    return data;
  }

  /**
   * API_ONLY模式：只写API
   */
  private async writeApiOnly<T>(
    key: string,
    data: T,
    apiWrite?: (data: T) => Promise<T>
  ): Promise<T> {
    if (!apiWrite) {
      throw new Error(`生产模式需要apiWrite: ${key}`);
    }

    const result = await apiWrite(data);
    await unifiedCache.set(key, result);
    return result;
  }

  // ========== 待同步队列 ==========

  private addToPendingQueue(key: string, data: unknown): void {
    const change: PendingChange = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      operation: 'update',
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    };

    this.pendingChanges.push(change);
    this.savePendingChanges();

    // 限制队列长度
    if (this.pendingChanges.length > 500) {
      this.pendingChanges.splice(0, this.pendingChanges.length - 500);
    }
  }

  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem(PENDING_CHANGES_KEY);
      if (stored) {
        this.pendingChanges = JSON.parse(stored);
      }
    } catch {
      this.pendingChanges = [];
    }
  }

  private savePendingChanges(): void {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(this.pendingChanges));
  }

  /**
   * 获取待同步变更
   */
  getPendingChanges(): PendingChange[] {
    return this.pendingChanges.filter(c => !c.synced);
  }

  /**
   * 标记变更已同步
   */
  markSynced(ids: string[]): void {
    this.pendingChanges = this.pendingChanges.map(c =>
      ids.includes(c.id) ? { ...c, synced: true } : c
    );
    // 清理已同步的变更
    this.pendingChanges = this.pendingChanges.filter(c => !c.synced);
    this.savePendingChanges();
  }

  // ========== 订阅更新 ==========

  private subscribers = new Map<string, Set<(data: unknown) => void>>();

  /**
   * 订阅数据更新
   */
  subscribe(key: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  private notifySubscribers(key: string, data: unknown): void {
    this.subscribers.get(key)?.forEach(cb => cb(data));
  }

  // ========== 状态 ==========

  /**
   * 获取数据源状态
   */
  getStatus() {
    return {
      mode: DATA_SOURCE_CONFIG.mode,
      pendingCount: this.getPendingChanges().length,
      online: navigator.onLine,
    };
  }
}

export const dataRouter = new DataRouter();
