/**
 * 种源控制器层 (Controller)
 * 负责处理 HTTP 请求/响应，参数验证
 * H9：统一错误处理，全部走 next(error) + 全局 errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { seedSourceService, SeedSourceService, BusinessError } from '../services/seedSource.service';
// 2026-07-14：时区铁律合规——业务日期严禁用 toISOString()（中国早上 0-8 点会带前一天日期）
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil';
import { CreateSeedSourceDTO, UpdateSeedSourceDTO, CreatePropagationRecordDTO, UpdatePropagationStageDTO, CompletePropagationDTO } from '../types/seedSource';
import { AppError } from '../middleware/errorHandler';

/**
 * 2026-07-14：snake/camel 双字段读取 helper（替代 `data as any` 强转 30+ 处）
 * 历史 DTO 兼容：前端可能传 snake_case（数据库行）或 camelCase（驼峰 API 包装）
 */
function pickField(obj: any, snakeName: string, camelName?: string): any {
  if (!obj) return undefined;
  if (obj[snakeName] != null) return obj[snakeName];
  if (camelName && obj[camelName] != null) return obj[camelName];
  return undefined;
}

/**
 * 把业务错误消息映射成 HTTP 状态码（H9 辅助函数）
 * 2026-06-06: L4 — 优先用 BusinessError.code 匹配；保留 msg 关键字兜底兼容历史报错
 */
function toHttpError(err: Error): AppError {
  // 2026-06-06: 业务错误码优先（避免 msg 文案漂移导致匹配失效）
  if (err instanceof BusinessError) {
    // 将错误码前缀到消息中（兼容当前 errorHandler 不识别 code 的情况）
    return new AppError(err.message, err.httpStatus);
  }
  const msg = err.message || '服务器内部错误';
  if (msg === '种源记录不存在') {
    return new AppError(msg, 404);
  }
  // 业务校验类错误 → 400（兜底）
  const validationKeywords = [
    '参数错误', '缺少', '必须', '非法', '不允许', '不足',
    '批量删除单次最多', '当前', '拒绝', '当前状态',
  ];
  if (validationKeywords.some(k => msg.includes(k))) {
    return new AppError(msg, 400);
  }
  return new AppError(msg, 500);
}

/**
 * 种源控制器类
 * 处理所有种源相关的 HTTP 请求
 */
export class SeedSourceController {
  private service: SeedSourceService;

  constructor(svc?: SeedSourceService) {
    this.service = svc || seedSourceService;
  }

  /**
   * GET /seed-sources
   * 获取种源列表
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // P2 #15 修复: 后端默认 limit 从 50 改为 1000，避免数据 > 50 时前端"分页消失"
      // 前端 pageSize=10 会基于后端全量结果再切片
      // 2026-06-04: status 过滤已废弃（改为前端实时计算）
      const { crop_name, keyword, page = 1, limit = 1000 } = req.query;

      const result = await this.service.getAll({
        crop_name: crop_name as string,
        // 2026-06-25: 多字段模糊搜索（前端 combogrid 用）
        keyword: keyword as string,
        page: Number(page),
        limit: Number(limit)
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /seed-sources/:id
   * 获取种源详情
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * 2026-06-26: 种源审计日志写入工具（复用 audit_logs 表）
   * business_type = 'seed_source'，action = 'create' | 'update' | 'delete'
   * opinion 字段存"修改前→修改后"快照（update 时每字段1条）
   */
  private writeAuditLog(args: {
    seedSourceId: string;
    action: 'create' | 'update' | 'delete';
    opinion?: string;
    operatorName?: string;
  }): void {
    try {
      const { getDatabase } = require('../db');
      const db = getDatabase();
      // 2026-07-14：审计日志 ID 改用 crypto.randomUUID()（替代 Math.random，违反 [[code-generation-contract-rule]] 铁律）
      const { randomUUID } = require('crypto');
      const id = `AUD-SS-${randomUUID()}`;
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO audit_logs (id, business_type, business_id, action, operator_id, operator_name, opinion, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, 'seed_source', args.seedSourceId, args.action, '', args.operatorName || 'system', args.opinion || '', now]
      );
    } catch (e) {
      console.warn('[seedSource.audit] write failed:', (e as Error).message);
    }
  }

  /**
   * POST /seed-sources
   * 创建种源
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateSeedSourceDTO = req.body;
      const result = await this.service.create(data);
      // 写入 material_flow_log
      try {
        const { writeFlowLog } = require('../services/flowLogService');
        const { mapPropagationToCategory } = require('../lib/sourceCategoryMapper');
        const propagationType = pickField(data, 'propagation_type', 'propagationType') || '';
        writeFlowLog({
          flow_type: 'plan→seed_source',
          crop_name: pickField(data, 'crop_name', 'cropName') || '',
          crop_variety: pickField(data, 'crop_variety', 'cropVariety') || '',
          source_type: null,
          source_id: null,
          source_code: null,
          source_quantity: null,
          source_category: mapPropagationToCategory(propagationType),
          target_type: 'seed_source',
          target_id: (result as any)?.id || '',
          target_code: pickField(data, 'seed_code', 'seedCode') || '',
          target_quantity: pickField(data, 'quantity') || 0,
          target_unit: pickField(data, 'unit') || '袋',
          business_code: pickField(data, 'seed_code', 'seedCode') || '',
          created_by: pickField(data, 'create_by', 'createBy') || '',
        });
      } catch (e) { console.error('[seedSource] writeFlowLog 失败:', (e as any)?.message || e); }
      // 2026-07-06: 外购入库 → 补写 inventory_inbound_records（让种源详情历史 tabs 能看到入库记录）
      try {
        const sourceOrigin = pickField(data, 'source_origin', 'sourceOrigin') || '';
        const isExternalPurchase = sourceOrigin === 'external_purchase' || sourceOrigin === 'external_purchased';
        if (isExternalPurchase) {
          const { getDatabase, saveDatabase } = require('../db');
          const db = getDatabase();
          const now = new Date().toISOString();
          // 2026-07-14：流水号改用 generateInboundRecordId（替代 Math.random + Date.now 违规格式）
          const { generateInboundRecordId } = require('../services/inventory.service');
          // 时区铁律：业务日期用本地日期，不用 ISO（中国早上 0-8 点会带前一天日期）
          const recordId = await generateInboundRecordId(formatLocalDateYYYYMMDD());
          const seedCode = pickField(data, 'seed_code', 'seedCode') || '';
          const cropName = pickField(data, 'crop_name', 'cropName') || '';
          const cropVariety = pickField(data, 'crop_variety', 'cropVariety') || '';
          const quantity = pickField(data, 'quantity') || 0;
          const unit = pickField(data, 'unit') || '袋';
          const unitPrice = pickField(data, 'unit_price', 'unitPrice') || pickField(data, 'purchase_price') || 0;
          const totalAmount = pickField(data, 'total_amount', 'totalAmount') || (unitPrice * quantity);
          const supplierId = pickField(data, 'supplier_id', 'supplierId') || '';
          const supplierName = pickField(data, 'supplier_name', 'supplierName') || '';
          const operator = pickField(data, 'create_by', 'createBy') || 'system';
          const purchaseDate = pickField(data, 'purchase_date', 'purchaseDate') || '';
          db.run(`
            INSERT INTO inventory_inbound_records (
              id, record_type, record_date, source_module, source_id, source_code,
              stock_type, source_type, warehouse_id, warehouse_name,
              crop_name, variety_name,
              quantity, unit, unit_price, total_amount,
              supplier_id, supplier_name,
              business_id, notes, operator_name, create_by, create_time, update_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            recordId, 'inbound', purchaseDate, 'seed_source', (result as any)?.id, seedCode,
            'seed', 'external_purchase', '', '',
            cropName, cropVariety,
            quantity, unit, unitPrice, totalAmount,
            supplierId, supplierName,
            (result as any)?.id || '', '外购入库-新建种源', operator, operator, now, now,
          ]);
          saveDatabase();
        }
      } catch (e) { console.error('[seedSource] inventory_inbound_records 写入失败:', (e as any)?.message || e); }
      // 2026-06-26: 写审计日志
      this.writeAuditLog({
        seedSourceId: (result as any)?.id || '',
        action: 'create',
        opinion: `创建种源 ${pickField(data, 'seed_code', 'seedCode') || ''} (${pickField(data, 'crop_name', 'cropName') || ''})`,
        operatorName: pickField(data, 'create_by', 'createBy') || '',
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * PUT /seed-sources/:id
   * 更新种源
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateSeedSourceDTO = req.body;
      // 2026-07-01 P2-11：空 body 校验（避免空对象 PUT 触发 500）
      if (!data || Object.keys(data).length === 0) {
        res.status(400).json({ success: false, error: '请求体不能为空' });
        return;
      }
      // 2026-07-01 P0-6：从请求头/用户上下文自动注入 update_by（如果客户端没传）
      // 优先取 req.user（auth middleware），其次取 body.operatorName，最后兜底 'system'
      const operatorName = (req as any).user?.name || (req as any).user?.username
        || data.operatorName || (req.body as any)?.operatorName
        || 'system';
      if (!data.updateBy) data.updateBy = operatorName;

      // 2026-06-26: 写审计日志前先取旧值做 diff
      let oldRecord: any = null;
      try { oldRecord = await this.service.getById(id); } catch (_) { /* 不存在时 update 会失败 */ }
      const result = await this.service.update(id, data);
      // 数量变更时写 correction
      if (pickField(data, 'quantity') !== undefined) {
        try {
          const { writeCorrection } = require('../services/flowLogService');
          const oldQty = pickField(oldRecord, 'quantity') || 0;
          const newQty = pickField(data, 'quantity') || 0;
          const delta = newQty - oldQty;
          if (Math.abs(delta) > 0.001) {
            writeCorrection({
              flow_type: 'plan→seed_source',
              target_type: 'seed_source',
              target_id: id,
              source_quantity_delta: delta,
              source_unit: pickField(data, 'unit') || '袋',
              crop_name: pickField(oldRecord, 'crop_name', 'cropName') || '',
              crop_variety: pickField(oldRecord, 'crop_variety', 'cropVariety') || '',
            });
          }
        } catch (e) { /* correction 写入失败不影响主流程 */ }
      }
      // 2026-06-26: 写审计日志（update + diff 快照）
      try {
        const diffs: string[] = [];
        const watchFields = ['cropName', 'cropVariety', 'unit', 'quantity', 'unitPrice', 'supplierName', 'remarks'];
        for (const f of watchFields) {
          const oldVal = (oldRecord as any)?.[f];
          const newVal = (data as any)[f] ?? (data as any)[f.charAt(0).toLowerCase() + f.slice(1)];
          if (oldVal !== undefined && newVal !== undefined && String(oldVal) !== String(newVal)) {
            diffs.push(`${f}: ${oldVal} → ${newVal}`);
          }
        }
        if (diffs.length > 0) {
          this.writeAuditLog({
            seedSourceId: id,
            action: 'update',
            opinion: `修改字段: ${diffs.slice(0, 5).join('; ')}${diffs.length > 5 ? ` (+${diffs.length - 5}项)` : ''}`,
            operatorName: req.body?.operatorName || req.body?.createBy || req.body?.updateBy || 'system',
          });
        }
      } catch (e) {
        console.warn('[seedSource.update] audit failed:', (e as Error).message);
      }
      res.json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * DELETE /seed-sources/:id
   * 删除种源
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // 软删除：标记 deleted_at 而不物理删除
      const { getDatabase, saveDatabase } = require('../db');
      const db = getDatabase();
      const now = new Date().toISOString();
      // 2026-06-26: 取种源 code 用于审计日志
      const oldStmt = db.prepare('SELECT source_code FROM seed_sources WHERE id = ?');
      oldStmt.bind([id]);
      const oldRow = oldStmt.step() ? oldStmt.getAsObject() as any : null;
      oldStmt.free();
      db.run('UPDATE seed_sources SET deleted_at = ? WHERE id = ?', [now, id]);
      saveDatabase();
      // 2026-06-26: 写审计日志
      this.writeAuditLog({
        seedSourceId: id,
        action: 'delete',
        opinion: `软删种源 ${oldRow?.source_code || id}`,
        operatorName: (req.body as any)?.operatorName || (req as any).user?.name || 'system',
      });
      res.json({ success: true, data: { id } });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * POST /seed-sources/:id/decrease-available
   * 扣减可用数量（用于育苗新增等场景）
   */
  async decreaseAvailable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { count } = req.body as { count?: number };
      const data = await this.service.decreaseAvailable(id, Number(count));
      res.json({ success: true, data });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * DELETE /seed-sources/batch
   * 批量删除种源
   */
  async deleteBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids) {
        return next(new AppError('缺少 ids 参数', 400));
      }

      const idArray = (ids as string).split(',');
      const result = await this.service.deleteBatch(idArray);
      res.json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * GET /seed-sources/generate-code
   * 生成种源编码
   */
  async generateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        return next(new AppError('缺少 date 参数', 400));
      }
      const code = await this.service.generateCode(date);
      res.json({ success: true, data: code });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  // ========== 繁殖过程记录控制器方法 ==========

  /**
   * POST /seed-sources/:id/propagation-records
   * 添加繁殖过程记录
   */
  async addPropagationRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: CreatePropagationRecordDTO = req.body;
      const result = await this.service.addPropagationRecord(id, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * GET /seed-sources/:id/propagation-records
   * 获取繁殖过程记录列表
   */
  async getPropagationRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.getPropagationRecords(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /seed-sources/propagation-records
   * 全量查询繁殖过程记录（带筛选+分页+JOIN seed_sources）
   */
  async getAllPropagationRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { seedSourceId, stage, startDate, endDate, page, limit } = req.query;
      const data = await this.service.getAllPropagationRecords({
        seedSourceId: seedSourceId as string | undefined,
        stage: stage as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      // 2026-06-05: 统一 data 包装（V2.1 铁律：所有列表接口走 {success, data:{items,total}}）
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /seed-sources/:id/propagation-stage
   * 推进繁殖阶段
   */
  async updatePropagationStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdatePropagationStageDTO = req.body;
      const result = await this.service.updatePropagationStage(id, data);
      res.json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * PUT /seed-sources/:id/propagation-records/:recordId
   * 更新繁殖过程记录
   * 2026-06-13: 与育苗每日记录对齐，操作列支持内联编辑
   * body 字段名约定：snake_case（与 addPropagationRecord 一致）
   */
  async updatePropagationRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, recordId } = req.params;
      const data: Record<string, any> = req.body || {};
      const result = await this.service.updatePropagationRecord(id, recordId, data);
      res.json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * DELETE /seed-sources/:id/propagation-records/:recordId
   * 删除繁殖过程记录
   * 2026-06-13: 与育苗每日记录对齐，操作列支持删除
   */
  async deletePropagationRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, recordId } = req.params;
      await this.service.deletePropagationRecord(id, recordId);
      res.json({ success: true, data: { id: recordId } });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * POST /seed-sources/:id/complete-propagation
   * 完成繁殖入库
   */
  async completePropagation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: CompletePropagationDTO = req.body;
      const result = await this.service.completePropagation(id, data);
      res.json({ success: true, data: result });
    } catch (error) {
      next(toHttpError(error as Error));
    }
  }

  /**
   * GET /plantings/available-for-seed-saving
   * 获取可用于留种的种植记录
   */
  async getPlantingsForSeedSaving(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.service.getPlantingsForSeedSaving();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

// 导出单例
export const seedSourceController = new SeedSourceController();
