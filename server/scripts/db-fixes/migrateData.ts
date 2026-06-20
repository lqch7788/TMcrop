/**
 * 数据库迁移脚本
 * 从旧数据库迁移数据到新数据库
 */

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const BACKUP_FILE = path.join(__dirname, '../../data/yuanxingtu.db.backup');
const DB_FILE = path.join(__dirname, '../../data/yuanxingtu.db');

interface MigrationData {
  timestamp: string;
  tables: Record<string, unknown[]>;
}

async function loadBackupDatabase(): Promise<Database | null> {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.log('备份文件不存在，跳过迁移');
    return null;
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(BACKUP_FILE);
  return new SQL.Database(buffer);
}

async function exportData(): Promise<MigrationData | null> {
  const db = await loadBackupDatabase();
  if (!db) return null;

  const data: MigrationData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  // 获取所有表
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  if (tables.length === 0) {
    console.log('备份数据库中没有表');
    return null;
  }

  const tableNames = tables[0].values.map(row => row[0] as string);

  for (const tableName of tableNames) {
    try {
      const result = db.exec(`SELECT * FROM ${tableName}`);
      if (result.length > 0) {
        const columns = result[0].columns;
        const rows = result[0].values.map(row => {
          const obj: Record<string, unknown> = {};
          columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        });
        data.tables[tableName] = rows;
        console.log(`导出表 ${tableName}: ${rows.length} 条记录`);
      }
    } catch (e) {
      console.error(`导出表 ${tableName} 失败:`, e);
    }
  }

  return data;
}

async function main() {
  console.log('开始数据迁移...');

  const data = await exportData();
  if (!data) {
    console.log('没有数据需要迁移');
    return;
  }

  // 保存迁移数据到 JSON 文件
  const jsonPath = path.join(__dirname, '../../data/migration_backup.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`迁移数据已保存到: ${jsonPath}`);
  console.log('迁移数据包含以下表:');
  for (const [tableName, rows] of Object.entries(data.tables)) {
    console.log(`  - ${tableName}: ${(rows as unknown[]).length} 条记录`);
  }
  console.log('\n迁移完成！');
}

main().catch(console.error);
