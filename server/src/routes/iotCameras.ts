/**
 * IoT 视频监控路由（2026-08-29）
 * 对接 iot_cameras 表，前端 VideoMonitor.tsx 真实数据源
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db, 'SELECT * FROM iot_cameras ORDER BY device_code ASC');
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('[iotCameras] 列表查询失败:', error);
    res.status(500).json({ success: false, error: '摄像头列表查询失败', code: 'IOT_CAMERAS_LIST_FAILED' });
  }
});

export default router;