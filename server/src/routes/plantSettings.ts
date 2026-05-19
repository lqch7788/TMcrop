/**
 * 种植设置路由 — iAGS Plantset 集成
 * 挂载于 /api/plant-settings
 * 种植图标和品种种植参数配置
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取种植设置列表 GET /api/plant-settings */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { crop_variety_oid, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (crop_variety_oid) { conditions.push('crop_variety_oid = ?'); params.push(crop_variety_oid); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = db.exec(`SELECT * FROM plant_settings ${where} ORDER BY created_at DESC`, params);

    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取种植设置失败:', error);
    res.status(500).json({ success: false, error: '获取种植设置失败' });
  }
});

/** 创建设置 POST /api/plant-settings */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { setting_key, setting_value, crop_variety_oid, icon_url, description } = req.body;
    if (!setting_key) return res.status(400).json({ success: false, error: '设置键不能为空' });

    const oid = `ps_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO plant_settings (oid, setting_key, setting_value, crop_variety_oid, icon_url, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [oid, setting_key, setting_value || null, crop_variety_oid || null, icon_url || null, description || null, now, now]);

    const result = db.exec('SELECT * FROM plant_settings WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('创建种植设置失败:', error);
    res.status(500).json({ success: false, error: '创建种植设置失败' });
  }
});

/** 更新设置 PUT /api/plant-settings/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { setting_key, setting_value, crop_variety_oid, icon_url, description, status } = req.body;
    const now = new Date().toISOString();

    db.run(`
      UPDATE plant_settings SET setting_key=?, setting_value=?, crop_variety_oid=?, icon_url=?, description=?, status=?, updated_at=?
      WHERE oid=?
    `, [setting_key, setting_value || null, crop_variety_oid || null, icon_url || null, description || null, status || 'active', now, req.params.oid]);

    const result = db.exec('SELECT * FROM plant_settings WHERE oid = ?', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '设置不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新种植设置失败:', error);
    res.status(500).json({ success: false, error: '更新种植设置失败' });
  }
});

/** 删除设置 DELETE /api/plant-settings/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM plant_settings WHERE oid = ?', [req.params.oid]);
    res.json({ success: true, message: '设置已删除' });
  } catch (error) {
    console.error('删除种植设置失败:', error);
    res.status(500).json({ success: false, error: '删除种植设置失败' });
  }
});

export default router;
