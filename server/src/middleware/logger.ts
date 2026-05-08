/**
 * 请求日志中间件
 * 记录每个请求的方法、路径、状态码、耗时等信息
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // 请求结束时记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
    };

    // 根据状态码选择日志级别 - 仅记录警告和错误
    if (res.statusCode >= 500) {
      logger.error('请求处理错误', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('请求处理警告', logData);
    }
    // 2xx/3xx 请求不再记录日志
  });

  next();
}
