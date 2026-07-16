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
 * 2026-07-16：本地时间字符串（替换 toISOString）—— UTC 跨天错位 bug 修复
 * 格式：YYYY-MM-DD HH:MM:SS（无时区后缀），既可读又与 SQLite datetime('now','localtime') 行为一致
 */
function nowLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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
  // 2026-07-05: 加 seedling 关联（与 planting 二选一，互斥）
  seedlingId: z.string().nullish(),
  seedlingCode: z.string().nullish(),
  greenhouseId: z.string().nullish(),
  greenhouseName: z.string().min(1, '温室名称必填'),
  areaName: z.string().nullish(),
  cropName: z.string().min(1, '作物名称必填'),
  cropVariety: z.string().nullish(),
  fertilizerName: z.string().min(1, '肥料名称必填'),
  // 2026-07-12：fertilizerType 已不再是顶层必填（迁到池的每个肥料行；老数据保留兼容）
  fertilizerType: z.string().nullish(),
  dilutionRatio: z.string().optional(),
  quantity: z.number().nonnegative('数量必须非负').max(1e7, '数量过大'),
  unit: z.string().optional(),
  unitPrice: z.number().nonnegative().default(0),
  fertilizeTime: z.string().min(1, '施肥时间必填'),
  operatorId: z.string().nullish(),
  operatorName: z.string().nullish(),
  description: z.string().nullish(),
  /** G11 V1.1：肥料库 id（可选 — 老数据无库可空） */
  fertilizerId: z.string().nullish(),
  // 2026-07-12：施肥区域池（JSON 字符串，每条独立 [区域, 用量, 单位, 稀释倍数]）
  fertilizationPool: z.string().nullish(),
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
   * 通用条件查询（带分页）
   * 2026-07-16：service 层入口，filter 透传到 repository.findAll
   */
  findAll(filters: Record<string, string | undefined>, page: number, pageSize: number) {
    return this.repository.findAll(filters, page, pageSize);
  }

  /**
   * 统计聚合
   */
  findStats(filters: Record<string, string | undefined>, groupBy: string) {
    return this.repository.findStats(filters, groupBy);
  }

  /**
   * 单条查询
   */
  findById(id: string) {
    return this.repository.findById(id);
  }

  /**
   * 生成施肥记录编号 SF+YYYYMMDD-4位流水号
   *
   * 2026-07-16 性能优化：用 findMaxCodeSeq 替代全表扫描（database-reviewer M-3：10w+ 行 50-500ms/call）
   * - 取 MAX(CAST(SUBSTR(...) AS INTEGER)) 单条 SQL 替代全表 ORDER BY DESC
   * - 候选号查重用 LIMIT 1 索引命中（fertilizer_code UNIQUE）
   * - 最多 10 次重试；重试耗尽时返回 null
   */
  generateCode(): string | null {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `SF${datePrefix}`;
    const MAX_RETRIES = 10;

    const baseSeq = this.repository.findMaxCodeSeq(prefix);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const candidate = `${prefix}-${String(baseSeq + 1 + attempt).padStart(4, '0')}`;

      // 候选号查重（fertilizer_code UNIQUE 约束，LIMIT 1 O(1)）
      const dups = this.repository.findAllCodesByPrefix(candidate);
      if (dups.length === 0) {
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
    // 2026-07-16：用本地时间戳替代 toISOString()（UTC 跨天错位 bug 修复）
    const now = nowLocalTimestamp();
    const id = `fer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const qty = data.quantity;
    const price = data.unitPrice ?? 0;
    // 2026-07-12：总成本从 fertilizationPool 解开，按每行 (quantity × unitPrice) 求和（多肥各自定价）
    let totalCost = (qty || 0) * price;
    if (data.fertilizationPool && typeof data.fertilizationPool === 'string') {
      try {
        const pool = JSON.parse(data.fertilizationPool);
        if (Array.isArray(pool)) {
          totalCost = pool.reduce(
            (sum: number, r: any) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
            0
          );
        }
      } catch { /* ignore */ }
    }

    // 2026-07-12：池首行单价 fallback（兼容老 schema 顶层 unit_price 字段）
    function poolFirstUnitPrice(jsonStr: string | null | undefined): number | null {
      if (!jsonStr || typeof jsonStr !== 'string') return null;
      try {
        const pool = JSON.parse(jsonStr);
        if (Array.isArray(pool) && pool.length > 0) {
          return Number(pool[0].unitPrice) || 0;
        }
      } catch { /* ignore */ }
      return null;
    }

    // 开启事务：INSERT record + UPDATE stock 必须原子
    db.exec('BEGIN');
    try {
      // generateCode 在事务内（避免并发 UNIQUE 冲突）
      const code = this.generateCode();
      if (!code) {
        throw new BusinessError(
          FertilizerErrorCode.INVALID_QUANTITY,
          `生成施肥编号失败（重试 10 次仍冲突），请稍后重试`,
        );
      }
      // 1) 若传了 fertilizerId（实际为 spec id，V2026-07-12 扁平化），先校验存在 + 库存够
      let specSnapshot: { brandName: string; unitPrice: number; batchNumber: string } | null = null;
      if (data.fertilizerId) {
        const spec = this.repository.findSpecById(data.fertilizerId);
        if (!spec) {
          throw new BusinessError(
            FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
            `肥料规格不存在: ${data.fertilizerId}`,
            404,
          );
        }
        if (qty > 0 && (spec.stockQuantity ?? 0) < qty) {
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存不足：当前 ${spec.stockQuantity ?? 0}，需 ${qty}`,
          );
        }
        // 2) 扣库存（repository 失败时抛错 — 含 stock_quantity 不足场景）
        if (qty > 0) {
          const newStock = this.repository.decreaseStock(data.fertilizerId, qty, now);
          if (newStock === null) {
            throw new BusinessError(
              FertilizerErrorCode.INSUFFICIENT_STOCK,
              `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存并发不足（其他事务正在扣减），请重试`,
            );
          }
        }
        // 快照 spec 关键字段（spec 删除后仍能查"当时用了什么"）
        specSnapshot = {
          brandName: spec.brandName || '',
          unitPrice: spec.unitPrice || 0,
          batchNumber: spec.batchNumber || '',
        };
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
        // 2026-07-05: seedling 二选一关联
        seedling_id: data.seedlingId ?? null,
        seedling_code: data.seedlingCode ?? null,
        greenhouse_id: data.greenhouseId ?? null,
        greenhouse_name: data.greenhouseName,
        area_name: data.areaName ?? null,
        crop_name: data.cropName,
        crop_variety: data.cropVariety ?? null,
        fertilizer_name: data.fertilizerName,
        // 2026-07-12：fertilizerType 已不再必填；null/undefined 转为 '' 兼容 NOT NULL
        fertilizer_type: data.fertilizerType ?? '',
        dilution_ratio: data.dilutionRatio ?? '',
        quantity: qty,
        unit: data.unit ?? '千克',
        // 2026-07-12：顶层 unit_price 取池首行（兼容老 schema；总成本按池行 sum 精确计算）
        unit_price: price || (poolFirstUnitPrice(data.fertilizationPool) ?? 0),
        total_cost: totalCost,  // 2026-07-12：多肥按行 sum（兼容老 data：单肥 qty × price）
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
        // 2026-07-12：施肥区域池 JSON
        fertilization_pool: data.fertilizationPool ?? null,
        // 2026-07-12：spec 快照字段（spec 删除后仍能查"当时用了什么"）
        spec_id: data.fertilizerId ?? null,
        spec_brand_name: specSnapshot?.brandName ?? null,
        spec_unit_price_snapshot: specSnapshot?.unitPrice ?? null,
        spec_batch_number: specSnapshot?.batchNumber ?? null,
      };
      this.repository.insert(record);

      db.exec('COMMIT');
      this.repository.save();
      return record;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
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
    // 2026-07-16 审核修复：queryToObjects 转 camelCase — findById 结果必须按 camelCase 读
    // （原 existing.data_source/fertilizer_id 恒 undefined → IoT 保护失效 + 库存不调整）
    const ex = existing as unknown as Record<string, any>;
    if (ex.dataSource === 'auto_iot') {
      throw new BusinessError(FertilizerErrorCode.IOT_READONLY, 'IoT 自动记录不可编辑', 403);
    }

    const db = getDatabase();
    const now = nowLocalTimestamp();
    const oldQty = Number(ex.quantity) || 0;
    // updates 来自路由层 req.body（前端发 camelCase）— 双 key 兼容
    const upd = updates as Record<string, any>;
    const newQty = upd.quantity ?? oldQty;
    const fid = ex.fertilizerId ?? null;

    db.exec('BEGIN');
    try {
      // 处理 quantity delta（若 fertilizer_id 已绑定 — 实际为 spec id）
      if (fid && newQty !== oldQty) {
        const delta = newQty - oldQty;
        const spec = this.repository.findSpecById(fid);
        if (!spec) {
          throw new BusinessError(
            FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
            `肥料规格不存在: ${fid}`,
            404,
          );
        }
        if (delta > 0 && (spec.stockQuantity ?? 0) < delta) {
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存不足：当前 ${spec.stockQuantity ?? 0}，需追加 ${delta}`,
          );
        }
        if (delta > 0) {
          const newStock = this.repository.decreaseStock(fid, delta, now);
          if (newStock === null) {
            throw new BusinessError(
              FertilizerErrorCode.INSUFFICIENT_STOCK,
              `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存并发不足（其他事务正在扣减），请重试`,
            );
          }
        } else if (delta < 0) {
          this.repository.increaseStock(fid, -delta, now);
        }
      }

      // 同步 total_cost（2026-07-16 审核修复：camelCase/snake_case 双 key 兼容，防 NaN）
      const updPrice = upd.unitPrice ?? upd.unit_price;
      if (upd.quantity !== undefined || updPrice !== undefined) {
        const finalQty = Number(upd.quantity ?? ex.quantity) || 0;
        const finalPrice = Number(updPrice ?? ex.unitPrice) || 0;
        upd.total_cost = finalQty * finalPrice;
      }
      upd.update_time = now;
      this.repository.update(id, updates);

      db.exec('COMMIT');
      this.repository.save();
      return this.repository.findById(id);
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
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
    // 2026-07-16 审核修复：camelCase 读取（原 snake_case 读取恒 undefined → IoT 保护 + 库存回补全失效）
    const ex = existing as unknown as Record<string, any>;
    if (ex.dataSource === 'auto_iot') {
      throw new BusinessError(FertilizerErrorCode.IOT_READONLY, 'IoT 自动记录不可删除', 403);
    }

    const db = getDatabase();
    const now = nowLocalTimestamp();

    db.exec('BEGIN');
    try {
      const fid = ex.fertilizerId ?? null;
      const qty = Number(ex.quantity) || 0;
      if (fid && qty > 0) {
        this.repository.increaseStock(fid, qty, now);
      }
      this.repository.deleteById(id);
      db.exec('COMMIT');
      this.repository.save();
      return { id };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
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
    const now = nowLocalTimestamp();
    db.exec('BEGIN');
    try {
      // 对每条 deletable 记录，恢复库存后删除
      // 2026-07-16 审核修复：camelCase 读取（原 rec.fertilizer_id 恒 undefined → 批量删除不回补库存）
      for (const id of deletable) {
        const rec = this.repository.findById(id) as unknown as Record<string, any> | null;
        const recQty = Number(rec?.quantity) || 0;
        if (rec && rec.fertilizerId && recQty > 0) {
          this.repository.increaseStock(rec.fertilizerId, recQty, now);
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
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
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
    const now = nowLocalTimestamp();
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

        // 去重（2026-07-16 审核修复：findAll 白名单不含 iot_record_id 导致过滤被静默忽略，
        // 改用专用 findByIotRecordId — 精确匹配 + 走索引；结果字段 camelCase）
        const dups = this.repository.findByIotRecordId(r.iotRecordId) as unknown as Record<string, any>[];
        if (dups.some((d) => d.iotDeviceId === deviceId)) {
          skipped++;
          continue;
        }

        // 若传 fertilizerId（实际为 spec id），校验库存
        let iotSpec: { brandName?: string; unitPrice?: number; batchNumber?: string } | null = null;
        if (r.fertilizerId) {
          const spec = this.repository.findSpecById(r.fertilizerId);
          if (!spec) { skipped++; continue; }
          if ((spec.stockQuantity ?? 0) < r.quantity) { skipped++; continue; }
          const newStock = this.repository.decreaseStock(r.fertilizerId, r.quantity, now);
          if (newStock === null) { skipped++; continue; }
          iotSpec = {
            brandName: spec.brandName,
            unitPrice: spec.unitPrice,
            batchNumber: spec.batchNumber,
          };
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
          // 2026-07-16 审核修复：FertilizerRecord 补声明后 IoT 行同步补齐
          seedling_id: null,
          seedling_code: null,
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
          fertilization_pool: null,
          // 2026-07-12：spec 快照字段（spec 删除后仍能查"当时用了什么"）
          spec_id: r.fertilizerId ?? null,
          spec_brand_name: iotSpec?.brandName ?? null,
          spec_unit_price_snapshot: iotSpec?.unitPrice ?? null,
          spec_batch_number: iotSpec?.batchNumber ?? null,
        };
        this.repository.insert(recordRow);
        inserted++;
      }
      db.exec('COMMIT');
      this.repository.save();
      return { inserted, skipped, total: records.length, device_id: deviceId };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
      throw err;
    }
  }
}

export const fertilizerService = new FertilizerService();
