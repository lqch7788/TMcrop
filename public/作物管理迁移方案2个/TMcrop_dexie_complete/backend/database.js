/**
 * better-sqlite3 数据库连接 + 通用 CRUD 构建器
 * WAL 模式，同步 API
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.db');
const db = new Database(DB_PATH);

// WAL 模式提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * 执行初始化 SQL
 */
function initDatabase() {
  const sqlPath = path.join(__dirname, 'init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  // 分割多条语句执行
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    db.exec(stmt + ';');
  }
  console.log('[DB] Initialized successfully');
}

/**
 * 通用 CRUD 路由构建器
 * @param {string} tableName - 表名
 * @param {string[]} columns - 可写字段列表（不含 id, created_at, updated_at）
 * @param {object} options - 额外配置
 * @returns {express.Router}
 */
function buildCrudRoutes(tableName, columns, options = {}) {
  const express = require('express');
  const router = express.Router();
  const readOnlyCols = ['id', 'created_at', 'updated_at'];
  const writableCols = columns.filter(c => !readOnlyCols.includes(c));

  // GET /api/{tableName} - 列表（支持分页、搜索、排序）
  router.get('/', (req, res, next) => {
    try {
      const { page = '1', pageSize = '50', sortBy, sortOrder = 'desc', q, ...filters } = req.query;
      const limit = Math.min(parseInt(pageSize, 10) || 50, 500);
      const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

      let whereClauses = [];
      let params = [];

      // 通用字段过滤
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== '') {
          whereClauses.push(key + ' = ?');
          params.push(val);
        }
      }

      // 模糊搜索（在 options.searchableFields 指定字段中匹配）
      if (q && options.searchableFields && options.searchableFields.length > 0) {
        const searchClauses = options.searchableFields.map(f => f + ' LIKE ?');
        whereClauses.push('(' + searchClauses.join(' OR ') + ')');
        const pattern = '%' + q + '%';
        for (let i = 0; i < options.searchableFields.length; i++) params.push(pattern);
      }

      const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

      // 排序
      let orderStr = '';
      if (sortBy && writableCols.includes(sortBy)) {
        const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
        orderStr = 'ORDER BY ' + sortBy + ' ' + order;
      } else {
        orderStr = 'ORDER BY created_at DESC';
      }

      // 查询总数
      const countStmt = db.prepare('SELECT COUNT(*) as total FROM ' + tableName + ' ' + whereStr);
      const { total } = countStmt.get(...params);

      // 查询数据
      const dataStmt = db.prepare(
        'SELECT * FROM ' + tableName + ' ' + whereStr + ' ' + orderStr + ' LIMIT ? OFFSET ?'
      );
      const rows = dataStmt.all(...params, limit, offset);

      res.json({ data: rows, total, page: Math.floor(offset / limit) + 1, pageSize: limit });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/{tableName}/:id - 单条
  router.get('/:id', (req, res, next) => {
    try {
      const stmt = db.prepare('SELECT * FROM ' + tableName + ' WHERE id = ?');
      const row = stmt.get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Not Found' });
      res.json(row);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/{tableName} - 创建
  router.post('/', (req, res, next) => {
    try {
      const now = new Date().toISOString();
      const id = require('uuid').v4();
      const data = { id, ...req.body };

      // 只保留可写字段
      const values = {};
      for (const col of writableCols) {
        if (data[col] !== undefined) values[col] = data[col];
      }
      values.created_at = now;
      values.updated_at = now;

      const keys = Object.keys(values);
      const placeholders = keys.map(() => '?').join(', ');
      const stmt = db.prepare(
        'INSERT INTO ' + tableName + ' (' + keys.join(', ') + ') VALUES (' + placeholders + ')'
      );
      const result = stmt.run(...Object.values(values));

      const row = db.prepare('SELECT * FROM ' + tableName + ' WHERE id = ?').get(id);
      res.status(201).json(row);
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/{tableName}/:id - 更新
  router.put('/:id', (req, res, next) => {
    try {
      const now = new Date().toISOString();
      const updates = {};
      for (const col of writableCols) {
        if (req.body[col] !== undefined) updates[col] = req.body[col];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      updates.updated_at = now;

      const setClause = Object.keys(updates).map(k => k + ' = ?').join(', ');
      const stmt = db.prepare('UPDATE ' + tableName + ' SET ' + setClause + ' WHERE id = ?');
      const result = stmt.run(...Object.values(updates), req.params.id);
      if (result.changes === 0) return res.status(404).json({ error: 'Not Found' });

      const row = db.prepare('SELECT * FROM ' + tableName + ' WHERE id = ?').get(req.params.id);
      res.json(row);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/{tableName}/:id - 删除
  router.delete('/:id', (req, res, next) => {
    try {
      const stmt = db.prepare('DELETE FROM ' + tableName + ' WHERE id = ?');
      const result = stmt.run(req.params.id);
      if (result.changes === 0) return res.status(404).json({ error: 'Not Found' });
      res.json({ success: true, deletedId: req.params.id });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/{tableName} - 批量删除（body: { ids: [] }）
  router.delete('/', (req, res, next) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array required' });
      }
      const placeholders = ids.map(() => '?').join(', ');
      const stmt = db.prepare('DELETE FROM ' + tableName + ' WHERE id IN (' + placeholders + ')');
      const result = stmt.run(...ids);
      res.json({ success: true, deletedCount: result.changes });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { db, initDatabase, buildCrudRoutes };
