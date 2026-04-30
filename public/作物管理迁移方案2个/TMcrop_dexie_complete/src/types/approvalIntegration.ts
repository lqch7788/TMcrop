// ============================================================
// 审批中心 - 业务联动接口定义
// 文件路径：src/types/approvalIntegration.ts
// 组件化结构：审批结果触发其他模块更新
// ============================================================

import type { Approval, BusinessLink } from './approval';

// ============================================================
// 联动处理器接口
// ============================================================

export interface ApprovalIntegrationHandler {
  // 处理物料申请审批通过
  onMaterialApprovalApproved?: (approval: Approval, materialLink: Extract<BusinessLink, { type: 'material' }>) => void;

  // 处理物料申请部分通过
  onMaterialApprovalPartiallyApproved?: (
    approval: Approval,
    materialLink: Extract<BusinessLink, { type: 'material' }>,
    approvedItems: Record<string, number>
  ) => void;

  // 处理采购申请审批通过
  onPurchaseApprovalApproved?: (approval: Approval, purchaseLink: Extract<BusinessLink, { type: 'purchase' }>) => void;

  // 处理生产计划审批通过
  onProductionApprovalApproved?: (approval: Approval, productionLink: Extract<BusinessLink, { type: 'production' }>) => void;

  // 处理采收申请审批通过
  onHarvestApprovalApproved?: (approval: Approval, harvestLink: Extract<BusinessLink, { type: 'harvest' }>) => void;

  // 处理请假审批通过
  onLeaveApprovalApproved?: (approval: Approval, leaveLink: Extract<BusinessLink, { type: 'leave' }>) => void;

  // 处理加班审批通过
  onOvertimeApprovalApproved?: (approval: Approval, overtimeLink: Extract<BusinessLink, { type: 'overtime' }>) => void;

  // 处理调岗审批通过
  onTransferApprovalApproved?: (approval: Approval, transferLink: Extract<BusinessLink, { type: 'transfer' }>) => void;

  // 处理离职审批通过
  onResignApprovalApproved?: (approval: Approval, resignLink: Extract<BusinessLink, { type: 'resign' }>) => void;

  // 处理审批拒绝
  onApprovalRejected?: (approval: Approval, reason: string) => void;

  // 处理审批撤回
  onApprovalCancelled?: (approval: Approval, reason: string) => void;
}

// ============================================================
// 联动注册表
// ============================================================

export const approvalIntegrationRegistry: ApprovalIntegrationHandler[] = [];

// 注册联动处理器
export function registerApprovalIntegration(handler: ApprovalIntegrationHandler): void {
  approvalIntegrationRegistry.push(handler);
}

// 执行联动
export function executeApprovalIntegration(
  action: 'approved' | 'partially_approved' | 'rejected' | 'cancelled',
  approval: Approval,
  extra?: Record<string, unknown>
): void {
  const businessLink = approval.businessLink;

  for (const handler of approvalIntegrationRegistry) {
    switch (action) {
      case 'approved':
        if (businessLink?.type === 'material' && handler.onMaterialApprovalApproved) {
          handler.onMaterialApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'material' }>);
        }
        if (businessLink?.type === 'purchase' && handler.onPurchaseApprovalApproved) {
          handler.onPurchaseApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'purchase' }>);
        }
        if (businessLink?.type === 'production' && handler.onProductionApprovalApproved) {
          handler.onProductionApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'production' }>);
        }
        if (businessLink?.type === 'harvest' && handler.onHarvestApprovalApproved) {
          handler.onHarvestApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'harvest' }>);
        }
        if (businessLink?.type === 'leave' && handler.onLeaveApprovalApproved) {
          handler.onLeaveApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'leave' }>);
        }
        if (businessLink?.type === 'overtime' && handler.onOvertimeApprovalApproved) {
          handler.onOvertimeApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'overtime' }>);
        }
        if (businessLink?.type === 'transfer' && handler.onTransferApprovalApproved) {
          handler.onTransferApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'transfer' }>);
        }
        if (businessLink?.type === 'resign' && handler.onResignApprovalApproved) {
          handler.onResignApprovalApproved(approval, businessLink as Extract<BusinessLink, { type: 'resign' }>);
        }
        break;

      case 'partially_approved':
        if (businessLink?.type === 'material' && handler.onMaterialApprovalPartiallyApproved) {
          handler.onMaterialApprovalPartiallyApproved(
            approval,
            businessLink as Extract<BusinessLink, { type: 'material' }>,
            (extra?.approvedItems as Record<string, number>) || {}
          );
        }
        break;

      case 'rejected':
        if (handler.onApprovalRejected) {
          handler.onApprovalRejected(approval, (extra?.reason as string) || '');
        }
        break;

      case 'cancelled':
        if (handler.onApprovalCancelled) {
          handler.onApprovalCancelled(approval, (extra?.reason as string) || '');
        }
        break;
    }
  }
}

// ============================================================
// 联动场景示例
// ============================================================

// 场景1：领料单审批通过 → 库存减少
export const materialApprovalHandler: ApprovalIntegrationHandler = {
  onMaterialApprovalApproved: (approval, materialLink) => {
    console.log('【联动】领料单审批通过', {
      approvalCode: approval.code,
      materials: materialLink.materials,
    });
    // TODO: 调用库存管理模块减少库存
    // inventoryStore.decreaseStock(materialLink.materials, approval.code);
  },

  onMaterialApprovalPartiallyApproved: (approval, materialLink, approvedItems) => {
    console.log('【联动】领料单部分通过', {
      approvalCode: approval.code,
      approvedItems,
    });
    // TODO: 调用库存管理模块按实际批准数量减少库存
  },
};

// 场景2：采购申请审批通过 → 采购状态更新
export const purchaseApprovalHandler: ApprovalIntegrationHandler = {
  onPurchaseApprovalApproved: (approval, purchaseLink) => {
    console.log('【联动】采购申请审批通过', {
      approvalCode: approval.code,
      totalAmount: purchaseLink.totalAmount,
    });
    // 更新采购计划状态为"采购中"
    // purchaseLink.requestId 对应采购计划的 id
    if (purchaseLink.requestId) {
      // 动态导入以避免循环依赖
      import('../hooks/usePurchasePlanStore').then(({ updatePurchasePlanStatus }) => {
        updatePurchasePlanStatus(purchaseLink.requestId, 'purchasing', '采购中');
        console.log(`【联动】采购计划 ${purchaseLink.requestId} 状态已更新为"采购中"`);
      });
    }
  },
};

// 场景3：生产计划审批通过 → 创建生产批次
export const productionApprovalHandler: ApprovalIntegrationHandler = {
  onProductionApprovalApproved: (approval, productionLink) => {
    console.log('【联动】生产计划审批通过', {
      approvalCode: approval.code,
      planCode: productionLink.planCode,
    });
    // TODO: 在生产汇总表创建新批次
    // productionStore.createBatch(productionLink);
  },
};

// 场景4：请假审批通过 → 重新分配任务
export const leaveApprovalHandler: ApprovalIntegrationHandler = {
  onLeaveApprovalApproved: (approval, leaveLink) => {
    console.log('【联动】请假审批通过', {
      approvalCode: approval.code,
      employee: approval.applicantName,
      days: leaveLink.totalDays,
    });
    // TODO: 重新分配请假人的待处理任务
    // taskStore.reassignTasks(approval.applicantId, leaveLink.substituteId);
  },
};

// 注册所有示例处理器
export function registerAllHandlers(): void {
  registerApprovalIntegration(materialApprovalHandler);
  registerApprovalIntegration(purchaseApprovalHandler);
  registerApprovalIntegration(productionApprovalHandler);
  registerApprovalIntegration(leaveApprovalHandler);
}
