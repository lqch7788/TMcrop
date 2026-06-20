/**
 * SQLite 数据库连接
 * 2026-06-20: 启用"只读 + 显式写"安全模式
 * - 启动时 initDatabase 读 db 到内存
 * - 之后 sql.js 任何 export/写盘路径都受保护
 * - 唯一合法的写盘路径: admin.ts 的 /api/admin/db-commit（先 git commit 再 user 显式触发）
 */

import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

// 数据库实例
let db: Database | null = null;

// 2026-06-20: 第二层保护 — 拦截所有对 DB_PATH 的 fs.writeFileSync
// 防止任何代码路径（saveDatabase/backup.ts/其它路由）意外写盘
// 唯一例外: server 启动时若 db 文件不存在,initDatabase 内部仍可创建新文件
// 启用条件: server 已成功 initDatabase 后（内存 db 已加载）
let isDbInitialized = false;
let isDbReadOnly = false; // initDatabase 完成后立即置 true

const originalWriteFileSync = fs.writeFileSync;
(fs as any).writeFileSync = function(pathOrFd: any, data: any, options?: any) {
  // 拦截对 DB_PATH 的写盘
  const targetPath = typeof pathOrFd === 'string' ? pathOrFd : null;
  const normalizedTarget = targetPath ? path.resolve(targetPath) : null;
  const normalizedDb = path.resolve(DB_PATH);
  if (normalizedTarget && normalizedTarget === normalizedDb && isDbReadOnly) {
    const err = new Error(
      `❌ [db-safety] 阻止对 ${DB_PATH} 的写盘! server 运行中 db 设为只读。\n` +
      `   如需写盘,请用 POST /api/admin/db-commit (会先 git add + commit)\n` +
      `   调用栈: ${new Error().stack?.split('\n').slice(1, 4).join('\n')}`
    );
    console.error(err.message);
    throw err;
  }
  return originalWriteFileSync.call(fs, pathOrFd, data, options);
};

const originalWriteFile = fs.writeFile;
(fs as any).writeFile = function(pathOrFd: any, dataOrOptions: any, optionsOrCb?: any, cb?: any) {
  const targetPath = typeof pathOrFd === 'string' ? pathOrFd : null;
  const normalizedTarget = targetPath ? path.resolve(targetPath) : null;
  const normalizedDb = path.resolve(DB_PATH);
  if (normalizedTarget && normalizedTarget === normalizedDb && isDbReadOnly) {
    const err = new Error(
      `❌ [db-safety] 阻止对 ${DB_PATH} 的异步写盘! server 运行中 db 设为只读。\n` +
      `   如需写盘,请用 POST /api/admin/db-commit`
    );
    console.error(err.message);
    throw err;
  }
  // 透传原 writeFile 重载（参数个数 2-4 不定）
  return (originalWriteFile as any).call(fs, pathOrFd, dataOrOptions, optionsOrCb, cb);
};

/**
 * [admin 专用] 显式临时打开写盘权限（仅用于 db-commit 内部）
 * 调用方必须在用完后调用 releaseWriteLock()
 */
export function acquireWriteLock(): void {
  isDbReadOnly = false;
  console.log('[db-safety] 临时打开 db 写盘权限（db-commit 内部使用）');
}

export function releaseWriteLock(): void {
  isDbReadOnly = true;
  console.log('[db-safety] 关闭 db 写盘权限（恢复只读）');
}

export function isWriteLocked(): boolean {
  return isDbReadOnly;
}

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
    if (params && Array.isArray(params) && params.length > 0) {
      params = params.map(v => v === undefined ? null : v);
    }
    return originalRun(sql, params);
  } as any;

  const originalPrepare = db.prepare.bind(db);
  db.prepare = function(sql: string): any {
    const stmt = originalPrepare(sql);
    const originalBind = stmt.bind.bind(stmt);
    stmt.bind = function(params?: any[]): any {
      if (params && Array.isArray(params) && params.length > 0) {
        params = params.map(v => v === undefined ? null : v);
      }
      return originalBind(params);
    };
    return stmt;
  };

  // 2026-06-20: db 加载完成,启动只读保护
  isDbInitialized = true;
  isDbReadOnly = true;
  console.log('[db-safety] db 加载完成,已启动写盘保护（只允许 /api/admin/db-commit）');

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
 * 2026-06-20: 【彻底禁用】saveDatabase() — 防止任何路径覆盖磁盘用户数据
 * 原因: sql.js 内存数据库的 export() 会被各种隐式路径触发
 *       （closeDatabase/process.on('exit')/tsx watch 子进程清理/sql.js GC）
 *       一旦触发,内存里只有 schema 的状态会覆盖磁盘上的真实数据
 * 唯一安全的写盘路径: 用户显式调 /api/admin/db-commit (git 追踪)
 *
 * 等待 better-sqlite3 替换 sql.js 后,移除此 no-op,改用 better-sqlite3 的同步写
 */
export function saveDatabase(): void {
  // [2026-06-20 彻底禁用] 注释所有写盘逻辑
  // if (db) {
  //   const data = db.export();
  //   const buffer = Buffer.from(data);
  //   fs.writeFileSync(DB_PATH, buffer);
  // }
  console.warn('⚠️ [db-safety] saveDatabase() 被调用但已禁用,磁盘数据未被修改');
}

/**
 * 关闭数据库连接
 * 2026-06-20: 禁用隐式 saveDatabase() — 防止任何关闭路径覆盖磁盘用户数据
 * 改为只 close() 不 save（sql.js 内存数据丢弃即可）
 * 如果确实需要落盘，调用方必须显式 saveDatabase()
 */
export function closeDatabase(): void {
  if (db) {
    // [2026-06-20] 注释掉 saveDatabase()，避免覆盖磁盘数据
    // saveDatabase();
    db.close();
    db = null;
  }
}

// 2026-06-20: 注册 process.on('exit') 钩子，确保 closeDatabase 不写盘
process.on('exit', () => {
  if (db) {
    // 不调 saveDatabase！直接 close
    try { db.close(); } catch { /* ignore */ }
    db = null;
  }
});

export default { initDatabase, getDatabase, saveDatabase, closeDatabase };
