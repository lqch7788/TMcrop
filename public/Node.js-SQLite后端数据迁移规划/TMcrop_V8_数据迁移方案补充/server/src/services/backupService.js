/**
 * 定时备份服务
 * Node.js 层调度 bash 备份脚本
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKUP_INTERVAL_MINUTES = 60; // 每小时备份一次

function runBackup() {
  const scriptPath = path.join(__dirname, '../scripts/backup.sh');
  const dbPath = path.join(__dirname, '../../data/yuanxingtu.db');
  const backupDir = path.join(__dirname, '../../backups');

  if (!fs.existsSync(scriptPath)) {
    console.warn('[BackupService] 备份脚本不存在:', scriptPath);
    return;
  }

  const child = spawn('bash', [scriptPath, dbPath, backupDir], { stdio: 'pipe' });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data) => { stdout += data.toString(); });
  child.stderr.on('data', (data) => { stderr += data.toString(); });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('[BackupService] 备份成功');
    } else {
      console.error('[BackupService] 备份失败:', stderr || stdout);
    }
  });
}

export function startBackupService() {
  console.log('[BackupService] 启动定时备份服务，间隔', BACKUP_INTERVAL_MINUTES, '分钟');
  runBackup(); // 立即执行一次
  setInterval(runBackup, BACKUP_INTERVAL_MINUTES * 60 * 1000);
}

export default { startBackupService };
