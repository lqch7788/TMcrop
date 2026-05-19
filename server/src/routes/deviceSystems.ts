/**
 * 设备系统路由 — iAGS deviceSystem 集成
 * 挂载于 /api/device-systems
 * 管理系统类型定义和IDC关联
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取系统列表 GET /api/device-systems */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { keyword, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (keyword) {
      conditions.push('(system_name LIKE ? OR system_code LIKE ? OR description LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`SELECT * FROM device_systems ${where} ORDER BY created_at DESC`, params);

    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取设备系统列表失败:', error);
    res.status(500).json({ success: false, error: '获取设备系统列表失败' });
  }
});

/** 创建系统 POST /api/device-systems */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { system_code, system_name, idc_url, idc_token, description } = req.body;

    if (!system_code || !system_name) {
      return res.status(400).json({ success: false, error: '系统编码和名称不能为空' });
    }

    // 检查编码唯一性
    const existing = db.exec('SELECT oid FROM device_systems WHERE system_code = ?', [system_code]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ success: false, error: '该系统编码已存在' });
    }

    const oid = `ds_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO device_systems (oid, system_code, system_name, idc_url, idc_token, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, system_code, system_name, idc_url || null, idc_token || null, description || null, now, now]);

    const result = db.exec('SELECT * FROM device_systems WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建设备系统失败:', error);
    res.status(500).json({ success: false, error: '创建设备系统失败' });
  }
});

/** 更新系统 PUT /api/device-systems/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { system_code, system_name, idc_url, idc_token, description, status } = req.body;

    const now = new Date().toISOString();
    db.run(`
      UPDATE device_systems SET system_code=?, system_name=?, idc_url=?, idc_token=?, description=?, status=?, updated_at=?
      WHERE oid=?
    `, [system_code, system_name, idc_url || null, idc_token || null, description || null, status || 'active', now, req.params.oid]);

    const result = db.exec('SELECT * FROM device_systems WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '系统不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新设备系统失败:', error);
    res.status(500).json({ success: false, error: '更新设备系统失败' });
  }
});

/** 删除系统 DELETE /api/device-systems/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM device_systems WHERE oid = ?', [req.params.oid]);
    res.json({ success: true, message: '系统已删除' });
  } catch (error) {
    console.error('删除设备系统失败:', error);
    res.status(500).json({ success: false, error: '删除设备系统失败' });
  }
});

export default router;
