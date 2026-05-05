// ============================================================
// 分级审批解析器
// 文件路径：src/utils/approvalLevelResolver.ts
// 功能：根据金额、类型等条件自动确定审批级别和审批人
// ============================================================

import { Approval, ApprovalType, Approver } from '../types/approval';
import {
  ApprovalLevel,
  ApprovalLevelConfig,
  APPROVAL_LEVEL_CONFIGS,
  getTypeSpecificConfig,
  getLevelByAmount,
  getApprovalLevelConfig,
  TYPE_SPECIFIC_CONFIGS,
  isHighValueOrder,
} from '../config/approvalHierarchy';

// ============================================================
// 解析结果
// ============================================================

export interface ApprovalLevelResult {
  /** 最终审批级别 */
  level: ApprovalLevel;
  /** 审批级别配置 */
  config: ApprovalLevelConfig;
  /** 需要配置的审批人数 */
  approverCount: number;
  /** 审批人列表 */
  approvers: ApproverConfig[];
  /** 是否自动通过 */
  autoApprove: boolean;
  /** 解析说明 */
  reason: string;
}

export interface ApproverConfig {
  /** 审批顺序 */
  order: number;
  /** 审批人ID */
  userId: string;
  /** 审批人名称 */
  userName: string;
  /** 审批人角色 */
  role: string;
  /** 是否必填 */
  required: boolean;
}

// ============================================================
// 审批人模拟数据（实际项目中应从后端或配置获取）
// ============================================================

const DEFAULT_APPROVERS = {
  department_head: { userId: 'dept_head_001', userName: '部门主管', role: 'department_head' },
  manager: { userId: 'manager_001', userName: '经理', role: 'manager' },
  director: { userId: 'director_001', userName: '总监', role: 'director' },
  hr: { userId: 'hr_001', userName: '人事主管', role: 'hr' },
};

// ============================================================
// 解析审批级别
// ============================================================

/**
 * 根据审批类型和金额解析审批级别
 * @param type 审批类型
 * @param amount 金额（单位：元）
 * @param additionalData 额外数据（如请假天数、加班小时数等）
 * @returns 审批级别解析结果
 */
export function resolveApprovalLevel(
  type: ApprovalType,
  amount: number,
  additionalData?: {
    leaveDays?: number;    // 请假天数
    overtimeHours?: number; // 加班小时数
    isHighValue?: boolean;  // 是否高价值订单
  }
): ApprovalLevelResult {
  const typeConfig = getTypeSpecificConfig(type);

  // 1. 检查是否有强制级别配置
  if (typeConfig?.forcedLevel) {
    const config = getApprovalLevelConfig(typeConfig.forcedLevel);
    return {
      level: typeConfig.forcedLevel,
      config,
      approverCount: config.approverCount,
      approvers: generateApprovers(typeConfig.forcedLevel),
      autoApprove: typeConfig.forcedLevel === ApprovalLevel.EXEMPT,
      reason: `[强制] ${typeConfig.remark || '类型强制指定为' + config.name}`,
    };
  }

  // 2. 检查是否强制免审批
  if (typeConfig?.forceExempt) {
    const config = getApprovalLevelConfig(ApprovalLevel.EXEMPT);
    return {
      level: ApprovalLevel.EXEMPT,
      config,
      approverCount: 0,
      approvers: [],
      autoApprove: true,
      reason: `[强制免审] ${typeConfig.remark || '该类型强制免审批'}`,
    };
  }

  // 3. 检查特定类型的特殊规则
  const specialRuleResult = checkSpecialRules(type, amount, additionalData);
  if (specialRuleResult) {
    return specialRuleResult;
  }

  // 4. 根据金额计算审批级别
  const amountLevel = getLevelByAmount(amount);
  const config = getApprovalLevelConfig(amountLevel);

  return {
    level: amountLevel,
    config,
    approverCount: config.approverCount,
    approvers: generateApprovers(amountLevel),
    autoApprove: amountLevel === ApprovalLevel.EXEMPT,
    reason: `[金额判断] 金额${amount}元对应${config.name}`,
  };
}

// ============================================================
// 检查特殊规则
// ============================================================

function checkSpecialRules(
  type: ApprovalType,
  amount: number,
  additionalData?: {
    leaveDays?: number;
    overtimeHours?: number;
    isHighValue?: boolean;
  }
): ApprovalLevelResult | null {
  // 请假规则：3天内快速审批，3-7天标准审批，超过7天严格审批
  if (type === ApprovalType.LEAVE && additionalData?.leaveDays !== undefined) {
    const days = additionalData.leaveDays;
    if (days <= 3) {
      const config = getApprovalLevelConfig(ApprovalLevel.QUICK);
      return {
        level: ApprovalLevel.QUICK,
        config,
        approverCount: 1,
        approvers: [createApproverConfig(1, DEFAULT_APPROVERS.manager)],
        autoApprove: false,
        reason: `[请假规则] ${days}天内快速审批`,
      };
    } else if (days <= 7) {
      const config = getApprovalLevelConfig(ApprovalLevel.STANDARD);
      return {
        level: ApprovalLevel.STANDARD,
        config,
        approverCount: 2,
        approvers: [
          createApproverConfig(1, DEFAULT_APPROVERS.department_head),
          createApproverConfig(2, DEFAULT_APPROVERS.manager),
        ],
        autoApprove: false,
        reason: `[请假规则] ${days}天标准审批`,
      };
    } else {
      const config = getApprovalLevelConfig(ApprovalLevel.STRICT);
      return {
        level: ApprovalLevel.STRICT,
        config,
        approverCount: 3,
        approvers: [
          createApproverConfig(1, DEFAULT_APPROVERS.department_head),
          createApproverConfig(2, DEFAULT_APPROVERS.manager),
          createApproverConfig(3, DEFAULT_APPROVERS.director),
        ],
        autoApprove: false,
        reason: `[请假规则] ${days}天严格审批`,
      };
    }
  }

  // 加班规则：2小时内免审批
  if (type === ApprovalType.OVERTIME && additionalData?.overtimeHours !== undefined) {
    const hours = additionalData.overtimeHours;
    if (hours <= 2) {
      const config = getApprovalLevelConfig(ApprovalLevel.EXEMPT);
      return {
        level: ApprovalLevel.EXEMPT,
        config,
        approverCount: 0,
        approvers: [],
        autoApprove: true,
        reason: `[加班规则] ${hours}小时内免审批`,
      };
    } else if (hours <= 8) {
      const config = getApprovalLevelConfig(ApprovalLevel.QUICK);
      return {
        level: ApprovalLevel.QUICK,
        config,
        approverCount: 1,
        approvers: [createApproverConfig(1, DEFAULT_APPROVERS.manager)],
        autoApprove: false,
        reason: `[加班规则] ${hours}小时快速审批`,
      };
    } else {
      const config = getApprovalLevelConfig(ApprovalLevel.STANDARD);
      return {
        level: ApprovalLevel.STANDARD,
        config,
        approverCount: 2,
        approvers: [
          createApproverConfig(1, DEFAULT_APPROVERS.department_head),
          createApproverConfig(2, DEFAULT_APPROVERS.manager),
        ],
        autoApprove: false,
        reason: `[加班规则] ${hours}小时标准审批`,
      };
    }
  }

  // 高价值订单（金额 >= 高价值阈值）严格审批
  if ((type === ApprovalType.ORDER_CREATE || type === ApprovalType.ORDER_CHANGE) && isHighValueOrder(amount)) {
    const config = getApprovalLevelConfig(ApprovalLevel.STRICT);
    return {
      level: ApprovalLevel.STRICT,
      config,
      approverCount: 3,
      approvers: [
        createApproverConfig(1, DEFAULT_APPROVERS.department_head),
        createApproverConfig(2, DEFAULT_APPROVERS.manager),
        createApproverConfig(3, DEFAULT_APPROVERS.director),
      ],
      autoApprove: false,
      reason: `[订单规则] 高价值订单严格审批`,
    };
  }

  return null;
}

// ============================================================
// 生成审批人列表
// ============================================================

function generateApprovers(level: ApprovalLevel): ApproverConfig[] {
  switch (level) {
    case ApprovalLevel.EXEMPT:
      return [];

    case ApprovalLevel.QUICK:
      return [createApproverConfig(1, DEFAULT_APPROVERS.manager)];

    case ApprovalLevel.STANDARD:
      return [
        createApproverConfig(1, DEFAULT_APPROVERS.department_head),
        createApproverConfig(2, DEFAULT_APPROVERS.manager),
      ];

    case ApprovalLevel.STRICT:
      return [
        createApproverConfig(1, DEFAULT_APPROVERS.department_head),
        createApproverConfig(2, DEFAULT_APPROVERS.manager),
        createApproverConfig(3, DEFAULT_APPROVERS.director),
      ];

    default:
      return [];
  }
}

function createApproverConfig(
  order: number,
  approver: { userId: string; userName: string; role: string }
): ApproverConfig {
  return {
    order,
    userId: approver.userId,
    userName: approver.userName,
    role: approver.role,
    required: true,
  };
}

// ============================================================
// 审批人配置转换为审批对象
// ============================================================

export function approverConfigsToApprovers(configs: ApproverConfig[]): Approver[] {
  return configs.map(config => ({
    userId: config.userId,
    userName: config.userName,
    role: config.role,
    order: config.order,
    status: 'pending' as const,
  }));
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 获取审批类型是否支持批量审批
 */
export function isBatchApprovalSupported(type: ApprovalType): boolean {
  const config = getTypeSpecificConfig(type);
  return config?.batchApprovalSupported ?? false;
}

/**
 * 获取审批级别的中文名称
 */
export function getApprovalLevelName(level: ApprovalLevel): string {
  return APPROVAL_LEVEL_CONFIGS[level].name;
}

/**
 * 检查是否需要多审
 */
export function requiresMultiApprover(level: ApprovalLevel): boolean {
  return APPROVAL_LEVEL_CONFIGS[level].requireMultiApprover;
}

/**
 * 根据类型和金额生成审批单据的初始审批人配置
 */
export function generateInitialApprovers(
  type: ApprovalType,
  amount: number,
  additionalData?: {
    leaveDays?: number;
    overtimeHours?: number;
    isHighValue?: boolean;
  }
): {
  level: ApprovalLevel;
  approvers: Approver[];
  totalSteps: number;
  autoApprove: boolean;
} {
  const result = resolveApprovalLevel(type, amount, additionalData);
  return {
    level: result.level,
    approvers: approverConfigsToApprovers(result.approvers),
    totalSteps: result.approverCount,
    autoApprove: result.autoApprove,
  };
}
