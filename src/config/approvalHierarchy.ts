// ============================================================
// 分级审批配置
// 文件路径：src/config/approvalHierarchy.ts
// 功能：根据金额和类型自动确定审批级别
// ============================================================

import { ApprovalType } from '../types/approval';

// ============================================================
// 审批级别枚举
// ============================================================

export enum ApprovalLevel {
  /** 免审批 - 自动通过 */
  EXEMPT = 'exempt',
  /** 快速审批 - 单人审批 */
  QUICK = 'quick',
  /** 标准审批 - 多级审批 */
  STANDARD = 'standard',
  /** 严格审批 - 多级多审 */
  STRICT = 'strict',
}

// ============================================================
// 审批级别配置
// ============================================================

export interface ApprovalLevelConfig {
  /** 级别代码 */
  level: ApprovalLevel;
  /** 级别名称 */
  name: string;
  /** 级别描述 */
  description: string;
  /** 审批人数 */
  approverCount: number;
  /** 是否需要多审（同一级多人审批） */
  requireMultiApprover: boolean;
  /** 审批人角色要求 */
  approverRoles?: string[];
}

// 审批级别配置映射
export const APPROVAL_LEVEL_CONFIGS: Record<ApprovalLevel, ApprovalLevelConfig> = {
  [ApprovalLevel.EXEMPT]: {
    level: ApprovalLevel.EXEMPT,
    name: '免审批',
    description: '金额低于阈值，自动通过，无需人工审批',
    approverCount: 0,
    requireMultiApprover: false,
  },
  [ApprovalLevel.QUICK]: {
    level: ApprovalLevel.QUICK,
    name: '快速审批',
    description: '单人审批，快速通过',
    approverCount: 1,
    requireMultiApprover: false,
    approverRoles: ['manager'],
  },
  [ApprovalLevel.STANDARD]: {
    level: ApprovalLevel.STANDARD,
    name: '标准审批',
    description: '部门主管 + 经理二级审批',
    approverCount: 2,
    requireMultiApprover: false,
    approverRoles: ['department_head', 'manager'],
  },
  [ApprovalLevel.STRICT]: {
    level: ApprovalLevel.STRICT,
    name: '严格审批',
    description: '部门主管 + 经理 + 总监三级审批',
    approverCount: 3,
    requireMultiApprover: true,
    approverRoles: ['department_head', 'manager', 'director'],
  },
};

// ============================================================
// 金额阈值配置（单位：元）
// ============================================================

export interface AmountThreshold {
  /** 阈值上限（不含） */
  max: number;
  /** 对应审批级别 */
  level: ApprovalLevel;
}

// 按金额升序排列的阈值配置
export const AMOUNT_THRESHOLDS: AmountThreshold[] = [
  { max: 1000, level: ApprovalLevel.EXEMPT },      // < 1000 免审批
  { max: 10000, level: ApprovalLevel.QUICK },      // 1000-10000 快速审批
  { max: 50000, level: ApprovalLevel.STANDARD },   // 10000-50000 标准审批
  // >= 50000 严格审批
];

// ============================================================
// 审批类型特定配置
// ============================================================

export interface TypeSpecificConfig {
  /** 审批类型 */
  type: ApprovalType;
  /** 是否强制免审批（忽略金额） */
  forceExempt?: boolean;
  /** 是否强制严格审批（忽略金额） */
  forceStrict?: boolean;
  /** 自定义审批级别（优先级最高） */
  forcedLevel?: ApprovalLevel;
  /** 自定义审批人数（覆盖默认配置） */
  customApproverCount?: number;
  /** 是否支持批量审批 */
  batchApprovalSupported: boolean;
  /** 备注 */
  remark?: string;
}

// 审批类型特定配置
export const TYPE_SPECIFIC_CONFIGS: TypeSpecificConfig[] = [
  // ========== 业务审批 ==========
  {
    type: ApprovalType.MATERIAL_REQUEST,
    batchApprovalSupported: true,
    remark: '领料申请，根据金额确定审批级别',
  },
  {
    type: ApprovalType.RETURN_MATERIAL,
    batchApprovalSupported: true,
    remark: '退料单',
  },
  {
    type: ApprovalType.PURCHASE_REQUEST,
    batchApprovalSupported: true,
    remark: '采购申请，根据采购金额确定审批级别',
  },
  {
    type: ApprovalType.MATERIAL_INBOUND,
    forceExempt: false,
    batchApprovalSupported: true,
    remark: '物料入库',
  },
  {
    type: ApprovalType.MATERIAL_TRANSFER,
    batchApprovalSupported: true,
    remark: '库存调拨',
  },
  {
    type: ApprovalType.SEED_SOURCE_INBOUND,
    batchApprovalSupported: false,
    remark: '种源入库，需要严格审批',
  },
  {
    type: ApprovalType.SEEDLING_PLAN,
    batchApprovalSupported: false,
    forceStrict: false,
    remark: '育苗计划',
  },
  {
    type: ApprovalType.PLANTING_PLAN,
    batchApprovalSupported: false,
    remark: '种植计划',
  },
  {
    type: ApprovalType.ORDER_CREATE,
    batchApprovalSupported: false,
    remark: '订单创建，高价值订单需要严格审批',
  },
  {
    type: ApprovalType.ORDER_CHANGE,
    batchApprovalSupported: false,
    remark: '订单变更',
  },

  // ========== 生产审批 ==========
  {
    type: ApprovalType.PRODUCTION_PLAN,
    batchApprovalSupported: false,
    remark: '生产计划，需要标准审批',
  },
  {
    type: ApprovalType.PRODUCTION_BATCH,
    batchApprovalSupported: false,
    remark: '生产批次',
  },
  {
    type: ApprovalType.BATCH_CHANGE,
    batchApprovalSupported: false,
    remark: '批次变更',
  },
  {
    type: ApprovalType.BATCH_VOID,
    batchApprovalSupported: false,
    forceStrict: true,
    remark: '批次作废，强制严格审批',
  },
  {
    type: ApprovalType.TECH_SOLUTION,
    batchApprovalSupported: false,
    remark: '技术方案',
  },

  // ========== 农事审批 ==========
  {
    type: ApprovalType.TASK_DISPATCH,
    batchApprovalSupported: false,
    remark: '任务派发',
  },
  {
    type: ApprovalType.TASK_CHANGE,
    batchApprovalSupported: false,
    remark: '任务变更',
  },
  {
    type: ApprovalType.INSPECTION_ISSUE,
    batchApprovalSupported: false,
    remark: '巡查问题',
  },
  {
    type: ApprovalType.ISSUE_RESOLVE,
    batchApprovalSupported: false,
    remark: '问题整改',
  },

  // ========== 采收审批 ==========
  {
    type: ApprovalType.HARVEST_REQUEST,
    batchApprovalSupported: false,
    remark: '采收申请',
  },

  // ========== 作物补录审批 ==========
  {
    type: ApprovalType.SEED_SOURCE_SUPPLEMENTARY,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '种源补录，强制严格审批',
  },
  {
    type: ApprovalType.SEEDLING_SUPPLEMENTARY,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '育苗补录，强制严格审批',
  },
  {
    type: ApprovalType.CROP_STORAGE_SUPPLEMENTARY,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '作物入库补录，强制严格审批',
  },

  // ========== 指标/公告审批 ==========
  {
    type: ApprovalType.INDICATOR_APPROVAL,
    batchApprovalSupported: false,
    remark: '指标审批',
  },
  {
    type: ApprovalType.ANNOUNCEMENT_APPROVAL,
    batchApprovalSupported: false,
    remark: '公告审批',
  },

  // ========== 成本审批 ==========
  {
    type: ApprovalType.BUDGET_CREATE,
    batchApprovalSupported: false,
    remark: '预算编制，高金额需要严格审批',
  },
  {
    type: ApprovalType.BUDGET_ADJUST,
    batchApprovalSupported: false,
    remark: '预算调整，高金额需要严格审批',
  },

  // ========== HR审批 ==========
  {
    type: ApprovalType.LEAVE,
    batchApprovalSupported: false,
    remark: '请假，3天内快速审批',
  },
  {
    type: ApprovalType.OVERTIME,
    batchApprovalSupported: false,
    remark: '加班，2小时内免审批',
  },
  {
    type: ApprovalType.RESIGNATION,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '离职，强制严格审批',
  },
  {
    type: ApprovalType.RECRUITMENT,
    batchApprovalSupported: false,
    remark: '招聘',
  },
  {
    type: ApprovalType.ONBOARDING,
    batchApprovalSupported: false,
    remark: '入职',
  },
  {
    type: ApprovalType.ATTENDANCE_REPAIR,
    batchApprovalSupported: false,
    remark: '考勤补录',
  },
  {
    type: ApprovalType.SALARY_ADJUSTMENT,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '调薪，强制严格审批',
  },
  {
    type: ApprovalType.CONTRACT_RENEWAL,
    batchApprovalSupported: false,
    remark: '合同续签',
  },
  {
    type: ApprovalType.SALARY_BUDGET,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '工资预算，强制严格审批',
  },
  {
    type: ApprovalType.TRANSFER,
    forceStrict: true,
    batchApprovalSupported: false,
    remark: '转岗，强制严格审批',
  },
];

// ============================================================
// 根据类型获取特定配置
// ============================================================

export function getTypeSpecificConfig(type: ApprovalType): TypeSpecificConfig | undefined {
  return TYPE_SPECIFIC_CONFIGS.find(config => config.type === type);
}

// ============================================================
// 根据金额获取审批级别
// ============================================================

export function getLevelByAmount(amount: number): ApprovalLevel {
  for (const threshold of AMOUNT_THRESHOLDS) {
    if (amount < threshold.max) {
      return threshold.level;
    }
  }
  return ApprovalLevel.STRICT; // 默认严格审批
}

// ============================================================
// 获取审批级别配置
// ============================================================

export function getApprovalLevelConfig(level: ApprovalLevel): ApprovalLevelConfig {
  return APPROVAL_LEVEL_CONFIGS[level];
}

// ============================================================
// 从数据字典加载配置
// ============================================================

const DICTIONARY_STORAGE_KEY = 'yuanxingtu_dictionaries';

/**
 * 获取高价值订单阈值（从数据字典加载）
 */
export function getHighValueOrderThreshold(): number {
  try {
    const stored = localStorage.getItem(DICTIONARY_STORAGE_KEY);
    if (!stored) {
      console.warn('【审批配置】数据字典未初始化，使用默认高价值阈值 100000');
      return 100000;
    }

    const dictionaries = JSON.parse(stored);
    const highValueItem = dictionaries.find((d: any) =>
      d.category === 'approval_rule' && d.code === 'high_value_threshold'
    );

    if (highValueItem) {
      return parseInt(highValueItem.name.replace(/[^\d]/g, ''), 10) || 100000;
    }

    console.warn('【审批配置】未找到高价值订单阈值配置，使用默认 100000');
    return 100000;
  } catch (error) {
    console.error('【审批配置】加载高价值订单阈值失败', error);
    return 100000;
  }
}

/**
 * 检查订单是否为高价值订单（从数据字典加载阈值）
 */
export function isHighValueOrder(amount: number): boolean {
  const threshold = getHighValueOrderThreshold();
  return amount >= threshold;
}

// ============================================================
// 审批级别名称映射
// ============================================================

export const APPROVAL_LEVEL_NAMES: Record<ApprovalLevel, string> = {
  [ApprovalLevel.EXEMPT]: '免审批',
  [ApprovalLevel.QUICK]: '快速审批',
  [ApprovalLevel.STANDARD]: '标准审批',
  [ApprovalLevel.STRICT]: '严格审批',
};
