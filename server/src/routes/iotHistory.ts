/**
 * IoT 历史数据路由（2026-08-29）
 * 对接 iot_history 表，前端 HistoryData.tsx 真实数据源
 *
 * - GET /api/iot-history — 列表（支持 data_type 筛选 + 关键词搜索）
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { dataType, keyword } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM iot_history WHERE 1=1';
    const params: unknown[] = [];
    if (dataType && typeof dataType === 'string' && dataType !== '全部') {
      sql += ' AND data_type = ?';
      params.push(dataType);
    }
    if (keyword && typeof keyword === 'string' && keyword.trim()) {
      sql += ' AND (sensor_name LIKE ? OR sensor_code LIKE ? OR record_code LIKE ?)';
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw, kw);
    }
    sql += ' ORDER BY timestamp DESC';
    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('[iotHistory] 列表查询失败:', error);
    res.status(500).json({ success: false, error: '历史数据列表查询失败', code: 'IOT_HISTORY_LIST_FAILED' });
  }
});

export default router;