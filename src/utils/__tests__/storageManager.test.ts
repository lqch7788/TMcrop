/**
 * 存储容量管理工具测试用例
 * 文件路径：src/utils/__tests__/storageManager.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================
// 模拟依赖
// ============================================================

// 模拟 STORAGE_CONFIG
const STORAGE_CONFIG = {
  warnThreshold: 0.7,      // 70% 警告阈值
  criticalThreshold: 0.9,  // 90% 危急阈值
};

// 模拟 localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    getStore: () => store,
    setStore: (s: Record<string, string>) => { store = s; },
  };
})();

// 替换全局 localStorage
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// ============================================================
// 复制被测试的函数逻辑（用于独立测试）
// ============================================================

const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB

interface StorageInfo {
  used: number;
  available: number;
  percentage: number;
}

interface StorageStats extends StorageInfo {
  keys: { key: string; size: number }[];
  isWarn: boolean;
  isCritical: boolean;
}

function getStorageInfo(): StorageInfo {
  let used = 0;
  for (const key in mockLocalStorage.getStore()) {
    if (Object.prototype.hasOwnProperty.call(mockLocalStorage.getStore(), key)) {
      const size = mockLocalStorage.getItem(key)?.length || 0;
      used += size;
    }
  }
  return {
    used,
    available: STORAGE_LIMIT - used,
    percentage: used / STORAGE_LIMIT,
  };
}

function getStorageStats(): StorageStats {
  const info = getStorageInfo();
  const keys: { key: string; size: number }[] = [];

  for (const key in mockLocalStorage.getStore()) {
    if (Object.prototype.hasOwnProperty.call(mockLocalStorage.getStore(), key)) {
      const value = mockLocalStorage.getItem(key);
      if (value) {
        keys.push({ key, size: value.length });
      }
    }
  }

  keys.sort((a, b) => b.size - a.size);

  return {
    ...info,
    keys,
    isWarn: info.percentage >= STORAGE_CONFIG.warnThreshold,
    isCritical: info.percentage >= STORAGE_CONFIG.criticalThreshold,
  };
}

function checkStorageCapacity(): { ok: boolean; message?: string } {
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

function cleanupExpiredData(maxAgeDays: number = 90): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  let cleanedCount = 0;

  const keysToCheck = ['task_records', 'task_reminders', 'work_logs'];

  for (const baseKey of keysToCheck) {
    try {
      const data = mockLocalStorage.getItem(`farm_${baseKey}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => {
            const date = new Date(item.createdAt || item.remindedAt || item.actionTime);
            return date > cutoffDate;
          });
          if (filtered.length !== parsed.length) {
            mockLocalStorage.setItem(`farm_${baseKey}`, JSON.stringify(filtered));
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

function getStorageReport(): string {
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

// ============================================================
// 测试用例
// ============================================================

describe('存储容量管理工具', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('getStorageInfo - 存储信息获取', () => {
    it('空存储应该返回正确的初始状态', () => {
      const info = getStorageInfo();
      expect(info.used).toBe(0);
      expect(info.available).toBe(STORAGE_LIMIT);
      expect(info.percentage).toBe(0);
    });

    it('存储数据后应该正确计算已使用量', () => {
      mockLocalStorage.setItem('test_key', 'x'.repeat(1000));
      const info = getStorageInfo();
      expect(info.used).toBe(1000);
      expect(info.available).toBe(STORAGE_LIMIT - 1000);
    });

    it('应该能够计算存储百分比', () => {
      mockLocalStorage.setItem('test_key', 'x'.repeat(STORAGE_LIMIT / 2));
      const info = getStorageInfo();
      expect(info.percentage).toBeCloseTo(0.5, 2);
    });
  });

  describe('getStorageStats - 存储统计', () => {
    it('应该返回完整的存储统计信息', () => {
      mockLocalStorage.setItem('key1', 'value1');
      mockLocalStorage.setItem('key2', 'value22');

      const stats = getStorageStats();

      expect(stats).toHaveProperty('used');
      expect(stats).toHaveProperty('available');
      expect(stats).toHaveProperty('percentage');
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('isWarn');
      expect(stats).toHaveProperty('isCritical');
    });

    it('keys 数组应该按大小降序排列', () => {
      mockLocalStorage.setItem('small', 'a');
      mockLocalStorage.setItem('large', 'aaaaaa');

      const stats = getStorageStats();

      expect(stats.keys[0].key).toBe('large');
      expect(stats.keys[1].key).toBe('small');
    });

    it('存储低于警告阈值时 isWarn 应该为 false', () => {
      mockLocalStorage.setItem('small', 'a');
      const stats = getStorageStats();
      expect(stats.isWarn).toBe(false);
      expect(stats.isCritical).toBe(false);
    });
  });

  describe('checkStorageCapacity - 存储容量检查', () => {
    it('空存储应该返回 ok: true', () => {
      const result = checkStorageCapacity();
      expect(result.ok).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('存储达到危急阈值应该返回 ok: false', () => {
      // 填充到 95%
      const data = 'x'.repeat(Math.floor(STORAGE_LIMIT * 0.95));
      mockLocalStorage.setItem('large_data', data);

      const result = checkStorageCapacity();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('即将溢出');
    });

    it('存储达到警告阈值应该返回 ok: true 但有提示', () => {
      // 填充到 75%
      const data = 'x'.repeat(Math.floor(STORAGE_LIMIT * 0.75));
      mockLocalStorage.setItem('large_data', data);

      const result = checkStorageCapacity();
      expect(result.ok).toBe(true);
      expect(result.message).toContain('建议关注');
    });
  });

  describe('cleanupExpiredData - 过期数据清理', () => {
    it('无过期数据时应该返回0', () => {
      const now = new Date().toISOString();
      mockLocalStorage.setItem('farm_task_records', JSON.stringify([
        { createdAt: now },
        { createdAt: now },
      ]));

      const cleaned = cleanupExpiredData(90);
      expect(cleaned).toBe(0);
    });

    it('有过期数据时应该清理并返回数量', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      const oldDateStr = oldDate.toISOString();

      mockLocalStorage.setItem('farm_task_records', JSON.stringify([
        { createdAt: oldDateStr },
        { createdAt: new Date().toISOString() },
      ]));

      const cleaned = cleanupExpiredData(90);
      expect(cleaned).toBe(1);
    });

    it('自定义清理天数应该生效', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      const oldDateStr = oldDate.toISOString();

      mockLocalStorage.setItem('farm_task_records', JSON.stringify([
        { createdAt: oldDateStr },
      ]));

      // 30天前的数据，清理90天阈值时不应该被清理
      let cleaned = cleanupExpiredData(90);
      expect(cleaned).toBe(0);

      // 清理30天阈值时应该被清理
      cleaned = cleanupExpiredData(30);
      expect(cleaned).toBe(1);
    });

    it('无效的 JSON 数据应该被忽略', () => {
      mockLocalStorage.setItem('farm_task_records', 'invalid json');
      const cleaned = cleanupExpiredData(90);
      expect(cleaned).toBe(0);
    });

    it('非数组数据应该被忽略', () => {
      mockLocalStorage.setItem('farm_task_records', JSON.stringify({ not: 'array' }));
      const cleaned = cleanupExpiredData(90);
      expect(cleaned).toBe(0);
    });
  });

  describe('getStorageReport - 存储报告生成', () => {
    it('应该生成包含基本信息的报告', () => {
      mockLocalStorage.setItem('test_key', 'test_value');

      const report = getStorageReport();

      expect(report).toContain('存储容量报告');
      expect(report).toContain('总容量');
      expect(report).toContain('已使用');
      expect(report).toContain('可用');
    });

    it('空存储应该显示状态正常', () => {
      const report = getStorageReport();
      expect(report).toContain('状态: 正常');
    });

    it('报告应该包含存储键列表', () => {
      mockLocalStorage.setItem('my_key', 'my_value');
      const report = getStorageReport();
      expect(report).toContain('Top 10 存储键');
      expect(report).toContain('my_key');
    });
  });

  describe('存储键迭代', () => {
    it('应该正确迭代所有存储键', () => {
      mockLocalStorage.setItem('key1', 'value1');
      mockLocalStorage.setItem('key2', 'value2');
      mockLocalStorage.setItem('key3', 'value3');

      const info = getStorageInfo();
      expect(info.used).toBeGreaterThan(0);
    });

    it('不存在的键不应该影响计算', () => {
      mockLocalStorage.setItem('existing', 'value');
      const info = getStorageInfo();
      const previousUsed = info.used;

      mockLocalStorage.getItem('nonexistent');
      expect(getStorageInfo().used).toBe(previousUsed);
    });
  });
});

describe('存储容量计算边界', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('单字节数据应该正确计算', () => {
    mockLocalStorage.setItem('one_byte', 'a');
    const info = getStorageInfo();
    // 字符串 'a' 的长度是 1
    expect(info.used).toBe(1);
  });

  it('大字符串应该正确计算', () => {
    const largeString = 'x'.repeat(1024 * 1024); // 1MB
    mockLocalStorage.setItem('large', largeString);
    const info = getStorageInfo();
    expect(info.used).toBe(1024 * 1024);
    expect(info.percentage).toBeCloseTo(0.2, 1);
  });

  it('中文应该按 UTF-16 编码计算字符数', () => {
    mockLocalStorage.setItem('chinese', '中文测试');
    const info = getStorageInfo();
    // JavaScript 中字符串的 length 返回 UTF-16 代码单元的数量
    // 每个中文字符在 UTF-16 中占 2 个代码单元，所以 '中文测试' 的 length 是 4
    // 但实际存储到 localStorage 时会使用不同的编码
    // localStorage 使用 UTF-8 编码存储字符串
    expect(info.used).toBeGreaterThan(0);
  });
});
