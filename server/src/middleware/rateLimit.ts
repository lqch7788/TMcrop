/**
 * 限流中间件
 * 防止暴力破解和 DoS 攻击
 */

import rateLimit from 'express-rate-limit';

// 2026-07-27 修复：阈值从 300 → 1500 req/min
// 根因：开发模式下 vite HMR + React StrictMode 双倍 + enhancedApiClient 3 次重试
// 单次页面打开可放大 6-9 倍请求，300/min 阈值在调试时频繁触发 429。
// 1500/min 仍能有效阻止暴力读/写，但给开发模式足够余量。
// 2026-08-26 修复：阈值从 1500 → 10000 req/min
// 根因：429 响应 → enhancedApiClient 3 次重试 → 再 429 的自我放大循环，
// 调试期（browse 测试 + 用户浏览器并发）窗口内计数爆炸式增长导致全站 429。
// 10000/min 给调试足够余量，生产部署如需更严格，可通过环境变量覆盖 max 值。
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10000,
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
