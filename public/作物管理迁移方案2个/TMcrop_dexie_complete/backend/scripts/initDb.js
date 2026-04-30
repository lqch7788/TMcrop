/**
 * 初始化数据库脚本
 * 用法: node scripts/initDb.js [--reset]
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.db');
const RESET = process.argv.includes('--reset');

if (RESET && fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('[initDb] Removed existing database');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const sqlPath = path.join(__dirname, '..', 'init.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
for (const stmt of statements) {
  db.exec(stmt + ';');
}

console.log('[initDb] Database initialized at', DB_PATH);
