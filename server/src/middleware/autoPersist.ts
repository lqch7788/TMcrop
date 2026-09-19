/**
 * 自动落盘中间件（2026-09-19 新增）
 *
 * 背景：本项目用 sql.js 内存数据库（server/src/db/index.ts），唯一的落盘路径是显式调用
 *       saveDatabase()。而 server/src/index.ts 自 2026-06-20 起**临时禁用**了周期落盘
 *       setInterval 与 SIGINT/SIGTERM/beforeExit 退出落盘（防止内存空态覆盖磁盘用户数据），
 *       于是任何漏调 saveDatabase() 的写端点，重启后数据全部回滚且不报错。
 *       全站扫描：562 个写端点中约 65 个（30 个文件）路由内直接写 SQL 却无任何落盘。
 *
 * 方案：对返回 2xx 的写请求（POST/PUT/PATCH/DELETE）做 debounce 落盘（默认 1.5s），
 *       一处覆盖所有端点以及以后新增的端点。
 *
 * 安全性：只在"写请求成功返回"后触发，因此不会出现"内存只有 schema 时把空状态写回磁盘"
 *         的历史风险（那种风险只存在于启动期，而请求只能在 listen 之后到达）。
 *
 * 已知边界：debounce 窗口（默认 1.5s）内进程被强杀，最后一次写入仍可能丢失；
 *           对"响应返回前必须已落盘"的关键端点，仍需在路由内显式调用 saveDatabase()。
 */
import type { Request, Response, NextFunction } from 'express';
import { saveDatabase, getSaveSuccessCount } from '../db/index';

/** 会修改数据库的 HTTP 方法 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** debounce 窗口（毫秒），可通过环境变量覆盖 */
const DEBOUNCE_MS = Number(process.env.AUTO_PERSIST_DEBOUNCE_MS ?? 1500);

let timer: NodeJS.Timeout | null = null;
/** 本次窗口内合并的写请求数，仅用于日志 */
let mergedCount = 0;
/**
 * 本窗口内"最早的请求进入时"的落盘计数。
 * 必须取请求进入时的值（不是响应结束时）—— 因为端点的显式 saveDatabase() 发生在
 * 响应 finish 之前，用 finish 时刻的值做基准会把显式落盘本身当成"窗口内的变化"而误判。
 */
let windowStartSaveCount = -1;

/**
 * 窗口到期：若无显式落盘覆盖，则兜底写盘一次
 */
function onWindowElapsed(): void {
  timer = null;
  const count = mergedCount;
  mergedCount = 0;
  // 窗口内已有显式 saveDatabase() 落过盘（它导出的是整个内存库），无需重复写盘
  if (getSaveSuccessCount() > windowStartSaveCount) {
    console.log(`[auto-persist] 跳过兜底落盘（窗口内已有显式落盘覆盖 ${count} 次写请求）`);
    return;
  }
  try {
    saveDatabase();
    console.log(`[auto-persist] 自动落盘完成（合并 ${count} 次写请求）`);
  } catch (e) {
    // 落盘失败必须显式报出来，不能静默吞掉（Fail Loud）
    console.error(`[auto-persist] ❌ 自动落盘失败，${count} 次写请求未持久化:`, (e as Error).message);
  }
}

/**
 * 安排一次延迟落盘：窗口内多次调用只落盘一次
 * @param countBeforeRequest 该请求进入时的落盘计数快照
 */
function schedulePersist(countBeforeRequest: number): void {
  mergedCount += 1;
  if (timer) {
    // 已有待执行窗口：把基准取成更早的那个快照
    if (countBeforeRequest < windowStartSaveCount) windowStartSaveCount = countBeforeRequest;
    return;
  }

  windowStartSaveCount = countBeforeRequest;
  timer = setTimeout(onWindowElapsed, DEBOUNCE_MS);
  // 不因为这个定时器而阻止进程正常退出
  timer.unref?.();
}

/**
 * Express 中间件：写请求返回 2xx 后触发布局落盘（debounce）
 */
export function autoPersist(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }

  // 请求进入时快照落盘计数 —— 端点内的显式 saveDatabase() 会让它增加
  const countBeforeRequest = getSaveSuccessCount();

  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      schedulePersist(countBeforeRequest);
    }
  });

  next();
}
