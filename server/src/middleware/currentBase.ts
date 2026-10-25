/**
 * 当前基地上下文中间件（2026-10-25）
 *
 * 背景：
 *   系统需要「当前登录基地」概念 —— 用户选定一个基地后，
 *   所有业务列表只显示该基地的数据，新建记录自动归属该基地。
 *   此前 Header 顶部显示的「宁波北仑基地 >>」是硬编码文本，没有实际作用。
 *
 * 协议：
 *   前端在请求头带 `X-Base-Oid: base_xxx`（由 apiClient 统一注入）。
 *   本中间件解析并挂到 `req.currentBaseOid`，供各路由查询过滤使用。
 *
 * 安全：
 *   - 只接受**存在且启用**的基地
 *   - 不校验用户是否有该基地权限 —— 由上层（工序权限 / 数据范围）负责，
 *     此处仅做「上下文传递」，不重复做授权判断
 *   - 未传 header → req.currentBaseOid = null（= 不做基地过滤，兼容旧客户端）
 */
import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/index';

// 扩展 Express Request 类型
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      /** 当前登录基地 OID（来自 X-Base-Oid 请求头）；null = 未指定 */
      currentBaseOid?: string | null;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/** 有效的基地 OID 缓存（避免每个请求都查库） */
let validBaseCache: Set<string> | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

function getValidBases(): Set<string> {
  const now = Date.now();
  if (validBaseCache && now - cacheAt < CACHE_TTL_MS) return validBaseCache;

  const set = new Set<string>();
  try {
    const db = getDatabase();
    const st = db.prepare(`SELECT oid FROM bases WHERE status IS NULL OR status = 'active'`);
    while (st.step()) {
      const oid = String((st.getAsObject() as { oid: string }).oid || '');
      if (oid) set.add(oid);
    }
    st.free();
  } catch {
    // 查询失败时返回空集合 → 所有 base 都不被接受（fail safe）
  }
  validBaseCache = set;
  cacheAt = now;
  return set;
}

/** 清空缓存（基地增删改后调用） */
export function invalidateCurrentBaseCache(): void {
  validBaseCache = null;
  cacheAt = 0;
}

/**
 * 中间件：解析 X-Base-Oid
 * 只做上下文注入，不做拦截（非法值直接置 null，由业务决定是否报错）
 */
export function currentBaseContext(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers['x-base-oid'];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value || typeof value !== 'string' || !value.trim()) {
    req.currentBaseOid = null;
    next();
    return;
  }

  const oid = value.trim();
  req.currentBaseOid = getValidBases().has(oid) ? oid : null;
  next();
}

/**
 * 取当前基地 OID（路由内使用）
 * 优先 header；其次 query 参数（便于脚本/调试）
 */
export function getCurrentBaseOid(req: Request): string | null {
  if (req.currentBaseOid) return req.currentBaseOid;
  const q = req.query?.base_oid ?? req.query?.baseOid;
  const v = Array.isArray(q) ? q[0] : q;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
