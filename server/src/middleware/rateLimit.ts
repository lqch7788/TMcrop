/**
 * 限流中间件
 * 防止暴力破解和 DoS 攻击
 */

import rateLimit from 'express-rate-limit';

// API 通用限流：10000请求/1分钟（演示模式禁用限制）
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10000,
  message: { success: false, error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录限流：100次/1分钟（演示模式放宽限制）
export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, error: '登录尝试次数过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
