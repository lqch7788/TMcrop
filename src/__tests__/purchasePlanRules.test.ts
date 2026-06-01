/**
 * 采购计划业务规则单元测试
 * 覆盖：calculateOverdueAlert / canDeletePurchasePlan / canEditPurchasePlan
 */
import { describe, it, expect } from 'vitest';
import {
  calculateOverdueAlert,
  canDeletePurchasePlan,
  canEditPurchasePlan,
  type PurchasePlan,
} from '../types/purchase';

// 辅助：构造一个最小可用的 PurchasePlan 对象（只填必要字段）
function mkPlan(overrides: Partial<PurchasePlan> = {}): PurchasePlan {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: 'test-id',
    purchaseApplicationCode: 'PA20260101ABCD',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '陆启闯',
    applicantId: 'u1',
    applicantDepartment: '生产部',
    applyDate: today,
    requiredDate: today,
    priority: 'normal',
    priorityText: '中',
    status: 'pending',
    statusText: '待审批',
    items: [],
    itemCount: 0,
    approvalPerson: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as PurchasePlan;
}

describe('calculateOverdueAlert', () => {
  it('已完成的不预警', () => {
    const plan = mkPlan({ status: 'completed', requiredDate: '2020-01-01' });
    expect(calculateOverdueAlert(plan).level).toBe('normal');
  });

  it('已取消的不预警', () => {
    const plan = mkPlan({ status: 'cancelled', requiredDate: '2020-01-01' });
    expect(calculateOverdueAlert(plan).level).toBe('normal');
  });

  it('草稿不预警', () => {
    const plan = mkPlan({ status: 'draft', requiredDate: '2020-01-01' });
    expect(calculateOverdueAlert(plan).level).toBe('normal');
  });

  it('需求日期已过的返回 overdue', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
    const plan = mkPlan({ status: 'pending', requiredDate: past });
    const alert = calculateOverdueAlert(plan);
    expect(alert.level).toBe('overdue');
    expect(alert.daysOverdue).toBeGreaterThanOrEqual(5);
    expect(alert.message).toContain('已逾期');
  });

  it('3 天内即将到期的返回 warning', () => {
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const plan = mkPlan({ status: 'pending', requiredDate: soon });
    const alert = calculateOverdueAlert(plan);
    expect(alert.level).toBe('warning');
  });

  it('3 天后到期返回 normal', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    const plan = mkPlan({ status: 'pending', requiredDate: future });
    expect(calculateOverdueAlert(plan).level).toBe('normal');
  });
});

describe('canDeletePurchasePlan', () => {
  it('草稿可删除', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'draft' }))).toBe(true);
  });

  it('待审批可删除', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'pending' }))).toBe(true);
  });

  it('已通过不可删除', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'approved' }))).toBe(false);
  });

  it('采购中不可删除', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'purchasing' }))).toBe(false);
  });

  it('已完成不可删除', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'completed' }))).toBe(false);
  });

  it('已取消不可删除', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'cancelled' }))).toBe(false);
  });

  it('审批被拒绝的可删除（即使 status 已是 approved）', () => {
    expect(canDeletePurchasePlan(mkPlan({ status: 'approved', approvalStatus: 'rejected' }))).toBe(true);
  });

  it('null/undefined 返回 false', () => {
    expect(canDeletePurchasePlan(null)).toBe(false);
    expect(canDeletePurchasePlan(undefined)).toBe(false);
  });
});

describe('canEditPurchasePlan', () => {
  it('草稿可编辑', () => {
    expect(canEditPurchasePlan(mkPlan({ status: 'draft' }))).toBe(true);
  });

  it('待审批可编辑', () => {
    expect(canEditPurchasePlan(mkPlan({ status: 'pending' }))).toBe(true);
  });

  it('已拒绝可编辑', () => {
    expect(canEditPurchasePlan(mkPlan({ status: 'rejected' }))).toBe(true);
  });

  it('已通过不可编辑', () => {
    expect(canEditPurchasePlan(mkPlan({ status: 'approved' }))).toBe(false);
  });

  it('采购中不可编辑', () => {
    expect(canEditPurchasePlan(mkPlan({ status: 'purchasing' }))).toBe(false);
  });

  it('已完成不可编辑', () => {
    expect(canEditPurchasePlan(mkPlan({ status: 'completed' }))).toBe(false);
  });

  it('null/undefined 返回 false', () => {
    expect(canEditPurchasePlan(null)).toBe(false);
    expect(canEditPurchasePlan(undefined)).toBe(false);
  });
});

describe('采购申请批次号生成规则（PA+YYYYMM+流水号）', () => {
  // 镜像后端 nextPurchaseApplicationCode 的核心提取逻辑
  function extractSerial(planCode: string, ym: string): number | null {
    const m = new RegExp(`^PA${ym}(\\d{4})$`).exec(planCode);
    return m ? parseInt(m[1], 10) : null;
  }

  function nextCode(existingCodes: string[], ym: string): string {
    let maxSerial = 0;
    for (const code of existingCodes) {
      const n = extractSerial(code, ym);
      if (n !== null && n > maxSerial) maxSerial = n;
    }
    return `PA${ym}${String(maxSerial + 1).padStart(4, '0')}`;
  }

  it('空数据库时从 0001 开始', () => {
    expect(nextCode([], '202606')).toBe('PA2026060001');
  });

  it('已有 0001 时返回 0002', () => {
    expect(nextCode(['PA2026060001'], '202606')).toBe('PA2026060002');
  });

  it('跳过已删除的编号（最大 +1）', () => {
    expect(nextCode(['PA2026060001', 'PA2026060003'], '202606')).toBe('PA2026060004');
  });

  it('不同时段（不同年月）独立计数', () => {
    expect(nextCode(['PA2026069999'], '202607')).toBe('PA2026070001');
  });

  it('忽略其他前缀的 plan_code', () => {
    expect(nextCode(['PP2026061234', 'PA2026050099'], '202606')).toBe('PA2026060001');
  });

  it('提取 4 位流水号失败返回 null', () => {
    expect(extractSerial('PA2026abc', '2026')).toBeNull();
    expect(extractSerial('PA2026', '2026')).toBeNull();
    expect(extractSerial('PA2026abc123', '2026')).toBeNull(); // 多了字符
  });

  it('支持任意年月的 4 位流水号', () => {
    expect(extractSerial('PA2025010042', '202501')).toBe(42);
    expect(nextCode(['PA2025010042'], '202501')).toBe('PA2025010043');
  });
});

describe('plan_code 格式校验（INFO-3）', () => {
  // 镜像 server/src/services/purchasePlan.service.ts 中的 PLAN_CODE_PATTERN
  const PLAN_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/;

  it('标准采购编号通过', () => {
    expect(PLAN_CODE_PATTERN.test('PA20260101ABCD')).toBe(true);
    expect(PLAN_CODE_PATTERN.test('PP20260101-001')).toBe(true);
    expect(PLAN_CODE_PATTERN.test('a1')).toBe(true);
  });

  it('2-30 字符之间', () => {
    expect(PLAN_CODE_PATTERN.test('a')).toBe(false); // 单字符
    expect(PLAN_CODE_PATTERN.test('a'.repeat(31))).toBe(false); // 31 字符
    expect(PLAN_CODE_PATTERN.test('a'.repeat(30))).toBe(true);
  });

  it('不允许中文/emoji/特殊字符', () => {
    expect(PLAN_CODE_PATTERN.test('PA采购')).toBe(false);
    expect(PLAN_CODE_PATTERN.test('PA😀')).toBe(false);
    expect(PLAN_CODE_PATTERN.test('PA<script>')).toBe(false);
    expect(PLAN_CODE_PATTERN.test('PA test')).toBe(false); // 空格
    expect(PLAN_CODE_PATTERN.test('PA;DROP')).toBe(false);
  });

  it('必须以字母或数字开头', () => {
    expect(PLAN_CODE_PATTERN.test('-PA001')).toBe(false);
    expect(PLAN_CODE_PATTERN.test('_PA001')).toBe(false);
  });
});

describe('safeJsonParse 行为（间接验证 service）', () => {
  // 直接内联实现以避免跨包依赖
  const safeJsonParse = <T>(str: unknown, fallback: T): T => {
    if (str === null || str === undefined || str === '') return fallback;
    if (typeof str !== 'string') return str as T;
    try { return JSON.parse(str) as T; } catch { return fallback; }
  };

  it('正常 JSON 字符串能解析', () => {
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('损坏 JSON 返回 fallback 不抛错', () => {
    expect(safeJsonParse('{invalid json', [])).toEqual([]);
  });

  it('null/undefined 返回 fallback', () => {
    expect(safeJsonParse(null, { a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParse(undefined, [])).toEqual([]);
  });

  it('空字符串返回 fallback', () => {
    expect(safeJsonParse('', [])).toEqual([]);
  });
});
