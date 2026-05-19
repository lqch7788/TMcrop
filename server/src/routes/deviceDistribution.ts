/**
 * 设备分配路由 — iAGS DeviceDistribution 集成
 * 挂载于 /api/device-distributions
 * IoT设备分配到温室/区域 + 运行参数配置（预留端口）
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取设备分配列表 GET /api/device-distributions */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { site_name, device_type, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (site_name) { conditions.push('site_name = ?'); params.push(site_name); }
    if (device_type) { conditions.push('device_type = ?'); params.push(device_type); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`SELECT * FROM device_distributions ${where} ORDER BY sort_order ASC, created_at DESC`, params);

    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取设备分配列表失败:', error);
    res.status(500).json({ success: false, error: '获取设备分配列表失败' });
  }
});

/** 创建分配记录 POST /api/device-distributions */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const {
      device_name, device_code, site_name, area_name, device_type,
      motor_name, sort_order, allow_runtime, rest_time, initial_status,
      circuit, slave_devices, start_time, show_curve, specs, remarks
    } = req.body;
    if (!device_name) return res.status(400).json({ success: false, error: '设备名称不能为空' });

    const oid = `dd_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO device_distributions
        (oid, device_name, device_code, site_name, area_name, device_type,
         motor_name, sort_order, allow_runtime, rest_time, initial_status,
         circuit, slave_devices, start_time, show_curve, specs, remarks,
         status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [
      oid, device_name, device_code || null, site_name || null, area_name || null,
      device_type || null, motor_name || null, sort_order || 0, allow_runtime || null,
      rest_time || null, initial_status || null, circuit || null, slave_devices || null,
      start_time || null, show_curve || 0, specs || null, remarks || null, now, now
    ]);

    const result = db.exec('SELECT * FROM device_distributions WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建设备分配失败:', error);
    res.status(500).json({ success: false, error: '创建设备分配失败' });
  }
});

/** 更新分配记录 PUT /api/device-distributions/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const {
      device_name, device_code, site_name, area_name, device_type,
      motor_name, sort_order, allow_runtime, rest_time, initial_status,
      circuit, slave_devices, start_time, show_curve, specs, remarks, status
    } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE device_distributions SET
        device_name=?, device_code=?, site_name=?, area_name=?, device_type=?,
        motor_name=?, sort_order=?, allow_runtime=?, rest_time=?, initial_status=?,
        circuit=?, slave_devices=?, start_time=?, show_curve=?, specs=?, remarks=?,
        status=?, updated_at=?
      WHERE oid=?
    `, [
      device_name, device_code || null, site_name || null, area_name || null, device_type || null,
      motor_name || null, sort_order || 0, allow_runtime || null, rest_time || null, initial_status || null,
      circuit || null, slave_devices || null, start_time || null, show_curve || 0, specs || null, remarks || null,
      status || 'active', now, req.params.oid
    ]);

    const result = db.exec('SELECT * FROM device_distributions WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '分配记录不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新设备分配失败:', error);
    res.status(500).json({ success: false, error: '更新设备分配失败' });
  }
});

/** 删除分配记录 DELETE /api/device-distributions/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM device_distributions WHERE oid = ?', [req.params.oid]);
    res.json({ success: true, message: '分配记录已删除' });
  } catch (error) {
    console.error('删除设备分配失败:', error);
    res.status(500).json({ success: false, error: '删除设备分配失败' });
  }
});

export default router;
