/**
 * 数据恢复脚本
 * 将备份数据恢复到新数据库
 */

import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';

const BACKUP_FILE = path.join(__dirname, '../../data/migration_backup.json');
const DB_FILE = path.join(__dirname, '../../data/yuanxingtu.db');

interface MigrationData {
  timestamp: string;
  tables: Record<string, unknown[]>;
}

async function getNewDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    return new SQL.Database(buffer);
  }
  throw new Error('新数据库不存在，请先启动服务创建新数据库');
}

async function restoreData() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.log('备份文件不存在');
    return;
  }

  const backupData: MigrationData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));

  console.log('开始恢复数据...');
  console.log(`备份时间: ${backupData.timestamp}`);
  console.log(`包含 ${Object.keys(backupData.tables).length} 个表`);

  // 提示用户先启动服务创建新数据库
  console.log('\n请确保新数据库已创建（新服务已启动）');
  console.log('按 Ctrl+C 取消，或等待 5 秒后继续...');

  // 等待5秒
  await new Promise(resolve => setTimeout(resolve, 5000));

  const db = await getNewDatabase();

  // 恢复每个表的数据
  for (const [tableName, rows] of Object.entries(backupData.tables)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;

    console.log(`\n恢复表 ${tableName}: ${rows.length} 条记录`);

    for (const row of rows as Record<string, unknown>[]) {
      const columns = Object.keys(row);
      const values = Object.values(row) as SqlValue[];
      const placeholders = columns.map(() => '?').join(', ');

      try {
        // 使用 INSERT OR REPLACE 避免主键冲突
        const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        db.run(sql, values);
      } catch (e) {
        console.error(`  恢复记录失败:`, e);
      }
    }
  }

  // 保存数据库
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);

  console.log('\n数据恢复完成！');
}

restoreData().catch(console.error);
