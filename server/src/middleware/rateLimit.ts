/**
 * 限流中间件
 * 防止暴力破解和 DoS 攻击
 */

import rateLimit from 'express-rate-limit';

// 2026-07-27 修复：阈值从 300 → 1500 req/min
// 根因：开发模式下 vite HMR + React StrictMode 双倍 + enhancedApiClient 3 次重试
// 单次页面打开可放大 6-9 倍请求，300/min 阈值在调试时频繁触发 429。
// 1500/min 仍能有效阻止暴力读/写，但给开发模式足够余量。
// 生产部署如需更严格，可通过环境变量覆盖 max 值。
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1500,
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
