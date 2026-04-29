/**
 * 存储容量管理工具
 * 功能：监控 localStorage 容量、管理数据归档、防止数据溢出
 */

import { STORAGE_CONFIG } from '../config/taskConfig';

const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB

export interface StorageInfo {
  used: number;
  available: number;
  percentage: number;
}

export interface StorageStats extends StorageInfo {
  keys: { key: string; size: number }[];
  isWarn: boolean;
  isCritical: boolean;
}

/**
 * 获取存储容量信息
 */
export function getStorageInfo(): StorageInfo {
  let used = 0;
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      const size = localStorage.getItem(key)?.length || 0;
      used += size;
    }
  }
  return {
    used,
    available: STORAGE_LIMIT - used,
    percentage: used / STORAGE_LIMIT,
  };
}

/**
 * 获取详细存储统计
 */
export function getStorageStats(): StorageStats {
  const info = getStorageInfo();
  const keys: { key: string; size: number }[] = [];

  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      const value = localStorage.getItem(key);
      if (value) {
        keys.push({ key, size: value.length });
      }
    }
  }

  // 按大小排序
  keys.sort((a, b) => b.size - a.size);

  return {
    ...info,
    keys,
    isWarn: info.percentage >= STORAGE_CONFIG.warnThreshold,
    isCritical: info.percentage >= STORAGE_CONFIG.criticalThreshold,
  };
}

/**
 * 检查存储是否即将溢出
 */
export function checkStorageCapacity(): { ok: boolean; message?: string } {
  const info = getStorageInfo();

  if (info.percentage >= STORAGE_CONFIG.criticalThreshold) {
    return {
      ok: false,
      message: `存储容量已达 ${(info.percentage * 100).toFixed(1)}%，即将溢出，建议清理旧数据`,
    };
  }

  if (info.percentage >= STORAGE_CONFIG.warnThreshold) {
    return {
      ok: true,
      message: `存储容量使用率为 ${(info.percentage * 100).toFixed(1)}%，建议关注`,
    };
  }

  return { ok: true };
}

/**
 * 清理过期数据
 * @param maxAgeDays 数据最大保留天数
 */
export function cleanupExpiredData(maxAgeDays: number = 90): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  let cleanedCount = 0;

  const keysToCheck = ['task_records', 'task_reminders', 'work_logs'];

  for (const baseKey of keysToCheck) {
    try {
      const data = localStorage.getItem(`farm_${baseKey}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => {
            const date = new Date(item.createdAt || item.remindedAt || item.actionTime);
            return date > cutoffDate;
          });
          if (filtered.length !== parsed.length) {
            localStorage.setItem(`farm_${baseKey}`, JSON.stringify(filtered));
            cleanedCount += parsed.length - filtered.length;
          }
        }
      }
    } catch {
      // 忽略解析错误
    }
  }

  return cleanedCount;
}

/**
 * 分批处理大量数据
 * @param items 要处理的数据项
 * @param processor 处理函数
 * @param batchSize 每批处理数量
 */
export async function processInBatches<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number = 50
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processor));
    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * 获取存储使用报告
 */
export function getStorageReport(): string {
  const stats = getStorageStats();
  const lines: string[] = [
    '=== 存储容量报告 ===',
    `总容量: ${(STORAGE_LIMIT / 1024 / 1024).toFixed(2)} MB`,
    `已使用: ${(stats.used / 1024 / 1024).toFixed(2)} MB (${(stats.percentage * 100).toFixed(2)}%)`,
    `可用: ${(stats.available / 1024 / 1024).toFixed(2)} MB`,
    `状态: ${stats.isCritical ? '危急' : stats.isWarn ? '警告' : '正常'}`,
    '',
    '=== Top 10 存储键 ===',
  ];

  stats.keys.slice(0, 10).forEach((k, i) => {
    lines.push(`${i + 1}. ${k.key}: ${(k.size / 1024).toFixed(2)} KB`);
  });

  return lines.join('\n');
}

/**
 * 控制台输出存储警告
 */
export function logStorageWarning(): void {
  const stats = getStorageStats();

  if (stats.isCritical) {
    console.error(
      `%c[存储警告] 存储容量已达 ${(stats.percentage * 100).toFixed(1)}%，即将溢出！`,
      'color: red; font-weight: bold; font-size: 14px;'
    );
    console.log('使用 getStorageReport() 查看详细报告');
    console.log('使用 cleanupExpiredData() 清理过期数据');
  } else if (stats.isWarn) {
    console.warn(
      `%c[存储提示] 存储容量使用率为 ${(stats.percentage * 100).toFixed(1)}%`,
      'color: orange; font-weight: bold;'
    );
  }
}

export default {
  getStorageInfo,
  getStorageStats,
  checkStorageCapacity,
  cleanupExpiredData,
  processInBatches,
  getStorageReport,
  logStorageWarning,
};
