/**
 * 基地归属解析与校验（2026-10-25）
 *
 * 用途：
 *   业务记录写入时确定它属于哪个基地，并在写库前校验该基地在操作者的数据范围内。
 *
 * 为什么需要：
 *   实测业务表普遍没有基地字段，且 greenhouse_name / area_name 都是自由文本
 *   （'1号大棚' / 'A区' / '4号棚'），无法可靠反查。
 *   现改为：优先用请求里显式传入的 base_oid，其次用 area_oid / greenhouse_id 反查。
 *   都取不到 → 留空（未归属），由业务侧后续归属。
 *
 * 数据范围校验：
 *   - 未配置数据范围的用户 → 不校验（fail open，保持现有行为）
 *   - 已配置的用户 → 只能写入自己有权限的基地
 */
import type { Request } from 'express';
import { getDatabase } from '../db/index';
import { resolveUserDataScope, isBaseInScope, isAdminUser, type DataScope } from './dataScope';
import { getCurrentBaseOid } from '../middleware/currentBase';

export interface ResolvedBase {
  oid: string;
  name: string;
  /** 来源，便于排障 */
  from: 'payload' | 'area_oid' | 'greenhouse_id' | 'current_base';
}

/** 按 area_oid（zones.oid）反查基地 */
export function resolveBaseByAreaOid(areaOid?: string | null): ResolvedBase | null {
  if (!areaOid) return null;
  const db = getDatabase();
  const st = db.prepare(`
    SELECT g.base_oid, g.base_name
    FROM zones z JOIN greenhouses g ON g.oid = z.greenhouse_oid
    WHERE z.oid = ? AND g.base_oid IS NOT NULL AND g.base_oid != ''
  `);
  st.bind([areaOid]);
  const row = st.step() ? (st.getAsObject() as { base_oid: string; base_name: string }) : null;
  st.free();
  return row ? { oid: row.base_oid, name: row.base_name || '', from: 'area_oid' } : null;
}

/** 按 greenhouse_id（greenhouses.oid）反查基地 */
export function resolveBaseByGreenhouseOid(ghOid?: string | null): ResolvedBase | null {
  if (!ghOid) return null;
  const db = getDatabase();
  const st = db.prepare(
    `SELECT base_oid, base_name FROM greenhouses
     WHERE oid = ? AND base_oid IS NOT NULL AND base_oid != ''`
  );
  st.bind([ghOid]);
  const row = st.step() ? (st.getAsObject() as { base_oid: string; base_name: string }) : null;
  st.free();
  return row ? { oid: row.base_oid, name: row.base_name || '', from: 'greenhouse_id' } : null;
}

/** 校验 base_oid 是否存在且为启用状态 */
export function isValidBase(baseOid?: string | null): boolean {
  if (!baseOid) return false;
  const db = getDatabase();
  const st = db.prepare(
    `SELECT 1 FROM bases WHERE oid = ? AND (status IS NULL OR status = 'active')`
  );
  st.bind([baseOid]);
  const ok = st.step();
  st.free();
  return ok;
}

/** 取基地名 */
export function getBaseName(baseOid?: string | null): string {
  if (!baseOid) return '';
  const db = getDatabase();
  const st = db.prepare('SELECT name FROM bases WHERE oid = ?');
  st.bind([baseOid]);
  const name = st.step() ? String((st.getAsObject() as { name: string }).name || '') : '';
  st.free();
  return name;
}

/**
 * 从请求体解析基地归属
 *
 * 优先级：
 *   1. body.base_oid / body.baseOid（前端显式选择）
 *   2. body.area_oid / body.areaOid → zones → greenhouses
 *   3. body.greenhouse_id / body.greenhouseId → greenhouses
 *
 * 显式传入但基地不存在 → 抛错（Fail Loud，不静默忽略错误输入）
 */
export function resolveBaseFromRequest(
  body: Record<string, unknown> | null | undefined,
  /** 当前登录基地（X-Base-Oid）；作为兜底归属 */
  currentBaseOid?: string | null,
): ResolvedBase | null {
  if (!body) {
    if (currentBaseOid && isValidBase(currentBaseOid)) {
      return { oid: currentBaseOid, name: getBaseName(currentBaseOid), from: 'current_base' };
    }
    return null;
  }

  const explicit = (body.base_oid ?? body.baseOid) as string | undefined;
  if (explicit) {
    if (!isValidBase(explicit)) {
      throw new Error(`指定的基地不存在或已停用：${explicit}`);
    }
    return { oid: explicit, name: getBaseName(explicit), from: 'payload' };
  }

  const areaOid = (body.area_oid ?? body.areaOid ?? body.area_id ?? body.areaId) as string | undefined;
  const byArea = resolveBaseByAreaOid(areaOid);
  if (byArea) return byArea;

  const ghOid = (body.greenhouse_id ?? body.greenhouseId) as string | undefined;
  const byGh = resolveBaseByGreenhouseOid(ghOid);
  if (byGh) return byGh;

  // 3) 兜底：当前登录基地（顶部基地切换器选中的那个）
  if (currentBaseOid && isValidBase(currentBaseOid)) {
    return { oid: currentBaseOid, name: getBaseName(currentBaseOid), from: 'current_base' };
  }

  return null;
}

/**
 * 从「来源记录」继承基地归属（2026-10-25）
 *
 * 派生记录（作物实例、采收入库、入库库存）自己没有请求上下文，
 * 但它们的来源记录（种植/育苗）一定有归属 → 直接继承，避免产生无归属数据。
 *
 * 用法注意：sql.js 的 `getAsObject()` 返回 snake_case 键（`row.base_oid`），
 * 而 `queryToObjects()` 返回 camelCase（`row.baseOid`），取值别混。
 */
export function inheritedBase(
  baseOid?: string | null,
  baseName?: string | null,
): ResolvedBase | null {
  if (!baseOid) return null;
  return { oid: baseOid, name: baseName || '', from: 'payload' };
}

/**
 * 解析当前请求的基地过滤值（2026-10-25）
 *
 * 给「需要以参数形式把基地传给 repository / service」的场景用
 * （SQL 拼接场景请用 buildBaseScopeFilter）。
 *
 * 返回值：
 *   { baseOid }        → 顶部切换器选定的单个基地
 *   { baseOids }       → 用户可见基地范围（无 header 时）
 *   {}                 → 不过滤（脚本 / 旧客户端）
 */
export function resolveBaseQuery(req: Request): { baseOid?: string; baseOids?: string[] } {
  const baseOid = getCurrentBaseOid(req);
  if (baseOid) return { baseOid };

  const scope = resolveUserDataScope((req as { user?: { userId?: string } }).user?.userId || '');
  if (scope.restricted && scope.baseOids.length > 0) {
    return { baseOids: scope.baseOids };
  }
  return {};
}

/**
 * 解析统计口径（2026-10-25）
 *
 * 汇总看板 / 经营分析支持两种口径：
 *   - `base`：只看当前登录基地（默认）
 *   - `global`：跨基地全局汇总（**仅 admin 角色可用**）
 *
 * 非 admin 请求 `?scope=global` 时降级为 base，并把 `downgraded` 置 true，
 * 由调用方在响应里显式标注（不静默忽略用户的请求）。
 */
export function resolveStatsScope(req: Request): {
  scope: 'base' | 'global';
  baseOid: string | null;
  downgraded: boolean;
} {
  const userOid = (req as { user?: { userId?: string } }).user?.userId || '';
  const wantsGlobal = String((req.query as { scope?: unknown })?.scope || '').toLowerCase() === 'global';
  const isAdmin = !!userOid && isAdminUser(userOid);

  if (wantsGlobal && isAdmin) {
    return { scope: 'global', baseOid: null, downgraded: false };
  }

  return {
    scope: 'base',
    baseOid: getCurrentBaseOid(req),
    downgraded: wantsGlobal && !isAdmin,
  };
}

/**
 * 构造「当前基地」读过滤片段（2026-10-25）
 *
 * 所有业务列表统一走这个函数，避免每个路由重复写一遍三分支判断。
 *
 * 规则：
 *   1. 有 X-Base-Oid（顶部基地切换器）→ 严格匹配该基地
 *   2. 无 header 但有用户基地范围（user_base_permissions）→ 匹配范围内多个基地
 *   3. 都没有 → 不加过滤（脚本 / 旧客户端兼容）
 *
 * @param alias 表别名（如 'hr.' / 's.' / 'p.'），无别名传空串
 * @returns condition 为不含 `AND` 的 SQL 条件（空串表示不过滤），params 为对应占位符值
 */
export function buildBaseScopeFilter(
  req: Request,
  alias = '',
): { condition: string; params: string[] } {
  const baseOid = getCurrentBaseOid(req);
  if (baseOid) {
    return { condition: `${alias}base_oid = ?`, params: [baseOid] };
  }

  const scope = resolveUserDataScope((req as { user?: { userId?: string } }).user?.userId || '');
  if (scope.restricted && scope.baseOids.length > 0) {
    const placeholders = scope.baseOids.map(() => '?').join(',');
    return { condition: `${alias}base_oid IN (${placeholders})`, params: [...scope.baseOids] };
  }

  return { condition: '', params: [] };
}

/**
 * 校验「该基地是否在操作者数据范围内」
 *
 * @returns { allowed, reason }
 *   - 未配置数据范围的用户 → 永远 allowed
 *   - base 为空（未归属）→ allowed（历史数据兼容策略）
 */
export function checkBasePermission(
  userOid: string | undefined,
  baseOid: string | null | undefined,
  scope?: DataScope,
): { allowed: boolean; reason: string } {
  if (!baseOid) return { allowed: true, reason: '未指定基地，不做范围校验' };
  if (!userOid) return { allowed: true, reason: '未提供用户标识，不做范围校验' };

  const s = scope ?? resolveUserDataScope(userOid);
  if (!s.restricted) return { allowed: true, reason: '该用户未配置数据范围限制' };

  if (!isBaseInScope(s, baseOid)) {
    return {
      allowed: false,
      reason: `无权操作基地 ${baseOid} 的数据（当前用户仅可见 ${s.baseOids.length} 个基地）`,
    };
  }
  return { allowed: true, reason: '基地在数据范围内' };
}

/**
 * 写入后补写基地归属（不改动原 INSERT 语句，避免侵入）
 *
 * @param table 目标表名（内部白名单校验，防 SQL 注入）
 */
export function applyBaseOwnership(
  table: 'plantings' | 'seedlings' | 'farm_tasks' | 'harvest_records' | 'inventory_stock' | 'crop_instances',
  rowId: string,
  base: ResolvedBase | null,
): void {
  if (!base || !rowId) return;
  // 白名单已由 TS 联合类型约束，此处再运行期兜底
  const ALLOWED = ['plantings', 'seedlings', 'farm_tasks', 'harvest_records', 'inventory_stock', 'crop_instances'];
  if (!ALLOWED.includes(table)) return;

  const db = getDatabase();
  db.run(
    `UPDATE ${table} SET base_oid = ?, base_name = ? WHERE id = ? AND (base_oid IS NULL OR base_oid = '')`,
    [base.oid, base.name, rowId]
  );
}
