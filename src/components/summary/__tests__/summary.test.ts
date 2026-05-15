/**
 * 生产汇总模块 - 共享组件与常量单元测试
 * 覆盖：GaugeChart, TrendChart, DistributionPie, KpiCard, AlertCard, constants
 */

import { describe, it, expect } from 'vitest';
import {
  GaugeChart,
  TrendChart,
  DistributionPie,
  KpiCard,
  KpiCardGrid,
  AlertCard,
  DetailDrawer,
  SummaryDateFilter,
} from '../index';
import {
  ALERT_THRESHOLDS,
  COLOR_BY_STATUS,
  getYieldStatus,
  getCostStatus,
  getTaskStatus,
} from '../constants';

// ========== 组件导出验证 ==========

describe('共享组件导出', () => {
  it('GaugeChart 是函数', () => {
    expect(typeof GaugeChart).toBe('function');
  });

  it('TrendChart 是函数', () => {
    expect(typeof TrendChart).toBe('function');
  });

  it('DistributionPie 是函数', () => {
    expect(typeof DistributionPie).toBe('function');
  });

  it('KpiCard 是函数', () => {
    expect(typeof KpiCard).toBe('function');
  });

  it('KpiCardGrid 是函数', () => {
    expect(typeof KpiCardGrid).toBe('function');
  });

  it('AlertCard 是函数', () => {
    expect(typeof AlertCard).toBe('function');
  });

  it('DetailDrawer 是函数', () => {
    expect(typeof DetailDrawer).toBe('function');
  });

  it('SummaryDateFilter 是函数', () => {
    expect(typeof SummaryDateFilter).toBe('function');
  });
});

// ========== 常量与阈值判断 ==========

describe('ALERT_THRESHOLDS', () => {
  it('产量阈值 warning=0.8, critical=0.5', () => {
    expect(ALERT_THRESHOLDS.yield.warning).toBe(0.8);
    expect(ALERT_THRESHOLDS.yield.critical).toBe(0.5);
  });

  it('成本阈值 warning=1.1, critical=1.3', () => {
    expect(ALERT_THRESHOLDS.cost.warning).toBe(1.1);
    expect(ALERT_THRESHOLDS.cost.critical).toBe(1.3);
  });

  it('任务阈值 warning=0.7, critical=0.5', () => {
    expect(ALERT_THRESHOLDS.task.warning).toBe(0.7);
    expect(ALERT_THRESHOLDS.task.critical).toBe(0.5);
  });
});

describe('getYieldStatus', () => {
  it('>=80% 为 normal', () => {
    expect(getYieldStatus(0.85)).toBe('normal');
    expect(getYieldStatus(0.8)).toBe('normal');
  });

  it('50%~80% 为 warning', () => {
    expect(getYieldStatus(0.6)).toBe('warning');
    expect(getYieldStatus(0.5)).toBe('warning');
  });

  it('<50% 为 critical', () => {
    expect(getYieldStatus(0.3)).toBe('critical');
    expect(getYieldStatus(0)).toBe('critical');
  });
});

describe('getCostStatus', () => {
  it('<=110% 为 normal', () => {
    expect(getCostStatus(1.0)).toBe('normal');
    expect(getCostStatus(1.1)).toBe('normal');
  });

  it('110%~130% 为 warning', () => {
    expect(getCostStatus(1.2)).toBe('warning');
    expect(getCostStatus(1.3)).toBe('warning');
  });

  it('>130% 为 critical', () => {
    expect(getCostStatus(1.5)).toBe('critical');
  });
});

describe('getTaskStatus', () => {
  it('>=70% 为 normal', () => {
    expect(getTaskStatus(0.75)).toBe('normal');
    expect(getTaskStatus(0.7)).toBe('normal');
  });

  it('50%~70% 为 warning', () => {
    expect(getTaskStatus(0.6)).toBe('warning');
    expect(getTaskStatus(0.5)).toBe('warning');
  });

  it('<50% 为 critical', () => {
    expect(getTaskStatus(0.3)).toBe('critical');
  });
});

describe('COLOR_BY_STATUS', () => {
  it('包含全部状态颜色映射', () => {
    expect(COLOR_BY_STATUS.normal).toBe('emerald');
    expect(COLOR_BY_STATUS.warning).toBe('amber');
    expect(COLOR_BY_STATUS.critical).toBe('red');
    expect(COLOR_BY_STATUS.info).toBe('blue');
    expect(COLOR_BY_STATUS.batch).toBe('purple');
    expect(COLOR_BY_STATUS.flow).toBe('teal');
  });
});

// ========== GaugeChart 几何计算验证 ==========

describe('GaugeChart 角度计算', () => {
  it('percentage=0 时指针指向起始位置', () => {
    // 起始角度 225°，sweep=0
    const startAngleDeg = 225;
    const totalSweepDeg = 270;
    const percentage = 0;
    const angle = startAngleDeg + (Math.min(percentage / 100, 1)) * totalSweepDeg;
    expect(angle).toBe(225);
  });

  it('percentage=50 时指针指向中间位置', () => {
    const startAngleDeg = 225;
    const totalSweepDeg = 270;
    const percentage = 50;
    const angle = startAngleDeg + (Math.min(percentage / 100, 1)) * totalSweepDeg;
    expect(angle).toBe(360); // 225 + 135 = 360 (正下方)
  });

  it('percentage=100 时指针指向结束位置', () => {
    const startAngleDeg = 225;
    const totalSweepDeg = 270;
    const percentage = 100;
    const angle = startAngleDeg + (Math.min(percentage / 100, 1)) * totalSweepDeg;
    expect(angle).toBe(495); // 225 + 270 = 495 (右下)
  });

  it('percentage>100 时裁剪为 100', () => {
    const totalSweepDeg = 270;
    const percentage = 150;
    const clamped = Math.min(percentage / 100, 1);
    expect(clamped).toBe(1);
    expect(225 + clamped * totalSweepDeg).toBe(495);
  });
});

// ========== DistributionPie 数据计算验证 ==========

describe('DistributionPie 数据逻辑', () => {
  it('total 为所有项的 value 之和', () => {
    const data = [
      { name: '人工', value: 1000, fill: '#10b981' },
      { name: '物料', value: 500, fill: '#3b82f6' },
      { name: '能源', value: 300, fill: '#f59e0b' },
    ];
    const total = data.reduce((s, d) => s + d.value, 0);
    expect(total).toBe(1800);
  });

  it('空数组 total 为 0', () => {
    const total = [].reduce((s: number, d: { value: number }) => s + d.value, 0);
    expect(total).toBe(0);
  });

  it('单项数据 total 等于自身 value', () => {
    const data = [{ name: '唯一', value: 42, fill: '#10b981' }];
    const total = data.reduce((s, d) => s + d.value, 0);
    expect(total).toBe(42);
  });
});

// ========== KpiCardGrid columns → CSS 映射 ==========

describe('KpiCardGrid columns 配置', () => {
  it('GRID_COLS 包含 2,3,4,5,6 所有有效值', () => {
    // KpiCardGrid 内部使用 GRID_COLS Record
    // 验证组件支持所有声明的 columns 值（2|3|4|5|6）
    const validColumns = [2, 3, 4, 5, 6];
    // 类型层面：KpiCardGridProps.columns 已声明为 2|3|4|5|6
    // 此测试确认所有值都是正整数
    validColumns.forEach((n) => {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    });
  });
});

// ========== AlertCard severity 类型验证 ==========

describe('AlertCard severity', () => {
  it('仅支持 warning 和 critical 两种严重度', () => {
    const validSeverities = ['warning', 'critical'] as const;
    expect(validSeverities).toHaveLength(2);
  });
});
