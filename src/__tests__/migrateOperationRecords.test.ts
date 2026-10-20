/**
 * 农事操作记录 localStorage → 后端迁移测试（P0-1）
 * 覆盖：两种存储格式解析 / 演示数据过滤 / 迁移标记 / 失败不写标记
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock('@/lib/apiClient', () => ({
  enhancedApiClient: { post: mockPost },
}));

import {
  parseStoredRecords,
  splitDemoRecords,
  migrateOperationRecordsOnce,
} from '../services/migrateOperationRecords';

const LEGACY_KEY = 'yuanxingtu_operationRecords';
const FLAG_KEY = 'yuanxingtu_operationRecords_migrated';

describe('parseStoredRecords', () => {
  it('解析带版本包装的格式 {version, data}', () => {
    const raw = JSON.stringify({ version: 9, data: [{ id: 'OP_1' }] });
    expect(parseStoredRecords(raw)).toEqual([{ id: 'OP_1' }]);
  });

  it('解析旧版裸数组', () => {
    expect(parseStoredRecords(JSON.stringify([{ id: 'OP_2' }]))).toEqual([{ id: 'OP_2' }]);
  });

  it('null 与非法 JSON 返回空数组', () => {
    expect(parseStoredRecords(null)).toEqual([]);
    expect(parseStoredRecords('{bad json')).toEqual([]);
  });

  it('对象但没有 data 数组时返回空数组', () => {
    expect(parseStoredRecords(JSON.stringify({ version: 9, data: 'x' }))).toEqual([]);
  });
});

describe('splitDemoRecords', () => {
  it('id 以 DEMO_ 开头视为演示数据', () => {
    const { real, skippedDemo } = splitDemoRecords([
      { id: 'DEMO_MANUAL_001' },
      { id: 'OP_1750000000000_ab12' },
      { id: 'DEMO_TASK_002' },
    ]);
    expect(skippedDemo).toBe(2);
    expect(real.map(r => r.id)).toEqual(['OP_1750000000000_ab12']);
  });
});

describe('migrateOperationRecordsOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('已迁移过则直接跳过，不发请求', async () => {
    localStorage.setItem(FLAG_KEY, '1');
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'OP_X' }]));

    const result = await migrateOperationRecordsOnce();

    expect(result.migrated).toBe(0);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('无历史数据时写入标记', async () => {
    const result = await migrateOperationRecordsOnce();

    expect(result.migrated).toBe(0);
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('真实数据提交到 /farm-operation-records/batch，成功后写标记且保留原数据', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({
      version: 9,
      data: [{ id: 'OP_1' }, { id: 'DEMO_MANUAL_001' }],
    }));
    mockPost.mockResolvedValue({ created: 1, skipped: 0, failed: 0, errors: [] });

    const result = await migrateOperationRecordsOnce();

    expect(mockPost).toHaveBeenCalledWith('/farm-operation-records/batch', {
      records: [{ id: 'OP_1' }],
    });
    expect(result).toEqual({ migrated: 1, skippedDemo: 1, skippedDuplicate: 0, failed: 0 });
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
    expect(localStorage.getItem(LEGACY_KEY)).toContain('OP_1');
  });

  it('部分失败时抛错且不写标记，便于下次重试', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'OP_1' }]));
    mockPost.mockResolvedValue({
      created: 0, skipped: 0, failed: 1,
      errors: [{ id: 'OP_1', message: 'NOT NULL constraint failed' }],
    });

    await expect(migrateOperationRecordsOnce()).rejects.toThrow('迁移农事操作记录失败 1 条');
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
  });

  it('请求抛错时向上抛出，不写标记', async () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'OP_1' }]));
    mockPost.mockRejectedValue(new Error('NETWORK_OFFLINE: 网络不可用'));

    await expect(migrateOperationRecordsOnce()).rejects.toThrow('NETWORK_OFFLINE');
    expect(localStorage.getItem(FLAG_KEY)).toBeNull();
  });
});
