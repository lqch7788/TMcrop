/**
 * IoT 预警信息路由（2026-08-29）
 * 对接 iot_alerts 表，前端 AlertInfo.tsx 真实数据源
 *
 * - GET /api/iot-alerts — 列表（支持 status 筛选 + 关键词搜索）
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/**
 * GET /api/iot-alerts
 * Query: status=pending|processed|processing（可选）; keyword=...（可选）
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, keyword } = req.query;
    const db = getDatabase();

    let sql = "SELECT * FROM iot_alerts WHERE 1=1";
    const params: unknown[] = [];
    if (status && typeof status === 'string') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      sql += ' AND (title LIKE ? OR message LIKE ? OR alert_code LIKE ?)';
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw, kw);
    }
    sql += ' ORDER BY create_time DESC';

    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('[iotAlerts] 列表查询失败:', error);
    res.status(500).json({ success: false, error: '预警列表查询失败', code: 'IOT_ALERTS_LIST_FAILED' });
  }
});

export default router;