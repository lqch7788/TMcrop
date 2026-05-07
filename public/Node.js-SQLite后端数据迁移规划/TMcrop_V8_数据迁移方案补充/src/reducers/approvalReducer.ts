// ============================================================
// 审批中心 - 统一Reducer
// 文件路径：src/reducers/approvalReducer.ts
// 组件化结构：统一管理审批模块的状态
// ============================================================

import { Approval, ApprovalFilters, ApprovalRecord, ApprovalStatus } from '../types/approval';

// ============================================================
// State 类型定义
// ============================================================

export interface ApprovalState {
  approvals: Approval[];
  filters: ApprovalFilters;
}

// ============================================================
// Action 类型定义
// ============================================================

export type ApprovalActionPayload =
  | { type: 'SET_APPROVALS'; payload: Approval[] }
  | { type: 'ADD_APPROVAL'; payload: Approval }
  | { type: 'UPDATE_APPROVAL'; payload: { id: string; updates: Partial<Approval> } }
  | { type: 'DELETE_APPROVAL'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<ApprovalFilters> }
  | { type: 'RESET_FILTERS' }
  | { type: 'APPROVE'; payload: { id: string; comment?: string; approverId?: string; approverName?: string } }
  | { type: 'REJECT'; payload: { id: string; comment: string; approverId?: string; approverName?: string } }
  | { type: 'PARTIALLY_APPROVE'; payload: { id: string; items: Record<string, number>; comment?: string; approverId?: string; approverName?: string } }
  | { type: 'CANCEL'; payload: { id: string; reason?: string } };

// ============================================================
// 初始状态
// ============================================================

export const initialApprovalState: ApprovalState = {
  approvals: [],
  filters: {},
};

// ============================================================
// 辅助函数：创建审批记录
// ============================================================

function createApprovalRecord(
  approvalId: string,
  action: 'approve' | 'reject' | 'partially_approve' | 'cancel',
  approverId: string,
  approverName: string,
  comment?: string
): ApprovalRecord {
  return {
    id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    approvalId,
    approverId,
    approverName,
    action,
    comment,
    actionTime: new Date().toISOString(),
  };
}

// ============================================================
// Reducer 实现
// ============================================================

export function approvalReducer(
  state: ApprovalState,
  action: ApprovalActionPayload
): ApprovalState {
  switch (action.type) {
    case 'SET_APPROVALS':
      return {
        ...state,
        approvals: action.payload,
      };

    case 'ADD_APPROVAL':
      return {
        ...state,
        approvals: [action.payload, ...state.approvals],
      };

    case 'UPDATE_APPROVAL':
      return {
        ...state,
        approvals: state.approvals.map(a =>
          a.id === action.payload.id
            ? { ...a, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : a
        ),
      };

    case 'DELETE_APPROVAL':
      return {
        ...state,
        approvals: state.approvals.filter(a => a.id !== action.payload),
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {},
      };

    case 'APPROVE': {
      const { id, comment, approverId = 'current_user', approverName = '当前用户' } = action.payload;
      const approval = state.approvals.find(a => a.id === id);
      if (!approval) return state;

      const record = createApprovalRecord(id, 'approve', approverId, approverName, comment);

      // 判断是否完成整个审批流程
      const isLastStep = approval.currentStep >= approval.totalSteps;
      const newStatus: ApprovalStatus = isLastStep ? ApprovalStatus.APPROVED : approval.status;
      const newStep = isLastStep ? approval.currentStep : approval.currentStep + 1;

      // 更新当前审批人的状态
      const updatedApprovers = approval.approvers.map((approver, index) => {
        if (index === approval.currentStep - 1) {
          return {
            ...approver,
            status: 'approved' as const,
            comment,
            actionTime: new Date().toISOString(),
          };
        }
        return approver;
      });

      return {
        ...state,
        approvals: state.approvals.map(a =>
          a.id === id
            ? {
                ...a,
                status: newStatus,
                currentStep: newStep,
                approvers: updatedApprovers,
                records: [...a.records, record],
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      };
    }

    case 'REJECT': {
      const { id, comment, approverId = 'current_user', approverName = '当前用户' } = action.payload;
      const approval = state.approvals.find(a => a.id === id);
      if (!approval) return state;

      const record = createApprovalRecord(id, 'reject', approverId, approverName, comment);

      // 更新当前审批人的状态
      const updatedApprovers = approval.approvers.map((approver, index) => {
        if (index === approval.currentStep - 1) {
          return {
            ...approver,
            status: 'rejected' as const,
            comment,
            actionTime: new Date().toISOString(),
          };
        }
        return approver;
      });

      return {
        ...state,
        approvals: state.approvals.map(a =>
          a.id === id
            ? {
                ...a,
                status: ApprovalStatus.REJECTED,
                approvers: updatedApprovers,
                records: [...a.records, record],
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      };
    }

    case 'PARTIALLY_APPROVE': {
      const { id, items, comment, approverId = 'current_user', approverName = '当前用户' } = action.payload;
      const approval = state.approvals.find(a => a.id === id);
      if (!approval) return state;

      const record = createApprovalRecord(id, 'partially_approve', approverId, approverName, comment);

      // 更新业务关联中的审批数量
      let updatedBusinessLink = approval.businessLink;
      if (approval.businessLink && 'materials' in approval.businessLink) {
        updatedBusinessLink = {
          ...approval.businessLink,
          materials: approval.businessLink.materials.map((m: { materialId: string; requestedQuantity?: number; approvedQuantity?: number }) => ({
            ...m,
            approvedQuantity: items[m.materialId] ?? m.requestedQuantity,
          })),
        };
      }

      // 更新当前审批人的状态
      const updatedApprovers = approval.approvers.map((approver, index) => {
        if (index === approval.currentStep - 1) {
          return {
            ...approver,
            status: 'approved' as const,
            comment,
            actionTime: new Date().toISOString(),
          };
        }
        return approver;
      });

      return {
        ...state,
        approvals: state.approvals.map(a =>
          a.id === id
            ? {
                ...a,
                status: ApprovalStatus.PARTIALLY_APPROVED,
                businessLink: updatedBusinessLink,
                approvers: updatedApprovers,
                records: [...a.records, record],
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      };
    }

    case 'CANCEL': {
      const { id, reason } = action.payload;
      const approval = state.approvals.find(a => a.id === id);
      if (!approval) return state;

      const record = createApprovalRecord(
        id,
        'cancel',
        approval.applicantId,
        approval.applicantName,
        reason
      );

      return {
        ...state,
        approvals: state.approvals.map(a =>
          a.id === id
            ? {
                ...a,
                status: ApprovalStatus.CANCELLED,
                records: [...a.records, record],
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      };
    }

    default:
      return state;
  }
}

export default approvalReducer;
