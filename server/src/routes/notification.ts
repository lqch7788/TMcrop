/**
 * 通知设置路由
 * 提供通知渠道和通知规则的 API
 */

import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// ============================================
// 通知渠道 API
// ============================================

/**
 * 获取所有通知渠道
 * GET /api/notifications/channels
 */
router.get('/channels', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, channel_code, channel_name, channel_type, is_active, config, created_at, updated_at
      FROM notification_channels
      ORDER BY channel_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const channels = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      // 解析 config JSON
      if (obj.config && typeof obj.config === 'string') {
        try {
          obj.config = JSON.parse(obj.config);
        } catch (e) {
          obj.config = {};
        }
      }
      return obj;
    });

    res.json({ success: true, data: channels });
  } catch (error) {
    console.error('获取通知渠道失败:', error);
    res.status(500).json({ success: false, error: '获取通知渠道失败' });
  }
});

/**
 * 创建通知渠道
 * POST /api/notifications/channels
 */
router.post('/channels', (req, res) => {
  try {
    const db = getDatabase();
    const { channelCode, channelName, channelType, isActive, config } = req.body;

    if (!channelCode || !channelName) {
      return res.status(400).json({ success: false, error: '渠道编码和名称不能为空' });
    }

    const oid = `NC${Date.now()}`;
    const id = `NC${Date.now()}`;
    const configJson = config ? JSON.stringify(config) : '{}';
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO notification_channels (id, oid, channel_code, channel_name, channel_type, is_active, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, oid, channelCode, channelName, channelType || 'in-app', isActive ? 1 : 0, configJson, now, now]);

    res.json({ success: true, message: '通知渠道创建成功' });
  } catch (error) {
    console.error('创建通知渠道失败:', error);
    res.status(500).json({ success: false, error: '创建通知渠道失败' });
  }
});

/**
 * 更新通知渠道
 * PUT /api/notifications/channels/:id
 */
router.put('/channels/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { channelCode, channelName, channelType, isActive, config } = req.body;

    const configJson = config ? JSON.stringify(config) : null;
    const now = new Date().toISOString();

    if (configJson) {
      db.run(`
        UPDATE notification_channels
        SET channel_code = COALESCE(?, channel_code),
            channel_name = COALESCE(?, channel_name),
            channel_type = COALESCE(?, channel_type),
            is_active = COALESCE(?, is_active),
            config = ?,
            updated_at = ?
        WHERE id = ?
      `, [channelCode, channelName, channelType, isActive !== undefined ? (isActive ? 1 : 0) : null, configJson, now, id]);
    } else {
      db.run(`
        UPDATE notification_channels
        SET channel_code = COALESCE(?, channel_code),
            channel_name = COALESCE(?, channel_name),
            channel_type = COALESCE(?, channel_type),
            is_active = COALESCE(?, is_active),
            updated_at = ?
        WHERE id = ?
      `, [channelCode, channelName, channelType, isActive !== undefined ? (isActive ? 1 : 0) : null, now, id]);
    }

    res.json({ success: true, message: '通知渠道更新成功' });
  } catch (error) {
    console.error('更新通知渠道失败:', error);
    res.status(500).json({ success: false, error: '更新通知渠道失败' });
  }
});

/**
 * 删除通知渠道
 * DELETE /api/notifications/channels/:id
 */
router.delete('/channels/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    db.run(`DELETE FROM notification_channels WHERE id = ?`, [id]);

    res.json({ success: true, message: '通知渠道删除成功' });
  } catch (error) {
    console.error('删除通知渠道失败:', error);
    res.status(500).json({ success: false, error: '删除通知渠道失败' });
  }
});

/**
 * 切换通知渠道状态
 * PATCH /api/notifications/channels/:id/toggle
 */
router.patch('/channels/:id/toggle', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 先获取当前状态
    const result = db.exec(`SELECT is_active FROM notification_channels WHERE id = ?`, [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '通知渠道不存在' });
    }

    const currentActive = result[0].values[0][0];
    const newActive = currentActive ? 0 : 1;
    const now = new Date().toISOString();

    db.run(`UPDATE notification_channels SET is_active = ?, updated_at = ? WHERE id = ?`, [newActive, now, id]);

    res.json({ success: true, message: '通知渠道状态切换成功' });
  } catch (error) {
    console.error('切换通知渠道状态失败:', error);
    res.status(500).json({ success: false, error: '切换通知渠道状态失败' });
  }
});

// ============================================
// 通知规则 API
// ============================================

/**
 * 获取所有通知规则
 * GET /api/notifications/rules
 */
router.get('/rules', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec(`
      SELECT id, oid, rule_code, rule_name, event_type, recipient_type, recipient_ids,
             channel_ids, frequency, template, is_active, created_at, updated_at
      FROM notification_rules
      ORDER BY rule_code
    `);

    if (result.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const columns = result[0].columns;
    const rules = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => {
        const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        obj[camelCol] = row[i];
      });
      // 解析 JSON 字段
      if (obj.recipientIds && typeof obj.recipientIds === 'string') {
        try {
          obj.recipientIds = JSON.parse(obj.recipientIds);
        } catch (e) {
          obj.recipientIds = obj.recipientIds.split(',');
        }
      }
      if (obj.channelIds && typeof obj.channelIds === 'string') {
        try {
          obj.channelIds = JSON.parse(obj.channelIds);
        } catch (e) {
          obj.channelIds = obj.channelIds.split(',');
        }
      }
      return obj;
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('获取通知规则失败:', error);
    res.status(500).json({ success: false, error: '获取通知规则失败' });
  }
});

/**
 * 创建通知规则
 * POST /api/notifications/rules
 */
router.post('/rules', (req, res) => {
  try {
    const db = getDatabase();
    const { ruleCode, ruleName, eventType, recipientType, recipientIds, channelIds, frequency, template, isActive } = req.body;

    if (!ruleCode || !ruleName) {
      return res.status(400).json({ success: false, error: '规则编码和名称不能为空' });
    }

    const oid = `NR${Date.now()}`;
    const id = `NR${Date.now()}`;
    const recipientIdsJson = Array.isArray(recipientIds) ? JSON.stringify(recipientIds) : recipientIds;
    const channelIdsJson = Array.isArray(channelIds) ? JSON.stringify(channelIds) : channelIds;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO notification_rules (id, oid, rule_code, rule_name, event_type, recipient_type, recipient_ids, channel_ids, frequency, template, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, oid, ruleCode, ruleName, eventType || '', recipientType || '', recipientIdsJson || '[]', channelIdsJson || '[]', frequency || 'immediate', template || '', isActive ? 1 : 0, now, now]);

    res.json({ success: true, message: '通知规则创建成功' });
  } catch (error) {
    console.error('创建通知规则失败:', error);
    res.status(500).json({ success: false, error: '创建通知规则失败' });
  }
});

/**
 * 更新通知规则
 * PUT /api/notifications/rules/:id
 */
router.put('/rules/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { ruleCode, ruleName, eventType, recipientType, recipientIds, channelIds, frequency, template, isActive } = req.body;

    const recipientIdsJson = Array.isArray(recipientIds) ? JSON.stringify(recipientIds) : recipientIds;
    const channelIdsJson = Array.isArray(channelIds) ? JSON.stringify(channelIds) : channelIds;
    const now = new Date().toISOString();

    db.run(`
      UPDATE notification_rules
      SET rule_code = COALESCE(?, rule_code),
          rule_name = COALESCE(?, rule_name),
          event_type = COALESCE(?, event_type),
          recipient_type = COALESCE(?, recipient_type),
          recipient_ids = ?,
          channel_ids = ?,
          frequency = COALESCE(?, frequency),
          template = COALESCE(?, template),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `, [ruleCode, ruleName, eventType, recipientType, recipientIdsJson, channelIdsJson, frequency, template, isActive !== undefined ? (isActive ? 1 : 0) : null, now, id]);

    res.json({ success: true, message: '通知规则更新成功' });
  } catch (error) {
    console.error('更新通知规则失败:', error);
    res.status(500).json({ success: false, error: '更新通知规则失败' });
  }
});

/**
 * 删除通知规则
 * DELETE /api/notifications/rules/:id
 */
router.delete('/rules/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    db.run(`DELETE FROM notification_rules WHERE id = ?`, [id]);

    res.json({ success: true, message: '通知规则删除成功' });
  } catch (error) {
    console.error('删除通知规则失败:', error);
    res.status(500).json({ success: false, error: '删除通知规则失败' });
  }
});

/**
 * 切换通知规则状态
 * PATCH /api/notifications/rules/:id/toggle
 */
router.patch('/rules/:id/toggle', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 先获取当前状态
    const result = db.exec(`SELECT is_active FROM notification_rules WHERE id = ?`, [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '通知规则不存在' });
    }

    const currentActive = result[0].values[0][0];
    const newActive = currentActive ? 0 : 1;
    const now = new Date().toISOString();

    db.run(`UPDATE notification_rules SET is_active = ?, updated_at = ? WHERE id = ?`, [newActive, now, id]);

    res.json({ success: true, message: '通知规则状态切换成功' });
  } catch (error) {
    console.error('切换通知规则状态失败:', error);
    res.status(500).json({ success: false, error: '切换通知规则状态失败' });
  }
});

// ============================================
// 通知偏好 API
// ============================================

/**
 * 获取用户通知偏好
 * GET /api/notifications/preferences/:userOid
 */
router.get('/preferences/:userOid', (req, res) => {
  try {
    const db = getDatabase();
    const { userOid } = req.params;

    const result = db.exec(`
      SELECT id, user_oid, approval_notify, alert_notify, daily_summary, announcement_notify,
             dnd_enabled, dnd_start_time, dnd_end_time, created_at, updated_at
      FROM notification_preferences
      WHERE user_oid = ? AND status = 'active'
    `, [userOid]);

    if (result.length === 0 || result[0].values.length === 0) {
      // 返回默认偏好
      return res.json({
        success: true,
        data: {
          userOid,
          approvalNotify: true,
          alertNotify: true,
          dailySummary: false,
          announcementNotify: true,
          dndEnabled: false,
          dndStartTime: '22:00',
          dndEndTime: '08:00',
        },
      });
    }

    const columns = result[0].columns;
    const row = result[0].values[0];
    const obj: any = {};
    columns.forEach((col, i) => {
      const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      obj[camelCol] = row[i];
    });

    res.json({ success: true, data: obj });
  } catch (error) {
    console.error('获取通知偏好失败:', error);
    res.status(500).json({ success: false, error: '获取通知偏好失败' });
  }
});

/**
 * 保存用户通知偏好（upsert）
 * PUT /api/notifications/preferences/:userOid
 */
router.put('/preferences/:userOid', (req, res) => {
  try {
    const db = getDatabase();
    const { userOid } = req.params;
    const { approvalNotify, alertNotify, dailySummary, announcementNotify, dndEnabled, dndStartTime, dndEndTime } = req.body;
    const now = new Date().toISOString();

    // 检查是否已存在
    const existing = db.exec(`SELECT id FROM notification_preferences WHERE user_oid = ?`, [userOid]);

    if (existing.length > 0 && existing[0].values.length > 0) {
      // 更新
      db.run(`
        UPDATE notification_preferences
        SET approval_notify = COALESCE(?, approval_notify),
            alert_notify = COALESCE(?, alert_notify),
            daily_summary = COALESCE(?, daily_summary),
            announcement_notify = COALESCE(?, announcement_notify),
            dnd_enabled = COALESCE(?, dnd_enabled),
            dnd_start_time = COALESCE(?, dnd_start_time),
            dnd_end_time = COALESCE(?, dnd_end_time),
            updated_at = ?
        WHERE user_oid = ?
      `, [
        approvalNotify !== undefined ? (approvalNotify ? 1 : 0) : null,
        alertNotify !== undefined ? (alertNotify ? 1 : 0) : null,
        dailySummary !== undefined ? (dailySummary ? 1 : 0) : null,
        announcementNotify !== undefined ? (announcementNotify ? 1 : 0) : null,
        dndEnabled !== undefined ? (dndEnabled ? 1 : 0) : null,
        dndStartTime, dndEndTime, now, userOid,
      ]);
    } else {
      // 插入
      db.run(`
        INSERT INTO notification_preferences (user_oid, approval_notify, alert_notify, daily_summary, announcement_notify, dnd_enabled, dnd_start_time, dnd_end_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userOid,
        approvalNotify !== false ? 1 : 0,
        alertNotify !== false ? 1 : 0,
        dailySummary ? 1 : 0,
        announcementNotify !== false ? 1 : 0,
        dndEnabled ? 1 : 0,
        dndStartTime || '22:00',
        dndEndTime || '08:00',
        now, now,
      ]);
    }

    res.json({ success: true, message: '通知偏好保存成功' });
  } catch (error) {
    console.error('保存通知偏好失败:', error);
    res.status(500).json({ success: false, error: '保存通知偏好失败' });
  }
});

export default router;
