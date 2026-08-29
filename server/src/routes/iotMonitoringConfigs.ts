/**
 * IoT 监测配置路由（2026-08-29）
 * 对接 iot_monitoring_configs 表，前端 MonitoringConfig.tsx 真实数据源
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db, 'SELECT * FROM iot_monitoring_configs ORDER BY config_code ASC');
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('[iotMonitoringConfigs] 列表查询失败:', error);
    res.status(500).json({ success: false, error: '监测配置列表查询失败', code: 'IOT_CONFIG_LIST_FAILED' });
  }
});

export default router;