/**
 * 月度计划 API 路由
 * 提供月度计划的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/**
 * 获取所有月度计划
 * GET /api/monthly-plans
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM monthly_plans WHERE 1=1';
    const params: string[] = [];

    if (month && typeof month === 'string') {
      sql += ' AND plan_month = ?';
      params.push(month);
    }

    sql += ' ORDER BY plan_month DESC';

    const items = queryToObjects(db, sql, params);

    // 解析 plan_data JSON 字段
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      planData: item.plan_data ? JSON.parse(item.plan_data as string) : null,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取月度计划失败:', error);
    res.status(500).json({ success: false, error: '获取月度计划失败' });
  }
});

/**
 * 获取指定月份的月度计划
 * GET /api/monthly-plans/:month
 */
router.get('/:month', (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    const db = getDatabase();

    const items = queryToObjects(
      db,
      'SELECT * FROM monthly_plans WHERE plan_month = ?',
      [month]
    );

    if (!items || items.length === 0) {
      return res.json({ success: true, data: null });
    }

    const item = items[0];
    const result = {
      ...item,
      planData: item.plan_data ? JSON.parse(item.plan_data as string) : null,
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取月度计划详情失败:', error);
    res.status(500).json({ success: false, error: '获取月度计划详情失败' });
  }
});

/**
 * 创建或更新月度计划
 * POST /api/monthly-plans
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, planMonth, planData, createdBy } = req.body;

    if (!planMonth || !planData) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const newId = id || `MP${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 检查是否已存在该月份的计划
    const existing = queryToObjects(
      db,
      'SELECT id FROM monthly_plans WHERE plan_month = ?',
      [planMonth]
    );

    if (existing && existing.length > 0) {
      // 更新现有记录
      db.run(
        `UPDATE monthly_plans SET plan_data = ?, updated_at = ? WHERE plan_month = ?`,
        [JSON.stringify(planData), now, planMonth]
      );
      saveDatabase();
      res.json({ success: true, data: { id: existing[0].id, planMonth, updatedAt: now } });
    } else {
      // 创建新记录
      db.run(
        `INSERT INTO monthly_plans (id, plan_month, plan_data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, planMonth, JSON.stringify(planData), createdBy || '', now, now]
      );
      saveDatabase();
      res.status(201).json({ success: true, data: { id: newId, planMonth, createdAt: now } });
    }
  } catch (error) {
    console.error('保存月度计划失败:', error);
    res.status(500).json({ success: false, error: '保存月度计划失败' });
  }
});

/**
 * 删除月度计划
 * DELETE /api/monthly-plans/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM monthly_plans WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除月度计划失败:', error);
    res.status(500).json({ success: false, error: '删除月度计划失败' });
  }
});

/**
 * 根据月份删除月度计划
 * DELETE /api/monthly-plans/month/:month
 */
router.delete('/month/:month', (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM monthly_plans WHERE plan_month = ?', [month]);
    saveDatabase();

    res.json({ success: true, data: { month } });
  } catch (error) {
    console.error('删除月度计划失败:', error);
    res.status(500).json({ success: false, error: '删除月度计划失败' });
  }
});

export default router;
