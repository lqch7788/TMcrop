/**
 * v0.3 P0-1：批次统一时间线 API 路由
 *
 * 功能：
 *   GET /api/batch-timeline/:batchCode
 *     - 返回某批次所有事件流（任务/作业/采收/每日记录/移栽）
 *     - 支持日期范围 + 事件类型过滤 + 分页
 *
 * 原则：
 *   - 不删改任何现有 API
 *   - 仅新增路由
 *   - 全程只读查询（不修改任何数据）
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/**
 * GET /api/batch-timeline/:batchCode
 *
 * Query 参数：
 *   - startDate?: string (YYYY-MM-DD)
 *   - endDate?: string (YYYY-MM-DD)
 *   - eventTypes?: string (逗号分隔：farm_task,operation,daily_record,harvest,move)
 *   - page?: number (默认 1)
 *   - pageSize?: number (默认 50, 上限 200)
 *
 * 返回：
 *   {
 *     success: true,
 *     data: {
 *       batchCode: string,
 *       items: Array<{
 *         eventType, id, eventDate, title, subtype, progress, status, operator, quantity, unit, detail
 *       }>,
 *       total: number,
 *       page: number,
 *       pageSize: number
 *     }
 *   }
 */
router.get('/:batchCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;
    const {
      startDate,
      endDate,
      eventTypes,
      page = '1',
      pageSize = '50',
    } = req.query as Record<string, string | undefined>;

    if (!batchCode || batchCode.trim() === '') {
      res.status(400).json({ success: false, error: 'batchCode 必填' });
      return;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    const offset = (pageNum - 1) * pageSizeNum;

    const db = getDatabase();

    // 构建 WHERE 子句
    const whereClauses: string[] = ['batch_code = ?'];
    const params: unknown[] = [batchCode];

    if (startDate) {
      whereClauses.push('event_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('event_date <= ?');
      params.push(endDate);
    }
    if (eventTypes) {
      const types = eventTypes.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        const placeholders = types.map(() => '?').join(',');
        whereClauses.push(`event_type IN (${placeholders})`);
        params.push(...types);
      }
    }

    const whereClause = whereClauses.join(' AND ');

    // 查询总数
    const countSql = `SELECT COUNT(*) AS cnt FROM batch_timeline_view WHERE ${whereClause}`;
    // sql.js 的 exec 第二参数需要 SqlValue[]，此处用 as any 跳过类型检查
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countResult = db.exec(countSql, params as any);
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? (countResult[0].values[0][0] as number)
      : 0;

    // 查询数据
    const dataSql = `
      SELECT event_type, id, batch_code, event_date, title, subtype,
             progress, status, operator, quantity, unit, detail
      FROM batch_timeline_view
      WHERE ${whereClause}
      ORDER BY event_date DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    // sql.js 的 exec 第二个参数是 SqlValue[]，此处 params + LIMIT/OFFSET 类型混合
    // 运行时类型推断失败，使用 any[] 跳过类型检查（仅此处）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataResult = db.exec(dataSql, [...params, pageSizeNum, offset] as any);

    // sql.js 的 exec 返回 [{ columns, values }]
    // 直接转成对象数组（避免 queryToObjects 的额外参数）
    const items: Record<string, unknown>[] = [];
    if (dataResult.length > 0 && dataResult[0].values.length > 0) {
      const cols = dataResult[0].columns;
      for (const row of dataResult[0].values) {
        const obj: Record<string, unknown> = {};
        cols.forEach((c, i) => {
          obj[c] = row[i];
        });
        items.push(obj);
      }
    }

    // detail 字段是 JSON 字符串，需解析
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedItems = (items as any[]).map((item: Record<string, unknown>) => {
      if (typeof item.detail === 'string') {
        try {
          item.detail = JSON.parse(item.detail);
        } catch {
          // 解析失败保持原值
        }
      }
      return item;
    });

    res.json({
      success: true,
      data: {
        batchCode,
        items: parsedItems,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[batchTimeline] 查询失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/batch-timeline/:batchCode/summary
 *
 * 返回某批次的事件类型分布统计
 */
router.get('/:batchCode/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;
    if (!batchCode) {
      res.status(400).json({ success: false, error: 'batchCode 必填' });
      return;
    }

    const db = getDatabase();
    const sql = `
      SELECT event_type, COUNT(*) AS cnt
      FROM batch_timeline_view
      WHERE batch_code = ?
      GROUP BY event_type
    `;
    const result = db.exec(sql, [batchCode]);

    const summary: Record<string, number> = {};
    if (result.length > 0) {
      const cols = result[0].columns;
      const typeIdx = cols.indexOf('event_type');
      const cntIdx = cols.indexOf('cnt');
      for (const row of result[0].values) {
        summary[row[typeIdx] as string] = row[cntIdx] as number;
      }
    }

    res.json({
      success: true,
      data: {
        batchCode,
        summary,
        total: Object.values(summary).reduce((a, b) => a + b, 0),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
