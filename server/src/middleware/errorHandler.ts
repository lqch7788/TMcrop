/**
 * 全局错误处理中间件
 * 统一 API 返回格式 { success, error, data }
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * 统一 API 响应接口
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误并返回统一格式
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });

  // 如果响应已经发送，不再处理
  if (res.headersSent) {
    return next(err);
  }

  // 判断错误类型
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if ((err as any).statusCode) {
    // 处理其他自定义错误格式
    statusCode = (err as any).statusCode;
    message = (err as any).message || err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose 验证错误
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    // Mongoose 类型转换错误
    statusCode = 400;
    message = 'Invalid data format';
  }

  // 生产环境下隐藏内部错误详情
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  // 返回统一格式的 JSON 响应
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 异步处理包装器
 * 自动捕获异步函数中的错误
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 处理中间件
 * 处理未匹配的路由
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
}
