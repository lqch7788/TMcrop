/**
 * 4级备份服务
 * Phase 2: 实现数据迁移方案的4级备份机制
 *
 * 备份级别：
 * - L1: 实时备份 (realtime) - 每次写入后触发，保留最近100次
 * - L2: 小时备份 (hourly) - 每小时执行，保留72小时(3天)
 * - L3: 日备份 (daily) - 每日0点执行，保留30天
 * - L4: 版本备份 (release) - 每次部署执行，保留10个版本
 */

const fs = require('fs');
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../data/TMcrop.db');
const BACKUP_DIR = path.join(__dirname, '../backup');

// 备份目录初始化
const LEVELS = ['hourly', 'daily', 'release', 'realtime'];

class BackupService {
  constructor() {
    this.initialized = false;
    this.intervals = {};
    this.init();
  }

  /**
   * 初始化备份目录
   */
  init() {
    if (this.initialized) return;

    try {
      // 确保备份目录存在
      LEVELS.forEach(level => {
        const dir = path.join(BACKUP_DIR, level);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      this.initialized = true;
      console.log('[BackupService] 4级备份服务已初始化');
      console.log(`[BackupService] 备份目录: ${BACKUP_DIR}`);
    } catch (error) {
      console.error('[BackupService] 初始化失败:', error.message);
    }
  }

  /**
   * L1: 实时备份
   * 每次写入后触发，保留最近100次
   */
  async realtimeBackup() {
    if (!fs.existsSync(DB_PATH)) {
      return { success: false, error: '数据库文件不存在' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, 'realtime', `realtime_${timestamp}.db`);

    try {
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`[Backup] 实时备份: ${backupFile}`);

      // 清理：保留最近100个
      this.cleanOldBackups('realtime', 100);

      return { success: true, file: backupFile };
    } catch (error) {
      console.error('[Backup] 实时备份失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * L2: 小时备份
   * 每小时执行，保留72小时(3天)
   */
  async hourlyBackup() {
    if (!fs.existsSync(DB_PATH)) {
      return { success: false, error: '数据库文件不存在' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, 'hourly', `hourly_${timestamp}.db`);

    try {
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`[Backup] 小时备份: ${backupFile}`);

      // 清理：保留72小时
      this.cleanOldBackupsByTime('hourly', 72 * 60 * 60 * 1000);

      return { success: true, file: backupFile };
    } catch (error) {
      console.error('[Backup] 小时备份失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * L3: 日备份
   * 每日0点执行，保留30天
   */
  async dailyBackup() {
    if (!fs.existsSync(DB_PATH)) {
      return { success: false, error: '数据库文件不存在' };
    }

    const day = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const backupFile = path.join(BACKUP_DIR, 'daily', `daily_${day}.db`);

    try {
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`[Backup] 日备份: ${backupFile}`);

      // 清理：保留30天
      this.cleanOldBackupsByTime('daily', 30 * 24 * 60 * 60 * 1000);

      return { success: true, file: backupFile };
    } catch (error) {
      console.error('[Backup] 日备份失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * L4: 版本备份
   * 每次部署执行，保留10个版本
   */
  async releaseBackup(version) {
    if (!fs.existsSync(DB_PATH)) {
      return { success: false, error: '数据库文件不存在' };
    }

    const day = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const versionStr = version || `v${Date.now()}`;
    const backupFile = path.join(BACKUP_DIR, 'release', `release_${versionStr}_${day}.db`);

    try {
      fs.copyFileSync(DB_PATH, backupFile);
      console.log(`[Backup] 版本备份: ${backupFile}`);

      // 清理：保留最近10个
      this.cleanOldBackups('release', 10);

      return { success: true, file: backupFile };
    } catch (error) {
      console.error('[Backup] 版本备份失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理旧备份（按数量）
   * @param {string} level - 备份级别
   * @param {number} keepCount - 保留数量
   */
  cleanOldBackups(level, keepCount) {
    const dir = path.join(BACKUP_DIR, level);

    try {
      const files = fs.readdirSync(dir)
        .filter(f => {
          if (level === 'realtime') return f.startsWith('realtime_');
          if (level === 'hourly') return f.startsWith('hourly_');
          if (level === 'daily') return f.startsWith('daily_');
          if (level === 'release') return f.startsWith('release_');
          return false;
        })
        .sort()
        .reverse();

      if (files.length > keepCount) {
        const toDelete = files.slice(keepCount);
        toDelete.forEach(f => {
          fs.unlinkSync(path.join(dir, f));
          console.log(`[Backup] 清理旧备份: ${f}`);
        });
      }
    } catch (error) {
      console.error(`[Backup] 清理备份失败 (${level}):`, error.message);
    }
  }

  /**
   * 清理旧备份（按时间）
   * @param {string} level - 备份级别
   * @param {number} maxAge - 最大保留时间(毫秒)
   */
  cleanOldBackupsByTime(level, maxAge) {
    const dir = path.join(BACKUP_DIR, level);
    const now = Date.now();

    try {
      const files = fs.readdirSync(dir);

      files.forEach(f => {
        const filePath = path.join(dir, f);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`[Backup] 清理过期备份: ${f}`);
        }
      });
    } catch (error) {
      console.error(`[Backup] 清理备份失败 (${level}):`, error.message);
    }
  }

  /**
   * 启动定时备份任务
   */
  startSchedules() {
    // L2: 小时备份 - 每小时执行
    this.intervals.hourly = setInterval(() => {
      this.hourlyBackup().then(r => {
        if (r.success) {
          console.log('[Backup] L2小时备份完成');
        }
      });
    }, 60 * 60 * 1000); // 1小时

    // L3: 日备份 - 午夜执行
    this.scheduleDailyBackup();

    console.log('[BackupService] 定时备份任务已启动');
  }

  /**
   * 设置日备份定时任务
   */
  scheduleDailyBackup() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = midnight - now;

    // 首次执行：等到午夜
    setTimeout(() => {
      this.dailyBackup().then(r => {
        if (r.success) {
          console.log('[Backup] L3日备份完成');
        }
      });

      // 之后每24小时执行
      this.intervals.daily = setInterval(() => {
        this.dailyBackup().then(r => {
          if (r.success) {
            console.log('[Backup] L3日备份完成');
          }
        });
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * 停止定时备份任务
   */
  stopSchedules() {
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
    console.log('[BackupService] 定时备份任务已停止');
  }

  /**
   * 获取备份状态
   */
  getStatus() {
    const status = {};

    LEVELS.forEach(level => {
      const dir = path.join(BACKUP_DIR, level);
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          status[level] = {
            count: files.length,
            files: files.sort().reverse().slice(0, 5) // 最近5个
          };
        } else {
          status[level] = { count: 0, files: [] };
        }
      } catch (error) {
        status[level] = { error: error.message };
      }
    });

    return status;
  }

  /**
   * 手动触发备份
   * @param {string} level - 备份级别
   * @param {string} version - 版本号(可选)
   */
  async manualBackup(level, version) {
    switch (level) {
      case 'realtime':
        return await this.realtimeBackup();
      case 'hourly':
        return await this.hourlyBackup();
      case 'daily':
        return await this.dailyBackup();
      case 'release':
        return await this.releaseBackup(version);
      default:
        return { success: false, error: '未知备份级别' };
    }
  }
}

// 导出单例
const backupService = new BackupService();

// 导出给 Express 路由使用
module.exports = backupService;
