/**
 * v0.3 P1-4：批次成本归集 API 路由
 *
 * 路径：
 *   GET /api/batch-cost/:batchCode        - 单批次成本详情
 *   GET /api/batch-cost                  - 多批次成本列表（支持过滤）
 *   GET /api/batch-cost/summary/crop     - 按作物汇总
 *
 * 设计原则：
 *   - 不修改任何现有 API
 *   - 完全基于 batch_cost_aggregation 视图
 *   - 工资模式区分（小时/天/件/月薪）由调用方处理
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

function rowsToObjects(result: Array<{ columns: string[]; values: unknown[][] }>): Record<string, unknown>[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  const out: Record<string, unknown>[] = [];
  for (const row of result[0].values) {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      obj[c] = row[i];
    });
    out.push(obj);
  }
  return out;
}

/**
 * GET /api/batch-cost/:batchCode
 */
router.get('/:batchCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;
    const db = getDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec('SELECT * FROM batch_cost_aggregation WHERE batch_code = ?', [batchCode] as any[]);
    const items = rowsToObjects(result);
    if (items.length === 0) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }
    res.json({ success: true, data: items[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/batch-cost
 * Query: crop_name, greenhouse_name, min_total_cost, limit
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { crop_name, greenhouse_name, min_total_cost, limit } = req.query as Record<string, string | undefined>;
    const db = getDatabase();

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    if (crop_name) {
      whereClauses.push('crop_name = ?');
      params.push(crop_name);
    }
    if (greenhouse_name) {
      whereClauses.push('greenhouse_name = ?');
      params.push(greenhouse_name);
    }
    if (min_total_cost) {
      whereClauses.push('total_cost >= ?');
      params.push(Number(min_total_cost));
    }
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const lim = Math.min(500, Number(limit) || 100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(
      `SELECT * FROM batch_cost_aggregation ${whereClause} ORDER BY total_cost DESC LIMIT ?`,
      [...params, lim] as any[]
    );

    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/batch-cost/summary/crop
 * 按作物汇总
 */
router.get('/summary/crop', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT
        crop_name,
        COUNT(*) AS batch_count,
        SUM(total_cost) AS total_cost,
        AVG(cost_per_unit) AS avg_cost_per_unit,
        SUM(operation_count) AS total_operations,
        SUM(task_count) AS total_tasks
      FROM batch_cost_aggregation
      GROUP BY crop_name
      ORDER BY total_cost DESC
    `);
    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
