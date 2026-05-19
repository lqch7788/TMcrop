/**
 * 摄像头路由 — iAGS Camera 集成
 * 挂载于 /api/cameras
 * 摄像头注册和RTSP视频流地址配置
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取摄像头列表 GET /api/cameras */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { keyword, status, partition_oid } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (partition_oid) { conditions.push('partition_oid = ?'); params.push(partition_oid); }
    if (keyword) {
      conditions.push('(camera_name LIKE ? OR camera_code LIKE ? OR brand LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`
      SELECT c.*, fp.name as partition_name
      FROM camera_devices c
      LEFT JOIN farm_partitions fp ON c.partition_oid = fp.oid
      ${where}
      ORDER BY c.created_at DESC
    `, params);

    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取摄像头列表失败:', error);
    res.status(500).json({ success: false, error: '获取摄像头列表失败' });
  }
});

/** 创建摄像头 POST /api/cameras */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { camera_name, camera_code, rtsp_url, http_url, partition_oid, greenhouse_oid, brand, model, username, password, channel_count } = req.body;

    if (!camera_name) return res.status(400).json({ success: false, error: '摄像头名称不能为空' });

    const oid = `cam_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO camera_devices (oid, camera_name, camera_code, rtsp_url, http_url, partition_oid, greenhouse_oid, brand, model, username, password, channel_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, camera_name, camera_code || null, rtsp_url || null, http_url || null, partition_oid || null, greenhouse_oid || null, brand || null, model || null, username || null, password || null, channel_count || 1, now, now]);

    const result = db.exec('SELECT * FROM camera_devices WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建摄像头失败:', error);
    res.status(500).json({ success: false, error: '创建摄像头失败' });
  }
});

/** 更新摄像头 PUT /api/cameras/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { camera_name, camera_code, rtsp_url, http_url, partition_oid, greenhouse_oid, brand, model, username, password, channel_count, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE camera_devices SET camera_name=?, camera_code=?, rtsp_url=?, http_url=?, partition_oid=?, greenhouse_oid=?, brand=?, model=?, username=?, password=?, channel_count=?, status=?, updated_at=?
      WHERE oid=?
    `, [camera_name, camera_code || null, rtsp_url || null, http_url || null, partition_oid || null, greenhouse_oid || null, brand || null, model || null, username || null, password || null, channel_count || 1, status || 'active', now, req.params.oid]);

    const result = db.exec('SELECT * FROM camera_devices WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '摄像头不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新摄像头失败:', error);
    res.status(500).json({ success: false, error: '更新摄像头失败' });
  }
});

/** 删除摄像头 DELETE /api/cameras/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM camera_devices WHERE oid = ?', [req.params.oid]);
    res.json({ success: true, message: '摄像头已删除' });
  } catch (error) {
    console.error('删除摄像头失败:', error);
    res.status(500).json({ success: false, error: '删除摄像头失败' });
  }
});

export default router;
