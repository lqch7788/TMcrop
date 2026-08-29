/**
 * IoT 能耗读数路由（2026-08-29）
 * 对接 iot_energy_readings 表，前端 EnergyMonitoring.tsx 真实数据源
 *
 * - GET /api/iot-energy-readings — 列表
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db, 'SELECT * FROM iot_energy_readings ORDER BY device_code ASC');
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('[iotEnergyReadings] 列表查询失败:', error);
    res.status(500).json({ success: false, error: '能耗读数列表查询失败', code: 'IOT_ENERGY_LIST_FAILED' });
  }
});

export default router;