/**
 * 工序路由 → 工序OID 映射表
 * 与 server/src/db/seedData.ts 中的 seedAuthorityData() 工序定义一一对应
 * 用于前端权限检查：将菜单路由路径转换为工序OID，再匹配角色权限
 */

const processRouteMap: Record<string, string> = {
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
  '/labor/attendance': 'PROC_LABOR',
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
  '/summary/yield': 'PROC_SUM_YIELD',
  '/summary/cost': 'PROC_SUM_COST',
  '/summary/labor': 'PROC_SUM_LABOR',
  '/summary/batch': 'PROC_SUM_BATCH',
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
 * 根据路由路径获取工序OID
 * 支持前缀匹配：例如 /crop/seed-source 如果精确匹配失败，尝试匹配 /crop 前缀
 */
export function getProcessOidByRoute(route: string): string | null {
  // 精确匹配
  if (processRouteMap[route]) return processRouteMap[route];

  // 前缀匹配（最长匹配优先）
  const routes = Object.keys(processRouteMap).sort((a, b) => b.length - a.length);
  for (const key of routes) {
    if (route.startsWith(key + '/')) {
      return processRouteMap[key];
    }
  }

  return null;
}

export default processRouteMap;
