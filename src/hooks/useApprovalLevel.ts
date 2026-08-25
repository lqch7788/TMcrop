// ============================================================
// 分级审批 Hook
// 文件路径：src/hooks/useApprovalLevel.ts
// 功能：提供分级审批的逻辑判断和状态管理
// ============================================================

import { useMemo, useCallback } from 'react';
import { ApprovalType, Approval, Approver } from '../types/approval';
import { ApprovalLevel } from '../config/approvalHierarchy';
import {
  resolveApprovalLevel,
  ApprovalLevelResult,
  generateInitialApprovers,
  approverConfigsToApprovers,
  getApprovalLevelName,
} from '../utils/approvalLevelResolver';

// ============================================================
// Hook 返回类型
// ============================================================

export interface UseApprovalLevelReturn {
  /** 根据类型和金额解析审批级别 */
  resolveLevel: (type: ApprovalType, amount: number, additionalData?: unknown) => ApprovalLevelResult;
  /** 根据类型和金额生成初始审批人配置 */
  generateApprovers: (
    type: ApprovalType,
    amount: number,
    additionalData?: { leaveDays?: number; overtimeHours?: number; isHighValue?: boolean }
  ) => {
    level: ApprovalLevel;
    approvers: Approver[];
    totalSteps: number;
    autoApprove: boolean;
  };
  /** 获取审批类型是否支持批量审批 */
  isBatchSupported: (type: ApprovalType) => boolean;
  /** 获取审批级别的中文名称 */
  getLevelName: (level: ApprovalLevel) => string;
  /** 判断审批单是否免审批 */
  isExempt: (approval: Approval) => boolean;
  /** 判断审批单是否自动通过（免审批或快速审批） */
  isAutoApprove: (approval: Approval) => boolean;
  /** 获取审批单对应的审批级别 */
  getApprovalLevel: (approval: Approval) => ApprovalLevel | null;
}

// ============================================================
// Hook 实现
// ============================================================

export function useApprovalLevel(): UseApprovalLevelReturn {
  // 根据类型和金额解析审批级别
  const resolveLevel = useCallback(
    (type: ApprovalType, amount: number, additionalData?: unknown): ApprovalLevelResult => {
      return resolveApprovalLevel(type, amount, additionalData);
    },
    []
  );

  // 根据类型和金额生成初始审批人配置
  const generateApprovers = useCallback(
    (
      type: ApprovalType,
      amount: number,
      additionalData?: { leaveDays?: number; overtimeHours?: number; isHighValue?: boolean }
    ) => {
      return generateInitialApprovers(type, amount, additionalData);
    },
    []
  );

  // 获取审批类型是否支持批量审批
  const isBatchSupported = useCallback((type: ApprovalType): boolean => {
    // 2026-08-25 fix：删除底部 require（顶部 L16 已有静态 import），浏览器不支持 require
    return isBatchApprovalSupported(type);
  }, []);

  // 获取审批级别的中文名称
  const getLevelName = useCallback((level: ApprovalLevel): string => {
    return getApprovalLevelName(level);
  }, []);

  // 判断审批单是否免审批
  const isExempt = useCallback((approval: Approval): boolean => {
    return approval.approvalLevel === ApprovalLevel.EXEMPT;
  }, []);

  // 判断审批单是否自动通过
  const isAutoApprove = useCallback((approval: Approval): boolean => {
    return approval.approvalLevel === ApprovalLevel.EXEMPT;
  }, []);

  // 获取审批单对应的审批级别
  const getApprovalLevel = useCallback((approval: Approval): ApprovalLevel | null => {
    if (!approval.approvalLevel) return null;
    return approval.approvalLevel as ApprovalLevel;
  }, []);

  return {
    resolveLevel,
    generateApprovers,
    isBatchSupported,
    getLevelName,
    isExempt,
    isAutoApprove,
    getApprovalLevel,
  };
}

// ============================================================
// 辅助函数：创建带分级审批的审批单
// ============================================================

export interface CreateApprovalOptions {
  /** 审批类型 */
  type: ApprovalType;
  /** 申请金额 */
  amount: number;
  /** 申请人ID */
  applicantId: string;
  /** 申请人名称 */
  applicantName: string;
  /** 申请人部门 */
  applicantDepartment: string;
  /** 标题 */
  title: string;
  /** 附加数据 */
  additionalData?: {
    leaveDays?: number;
    overtimeHours?: number;
    isHighValue?: boolean;
  };
  /** 业务关联数据 */
  businessLink?: Approval['businessLink'];
}

/**
 * 创建带有分级审批的审批单
 */
export function createApprovalWithLevel(options: CreateApprovalOptions): {
  approval: Partial<Approval>;
  levelResult: ApprovalLevelResult;
} {
  const { type, amount, applicantId, applicantName, applicantDepartment, title, additionalData, businessLink } = options;

  // 解析审批级别
  const levelResult = resolveApprovalLevel(type, amount, additionalData);

  // 构建审批单
  const now = new Date().toISOString();
  const approval: Partial<Approval> = {
    type,
    typeName: levelResult.config.name,
    title,
    applicantId,
    applicantName,
    applicantDepartment,
    applyDate: now.split('T')[0],
    applyTime: now.split('T')[1].split('.')[0],
    currentStep: levelResult.autoApprove ? 1 : 1,
    totalSteps: levelResult.approverCount,
    approvers: approverConfigsToApprovers(levelResult.approvers),
    status: levelResult.autoApprove ? 'approved' as const : 'pending' as const,
    businessLink,
    priority: 'normal',
    reminderCount: 0,
    createdAt: now,
    updatedAt: now,
    notificationSent: false,
    amount: amount.toString(),
    approvalLevel: levelResult.level,
  };

  return { approval, levelResult };
}

export default useApprovalLevel;
