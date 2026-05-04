/**
 * 多端同步服务
 * 支持多设备间数据同步和离线支持
 *
 * 功能：
 * - 设备注册与识别
 * - 数据变更追踪
 * - 增量同步
 * - 冲突检测与解决
 */

const fs = require('fs');
const path = require('path');

// 同步配置
const CONFIG = {
  // 同步记录文件路径
  SYNC_FILE: path.join(__dirname, '../data/sync_records.json'),

  // 冲突解决策略
  CONFLICT_STRATEGIES: {
    LAST_WRITE_WINS: 'last_write_wins',   // 最后写入优先
    SERVER_WINS: 'server_wins',           // 服务器优先
    CLIENT_WINS: 'client_wins',           // 客户端优先
    MERGE: 'merge',                       // 合并
  },

  // 默认冲突策略
  defaultConflictStrategy: 'last_write_wins',
};

/**
 * 设备注册记录
 */
class DeviceRegistry {
  constructor() {
    this.devices = this.loadDevices();
  }

  loadDevices() {
    try {
      if (fs.existsSync(CONFIG.SYNC_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG.SYNC_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('[Sync] 加载设备注册失败:', e);
    }
    return { devices: [], lastSync: {} };
  }

  saveDevices() {
    try {
      fs.writeFileSync(CONFIG.SYNC_FILE, JSON.stringify(this.devices, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Sync] 保存设备注册失败:', e);
    }
  }

  /**
   * 注册新设备
   */
  registerDevice(deviceId, deviceInfo) {
    const existing = this.devices.devices.find(d => d.deviceId === deviceId);

    if (existing) {
      existing.lastSeen = new Date().toISOString();
      existing.deviceInfo = { ...existing.deviceInfo, ...deviceInfo };
    } else {
      this.devices.devices.push({
        deviceId,
        deviceInfo,
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }

    this.saveDevices();
    return existing || this.devices.devices.find(d => d.deviceId === deviceId);
  }

  /**
   * 获取设备列表
   */
  getDevices(userId) {
    return this.devices.devices.filter(d => d.deviceInfo?.userId === userId);
  }

  /**
   * 更新设备最后同步时间
   */
  updateLastSync(deviceId, syncTime) {
    this.devices.lastSync[deviceId] = syncTime;
    this.saveDevices();
  }

  /**
   * 获取设备最后同步时间
   */
  getLastSync(deviceId) {
    return this.devices.lastSync[deviceId] || null;
  }
}

/**
 * 变更记录
 */
class ChangeTracker {
  constructor() {
    this.changes = [];
    this.maxChanges = 1000; // 保留最近1000条变更
  }

  /**
   * 记录数据变更
   */
  recordChange(deviceId, tableName, recordId, operation, oldValue, newValue, timestamp) {
    this.changes.push({
      id: this.generateId(),
      deviceId,
      tableName,
      recordId,
      operation, // 'create', 'update', 'delete'
      oldValue,
      newValue,
      timestamp: timestamp || new Date().toISOString(),
      synced: false,
    });

    // 清理过期变更
    if (this.changes.length > this.maxChanges) {
      this.changes = this.changes.slice(-this.maxChanges);
    }

    return this.changes[this.changes.length - 1];
  }

  /**
   * 获取未同步的变更
   */
  getUnsyncedChanges(deviceId, since) {
    return this.changes.filter(c =>
      !c.synced &&
      c.deviceId !== deviceId &&
      new Date(c.timestamp) > new Date(since)
    );
  }

  /**
   * 标记变更已同步
   */
  markSynced(changeIds) {
    this.changes.forEach(c => {
      if (changeIds.includes(c.id)) {
        c.synced = true;
      }
    });
  }

  /**
   * 获取设备的变更历史
   */
  getDeviceChanges(deviceId, tableName, since) {
    return this.changes.filter(c =>
      c.deviceId === deviceId &&
      (!tableName || c.tableName === tableName) &&
      new Date(c.timestamp) > new Date(since)
    );
  }

  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 冲突检测与解决
 */
class ConflictResolver {
  constructor(strategy = CONFIG.defaultConflictStrategy) {
    this.strategy = strategy;
  }

  /**
   * 检测冲突
   */
  detectConflict(localChange, serverChange) {
    if (!localChange || !serverChange) return false;

    // 如果服务器变更更新，则冲突
    return new Date(serverChange.timestamp) > new Date(localChange.baseTimestamp);
  }

  /**
   * 解决冲突
   */
  resolve(localChange, serverChange) {
    if (!this.detectConflict(localChange, serverChange)) {
      return { resolved: false, winner: null };
    }

    switch (this.strategy) {
      case CONFIG.CONFLICT_STRATEGIES.SERVER_WINS:
        return { resolved: true, winner: serverChange, loser: localChange };

      case CONFIG.CONFLICT_STRATEGIES.CLIENT_WINS:
        return { resolved: true, winner: localChange, loser: serverChange };

      case CONFIG.CONFLICT_STRATEGIES.LAST_WRITE_WINS:
        const winner = new Date(localChange.timestamp) > new Date(serverChange.timestamp)
          ? localChange
          : serverChange;
        const loser = winner === localChange ? serverChange : localChange;
        return { resolved: true, winner, loser };

      case CONFIG.CONFLICT_STRATEGIES.MERGE:
        // 简单的字段级合并
        const merged = this.mergeChanges(localChange, serverChange);
        return { resolved: true, winner: merged, loser: null, merged: true };

      default:
        return { resolved: false, winner: null };
    }
  }

  /**
   * 合并变更
   */
  mergeChanges(localChange, serverChange) {
    const localData = localChange.newValue || {};
    const serverData = serverChange.newValue || {};

    return {
      ...serverChange,
      newValue: { ...serverData, ...localData },
      timestamp: new Date().toISOString(),
      merged: true,
    };
  }
}

/**
 * 同步服务主类
 */
class SyncService {
  constructor() {
    this.deviceRegistry = new DeviceRegistry();
    this.changeTracker = new ChangeTracker();
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * 注册设备
   */
  registerDevice(deviceId, deviceInfo) {
    return this.deviceRegistry.registerDevice(deviceId, deviceInfo);
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(deviceId) {
    const lastSync = this.deviceRegistry.getLastSync(deviceId);
    const devices = this.deviceRegistry.getDevices(deviceId);
    const pendingChanges = this.changeTracker.getUnsyncedChanges(deviceId, lastSync || '1970-01-01');

    return {
      deviceId,
      lastSync,
      pendingChanges: pendingChanges.length,
      registeredDevices: devices.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 请求同步
   */
  requestSync(deviceId, options = {}) {
    const { since, tables, conflictStrategy } = options;

    // 更新冲突策略
    if (conflictStrategy) {
      this.conflictResolver = new ConflictResolver(conflictStrategy);
    }

    const lastSync = since || this.deviceRegistry.getLastSync(deviceId) || '1970-01-01';

    // 获取需要同步的变更
    const changes = tables
      ? tables.flatMap(table => this.changeTracker.getUnsyncedChanges(deviceId, lastSync).filter(c => c.tableName === table))
      : this.changeTracker.getUnsyncedChanges(deviceId, lastSync);

    // 检测冲突
    const conflicts = [];
    const resolvedChanges = [];

    for (const change of changes) {
      // 查找同一记录的服务端变更
      const serverChange = this.changeTracker.getDeviceChanges('server', change.tableName, change.recordId, lastSync)
        .find(sc => sc.recordId === change.recordId);

      if (this.conflictResolver.detectConflict(change, serverChange)) {
        const resolution = this.conflictResolver.resolve(change, serverChange);
        conflicts.push({
          tableName: change.tableName,
          recordId: change.recordId,
          resolution,
        });

        if (resolution.merged) {
          resolvedChanges.push(resolution.winner);
        }
      } else {
        resolvedChanges.push(change);
      }
    }

    // 更新同步时间
    this.deviceRegistry.updateLastSync(deviceId, new Date().toISOString());

    return {
      success: true,
      data: {
        lastSync: new Date().toISOString(),
        changes: resolvedChanges,
        conflicts,
        hasMore: false,
      },
    };
  }

  /**
   * 提交客户端变更
   */
  submitChanges(deviceId, changes) {
    const results = [];

    for (const change of changes) {
      try {
        const recorded = this.changeTracker.recordChange(
          deviceId,
          change.tableName,
          change.recordId,
          change.operation,
          change.oldValue,
          change.newValue,
          change.timestamp
        );
        results.push({ success: true, change: recorded });
      } catch (e) {
        results.push({ success: false, error: e.message, change });
      }
    }

    return {
      success: true,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 记录服务端变更
   */
  recordServerChange(tableName, recordId, operation, oldValue, newValue) {
    return this.changeTracker.recordChange('server', tableName, recordId, operation, oldValue, newValue);
  }
}

// 导出单例
const syncService = new SyncService();

module.exports = {
  SyncService,
  syncService,
  DeviceRegistry,
  ChangeTracker,
  ConflictResolver,
  CONFIG,
};
