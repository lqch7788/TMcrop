/**
 * 警报配置路由 — iAGS Warning 集成
 * 挂载于 /api/alarm-configs
 * 三级警报级别和通知联系人配置
 */
import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// ==================== 警报级别配置 ====================

/** 获取所有警报级别 GET /api/alarm-configs/levels */
router.get('/levels', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM alarm_level_configs ORDER BY level');
    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取警报级别失败:', error);
    res.status(500).json({ success: false, error: '获取警报级别失败' });
  }
});

/** 保存警报级别配置 PUT /api/alarm-configs/levels/:level */
router.put('/levels/:level', (req, res) => {
  try {
    const db = getDatabase();
    const { level_name, notify_email, notify_sms, notify_phone } = req.body;
    const now = new Date().toISOString();

    // upsert — 先检查是否存在
    const existing = db.exec('SELECT id FROM alarm_level_configs WHERE level = ?', [req.params.level]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`
        UPDATE alarm_level_configs SET level_name=?, notify_email=?, notify_sms=?, notify_phone=?, updated_at=?
        WHERE level=?
      `, [level_name, notify_email || 0, notify_sms || 0, notify_phone || 0, now, req.params.level]);
    } else {
      db.run(`
        INSERT INTO alarm_level_configs (level, level_name, notify_email, notify_sms, notify_phone, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [req.params.level, level_name, notify_email || 0, notify_sms || 0, notify_phone || 0, now]);
    }

    const result = db.exec('SELECT * FROM alarm_level_configs WHERE level = ?', [req.params.level]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('保存警报级别失败:', error);
    res.status(500).json({ success: false, error: '保存警报级别失败' });
  }
});

// ==================== 警报联系人 ====================

/** 获取某级别的联系人 GET /api/alarm-configs/contacts?level= */
router.get('/contacts', (req, res) => {
  try {
    const db = getDatabase();
    const { level } = req.query;
    const conditions: string[] = ['status = ?'];
    const params: any[] = ['active'];
    if (level) { conditions.push('level = ?'); params.push(level); }

    const result = db.exec(
      `SELECT * FROM alarm_contacts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params
    );
    if (result.length === 0) return res.json({ success: true, data: [] });
    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取警报联系人失败:', error);
    res.status(500).json({ success: false, error: '获取警报联系人失败' });
  }
});

/** 添加联系人 POST /api/alarm-configs/contacts */
router.post('/contacts', (req, res) => {
  try {
    const db = getDatabase();
    const { level, contact_name, contact_info, contact_type } = req.body;
    if (!level || !contact_name || !contact_info) {
      return res.status(400).json({ success: false, error: '级别、姓名和联系方式不能为空' });
    }

    const oid = `ac_${Date.now()}`;
    db.run(`
      INSERT INTO alarm_contacts (oid, level, contact_name, contact_info, contact_type)
      VALUES (?, ?, ?, ?, ?)
    `, [oid, level, contact_name, contact_info, contact_type || 'email']);

    const result = db.exec('SELECT * FROM alarm_contacts WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('添加联系人失败:', error);
    res.status(500).json({ success: false, error: '添加联系人失败' });
  }
});

/** 删除联系人（软删除） DELETE /api/alarm-configs/contacts/:oid */
router.delete('/contacts/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('UPDATE alarm_contacts SET status = ? WHERE oid = ?', ['inactive', req.params.oid]);
    res.json({ success: true, message: '联系人已删除' });
  } catch (error) {
    console.error('删除联系人失败:', error);
    res.status(500).json({ success: false, error: '删除联系人失败' });
  }
});

export default router;
