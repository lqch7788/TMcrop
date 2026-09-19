/**
 * 操作审计中间件（2026-09-19 新增）
 *
 * 背景：
 *   操作日志页（/settings/audit-log）读的是 operation_logs 表。改造前全站 573 个写
 *   端点里只有 5 处显式写日志（排班 3 处、审批 1 处、前端农事任务 1 处），
 *   覆盖率不足 1%；登录、权限变更、主数据修改、库存出入库、备份恢复等全部无记录，
 *   而且失败的操作用户完全看不到（status 恒为 success）。
 *
 * 本中间件做什么：
 *   对所有写请求（POST/PUT/PATCH/DELETE）在响应结束时自动落一条 operation_logs：
 *   - 操作人来自 JWT（req.user.name / userId）
 *   - 模块由 lib/auditMeta.ts 的显式映射表按挂载路径解析（不做路径推断）
 *   - 动作按 HTTP 方法映射（POST→create / PUT|PATCH→update / DELETE→delete）
 *   - IP、User-Agent、目标资源、HTTP 状态一并记录
 *   - **失败也记**：4xx → status=warning，5xx → status=error，并带上错误摘要
 *
 * 去重：
 *   业务上已有语义化日志的端点（如审批的 approval_approved）会在请求内自行写库，
 *   此时 lib/auditMeta 的写入计数会变化，本中间件据此跳过，避免一条操作两行日志。
 *
 * 落盘：
 *   不在这里调 saveDatabase() —— 本中间件只对写请求生效，而每个写请求都会触发
 *   middleware/autoPersist.ts 的 debounce 落盘，已经覆盖。
 */
import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db/index';
import {
  resolveAuditModule,
  resolveAuditDescription,
  getAuditWriteCount,
  DEFAULT_AUDIT_MODULE,
} from '../lib/auditMeta';
import { runWithChangeContext, type ChangeContext } from '../lib/changeTracker';

/** 会修改数据的 HTTP 方法 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** HTTP 方法 → 审计动作 */
const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * 不参与自动审计的请求（按 方法 + 路径前缀 精确排除）
 * - POST /api/operation-logs：它就是"写一条日志"本身，记录它只会自我繁殖
 * - POST /api/reminders/run：schedulerService 每 5 分钟自调一次的系统扫描
 *   （见 schedulerService.ts:149），不是操作员行为；不排除会每天灌 288 行噪音
 *
 * 注意：DELETE /api/operation-logs/:id **不**在排除之列 ——
 * "谁删掉了哪条审计记录"本身就是必须留痕的操作。
 */
const SKIP_RULES: Array<{ method: string; prefix: string }> = [
  { method: 'POST', prefix: '/api/operation-logs' },
  { method: 'POST', prefix: '/api/reminders/run' },
];

/** HTTP 状态码 → 审计级别（与 operationLogs 统计接口的分档一致） */
function resolveStatus(code: number): 'success' | 'warning' | 'error' {
  if (code >= 500) return 'error';
  if (code >= 400) return 'warning';
  return 'success';
}

/** 取挂载根路径，如 /api/farm-tasks/12/publish → /farm-tasks */
function resolveResourceType(pathname: string): string {
  const segments = pathname.replace(/^\/api/, '').split('/').filter(Boolean);
  if (segments.length === 0) return '';
  // 两段以内的挂载（如 /ai/growth-state、/production/plans）按两段取
  const twoLevel = '/' + segments.slice(0, 2).join('/');
  const oneLevel = '/' + segments[0];
  return segments.length >= 2 && ['ai', 'production', 'iot'].includes(segments[0])
    ? twoLevel
    : oneLevel;
}

/** 取路径最后一段作为资源标识，如 /api/cameras/cam_123 → cam_123 */
function resolveResourceId(pathname: string): string | null {
  const segments = pathname.replace(/^\/api/, '').split('/').filter(Boolean);
  return segments.length >= 2 ? segments[segments.length - 1] : null;
}

/** 日志字段长度上限（字符），超出截断 —— 审计行不该把 DB 撑大 */
const MAX_VALUE_CHARS = 2000;

/** 敏感字段名（写入审计前脱敏），与 middleware/errorHandler.ts 的规则保持一致 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'credit_card',
  'ssn',
  'idcard',
  'id_card',
];

/** 递归脱敏；对象深度超过 3 层直接转为字符串，避免循环引用与超大结构 */
function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= 3) return '[深层结构已省略]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitize(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))
      ? '[REDACTED]'
      : sanitize(v, depth + 1);
  }
  return out;
}

/** 序列化并做长度截断；空对象返回 null */
function serializeForLog(value: unknown): string | null {
  try {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      return null;
    }
    const json = JSON.stringify(value);
    if (json === '{}' || json === '[]' || json === 'null') return null;
    return json.length > MAX_VALUE_CHARS
      ? `${json.slice(0, MAX_VALUE_CHARS)}…[已截断，共 ${json.length} 字符]`
      : json;
  } catch {
    return null;
  }
}

/**
 * 组装 old_value / new_value
 * - old_value：changeTracker 在 db.run/exec 层抓到的"变更前那一行"（仅单行改动才会抓到）
 * - new_value：本次请求提交的内容（POST/PUT/PATCH）
 */
function buildChangeValues(
  req: Request,
  ctx: ChangeContext | undefined
): { oldValue: string | null; newValue: string | null } {
  const snapshots = ctx?.snapshots ?? [];

  let oldValue: string | null = null;
  if (snapshots.length === 1) {
    oldValue = serializeForLog(snapshots[0].before);
  } else if (snapshots.length > 1) {
    // 一次请求改动了多张表/多行：按表归类，仍然可读
    oldValue = serializeForLog(
      snapshots.slice(0, 10).map((s) => ({ table: s.table, before: s.before }))
    );
  }

  const newValue =
    req.method === 'GET' || req.method === 'DELETE'
      ? null
      : serializeForLog(sanitize(req.body));

  return { oldValue, newValue };
}

/** 写入一条审计日志；任何异常都不得影响主流程 */
function insertAuditLog(req: Request, res: Response, ctx: ChangeContext): void {
  try {
    const db = getDatabase();
    const pathname = req.originalUrl.split('?')[0];
    const status = resolveStatus(res.statusCode);
    const now = new Date().toISOString();
    const user = req.user;

    const module = resolveAuditModule(pathname);
    const action = ACTION_BY_METHOD[req.method] ?? req.method.toLowerCase();
    const errorMessage =
      status === 'success'
        ? null
        : String(res.locals.auditError ?? `HTTP ${res.statusCode}`).slice(0, 500);

    const { oldValue, newValue } = buildChangeValues(req, ctx);

    db.run(
      `INSERT INTO operation_logs (
        id, user_id, username, action, module, resource_type, resource_id,
        description, old_value, new_value, ip_address, user_agent,
        status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user?.userId ?? '',
        user?.name ?? '',
        action,
        module || DEFAULT_AUDIT_MODULE,
        resolveResourceType(pathname),
        resolveResourceId(pathname),
        // 高敏感操作（权限/角色/备份/审计自身）用中文语义描述；
        // 未命中语义表则退回 `METHOD /path`，保证任何写操作都有可读记录
        resolveAuditDescription(req.method, pathname) ?? `${req.method} ${pathname}`,
        oldValue,
        newValue,
        req.ip ?? req.socket?.remoteAddress ?? '',
        String(req.headers['user-agent'] ?? '').slice(0, 300),
        status,
        errorMessage,
        now,
      ]
    );
  } catch (e) {
    // 审计失败不能影响业务响应，但必须显式报出来（Fail Loud）
    console.error('[auditTrail] ❌ 写入操作日志失败:', (e as Error).message);
  }
}

/**
 * Express 中间件：自动记录所有写请求的操作日志
 */
export function auditTrail(req: Request, res: Response, next: NextFunction): void {
  const pathname = req.originalUrl.split('?')[0];

  const skipped = SKIP_RULES.some(
    (r) => r.method === req.method && pathname.startsWith(r.prefix)
  );
  if (!WRITE_METHODS.has(req.method) || skipped) {
    next();
    return;
  }

  // 请求进入时的显式日志写入计数 —— 业务代码若自己写了日志，计数会变化
  const writeCountBeforeRequest = getAuditWriteCount();

  // 捕获非 2xx 响应体里的错误摘要（多数路由是直接 res.status(4xx).json，不经过 errorHandler）
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (
      res.statusCode >= 400 &&
      body !== null &&
      typeof body === 'object' &&
      typeof (body as { error?: unknown }).error === 'string'
    ) {
      res.locals.auditError = (body as { error: string }).error;
    }
    return originalJson(body);
  };

  // 变更追踪上下文：changeTracker 在 db.run/exec 层把"变更前那一行"塞进这里
  const changeContext: ChangeContext = { snapshots: [], seen: new Set<string>() };

  res.on('finish', () => {
    if (getAuditWriteCount() !== writeCountBeforeRequest) {
      // 本请求内已有业务语义化日志，避免重复
      return;
    }
    insertAuditLog(req, res, changeContext);
  });

  // 在绑定上下文的作用域里继续后续中间件与业务处理
  runWithChangeContext(changeContext, () => next());
}
