/**
 * 施肥业务逻辑层 (Service)
 * G11 V1.1：库存扣减/恢复 + 事务原子化
 * 负责业务校验、事务包裹、错误码抛出
 */

import { z } from 'zod';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';
import { fertilizerRepository, FertilizerRepository, FertilizerRecord } from '../repositories/fertilizer.repository';

/**
 * 业务错误（替代字符串匹配，路由层用 code 转换为 HTTP 状态）
 */
export class BusinessError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** 施肥业务错误码常量 */
export const FertilizerErrorCode = {
  NOT_FOUND: 'FERTILIZER_NOT_FOUND',
  INVALID_QUANTITY: 'FERTILIZER_INVALID_QUANTITY',
  FERTILIZER_LIBRARY_NOT_FOUND: 'FERTILIZER_LIBRARY_NOT_FOUND',
  INSUFFICIENT_STOCK: 'FERTILIZER_INSUFFICIENT_STOCK',
  BATCH_TOO_LARGE: 'FERTILIZER_BATCH_TOO_LARGE',
  ALL_IOT_READONLY: 'FERTILIZER_ALL_IOT_READONLY',
  IOT_READONLY: 'FERTILIZER_IOT_READONLY',
} as const;

/** 生成施肥记录（手动录入）入参 schema — 接收前端 camelCase 字段 */
const createRecordSchema = z.object({
  farmTaskId: z.string().nullish(),
  productionPlanId: z.string().nullish(),
  productionPlanCode: z.string().nullish(),
  plantingId: z.string().nullish(),
  plantingCode: z.string().nullish(),
  greenhouseId: z.string().nullish(),
  greenhouseName: z.string().min(1, '温室名称必填'),
  areaName: z.string().nullish(),
  cropName: z.string().min(1, '作物名称必填'),
  cropVariety: z.string().nullish(),
  fertilizerName: z.string().min(1, '肥料名称必填'),
  fertilizerType: z.string().min(1, '肥料类型必填'),
  dilutionRatio: z.string().min(1, '稀释比例必填'),
  quantity: z.number().nonnegative('数量必须非负').max(1e7, '数量过大'),
  unit: z.string().optional(),
  unitPrice: z.number().nonnegative().default(0),
  fertilizeTime: z.string().min(1, '施肥时间必填'),
  operatorId: z.string().nullish(),
  operatorName: z.string().nullish(),
  description: z.string().nullish(),
  /** G11 V1.1：肥料库 id（可选 — 老数据无库可空） */
  fertilizerId: z.string().nullish(),
});

/** IoT ingest 单条记录 schema（H3：补业务校验） */
const iotRecordSchema = z.object({
  iotRecordId: z.string().min(1),
  greenhouseName: z.string().min(1, '温室名称必填'),
  cropName: z.string().min(1, '作物名称必填'),
  fertilizerName: z.string().min(1, '肥料名称必填'),
  fertilizerType: z.string().optional(),
  dilutionRatio: z.string().optional(),
  quantity: z.number().positive('数量必须正数').max(1e7),
  unitPrice: z.number().nonnegative().optional(),
  fertilizeTime: z.string().optional(),
  areaName: z.string().nullish(),
  /** G11 V1.1：可选肥料库 id */
  fertilizerId: z.string().nullish(),
});

/**
 * 施肥服务类
 */
export class FertilizerService {
  private repository: FertilizerRepository;

  constructor(repo?: FertilizerRepository) {
    this.repository = repo || fertilizerRepository;
  }

  /**
   * 生成施肥记录编号 SF+YYYYMMDD-4位流水号
   *
   * 2026-06-22 修复 8 处查重：
   * - fertilizer_records 表无 deleted_at 列（全表唯一）
   * - 候选号若冲突则 +1 重试
   * - 最多 10 次重试；重试耗尽时返回 null
   * - 注：fertilizer_code 已有 UNIQUE 约束，POST 端做友好错误提示即可
   */
  generateCode(): string | null {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `SF${datePrefix}`;
    const db = getDatabase();
    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // 全表扫描（无 deleted_at 列）取当日 MAX
      const allCodes = queryToObjects<{ fertilizerCode: string }>(db,
        `SELECT fertilizer_code FROM fertilizer_records`,
      );
      let maxSeq = 0;
      for (const row of allCodes) {
        const code = row.fertilizerCode || '';
        if (code.startsWith(prefix)) {
          const seq = parseInt(code.split('-').pop() || '0', 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      const candidate = `${prefix}-${String(maxSeq + 1 + attempt).padStart(4, '0')}`;

      // 候选号查重（全表）
      const checkStmt = db.prepare(`
        SELECT 1 FROM fertilizer_records WHERE fertilizer_code = ? LIMIT 1
      `);
      checkStmt.bind([candidate]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (!exists) {
        return candidate;
      }
    }

    // 重试耗尽
    return null;
  }

  /**
   * 新增施肥记录（含事务：扣库存 → 写记录 → COMMIT）
   * @returns 完整新记录
   */
  async apply(input: z.infer<typeof createRecordSchema>): Promise<FertilizerRecord> {
    const parsed = createRecordSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new BusinessError(
        FertilizerErrorCode.INVALID_QUANTITY,
        `参数错误 [${issue?.path?.join('.') || '?'}]: ${issue?.message || parsed.error.message}`,
      );
    }
    const data = parsed.data;
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = `fer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const qty = data.quantity;
    const price = data.unitPrice ?? 0;

    // 开启事务：INSERT record + UPDATE stock 必须原子
    db.exec('BEGIN');
    try {
      // generateCode 在事务内（避免并发 UNIQUE 冲突）
      const code = this.generateCode();
      if (!code) {
        db.exec('ROLLBACK');
        throw new BusinessError(
          FertilizerErrorCode.INVALID_QUANTITY,
          `生成施肥编号失败（重试 10 次仍冲突），请稍后重试`,
        );
      }
      // 1) 若传了 fertilizerId，先校验库存在 + 库存够
      if (data.fertilizerId) {
        const lib = this.repository.findLibraryById(data.fertilizerId);
        if (!lib) {
          db.exec('ROLLBACK');
          throw new BusinessError(
            FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
            `肥料库不存在: ${data.fertilizerId}`,
            404,
          );
        }
        if (qty > 0 && (lib.currentStock ?? 0) < qty) {
          db.exec('ROLLBACK');
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${lib.fertilizerName} 库存不足：当前 ${lib.currentStock ?? 0}，需 ${qty}`,
          );
        }
        // 2) 扣库存
        if (qty > 0) this.repository.decreaseStock(data.fertilizerId, qty, now);
      }

      // 3) 写记录
      // 2026-06-22 修复 8 处查重：INSERT 前再查一次 fertilizer_code（防 race condition）
      // UNIQUE 约束已天然防重，这里加防御性 SELECT 给前端友好错误
      const dupStmt = db.prepare(`
        SELECT 1 FROM fertilizer_records WHERE fertilizer_code = ? LIMIT 1
      `);
      dupStmt.bind([code]);
      if (dupStmt.step()) {
        dupStmt.free();
        db.exec('ROLLBACK');
        throw new BusinessError(
          FertilizerErrorCode.INVALID_QUANTITY,
          `编号 ${code} 已存在`,
        );
      }
      dupStmt.free();

      const record: FertilizerRecord = {
        id,
        fertilizer_code: code,
        farm_task_id: data.farmTaskId ?? null,
        production_plan_id: data.productionPlanId ?? null,
        production_plan_code: data.productionPlanCode ?? null,
        planting_id: data.plantingId ?? null,
        planting_code: data.plantingCode ?? null,
        greenhouse_id: data.greenhouseId ?? null,
        greenhouse_name: data.greenhouseName,
        area_name: data.areaName ?? null,
        crop_name: data.cropName,
        crop_variety: data.cropVariety ?? null,
        fertilizer_name: data.fertilizerName,
        fertilizer_type: data.fertilizerType,
        dilution_ratio: data.dilutionRatio,
        quantity: qty,
        unit: data.unit ?? '千克',
        unit_price: price,
        total_cost: qty * price,
        fertilize_time: data.fertilizeTime,
        operator_id: data.operatorId ?? null,
        operator_name: data.operatorName ?? null,
        data_source: 'manual',
        iot_device_id: null,
        iot_record_id: null,
        description: data.description ?? null,
        status: 'completed',
        create_time: now,
        update_time: now,
        fertilizer_id: data.fertilizerId ?? null,
      };
      this.repository.insert(record);

      db.exec('COMMIT');
      this.repository.save();
      return record;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  /**
   * 更新施肥记录（含事务：delta 库存调整）
   * 注意：fertilizer_id 不允许在此方法修改（变更库属于业务级动作，单独端点处理）
   */
  async update(id: string, updates: Partial<FertilizerRecord>): Promise<FertilizerRecord | null> {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new BusinessError(FertilizerErrorCode.NOT_FOUND, '施肥记录不存在', 404);
    }
    if (existing.data_source === 'auto_iot') {
      throw new BusinessError(FertilizerErrorCode.IOT_READONLY, 'IoT 自动记录不可编辑', 403);
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const oldQty = existing.quantity;
    const newQty = updates.quantity ?? oldQty;
    // findById 经 queryToObjects 转 camelCase：尝试两种 key
    const fid = (existing as any).fertilizerId ?? existing.fertilizer_id;

    db.exec('BEGIN');
    try {
      // 处理 quantity delta（若 fertilizer_id 已绑定）
      if (fid && newQty !== oldQty) {
        const delta = newQty - oldQty;
        const lib = this.repository.findLibraryById(fid);
        if (!lib) {
          db.exec('ROLLBACK');
          throw new BusinessError(
            FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
            `肥料库不存在: ${fid}`,
            404,
          );
        }
        if (delta > 0 && (lib.currentStock ?? 0) < delta) {
          db.exec('ROLLBACK');
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${lib.fertilizerName} 库存不足：当前 ${lib.currentStock ?? 0}，需追加 ${delta}`,
          );
        }
        if (delta > 0) this.repository.decreaseStock(fid, delta, now);
        else if (delta < 0) this.repository.increaseStock(fid, -delta, now);
      }

      // 同步 total_cost
      if (updates.quantity !== undefined || updates.unit_price !== undefined) {
        const finalQty = updates.quantity ?? existing.quantity;
        const finalPrice = updates.unit_price ?? existing.unit_price;
        updates.total_cost = finalQty * finalPrice;
      }
      updates.update_time = now;
      this.repository.update(id, updates);

      db.exec('COMMIT');
      this.repository.save();
      return this.repository.findById(id);
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  /**
   * 删除单条施肥记录（含事务：恢复库存 → 删记录）
   */
  async remove(id: string): Promise<{ id: string }> {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new BusinessError(FertilizerErrorCode.NOT_FOUND, '施肥记录不存在', 404);
    }
    if (existing.data_source === 'auto_iot') {
      throw new BusinessError(FertilizerErrorCode.IOT_READONLY, 'IoT 自动记录不可删除', 403);
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    db.exec('BEGIN');
    try {
      const fid = (existing as any).fertilizerId ?? existing.fertilizer_id;
      if (fid && existing.quantity > 0) {
        this.repository.increaseStock(fid, existing.quantity, now);
      }
      this.repository.deleteById(id);
      db.exec('COMMIT');
      this.repository.save();
      return { id };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  /**
   * 批量删除（含事务：每条记录恢复库存后删除；过滤 IoT 只读）
   * @returns { deleted, skipped, iotSkipped }
   */
  async removeBatch(ids: string[]): Promise<{ deleted: number; skipped: number; iotSkipped: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BusinessError(FertilizerErrorCode.INVALID_QUANTITY, '请提供要删除的记录ID数组');
    }
    if (ids.length > 200) {
      throw new BusinessError(FertilizerErrorCode.BATCH_TOO_LARGE, `批量删除单次最多 200 条，当前 ${ids.length} 条`);
    }
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const iotRows = queryToObjects<{ id: string }>(db,
      `SELECT id FROM fertilizer_records WHERE id IN (${placeholders}) AND data_source = 'auto_iot'`, ids,
    );
    const iotIds = new Set(iotRows.map(r => r.id));
    const deletable = ids.filter(id => !iotIds.has(id));
    if (deletable.length === 0) {
      throw new BusinessError(FertilizerErrorCode.ALL_IOT_READONLY, '所选记录均为 IoT 自动记录，不可删除', 403);
    }
    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      // 对每条 deletable 记录，恢复库存后删除
      for (const id of deletable) {
        const rec = this.repository.findById(id);
        if (rec && rec.fertilizer_id && rec.quantity > 0) {
          this.repository.increaseStock(rec.fertilizer_id, rec.quantity, now);
        }
        this.repository.deleteById(id);
      }
      db.exec('COMMIT');
      this.repository.save();
      return {
        deleted: deletable.length,
        skipped: ids.length - deletable.length,
        iotSkipped: iotIds.size,
      };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  /**
   * IoT 设备批量上报（事务包裹；按 iot_record_id + device_id 去重）
   */
  async ingestIot(deviceId: string, deviceName: string, records: any[]): Promise<{ inserted: number; skipped: number; total: number; device_id: string }> {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BusinessError(FertilizerErrorCode.INVALID_QUANTITY, '记录不能为空');
    }
    if (records.length > 500) {
      throw new BusinessError(FertilizerErrorCode.BATCH_TOO_LARGE, `单次上报最多 500 条，当前 ${records.length} 条`);
    }
    const db = getDatabase();
    const now = new Date().toISOString();
    let inserted = 0;
    let skipped = 0;

    db.exec('BEGIN');
    try {
      for (const record of records) {
        const parsed = iotRecordSchema.safeParse(record);
        if (!parsed.success) {
          skipped++;
          continue;
        }
        const r = parsed.data;

        // 去重
        const dups = queryToObjects<{ id: string }>(db,
          `SELECT id FROM fertilizer_records WHERE iot_record_id = ? AND iot_device_id = ?`,
          [r.iotRecordId, deviceId],
        );
        if (dups.length > 0) { skipped++; continue; }

        // 若传 fertilizerId，校验库存
        if (r.fertilizerId) {
          const lib = this.repository.findLibraryById(r.fertilizerId);
          if (!lib) { skipped++; continue; }
          if ((lib.currentStock ?? 0) < r.quantity) { skipped++; continue; }
          this.repository.decreaseStock(r.fertilizerId, r.quantity, now);
        }

        const code = this.generateCode();
        if (!code) { skipped++; continue; }
        const id = `fer-iot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${inserted}`;
        const recordRow: FertilizerRecord = {
          id,
          fertilizer_code: code,
          farm_task_id: null,
          production_plan_id: null,
          production_plan_code: null,
          planting_id: null,
          planting_code: null,
          greenhouse_id: null,
          greenhouse_name: r.greenhouseName,
          area_name: r.areaName ?? null,
          crop_name: r.cropName,
          crop_variety: null,
          fertilizer_name: r.fertilizerName,
          fertilizer_type: r.fertilizerType ?? '',
          dilution_ratio: r.dilutionRatio ?? '',
          quantity: r.quantity,
          unit: '千克',
          unit_price: r.unitPrice ?? 0,
          total_cost: r.quantity * (r.unitPrice ?? 0),
          fertilize_time: r.fertilizeTime ?? now,
          operator_id: null,
          operator_name: deviceName || `设备${deviceId}`,
          data_source: 'auto_iot',
          iot_device_id: deviceId,
          iot_record_id: r.iotRecordId,
          description: null,
          status: 'completed',
          create_time: now,
          update_time: now,
          fertilizer_id: r.fertilizerId ?? null,
        };
        this.repository.insert(recordRow);
        inserted++;
      }
      db.exec('COMMIT');
      this.repository.save();
      return { inserted, skipped, total: records.length, device_id: deviceId };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }
}

export const fertilizerService = new FertilizerService();
