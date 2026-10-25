/**
 * API 路径前缀 → 工序 OID 映射（后端版）
 *
 * 2026-10-25 新增。背景：
 *   权限模型（processes / roles_authority / users_authority）此前只存在于前端，
 *   后端收到请求时不知道属于哪个工序，导致 561 个写端点全部"登录即可写"。
 *   本表让后端能把 API 路径映射到工序，从而做真实的权限判定。
 *
 * 口径说明：
 *   - 与前端 src/lib/processRouteMap.ts 同源，但**独立维护**（后端不可 import 前端）
 *   - 必须写 **OID 字面量**，不能靠查询 processes.route 反查：
 *     实测 processes.route 存在 8 组重复值（如 /crop/seed-source 同时对应
 *     PROC_CROP 与 PROC_SEED_SOURCE），按 route 反查只会命中第一行，
 *     导致子工序权限永远不生效。
 *   - key 是挂载在 /api 下的**相对前缀**（见 server/src/routes/index.ts）
 */

/** 工序 OID 常量（与 processes 表一致） */
export const PROC = {
  PARK: 'PROC_PARK',
  DASHBOARD: 'PROC_DASHBOARD',
  INDICATORS: 'PROC_INDICATORS',
  ANNOUNCE: 'PROC_ANNOUNCE',
  PRODUCTION: 'PROC_PRODUCTION',
  CROP: 'PROC_CROP',
  FARM: 'PROC_FARM',
  MATERIALS: 'PROC_MATERIALS',
  LABOR: 'PROC_LABOR',
  SUMMARY: 'PROC_SUMMARY',
  WORKFLOW: 'PROC_WORKFLOW',
  SETTINGS: 'PROC_SETTINGS',

  // 作物
  SEED_SOURCE: 'PROC_SEED_SOURCE',
  SEEDLING: 'PROC_SEEDLING',
  PLANTING: 'PROC_PLANTING',
  CROP_HARVEST: 'PROC_CROP_HARVEST',
  CROP_INVENTORY: 'PROC_CROP_INVENTORY',
  CROP_INSTANCE: 'PROC_CROP_INSTANCE',

  // 农事
  FARM_HUB: 'PROC_FARM_HUB',
  TASK_CENTER: 'PROC_TASK_CENTER',
  SCHEDULE: 'PROC_SCHEDULE',
  TEAM: 'PROC_TEAM',
  DAILY_SUMMARY: 'PROC_DAILY_SUMMARY',

  // 库存
  WH_OVERVIEW: 'PROC_WH_OVERVIEW',
  WH_INBOUND: 'PROC_WH_INBOUND',
  SUPPLIER: 'PROC_SUPPLIER',
  MAT_RECEIVING: 'PROC_MAT_RECEIVING',
  MAT_RETURN: 'PROC_MAT_RETURN',

  // 人工
  LABOR_ATTEND: 'PROC_LABOR_ATTEND',
  LABOR_PERSONNEL: 'PROC_LABOR_PERSONNEL',
  LABOR_COMP: 'PROC_LABOR_COMP',
  LABOR_ANALYTICS: 'PROC_LABOR_ANALYTICS',

  // 计划
  ORDER: 'PROC_ORDER',
  PLAN: 'PROC_PLAN',
  TECH: 'PROC_TECH',
  PURCHASE: 'PROC_PURCHASE',

  // 汇总
  SUM_OVERVIEW: 'PROC_SUM_OVERVIEW',
  SUM_YIELD: 'PROC_SUM_YIELD',
  SUM_COST: 'PROC_SUM_COST',
  SUM_LABOR: 'PROC_SUM_LABOR',
  SUM_BATCH: 'PROC_SUM_BATCH',
  SUM_CHAIN: 'PROC_SUM_CHAIN',
  SUM_PROBLEMS: 'PROC_SUM_PROBLEMS',
  SUM_INDICATORS: 'PROC_SUM_INDICATORS',

  // 审批
  APPROVAL_CENTER: 'PROC_APPROVAL_CENTER',
  APPROVAL_MAT: 'PROC_APPROVAL_MAT',
  APPROVAL_PROD: 'PROC_APPROVAL_PROD',
  APPROVAL_FARM: 'PROC_APPROVAL_FARM',
  APPROVAL_IND: 'PROC_APPROVAL_IND',
  MY_APPLICATIONS: 'PROC_MY_APPLICATIONS',
  HR_APPROVAL: 'PROC_HR_APPROVAL',
} as const;

/**
 * API 前缀 → 工序 OID
 * 键为 /api 之后的挂载前缀（与 server/src/routes/index.ts 的 router.use 参数一致）
 */
export const API_ROUTE_PROCESS_MAP: Record<string, string> = {
  // ---- 作物管理 ----
  '/seedlings': PROC.SEEDLING,
  '/seed-sources': PROC.SEED_SOURCE,
  '/seedling-supplementary-applications': PROC.SEEDLING,
  '/seedling-propagation-records': PROC.SEEDLING,
  '/plantings': PROC.PLANTING,
  '/planting-records': PROC.PLANTING,
  '/harvest': PROC.CROP_HARVEST,
  '/crop-instances': PROC.CROP_INSTANCE,
  '/crop-varieties': PROC.CROP,
  '/crop-orders': PROC.ORDER,
  '/plant-labels': PROC.CROP,
  '/plant-marks': PROC.CROP,
  '/plant-settings': PROC.CROP,
  '/pest-records': PROC.CROP,
  '/pesticide-library': PROC.CROP,
  '/pest-disease-dict': PROC.CROP,
  '/fertilizer': PROC.CROP,
  '/fertilizer-specs': PROC.CROP,
  '/water-fertilizer': PROC.CROP,

  // ---- 农事管理 ----
  '/farm-tasks': PROC.TASK_CENTER,
  '/farm-task-schedules': PROC.SCHEDULE,
  '/farm-task-swap-requests': PROC.SCHEDULE,
  '/farm-operation-records': PROC.FARM,
  '/schedules': PROC.SCHEDULE,
  '/dispatch': PROC.TASK_CENTER,
  '/team-members': PROC.TEAM,
  '/teams': PROC.TEAM,
  '/team-availability': PROC.TEAM,
  '/team-capabilities': PROC.TEAM,
  '/team-zones': PROC.TEAM,
  '/worker-teams': PROC.TEAM,
  '/daily-plans': PROC.DAILY_SUMMARY,
  '/monthly-plans': PROC.DAILY_SUMMARY,
  '/work-logs': PROC.DAILY_SUMMARY,
  '/reminders': PROC.FARM,
  '/reminder': PROC.FARM,
  '/issues': PROC.FARM,
  '/inspections': PROC.FARM,
  '/inspection-plans': PROC.FARM,
  '/problems': PROC.FARM,
  '/problem-attachments': PROC.FARM,
  '/task-progress': PROC.TASK_CENTER,
  '/batch-timeline': PROC.FARM,
  '/batch-cost': PROC.FARM,
  '/sop': PROC.FARM,
  '/paper-report': PROC.FARM,
  '/onboarding': PROC.LABOR_PERSONNEL,
  '/compliance-report': PROC.FARM,
  '/compliance-certificates': PROC.FARM,
  '/recycle-bin': PROC.SETTINGS,
  '/deleted-documents': PROC.SETTINGS,
  '/operation-logs': PROC.SETTINGS,
  '/offline-sync': PROC.SETTINGS,
  '/sync': PROC.SETTINGS,

  // ---- 库存管理 ----
  '/inventory': PROC.WH_OVERVIEW,
  '/inventory-transactions': PROC.WH_OVERVIEW,
  '/inventory-inbound-from-source': PROC.WH_INBOUND,
  '/inventory-supplementary-applications': PROC.MAT_RECEIVING,
  '/inventory-transfer-applications': PROC.MAT_RECEIVING,
  '/materials': PROC.WH_OVERVIEW,
  '/material-requests': PROC.MAT_RECEIVING,
  '/material-returns': PROC.MAT_RETURN,
  '/material-executes': PROC.MAT_RECEIVING,
  '/material-costs': PROC.MAT_RECEIVING,
  '/material-statistics': PROC.WH_OVERVIEW,
  '/material-flow-log': PROC.MAT_RECEIVING,
  '/material-code-categories': PROC.MATERIALS,
  '/suppliers': PROC.SUPPLIER,

  // ---- 人工管理 ----
  '/labor': PROC.LABOR_PERSONNEL,
  '/attendance': PROC.LABOR_ATTEND,
  '/overtime': PROC.LABOR_ATTEND,
  '/leave': PROC.LABOR_ATTEND,
  '/personnel': PROC.LABOR_PERSONNEL,
  '/recruitment': PROC.LABOR_PERSONNEL,
  '/resignation': PROC.LABOR_PERSONNEL,
  '/contracts': PROC.LABOR_PERSONNEL,
  '/contract-renewal': PROC.LABOR_PERSONNEL,
  '/performance': PROC.LABOR_PERSONNEL,
  '/risks': PROC.LABOR_PERSONNEL,
  '/salary-budget': PROC.LABOR_COMP,
  '/workers': PROC.LABOR_PERSONNEL,

  // ---- 计划管理 ----
  '/production-plans': PROC.PLAN,
  '/production/plans': PROC.PLAN,
  '/tech-solutions': PROC.TECH,
  '/purchase-plans': PROC.PURCHASE,

  // ---- 生产汇总表 ----
  // 按子路径细分到各汇总子工序（否则整组共用 SUM_OVERVIEW，
  // 导致只有看板权限的人也能读成本/人工分析）
  '/summary/overview': PROC.SUM_OVERVIEW,
  '/summary/module-health': PROC.SUM_OVERVIEW,
  '/summary/indicator-board': PROC.SUM_INDICATORS,
  '/summary/indicator-drilldown': PROC.SUM_INDICATORS,
  '/summary/yield-stats': PROC.SUM_YIELD,
  '/summary/cost-stats': PROC.SUM_COST,
  '/summary/labor-stats': PROC.SUM_LABOR,
  '/summary/batch-stats': PROC.SUM_BATCH,
  '/summary/problem-stats': PROC.SUM_PROBLEMS,
  '/summary/chain-stats': PROC.SUM_CHAIN,
  '/summary/chain-overview': PROC.SUM_CHAIN,
  '/summary/chain-timeline': PROC.SUM_CHAIN,
  '/summary/indicators': PROC.SUM_INDICATORS,
  '/summary/comparison-stats': PROC.SUM_OVERVIEW,
  '/summary': PROC.SUM_OVERVIEW,

  // ---- 审批中心 ----
  '/approvals': PROC.APPROVAL_CENTER,
  '/approval-workflows': PROC.APPROVAL_CENTER,
  '/approval-linkage': PROC.APPROVAL_CENTER,
  '/acceptance': PROC.APPROVAL_CENTER,
  '/acceptances': PROC.APPROVAL_CENTER,
  '/quality-checks': PROC.APPROVAL_CENTER,

  // ---- 系统设置 ----
  '/basic-data': PROC.SETTINGS,
  '/dictionary': PROC.SETTINGS,
  '/notifications': PROC.SETTINGS,
  '/user-base-permissions': PROC.SETTINGS,
  '/announcements': PROC.ANNOUNCE,
  '/indicators': PROC.INDICATORS,
  '/indicator-evaluations': PROC.INDICATORS,
  '/backup': PROC.SETTINGS,
  '/region': PROC.SETTINGS,
  '/debug': PROC.SETTINGS,

  // ---- 人工管理（其余）----

  // ---- 作物管理（其余）----
  '/watering': PROC.CROP,

  // ---- 销售协同（市场）----
  '/market': PROC.ORDER,
  '/customers': PROC.ORDER,
  '/delivery-records': PROC.ORDER,

  // ---- IoT / 设备 / 基地 ----
  '/iot': PROC.SETTINGS,
  '/iot-alerts': PROC.SETTINGS,
  '/iot-cameras': PROC.SETTINGS,
  '/iot-energy-readings': PROC.SETTINGS,
  '/iot-history': PROC.SETTINGS,
  '/iot-monitoring-configs': PROC.SETTINGS,
  '/cameras': PROC.SETTINGS,
  '/device-systems': PROC.SETTINGS,
  '/device-distributions': PROC.SETTINGS,
  '/area-systems': PROC.SETTINGS,
  '/farm-partitions': PROC.SETTINGS,
  '/energy-configs': PROC.SETTINGS,
  '/alarm-configs': PROC.SETTINGS,
  '/weather': PROC.SETTINGS,
  '/monitoring': PROC.SETTINGS,
  '/alerts': PROC.FARM,

  // ---- AI 辅助（归入农事任务中心）----
  '/ai/workhour': PROC.TASK_CENTER,
  '/ai/dispatch': PROC.TASK_CENTER,
  '/ai/growth': PROC.TASK_CENTER,
  '/ai/route': PROC.TASK_CENTER,
  '/ai/pest': PROC.TASK_CENTER,
  '/ai/qa': PROC.TASK_CENTER,
  '/ai/report': PROC.TASK_CENTER,
  '/ai/schedule': PROC.SCHEDULE,
  '/ai/resource': PROC.TASK_CENTER,
  '/ai/image': PROC.TASK_CENTER,
  '/ai/growth-state': PROC.TASK_CENTER,
  '/ai/voice': PROC.TASK_CENTER,
  '/ai/anomaly': PROC.TASK_CENTER,
  '/ai/attendance': PROC.LABOR_ATTEND,
  '/ai/config': PROC.SETTINGS,
  '/ai/approval': PROC.APPROVAL_CENTER,
};

/**
 * 按请求路径解析工序 OID
 * 匹配规则：最长前缀优先（/seedling-supplementary-applications 不能被 /seedlings 抢先）
 */
export function resolveProcessOidByApiPath(pathname: string): string | null {
  // 去掉 /api 前缀
  let p = pathname.startsWith('/api') ? pathname.slice(4) : pathname;
  if (!p.startsWith('/')) p = '/' + p;

  const keys = Object.keys(API_ROUTE_PROCESS_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (p === key || p.startsWith(key + '/')) {
      return API_ROUTE_PROCESS_MAP[key];
    }
  }
  return null;
}
