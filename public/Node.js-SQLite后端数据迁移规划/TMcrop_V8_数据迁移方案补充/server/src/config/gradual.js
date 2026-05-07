/**
 * 5阶段灰度切换配置
 * 阶段0: 全关 | 阶段1: 10% | 阶段2: 30% | 阶段3: 60% | 阶段4: 100%
 */

export const gradualConfig = {
  phase: 0,           // 当前阶段 (0-4)
  features: {
    newApprovalFlow:   { phases: [2, 3, 4] },
    realTimeDashboard: { phases: [3, 4] },
    costAccounting:    { phases: [2, 3, 4] },
    deviceManagement:  { phases: [1, 2, 3, 4] },
    staffModule:       { phases: [1, 2, 3, 4] },
  },
  getEnabledFeatures() {
    return Object.entries(this.features)
      .filter(([, cfg]) => cfg.phases.includes(this.phase))
      .map(([name]) => name);
  },
  isFeatureEnabled(featureName: string): boolean {
    const cfg = this.features[featureName as keyof typeof this.features];
    return cfg ? cfg.phases.includes(this.phase) : false;
  },
};

export default gradualConfig;
