/**
 * 变更追踪器（2026-09-19 新增）
 *
 * 目的：让操作日志能记录「改之前是什么」（old_value）。
 *
 * 为什么不用 path→表名 映射表：
 *   实测 124 个挂载路径里有大量一对多（一个 mount 对应十几张表，如 /basic-data），
 *   手工维护的表映射一旦与实际不符，会写出**错误的前值** —— 比没有前值更糟。
 *   所以改为在执行 SQL 的地方直接识别表名，永远与真实语句一致。
 *
 * 做法（AsyncLocalStorage 绑定请求上下文）：
 *   - 中间件为每个写请求建立上下文
 *   - 包装 db.run / db.exec：遇到「单表 UPDATE / DELETE + 带 WHERE」的语句时，
 *     在执行**之前**按同样的 WHERE 条件 SELECT 一次，得到变更前的行
 *   - 只在 WHERE 精确命中 1 行时记录（多行/全表改动不记，宁缺勿错）
 *
 * 安全边界：
 *   - 只读，绝不改写任何 SQL，执行结果原样返回
 *   - 任何解析/查询失败都静默降级为"本次不记录前值"，不影响业务写入
 *   - 只包 db.run / db.exec；db.prepare(...).step() 形式的写入不追踪（降级，不报错）
 */
import { AsyncLocalStorage } from 'async_hooks';
import type { Database } from 'sql.js';

/** sql.js 的参数类型（BindParams 未从模块导出，用 Parameters 取） */
type DbParams = Parameters<Database['run']>[1];

/** 一次请求内捕获到的变更前快照 */
export interface ChangeSnapshot {
  table: string;
  before: Record<string, unknown>;
}

export interface ChangeContext {
  snapshots: ChangeSnapshot[];
  /** 已记录的语句，避免同一请求重复处理 */
  seen: Set<string>;
}

const storage = new AsyncLocalStorage<ChangeContext>();

/** 单条快照的字段数上限，防止超大行把日志撑爆 */
const MAX_FIELDS = 60;

/**
 * 在给定上下文中执行函数（中间件用）
 */
export function runWithChangeContext<T>(ctx: ChangeContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** 读取当前请求上下文（非请求期返回 undefined） */
export function getChangeContext(): ChangeContext | undefined {
  return storage.getStore();
}

/** 可识别的单表写语句 */
const WRITE_RE = /^\s*(?:UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)|DELETE\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*))/i;

/**
 * 从句子里解析出表名与 WHERE 条件（解析不出来返回 null，调用方降级）
 */
function parseWrite(sql: string): { table: string; where: string; whereParamCount: number } | null {
  if (typeof sql !== 'string') return null;

  const m = WRITE_RE.exec(sql);
  if (!m) return null;
  const table = m[1] || m[2];
  if (!table) return null;

  const upper = sql.toUpperCase();
  const whereIdx = upper.indexOf(' WHERE ');
  if (whereIdx === -1) return null; // 全表改动太宽，不记录

  let where = sql.slice(whereIdx + 7).trim();
  // 去掉尾部非 WHERE 子句（SQLite 的 UPDATE ... ORDER BY/LIMIT 语法）
  const cutIdx = [' ORDER BY ', ' LIMIT ', ' RETURNING ']
    .map((kw) => where.toUpperCase().indexOf(kw))
    .filter((i) => i !== -1)
    .sort((a, b) => a - b)[0];
  if (cutIdx !== undefined) where = where.slice(0, cutIdx).trim();
  if (!where) return null;

  // 子查询/关联的 WHERE 交给更复杂的场景，这里不处理
  if (/SELECT|JOIN|EXISTS/i.test(where)) return null;

  const whereParamCount = (where.match(/\?/g) || []).length;
  return { table, where, whereParamCount };
}

/**
 * 包装 db 的 run / exec，捕获单行变更前快照
 * @param db sql.js Database 实例
 */
export function installChangeTracker(db: Database): void {
  const originalRun = db.run.bind(db);
  const originalExec = db.exec.bind(db);

  const captureBefore = (sql: unknown, params?: DbParams): void => {
    const ctx = storage.getStore();
    if (!ctx || typeof sql !== 'string') return;

    try {
      const parsed = parseWrite(sql);
      if (!parsed) return;

      const all: unknown[] = Array.isArray(params) ? params : [];
      // WHERE 的占位符对应参数数组的末尾若干项
      const whereParams = parsed.whereParamCount > 0
        ? all.slice(all.length - parsed.whereParamCount)
        : [];
      if (whereParams.some((p) => p !== null && typeof p === 'object')) return;

      const key = `${parsed.table}|${parsed.where}|${JSON.stringify(whereParams)}`;
      if (ctx.seen.has(key)) return;
      ctx.seen.add(key);

      // LIMIT 2：既能确认是否单行，又不把大结果集拉进来
      const probe = originalExec(
        `SELECT * FROM ${parsed.table} WHERE ${parsed.where} LIMIT 2`,
        whereParams as DbParams
      );

      if (!probe || probe.length === 0) return; // 没有命中行，无从记录
      if (probe[0].values.length !== 1) return; // 多行改动不记录（宁缺勿错）

      const columns = probe[0].columns.slice(0, MAX_FIELDS);
      const before: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        before[col] = probe[0].values[0][i];
      });

      ctx.snapshots.push({ table: parsed.table, before });
    } catch (e) {
      // 追踪失败不影响业务写入，但要说清楚是追踪没记上（Fail Loud）
      console.warn('[changeTracker] 变更前快照捕获失败（本次不记录 old_value）:', (e as Error).message);
    }
  };

  db.run = ((sql: string, params?: DbParams) => {
    captureBefore(sql, params);
    return originalRun(sql, params);
  }) as typeof db.run;

  db.exec = ((sql: string, params?: DbParams) => {
    captureBefore(sql, params);
    return originalExec(sql, params);
  }) as typeof db.exec;
}
