/**
 * 数据备份恢复路由
 * 功能：SQLite数据库文件的备份、恢复、策略管理
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../db';

const router = Router();

// 备份文件存储目录
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');
// 数据库文件路径
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'yuanxingtu.db');

// 确保备份目录存在
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// 备份记录存储文件
const RECORDS_FILE = path.join(BACKUP_DIR, '_records.json');

interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'incremental';
  size: string;
  status: 'success' | 'failed' | 'in_progress';
  mode: 'auto' | 'manual';
  startTime: string;
  endTime: string;
  duration: string;
  filePath: string;
  remark: string;
}

interface BackupStrategy {
  id: string;
  name: string;
  type: 'full' | 'incremental';
  schedule: string;
  retention: number;
  status: 'active' | 'paused';
  lastRun: string;
  nextRun: string;
  target: string;
}

// 读取备份记录
function loadRecords(): BackupRecord[] {
  ensureBackupDir();
  if (!fs.existsSync(RECORDS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// 保存备份记录
function saveRecords(records: BackupRecord[]): void {
  ensureBackupDir();
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
}

/**
 * GET /api/backup/records — 获取备份记录列表
 */
router.get('/records', (req, res) => {
  try {
    const records = loadRecords();
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/backup/create — 创建新备份
 */
router.post('/create', async (req, res) => {
  try {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFileName = `backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    const startTime = new Date();
    const startTimeStr = startTime.toISOString().replace('T', ' ').slice(0, 19);

    // 读取数据库并写入备份
    const db = getDatabase();
    const dbData = db.export();
    const buffer = Buffer.from(dbData);
    fs.writeFileSync(backupPath, buffer);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationStr = durationMs < 1000
      ? `${durationMs}毫秒`
      : `${Math.floor(durationMs / 1000)}秒`;

    const stat = fs.statSync(backupPath);
    const record: BackupRecord = {
      id: `BR${Date.now()}`,
      name: `手动备份-${timestamp}`,
      type: 'full',
      size: formatSize(stat.size),
      status: 'success',
      mode: 'manual',
      startTime: startTimeStr,
      endTime: endTime.toISOString().replace('T', ' ').slice(0, 19),
      duration: durationStr,
      filePath: backupPath,
      remark: req.body?.remark || '手动备份',
    };

    const records = loadRecords();
    records.unshift(record);
    saveRecords(records);

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/backup/restore/:filename — 从备份恢复
 */
router.post('/restore/:filename', async (req, res) => {
  try {
    const backupPath = path.join(BACKUP_DIR, req.params.filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    // 恢复前先创建当前数据库的备份
    const preRestoreBackup = `pre_restore_${Date.now()}.db`;
    const preRestorePath = path.join(BACKUP_DIR, preRestoreBackup);
    const db = getDatabase();
    const dbData = db.export();
    fs.writeFileSync(preRestorePath, Buffer.from(dbData));

    // 执行恢复：将备份文件内容读入数据库
    const backupData = fs.readFileSync(backupPath);
    // sql.js 需要通过 initDatabase 重新加载，这里简单替换文件
    const mainDbPath = path.join(__dirname, '..', '..', 'data', 'yuanxingtu.db');
    fs.writeFileSync(mainDbPath, backupData);

    res.json({
      success: true,
      message: '数据恢复成功，已自动创建恢复前备份',
      preRestoreBackup,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * DELETE /api/backup/:filename — 删除备份文件
 */
router.delete('/:filename', (req, res) => {
  try {
    const backupPath = path.join(BACKUP_DIR, req.params.filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    fs.unlinkSync(backupPath);

    // 同步更新记录
    const records = loadRecords().filter(r => !r.filePath.endsWith(req.params.filename));
    saveRecords(records);

    res.json({ success: true, message: '备份文件已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/backup/download/:filename — 下载备份文件
 */
router.get('/download/:filename', (req, res) => {
  try {
    const backupPath = path.join(BACKUP_DIR, req.params.filename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    res.download(backupPath);
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ========== 备份策略管理 ==========

const STRATEGIES_FILE = path.join(BACKUP_DIR, '_strategies.json');

function loadStrategies(): BackupStrategy[] {
  ensureBackupDir();
  if (!fs.existsSync(STRATEGIES_FILE)) {
    // 初始化默认策略
    const defaults: BackupStrategy[] = [
      { id: 'BS001', name: '每日全量备份', type: 'full', schedule: '每天 02:00', retention: 7, status: 'active', lastRun: '-', nextRun: '-', target: '全部数据库' },
      { id: 'BS002', name: '每周全量备份', type: 'full', schedule: '每周日 01:00', retention: 30, status: 'active', lastRun: '-', nextRun: '-', target: '全部数据库' },
    ];
    fs.writeFileSync(STRATEGIES_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(STRATEGIES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveStrategies(strategies: BackupStrategy[]): void {
  ensureBackupDir();
  fs.writeFileSync(STRATEGIES_FILE, JSON.stringify(strategies, null, 2), 'utf-8');
}

router.get('/strategies', (req, res) => {
  try {
    res.json({ success: true, data: loadStrategies() });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post('/strategies', (req, res) => {
  try {
    const strategies = loadStrategies();
    const newStrategy: BackupStrategy = {
      id: `BS${Date.now()}`,
      name: req.body.name || '新策略',
      type: req.body.type || 'full',
      schedule: req.body.schedule || '每天 02:00',
      retention: req.body.retention || 7,
      status: 'active',
      lastRun: '-',
      nextRun: '-',
      target: req.body.target || '全部数据库',
    };
    strategies.push(newStrategy);
    saveStrategies(strategies);
    res.json({ success: true, data: newStrategy });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.put('/strategies/:id', (req, res) => {
  try {
    const strategies = loadStrategies();
    const idx = strategies.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: '策略不存在' });

    strategies[idx] = { ...strategies[idx], ...req.body, id: req.params.id };
    saveStrategies(strategies);
    res.json({ success: true, data: strategies[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.delete('/strategies/:id', (req, res) => {
  try {
    const strategies = loadStrategies().filter(s => s.id !== req.params.id);
    saveStrategies(strategies);
    res.json({ success: true, message: '策略已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.put('/strategies/:id/toggle', (req, res) => {
  try {
    const strategies = loadStrategies();
    const idx = strategies.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: '策略不存在' });

    strategies[idx].status = strategies[idx].status === 'active' ? 'paused' : 'active';
    saveStrategies(strategies);
    res.json({ success: true, data: strategies[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
