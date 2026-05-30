/**
 * 每日计划 API 路由
 * 提供每日计划的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/**
 * 获取所有每日计划
 * GET /api/daily-plans
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM daily_plans WHERE 1=1';
    const params: string[] = [];

    if (date && typeof date === 'string') {
      sql += ' AND plan_date = ?';
      params.push(date);
    }

    sql += ' ORDER BY plan_date DESC';

    const items = queryToObjects(db, sql, params);

    // 解析 plan_data JSON 字段
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      planData: item.plan_data ? JSON.parse(item.plan_data as string) : null,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取每日计划失败:', error);
    res.status(500).json({ success: false, error: '获取每日计划失败' });
  }
});

/**
 * 获取指定日期的每日计划
 * GET /api/daily-plans/:date
 */
router.get('/:date', (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const db = getDatabase();

    const items = queryToObjects(
      db,
      'SELECT * FROM daily_plans WHERE plan_date = ?',
      [date]
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
    console.error('获取每日计划详情失败:', error);
    res.status(500).json({ success: false, error: '获取每日计划详情失败' });
  }
});

/**
 * 创建或更新每日计划
 * POST /api/daily-plans
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, planDate, planData, createdBy } = req.body;

    if (!planDate || !planData) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const newId = id || `DP${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 检查是否已存在该日期的计划
    const existing = queryToObjects(
      db,
      'SELECT id FROM daily_plans WHERE plan_date = ?',
      [planDate]
    );

    if (existing && existing.length > 0) {
      // 更新现有记录
      db.run(
        `UPDATE daily_plans SET plan_data = ?, updated_at = ? WHERE plan_date = ?`,
        [JSON.stringify(planData), now, planDate]
      );
      saveDatabase();
      res.json({ success: true, data: { id: existing[0].id, planDate, updatedAt: now } });
    } else {
      // 创建新记录
      db.run(
        `INSERT INTO daily_plans (id, plan_date, plan_data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, planDate, JSON.stringify(planData), createdBy || '', now, now]
      );
      saveDatabase();
      res.status(201).json({ success: true, data: { id: newId, planDate, createdAt: now } });
    }
  } catch (error) {
    console.error('保存每日计划失败:', error);
    res.status(500).json({ success: false, error: '保存每日计划失败' });
  }
});

/**
 * 删除每日计划
 * DELETE /api/daily-plans/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM daily_plans WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除每日计划失败:', error);
    res.status(500).json({ success: false, error: '删除每日计划失败' });
  }
});

/**
 * 根据日期删除每日计划
 * DELETE /api/daily-plans/date/:date
 */
router.delete('/date/:date', (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM daily_plans WHERE plan_date = ?', [date]);
    saveDatabase();

    res.json({ success: true, data: { date } });
  } catch (error) {
    console.error('删除每日计划失败:', error);
    res.status(500).json({ success: false, error: '删除每日计划失败' });
  }
});

export default router;
