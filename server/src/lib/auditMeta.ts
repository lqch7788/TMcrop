/**
 * 审计日志元数据（2026-09-19 新增）
 *
 * 用途：
 *   1. 把请求的挂载路径解析成"审计模块分类"，供 middleware/auditTrail.ts 自动记录
 *   2. 提供查询侧的模块别名展开，让早期未统一的 module 值（排班/农事任务/approval）
 *      仍然能被新分类筛选命中（不改写历史数据）
 *   3. 提供"本次请求内是否已显式写过审计日志"的计数器，避免中间件与业务显式日志重复记录
 *
 * 设计约束（CLAUDE.md Rule 5）：模块归属是确定性决策，必须用显式查找表，
 * 不允许用模型/正则去"猜"。
 */

/** 审计模块分类枚举（同时是前端筛选下拉的取值） */
export const AUDIT_MODULE_CATEGORIES = [
  '农事管理',
  '作物管理',
  '计划管理',
  '用工管理',
  '物资管理',
  '审批',
  '系统设置',
  '智能分析',
  '其他',
] as const;

export type AuditModuleCategory = (typeof AUDIT_MODULE_CATEGORIES)[number];

/** 挂载路径 → 审计模块分类（显式表；值与 routes/index.ts 的 router.use 路径一一对应） */
export const AUDIT_MODULE_MAP: Record<string, AuditModuleCategory> = {
  // —— 农事管理 ——
  '/farm-tasks': '农事管理',
  '/temp-tasks': '农事管理',
  '/farm-operation-records': '农事管理',
  '/farm-task-schedules': '农事管理',
  '/farm-task-swap-requests': '农事管理',
  '/farm-partitions': '农事管理',
  '/inspections': '农事管理',
  '/problems': '农事管理',
  '/problem-attachments': '农事管理',
  '/issues': '农事管理',
  '/dispatch': '农事管理',
  '/planting-records': '农事管理',
  '/watering': '农事管理',
  '/water-fertilizer': '农事管理',
  '/harvest': '农事管理',
  '/quality-checks': '农事管理',
  '/work-logs': '农事管理',
  '/sop': '农事管理',

  // —— 作物管理 ——
  '/plantings': '作物管理',
  '/seedlings': '作物管理',
  '/seed-sources': '作物管理',
  '/crop-varieties': '作物管理',
  '/crop-instances': '作物管理',
  '/crop-orders': '作物管理',
  '/plant-labels': '作物管理',
  '/plant-settings': '作物管理',
  '/pest-records': '作物管理',
  '/pest-disease-dict': '作物管理',
  '/pesticide-library': '作物管理',
  '/fertilizer': '作物管理',
  '/fertilizer-specs': '作物管理',
  '/tech-solutions': '作物管理',

  // —— 计划管理 ——
  '/schedules': '计划管理',
  '/daily-plans': '计划管理',
  '/monthly-plans': '计划管理',
  '/production-plans': '计划管理',
  '/production/plans': '计划管理',
  '/indicators': '计划管理',
  '/indicator-evaluations': '计划管理',

  // —— 用工管理 ——
  '/labor': '用工管理',
  '/workers': '用工管理',
  '/teams': '用工管理',
  '/team-members': '用工管理',
  '/attendance': '用工管理',
  '/leave': '用工管理',
  '/overtime': '用工管理',
  '/onboarding': '用工管理',
  '/resignation': '用工管理',
  '/recruitment': '用工管理',
  '/personnel': '用工管理',
  '/performance': '用工管理',
  '/salary-budget': '用工管理',
  '/batch-timeline': '用工管理',

  // —— 物资管理 ——
  '/materials': '物资管理',
  '/material-requests': '物资管理',
  '/material-returns': '物资管理',
  '/material-costs': '物资管理',
  '/material-executes': '物资管理',
  '/material-flow-log': '物资管理',
  '/material-code-categories': '物资管理',
  '/material-statistics': '物资管理',
  '/inventory': '物资管理',
  '/inventory-transactions': '物资管理',
  '/purchase-plans': '物资管理',
  '/suppliers': '物资管理',
  '/batch-cost': '物资管理',

  // —— 审批 ——
  '/approvals': '审批',
  '/approval-workflows': '审批',
  '/approval-linkage': '审批',
  '/contracts': '审批',
  '/contract-renewal': '审批',
  '/acceptances': '审批',
  '/delivery-records': '审批',
  '/customers': '审批',

  // —— 系统设置 ——
  '/basic-data': '系统设置',
  '/dictionary': '系统设置',
  '/authority': '系统设置',
  '/user-base-permissions': '系统设置',
  '/notifications': '系统设置',
  '/backup': '系统设置',
  '/alarm-configs': '系统设置',
  '/cameras': '系统设置',
  '/device-systems': '系统设置',
  '/device-distributions': '系统设置',
  '/area-systems': '系统设置',
  '/energy-configs': '系统设置',
  '/region': '系统设置',
  '/code-generator': '系统设置',
  '/reminders': '系统设置',
  '/announcements': '系统设置',
  '/monitoring': '系统设置',
  '/offline-sync': '系统设置',
  '/sync': '系统设置',
  '/debug': '系统设置',
  '/iot': '系统设置',
  '/iot-alerts': '系统设置',
  '/iot-cameras': '系统设置',
  '/iot-energy-readings': '系统设置',
  '/iot-history': '系统设置',
  '/iot-monitoring-configs': '系统设置',
  '/weather': '系统设置',
  '/market': '系统设置',
  '/summary': '系统设置',
  '/compliance-report': '系统设置',
  '/paper-report': '系统设置',
  '/risks': '系统设置',

  // —— 智能分析 ——
  '/ai/anomaly': '智能分析',
  '/ai/approval': '智能分析',
  '/ai/attendance': '智能分析',
  '/ai/config': '智能分析',
  '/ai/dispatch': '智能分析',
  '/ai/growth': '智能分析',
  '/ai/growth-state': '智能分析',
  '/ai/image': '智能分析',
  '/ai/pest': '智能分析',
  '/ai/qa': '智能分析',
  '/ai/report': '智能分析',
  '/ai/resource': '智能分析',
  '/ai/route': '智能分析',
  '/ai/schedule': '智能分析',
  '/ai/voice': '智能分析',
  '/ai/workhour': '智能分析',
};

/** 未命中映射表时的兜底分类 */
export const DEFAULT_AUDIT_MODULE: AuditModuleCategory = '其他';

/**
 * 分类 → 归入该分类的历史 module 值
 * 背景：早期写入方各自命名（排班 / 农事任务 / approval），为保证历史记录仍可被
 * 新分类筛选命中，查询时把这些旧值一并纳入 IN 条件（不改写历史数据）。
 */
export const AUDIT_MODULE_ALIASES: Record<string, string[]> = {
  农事管理: ['农事任务', '临时任务', '巡查', '问题'],
  计划管理: ['排班'],
  审批: ['approval'],
};

/**
 * 从请求路径解析审计模块分类
 * @param pathname 形如 /api/farm-tasks/12/publish 的 URL 路径（不含 query）
 * @returns 模块分类；无法识别时返回「其他」
 */
export function resolveAuditModule(pathname: string): AuditModuleCategory {
  // 去掉 /api 前缀
  let p = pathname.startsWith('/api') ? pathname.slice(4) : pathname;
  if (p === '') p = '/';

  // 按段数从多到少做最长前缀匹配（如 /ai/growth-state 优先于 /ai）
  const segments = p.split('/').filter(Boolean);
  for (let take = segments.length; take >= 1; take--) {
    const key = '/' + segments.slice(0, take).join('/');
    const hit = AUDIT_MODULE_MAP[key];
    if (hit) return hit;
  }
  return DEFAULT_AUDIT_MODULE;
}

/**
 * 展开查询用的 module 值列表：分类本身 + 该分类下的历史别名
 * @param module 前端传来的模块筛选值
 */
export function expandAuditModuleFilter(module: string): string[] {
  const aliases = AUDIT_MODULE_ALIASES[module] ?? [];
  return [module, ...aliases];
}

// ============================================================
// 请求内是否已显式写过审计日志（防止中间件与业务日志重复记录）
// ============================================================

let auditWriteCount = 0;

/** 写入一条审计日志后调用（services / routes 内的显式日志写入点） */
export function bumpAuditWriteCount(): void {
  auditWriteCount += 1;
}

/** 读取当前审计写入计数（middleware/auditTrail.ts 用） */
export function getAuditWriteCount(): number {
  return auditWriteCount;
}

// ============================================================
// 语义化描述：路径 → 中文动作说明
// ============================================================

/**
 * 高敏感操作的语义描述表（显式表，按 method + 全路径正则匹配）
 *
 * 为什么不逐个路由写显式日志：这些端点已经能被中间件覆盖（操作人/IP/前后值都有），
 * 缺的只是"人话描述"。集中一张表比分头改 19 个 handler 更好维护，
 * 命中不了的路径自动回退成 `METHOD /path`，不会丢失记录。
 */
const SEMANTIC_DESCRIPTIONS: Array<{
  method: string;
  pattern: RegExp;
  describe: (m: RegExpMatchArray) => string;
}> = [
  // —— 用户与权限 ——
  { method: 'POST', pattern: /^\/api\/authority\/users$/, describe: () => '创建用户' },
  { method: 'PUT', pattern: /^\/api\/authority\/users\/([^/]+)\/status$/, describe: (m) => `修改用户状态（${m[1]}）` },
  { method: 'PUT', pattern: /^\/api\/authority\/users\/([^/]+)\/password$/, describe: (m) => `重置用户密码（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/users\/([^/]+)\/roles$/, describe: (m) => `分配用户角色（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/users\/([^/]+)\/authority$/, describe: (m) => `配置用户权限覆盖（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/roles$/, describe: () => '创建角色' },
  { method: 'POST', pattern: /^\/api\/authority\/roles\/([^/]+)\/authority\/all$/, describe: (m) => `批量配置角色功能权限（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/roles\/([^/]+)\/authority\/process$/, describe: (m) => `配置角色流程权限（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/roles\/([^/]+)\/authority$/, describe: (m) => `配置角色功能权限（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/roles\/([^/]+)\/data-authority\/all$/, describe: (m) => `批量配置角色数据权限（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/roles\/([^/]+)\/data-authority$/, describe: (m) => `配置角色数据权限（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/authority\/organizations$/, describe: () => '创建组织节点' },
  { method: 'POST', pattern: /^\/api\/authority\/processes$/, describe: () => '创建流程定义' },
  { method: 'POST', pattern: /^\/api\/authority\/(auth\/)?login$/, describe: () => '用户登录' },

  // —— 备份与恢复 ——
  { method: 'POST', pattern: /^\/api\/backup\/create$/, describe: () => '创建数据库备份' },
  { method: 'POST', pattern: /^\/api\/backup\/restore\/(.+)$/, describe: (m) => `⚠️ 从备份恢复数据库（${m[1]}）` },
  { method: 'POST', pattern: /^\/api\/backup\/strategies$/, describe: () => '创建备份策略' },
  { method: 'PUT', pattern: /^\/api\/backup\/strategies\/([^/]+)\/toggle$/, describe: (m) => `启停备份策略（${m[1]}）` },
  { method: 'PUT', pattern: /^\/api\/backup\/strategies\/([^/]+)$/, describe: (m) => `修改备份策略（${m[1]}）` },
  { method: 'DELETE', pattern: /^\/api\/backup\/strategies\/([^/]+)$/, describe: (m) => `删除备份策略（${m[1]}）` },
  { method: 'DELETE', pattern: /^\/api\/backup\/([^/]+)$/, describe: (m) => `删除备份文件（${m[1]}）` },

  // —— 审计日志自身 ——
  { method: 'DELETE', pattern: /^\/api\/operation-logs\/([^/]+)$/, describe: (m) => `删除操作日志（${m[1]}）` },
];

/**
 * 解析写操作用的中文描述；未命中返回 null（调用方回退为 `METHOD /path`）
 */
export function resolveAuditDescription(
  method: string,
  pathname: string
): string | null {
  for (const entry of SEMANTIC_DESCRIPTIONS) {
    if (entry.method !== method) continue;
    const m = pathname.match(entry.pattern);
    if (m) {
      try {
        return entry.describe(m);
      } catch {
        return null;
      }
    }
  }
  return null;
}
