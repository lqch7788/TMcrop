/**
 * 设备监控中心路由（2026-08-29）
 * 接入 monitoring_devices 表，前端 DeviceMonitor.tsx 真实数据源
 *
 * - GET /api/monitoring/devices — 列表（支持 status 筛选）
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/**
 * GET /api/monitoring/devices
 * Query: status=running|idle|offline（可选）
 */
router.get('/devices', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM monitoring_devices WHERE 1=1';
    const params: unknown[] = [];
    if (status && typeof status === 'string') {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY device_code ASC';

    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('[monitoringDevices] 列表查询失败:', error);
    res.status(500).json({ success: false, error: '设备监控列表查询失败', code: 'MONITORING_LIST_FAILED' });
  }
});

export default router;