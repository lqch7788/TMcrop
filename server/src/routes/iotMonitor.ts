/**
 * IoT设备监控路由
 * 从 iot_sensors 表读取数据，种子数据来自前端 mockData
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/**
 * 获取传感器列表
 * GET /api/iot/devices
 */
router.get('/devices', (req: Request, res: Response) => {
  try {
    const { greenhouse_id, device_type, status, page = '1', limit = '100' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM iot_sensors WHERE 1=1';
    const params: any[] = [];

    if (greenhouse_id) {
      sql += ' AND greenhouse_id = ?';
      params.push(greenhouse_id);
    }
    if (device_type) {
      sql += ' AND type = ?';
      params.push(device_type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY greenhouse_id, type';

    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    // 查询总数
    let countSql = 'SELECT COUNT(*) as total FROM iot_sensors WHERE 1=1';
    const countParams: any[] = [];
    if (greenhouse_id) { countSql += ' AND greenhouse_id = ?'; countParams.push(greenhouse_id); }
    if (device_type) { countSql += ' AND type = ?'; countParams.push(device_type); }
    if (status) { countSql += ' AND status = ?'; countParams.push(status); }

    const countStmt = db.prepare(countSql);
    countStmt.bind(countParams);
    let total = 0;
    if (countStmt.step()) {
      total = countStmt.getAsObject().total as number;
    }
    countStmt.free();

    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('获取设备列表失败:', error);
    res.status(500).json({ success: false, error: '获取设备列表失败' });
  }
});

/**
 * 获取单个传感器
 * GET /api/iot/devices/:id
 */
router.get('/devices/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM iot_sensors WHERE id = ?');
    stmt.bind([id]);
    let device: any = null;
    if (stmt.step()) {
      device = stmt.getAsObject();
    }
    stmt.free();

    if (!device) {
      return res.status(404).json({ success: false, error: '传感器不存在' });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    console.error('获取传感器详情失败:', error);
    res.status(500).json({ success: false, error: '获取传感器详情失败' });
  }
});

/**
 * 获取传感器最新数据
 * GET /api/iot/devices/:id/latest
 */
router.get('/devices/:id/latest', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM iot_sensors WHERE id = ?');
    stmt.bind([id]);
    let device: any = null;
    if (stmt.step()) {
      device = stmt.getAsObject();
    }
    stmt.free();

    if (!device) {
      return res.status(404).json({ success: false, error: '传感器不存在' });
    }

    res.json({
      success: true,
      data: {
        device_id: device.id,
        device_code: device.sensor_id,
        status: device.status,
        type: device.type,
        type_name: device.type_name,
        value: device.value,
        unit: device.unit,
        last_report_time: device.last_update,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('获取传感器最新数据失败:', error);
    res.status(500).json({ success: false, error: '获取传感器最新数据失败' });
  }
});

/**
 * 获取环境数据趋势（基于传感器聚合）
 * GET /api/iot/environment
 */
router.get('/environment', (req: Request, res: Response) => {
  try {
    const { greenhouse_id, data_type = 'temperature' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM iot_sensors WHERE 1=1';
    const params: any[] = [];

    if (greenhouse_id) {
      sql += ' AND greenhouse_id = ?';
      params.push(greenhouse_id);
    }

    // 按类型筛选
    if (data_type === 'temperature') {
      sql += ' AND type IN (?, ?)';
      params.push('air_temp', 'soil_temp');
    } else if (data_type === 'humidity') {
      sql += ' AND type IN (?, ?)';
      params.push('air_humidity', 'soil_moisture');
    } else if (data_type === 'light') {
      sql += ' AND type = ?';
      params.push('light');
    } else if (data_type === 'co2') {
      sql += ' AND type = ?';
      params.push('co2');
    }

    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { greenhouse_id, data_type },
    });
  } catch (error) {
    console.error('获取环境数据失败:', error);
    res.status(500).json({ success: false, error: '获取环境数据失败' });
  }
});

export default router;
