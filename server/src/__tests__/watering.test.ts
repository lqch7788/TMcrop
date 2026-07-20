/**
 * 浇水记录 Service 单元测试
 * 2026-07-20：Phase 1 - 覆盖 generateCode / create / update / remove / removeBatch / findAll
 *
 * 策略：使用隔离内存 sql.js 数据库（与 seedSource.merge.e2e.test.ts 一致）
 *       - DB_PATH_OVERRIDE=':memory:' 必须在 import db 前设置
 *       - initDatabase() + initializeDatabase() 一次性建全表
 *       - 每个测试 afterEach 清空 watering_records，避免残留污染
 *
 * 覆盖场景：
 * 1. generateCode 返回 SW+YYYYMMDD-NNNN 格式
 * 2. create 写入成功并返回完整记录
 * 3. update 非 manual 类型记录应抛 403 错误（"不可编辑"）
 * 4. remove 非 manual 类型记录应抛 403 错误（"不可删除"）
 * 5. removeBatch 跳过非 manual 类型
 * 6. findAll 按 recordType / cropName / startDate 筛选
 */

// 必须在 import 任何后端模块前设置环境变量（db/index.ts 顶层读取此 env var）
process.env.DB_PATH_OVERRIDE = ':memory:';

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initDatabase, getDatabase } from '../db';
import { initializeDatabase } from '../db/schema';
import { wateringRepository } from '../repositories/watering.repository';
import { wateringService } from '../services/watering.service';

let initialized = false;

beforeAll(async () => {
  // 一次性初始化：:memory: 内存 DB + 全表建表
  if (!initialized) {
    await initDatabase();
    initializeDatabase();
    initialized = true;
  }
});

afterEach(() => {
  // 清空 watering_records 表，保证下一个测试从干净环境开始
  // 注意：不能 closeDatabase() 重置 db 单例，因为是模块级缓存，重置后 initDatabase 会创建全新 db
  const db = getDatabase();
  db.run(`DELETE FROM watering_records`);
});

/**
 * 工具函数：直接 INSERT 一条浇水记录（绕过 service 业务校验）
 * 用于构造非 manual 类型 / 指定 waterTime 的测试夹具
 */
function insertRaw(record: {
  id: string;
  waterCode: string;
  recordType: 'manual' | 'fertilizer_dilution' | 'daily_sync';
  cropName: string;
  greenhouseName: string;
  totalWater: number;
  waterUnit?: string;
  waterTime: string;
}): void {
  wateringRepository.insert({
    id: record.id,
    waterCode: record.waterCode,
    recordType: record.recordType,
    fertilizerRecordId: null,
    sourceDailyRecordId: null,
    cropName: record.cropName,
    cropVariety: null,
    greenhouseId: null,
    greenhouseName: record.greenhouseName,
    areaId: null,
    areaName: null,
    plantingId: null,
    plantingCode: null,
    seedlingId: null,
    seedlingCode: null,
    waterPool: null,
    totalWater: record.totalWater,
    waterUnit: record.waterUnit ?? 'L',
    waterCost: 0,
    waterTime: record.waterTime,
    operatorId: null,
    operatorName: null,
    dataSource: 'manual',
    iotDeviceId: null,
    description: null,
    status: 'completed',
    createTime: record.waterTime,
    updateTime: record.waterTime,
  });
}

describe('WateringService 单元测试', () => {
  // 场景 1：generateCode 格式 SW+YYYYMMDD-NNNN
  it('1. generateCode 返回 SW+日期+NNNN 格式', () => {
    const code = wateringService.generateCode();
    expect(code).not.toBeNull();
    expect(code).toMatch(/^SW\d{8}-\d{4}$/);
    // 校验日期前缀等于今日本地日期
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    expect(code!.startsWith(`SW${datePrefix}`)).toBe(true);
  });

  // 场景 2：create 写入成功
  it('2. create 写入成功并返回完整记录', async () => {
    const record = await wateringService.create({
      cropName: '葡萄',
      greenhouseName: 'A区温室',
      waterTime: '2026-07-20 09:00:00',
      totalWater: 100,
      waterUnit: 'L',
      waterPool: JSON.stringify([{ area: 'A区', wateringMethod: 'drip_irrigation', waterAmount: 100, waterUnit: 'L' }]),
    });

    expect(record.id).toBeDefined();
    expect(record.id).toMatch(/^water-/);
    expect(record.waterCode).toMatch(/^SW\d{8}-\d{4}$/);
    expect(record.recordType).toBe('manual');
    expect(record.cropName).toBe('葡萄');
    expect(record.greenhouseName).toBe('A区温室');
    expect(record.totalWater).toBe(100);
    expect(record.waterUnit).toBe('L');
    expect(record.status).toBe('completed');
    expect(record.dataSource).toBe('manual');

    // 验证数据库里确实有一条
    const found = wateringRepository.findById(record.id);
    expect(found).not.toBeNull();
    expect(found!.cropName).toBe('葡萄');
  });

  // 场景 3：update 只允许 manual 类型
  it('3. update 非 manual 类型记录应抛 403 错误', async () => {
    const id = `water-test-update-${Date.now()}`;
    insertRaw({
      id,
      waterCode: `SW${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-9999`,
      recordType: 'fertilizer_dilution',
      cropName: '葡萄',
      greenhouseName: 'A区',
      totalWater: 50,
      waterTime: '2026-07-20 09:00:00',
    });

    await expect(wateringService.update(id, { totalWater: 999 })).rejects.toThrow(/不可编辑/);
  });

  // 场景 4：remove 只允许 manual 类型
  it('4. remove 非 manual 类型记录应抛 403 错误', async () => {
    const id = `water-test-remove-${Date.now()}`;
    insertRaw({
      id,
      waterCode: `SW${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-9998`,
      recordType: 'daily_sync',
      cropName: '葡萄',
      greenhouseName: 'A区',
      totalWater: 50,
      waterTime: '2026-07-20 09:00:00',
    });

    await expect(wateringService.remove(id)).rejects.toThrow(/不可删除/);
  });

  // 场景 5：removeBatch 跳过非 manual
  it('5. removeBatch 跳过非 manual 类型', async () => {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const manualId = `water-manual-${Date.now()}`;
    const dilutionId = `water-dilution-${Date.now()}`;

    insertRaw({
      id: manualId,
      waterCode: `${datePrefix}-0001`,
      recordType: 'manual',
      cropName: '葡萄',
      greenhouseName: 'A区',
      totalWater: 50,
      waterTime: '2026-07-20 09:00:00',
    });
    insertRaw({
      id: dilutionId,
      waterCode: `${datePrefix}-0002`,
      recordType: 'fertilizer_dilution',
      cropName: '葡萄',
      greenhouseName: 'A区',
      totalWater: 50,
      waterTime: '2026-07-20 09:00:00',
    });

    const result = await wateringService.removeBatch([manualId, dilutionId]);
    expect(result.deleted).toBe(1);
    expect(result.skipped).toBe(1);
    expect(wateringRepository.findById(manualId)).toBeNull();
    expect(wateringRepository.findById(dilutionId)).not.toBeNull();
  });

  // 场景 6：findAll 筛选 recordType / cropName / dateRange
  it('6. findAll 按 recordType + cropName + 日期范围筛选', async () => {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const baseCode = (seq: number) => `${datePrefix}-${String(seq).padStart(4, '0')}`;

    // 插入 3 条不同类型/作物/日期的记录
    insertRaw({
      id: 'w1',
      waterCode: baseCode(1),
      recordType: 'manual',
      cropName: '葡萄',
      greenhouseName: 'A区',
      totalWater: 100,
      waterTime: '2026-07-19 09:00:00',
    });
    insertRaw({
      id: 'w2',
      waterCode: baseCode(2),
      recordType: 'manual',
      cropName: '苹果',
      greenhouseName: 'B区',
      totalWater: 50,
      waterTime: '2026-07-20 09:00:00',
    });
    insertRaw({
      id: 'w3',
      waterCode: baseCode(3),
      recordType: 'fertilizer_dilution',
      cropName: '葡萄',
      greenhouseName: 'C区',
      totalWater: 200,
      waterTime: '2026-07-20 10:00:00',
    });

    // 筛选 1：recordType='manual' → 期望 2 条 (w1, w2)
    const manualResult = wateringService.findAll({ recordType: 'manual' }, 1, 10);
    expect(manualResult.items.length).toBe(2);
    expect(manualResult.total).toBe(2);
    expect(manualResult.items.every((r) => r.recordType === 'manual')).toBe(true);

    // 筛选 2：cropName LIKE '葡萄' → 期望 2 条 (w1, w3)
    const grapeResult = wateringService.findAll({ cropName: '葡萄' }, 1, 10);
    expect(grapeResult.items.length).toBe(2);
    expect(grapeResult.total).toBe(2);
    expect(grapeResult.items.every((r) => r.cropName.includes('葡萄'))).toBe(true);

    // 筛选 3：startDate='2026-07-20' → 期望 2 条 (w2, w3，w1 是 07-19 被过滤)
    const dateResult = wateringService.findAll({ startDate: '2026-07-20' }, 1, 10);
    expect(dateResult.items.length).toBe(2);
    expect(dateResult.total).toBe(2);

    // 筛选 4：组合 recordType='manual' AND cropName LIKE '葡萄' → 期望 1 条 (w1)
    const manualGrapeResult = wateringService.findAll(
      { recordType: 'manual', cropName: '葡萄' },
      1,
      10,
    );
    expect(manualGrapeResult.items.length).toBe(1);
    expect(manualGrapeResult.items[0].id).toBe('w1');
  });
});
