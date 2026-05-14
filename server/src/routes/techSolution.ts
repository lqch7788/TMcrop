/**
 * 技术方案管理路由
 * 提供技术方案的 CRUD 操作和API接口
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';
import { queryToObjects } from '../utils/queryHelper';

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
  // queryToObjects 返回 camelCase，同时兼容 snake_case 回退
  const sc = (k: string) => item[k] ?? ''; // snake_case 访问
  const cc = (k: string) => item[k] ?? ''; // camelCase 访问
  const getVal = (camel: string, snake: string) => (item[camel] ?? item[snake] ?? '');

  const batchStatus = getVal('batchStatus', 'batch_status') as string;

  const result: Record<string, unknown> = {
    id: item.id,
    code: getVal('solutionCode', 'solution_code'),
    title: getVal('solutionTitle', 'solution_title'),
    crop: getVal('cropName', 'crop_name'),
    cropCode: getVal('cropCode', 'crop_code'),
    plantingMode: getVal('plantingMode', 'planting_mode'),
    stage: item.stage,
    version: item.version || 'V1.0',
    content: item.content,
    author: item.author,
    authorId: getVal('authorId', 'author_id'),
    createDate: getVal('createTime', 'create_time') ? String(getVal('createTime', 'create_time')).split('T')[0] : '',
    updateTime: getVal('updateTime', 'update_time'),
    status: batchStatus === 'published' ? '已发布' :
            batchStatus === 'pending' ? '待审批' :
            batchStatus === 'draft' ? '草稿' :
            batchStatus === 'approved' ? '已审批' :
            batchStatus === 'rejected' ? '已拒绝' :
            batchStatus === 'cancelled' ? '已作废' : '草稿',
    batchStatus: batchStatus,
    statusClass: batchStatus === 'published' ? 'normal' :
                 batchStatus === 'pending' ? 'pending' : 'draft',
    approveStatus: batchStatus === 'published' || batchStatus === 'approved' ? '已审批' : '待审批',
    approvalCode: getVal('approvalCode', 'approval_code'),
    approvalDate: getVal('approvedAt', 'approved_at'),
    approver: item.approver,
    relatedBatchCode: getVal('relatedBatchCode', 'related_batch_code'),
    planDetailFileName: getVal('planDetailFileName', 'plan_detail_file_name'),
    priority: item.priority || 'normal',
    remarks: item.remarks,
    lastSubmitTime: getVal('lastSubmitTime', 'last_submit_time') || '',
    isValid: getVal('isValid', 'is_valid') || '有效',
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
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 使用 queryToObjects 自动转换 snake_case → camelCase
    const rawItems = queryToObjects<Record<string, unknown>>(db, sql, params);

    // 转换字段格式为前端期望格式
    const camelItems = mapArrayToFrontend(rawItems);

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM tech_solutions WHERE 1=1';
    const countParams: (string | number)[] = [];
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

    const countResult = queryToObjects<{total: number}>(db, countSql, countParams);
    const total = countResult.length > 0 ? countResult[0].total : 0;

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

    const items = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM tech_solutions WHERE id = ?',
      [id]
    );

    if (items && items.length > 0) {
      res.json({
        success: true,
        data: mapFieldsToFrontend(items[0]),
      });
    } else {
      res.status(404).json({ success: false, error: '技术方案不存在' });
    }  } catch (error) {
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
      cropCode,
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
    } = req.body;

    // 默认草稿状态
    const batchStatus = req.body.batchStatus || 'draft';

    console.log('[技术方案创建] relatedBatchCode:', relatedBatchCode);
    console.log('[技术方案创建] req.body:', JSON.stringify(req.body, null, 2));

    const id = generateId('TS');
    // 优先使用前端传入的编号，否则按规则生成
    const solutionCode = code || generateSolutionCode();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO tech_solutions (
        id, solution_code, solution_title, crop_name, crop_code, planting_mode, stage,
        version, content, author, author_id, create_time, update_time,
        status, batch_status, related_batch_code, plan_detail_file_name,
        priority, remarks, last_submit_time, is_valid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      solutionCode,
      solutionTitle,
      cropName,
      cropCode || '',
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
      now, // last_submit_time
      req.body.isValid || '有效', // is_valid
    ]);

    saveDatabase();
    console.log('[技术方案创建] 插入数据 - related_batch_code:', relatedBatchCode || '');

    const newItems = queryToObjects(db, 'SELECT * FROM tech_solutions WHERE id = ?', [id]);
    const resultData = newItems.length > 0 ? mapFieldsToFrontend(newItems[0]) : {};

    res.json({
      success: true,
      message: '技术方案创建成功',
      data: resultData,
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
      solutionTitle = '',
      cropName = '',
      plantingMode = '',
      stage = '',
      version = 'V1.0',
      content = '',
      relatedBatchCode = '',
      planDetailFileName = '',
      priority = 'normal',
      remarks = '',
      isValid = '有效',
      lastSubmitTime = '',
    } = req.body;

    const now = new Date().toISOString();
    // 如果方案被标记为作废，更新 batch_status
    const batchStatus = isValid === '作废' ? 'cancelled' : 'pending';

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
        update_time = ?,
        batch_status = ?,
        is_valid = ?,
        last_submit_time = ?
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
      batchStatus,
      isValid,
      lastSubmitTime || now,
      id,
    ]);

    saveDatabase();

    const updatedItems = queryToObjects<Record<string, unknown>>(db, 'SELECT * FROM tech_solutions WHERE id = ?', [id]);
    const updatedData = updatedItems.length > 0 ? mapFieldsToFrontend(updatedItems[0]) : null;

    res.json({ success: true, message: '技术方案更新成功', data: updatedData });
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
