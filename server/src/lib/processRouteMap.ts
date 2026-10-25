/**
 * 页面路由 → 工序 OID 映射（后端版）
 *
 * 2026-10-25 新增。用途：
 *   `GET /api/authority/check-authority?processRoute=xxx&actionCode=xxx`
 *   此前按 `processes.route` 反查工序，而 route 存在结构性重复
 *   （父菜单入口 = 第一个子菜单页面，实测 8 组），查询只取第一行 → 子工序权限静默失效。
 *   改用本表后，不再依赖 processes.route，与前端 src/lib/processRouteMap.ts 口径完全一致。
 *
 * 维护说明：与前端那份同源。新增/调整菜单时两边都要改。
 *   校验：server/src/db/validateProcessRoutes.ts 启动时会检查表内 OID 是否都存在。
 */
export const PAGE_ROUTE_PROCESS_MAP: Record<string, string> = {
  // 一级菜单
  '/park-archive': 'PROC_PARK',
  '/dashboard': 'PROC_DASHBOARD',
  '/indicators': 'PROC_INDICATORS',
  '/announcement': 'PROC_ANNOUNCE',
  '/production': 'PROC_PRODUCTION',
  '/crop/seed-source': 'PROC_CROP',
  '/agriculture-record': 'PROC_FARM',
  '/farm-hub': 'PROC_FARM',
  '/materials': 'PROC_MATERIALS',
  '/warehouse-overview': 'PROC_MATERIALS',
  '/labor/task-center': 'PROC_LABOR',
  '/labor/attendance': 'PROC_LABOR_ATTEND',
  '/reports': 'PROC_SUMMARY',
  '/summary/overview': 'PROC_SUMMARY',
  '/approvals': 'PROC_WORKFLOW',
  '/settings': 'PROC_SETTINGS',

  // 计划管理子菜单
  '/crop/order': 'PROC_ORDER',
  '/tech-solution': 'PROC_TECH',
  '/purchase-plan': 'PROC_PURCHASE',

  // 作物管理子菜单
  '/crop/seedling': 'PROC_SEEDLING',
  '/crop/planting': 'PROC_PLANTING',
  '/crop-inventory': 'PROC_CROP_INVENTORY',
  '/crop/outbound-records': 'PROC_CROP_INVENTORY',
  '/crop/material-flow': 'PROC_CROP',
  '/crop/fertilizer': 'PROC_CROP',
  '/pest-control': 'PROC_CROP',

  // 农事管理子菜单
  '/task-center': 'PROC_TASK_CENTER',
  '/schedule': 'PROC_SCHEDULE',
  '/team': 'PROC_TEAM',
  '/daily-work-summary': 'PROC_DAILY_SUMMARY',

  // 库存管理子菜单
  '/warehouse-inbound': 'PROC_WH_INBOUND',
  '/supplier-management': 'PROC_SUPPLIER',
  '/material-receiving': 'PROC_MAT_RECEIVING',
  '/material-return': 'PROC_MAT_RETURN',

  // 人工管理子菜单
  '/labor/personnel': 'PROC_LABOR_PERSONNEL',
  '/labor/compensation': 'PROC_LABOR_COMP',
  '/labor/analytics': 'PROC_LABOR_ANALYTICS',

  // 生产汇总表子菜单
  '/summary/business-analysis': 'PROC_SUM_YIELD',
  '/summary/yield': 'PROC_SUM_YIELD',
  '/summary/cost': 'PROC_SUM_COST',
  '/summary/labor': 'PROC_SUM_LABOR',
  '/summary/batch': 'PROC_SUM_BATCH',
  '/summary/batch-management': 'PROC_SUM_BATCH',
  '/summary/chain': 'PROC_SUM_CHAIN',
  '/summary/problems': 'PROC_SUM_PROBLEMS',
  '/summary/indicators': 'PROC_SUM_INDICATORS',

  // 审批中心子菜单
  '/material-approval': 'PROC_APPROVAL_MAT',
  '/production-approval': 'PROC_APPROVAL_PROD',
  '/farm-approval': 'PROC_APPROVAL_FARM',
  '/indicator-budget-approval': 'PROC_APPROVAL_IND',
  '/my-applications': 'PROC_MY_APPLICATIONS',
  '/hr-approval': 'PROC_HR_APPROVAL',
};

/**
 * 按页面路径解析工序 OID（最长前缀优先）
 */
export function resolveProcessOidByPageRoute(route: string): string | null {
  if (!route) return null;
  const keys = Object.keys(PAGE_ROUTE_PROCESS_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (route === key || route.startsWith(key + '/')) {
      return PAGE_ROUTE_PROCESS_MAP[key];
    }
  }
  return null;
}
