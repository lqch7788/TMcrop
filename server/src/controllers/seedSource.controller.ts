/**
 * 种源控制器层 (Controller)
 * 负责处理 HTTP 请求/响应，参数验证
 */

import { Request, Response, NextFunction } from 'express';
import { seedSourceService, SeedSourceService } from '../services/seedSource.service';
import { CreateSeedSourceDTO, UpdateSeedSourceDTO, CreatePropagationRecordDTO, UpdatePropagationStageDTO, CompletePropagationDTO } from '../types/seedSource';

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
      if ((error as Error).message === '种源记录不存在') {
        res.status(404).json({ success: false, error: '种源记录不存在' });
      } else {
        next(error);
      }
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
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('创建种源记录失败:', error);
      next(error);
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
      res.json({ success: true, data: result });
    } catch (error) {
      if ((error as Error).message === '种源记录不存在') {
        res.status(404).json({ success: false, error: '更新种源记录失败' });
      } else if ((error as Error).message === '没有需要更新的字段') {
        res.status(400).json({ success: false, error: '没有需要更新的字段' });
      } else {
        next(error);
      }
    }
  }

  /**
   * DELETE /seed-sources/:id
   * 删除种源
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.json({ success: true, data: { id } });
    } catch (error) {
      if ((error as Error).message === '种源记录不存在') {
        res.status(404).json({ success: false, error: '删除种源记录失败' });
      } else {
        next(error);
      }
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
      const msg = (error as Error).message;
      if (msg === '种源记录不存在') {
        res.status(404).json({ success: false, error: '种源记录不存在' });
      } else if (msg === '扣减数量必须为正数') {
        res.status(400).json({ success: false, error: msg });
      } else if (msg.startsWith('可用数量不足')) {
        res.status(400).json({ success: false, error: msg });
      } else {
        next(error);
      }
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
        res.status(400).json({ success: false, error: '缺少 ids 参数' });
        return;
      }

      const idArray = (ids as string).split(',');
      console.log('[deleteBatch] 收到批量删除请求, ids:', idArray);
      const result = await this.service.deleteBatch(idArray);
      console.log('[deleteBatch] 删除结果:', result);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[deleteBatch] 批量删除种源记录失败:', error);
      next(error);
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
        res.status(400).json({ success: false, error: '缺少 date 参数' });
        return;
      }
      const code = await this.service.generateCode(date);
      res.json({ success: true, data: code });
    } catch (error) {
      console.error('生成种源编码失败:', error);
      next(error);
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
      if ((error as Error).message === '种源记录不存在') {
        res.status(404).json({ success: false, error: '种源记录不存在' });
      } else {
        next(error);
      }
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
      if ((error as Error).message === '种源记录不存在') {
        res.status(404).json({ success: false, error: '种源记录不存在' });
      } else {
        next(error);
      }
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
      if ((error as Error).message === '种源记录不存在') {
        res.status(404).json({ success: false, error: '种源记录不存在' });
      } else {
        next(error);
      }
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
