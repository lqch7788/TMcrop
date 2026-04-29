/**
 * SQL.js 查询辅助函数
 */

import { Database } from 'sql.js';

/**
 * 将 sql.js prepare + step 结果转换为对象数组
 */
export function queryToObjects(db: Database, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);

  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();

  return results;
}

/**
 * 执行计数查询
 */
export function execCount(db: Database, sql: string, params: any[] = []): number {
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  const stmt = db.prepare(countSql);

  if (params.length > 0) {
    stmt.bind(params);
  }

  let total = 0;
  if (stmt.step()) {
    const result = stmt.getAsObject() as { total?: number };
    total = result.total || 0;
  }
  stmt.free();

  return total;
}

