/**
 * 技术方案管理路由
 * 提供技术方案的 CRUD 操作和API接口
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

// ============================================
// 工具函数
// ============================================

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 生成技术方案编码
 * 格式：T + 年月 + 3位流水号
 */
function generateSolutionCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `T${year}${month}${seq}`;
}

/**
 * 字段映射：将数据库字段映射到前端期望的字段名
 */
function mapFieldsToFrontend(item: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: item.id,
    code: item.solution_code,
    title: item.solution_title,
    crop: item.crop_name,
    plantingMode: item.planting_mode,
    stage: item.stage,
    version: item.version || 'V1.0',
    content: item.content,
    author: item.author,
    authorId: item.author_id,
    createDate: item.create_time ? String(item.create_time).split('T')[0] : '',
    updateTime: item.update_time,
    // 使用 batch_status 作为前端 status（用于显示）
    status: item.batch_status === 'published' ? '已发布' :
            item.batch_status === 'pending' ? '待审批' :
            item.batch_status === 'draft' ? '草稿' :
            item.batch_status === 'approved' ? '已审批' :
            item.batch_status === 'rejected' ? '已拒绝' :
            item.batch_status === 'cancelled' ? '已作废' : '草稿',
    // 保留 batchStatus 字段
    batchStatus: item.batch_status,
    statusClass: item.batch_status === 'published' ? 'normal' :
                 item.batch_status === 'pending' ? 'pending' : 'draft',
    // 审批相关字段
    approveStatus: item.batch_status === 'published' || item.batch_status === 'approved' ? '已审批' : '待审批',
    approvalCode: item.approval_code,
    approvalDate: item.approved_at,
    approver: item.approver,
    relatedBatchCode: item.related_batch_code,
    planDetailFileName: item.plan_detail_file_name,
    priority: item.priority || 'normal',
    remarks: item.remarks,
  };
  return result;
}

function mapArrayToFrontend(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.map(item => mapFieldsToFrontend(item));
}

// ============================================
// API 路由
// ============================================

/**
 * 获取所有技术方案
 * GET /api/tech-solutions
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { crop, status, keyword, page = 1, limit = 50 } = req.query;

    let sql = 'SELECT * FROM tech_solutions WHERE 1=1';
    const params: (string | number)[] = [];

    if (crop) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop}%`);
    }

    if (status) {
      sql += ' AND batch_status = ?';
      params.push(status as string);
    }

    if (keyword) {
      sql += ' AND (solution_code LIKE ? OR solution_title LIKE ? OR crop_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += ' ORDER BY create_time DESC';

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const items: Record<string, unknown>[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();

    // 转换字段格式为camelCase
    const camelItems = mapArrayToFrontend(items);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM tech_solutions WHERE 1=1';
    const countParams: string[] = [];
    if (crop) {
      countSql += ' AND crop_name LIKE ?';
      countParams.push(`%${crop}%`);
    }
    if (status) {
      countSql += ' AND batch_status = ?';
      countParams.push(status as string);
    }
    if (keyword) {
      countSql += ' AND (solution_code LIKE ? OR solution_title LIKE ? OR crop_name LIKE ?)';
      const kw = `%${keyword}%`;
      countParams.push(kw, kw, kw);
    }

    const countStmt = db.prepare(countSql);
    if (countParams.length > 0) {
      countStmt.bind(countParams);
    }
    countStmt.step();
    const total = countStmt.getAsObject().total as number;
    countStmt.free();

    res.json({
      success: true,
      data: camelItems,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取技术方案列表失败:', error);
    res.status(500).json({ success: false, error: '获取技术方案列表失败' });
  }
});

/**
 * 获取单个技术方案
 * GET /api/tech-solutions/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM tech_solutions WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const item = stmt.getAsObject();
      stmt.free();
      res.json({
        success: true,
        data: mapFieldsToFrontend(item),
      });
    } else {
      stmt.free();
      res.status(404).json({ success: false, error: '技术方案不存在' });
    }
  } catch (error) {
    console.error('获取技术方案详情失败:', error);
    res.status(500).json({ success: false, error: '获取技术方案详情失败' });
  }
});

/**
 * 创建技术方案
 * POST /api/tech-solutions
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      code, // 前端传入的方案编号
      solutionTitle,
      cropName,
      plantingMode,
      stage,
      version,
      content,
      author,
      authorId,
      relatedBatchCode,
      planDetailFileName,
      priority,
      remarks,
      batchStatus = 'draft', // 默认草稿状态
    } = req.body;

    const id = generateId('TS');
    // 优先使用前端传入的编号，否则按规则生成
    const solutionCode = code || generateSolutionCode();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO tech_solutions (
        id, solution_code, solution_title, crop_name, planting_mode, stage,
        version, content, author, author_id, create_time, update_time,
        status, batch_status, related_batch_code, plan_detail_file_name,
        priority, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      solutionCode,
      solutionTitle,
      cropName,
      plantingMode,
      stage,
      version || 'V1.0',
      content,
      author || '',
      authorId || '',
      now,
      now,
      'draft',
      batchStatus,
      relatedBatchCode || '',
      planDetailFileName || '',
      priority || 'normal',
      remarks || '',
    ]);

    saveDatabase();

    res.json({
      success: true,
      message: '技术方案创建成功',
      data: {
        id,
        code: solutionCode,
        ...req.body,
      },
    });
  } catch (error) {
    console.error('创建技术方案失败:', error);
    res.status(500).json({ success: false, error: '创建技术方案失败' });
  }
});

/**
 * 更新技术方案
 * PUT /api/tech-solutions/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const {
      solutionTitle,
      cropName,
      plantingMode,
      stage,
      version,
      content,
      relatedBatchCode,
      planDetailFileName,
      priority,
      remarks,
    } = req.body;

    const now = new Date().toISOString();

    db.run(`
      UPDATE tech_solutions SET
        solution_title = ?,
        crop_name = ?,
        planting_mode = ?,
        stage = ?,
        version = ?,
        content = ?,
        related_batch_code = ?,
        plan_detail_file_name = ?,
        priority = ?,
        remarks = ?,
        update_time = ?
      WHERE id = ?
    `, [
      solutionTitle,
      cropName,
      plantingMode,
      stage,
      version,
      content,
      relatedBatchCode,
      planDetailFileName,
      priority,
      remarks,
      now,
      id,
    ]);

    saveDatabase();

    res.json({
      success: true,
      message: '技术方案更新成功',
    });
  } catch (error) {
    console.error('更新技术方案失败:', error);
    res.status(500).json({ success: false, error: '更新技术方案失败' });
  }
});

/**
 * 删除技术方案
 * DELETE /api/tech-solutions/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM tech_solutions WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      message: '技术方案删除成功',
    });
  } catch (error) {
    console.error('删除技术方案失败:', error);
    res.status(500).json({ success: false, error: '删除技术方案失败' });
  }
});

/**
 * 批量删除技术方案
 * POST /api/tech-solutions/batch-delete
 */
router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const db = getDatabase();

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要删除的技术方案' });
    }

    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM tech_solutions WHERE id IN (${placeholders})`, ids);
    saveDatabase();

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个技术方案`,
    });
  } catch (error) {
    console.error('批量删除技术方案失败:', error);
    res.status(500).json({ success: false, error: '批量删除技术方案失败' });
  }
});

/**
 * 获取技术方案统计
 * GET /api/tech-solutions/stats
 */
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN batch_status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN batch_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN batch_status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN batch_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN batch_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN batch_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM tech_solutions
    `;

    const stmt = db.prepare(sql);
    stmt.step();
    const stats = stmt.getAsObject();
    stmt.free();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取技术方案统计失败:', error);
    res.status(500).json({ success: false, error: '获取技术方案统计失败' });
  }
});

export default router;
