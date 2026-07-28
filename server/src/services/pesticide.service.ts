/**
 * 防治记录业务逻辑层 (Service)
 * 2026-07-17 新增：仿 FertilizerService 模式，支持防治记录 → 肥料库存扣减
 *
 * 关键业务规则：
 * 1. POST：解析 leafFertilizerList JSON，对每条有 specId 的肥料逐项校验库存 + 扣减 + INSERT（事务包裹）
 * 2. PUT：diff leafFertilizerList，对变化的 specId 做 delta 调整（新增扣减 / 删除回补 / 用量变更调整）
 * 3. DELETE / BATCH DELETE：恢复库存后删除（事务包裹）
 * 4. 兼容旧数据：无 specId 的 leafFertilizerList 条目跳过库存扣减（不报错）
 */
import { z } from 'zod';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';
import { pesticideRepository, PesticideRepository, PesticideRecord, parseLeafFertilizerList, LeafFertilizerItem } from '../repositories/pesticide.repository';
import { fertilizerRepository } from '../repositories/fertilizer.repository';
import { adjustPesticideStock, getOldPesticideSync } from '../lib/syncDailyRecords';

/**
 * 2026-07-17：本地时间戳（替换 toISOString）—— UTC 跨天错位 bug 修复
 */
function nowLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 2026-07-18 修复：把 PesticideRecord (snake_case) 转成前端期望的 camelCase keys
 * - 用于 apply() 返回值（route 层 parseJsonFieldsOnRead 依赖 camelCase keys）
 * - 与 queryToObjects.mapToCamelCase 行为一致
 */
function normalizePesticideRecordKeys(rec: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(rec)) {
    const camel = key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
    out[camel] = value;
  }
  return out;
}

/**
 * 2026-07-17：生成防治记录编号 BY+YYYYMMDD-4位流水号
 * - 用 MAX + LIKE prefix 走索引扫描（N=1万时性能显著）
 * - 包含 5 次 UNIQUE 重试（事务内并发保护）
 * @returns 唯一不冲突的 record_code
 * 2026-07-18 P3-L8：导出供路由层调用（避免重复实现）
 */
export function generateRecordCodeWithRetry(maxAttempts = 5): string {
  const db = getDatabase();
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `BY${datePrefix}`;

  // 2026-07-28 审核 H-14：首次循环先查 MAX；冲突后续重试手动递增（之前每次都重新查 MAX，非连续号场景下同一 candidate 浪费全部 5 次重试）
  const maxRow = queryToObjects<{ recordCode: string | null }>(
    db,
    `SELECT MAX(record_code) AS record_code FROM pesticide_records WHERE record_code LIKE ?`,
    [`${prefix}-%`],
  );
  let maxSeq = 0;
  const currentMax = maxRow[0]?.recordCode;
  if (currentMax && currentMax.startsWith(prefix)) {
    const seq = parseInt(currentMax.split('-').pop() || '0', 10);
    if (!isNaN(seq)) maxSeq = seq;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;

    // 候选号查重（O(1) 索引扫描）— 同样 camelCase
    const dups = queryToObjects<{ id: string }>(
      db,
      `SELECT id FROM pesticide_records WHERE record_code = ? LIMIT 1`,
      [candidate],
    );
    if (dups.length === 0) {
      return candidate;
    }
    // 已存在 — 重试时手动 +1 跳过冲突号，避免再次查同一 candidate
    maxSeq++;
  }
  throw new PesticideBusinessError(
    PesticideErrorCode.INVALID_INPUT,
    `记录编号生成冲突，已重试 ${maxAttempts} 次仍失败`,
  );
}

/**
 * 业务错误（替代字符串匹配，路由层用 code 转换为 HTTP 状态）
 */
export class PesticideBusinessError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = 'PesticideBusinessError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** 防治记录业务错误码常量 */
export const PesticideErrorCode = {
  NOT_FOUND: 'PESTICIDE_NOT_FOUND',
  INVALID_INPUT: 'PESTICIDE_INVALID_INPUT',
  FERTILIZER_SPEC_NOT_FOUND: 'FERTILIZER_SPEC_NOT_FOUND',
  INSUFFICIENT_STOCK: 'FERTILIZER_INSUFFICIENT_STOCK',
  BATCH_TOO_LARGE: 'PESTICIDE_BATCH_TOO_LARGE',
} as const;

/**
 * 单条叶面肥料的库存扣减单元（service 内部用）
 */
interface FertilizerDeduction {
  specId: string;
  fertilizerName: string;
  dosage: number;        // 用量
  fertilizerType?: string;
  brandName?: string;
  specContent?: string;
  unit?: string;
}

/**
 * 2026-07-17：从 leafFertilizerList 数组中提取出"需要扣库存"的条目
 * - 跳过 specId 为空的旧数据
 * - dosage 转 Number，无效用量视为 0（不报错，但 service 层也会校验）
 */
function extractDeductions(items: LeafFertilizerItem[]): FertilizerDeduction[] {
  const out: FertilizerDeduction[] = [];
  for (const it of items) {
    if (!it.specId || !it.specId.trim()) continue;
    // 2026-07-18 P2-M9 修复：区分 null/undefined vs 0/负数
    // - null/undefined/空字符串：跳过（视为未填写）
    // - 0 或负数：抛业务错误（用户明确输入了非法用量）
    if (it.dosage == null || it.dosage === '' || (typeof it.dosage === 'string' && !it.dosage.trim())) {
      continue;
    }
    const dosageNum = Number(it.dosage);
    if (Number.isNaN(dosageNum)) continue; // 非数字：跳过（视为未填写）
    if (dosageNum <= 0) {
      throw new PesticideBusinessError(
        PesticideErrorCode.INVALID_INPUT,
        `肥料「${it.fertilizerName || it.specId}」用量必须大于 0（当前 ${dosageNum}）`,
        400,
      );
    }
    out.push({
      specId: it.specId,
      fertilizerName: it.fertilizerName || '(未命名肥料)',
      dosage: dosageNum,
      fertilizerType: it.fertilizerType,
      brandName: it.brandName,
      specContent: it.specContent,
      unit: it.unit,
    });
  }
  return out;
}

/**
 * 按 specId 分组聚合扣减（同一规格多条用量合并）
 * - 例如：同一种肥料在 leafFertilizerList 出现 2 次，总用量 = sum
 */
function aggregateDeductions(deductions: FertilizerDeduction[]): FertilizerDeduction[] {
  const map = new Map<string, FertilizerDeduction>();
  for (const d of deductions) {
    const existing = map.get(d.specId);
    if (existing) {
      existing.dosage += d.dosage;
    } else {
      map.set(d.specId, { ...d });
    }
  }
  return Array.from(map.values());
}

/**
 * 2026-07-18 P2-M2 修复：聚合时按 spec 库存单位换算后再求和（update 路径使用）
 * - 避免不同单位混用时 raw 求和导致 delta 错算（50000g + 0kg 被误算为 50000 而不是 50kg）
 * - 不可自动换算的条目按原 dosage 计入（与 apply 路径行为一致）
 */
function aggregateDeductionsBySpecUnit(deductions: FertilizerDeduction[]): Map<string, number> {
  const { toSpecUnit } = require('../lib/unitConversions');
  const totals = new Map<string, number>();
  // 按 (specId, unit) 维度先汇总，再统一换算
  const byUnit = new Map<string, Map<string, number>>(); // specId -> unit -> sum
  for (const d of deductions) {
    if (!byUnit.has(d.specId)) byUnit.set(d.specId, new Map());
    const unitMap = byUnit.get(d.specId)!;
    const u = (d.unit || '').trim() || 'unknown';
    unitMap.set(u, (unitMap.get(u) || 0) + d.dosage);
  }
  for (const [specId, unitMap] of byUnit.entries()) {
    const spec: any = fertilizerRepository.findSpecById(specId);
    const specUnit = spec?.stockUnit || 'kg';
    let total = 0;
    for (const [unit, qty] of unitMap.entries()) {
      const conv = toSpecUnit(qty, unit, specUnit);
      if (conv && !conv.needsManualCheck) {
        total += conv.convertedQuantity;
      } else {
        // 不可换算：按原 dosage 计入（与 checkAndDecreaseStock 一致）
        total += qty;
      }
    }
    totals.set(specId, total);
  }
  return totals;
}

/**
 * 在事务内校验 + 扣减一批肥料库存
 * - 任一失败 → 抛 BusinessError，由 service 层外层 ROLLBACK
 */
function checkAndDecreaseStock(deductions: FertilizerDeduction[], now: string): void {
  for (const d of deductions) {
    const spec: any = fertilizerRepository.findSpecById(d.specId);
    if (!spec) {
      throw new PesticideBusinessError(
        PesticideErrorCode.FERTILIZER_SPEC_NOT_FOUND,
        `肥料规格不存在: ${d.specId}`,
        404,
      );
    }
    // 2026-07-17：单位换算 — 用户输入单位可能与库存单位不一致（如 1000g vs 100kg 库存）
    // 用 toSpecUnit 转换为库存单位的实际数值，再与库存比较
    const { toSpecUnit } = require('../lib/unitConversions');
    const conversion = toSpecUnit(d.dosage, d.unit, spec.stockUnit || 'kg');
    let actualDeduction: number;
    let displayUnit = spec.stockUnit || 'kg';
    let displayDeduction = d.dosage;
    let unitMismatch = false;
    if (!conversion) {
      // 输入数量 ≤ 0 或单位为空：直接用原值
      actualDeduction = d.dosage;
    } else if (conversion.needsManualCheck) {
      // 不可自动换算的单位（包/袋/株/颗 等）：跳过单位换算，按原值比较
      actualDeduction = d.dosage;
      unitMismatch = true;
    } else {
      actualDeduction = conversion.convertedQuantity;
      displayDeduction = conversion.convertedQuantity;
      unitMismatch = (d.unit || '').trim().toLowerCase() !== (spec.stockUnit || 'kg').trim().toLowerCase();
    }
    if ((spec.stockQuantity ?? 0) < actualDeduction) {
      let hint = '';
      if (conversion && conversion.needsManualCheck) {
        // 不可自动换算（包/袋/株/颗）：明确提示用户
        hint = `（您输入的 ${d.dosage}${d.unit} 无法自动换算到库存单位 ${spec.stockUnit || 'kg'}，请确认使用量）`;
      } else if (unitMismatch) {
        hint = `（您输入的 ${d.dosage}${d.unit} ≈ ${displayDeduction.toFixed(4)}${displayUnit}，库存单位是 ${spec.stockUnit || 'kg'}）`;
      }
      throw new PesticideBusinessError(
        PesticideErrorCode.INSUFFICIENT_STOCK,
        `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存不足：当前 ${spec.stockQuantity ?? 0} ${spec.stockUnit || 'kg'}，需 ${displayDeduction.toFixed(4)} ${displayUnit}${hint}`,
      );
    }
    // decreaseStock 永远扣基准单位（kg/L）的数值 — 用 actualDeduction 已经是 spec 单位的值
    // 注意：fertilizerRepository.decreaseStock 直接扣 stock_quantity 列（实际就是库存单位列），
    // 所以这里传 actualDeduction 是正确的（与库存单位一致）
    const newStock = fertilizerRepository.decreaseStock(d.specId, actualDeduction, now);
    if (newStock === null) {
      throw new PesticideBusinessError(
        PesticideErrorCode.INSUFFICIENT_STOCK,
        `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存并发不足，请重试`,
      );
    }
  }
}

/**
 * 在事务内恢复一批肥料库存（DELETE 时调）
 */
function increaseStock(deductions: FertilizerDeduction[], now: string): void {
  for (const d of deductions) {
    // 2026-07-21 修复：补单位换算（与 checkAndDecreaseStock 对称）
    const spec: any = fertilizerRepository.findSpecById(d.specId);
    if (!spec) continue;
    const { toSpecUnit } = require('../lib/unitConversions');
    const conv = toSpecUnit(d.dosage, d.unit, spec.stockUnit || 'kg');
    const actualIncrease = (conv && !conv.needsManualCheck) ? conv.convertedQuantity : d.dosage;
    fertilizerRepository.increaseStock(d.specId, actualIncrease, now);
  }
}

/**
 * 2026-07-17：Service 入口 input schema（接收前端 store denormalize 后的 snake_case body）
 * - 所有字段都是 optional（路由层已做必填校验：spray_time + crop_name）
 */
const createRecordSchema = z.object({
  recordCode: z.string().nullish(),
  sprayTime: z.string().min(1, '防治时间为必填'),
  operatorId: z.string().nullish(),
  operatorName: z.string().nullish(),
  cropName: z.string().min(1, '作物名称为必填'),
  // 2026-07-21：多作物名 JSON 数组（与 fertilizer_records 对齐）
  cropNames: z.union([z.string(), z.array(z.string())]).nullish(),
  greenhouseName: z.string().nullish(),
  plantingId: z.string().nullish(),
  plantingCode: z.string().nullish(),
  seedlingId: z.string().nullish(),
  seedlingCode: z.string().nullish(),
  pesticideId: z.string().nullish(),
  pesticideName: z.string().nullish(),
  pesticideType: z.union([z.string(), z.array(z.string())]).nullish(),
  specId: z.string().nullish(),
  specContent: z.string().nullish(),
  dosage: z.union([z.number(), z.string()]).nullish(),
  dosageUnit: z.string().nullish(),
  dilutionRatio: z.string().nullish(),
  targetPest: z.string().nullish(),
  applicationMethod: z.string().nullish(),
  bioAgentId: z.string().nullish(),
  bioAgentName: z.string().nullish(),
  bioAgentType: z.string().nullish(),
  equipmentName: z.string().nullish(),
  equipmentCount: z.union([z.number(), z.string()]).nullish(),
  pesticideList: z.string().nullish(),       // JSON 字符串
  bioAgentList: z.string().nullish(),
  equipmentList: z.string().nullish(),
  useLeafFertilizer: z.string().nullish(),
  leafFertilizerName: z.string().nullish(),
  leafFertilizerDosage: z.union([z.number(), z.string()]).nullish(),
  leafFertilizerUnit: z.string().nullish(),
  // 2026-07-18 修复：兼容 array 直接传入（不仅是 JSON 字符串），与前端 AddPestControlModal 实际行为对齐
  leafFertilizerList: z.union([z.string(), z.array(z.any())]).nullish(),
  description: z.string().nullish(),
  photos: z.union([z.string(), z.array(z.any())]).nullish(),
});

/**
 * 防治服务类
 */
export class PesticideService {
  private repository: PesticideRepository;

  constructor(repo?: PesticideRepository) {
    this.repository = repo || pesticideRepository;
  }

  /**
   * 通用条件查询（带分页）
   */
  findAll(filters: Record<string, string | undefined>, page: number, pageSize: number) {
    return this.repository.findAll(filters, page, pageSize);
  }

  /**
   * 单条查询
   */
  findById(id: string) {
    return this.repository.findById(id);
  }

  /**
   * 查询使用过某肥料的所有防治记录（用于肥料库"使用记录"tab）
   */
  findByFertilizerSpecId(specId: string, page: number, pageSize: number) {
    return this.repository.findByFertilizerSpecId(specId, page, pageSize);
  }

  /**
   * 2026-07-17：新增防治记录（含事务：扣肥料库存 → 写记录 → COMMIT）
   * @returns 完整新记录
   */
  async apply(input: Record<string, any>): Promise<PesticideRecord> {
    // 兼容 snake_case（curl 调试）和 camelCase（前端 store）
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const camel = key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
      normalized[camel] = normalized[camel] ?? value;
    }

    const parsed = createRecordSchema.safeParse(normalized);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new PesticideBusinessError(
        PesticideErrorCode.INVALID_INPUT,
        `参数错误 [${issue?.path?.join('.') || '?'}]: ${issue?.message || parsed.error.message}`,
      );
    }
    const data = parsed.data;

    // 解析 leafFertilizerList 池（兼容 string JSON / 已解析 array；兼容 snake_case + camelCase）
    const rawLeafList = (data as any).leafFertilizerList ?? (data as any).leaf_fertilizer_list;
    const leafItems = parseLeafFertilizerList(rawLeafList);
    const deductions = aggregateDeductions(extractDeductions(leafItems));

    const db = getDatabase();
    const now = nowLocalTimestamp();
    const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // 2026-07-17：生成唯一 record_code（事务外生成候选号 + UNIQUE 冲突重试）
    const recordCode = data.recordCode || generateRecordCodeWithRetry();

    // 处理 pesticide_type：数组 → JSON 字符串
    let pesticideTypeValue: string | null = null;
    if (Array.isArray(data.pesticideType) && data.pesticideType.length > 0) {
      pesticideTypeValue = JSON.stringify(data.pesticideType);
    } else if (typeof data.pesticideType === 'string' && data.pesticideType.trim()) {
      pesticideTypeValue = data.pesticideType.trim().startsWith('[')
        ? data.pesticideType
        : JSON.stringify([data.pesticideType]);
    }

    // 规范化 JSON 池字段
    const stringifyJsonField = (val: unknown): string | null => {
      if (val == null) return null;
      if (typeof val === 'string') return val.trim() || null;
      try { return JSON.stringify(val); } catch { return null; }
    };

    db.exec('BEGIN');
    try {
      // 1) 校验 + 扣减肥料库存（事务核心）
      if (deductions.length > 0) {
        checkAndDecreaseStock(deductions, now);
      }

      // 2) INSERT 防治记录（含 UNIQUE 重试：防并发同名 record_code 冲突）
      // 注意：库存扣减已完成，所以重试时不能再扣库存（已 ROLLBACK 后重新跑）
      let insertedRecord: PesticideRecord | null = null;
      let currentRecordCode = recordCode;
      for (let attempt = 0; attempt < 5 && !insertedRecord; attempt++) {
        const record: PesticideRecord = {
          id,
          record_code: currentRecordCode,
          spray_time: data.sprayTime,
          operator_id: data.operatorId ?? null,
          operator_name: data.operatorName ?? null,
          crop_name: data.cropName,
          // 2026-07-21：多作物 JSON 数组（前端 AddPestControlModal 已放宽同次多选限制）
          crop_names: stringifyJsonField((data as any).cropNames) ?? (data.cropName ? JSON.stringify([data.cropName]) : null),
          greenhouse_name: data.greenhouseName ?? null,
          planting_id: data.plantingId ?? null,
          planting_code: data.plantingCode ?? null,
          seedling_id: data.seedlingId ?? null,
          seedling_code: data.seedlingCode ?? null,
          pesticide_id: data.pesticideId ?? null,
          pesticide_name: data.pesticideName ?? null,
          pesticide_type: pesticideTypeValue,
          spec_id: data.specId ?? null,
          spec_content: data.specContent ?? null,
          dosage: data.dosage != null ? Number(data.dosage) : null,
          dosage_unit: data.dosageUnit ?? null,
          dilution_ratio: data.dilutionRatio ?? null,
          target_pest: data.targetPest ?? null,
          application_method: data.applicationMethod ?? null,
          bio_agent_id: data.bioAgentId ?? null,
          bio_agent_name: data.bioAgentName ?? null,
          bio_agent_type: data.bioAgentType ?? null,
          equipment_name: data.equipmentName ?? null,
          equipment_count: data.equipmentCount != null ? Number(data.equipmentCount) : null,
          pesticide_list: stringifyJsonField(data.pesticideList),
          bio_agent_list: stringifyJsonField(data.bioAgentList),
          equipment_list: stringifyJsonField(data.equipmentList),
          use_leaf_fertilizer: leafItems.length > 0 ? 'yes' : 'no',  // 2026-07-18 P3-L9：统一规则（不受前端传值影响）
          leaf_fertilizer_name: data.leafFertilizerName ?? leafItems[0]?.fertilizerName ?? null,
          leaf_fertilizer_dosage: data.leafFertilizerDosage != null
            ? Number(data.leafFertilizerDosage)
            : (leafItems[0]?.dosage != null ? Number(leafItems[0].dosage) : null),
          leaf_fertilizer_unit: data.leafFertilizerUnit ?? leafItems[0]?.unit ?? null,
          leaf_fertilizer_list: stringifyJsonField(rawLeafList),
          description: data.description ?? null,
          photos: stringifyJsonField(data.photos),
          create_time: now,
          update_time: now,
        };
        try {
          this.repository.insert(record);
          insertedRecord = record;
        } catch (e: any) {
          const msg = String(e?.message || '');
          if (msg.includes('UNIQUE constraint failed') && attempt < 4) {
            // 并发写同 code — 重新生成下一个候选号再 INSERT
            // 重要：库存已经在事务里扣减了，不要在这里增加新扣减！
            // 这里只是换 recordCode 后重试 INSERT。
            const seq = parseInt((currentRecordCode.split('-').pop() || '1'), 10);
            currentRecordCode = `${currentRecordCode.replace(/-\d{4,}$/, '')}-${String(seq + 1).padStart(4, '0')}`;
            continue;
          }
          throw e;
        }
      }
      if (!insertedRecord) {
        throw new PesticideBusinessError(
          PesticideErrorCode.INVALID_INPUT,
          `记录编号生成冲突，已重试 5 次仍失败`,
        );
      }

      db.exec('COMMIT');
      this.repository.save();
      // 2026-07-18 修复：route 层 parseJsonFieldsOnRead 期望 camelCase keys（leafFertilizerList 等）
      // 直接基于 insertedRecord 做 snake→camel 转换，避免 findById 跨事务未提交的 race
      return normalizePesticideRecordKeys(insertedRecord) as unknown as PesticideRecord;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        console.error('[pesticide.service] ROLLBACK 失败:', rbErr);
        console.error('[pesticide.service] 原错误:', err);
      }
      throw err;
    }
  }

  /**
   * 2026-07-17：更新防治记录（diff 库存调整）
   * - 旧记录有 specId 库存 + 新记录 specId 差异 = delta 调整
   */
  async update(id: string, updates: Record<string, any>): Promise<PesticideRecord | null> {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new PesticideBusinessError(PesticideErrorCode.NOT_FOUND, '防治记录不存在', 404);
    }

    // 解析旧/新 leafFertilizerList（queryToObjects 已转 camelCase）
    const existingRow = existing as unknown as Record<string, any>;
    const oldItems = parseLeafFertilizerList(existingRow.leafFertilizerList);
    const oldDeductions = aggregateDeductions(extractDeductions(oldItems));

    // 兼容 snake_case / camelCase
    const newRaw = updates.leafFertilizerList ?? updates.leaf_fertilizer_list;
    // 2026-07-18 P1-H4 修复：传入 repo 前对 leafFertilizerList 做 JSON 序列化（防止对象入 DB 变成 [object Object]）
    if (newRaw !== undefined) {
      if (typeof newRaw === 'string') {
        updates.leafFertilizerList = newRaw;
      } else if (Array.isArray(newRaw)) {
        updates.leafFertilizerList = JSON.stringify(newRaw);
      } else if (newRaw === null) {
        updates.leafFertilizerList = null;
      } else {
        updates.leafFertilizerList = JSON.stringify(newRaw);
      }
    }
    const newItems = newRaw !== undefined ? parseLeafFertilizerList(updates.leafFertilizerList ?? newRaw) : oldItems;
    const newDeductions = aggregateDeductions(extractDeductions(newItems));

    // 2026-07-18 P2-M2 修复：update 路径按 spec 库存单位换算后再求差值（避免 50000g - 0kg 误算）
    const oldMap = aggregateDeductionsBySpecUnit(oldDeductions);
    const newMap = aggregateDeductionsBySpecUnit(newDeductions);

    const db = getDatabase();
    const now = nowLocalTimestamp();

    db.exec('BEGIN');
    try {
      // 对每个 specId 计算 delta
      const allSpecIds = new Set([...oldMap.keys(), ...newMap.keys()]);
      for (const specId of allSpecIds) {
        const oldQty = oldMap.get(specId) ?? 0;
        const newQty = newMap.get(specId) ?? 0;
        const delta = newQty - oldQty;
        if (delta === 0) continue;

        if (delta > 0) {
          // 用量增加 → 校验 + 扣减
          const spec = fertilizerRepository.findSpecById(specId);
          if (!spec) {
            throw new PesticideBusinessError(
              PesticideErrorCode.FERTILIZER_SPEC_NOT_FOUND,
              `肥料规格不存在: ${specId}`,
              404,
            );
          }
          if ((spec.stockQuantity ?? 0) < delta) {
            throw new PesticideBusinessError(
              PesticideErrorCode.INSUFFICIENT_STOCK,
              `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存不足：当前 ${spec.stockQuantity ?? 0}，需追加 ${delta}`,
            );
          }
          const newStock = fertilizerRepository.decreaseStock(specId, delta, now);
          if (newStock === null) {
            throw new PesticideBusinessError(
              PesticideErrorCode.INSUFFICIENT_STOCK,
              `${spec.fertilizerName}${spec.brandName ? '（' + spec.brandName + '）' : ''} 库存并发不足，请重试`,
            );
          }
        } else if (delta < 0) {
          // 用量减少或删除 → 回补库存
          fertilizerRepository.increaseStock(specId, -delta, now);
        }
      }

      // 同步顶层兼容字段（取新池首条）
      if (newRaw !== undefined) {
        if (newDeductions.length > 0) {
          const first = newDeductions[0];
          updates.leafFertilizerName = first.fertilizerName;
          updates.leafFertilizerDosage = first.dosage;
          // unit 不在 deductions 里，从原始 items 取
          const firstItem = newItems.find((x) => x.specId === first.specId);
          updates.leafFertilizerUnit = firstItem?.unit ?? null;
        } else if (newItems.length > 0) {
          // 池存在但无 specId（旧数据兼容）
          const firstItem = newItems[0];
          updates.leafFertilizerName = firstItem.fertilizerName ?? null;
          updates.leafFertilizerDosage = firstItem.dosage != null ? Number(firstItem.dosage) : null;
          updates.leafFertilizerUnit = firstItem.unit ?? null;
        } else {
          updates.leafFertilizerName = null;
          updates.leafFertilizerDosage = null;
          updates.leafFertilizerUnit = null;
        }
      }

      updates.update_time = now;
      this.repository.update(id, updates);

      db.exec('COMMIT');
      this.repository.save();
      return this.repository.findById(id);
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        console.error('[pesticide.service] ROLLBACK 失败:', rbErr);
        console.error('[pesticide.service] 原错误:', err);
      }
      throw err;
    }
  }

  /**
   * 2026-07-17：删除单条防治记录（恢复库存 → 删记录）
   * 2026-07-18 P0-C3 修复：同步路径（source_type='daily_record_sync'）也恢复药剂库存
   */
  async remove(id: string): Promise<{ id: string }> {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new PesticideBusinessError(PesticideErrorCode.NOT_FOUND, '防治记录不存在', 404);
    }

    const items = parseLeafFertilizerList((existing as unknown as Record<string, any>).leafFertilizerList);
    const deductions = aggregateDeductions(extractDeductions(items));

    // 2026-07-18 P0-C3：检测同步创建的记录，恢复药剂库存
    const sourceType = (existing as unknown as Record<string, any>).sourceType;
    const sourceDailyRecordId = (existing as unknown as Record<string, any>).sourceDailyRecordId;
    const pesticideRestores: Array<{ code: string; qty: number }> = [];
    if (sourceType === 'daily_record_sync' && sourceDailyRecordId) {
      const oldRows = getOldPesticideSync(getDatabase(), sourceDailyRecordId);
      for (const r of oldRows) {
        if (r.code && r.qty > 0) pesticideRestores.push(r);
      }
    }

    const db = getDatabase();
    const now = nowLocalTimestamp();

    db.exec('BEGIN');
    try {
      if (deductions.length > 0) {
        increaseStock(deductions, now);
      }
      // 2026-07-18 P0-C3：恢复同步路径扣减的药剂库存
      for (const r of pesticideRestores) {
        adjustPesticideStock(db, r.code, r.qty);
      }
      this.repository.deleteById(id);
      db.exec('COMMIT');
      this.repository.save();
      return { id };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        console.error('[pesticide.service] ROLLBACK 失败:', rbErr);
        console.error('[pesticide.service] 原错误:', err);
      }
      throw err;
    }
  }

  /**
   * 2026-07-18 P2-H12 修复：从每日记录同步创建防治记录的 service 入口
   * - 把 syncDailyRecords.syncPesticideRecords 的 INSERT + 库存扣减逻辑封装到 service 层
   * - 让 service 层成为唯一库存管理点（与手动 apply() 路径对称）
   *
   * @param params 同步记录的所有字段（含 sourceType='daily_record_sync'）
   * @returns 新建记录的 id
   */
  async applySyncRecord(params: {
    id: string;
    recordCode: string;
    sprayTime: string;
    plantingId?: string | null;
    plantingCode?: string | null;
    seedlingId?: string | null;
    seedlingCode?: string | null;
    greenhouseName: string;
    cropName: string;
    pesticideName: string;
    pesticideType: string | null;
    dilutionRatio: string;
    totalDosage: number;
    dosageUnit: string;
    targetPest: string;
    applicationMethod: string;
    operatorId?: string | null;
    operatorName?: string | null;
    description: string;
    sourceType: 'daily_record_sync' | 'manual';
    sourceDailyRecordId: string;
    sourceItemId: string;
    realPesticideCode: string | null;
    pesticideListJson: string;
    bioAgentListJson: string;
    equipmentListJson: string;
    leafFertilizerListJson: string;
    areaId?: string | null;
    areaName?: string | null;
    // 2026-07-21：多作物名 JSON（与 fertilizer_records 对齐）
    cropNames?: string | null;
    // 库存扣减（同步路径用 adjustPesticideStock，独立于肥料 apply 路径）
    pesticideStockDeductions: Array<{ code: string; qty: number }>;
  }): Promise<{ id: string }> {
    const db = getDatabase();
    const now = nowLocalTimestamp();

    db.exec('BEGIN');
    try {
      // 扣减药剂库存
      for (const d of params.pesticideStockDeductions) {
        if (d.code && d.qty > 0) {
          adjustPesticideStock(db, d.code, -d.qty);
        }
      }
      // INSERT
      db.run(
        `INSERT INTO pesticide_records (
          id, record_code, spray_time,
          planting_id, planting_code, seedling_id, seedling_code,
          greenhouse_name, crop_name, crop_names,
          pesticide_name, pesticide_type, dilution_ratio,
          dosage, dosage_unit, target_pest, application_method,
          operator_id, operator_name,
          description, source_type,
          source_daily_record_id, source_item_id,
          real_pesticide_code, pesticide_list,
          bio_agent_list, equipment_list, leaf_fertilizer_list,
          area_id, area_name,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          params.id, params.recordCode, params.sprayTime,
          params.plantingId ?? null, params.plantingCode ?? null,
          params.seedlingId ?? null, params.seedlingCode ?? null,
          params.greenhouseName, params.cropName, params.cropNames ?? null,
          params.pesticideName, params.pesticideType, params.dilutionRatio,
          params.totalDosage, params.dosageUnit, params.targetPest, params.applicationMethod,
          params.operatorId ?? null, params.operatorName ?? null,
          params.description, params.sourceType,
          params.sourceDailyRecordId, params.sourceItemId,
          params.realPesticideCode, params.pesticideListJson,
          params.bioAgentListJson, params.equipmentListJson, params.leafFertilizerListJson,
          params.areaId ?? null, params.areaName ?? null,
          now,  // create_time
          now,  // 2026-07-21 修复：补齐 update_time
        ],
      );
      db.exec('COMMIT');
      this.repository.save();
      return { id: params.id };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        console.error('[pesticide.service] applySyncRecord ROLLBACK 失败:', rbErr);
        console.error('[pesticide.service] 原错误:', err);
      }
      throw err;
    }
  }
  /**
   * 2026-07-21 修复：批量删除改为单事务原子操作（与 fertilizer.service.removeBatch 一致）
   * 旧逻辑：循环调 remove()，每条独立 BEGIN/COMMIT → 部分失败时前 N 条已提交不可回滚
   * 新逻辑：单事务 BEGIN → N 条恢复库存+删除 → COMMIT → 任一失败则 ROLLBACK 全部
   */
  async removeBatch(ids: string[]): Promise<{ deleted: number; skipped: number }> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new PesticideBusinessError(PesticideErrorCode.INVALID_INPUT, '请提供要删除的记录ID数组');
    }
    if (ids.length > 500) {
      throw new PesticideBusinessError(
        PesticideErrorCode.BATCH_TOO_LARGE,
        `批量删除单次最多 500 条，当前 ${ids.length} 条`,
      );
    }
    const db = getDatabase();
    const now = nowLocalTimestamp();
    let deleted = 0;
    let skipped = 0;

    db.exec('BEGIN');
    try {
      for (const id of ids) {
        const existing = this.repository.findById(id);
        if (!existing) {
          skipped++;
          continue;
        }
        // 恢复肥料库存
        const items = parseLeafFertilizerList((existing as unknown as Record<string, any>).leafFertilizerList);
        const deductions = aggregateDeductions(extractDeductions(items));
        if (deductions.length > 0) {
          increaseStock(deductions, now);
        }
        // 恢复同步路径扣减的药剂库存
        const sourceType = (existing as unknown as Record<string, any>).sourceType;
        const sourceDailyRecordId = (existing as unknown as Record<string, any>).sourceDailyRecordId;
        if (sourceType === 'daily_record_sync' && sourceDailyRecordId) {
          const oldRows = getOldPesticideSync(db, sourceDailyRecordId);
          for (const r of oldRows) {
            if (r.code && r.qty > 0) adjustPesticideStock(db, r.code, r.qty);
          }
        }
        this.repository.deleteById(id);
        deleted++;
      }
      db.exec('COMMIT');
      this.repository.save();
      return { deleted, skipped };
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch (rbErr) {
        console.error('[pesticide.service] removeBatch ROLLBACK 失败:', rbErr);
        console.error('[pesticide.service] 原错误:', err);
      }
      throw err;
    }
  }

  /**
   * 2026-07-17：防治记录 → 肥料池统计聚合
   * - 按 group_by 维度聚合 leafFertilizerList JSON 池
   * - 关键 SQL：json_each 展开池，按维度 GROUP BY
   *
   * @param groupBy 支持: month / crop_name / greenhouse_name / fertilizer_type / fertilizer_name
   * @param filters 时间 + 作物 + 区域过滤
   * @returns [{ label, record_count, total_dosage, total_cost, use_count }]
   */
  findFertilizerStats(
    groupBy: string,
    filters: { startDate?: string; endDate?: string; cropName?: string; greenhouseName?: string } = {},
  ): any[] {
    const db = getDatabase();

    // 维度 → SQL 表达式（注意：queryToObjects 已转 camelCase，所以读取时需用 camelCase 字段名）
    const GROUP_WHITELIST: Record<string, { expr: string; alias: string }> = {
      month: { expr: "strftime('%Y-%m', spray_time)", alias: 'month' },
      crop_name: { expr: 'crop_name', alias: 'cropName' },
      greenhouse_name: { expr: 'greenhouse_name', alias: 'greenhouseName' },
      fertilizer_type: {
        expr: "COALESCE(json_extract(json_each.value, '$.fertilizerType'), 'unknown')",
        alias: 'fertilizerType',
      },
      fertilizer_name: {
        expr: "COALESCE(json_extract(json_each.value, '$.fertilizerName'), 'unknown')",
        alias: 'fertilizerName',
      },
    };

    const group = GROUP_WHITELIST[groupBy];
    if (!group) {
      throw new PesticideBusinessError(
        PesticideErrorCode.INVALID_INPUT,
        `不支持的 group_by 维度: ${groupBy}。支持: ${Object.keys(GROUP_WHITELIST).join(', ')}`,
      );
    }

    // WHERE 条件（只能用于主表字段，不能用于池内 JSON 字段）
    const wheres: string[] = [];
    const params: any[] = [];
    if (filters.startDate) { wheres.push('pesticide_records.spray_time >= ?'); params.push(filters.startDate); }
    if (filters.endDate) { wheres.push('pesticide_records.spray_time <= ?'); params.push(`${filters.endDate} 23:59:59`); }
    if (filters.cropName) { wheres.push('pesticide_records.crop_name = ?'); params.push(filters.cropName); }
    if (filters.greenhouseName) { wheres.push('pesticide_records.greenhouse_name = ?'); params.push(filters.greenhouseName); }

    const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';

    // 关键 SQL：json_each 展开 leaf_fertilizer_list 池，按 group_by 聚合
    // - total_dosage = SUM(dosage 数值)
    // - total_cost = SUM(dosage * unitPrice)
    // - use_count = COUNT(DISTINCT 防治记录数)
    const sql = `
      SELECT
        ${group.expr} AS label,
        COUNT(DISTINCT pesticide_records.id) AS record_count,
        SUM(CAST(COALESCE(json_extract(json_each.value, '$.dosage'), '0') AS REAL)) AS total_dosage,
        SUM(
          CAST(COALESCE(json_extract(json_each.value, '$.dosage'), '0') AS REAL) *
          CAST(COALESCE(json_extract(json_each.value, '$.unitPrice'), '0') AS REAL)
        ) AS total_cost
      FROM pesticide_records, json_each(pesticide_records.leaf_fertilizer_list)
      ${whereSql}
      GROUP BY label
      ORDER BY total_cost DESC, record_count DESC
      LIMIT 200
    `;
    return queryToObjects(db, sql, params);
  }

  /**
   * 2026-07-17：单条肥料反向追溯 — 跨两个数据源
   * 1. 防治记录 leaf_fertilizer_list 池（叶面肥联用）
   * 2. 施肥记录 fertilization_pool 池（主施肥流程）
   * 两个数据源 UNION ALL 后按时间倒序，每条记录包含 source 标识。
   *
   * @returns [{ source, recordCode, cropName, greenhouseName, operatorName, sprayTime, totalDosage, totalCost }]
   */
  findUsageByFertilizerSpec(
    specId: string,
    filters: { startDate?: string; endDate?: string } = {},
  ): any[] {
    const db = getDatabase();
    const dateConditions: string[] = [];
    const dateParams: any[] = [];
    if (filters.startDate) {
      dateConditions.push('time_col >= ?');
      dateParams.push(filters.startDate);
    }
    if (filters.endDate) {
      dateConditions.push('time_col <= ?');
      dateParams.push(`${filters.endDate} 23:59:59`);
    }
    // 两个 UNION 分支共用日期条件占位（time_col 是子查询中的别名）
    const dateFilter = dateConditions.length > 0
      ? 'AND ' + dateConditions.map((c) => c.replace('time_col', 'spray_time')).join(' AND ')
      : '';

    const sql = `
      SELECT * FROM (
        -- 分支 1：防治记录 → 肥料联用
        -- 2026-07-18 P1-H6 修复：兼容 $.fertilizerSpecId（旧字段名），与分支 2 规则对齐
        SELECT
          'pest_control' AS source,
          pesticide_records.id AS recordId,
          pesticide_records.record_code AS recordCode,
          pesticide_records.crop_name AS cropName,
          pesticide_records.greenhouse_name AS greenhouseName,
          pesticide_records.operator_name AS operatorName,
          pesticide_records.spray_time AS sprayTime,
          SUM(CAST(COALESCE(json_extract(j1.value, '$.dosage'), '0') AS REAL)) AS totalDosage,
          SUM(
            CAST(COALESCE(json_extract(j1.value, '$.dosage'), '0') AS REAL) *
            CAST(COALESCE(json_extract(j1.value, '$.unitPrice'), '0') AS REAL)
          ) AS totalCost
        FROM pesticide_records, json_each(pesticide_records.leaf_fertilizer_list) AS j1
        WHERE COALESCE(
          NULLIF(json_extract(j1.value, '$.fertilizerSpecId'), ''),
          json_extract(j1.value, '$.specId'),
          ''
        ) = ?
        GROUP BY pesticide_records.id

        UNION ALL

        -- 分支 2：施肥记录 → 肥料池
        -- 注意：池 JSON 里 specId 字段命名有两套：
        --   - 新版（FertilizerPoolEditor）：$.specId
        --   - 旧版（手动录入历史数据）：$.fertilizerSpecId
        -- 用 COALESCE 兼容两种，并排除空字符串
        SELECT
          'fertilization' AS source,
          fertilizer_records.id AS recordId,
          fertilizer_records.fertilizer_code AS recordCode,
          fertilizer_records.crop_name AS cropName,
          fertilizer_records.greenhouse_name AS greenhouseName,
          fertilizer_records.operator_name AS operatorName,
          fertilizer_records.fertilize_time AS sprayTime,
          SUM(CAST(COALESCE(json_extract(j2.value, '$.quantity'), '0') AS REAL)) AS totalDosage,
          SUM(
            CAST(COALESCE(json_extract(j2.value, '$.quantity'), '0') AS REAL) *
            CAST(COALESCE(json_extract(j2.value, '$.unitPrice'), '0') AS REAL)
          ) AS totalCost
        FROM fertilizer_records, json_each(fertilizer_records.fertilization_pool) AS j2
        WHERE COALESCE(
              NULLIF(json_extract(j2.value, '$.fertilizerSpecId'), ''),
              json_extract(j2.value, '$.specId'),
              ''
            ) = ?
        GROUP BY fertilizer_records.id
      )
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      ORDER BY substr(sprayTime, 1, 19) DESC
      LIMIT 200
    `;
    // 参数顺序：[specId(分支1), specId(分支2), ...dateParams]
    return queryToObjects(db, sql, [specId, specId, ...dateParams]);
  }
}

export const pesticideService = new PesticideService();