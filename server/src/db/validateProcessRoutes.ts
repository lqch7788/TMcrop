/**
 * 工序 route 一致性校验（2026-10-25 新增）
 *
 * 背景：
 *   processes.route 存在**结构性重复** —— 父菜单入口 = 第一个子菜单页面，
 *   实测 8 组（/crop/seed-source 同时对应 PROC_CROP 与 PROC_SEED_SOURCE 等）。
 *   这不是数据错误：父级分组菜单点进去确实就是那个子页面。
 *
 *   真正的风险是：**将来有人新增工序时，不小心让 route 与"非父子关系"的
 *   已有工序重复**，此时按 route 反查工序会命中错误的行，子工序权限静默失效。
 *
 * 本校验做两件事：
 *   1. 检查 API 前缀 → 工序映射表（lib/apiRouteProcessMap.ts）里的 OID 是否都存在
 *   2. 检查每组重复 route 的工序是否为父子关系；非父子关系则告警
 *
 * 只读，不改数据。启动时执行，输出到控制台。
 */
import { getDatabase } from './index';
import { API_ROUTE_PROCESS_MAP } from '../lib/apiRouteProcessMap';
import { PAGE_ROUTE_PROCESS_MAP } from '../lib/processRouteMap';

export interface ProcessRouteCheckResult {
  ok: boolean;
  /** 映射表里不存在的工序 OID */
  missingOids: string[];
  /** route 重复但非父子关系的组（行内功能型工序共用入口页，属预期） */
  siblingGroups: Array<{ route: string; oids: string[] }>;
  /** 合法的父子重复组（仅提示） */
  validGroups: Array<{ route: string; oids: string[] }>;
  /** 有 route 但未登记在映射表里的工序 */
  unmappedProcesses: string[];
}

export function validateProcessRoutes(): ProcessRouteCheckResult {
  const db = getDatabase();
  const result: ProcessRouteCheckResult = {
    ok: true,
    missingOids: [],
    siblingGroups: [],
    validGroups: [],
    unmappedProcesses: [],
  };

  // 读取全部启用工序
  const rows = db.exec(
    `SELECT oid, process_name, route, parent_oid FROM processes WHERE status = 'active'`
  );
  const processes: Array<{ oid: string; name: string; route: string; parentOid: string | null }> = [];
  if (rows.length > 0) {
    const cols = rows[0].columns;
    rows[0].values.forEach((v) => {
      const o: Record<string, unknown> = {};
      cols.forEach((c, i) => { o[c] = v[i]; });
      processes.push({
        oid: String(o.oid),
        name: String(o.process_name),
        route: String(o.route ?? ''),
        parentOid: o.parent_oid ? String(o.parent_oid) : null,
      });
    });
  }

  const byOid = new Map(processes.map((p) => [p.oid, p]));

  // 1) 映射表里的 OID 必须都存在
  for (const oid of new Set(Object.values(API_ROUTE_PROCESS_MAP))) {
    if (!byOid.has(oid)) result.missingOids.push(oid);
  }

  // 2) 映射表覆盖检查 —— 区分三类工序
  //   a) API 级：有独立 API 挂载前缀 → 权限由后端 requireProcessPermission 判定
  //      → 必须在 API_ROUTE_PROCESS_MAP 登记，否则其 API 端点不做权限判定
  //   b) 页面级：只有前端页面（数据来自聚合 API，如各审批页共用 /approvals）
  //      → 权限由前端 canAccessProcess 判定（走页面路由映射），无需登记 API 映射
  //   c) 分组菜单：有子工序、无独立页面/API（如 PROC_CROP 作物管理）→ 正常
  const oidsWithApi = new Set(Object.values(API_ROUTE_PROCESS_MAP));
  const oidsWithPage = new Set(Object.values(PAGE_ROUTE_PROCESS_MAP));
  const parentOids = new Set(
    processes.filter((p) => processes.some((c) => c.parentOid === p.oid)).map((p) => p.oid)
  );
  for (const p of processes) {
    if (!p.route) continue;
    if (oidsWithApi.has(p.oid)) continue;   // a) 已登记 API 映射
    if (oidsWithPage.has(p.oid)) continue;  // b) 页面级，权限由前端判定
    if (parentOids.has(p.oid)) continue;     // c) 分组菜单
    // 三类都不属于 → 它的 API 端点与页面都不做权限判定
    result.unmappedProcesses.push(`${p.oid}(${p.name})`);
  }

  // 3) route 重复组
  //   2026-10-25：route 重复已**不影响权限判定** ——
  //     前端走 src/lib/processRouteMap.ts（显式映射），
  //     后端走 lib/apiRouteProcessMap.ts（API 前缀映射）+ lib/processRouteMap.ts（页面路由映射），
  //     都不再按 processes.route 反查。
  //   故此处仅作信息提示（帮助发现意外的 route 录入），不再判为错误。
  const byRoute = new Map<string, typeof processes>();
  for (const p of processes) {
    if (!p.route) continue;
    if (!byRoute.has(p.route)) byRoute.set(p.route, []);
    byRoute.get(p.route)!.push(p);
  }
  for (const [route, group] of byRoute) {
    if (group.length <= 1) continue;
    // 区分父子关系（父菜单入口 = 首个子菜单页面，正常）与兄弟关系（两个行内功能共用入口）
    const isParentChild = group.some((a) =>
      group.some((b) => a.oid !== b.oid && b.parentOid === a.oid)
    );
    if (isParentChild) {
      result.validGroups.push({ route, oids: group.map((g) => g.oid) });
    } else {
      // 兄弟关系：同为"行内功能型"工序（无独立页面，route 指向实际入口页）——属预期
      result.siblingGroups.push({ route, oids: group.map((g) => g.oid) });
    }
  }

  result.ok = result.missingOids.length === 0;

  return result;
}

/**
 * 启动时调用：输出校验报告
 */
export function logProcessRouteValidation(): void {
  try {
    const r = validateProcessRoutes();
    const parts = [`[processRoutes] 工序 ${r.validGroups.length + r.siblingGroups.length} 组 route 复用`];
    if (r.missingOids.length > 0) {
      parts.push(`❌ 映射表引用了不存在的工序: ${r.missingOids.join(', ')}`);
    }
    if (r.siblingGroups.length > 0) {
      parts.push(
        `ℹ️ route 被行内功能型工序共用（预期，不影响判定）: ` +
          r.siblingGroups.map((g) => `${g.route} → ${g.oids.join('/')}`).join('; ')
      );
    }
    if (r.unmappedProcesses.length > 0) {
      parts.push(
        `⚠️ 工序未登记进 API 映射表（其 API 端点不做权限判定）: ` +
          r.unmappedProcesses.join(', ')
      );
    }
    if (r.ok && r.unmappedProcesses.length === 0) {
      parts.push('✅ 全部一致');
    }
    console.log(parts.join(' | '));
  } catch (e) {
    console.warn('[processRoutes] 校验失败（不影响主流程）:', (e as Error)?.message || e);
  }
}
