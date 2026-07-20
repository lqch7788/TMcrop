/**
 * 浇水记录 Service（业务逻辑层）
 * 2026-07-20：Phase 1 - 独立浇水记录 CRUD
 *
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §4
 * 关键规则：recordType !== 'manual' 的记录不可编辑/删除（自动生成类只读）
 */

import { z } from 'zod';
import { BusinessError } from '../services/fertilizer.service';
import { nowLocalTimestamp } from '../lib/timeUtils';
import { wateringRepository, WateringRecord } from '../repositories/watering.repository';

const WateringErrorCode = {
  NOT_FOUND: 'WATERING_NOT_FOUND',
  INVALID_QUANTITY: 'WATERING_INVALID_QUANTITY',
  INVALID_INPUT: 'WATERING_INVALID_INPUT',
  BATCH_TOO_LARGE: 'WATERING_BATCH_TOO_LARGE',
};

/**
 * Zod schema for createWatering — 必填字段：cropName / greenhouseName / waterTime
 * totalWater 必须 >= 0
 */
const createWateringSchema = z.object({
  cropName: z.string().min(1, '作物名称必填'),
  greenhouseName: z.string().min(1, '温室必填'),
  waterTime: z.string().min(1, '浇水时间必填'),
  waterPool: z.string().optional(),
  totalWater: z.number().min(0, '用水量不能为负'),
  waterUnit: z.string().default('L'),
  waterCost: z.number().optional(),
  cropVariety: z.string().optional(),
  greenhouseId: z.string().optional(),
  areaId: z.string().optional(),
  areaName: z.string().optional(),
  plantingId: z.string().optional(),
  plantingCode: z.string().optional(),
  seedlingId: z.string().optional(),
  seedlingCode: z.string().optional(),
  operatorId: z.string().optional(),
  operatorName: z.string().optional(),
  description: z.string().optional(),
});

class WateringService {
  /**
   * 创建浇水记录（仅手动类型）
   */
  async create(input: any): Promise<WateringRecord> {
    const parsed = createWateringSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new BusinessError(
        WateringErrorCode.INVALID_INPUT,
        `参数错误 [${issue?.path?.join('.') || '?'}]: ${issue?.message}`,
      );
    }
    const data = parsed.data;
    const code = wateringRepository.generateCode();
    if (!code) {
      throw new BusinessError(WateringErrorCode.INVALID_QUANTITY, '生成浇水编号失败（重试 10 次仍冲突）');
    }
    const id = `water-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return wateringRepository.insert({
      id,
      waterCode: code,
      recordType: 'manual',
      fertilizerRecordId: null,
      sourceDailyRecordId: null,
      cropName: data.cropName,
      cropVariety: data.cropVariety || null,
      greenhouseId: data.greenhouseId || null,
      greenhouseName: data.greenhouseName,
      areaId: data.areaId || null,
      areaName: data.areaName || null,
      plantingId: data.plantingId || null,
      plantingCode: data.plantingCode || null,
      seedlingId: data.seedlingId || null,
      seedlingCode: data.seedlingCode || null,
      waterPool: data.waterPool || null,
      totalWater: data.totalWater,
      waterUnit: data.waterUnit,
      waterCost: data.waterCost || 0,
      waterTime: data.waterTime,
      operatorId: data.operatorId || null,
      operatorName: data.operatorName || null,
      dataSource: 'manual',
      iotDeviceId: null,
      description: data.description || null,
      status: 'completed',
      createTime: nowLocalTimestamp(),
      updateTime: nowLocalTimestamp(),
    });
  }

  /**
   * 分页查询浇水记录（支持 recordType / cropName / greenhouseName / operatorName / dateRange 筛选）
   */
  findAll(filters: any = {}, page = 1, pageSize = 20) {
    return wateringRepository.findAll(filters, page, pageSize);
  }

  /**
   * 单条详情查询
   */
  findById(id: string): WateringRecord {
    const record = wateringRepository.findById(id);
    if (!record) {
      throw new BusinessError(WateringErrorCode.NOT_FOUND, '浇水记录不存在', 404);
    }
    return record;
  }

  /**
   * 生成浇水编号
   */
  generateCode(): string | null {
    return wateringRepository.generateCode();
  }

  /**
   * 更新浇水记录
   * recordType !== 'manual' 的记录禁止编辑（自动生成类只读）
   */
  async update(id: string, updates: any): Promise<WateringRecord> {
    const existing = wateringRepository.findById(id);
    if (!existing) {
      throw new BusinessError(WateringErrorCode.NOT_FOUND, '浇水记录不存在', 404);
    }
    if (existing.recordType !== 'manual') {
      throw new BusinessError(
        WateringErrorCode.INVALID_INPUT,
        `浇水记录为 ${existing.recordType} 类型，不可编辑`,
        403,
      );
    }
    const updated = wateringRepository.update(id, updates);
    if (!updated) {
      throw new BusinessError(WateringErrorCode.NOT_FOUND, '浇水记录更新失败', 404);
    }
    return updated;
  }

  /**
   * 删除单条浇水记录
   * recordType !== 'manual' 的记录禁止删除
   */
  async remove(id: string): Promise<{ id: string }> {
    const existing = wateringRepository.findById(id);
    if (!existing) {
      throw new BusinessError(WateringErrorCode.NOT_FOUND, '浇水记录不存在', 404);
    }
    if (existing.recordType !== 'manual') {
      throw new BusinessError(
        WateringErrorCode.INVALID_INPUT,
        `浇水记录为 ${existing.recordType} 类型，不可删除`,
        403,
      );
    }
    wateringRepository.deleteById(id);
    return { id };
  }

  /**
   * 批量删除（最多 200 条，跳过非 manual 类型）
   */
  async removeBatch(ids: string[]): Promise<{ deleted: number; skipped: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BusinessError(WateringErrorCode.INVALID_INPUT, '请提供要删除的记录 ID 数组');
    }
    if (ids.length > 200) {
      throw new BusinessError(
        WateringErrorCode.BATCH_TOO_LARGE,
        `批量删除单次最多 200 条，当前 ${ids.length} 条`,
      );
    }
    let deleted = 0;
    let skipped = 0;
    for (const id of ids) {
      const existing = wateringRepository.findById(id);
      if (!existing) {
        skipped++;
        continue;
      }
      if (existing.recordType !== 'manual') {
        skipped++;
        continue;
      }
      wateringRepository.deleteById(id);
      deleted++;
    }
    return { deleted, skipped };
  }
}

export const wateringService = new WateringService();