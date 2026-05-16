/**
 * SQLite 数据库连接
 * 使用 sql.js（纯 JavaScript 实现，无需编译）
 */

import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

// 数据库实例
let db: Database | null = null;

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  // 确保 data 目录存在
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 加载已有数据库或创建新数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 修补 db.run() 和 stmt.bind() 自动将 undefined 绑定值转为 null（sql.js 不接受 undefined）
  const originalRun = db.run.bind(db);
  db.run = function(sql: string, params?: any[]): Database {
    if (params && params.length > 0) {
      params = params.map(v => v === undefined ? null : v);
    }
    return originalRun(sql, params);
  } as any;

  const originalPrepare = db.prepare.bind(db);
  db.prepare = function(sql: string): any {
    const stmt = originalPrepare(sql);
    const originalBind = stmt.bind.bind(stmt);
    stmt.bind = function(params?: any[]): any {
      if (params && params.length > 0) {
        params = params.map(v => v === undefined ? null : v);
      }
      return originalBind(params);
    };
    return stmt;
  };

  return db;
}

/**
 * 获取数据库实例
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

/**
 * 保存数据库到文件
 */
export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

export default { initDatabase, getDatabase, saveDatabase, closeDatabase };
