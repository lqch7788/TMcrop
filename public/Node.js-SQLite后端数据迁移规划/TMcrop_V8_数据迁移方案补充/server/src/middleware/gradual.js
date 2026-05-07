/**
 * 灰度切换中间件
 * 根据请求特征（用户ID hash / 请求头 / Cookie）决定是否放行到新功能
 */

import { gradualConfig } from '../config/gradual';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function gradualMiddleware(req: any, res: any, next: any) {
  const userId = req.headers['x-user-id'] || req.query.userId || 'anonymous';
  const userHash = hashString(String(userId));
  const percentage = (userHash % 100) + 1; // 1-100

  // 根据当前阶段计算放行比例
  const phaseMap: Record<number, number> = { 0: 0, 1: 10, 2: 30, 3: 60, 4: 100 };
  const allowed = percentage <= phaseMap[gradualConfig.phase];

  req.gradual = {
    phase: gradualConfig.phase,
    allowed,
    percentage,
    enabledFeatures: gradualConfig.getEnabledFeatures(),
  };

  // 如果请求的是灰度功能且未放行，返回 503
  const featureFlag = req.headers['x-feature-flag'] || req.query.feature;
  if (featureFlag && !gradualConfig.isFeatureEnabled(featureFlag as string) && !allowed) {
    return res.status(503).json({
      success: false,
      error: '功能正在灰度发布中，暂未对您开放',
      phase: gradualConfig.phase,
    });
  }

  next();
}

export default gradualMiddleware;
