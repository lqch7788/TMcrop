/**
 * 施肥业务逻辑层 (Service)
 * G11 V1.1：库存扣减/恢复 + 事务原子化
 * 负责业务校验、事务包裹、错误码抛出
 */

import { z } from 'zod';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';
import { fertilizerRepository, FertilizerRepository, FertilizerRecord } from '../repositories/fertilizer.repository';
import { wateringRepository, WateringRecord } from '../repositories/watering.repository';
import { toSpecUnit } from '../lib/unitConversions';

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

/**
 * Phase 2 (2026-07-20)：施肥稀释自动生成浇水记录 — 工具函数区
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §4.6
 */

/**
 * 解析稀释倍数（如 '1:500' → 500）。无法解析或不应稀释时返回 null。
 * 'dry' 表示干施不稀释，也返回 null。
 * 安全上限 100000 防止异常输入。
 */
function parseDilutionForWater(dilutionRatio: string | null | undefined): number | null {
  if (!dilutionRatio || dilutionRatio === 'dry') return null;
  const match = String(dilutionRatio).match(/^1:(\d+)$/);
  if (!match) return null;
  const ratio = parseInt(match[1], 10);
  if (ratio <= 0 || ratio > 100000) return null;
  return ratio;
}

/**
 * 计算用水量（含单位换算）
 * - 肥料用量统一转为克(g)
 * - 水量统一为毫升(mL)，>= 1000mL 时转为升(L)（保留 2 位小数）
 */
function calculateWaterAmount(
  fertilizerQty: number,
  fertilizerUnit: string,
  ratio: number,
): { amount: number; waterUnit: string } {
  const qtyInGrams = fertilizerUnit === 'kg' ? fertilizerQty * 1000
    : fertilizerUnit === 'g' ? fertilizerQty
    : fertilizerQty;
  const waterInML = qtyInGrams * ratio;
  if (waterInML >= 1000) {
    return { amount: Math.round(waterInML / 10) / 100, waterUnit: 'L' };
  }
  return { amount: Math.round(waterInML), waterUnit: 'ml' };
}

/**
 * Phase 2：从 fertilizationPool 解析稀释倍数并生成浇水记录
 * 必须在施肥事务内调用（不可独立事务包装 — 否则 SQLite 嵌套 BEGIN 破坏原子性）
 * - 无有效稀释倍数/空池时直接返回 []
 * - 池中所有稀释行合并为一条 watering_records（多条产物同时稀释到同一片区域）
 */
function buildWateringFromPool(
  pool: any[],
  context: {
    id: string;
    cropName: string;
    greenhouseName: string;
    waterTime: string;
    operatorName?: string | null;
    areaName?: string | null;
  },
): WateringRecord[] {
  const rows: any[] = [];
  for (const p of pool) {
    const ratio = parseDilutionForWater(p.dilutionRatio);
    if (!ratio) continue;
    const qty = Number(p.quantity) || 0;
    if (qty <= 0) continue;
    const { amount, waterUnit } = calculateWaterAmount(qty, p.unit || 'kg', ratio);
    if (amount <= 0) continue;
    rows.push({
      area: p.area || '',
      wateringMethod: p.fertilizationMethod || 'drip_irrigation',
      waterAmount: amount,
      waterUnit,
      sourceFertilizerName: p.fertilizerName,
      sourceDilutionRatio: p.dilutionRatio,
      sourceFertilizerQuantity: qty,
    });
  }

  if (rows.length === 0) return [];

  const code = wateringRepository.generateCode();
  if (!code) return [];

  // 总量按 L 累加（mL / 1000 转 L）
  const total = rows.reduce((s, r) => {
    const inLiter = r.waterUnit === 'L' ? r.waterAmount : r.waterAmount / 1000;
    return s + inLiter;
  }, 0);

  return [{
    id: `water-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    waterCode: code,
    recordType: 'fertilizer_dilution',
    fertilizerRecordId: context.id,
    sourceDailyRecordId: null,
    cropName: context.cropName,
    cropVariety: null,
    greenhouseId: null,
    greenhouseName: context.greenhouseName,
    areaId: null,
    areaName: (context.areaName ?? rows[0].area) || null,
    plantingId: null,
    plantingCode: null,
    seedlingId: null,
    seedlingCode: null,
    waterPool: JSON.stringify(rows),
    totalWater: Math.round(total * 100) / 100,
    waterUnit: 'L',
    waterCost: 0,
    waterTime: context.waterTime,
    operatorId: null,
    operatorName: context.operatorName || null,
    dataSource: 'manual',
    iotDeviceId: null,
    description: null,
    status: 'completed',
    createTime: nowLocalTimestamp(),
    updateTime: nowLocalTimestamp(),
  }];
}

/**
 * Phase 2：在施肥事务内统一调用入口（含异常隔离，避免浇水失败污染施肥事务）
 * - context.fertilizationPool：JSON 字符串或已解析数组
 * - 浇水写失败仅 console.error 不抛错（施肥仍是主业务）
 */
function tryGenerateWateringFromPool(
  fertilizationPool: string | any[] | null | undefined,
  context: {
    id: string;
    cropName: string;
    greenhouseName: string;
    waterTime: string;
    operatorName?: string | null;
    areaName?: string | null;
  },
): void {
  try {
    if (!fertilizationPool) return;
    let pool: any[] = [];
    if (typeof fertilizationPool === 'string') {
      try { pool = JSON.parse(fertilizationPool); } catch { return; }
    } else if (Array.isArray(fertilizationPool)) {
      pool = fertilizationPool;
    }
    if (!Array.isArray(pool) || pool.length === 0) return;
    const waterings = buildWateringFromPool(pool, context);
    for (const w of waterings) {
      wateringRepository.insert(w);
    }
  } catch (e) {
    // 浇水生成失败不影响施肥事务
    console.error('[fertilizer.service] 浇水自动生成失败（不影响施肥事务）:', e);
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
  // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥）
  cropNames: z.string().nullish(),
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
      // 2026-07-17：库存扣减统一处理 — 既支持顶层 fertilizerId，也支持 fertilization_pool 池里每条 specId
      // - 单位换算：用户输入单位可能与库存单位不一致（如 1000g vs 100kg），用 toSpecUnit 转换
      let specSnapshot: { brandName: string; unitPrice: number; batchNumber: string } | null = null;
      // 收集所有需要扣库存的项目（specId → { inputDosage, inputUnit, convertedDosage, specUnit, source }）
      interface DeductionItem {
        specId: string;
        inputDosage: number;
        inputUnit: string;
        convertedDosage: number;  // 换算到 spec 单位的实际扣减量
        specUnit: string;
        needsManualCheck: boolean;
      }
      const deductions: DeductionItem[] = [];

      // 来源 1：顶层 fertilizerId（兼容旧 schema）
      if (data.fertilizerId) {
        const spec: any = this.repository.findSpecById(data.fertilizerId);
        if (spec && qty > 0) {
          const conv = toSpecUnit(qty, data.unit || spec.stockUnit || 'kg', spec.stockUnit || 'kg');
          deductions.push({
            specId: data.fertilizerId,
            inputDosage: qty,
            inputUnit: data.unit || spec.stockUnit || 'kg',
            convertedDosage: conv ? conv.convertedQuantity : qty,
            specUnit: spec.stockUnit || 'kg',
            needsManualCheck: conv ? conv.needsManualCheck : false,
          });
        }
      }

      // 来源 2：fertilization_pool 池里每条有 specId 的
      // 2026-07-17：兼容两种字段名 — 新版 FertilizerPoolEditor 写 \$.specId，旧版手动录入写 \$.fertilizerSpecId
      if (data.fertilizationPool && typeof data.fertilizationPool === 'string') {
        try {
          const pool = JSON.parse(data.fertilizationPool);
          if (Array.isArray(pool)) {
            // 同 specId 合并扣减量
            const grouped = new Map<string, { inputDosage: number; inputUnit: string }>();
            for (const r of pool) {
              // 兼容两种字段名
              const specId = (r.specId && r.specId.trim()) || (r.fertilizerSpecId && r.fertilizerSpecId.trim());
              if (!specId) continue;
              const rQty = Number(r.quantity) || 0;
              if (rQty <= 0) continue;
              const existing = grouped.get(specId);
              if (existing) {
                existing.inputDosage += rQty;
              } else {
                grouped.set(specId, { inputDosage: rQty, inputUnit: r.unit || 'kg' });
              }
            }
            for (const [specId, item] of grouped.entries()) {
              const spec: any = this.repository.findSpecById(specId);
              if (!spec) {
                throw new BusinessError(
                  FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
                  `肥料规格不存在: ${specId}`,
                  404,
                );
              }
              const conv = toSpecUnit(item.inputDosage, item.inputUnit, spec.stockUnit || 'kg');
              deductions.push({
                specId,
                inputDosage: item.inputDosage,
                inputUnit: item.inputUnit,
                convertedDosage: conv ? conv.convertedQuantity : item.inputDosage,
                specUnit: spec.stockUnit || 'kg',
                needsManualCheck: conv ? conv.needsManualCheck : false,
              });
            }
          }
        } catch (e) {
          // 池 JSON 解析失败：忽略（不影响顶层记录保存）
          if (!(e instanceof BusinessError)) { /* ignore parse error */ }
          else throw e;
        }
      }

      // 2) 执行扣减（按 specId 合并：顶层 + pool 可能有重复 specId）
      const deductBySpecId = new Map<string, DeductionItem>();
      for (const d of deductions) {
        const existing = deductBySpecId.get(d.specId);
        if (existing) {
          existing.convertedDosage += d.convertedDosage;
        } else {
          deductBySpecId.set(d.specId, { ...d });
        }
      }

      // 3) 校验库存够 + 扣减
      for (const [specId, d] of deductBySpecId.entries()) {
        const spec: any = this.repository.findSpecById(specId);
        if (!spec) {
          throw new BusinessError(
            FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
            `肥料规格不存在: ${specId}`,
            404,
          );
        }
        if (d.convertedDosage > 0 && (spec.stockQuantity ?? 0) < d.convertedDosage) {
          let hint = '';
          if (d.needsManualCheck) {
            hint = `（您输入的 ${d.inputDosage}${d.inputUnit} 无法自动换算到库存单位 ${d.specUnit}，请确认使用量）`;
          } else if ((d.inputUnit || '').trim().toLowerCase() !== (d.specUnit || 'kg').trim().toLowerCase()) {
            hint = `（您输入的 ${d.inputDosage}${d.inputUnit} ≈ ${d.convertedDosage.toFixed(4)}${d.specUnit}，库存单位是 ${d.specUnit}）`;
          }
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存不足：当前 ${spec.stockQuantity ?? 0} ${d.specUnit}，需 ${d.convertedDosage.toFixed(4)} ${d.specUnit}${hint}`,
          );
        }
        if (d.convertedDosage > 0) {
          const newStock = this.repository.decreaseStock(specId, d.convertedDosage, now);
          if (newStock === null) {
            throw new BusinessError(
              FertilizerErrorCode.INSUFFICIENT_STOCK,
              `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存并发不足，请重试`,
            );
          }
        }
      }

      // 4) 顶层 fertilizerId 的 specSnapshot（用于顶部 spec 关键字段展示）
      if (data.fertilizerId) {
        const spec: any = this.repository.findSpecById(data.fertilizerId);
        if (spec) {
          specSnapshot = {
            brandName: spec.brandName || '',
            unitPrice: spec.unitPrice || 0,
            batchNumber: spec.batchNumber || '',
          };
        }
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
        // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥）
        crop_names: data.cropNames ?? null,
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

      // Phase 2：施肥稀释自动生成浇水记录（必须在 COMMIT 前 — 事务原子性）
      tryGenerateWateringFromPool(data.fertilizationPool, {
        id,
        cropName: data.cropName,
        greenhouseName: data.greenhouseName,
        waterTime: data.fertilizeTime,
        operatorName: data.operatorName,
        areaName: data.areaName,
      });

      db.exec('COMMIT');
      this.repository.save();
      return record;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
      // 2026-07-25：所有 throw 转 BusinessError 详细错误（避免 500 通用"更新失败/删除失败"看不到根因）
      // - 之前：普通 Error 透传 → handleError 返回 500 + fallback "更新失败"（无诊断价值）
      // - 现在：转 BusinessError（消息含 err.message + 完整堆栈到 console）
      if (err instanceof BusinessError) throw err;
      console.error('[fertilizer.service] 详细错误堆栈:', err);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BusinessError(
        'OPERATION_FAILED',
        `操作失败：${detail || '未知错误'}`,
        500,
      );
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
    // updates 来自路由层 req.body（前端发 camelCase）— 双 key 兼容
    const upd = updates as Record<string, any>;

    /**
     * 2026-07-21 修复（P0-#1）：编辑时池级库存 delta 比较
     *
     * 旧逻辑仅处理顶层 fertilizerId → quantity delta（单肥旧架构），完全不处理池内 specId 变更。
     * 新逻辑：解析旧池和新池 → 分别按 specId 聚合 → 逐 specId 算 delta → 库存调整。
     *
     * 聚合规则：priority = specId 字段自身；兼容旧字段名 fertilizerSpecId。
     * 单位换算：用户输入单位可能与库存单位不同，统一走 toSpecUnit 转换。
     */

    /** 从池 JSON 提取 specId → 用量聚合 Map */
    function poolSpecAggregate(poolJson: string | null | undefined): Map<string, { inputDosage: number; inputUnit: string }> {
      const map = new Map<string, { inputDosage: number; inputUnit: string }>();
      if (!poolJson || typeof poolJson !== 'string') return map;
      try {
        const pool = JSON.parse(poolJson);
        if (!Array.isArray(pool)) return map;
        for (const r of pool) {
          const specId = (r.specId && String(r.specId).trim()) || (r.fertilizerSpecId && String(r.fertilizerSpecId).trim());
          if (!specId) continue;
          const rQty = Number(r.quantity) || 0;
          if (rQty <= 0) continue;
          const existing = map.get(specId);
          if (existing) {
            existing.inputDosage += rQty;
          } else {
            map.set(specId, { inputDosage: rQty, inputUnit: r.unit || 'kg' });
          }
        }
      } catch { /* ignore parse error */ }
      return map;
    }

    // 旧池聚合（编辑前的库存占用）
    const oldPool = poolSpecAggregate(ex.fertilizationPool);
    // 新池聚合（编辑后的库存占用）
    const newPoolJson = upd.fertilizationPool ?? ex.fertilizationPool;
    const newPool = poolSpecAggregate(newPoolJson);

    // 合并所有 specId（旧池+新池并集），逐项算 delta
    const allSpecIds = new Set([...oldPool.keys(), ...newPool.keys()]);
    for (const specId of allSpecIds) {
      const oldItem = oldPool.get(specId);
      const newItem = newPool.get(specId);
      const oldDosage = oldItem?.inputDosage ?? 0;
      const newDosage = newItem?.inputDosage ?? 0;
      const delta = newDosage - oldDosage;
      if (delta === 0) continue;

      // 查找规格信息（优先用新池的输入单位，其次旧池）
      const inputUnit = newItem?.inputUnit || oldItem?.inputUnit || 'kg';
      const spec = this.repository.findSpecById(specId);
      if (!spec) {
        throw new BusinessError(
          FertilizerErrorCode.FERTILIZER_LIBRARY_NOT_FOUND,
          `肥料规格不存在: ${specId}`,
          404,
        );
      }

      // 单位换算：delta 是用户输入单位的值，需转为库存单位再扣减
      const conv = toSpecUnit(Math.abs(delta), inputUnit, spec.stockUnit || 'kg');
      const convertedDelta = conv ? conv.convertedQuantity : Math.abs(delta);
      const needsManualCheck = conv ? conv.needsManualCheck : false;

      if (delta > 0) {
        // 新增用量 → 扣库存
        if ((spec.stockQuantity ?? 0) < convertedDelta) {
          let hint = '';
          if (needsManualCheck) {
            hint = `（用户输入单位 ${inputUnit} 无法自动换算到库存单位 ${spec.stockUnit || 'kg'}，请确认）`;
          } else if (inputUnit.trim().toLowerCase() !== (spec.stockUnit || 'kg').trim().toLowerCase()) {
            hint = `（${Math.abs(delta)}${inputUnit} ≈ ${convertedDelta.toFixed(4)}${spec.stockUnit || 'kg'}）`;
          }
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存不足：当前 ${spec.stockQuantity ?? 0} ${spec.stockUnit || 'kg'}，需追加 ${convertedDelta.toFixed(4)} ${spec.stockUnit || 'kg'}${hint}`,
          );
        }
        const result = this.repository.decreaseStock(specId, convertedDelta, now);
        if (result === null) {
          throw new BusinessError(
            FertilizerErrorCode.INSUFFICIENT_STOCK,
            `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存并发不足，请重试`,
          );
        }
      } else {
        // 减少用量 → 恢复库存
        this.repository.increaseStock(specId, convertedDelta, now);
      }
    }

    db.exec('BEGIN');
    try {

      // 同步 total_cost（2026-07-16 审核修复：camelCase/snake_case 双 key 兼容，防 NaN）
      const updPrice = upd.unitPrice ?? upd.unit_price;
      if (upd.quantity !== undefined || updPrice !== undefined) {
        const finalQty = Number(upd.quantity ?? ex.quantity) || 0;
        const finalPrice = Number(updPrice ?? ex.unitPrice) || 0;
        upd.total_cost = finalQty * finalPrice;
      }
      upd.update_time = now;
      this.repository.update(id, updates);

      // 2026-07-25：先 COMMIT 再做浇水操作（独立事务）
      // 修复 "cannot commit - no transaction is active"：之前浇水在主事务内，sql.js 内存模式下
      //   外键 quirk 触发 INSERT 失败 → sql.js 内部 ROLLBACK 事务 → COMMIT 失败
      // 移到 COMMIT 之后：施肥主事务已提交，浇水操作独立事务（接受原子性损失）
      db.exec('COMMIT');
      this.repository.save();

      // Phase 2：先删旧浇水记录，再根据新的 fertilizationPool 重新生成（独立事务）
      try {
        wateringRepository.deleteByFertilizerRecordId(id);
        const newPool = upd.fertilizationPool ?? ex.fertilizationPool;
        tryGenerateWateringFromPool(newPool, {
          id,
          cropName: upd.cropName ?? ex.cropName,
          greenhouseName: upd.greenhouseName ?? ex.greenhouseName,
          waterTime: upd.fertilizeTime ?? ex.fertilizeTime,
          operatorName: upd.operatorName ?? ex.operatorName,
          areaName: upd.areaName ?? ex.areaName,
        });
      } catch (e) {
        console.error('[fertilizer.service] 浇水更新失败（不影响施肥保存）:', e);
      }

      return this.repository.findById(id);
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        // 2026-07-16：ROLLBACK 失败时记录 ERROR（不再完全静默）
        console.error('[fertilizer.service] ROLLBACK 失败:', rbErr);
        console.error('[fertilizer.service] 原错误:', err);
      }
      // 2026-07-25：所有 throw 转 BusinessError 详细错误（避免 500 通用"更新失败/删除失败"看不到根因）
      // - 之前：普通 Error 透传 → handleError 返回 500 + fallback "更新失败"（无诊断价值）
      // - 现在：转 BusinessError（消息含 err.message + 完整堆栈到 console）
      if (err instanceof BusinessError) throw err;
      console.error('[fertilizer.service] 详细错误堆栈:', err);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BusinessError(
        'OPERATION_FAILED',
        `操作失败：${detail || '未知错误'}`,
        500,
      );
    }
  }

  /**
   * 2026-07-17：从施肥记录中恢复库存（含顶层 fertilizerId + fertilization_pool 每条 specId）
   * - 兼容两种字段名：r.specId（新）/ r.fertilizerSpecId（旧）
   * - 同 specId 合并后做单位换算再 increaseStock
   */
  private increaseStockFromFarmRecord(record: Record<string, any>, now: string): void {
    // 1) 顶层 fertilizerId（2026-07-21 修复：补单位换算，与池路径一致）
    const fid = record.fertilizerId ?? null;
    const qty = Number(record.quantity) || 0;
    if (fid && qty > 0) {
      const spec: any = this.repository.findSpecById(fid);
      if (spec) {
        const inputUnit = record.unit || 'kg';
        const conv = toSpecUnit(qty, inputUnit, spec.stockUnit || 'kg');
        const actualIncrease = conv ? conv.convertedQuantity : qty;
        this.repository.increaseStock(fid, actualIncrease, now);
      } else {
        // 2026-07-25 修复 500：spec 已删除时 try/catch 包裹 increaseStock（之前会抛普通 Error → 500）
        // - 场景：施肥记录顶层 fertilizerId 关联的 spec 已被用户/系统删除
        // - 行为：跳过库存恢复（无法定位 spec 换算），仅记录 warning，不阻塞删除主流程
        try {
          this.repository.increaseStock(fid, qty, now);
        } catch (e) {
          console.warn(`[fertilizer.service] 恢复库存失败（spec 已删除）: specId=${fid}`, e);
        }
      }
    }
    // 2) fertilization_pool 池里每条
    if (record.fertilizationPool && typeof record.fertilizationPool === 'string') {
      try {
        const pool = JSON.parse(record.fertilizationPool);
        if (Array.isArray(pool)) {
          const grouped = new Map<string, { inputDosage: number; inputUnit: string }>();
          for (const r of pool) {
            const specId = (r.specId && r.specId.trim()) || (r.fertilizerSpecId && r.fertilizerSpecId.trim());
            if (!specId) continue;
            const rQty = Number(r.quantity) || 0;
            if (rQty <= 0) continue;
            const existing = grouped.get(specId);
            if (existing) {
              existing.inputDosage += rQty;
            } else {
              grouped.set(specId, { inputDosage: rQty, inputUnit: r.unit || 'kg' });
            }
          }
          for (const [specId, item] of grouped.entries()) {
            const spec: any = this.repository.findSpecById(specId);
            if (!spec) continue;
            // 单位换算：池里的 quantity 是用户原值（未换算），需转换为 spec 单位再 increaseStock
            const conv = toSpecUnit(item.inputDosage, item.inputUnit, spec.stockUnit || 'kg');
            const actualIncrease = conv ? conv.convertedQuantity : item.inputDosage;
            this.repository.increaseStock(specId, actualIncrease, now);
          }
        }
      } catch { /* ignore parse error */ }
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
      // 2026-07-17：恢复库存（含顶层 fertilizerId + fertilization_pool 池里每条 specId）
      this.increaseStockFromFarmRecord(ex, now);
      // Phase 2：级联删除关联浇水记录（必须在 COMMIT 前 — 事务原子性）
      try {
        wateringRepository.deleteByFertilizerRecordId(id);
      } catch (e) {
        console.error('[fertilizer.service] 浇水级联删除失败（不影响施肥事务）:', e);
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
      // 2026-07-25：所有 throw 转 BusinessError 详细错误（避免 500 通用"更新失败/删除失败"看不到根因）
      // - 之前：普通 Error 透传 → handleError 返回 500 + fallback "更新失败"（无诊断价值）
      // - 现在：转 BusinessError（消息含 err.message + 完整堆栈到 console）
      if (err instanceof BusinessError) throw err;
      console.error('[fertilizer.service] 详细错误堆栈:', err);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BusinessError(
        'OPERATION_FAILED',
        `操作失败：${detail || '未知错误'}`,
        500,
      );
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
      // 2026-07-17：扩展到 pool 里的每条 specId（兼容旧 schema 的 fertilizerSpecId 字段名）
      for (const id of deletable) {
        const rec = this.repository.findById(id) as unknown as Record<string, any> | null;
        if (rec) {
          this.increaseStockFromFarmRecord(rec, now);
        }
        // Phase 2：批量删除时级联删浇水（必须在 COMMIT 前 — 事务原子性）
        try {
          wateringRepository.deleteByFertilizerRecordId(id);
        } catch (e) {
          console.error('[fertilizer.service] 批量删浇水级联失败:', e);
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
      // 2026-07-25：所有 throw 转 BusinessError 详细错误（避免 500 通用"更新失败/删除失败"看不到根因）
      // - 之前：普通 Error 透传 → handleError 返回 500 + fallback "更新失败"（无诊断价值）
      // - 现在：转 BusinessError（消息含 err.message + 完整堆栈到 console）
      if (err instanceof BusinessError) throw err;
      console.error('[fertilizer.service] 详细错误堆栈:', err);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BusinessError(
        'OPERATION_FAILED',
        `操作失败：${detail || '未知错误'}`,
        500,
      );
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
          crop_names: null,  // IoT 记录不涉及多作物
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
      // 2026-07-25：所有 throw 转 BusinessError 详细错误（避免 500 通用"更新失败/删除失败"看不到根因）
      // - 之前：普通 Error 透传 → handleError 返回 500 + fallback "更新失败"（无诊断价值）
      // - 现在：转 BusinessError（消息含 err.message + 完整堆栈到 console）
      if (err instanceof BusinessError) throw err;
      console.error('[fertilizer.service] 详细错误堆栈:', err);
      const detail = err instanceof Error ? err.message : String(err);
      throw new BusinessError(
        'OPERATION_FAILED',
        `操作失败：${detail || '未知错误'}`,
        500,
      );
    }
  }
}

export const fertilizerService = new FertilizerService();
