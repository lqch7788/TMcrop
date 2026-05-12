/**
 * 入职管理 API 路由
 * 对接前端 /api/onboarding
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';

const router = Router();

/**
 * 统一响应格式
 */
function successResponse(res: Response, data: any, message?: string) {
  res.json({ success: true, data, message });
}

function errorResponse(res: Response, statusCode: number, message: string) {
  res.status(statusCode).json({ success: false, error: message });
}

/**
 * 转换数据库字段为驼峰命名
 */
function transformRow(columns: string[], row: any[]): any {
  const obj: any = {};
  columns.forEach((col, i) => {
    // 蛇形转驼峰
    const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    obj[camelCol] = row[i];
  });
  return obj;
}

/**
 * GET /api/onboarding
 * 获取入职记录列表
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, keyword, page = '1', limit = '50' } = req.query;

    let sql = 'SELECT * FROM onboarding_records WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR id_card LIKE ? OR phone LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    sql += ' ORDER BY create_time DESC';

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const result = db.exec(sql, params);
    if (result.length === 0) {
      return successResponse(res, []);
    }

    const columns = result[0].columns;
    const records = result[0].values.map((row) => transformRow(columns, row));

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM onboarding_records WHERE 1=1';
    const countParams: any[] = [];
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (keyword) {
      countSql += ' AND (name LIKE ? OR id_card LIKE ? OR phone LIKE ?)';
      const kw = `%${keyword}%`;
      countParams.push(kw, kw, kw);
    }
    const countResult = db.exec(countSql, countParams);
    const total = countResult[0].values[0][0] as number;

    successResponse(res, {
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('获取入职记录失败:', error);
    errorResponse(res, 500, '获取入职记录失败');
  }
});

/**
 * GET /api/onboarding/:id
 * 获取单个入职记录
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const result = db.exec('SELECT * FROM onboarding_records WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return errorResponse(res, 404, '入职记录不存在');
    }

    const columns = result[0].columns;
    const record = transformRow(columns, result[0].values[0]);

    successResponse(res, record);
  } catch (error) {
    console.error('获取入职记录详情失败:', error);
    errorResponse(res, 500, '获取入职记录详情失败');
  }
});

/**
 * POST /api/onboarding
 * 创建入职记录
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      name,
      idCard,
      phone,
      position,
      department,
      departmentOid,
      contractType,
      dailyWage,
      hourlyWage,
      joinDate,
      requestCode,
      recruitmentId,
      operatorId,
      operatorName,
      remarks,
    } = req.body;

    if (!name) {
      return errorResponse(res, 400, '姓名不能为空');
    }

    const id = `OB${Date.now()}`;
    const oid = `OB${Date.now()}`;
    const now = new Date().toISOString();

    // 初始化进度
    const progress = JSON.stringify([
      { step: 1, name: '资料提交', status: 'completed', completedAt: now.split('T')[0] },
      { step: 2, name: '合同签订', status: 'pending' },
      { step: 3, name: '入职培训', status: 'pending' },
      { step: 4, name: '档案创建', status: 'pending' },
    ]);

    db.run(
      `INSERT INTO onboarding_records (
        id, oid, name, id_card, phone, position, department, department_oid,
        contract_type, daily_wage, hourly_wage, join_date, status, progress,
        request_code, recruitment_id, operator_id, operator_name, remarks,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, oid, name, idCard || '', phone || '', position || '', department || '', departmentOid || '',
        contractType || '', dailyWage || null, hourlyWage || null, joinDate || '', 'pending', progress,
        requestCode || '', recruitmentId || '', operatorId || '', operatorName || '', remarks || '',
        now, now,
      ]
    );

    successResponse(res, { id, oid, name }, '入职记录创建成功');
  } catch (error) {
    console.error('创建入职记录失败:', error);
    errorResponse(res, 500, '创建入职记录失败');
  }
});

/**
 * PUT /api/onboarding/:id
 * 更新入职记录
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const {
      name,
      idCard,
      phone,
      position,
      department,
      departmentOid,
      contractType,
      dailyWage,
      hourlyWage,
      joinDate,
      status,
      progress,
      operatorId,
      operatorName,
      remarks,
    } = req.body;

    // 检查记录是否存在
    const checkResult = db.exec('SELECT id FROM onboarding_records WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return errorResponse(res, 404, '入职记录不存在');
    }

    const now = new Date().toISOString();

    db.run(
      `UPDATE onboarding_records SET
        name = COALESCE(?, name),
        id_card = COALESCE(?, id_card),
        phone = COALESCE(?, phone),
        position = COALESCE(?, position),
        department = COALESCE(?, department),
        department_oid = COALESCE(?, department_oid),
        contract_type = COALESCE(?, contract_type),
        daily_wage = COALESCE(?, daily_wage),
        hourly_wage = COALESCE(?, hourly_wage),
        join_date = COALESCE(?, join_date),
        status = COALESCE(?, status),
        progress = COALESCE(?, progress),
        operator_id = COALESCE(?, operator_id),
        operator_name = COALESCE(?, operator_name),
        approved_at = COALESCE(?, approved_at),
        remarks = COALESCE(?, remarks),
        update_time = ?
      WHERE id = ?`,
      [
        name, idCard, phone, position, department, departmentOid,
        contractType, dailyWage, hourlyWage, joinDate, status, progress,
        operatorId, operatorName, status === '已入职' ? now : null, remarks, now, id,
      ]
    );

    successResponse(res, { id }, '入职记录更新成功');
  } catch (error) {
    console.error('更新入职记录失败:', error);
    errorResponse(res, 500, '更新入职记录失败');
  }
});

/**
 * DELETE /api/onboarding/:id
 * 删除入职记录
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 检查记录是否存在
    const checkResult = db.exec('SELECT id FROM onboarding_records WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return errorResponse(res, 404, '入职记录不存在');
    }

    db.run('DELETE FROM onboarding_records WHERE id = ?', [id]);

    successResponse(res, { id }, '入职记录删除成功');
  } catch (error) {
    console.error('删除入职记录失败:', error);
    errorResponse(res, 500, '删除入职记录失败');
  }
});

/**
 * POST /api/onboarding/:id/status
 * 更新入职状态
 */
router.post('/:id/status', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { status, operatorId, operatorName } = req.body;

    // 检查记录是否存在
    const checkResult = db.exec('SELECT * FROM onboarding_records WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return errorResponse(res, 404, '入职记录不存在');
    }

    const columns = checkResult[0].columns;
    const record = transformRow(columns, checkResult[0].values[0]);

    const now = new Date().toISOString();
    let progress = record.progress ? JSON.parse(record.progress) : [];

    // 如果是已完成状态，更新所有进度步骤
    if (status === '已入职') {
      progress = progress.map((p: any) => ({
        ...p,
        status: 'completed',
        completedAt: now.split('T')[0],
      }));
    } else if (status === '办理中') {
      // 找到第一个未完成的步骤，设为进行中
      const firstPending = progress.findIndex((p: any) => p.status === 'pending');
      if (firstPending !== -1) {
        progress = progress.map((p: any, i: number) => {
          if (i === firstPending) {
            return { ...p, status: 'processing' };
          }
          return p;
        });
      }
    }

    db.run(
      `UPDATE onboarding_records SET
        status = ?,
        progress = ?,
        operator_id = COALESCE(?, operator_id),
        operator_name = COALESCE(?, operator_name),
        approved_at = ?,
        update_time = ?
      WHERE id = ?`,
      [status, JSON.stringify(progress), operatorId, operatorName, now, now, id]
    );

    successResponse(res, { id, status }, '状态更新成功');
  } catch (error) {
    console.error('更新入职状态失败:', error);
    errorResponse(res, 500, '更新入职状态失败');
  }
});

/**
 * POST /api/onboarding/batch-delete
 * 批量删除入职记录
 */
router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 400, '缺少 ids 参数或 ids 不是数组');
    }

    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM onboarding_records WHERE id IN (${placeholders})`, ids);

    successResponse(res, { deletedCount: ids.length }, '批量删除成功');
  } catch (error) {
    console.error('批量删除入职记录失败:', error);
    errorResponse(res, 500, '批量删除入职记录失败');
  }
});

export default router;
