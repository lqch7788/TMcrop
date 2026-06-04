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
 *  1. SELECT * FROM t                       → SELECT COUNT(*) AS "total" FROM t
 *  2. SELECT id FROM t                      → SELECT COUNT(*) AS "total" FROM t
 *  3. SELECT COUNT(*) [as alias] FROM t     → SELECT COUNT(*) AS "total" FROM t
 *
 * 修复记录：2026-06-04 修复 "near 'as'" 报错
 *  - 旧版 if 分支只 replace `COUNT(*)`，未吞掉原 SQL 已有的 `as total` 别名，
 *    导致最终 SQL 变成 `COUNT(*) AS total as total`（双别名 SQL 非法）
 *  - 现版本：if 分支 regex 吞掉整个 `COUNT(*) [as alias]`，统一改写为 `COUNT(*) AS "total"`
 *    SQLite 在严格解析下要求带引号的标识符，使用 "total" 确保跨 SQL 方言兼容
 */
export function execCount(db: Database, sql: string, params: any[] = []): number {
  let countSql: string;
  if (/count\s*\(\s*\*\s*\)/i.test(sql)) {
    // 已含 COUNT(*)，吞掉整个 `COUNT(*) [as alias]`，统一改写为 `COUNT(*) AS "total"`
    countSql = sql.replace(
      /count\s*\(\s*\*\s*\)(?:\s+as\s+\w+)?/i,
      'COUNT(*) AS "total"'
    );
  } else {
    // 任意 SELECT 列表，统一替换为 COUNT(*)
    countSql = sql.replace(
      /^\s*SELECT\s+.+?\s+FROM\s+/is,
      'SELECT COUNT(*) AS "total" FROM '
    );
  }
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
