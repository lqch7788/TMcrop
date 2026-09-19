/**
 * AI 路由统一错误响应（2026-09-19）
 *
 * 背景：15 个 AI 路由此前一律 `res.status(500)`，把「缺少输入 / 无可用数据」
 * 这类**调用方问题**也报成服务端故障 —— 前端无法按状态码区分，
 * 监控里也全是假 5xx。
 *
 * 实测典型：清掉 mock 传感器数据后，AI-04 生长预测返回
 * `500 {"error":"温室 G001 最近 7 天无温度数据，无法预测采收日期"}`
 * —— 这显然是 422（请求可理解但无法处理），不是服务端崩了。
 *
 * 约定：service 层用 `new AppError(msg, 状态码)` 表达**可预期的业务错误**
 * （400 输入缺失 / 404 资源不存在 / 422 数据不足）；
 * 其余未包装的异常仍按真·服务端故障返回 500 并打日志。
 */

import type { Response } from 'express';
import { AppError } from '../../middleware/errorHandler';

export function sendAiError(res: Response, error: unknown, fallback: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, error: error.message || fallback });
    return;
  }
  // 非业务错误：记录原始堆栈，对外仍只给一句话（不回传内部细节）
  console.error(`[ai] ${fallback}:`, error);
  const message = error instanceof Error ? error.message : '';
  res.status(500).json({ success: false, error: message || fallback });
}
