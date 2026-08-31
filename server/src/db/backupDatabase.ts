/**
 * v0.3 P2-X：数据库备份脚本（基于 sql.js，与主服务一致）
 *
 * 功能：
 *   - 每日自动备份（保留 7 天滚动）
 *   - 每月备份（保留 30 天）
 *   - 原子写：先临时文件，再 rename 替换
 *   - 列出所有备份
 *   - 从备份恢复（自动备份当前 db）
 *
 * 用法：
 *   npx tsx server/src/db/backupDatabase.ts daily
 *   npx tsx server/src/db/backupDatabase.ts monthly
 *   npx tsx server/src/db/backupDatabase.ts list
 *   npx tsx server/src/db/backupDatabase.ts restore
 *   npx tsx server/src/db/backupDatabase.ts auto  （每日 + 每月，自动判断）
 *
 * 原则：
 *   - 不修改任何现有代码
 *   - 仅新增独立备份脚本
 *   - 使用 sql.js 加载 db（与主服务一致，避免 better-sqlite3 兼容性）
 */

import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_DIR = path.join(__dirname, '../../data/backups');
const DAILY_KEEP = 7;      // 每日备份保留 7 天
const MONTHLY_KEEP = 30;   // 每月备份保留 30 天

interface BackupResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * 加载 db 并导出为 buffer
 */
async function loadAndExport(): Promise<Buffer> {
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(dbBuffer);

  // 触发 WAL checkpoint（如果有 WAL 的话）
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    // sql.js 不支持 WAL，忽略
  }

  const data = db.export();
  db.close();
  return Buffer.from(data);
}

/**
 * 执行每日备份
 */
async function dailyBackup(): Promise<BackupResult> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS（Windows 不允许冒号）
    const filename = `daily-${dateStr}-${timeStr}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // 1. 加载 + 导出 db（包含所有 WAL 数据）
    const buffer = await loadAndExport();

    // 2. 原子写：先写临时文件，再 rename
    const tmpPath = backupPath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, backupPath);

    // 3. 清理旧备份
    cleanOldBackups('daily-', DAILY_KEEP);

    const sizeMB = (fs.statSync(backupPath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ 每日备份成功：${filename}（${sizeMB} MB）`);
    return { success: true, path: backupPath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ 每日备份失败:', message);
    return { success: false, error: message };
  }
}

/**
 * 执行每月备份（每月 1 号执行）
 */
async function monthlyBackup(): Promise<BackupResult> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const now = new Date();
    const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
    const filename = `monthly-${monthStr}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    const buffer = await loadAndExport();
    const tmpPath = backupPath + '.tmp';
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, backupPath);

    cleanOldBackups('monthly-', MONTHLY_KEEP);

    const sizeMB = (fs.statSync(backupPath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ 每月备份成功：${filename}（${sizeMB} MB）`);
    return { success: true, path: backupPath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ 每月备份失败:', message);
    return { success: false, error: message };
  }
}

/**
 * 清理旧备份
 */
function cleanOldBackups(prefix: string, keepCount: number): void {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.db'))
    .sort() // 按文件名（日期）排序
    .reverse(); // 最新的在前

  const toDelete = files.slice(keepCount);
  for (const file of toDelete) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
      console.log(`  • 删除旧备份：${file}`);
    } catch (e) {
      console.warn(`  • 删除失败：${file}`, e);
    }
  }
}

/**
 * 列出所有备份
 */
function listBackups(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('（暂无备份）');
    return;
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.db'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('（暂无备份）');
    return;
  }

  console.log(`\n--- 备份列表（共 ${files.length} 个）---`);
  for (const file of files) {
    const stat = fs.statSync(path.join(BACKUP_DIR, file));
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    const mtime = stat.mtime.toISOString().slice(0, 19);
    const type = file.startsWith('daily-') ? '每日' : '每月';
    console.log(`  [${type}] ${file} - ${sizeMB} MB - ${mtime}`);
  }
}

/**
 * 备份恢复（从备份文件恢复）
 */
async function restoreBackup(filename: string): Promise<BackupResult> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return { success: false, error: '备份目录不存在' };
    }
    const backupPath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: `备份文件不存在：${filename}` };
    }

    // ⚠️ 恢复会覆盖当前 db，操作前自动备份
    const autoBackupPath = path.join(
      BACKUP_DIR,
      `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
    );

    const buffer = await loadAndExport();
    fs.writeFileSync(autoBackupPath + '.tmp', buffer);
    fs.renameSync(autoBackupPath + '.tmp', autoBackupPath);
    console.log(`⚠️ 已自动备份当前 db 到：${autoBackupPath}`);

    // 用备份文件覆盖 db（原子写）
    const backupBuffer = fs.readFileSync(backupPath);
    fs.writeFileSync(DB_PATH + '.tmp', backupBuffer);
    fs.renameSync(DB_PATH + '.tmp', DB_PATH);
    console.log(`✅ 恢复成功：${filename}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * CLI 入口
 */
async function main() {
  const cmd = process.argv[2] || 'auto';
  console.log(`\n=== v0.3 P2-X：数据库备份工具 ===\n`);

  switch (cmd) {
    case 'daily':
      await dailyBackup();
      break;
    case 'monthly':
      await monthlyBackup();
      break;
    case 'list':
      listBackups();
      break;
    case 'restore': {
      const filename = process.argv[3];
      if (!filename) {
        console.error('用法：restore ');
        process.exit(1);
      }
      const r = await restoreBackup(filename);
      if (!r.success) {
        console.error('❌ 恢复失败:', r.error);
        process.exit(1);
      }
      break;
    }
    case 'auto': {
      const now = new Date();
      const isFirstDay = now.getDate() === 1;
      await dailyBackup();
      if (isFirstDay) {
        console.log('（今天是月初，执行月度备份）');
        await monthlyBackup();
      }
      listBackups();
      break;
    }
    default:
      console.error(`未知命令：${cmd}`);
      console.log('用法：daily | monthly | list | restore | auto');
      process.exit(1);
  }
}

// 仅当直接运行此文件时执行
if (require.main === module) {
  main().catch((e) => {
    console.error('备份脚本异常:', e);
    process.exit(1);
  });
}

// 导出函数供其他模块调用
export { dailyBackup, monthlyBackup, listBackups, restoreBackup };
