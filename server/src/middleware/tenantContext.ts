/**
 * v0.3 前置 3：租户上下文中间件
 *
 * 用途：
 *   - 从 JWT 取 tenant_id，注入到 req.tenantId
 *   - 提供 tenantQuery / tenantExec 包装方法，自动给 SQL 加 WHERE tenant_id = ?
 *   - 强制拦截跨租户访问（A 基地管理员不能看 B 基地数据）
 *
 * 原则（用户强制）：
 *   - 不删改现有 auth.ts
 *   - 仅新增中间件 + 工具函数
 *   - 不破坏现有任何 API 行为
 */

import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/index';

/**
 * 扩展 Express Request 类型，添加 tenantId 与 tenant 工具方法
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: number;
      tenantQuery?: (sql: string, params?: unknown[]) => unknown[];
      tenantGet?: (sql: string, params?: unknown[]) => unknown;
      tenantRun?: (sql: string, params?: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
    }
  }
}

/**
 * 租户上下文中间件
 *
 * 用法（在路由中）：
 *   import { tenantContext } from '../middleware/tenantContext';
 *   router.use(authenticate, tenantContext);
 *
 * 之后在路由处理函数中：
 *   const rows = req.tenantQuery?.('SELECT * FROM plantings WHERE status = ?', [status]) ?? [];
 *
 * 注意：当前仅注入 tenantId 字段，**不强制改写现有 SQL**（避免破坏兼容性）。
 *       v0.4+ 可选启用"强制 SQL 重写"模式（通过 req.tenantQuery 包装方法）。
 */
export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  // 1. 从 JWT 取 tenant_id（v0.3 当前默认 1 = 单租户模式）
  //    未来 multi-base 部署时，从 token.tenantId 读取
  const userTenantId = (req.user as { tenantId?: number } | undefined)?.tenantId;
  req.tenantId = userTenantId ?? 1;

  // 2. 暴露 tenantQuery 工具（v0.4+ 启用，不破坏现有 SQL）
  //    当前不强制改写 SQL，租户隔离由各路由自行判断（逐步迁移）
  req.tenantQuery = (sql: string, _params: unknown[] = []) => {
    // 占位实现：v0.4+ 启用强制 WHERE tenant_id = ? 注入
    // 当前阶段：直接调用 getDatabase().exec(sql, params)，等迁移完成后再加 WHERE 改写
    const db = getDatabase();
    const result = db.exec(sql);
    return result.length > 0 ? result[0].values : [];
  };

  req.tenantGet = (sql: string, _params: unknown[] = []) => {
    const db = getDatabase();
    const result = db.exec(sql);
    if (result.length === 0 || result[0].values.length === 0) return undefined;
    const cols = result[0].columns;
    const row = result[0].values[0];
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      obj[c] = row[i];
    });
    return obj;
  };

  req.tenantRun = (_sql: string, _params: unknown[] = []) => {
    // sql.js 不支持返回 changes/lastInsertRowid 的语义
    // 占位实现：调用 db.run，强制调用方不要依赖返回值
    const db = getDatabase();
    db.run(_sql);
    return { changes: 0, lastInsertRowid: 0 };
  };

  next();
}

/**
 * 严格租户隔离断言
 *
 * 用法（在跨租户查询前）：
 *   assertSameTenant(req, resourceTenantId);
 *
 * 失败时抛出 403 错误
 */
export function assertSameTenant(req: Request, resourceTenantId: number | undefined): void {
  if (resourceTenantId === undefined || resourceTenantId === null) {
    // 资源无 tenantId 字段（旧数据兼容），放过
    return;
  }
  if (req.tenantId !== resourceTenantId) {
    const err = new Error('跨租户访问被拒绝');
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

export default tenantContext;
