/**
 * 数据同步路由
 * 支持多端数据同步和离线支持
 */

import { Router } from 'express';
import { syncService } from '../../services/syncService';

const router = Router();

/**
 * POST /api/sync/device
 * 注册设备
 */
router.post('/device', (req, res) => {
  try {
    const { deviceId, deviceInfo } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId 是必需的',
      });
    }

    const device = syncService.registerDevice(deviceId, deviceInfo || {});
    res.json({
      success: true,
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/status
 * 获取同步状态
 */
router.get('/status', (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId 是必需的',
      });
    }

    const status = syncService.getSyncStatus(deviceId);
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/pull
 * 拉取服务器变更（增量同步）
 */
router.post('/pull', (req, res) => {
  try {
    const { deviceId, since, tables, conflictStrategy } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId 是必需的',
      });
    }

    const result = syncService.requestSync(deviceId, { since, tables, conflictStrategy });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/push
 * 推送客户端变更到服务器
 */
router.post('/push', (req, res) => {
  try {
    const { deviceId, changes } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId 是必需的',
      });
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'changes 是必需的，且必须是非空数组',
      });
    }

    const result = syncService.submitChanges(deviceId, changes);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sync/full
 * 完整同步（推送+拉取）
 */
router.post('/full', (req, res) => {
  try {
    const { deviceId, changes, since, tables, conflictStrategy } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId 是必需的',
      });
    }

    // 先推送变更
    let pushResult = { success: true, results: [] };
    if (Array.isArray(changes) && changes.length > 0) {
      pushResult = syncService.submitChanges(deviceId, changes);
    }

    // 再拉取变更
    const pullResult = syncService.requestSync(deviceId, { since, tables, conflictStrategy });

    res.json({
      success: true,
      data: {
        push: pushResult,
        pull: pullResult.data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sync/devices
 * 获取设备的同步历史
 */
router.get('/devices', (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId 是必需的',
      });
    }

    // 这里需要从设备注册表获取，简化实现
    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
