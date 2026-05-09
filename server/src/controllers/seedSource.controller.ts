/**
 * 种源控制器层 (Controller)
 * 负责处理 HTTP 请求/响应，参数验证
 */

import { Request, Response, NextFunction } from 'express';
import { seedSourceService, SeedSourceService } from '../services/seedSource.service';
import { CreateSeedSourceDTO, UpdateSeedSourceDTO } from '../types/seedSource';

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
      const { crop_name, status, page = 1, limit = 50 } = req.query;

      const result = await this.service.getAll({
        crop_name: crop_name as string,
        status: status as string,
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
      const result = await this.service.deleteBatch(idArray);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('批量删除种源记录失败:', error);
      next(error);
    }
  }
}

// 导出单例
export const seedSourceController = new SeedSourceController();
