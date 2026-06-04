/**
 * SQL.js 查询辅助函数
 */

import { Database } from 'sql.js';

/**
 * 将下划线命名字段转换为驼峰命名
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将对象的所有下划线字段转换为驼峰命名
 */
function mapToCamelCase<T>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = obj[key];
  }
  return result as T;
}

/**
 * 将 sql.js prepare + step 结果转换为对象数组（字段名自动转为驼峰命名）
 */
export function queryToObjects<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);

  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: T[] = [];
  while (stmt.step()) {
    const obj = stmt.getAsObject();
    results.push(mapToCamelCase<T>(obj));
  }
  stmt.free();

  return results;
}

/**
 * 执行计数查询
 * 兼容 3 种 SQL 形式：
 *  1. SELECT * FROM t           → SELECT COUNT(*) AS total FROM t
 *  2. SELECT id FROM t          → SELECT COUNT(*) AS total FROM t
 *  3. SELECT COUNT(*) FROM t    → 直接加 AS total 别名
 * 修复：原版用 'SELECT *' 字符串 replace，对已含 COUNT(*) 的 SQL 不生效
 */
export function execCount(db: Database, sql: string, params: any[] = []): number {
  let countSql: string;
  if (/count\s*\(\s*\*\s*\)/i.test(sql)) {
    // 已含 COUNT(*)，加 AS total 别名
    countSql = sql.replace(/count\s*\(\s*\*\s*\)/i, 'COUNT(*) AS total');
  } else {
    // 任意 SELECT 列表，统一替换为 COUNT(*)
    countSql = sql.replace(/^\s*SELECT\s+.+?\s+FROM\s+/is, 'SELECT COUNT(*) AS total FROM ');
  }
  console.log('[execCount DEBUG] input SQL:', JSON.stringify(sql));
  console.log('[execCount DEBUG] final SQL:', JSON.stringify(countSql));
  console.log('[execCount DEBUG] db type:', db?.constructor?.name);
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
