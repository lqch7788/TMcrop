/**
 * 人工记录控制器层 (Controller)
 * 负责处理 HTTP 请求/响应，参数验证
 */

import { Request, Response, NextFunction } from 'express';
import { laborService, LaborService } from '../services/labor.service';

/**
 * 人工记录控制器类
 * 处理所有人工记录和员工相关的 HTTP 请求
 */
export class LaborController {
  private service: LaborService;

  constructor(svc?: LaborService) {
    this.service = svc || laborService;
  }

  // ==================== 人工记录操作 ====================

  /**
   * GET /labor
   * 获取人工记录列表
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { worker_name, work_type, status, greenhouse_name, page = 1, limit = 50 } = req.query;

      const result = await this.service.getAll({
        worker_name: worker_name as string,
        work_type: work_type as string,
        status: status as string,
        greenhouse_name: greenhouse_name as string,
        page: Number(page),
        limit: Number(limit)
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/:id
   * 获取人工记录详情
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.getById(id);
      res.json({ success: true, data });
    } catch (error) {
      if ((error as Error).message === '人工记录不存在') {
        res.status(404).json({ success: false, error: '人工记录不存在' });
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /labor
   * 创建人工记录
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const result = await this.service.create(data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('创建人工记录失败:', error);
      next(error);
    }
  }

  /**
   * PUT /labor/:id
   * 更新人工记录
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await this.service.update(id, data);
      res.json({ success: true, data: result });
    } catch (error) {
      if ((error as Error).message === '人工记录不存在') {
        res.status(404).json({ success: false, error: '更新人工记录失败' });
      } else {
        next(error);
      }
    }
  }

  /**
   * DELETE /labor/:id
   * 删除人工记录
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.json({ success: true, data: { id } });
    } catch (error) {
      if ((error as Error).message === '人工记录不存在') {
        res.status(404).json({ success: false, error: '删除人工记录失败' });
      } else {
        next(error);
      }
    }
  }

  /**
   * DELETE /labor/all
   * 清空所有人工记录（用于重新迁移）
   */
  async deleteAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await this.service.deleteAll();
      res.json({ success: true, data: { deleted: count } });
    } catch (error) {
      next(error);
    }
  }

  // ==================== 员工操作 ====================

  /**
   * GET /labor/workers
   * 获取员工列表
   */
  async getAllEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, position, department, status, page = 1, limit = 50 } = req.query;

      const result = await this.service.getAllEmployees({
        name: name as string,
        position: position as string,
        department: department as string,
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
   * GET /labor/workers/:id
   * 获取员工详情
   */
  async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await this.service.getEmployeeById(id);
      res.json({ success: true, data });
    } catch (error) {
      if ((error as Error).message === '员工不存在') {
        res.status(404).json({ success: false, error: '员工不存在' });
      } else {
        next(error);
      }
    }
  }

  /**
   * POST /labor/workers
   * 创建员工
   */
  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const result = await this.service.createEmployee(data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error('创建员工失败:', error);
      next(error);
    }
  }

  /**
   * PUT /labor/workers/:id
   * 更新员工
   */
  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await this.service.updateEmployee(id, data);
      res.json({ success: true, data: result });
    } catch (error) {
      if ((error as Error).message === '员工不存在') {
        res.status(404).json({ success: false, error: '更新员工失败' });
      } else {
        next(error);
      }
    }
  }

  /**
   * DELETE /labor/workers/:id
   * 删除员工
   */
  async deleteEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.deleteEmployee(id);
      res.json({ success: true, data: { id } });
    } catch (error) {
      if ((error as Error).message === '员工不存在') {
        res.status(404).json({ success: false, error: '删除员工失败' });
      } else {
        next(error);
      }
    }
  }

  /**
   * DELETE /labor/workers/batch
   * 批量删除员工
   */
  async deleteEmployeesBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是数组' });
        return;
      }

      const result = await this.service.deleteEmployeesBatch(ids);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/search
   * 搜索员工
   */
  async searchEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { keyword } = req.query;

      if (!keyword) {
        res.status(400).json({ success: false, error: '缺少 keyword 参数' });
        return;
      }

      const items = await this.service.searchEmployees(keyword as string);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/department/:deptId
   * 按部门获取员工
   */
  async getEmployeesByDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deptId } = req.params;
      const items = await this.service.getEmployeesByDepartment(deptId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/position/:positionId
   * 按岗位获取员工
   */
  async getEmployeesByPosition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { positionId } = req.params;
      const items = await this.service.getEmployeesByPosition(positionId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/type/:employeeType
   * 按类型获取员工
   */
  async getEmployeesByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeType } = req.params;
      const items = await this.service.getEmployeesByType(employeeType);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/status/:status
   * 按状态获取员工
   */
  async getEmployeesByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.params;
      const items = await this.service.getEmployeesByStatus(status);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/active
   * 获取在职工人
   */
  async getActiveEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await this.service.getActiveEmployees();
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/left
   * 获取离职工人
   */
  async getLeftEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await this.service.getLeftEmployees();
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /labor/workers/:id/leave
   * 工人离职
   */
  async employeeLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { leave_date, leave_reason } = req.body;
      const result = await this.service.employeeLeave(id, leave_date, leave_reason);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /labor/workers/:id/rejoin
   * 工人复职
   */
  async employeeRejoin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { rejoin_date } = req.body;
      const result = await this.service.employeeRejoin(id, rejoin_date);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/stats
   * 获取员工统计
   */
  async getEmployeeStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.service.getEmployeeStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/skill-tags
   * 获取工人技能标签列表
   */
  async getSkillTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tags = await this.service.getSkillTags();
      res.json({ success: true, data: tags });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/skill-tag/:skillTag
   * 按技能标签获取员工
   */
  async getEmployeesBySkillTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { skillTag } = req.params;
      const items = await this.service.getEmployeesBySkillTag(skillTag);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  // ==================== 培训记录操作 ====================

  /**
   * GET /labor/workers/:workerId/training-records
   * 获取员工培训记录
   */
  async getTrainingRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerId } = req.params;
      const items = await this.service.getTrainingRecords(workerId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /labor/workers/:workerId/training-records
   * 添加培训记录
   */
  async createTrainingRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerId } = req.params;
      const data = req.body;
      const result = await this.service.createTrainingRecord(workerId, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== 考核记录操作 ====================

  /**
   * GET /labor/workers/:workerId/assessment-records
   * 获取员工考核记录
   */
  async getAssessmentRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerId } = req.params;
      const items = await this.service.getAssessmentRecords(workerId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /labor/workers/:workerId/assessment-records
   * 添加考核记录
   */
  async createAssessmentRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerId } = req.params;
      const data = req.body;
      const result = await this.service.createAssessmentRecord(workerId, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== 工作经验操作 ====================

  /**
   * GET /labor/workers/:workerId/work-experiences
   * 获取员工工作经验
   */
  async getWorkExperiences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerId } = req.params;
      const items = await this.service.getWorkExperiences(workerId);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /labor/workers/:workerId/work-experiences
   * 添加工作经验
   */
  async createWorkExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workerId } = req.params;
      const data = req.body;
      const result = await this.service.createWorkExperience(workerId, data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ==================== 批量导入导出 ====================

  /**
   * GET /labor/workers/generate-id
   * 生成员工工号
   */
  generateEmployeeCode(req: Request, res: Response, next: NextFunction): void {
    try {
      const code = this.service.generateEmployeeCode();
      res.json({ success: true, data: code });
    } catch (error) {
      res.status(500).json({ success: false, error: '生成工号失败' });
    }
  }

  /**
   * POST /labor/workers/import
   * 批量导入员工
   */
  async importEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workers } = req.body;

      if (!Array.isArray(workers) || workers.length === 0) {
        res.status(400).json({ success: false, error: '缺少 workers 参数或 workers 不是有效数组' });
        return;
      }

      const result = await this.service.importEmployees(workers);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /labor/workers/export
   * 导出员工数据
   */
  async exportEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, department, position, format } = req.query;

      const result = await this.service.exportEmployees(
        status as string,
        department as string,
        position as string,
        format as string
      );

      if (format === 'csv') {
        const filename = `employees_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(result);
      } else {
        res.json(result);
      }
    } catch (error) {
      if ((error as Error).message === '没有可导出的数据') {
        res.status(404).json({ success: false, error: '没有可导出的数据' });
      } else {
        next(error);
      }
    }
  }
}

// 导出单例
export const laborController = new LaborController();
