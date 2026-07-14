/**
 * 限流中间件
 * 防止暴力破解和 DoS 攻击
 */

import rateLimit from 'express-rate-limit';

// 2026-07-14 安全加固：降低限流阈值（原 10000→300、100→30）
// API 通用限流：300 请求/1分钟
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { success: false, error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录限流：30 次/1分钟
export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { success: false, error: '登录尝试次数过多，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
