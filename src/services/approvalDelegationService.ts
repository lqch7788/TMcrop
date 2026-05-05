// ============================================================
// 审批委托服务
// 文件路径：src/services/approvalDelegationService.ts
// 功能：管理审批委托、委托规则和自动委托
// ============================================================

import { Approval, ApprovalType, Approver } from '../types/approval';
import {
  DelegationConfig,
  DelegationRule,
  getDelegationRules,
} from '../config/approvalTimeout';

// ============================================================
// 委托记录
// ============================================================

export interface DelegationRecord {
  /** 记录ID */
  id: string;
  /** 委托人ID */
  delegatorId: string;
  /** 委托人名称 */
  delegatorName: string;
  /** 受托人ID */
  delegateeId: string;
  /** 受托人名称 */
  delegateeName: string;
  /** 委托类型 */
  type: 'manual' | 'auto' | 'rule';
  /** 委托的审批类型（为空表示全部） */
  allowedTypes?: ApprovalType[];
  /** 审批单ID */
  approvalId?: string;
  /** 审批单编号 */
  approvalCode?: string;
  /** 委托生效时间 */
  startTime: string;
  /** 委托结束时间 */
  endTime?: string;
  /** 委托原因 */
  reason?: string;
  /** 是否激活 */
  active: boolean;
  /** 创建时间 */
  createdAt: string;
}

// ============================================================
// 委托查询结果
// ============================================================

export interface DelegationQueryResult {
  /** 是否找到受托人 */
  found: boolean;
  /** 受托人ID */
  delegateeId?: string;
  /** 受托人名称 */
  delegateeName?: string;
  /** 委托类型 */
  type?: 'manual' | 'auto' | 'rule';
  /** 委托记录 */
  record?: DelegationRecord;
}

// ============================================================
// 委托服务
// ============================================================

export class ApprovalDelegationService {
  private delegationRules: DelegationRule[] = getDelegationRules();
  private activeDelegations: Map<string, DelegationRecord> = new Map();
  private delegationHistory: DelegationRecord[] = [];

  /**
   * 添加委托规则
   */
  addRule(rule: DelegationRule): void {
    this.delegationRules.push(rule);
  }

  /**
   * 启用/禁用规则
   */
  setRuleEnabled(fromRole: string, toRole: string, enabled: boolean): void {
    const rule = this.delegationRules.find(r => r.fromRole === fromRole && r.toRole === toRole);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 获取所有规则
   */
  getRules(): DelegationRule[] {
    return [...this.delegationRules];
  }

  /**
   * 创建委托
   */
  createDelegation(config: DelegationConfig): DelegationRecord {
    const now = new Date().toISOString();
    const record: DelegationRecord = {
      id: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      delegatorId: config.delegatorId,
      delegatorName: config.delegatorName,
      delegateeId: config.delegateeId,
      delegateeName: config.delegateeName,
      type: 'manual',
      allowedTypes: config.allowedTypes,
      startTime: config.startDate ? `${config.startDate}T00:00:00` : now,
      endTime: config.endDate ? `${config.endDate}T23:59:59` : undefined,
      reason: config.reason,
      active: true,
      createdAt: now,
    };

    this.activeDelegations.set(record.id, record);
    this.delegationHistory.push(record);

    return record;
  }

  /**
   * 取消委托
   */
  cancelDelegation(delegationId: string): boolean {
    const delegation = this.activeDelegations.get(delegationId);
    if (delegation) {
      delegation.active = false;
      delegation.endTime = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * 查询某用户是否有委托出去的单据
   */
  getActiveDelegations(userId: string): DelegationRecord[] {
    return Array.from(this.activeDelegations.values()).filter(
      d => d.delegatorId === userId && d.active
    );
  }

  /**
   * 查询某用户被委托的单据
   */
  getReceivedDelegations(userId: string): DelegationRecord[] {
    return Array.from(this.activeDelegations.values()).filter(
      d => d.delegateeId === userId && d.active
    );
  }

  /**
   * 检查用户是否正在代理某审批
   */
  isDelegatedTo(approvalId: string, userId: string): DelegationRecord | undefined {
    return Array.from(this.activeDelegations.values()).find(
      d => d.approvalId === approvalId &&
           d.delegateeId === userId &&
           d.active &&
           this.isWithinValidPeriod(d)
    );
  }

  /**
   * 检查委托是否在有效期内
   */
  private isWithinValidPeriod(record: DelegationRecord): boolean {
    const now = new Date();
    const start = new Date(record.startTime);
    const end = record.endTime ? new Date(record.endTime) : null;

    if (now < start) return false;
    if (end && now > end) return false;

    return true;
  }

  /**
   * 查找审批人的受托人
   */
  findDelegatee(approverId: string, approverRole: string, approvalType?: ApprovalType): DelegationQueryResult {
    // 1. 先检查是否有针对该审批人的主动委托
    const activeDelegations = this.getActiveDelegations(approverId);
    for (const delegation of activeDelegations) {
      if (this.isWithinValidPeriod(delegation)) {
        // 检查是否允许该审批类型
        if (!delegation.allowedTypes || delegation.allowedTypes.length === 0 ||
            (approvalType && delegation.allowedTypes.includes(approvalType))) {
          return {
            found: true,
            delegateeId: delegation.delegateeId,
            delegateeName: delegation.delegateeName,
            type: 'manual',
            record: delegation,
          };
        }
      }
    }

    // 2. 检查是否有针对该角色的自动委托规则
    const enabledRule = this.delegationRules.find(
      r => r.fromRole === approverRole && r.enabled
    );

    if (enabledRule) {
      return {
        found: true,
        delegateeId: `auto_${enabledRule.toRole}`,
        delegateeName: this.getRoleName(enabledRule.toRole),
        type: 'rule',
      };
    }

    return { found: false };
  }

  /**
   * 获取角色名称
   */
  private getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      manager: '经理',
      department_head: '部门主管',
      director: '总监',
      hr: '人事专员',
      hr_manager: '人事经理',
    };
    return roleNames[role] || role;
  }

  /**
   * 转移审批人到受托人
   */
  transferApprover(approvers: Approver[], newApproverId: string, newApproverName: string): Approver[] {
    // 在当前审批人位置插入受托人，原审批人后移
    const pendingIndex = approvers.findIndex(a => a.status === 'pending');
    if (pendingIndex === -1) {
      // 没有待审批人，直接返回
      return approvers;
    }

    const newApprovers = [...approvers];
    newApprovers[pendingIndex] = {
      ...newApprovers[pendingIndex],
      userId: newApproverId,
      userName: newApproverName,
      comment: '(代理审批)',
    };

    return newApprovers;
  }

  /**
   * 检查审批单是否已被委托
   */
  isApprovalDelegated(approvalId: string): boolean {
    return Array.from(this.activeDelegations.values()).some(
      d => d.approvalId === approvalId && d.active && this.isWithinValidPeriod(d)
    );
  }

  /**
   * 创建审批委托记录
   */
  createApprovalDelegation(
    approval: Approval,
    delegateeId: string,
    delegateeName: string,
    reason?: string
  ): DelegationRecord {
    const now = new Date().toISOString();
    const record: DelegationRecord = {
      id: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      delegatorId: approval.approvers[approval.currentStep - 1]?.userId || '',
      delegatorName: approval.approvers[approval.currentStep - 1]?.userName || '',
      delegateeId,
      delegateeName,
      type: 'manual',
      approvalId: approval.id,
      approvalCode: approval.code,
      startTime: now,
      reason,
      active: true,
      createdAt: now,
    };

    this.activeDelegations.set(record.id, record);
    this.delegationHistory.push(record);

    return record;
  }

  /**
   * 获取委托历史
   */
  getHistory(delegatorId?: string): DelegationRecord[] {
    if (delegatorId) {
      return this.delegationHistory.filter(d => d.delegatorId === delegatorId);
    }
    return [...this.delegationHistory];
  }

  /**
   * 导出活跃委托
   */
  exportActiveDelegations(): DelegationRecord[] {
    return Array.from(this.activeDelegations.values()).filter(d => d.active);
  }
}

// ============================================================
// 委托服务单例
// ============================================================

export const approvalDelegationService = new ApprovalDelegationService();

export default approvalDelegationService;
