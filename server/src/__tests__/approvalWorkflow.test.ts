/**
 * 审批流程测试
 */

import { describe, it, expect } from 'vitest';

// 模拟审批状态常量
const APPROVAL_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

// 审批类型
const APPROVAL_TYPE = {
  LEAVE: 'leave',
  OVERTIME: 'overtime',
  MATERIAL_REQUEST: 'material_request',
  PURCHASE_REQUEST: 'purchase_request',
} as const;

// 审批动作
const APPROVAL_ACTION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  PARTIALLY_APPROVE: 'partially_approve',
  CANCEL: 'cancel',
} as const;

/**
 * 审批状态转换规则
 */
function canTransition(currentStatus: string, targetStatus: string): boolean {
  const transitions: Record<string, string[]> = {
    [APPROVAL_STATUS.DRAFT]: [APPROVAL_STATUS.PENDING, APPROVAL_STATUS.CANCELLED],
    [APPROVAL_STATUS.PENDING]: [APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED, APPROVAL_STATUS.CANCELLED, APPROVAL_STATUS.PARTIALLY_APPROVED],
    [APPROVAL_STATUS.APPROVED]: [APPROVAL_STATUS.CANCELLED],
    [APPROVAL_STATUS.PARTIALLY_APPROVED]: [APPROVAL_STATUS.APPROVED, APPROVAL_STATUS.REJECTED, APPROVAL_STATUS.CANCELLED],
    [APPROVAL_STATUS.REJECTED]: [],
    [APPROVAL_STATUS.CANCELLED]: [],
  };
  return transitions[currentStatus]?.includes(targetStatus) || false;
}

/**
 * 验证审批动作是否有效
 */
function isValidAction(action: string, currentStatus: string): boolean {
  if (currentStatus === APPROVAL_STATUS.PENDING) {
    return [APPROVAL_ACTION.APPROVE, APPROVAL_ACTION.REJECT, APPROVAL_ACTION.PARTIALLY_APPROVE, APPROVAL_ACTION.CANCEL].includes(action as any);
  }
  if (currentStatus === APPROVAL_STATUS.DRAFT) {
    return action === APPROVAL_ACTION.CANCEL;
  }
  if (currentStatus === APPROVAL_STATUS.APPROVED || currentStatus === APPROVAL_STATUS.PARTIALLY_APPROVED) {
    return action === APPROVAL_ACTION.CANCEL;
  }
  return false;
}

/**
 * 获取下一个审批状态
 */
function getNextStatus(currentStatus: string, action: string): string | null {
  if (action === APPROVAL_ACTION.APPROVE) {
    return APPROVAL_STATUS.APPROVED;
  }
  if (action === APPROVAL_ACTION.REJECT) {
    return APPROVAL_STATUS.REJECTED;
  }
  if (action === APPROVAL_ACTION.PARTIALLY_APPROVE) {
    return APPROVAL_STATUS.PARTIALLY_APPROVED;
  }
  if (action === APPROVAL_ACTION.CANCEL) {
    return APPROVAL_STATUS.CANCELLED;
  }
  return null;
}

describe('审批流程逻辑', () => {
  describe('状态转换规则', () => {
    it('草稿状态可以提交到待审批', () => {
      expect(canTransition(APPROVAL_STATUS.DRAFT, APPROVAL_STATUS.PENDING)).toBe(true);
    });

    it('草稿状态可以取消', () => {
      expect(canTransition(APPROVAL_STATUS.DRAFT, APPROVAL_STATUS.CANCELLED)).toBe(true);
    });

    it('待审批状态可以批准', () => {
      expect(canTransition(APPROVAL_STATUS.PENDING, APPROVAL_STATUS.APPROVED)).toBe(true);
    });

    it('待审批状态可以拒绝', () => {
      expect(canTransition(APPROVAL_STATUS.PENDING, APPROVAL_STATUS.REJECTED)).toBe(true);
    });

    it('待审批状态可以部分批准', () => {
      expect(canTransition(APPROVAL_STATUS.PENDING, APPROVAL_STATUS.PARTIALLY_APPROVED)).toBe(true);
    });

    it('已拒绝状态不能转换到其他状态', () => {
      expect(canTransition(APPROVAL_STATUS.REJECTED, APPROVAL_STATUS.PENDING)).toBe(false);
      expect(canTransition(APPROVAL_STATUS.REJECTED, APPROVAL_STATUS.APPROVED)).toBe(false);
    });

    it('已取消状态不能转换到其他状态', () => {
      expect(canTransition(APPROVAL_STATUS.CANCELLED, APPROVAL_STATUS.PENDING)).toBe(false);
    });
  });

  describe('审批动作验证', () => {
    it('待审批状态可以执行批准动作', () => {
      expect(isValidAction(APPROVAL_ACTION.APPROVE, APPROVAL_STATUS.PENDING)).toBe(true);
    });

    it('待审批状态可以执行拒绝动作', () => {
      expect(isValidAction(APPROVAL_ACTION.REJECT, APPROVAL_STATUS.PENDING)).toBe(true);
    });

    it('已批准状态不能执行批准动作', () => {
      expect(isValidAction(APPROVAL_ACTION.APPROVE, APPROVAL_STATUS.APPROVED)).toBe(false);
    });

    it('已拒绝状态不能执行任何动作', () => {
      expect(isValidAction(APPROVAL_ACTION.APPROVE, APPROVAL_STATUS.REJECTED)).toBe(false);
      expect(isValidAction(APPROVAL_ACTION.REJECT, APPROVAL_STATUS.REJECTED)).toBe(false);
    });
  });

  describe('状态转换计算', () => {
    it('批准动作应转换到已批准状态', () => {
      expect(getNextStatus(APPROVAL_STATUS.PENDING, APPROVAL_ACTION.APPROVE)).toBe(APPROVAL_STATUS.APPROVED);
    });

    it('拒绝动作应转换到已拒绝状态', () => {
      expect(getNextStatus(APPROVAL_STATUS.PENDING, APPROVAL_ACTION.REJECT)).toBe(APPROVAL_STATUS.REJECTED);
    });

    it('取消动作应转换到已取消状态', () => {
      expect(getNextStatus(APPROVAL_STATUS.PENDING, APPROVAL_ACTION.CANCEL)).toBe(APPROVAL_STATUS.CANCELLED);
    });
  });

  describe('审批类型验证', () => {
    it('应该支持请假审批', () => {
      expect(Object.values(APPROVAL_TYPE)).toContain('leave');
    });

    it('应该支持加班审批', () => {
      expect(Object.values(APPROVAL_TYPE)).toContain('overtime');
    });

    it('应该支持物料申请审批', () => {
      expect(Object.values(APPROVAL_TYPE)).toContain('material_request');
    });

    it('应该支持采购申请审批', () => {
      expect(Object.values(APPROVAL_TYPE)).toContain('purchase_request');
    });
  });
});
