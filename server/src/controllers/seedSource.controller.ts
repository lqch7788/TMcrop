/**
 * 种源控制器层 (Controller)
 * 负责处理 HTTP 请求/响应，参数验证
 * H9：统一错误处理，全部走 next(error) + 全局 errorHandler
 */

import { Request, Response, NextFunction } from 'express';
import { seedSourceService, SeedSourceService, BusinessError } from '../services/seedSource.service';
import { CreateSeedSourceDTO, UpdateSeedSourceDTO, CreatePropagationRecordDTO, UpdatePropagationStageDTO, CompletePropagationDTO } from '../types/seedSource';
import { AppError } from '../middleware/errorHandler';

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
      const { crop_name, page = 1, limit = 1000 } = req.query;

      const result = await this.service.getAll({
        crop_name: crop_name as string,
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
        const propagationType = (data as any).propagation_type || (data as any).propagationType || '';
        writeFlowLog({
          flow_type: 'plan→seed_source',
          crop_name: (data as any).crop_name || (data as any).cropName || '',
          crop_variety: (data as any).crop_variety || (data as any).cropVariety || '',
          source_type: null,
          source_id: null,
          source_code: null,
          source_quantity: null,
          source_category: mapPropagationToCategory(propagationType),
          target_type: 'seed_source',
          target_id: (result as any)?.id || '',
          target_code: (data as any).seed_code || (data as any).seedCode || '',
          target_quantity: (data as any).quantity || 0,
          target_unit: (data as any).unit || '袋',
          business_code: (data as any).seed_code || (data as any).seedCode || '',
          created_by: (data as any).create_by || (data as any).createBy || '',
        });
      } catch (e) { /* flow_log 写入失败不影响主流程 */ }
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
      const result = await this.service.update(id, data);
      // 数量变更时写 correction
      if ((data as any).quantity !== undefined) {
        try {
          const { writeCorrection } = require('../services/flowLogService');
          const oldRecord = await this.service.getById(id);
          const oldQty = (oldRecord as any)?.quantity || 0;
          const newQty = (data as any).quantity || 0;
          const delta = newQty - oldQty;
          if (Math.abs(delta) > 0.001) {
            writeCorrection({
              flow_type: 'plan→seed_source',
              target_type: 'seed_source',
              target_id: id,
              source_quantity_delta: delta,
              source_unit: (data as any).unit || '袋',
              crop_name: (oldRecord as any)?.crop_name || (oldRecord as any)?.cropName || '',
              crop_variety: (oldRecord as any)?.crop_variety || (oldRecord as any)?.cropVariety || '',
            });
          }
        } catch (e) { /* correction 写入失败不影响主流程 */ }
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
      db.run('UPDATE seed_sources SET deleted_at = ? WHERE id = ?', [now, id]);
      saveDatabase();
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
