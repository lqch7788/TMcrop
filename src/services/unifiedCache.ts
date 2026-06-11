/**
 * 统一缓存服务 - 三层存储
 *
 * 借鉴V3架构设计：
 * - Memory Cache (LRU, 60s TTL) → 热数据
 * - IndexedDB → 主存储，50MB+
 * - localStorage → 配置/Token
 *
 * 支持LZ压缩节省空间
 */

import LZString from 'lz-string';
import { db } from '../db/database';
import { STORAGE_ASSIGNMENT } from '../config/dataSourceConfig';
import { logger } from '../lib/logger';

// localStorage键名前缀
const LS_PREFIX = 'TMcrop_';
const MEMORY_TTL = 60000; // 60秒

// 内存缓存（LRU）
const memoryCache = new Map<string, { data: unknown; ts: number }>();

/**
 * 压缩数据（>100KB时）
 */
function compress(data: unknown): string {
  return LZString.compressToUTF16(JSON.stringify(data));
}

/**
 * 解压数据
 */
function decompress<T>(compressed: string): T {
  const decompressed = LZString.decompressFromUTF16(compressed);
  return decompressed ? JSON.parse(decompressed) : null;
}

/**
 * 估算数据大小（字节）
 */
function estimateSize(data: unknown): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * UnifiedCache - 统一缓存服务
 */
class UnifiedCache {
  // ========== 读取 ==========

  /**
   * 获取数据（自动选择存储介质）
   * 读取优先级：API 单源（V2.1 铁律）
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. 检查内存缓存
    const memCached = memoryCache.get(key);
    if (memCached && Date.now() - memCached.ts < MEMORY_TTL) {
      return memCached.data as T;
    }

    // 2. 确定存储介质
    const storage = STORAGE_ASSIGNMENT[key] || 'localStorage';

    if (storage === 'indexedDB') {
      return this.getFromIndexedDB<T>(key);
    } else {
      return this.getFromLocalStorage<T>(key);
    }
  }

  private async getFromIndexedDB<T>(key: string): Promise<T | null> {
    const tableName = this.keyToTable(key);
    try {
      const table = db.table(tableName);
      const records = await table.toArray();

      if (records.length === 0) return null;

      const record = records[0];

      // 解压处理
      if (record._compressed) {
        return decompress<T>(record._data);
      }

      return record as T;
    } catch (error) {
      console.warn(`[UnifiedCache] IndexedDB读取失败 ${key}:`, error);
      return null;
    }
  }

  private getFromLocalStorage<T>(key: string): T | null {
    const fullKey = LS_PREFIX + key;
    const stored = localStorage.getItem(fullKey);

    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  // ========== 写入 ==========

  /**
   * 设置数据（自动选择存储介质 + 压缩）
   */
  async set<T>(key: string, data: T): Promise<void> {
    const size = estimateSize(data);

    // 更新内存缓存
    memoryCache.set(key, { data, ts: Date.now() });

    // 确定存储介质
    const storage = STORAGE_ASSIGNMENT[key] || 'localStorage';

    if (storage === 'indexedDB') {
      await this.setToIndexedDB(key, data, size);
    } else {
      this.setToLocalStorage(key, data);
    }
  }

  private async setToIndexedDB(key: string, data: unknown, size: number): Promise<void> {
    const tableName = this.keyToTable(key);

    try {
      const table = db.table(tableName);
      await table.clear();

      // 大数据压缩（>100KB）
      if (size > 100 * 1024) {
        const compressed = compress(data);
        await table.add({
          _data: compressed,
          _compressed: true,
          _originalSize: size,
          _timestamp: Date.now(),
        });
        console.log(`[UnifiedCache] 压缩存储 ${key}: ${size} → ${compressed.length} bytes`);
        return;
      }

      // 小数据直接存储
      const records = Array.isArray(data)
        ? data.map((item: unknown) => ({ ...item as object, _timestamp: Date.now() }))
        : [{ ...data as object, _timestamp: Date.now() }];

      if (Array.isArray(data)) {
        await table.bulkAdd(records as never[]);
      } else {
        await table.add(records[0]);
      }
    } catch (error) {
      logger.error(`[UnifiedCache] IndexedDB写入失败 ${key}`, error);
      throw error;
    }
  }

  private setToLocalStorage<T>(key: string, data: T): void {
    const fullKey = LS_PREFIX + key;

    try {
      localStorage.setItem(fullKey, JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.error('[UnifiedCache] localStorage容量不足，切换到IndexedDB');
        this.setToIndexedDB(key, data, estimateSize(data)).catch(console.error);
      } else {
        throw error;
      }
    }
  }

  // ========== 删除 ==========

  async delete(key: string): Promise<void> {
    memoryCache.delete(key);

    const storage = STORAGE_ASSIGNMENT[key] || 'localStorage';

    if (storage === 'indexedDB') {
      const tableName = this.keyToTable(key);
      try {
        await db.table(tableName).clear();
      } catch (error) {
        console.warn(`[UnifiedCache] IndexedDB删除失败 ${key}:`, error);
      }
    } else {
      localStorage.removeItem(LS_PREFIX + key);
    }
  }

  // ========== 辅助方法 ==========

  private keyToTable(key: string): string {
    const map: Record<string, string> = {
      'orders': 'orders',
      'crop-instances': 'instances',
      'harvest-records': 'harvestRecords',
      'seedling-records': 'seedlings',
      'planting-records': 'plantings',
      'seed-sources': 'seedSources',
      'material-requests': 'materialRequests',
    };
    return map[key] || 'metadata';
  }

  /**
   * 清理过期内存缓存
   */
  cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now - value.ts >= MEMORY_TTL) {
        memoryCache.delete(key);
      }
    }
  }

  /**
   * 获取存储统计
   */
  async getStorageStats(): Promise<{
    memorySize: number;
    indexedDBCount: number;
    localStorageSize: number;
  }> {
    let localStorageSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        localStorageSize += localStorage.getItem(key)?.length || 0;
      }
    }

    let indexedDBCount = 0;
    try {
      const tables = ['orders', 'instances', 'seedSources', 'seedlings', 'plantings', 'harvestRecords'];
      for (const table of tables) {
        indexedDBCount += await db.table(table).count();
      }
    } catch {
      // ignore
    }

    return {
      memorySize: memoryCache.size,
      indexedDBCount,
      localStorageSize,
    };
  }
}

export const unifiedCache = new UnifiedCache();

// 定期清理过期缓存
setInterval(() => {
  unifiedCache.cleanupMemoryCache();
}, MEMORY_TTL);
