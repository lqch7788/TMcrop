/**
 * 种源业务逻辑层 (Service)
 * 负责业务逻辑处理和数据转换
 */

import { z } from 'zod';
import { seedSourceRepository, SeedSourceRepository } from '../repositories/seedSource.repository';
import { getDatabase } from '../db';
import {
  SeedSourceQuery,
  CreateSeedSourceDTO,
  UpdateSeedSourceDTO,
  CreatePropagationRecordDTO,
  UpdatePropagationStageDTO,
  CompletePropagationDTO,
} from '../types/seedSource';
import {
  PROPAGATION_STAGES,
  PROPAGATION_NEXT_STAGES,
  PropagationStage,
} from '../types/propagation';

/**
 * 2026-06-06: 业务错误码（L4 — 替代 msg.startsWith 文本匹配）
 * Controller 用 `instanceof BusinessError` + `code` 匹配，避开文案漂移
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

/** 错误码常量（前端用此码展示对应文案） */
export const SeedSourceErrorCode = {
  NOT_FOUND: 'SEED_SOURCE_NOT_FOUND',
  INVALID_DECREASE_COUNT: 'SEED_SOURCE_INVALID_DECREASE_COUNT',
  INSUFFICIENT_AVAILABLE: 'SEED_SOURCE_INSUFFICIENT_AVAILABLE',
  FAILED_STATUS: 'SEED_SOURCE_FAILED_STATUS',
  BATCH_TOO_LARGE: 'SEED_SOURCE_BATCH_TOO_LARGE',
} as const;

/**
 * 扣减可用数量入参 schema（C10/H4：用 zod 校验替代 as any + 整数防御）
 */
const decreaseAvailableSchema = z.object({
  count: z
    .number({ error: 'count 必须为数字' })
    .int('count 必须为整数')
    .positive('count 必须为正数')
    .max(1e7, 'count 单次最多 10000000'),
});

/** 推进阶段入参 schema（C6：阶段枚举强约束） */
const updatePropagationStageSchema = z.object({
  new_stage: z.enum(PROPAGATION_STAGES, {
    error: `new_stage 必须是 ${PROPAGATION_STAGES.join('/')} 之一`,
  }),
  operator: z.string().optional(),
});

/** 完成入库入参 schema（C7：quantity 必须为正整数） */
const completePropagationSchema = z.object({
  quantity: z
    .number({ error: 'quantity 必须为数字' })
    .int('quantity 必须为整数')
    .positive('quantity 必须为正数')
    .max(1e7, 'quantity 单次最多 10000000'),
  operator: z.string().optional(),
});

/**
 * 种源服务类
 * 提供种源相关业务逻辑
 */
export class SeedSourceService {
  private repository: SeedSourceRepository;

  constructor(repo?: SeedSourceRepository) {
    this.repository = repo || seedSourceRepository;
  }

  /**
   * 获取种源列表
   * @param query 查询条件
   * @returns 种源列表和分页信息
   */
  async getAll(query: SeedSourceQuery) {
    const { data, total } = await this.repository.findAll(query);
    return {
      data,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 50
      }
    };
  }

  /**
   * 获取种源详情
   * @param id 种源ID
   * @returns 种源详情
   * @throws 错误如果记录不存在
   */
  async getById(id: string) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new Error('种源记录不存在');
    }
    return item;
  }

  /**
   * 创建种源
   * P1 #4 修复: 返回完整记录而非仅 id（违反 CLAUDE.md 铁律）
   * @param data 创建数据
   * @returns 完整创建结果
   */
  async create(data: CreateSeedSourceDTO) {
    // 2026-06-15: 防止前端调试时塞入非法 id（含字母随机串如 SS1779322704298wou5as79w）
    // 强制走"纯数字 SS"格式，否则忽略 data.id 由 generateCode 接管
    const incomingId = typeof data.id === 'string' && /^SS\d+$/.test(data.id) ? data.id : null;
    const newId = incomingId || `SS${Date.now()}`;

    // 2026-06-26: 兼容两种字段名（camelCase / snake_case）
    // 之前用 if (sourceCode) 会让空字符串绕过查重，导致空 source_code 入库
    const finalSourceCode = ((data as any).source_code || (data as any).sourceCode || '').trim();

    // 设置默认值
    // 2026-06-04: status 字段已废弃，改为前端实时计算，后端不再设默认值
    const record = {
      ...data,
      id: newId,
      // 2026-06-26: 显式设置 source_code，避免 spread 不命中或 camelCase 未转换时漏字段
      source_code: finalSourceCode,
      source_origin: data.source_origin || 'external_purchase',
      remaining_quantity: data.remaining_quantity || data.quantity || 0,
      used_quantity: data.used_quantity || 0,
      quantity: data.quantity || 0
    };

    // 2026-06-26: sourceCode 必须非空 — 允许空白字符（trim 后空也拒绝）
    if (!finalSourceCode) {
      throw new BusinessError(
        SeedSourceErrorCode.INVALID_DECREASE_COUNT,
        '种源批号（source_code）不能为空，请先生成或填写',
      );
    }

    // 2026-06-22 修复 8 处查重：POST 前查重 source_code（仅 active，软删可复用）
    const db = getDatabase();
    const dupStmt = db.prepare(`
      SELECT 1 FROM seed_sources WHERE source_code = ? AND deleted_at IS NULL LIMIT 1
    `);
    dupStmt.bind([finalSourceCode]);
    if (dupStmt.step()) {
      dupStmt.free();
      throw new BusinessError(
        SeedSourceErrorCode.INVALID_DECREASE_COUNT,
        `编号 ${finalSourceCode} 已存在`,
      );
    }
    dupStmt.free();

    // 返回 repository.create 的完整记录（含 create_time/update_time）
    return await this.repository.create(record);
  }

  /**
   * 检查种源批号是否已存在（用于前端实时查重）
   * 2026-06-26: 三层防重的第一层 — 前端用，POST 前先调
   * @param sourceCode 种源批号
   * @param excludeId 排除自身（用于编辑时排除自己的记录）
   * @returns 是否已存在（true=已存在，不可使用）
   */
  async checkSourceCodeExists(sourceCode: string, excludeId?: string): Promise<boolean> {
    const code = (sourceCode || '').trim();
    if (!code) return false;  // 空值不算"已存在"，由 create 那边拒绝空值
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id FROM seed_sources
      WHERE source_code = ? AND deleted_at IS NULL AND id <> ?
      LIMIT 1
    `);
    stmt.bind([code, excludeId || '']);
    const exists = stmt.step();
    stmt.free();
    return exists;
  }

  /**
   * 更新种源
   * P1 #4 修复: 返回更新后的完整记录
   * @param id 种源ID
   * @param data 更新数据
   * @returns 更新后的完整记录
   */
  async update(id: string, data: UpdateSeedSourceDTO) {
    // 检查记录是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    await this.repository.update(id, data);
    // 返回 findById 查到的最新完整记录
    return await this.repository.findById(id);
  }

  /**
   * 删除种源
   * @param id 种源ID
   */
  async delete(id: string) {
    if (!id) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
    }
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
    }
    await this.repository.delete(id);
    return { id };
  }

  /**
   * 扣减可用数量（用于育苗新增等场景）
   * DB 列：remaining_quantity（API 字段：availableCount）
   * C10/H4/L3：zod 校验 + 整数防御 + 拒绝 FAILED 状态
   * @param id 种源ID
   * @param count 扣减数量（正整数）
   * @returns 更新后的完整记录
   */
  async decreaseAvailable(id: string, count: number) {
    // C10/H4: 用 zod 校验 + 整数防御
    const parsed = decreaseAvailableSchema.safeParse({ count });
    if (!parsed.success) {
      throw new BusinessError(
        SeedSourceErrorCode.INVALID_DECREASE_COUNT,
        `参数错误: ${parsed.error.issues[0]?.message || parsed.error.message}`,
      );
    }
    const safeCount = parsed.data.count;

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
    }

    // L3: 拒绝 FAILED 状态扣减
    if (existing.propagationStatus === 'failed') {
      throw new BusinessError(SeedSourceErrorCode.FAILED_STATUS, '种源已标记为失败，不允许扣减');
    }

    const current = existing.remaining_quantity ?? 0;
    if (current < safeCount) {
      throw new BusinessError(
        SeedSourceErrorCode.INSUFFICIENT_AVAILABLE,
        `可用数量不足：当前 ${current}，需扣减 ${safeCount}`,
      );
    }
    const newAvailable = current - safeCount;
    await this.repository.update(id, { remaining_quantity: newAvailable });
    return await this.repository.findById(id);
  }

  /**
   * 批量删除种源
   * H8：限制单次最多 100 条
   * @param ids 种源ID数组
   * @returns 删除结果
   */
  async deleteBatch(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '缺少 ids 参数');
    }
    if (ids.length > 100) {
      throw new BusinessError(
        SeedSourceErrorCode.BATCH_TOO_LARGE,
        `批量删除单次最多 100 条，当前 ${ids.length} 条`,
      );
    }

    const deletedCount = await this.repository.deleteBatch(ids);
    return { deletedCount };
  }

  /**
   * 生成种源编码
   * @param dateStr 日期字符串 (YYYYMMDD)
   * @returns 生成的编码，如 ZZ20260513-001；重试耗尽时返回 null
   *
   * 2026-06-22 修复 8 处查重：
   * - getTodayMaxSerial 已过滤 deleted_at IS NULL（仅 active）
   * - 候选号若与全表（含 soft-deleted）冲突则 +1 重试
   * - 最多 10 次重试
   */
  async generateCode(dateStr: string): Promise<string | null> {
    const db = getDatabase();
    const MAX_RETRIES = 100;  // 2026-06-24: 提到 100，支持大批量调拨（如 50 条）

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // 获取当日最大序号（仅 active）
      const maxSerial = await this.repository.getTodayMaxSerial(dateStr);
      const nextSerial = maxSerial + 1 + attempt;
      // 格式: ZZ + 日期(8位) + "-" + 流水号(3位)
      const candidate = `ZZ${dateStr}-${nextSerial.toString().padStart(3, '0')}`;

      // 2026-06-24 修复: 加 deleted_at IS NULL 过滤，避免软删 code 被视为占用
      // 之前没过滤，导致之前测试失败的 002/003/004（软删）占用了新序号空间
      const stmt = db.prepare(`
        SELECT 1 FROM seed_sources WHERE source_code = ? AND deleted_at IS NULL LIMIT 1
      `);
      stmt.bind([candidate]);
      const exists = stmt.step();
      stmt.free();

      if (!exists) {
        return candidate;
      }
    }

    // 重试耗尽
    return null;
  }

  // ========== 繁殖过程记录业务逻辑 ==========

  /**
   * 添加繁殖过程记录
   */
  async addPropagationRecord(seedSourceId: string, data: CreatePropagationRecordDTO) {
    const existing = await this.repository.findById(seedSourceId);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    const record = { ...data, seed_source_id: seedSourceId };
    return this.repository.addPropagationRecord(record);
  }

  /**
   * 获取繁殖过程记录列表
   */
  async getPropagationRecords(seedSourceId: string) {
    return this.repository.getPropagationRecords(seedSourceId);
  }

  /**
   * 更新繁殖过程记录
   * 2026-06-13: 与育苗每日记录对齐，操作列支持内联编辑
   * 入参约定：snake_case 字段名（与 addPropagationRecord / 前端 PUT body 一致）
   * 校验：种源存在 + 记录归属该种源
   */
  async updatePropagationRecord(seedSourceId: string, recordId: string, data: Record<string, any>) {
    const existing = await this.repository.findById(seedSourceId);
    if (!existing) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
    }

    // 校验记录归属：通过查列表 + 匹配 id 来判断（避免新增 repository 方法）
    const records = await this.repository.getPropagationRecords(seedSourceId);
    const target = records.find((r: any) => r.id === recordId);
    if (!target) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '繁殖过程记录不存在', 404);
    }

    // 入参已为 snake_case（与 addPropagationRecord 一致），直接传递给 repository
    return this.repository.updatePropagationRecord(recordId, data);
  }

  /**
   * 删除繁殖过程记录
   * 2026-06-13: 与育苗每日记录对齐，操作列支持删除
   */
  async deletePropagationRecord(seedSourceId: string, recordId: string) {
    const existing = await this.repository.findById(seedSourceId);
    if (!existing) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
    }

    const records = await this.repository.getPropagationRecords(seedSourceId);
    const target = records.find((r: any) => r.id === recordId);
    if (!target) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '繁殖过程记录不存在', 404);
    }

    await this.repository.deletePropagationRecord(recordId);
    return { id: recordId };
  }

  /**
   * 全量查询繁殖过程记录（JOIN seed_sources）
   * 用于"繁殖过程记录"全量查看页
   */
  async getAllPropagationRecords(filters: {
    seedSourceId?: string;
    stage?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repository.findAllPropagationRecords(filters);
  }

  /**
   * 推进繁殖阶段
   * C6：枚举强约束 + 禁止跳跃/倒回
   * M6：允许从 planned/in_progress/harvested/quality_checked → failed
   */
  async updatePropagationStage(seedSourceId: string, data: UpdatePropagationStageDTO) {
    // C6: zod 校验枚举
    const parsed = updatePropagationStageSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`参数错误: ${parsed.error.issues[0]?.message || parsed.error.message}`);
    }
    const safeData = parsed.data;

    const existing = await this.repository.findById(seedSourceId);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    const currentStage = (existing.propagationStatus || 'planned') as PropagationStage;
    const nextStage = safeData.new_stage;

    // C6: 禁止跳跃（只能 +1 进入下一个阶段；允许任意状态 → failed）
    if (nextStage === 'failed') {
      const allowedFromForFailed: PropagationStage[] = ['planned', 'in_progress', 'harvested', 'quality_checked'];
      if (!allowedFromForFailed.includes(currentStage)) {
        throw new Error(`当前状态 ${currentStage} 不允许标记为 failed`);
      }
    } else {
      const allowedNext = PROPAGATION_NEXT_STAGES[currentStage] || [];
      if (!allowedNext.includes(nextStage)) {
        throw new Error(
          `非法阶段推进：当前 ${currentStage}，目标 ${nextStage}。允许的下一阶段: ${allowedNext.join('/') || '(终态)'}`
        );
      }
    }

    await this.repository.updatePropagationStage(seedSourceId, nextStage);
    return { id: seedSourceId, new_stage: nextStage };
  }

  /**
   * 完成繁殖入库
   * C7：仅当 propagation_status === 'quality_checked' 才放行
   */
  async completePropagation(seedSourceId: string, data: CompletePropagationDTO) {
    // C7: zod 校验 quantity
    const parsed = completePropagationSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`参数错误: ${parsed.error.issues[0]?.message || parsed.error.message}`);
    }
    const safeData = parsed.data;

    const existing = await this.repository.findById(seedSourceId);
    if (!existing) {
      throw new Error('种源记录不存在');
    }

    // C7: 必须先经过 quality_checked 阶段
    if (existing.propagationStatus !== 'quality_checked') {
      throw new Error(
        `当前 propagationStatus=${existing.propagationStatus || 'null'}，必须先推进到 quality_checked 才能完成入库`
      );
    }

    await this.repository.completePropagation(seedSourceId, safeData.quantity);
    return { id: seedSourceId, quantity: safeData.quantity };
  }

  /**
   * 获取可用于留种的种植记录
   */
  async getPlantingsForSeedSaving() {
    return this.repository.getPlantingsForSeedSaving();
  }
}

// 导出单例
export const seedSourceService = new SeedSourceService();
