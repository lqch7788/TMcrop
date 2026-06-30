// ============================================================
// 审批中心 - 业务联动接口定义
// 文件路径：src/types/approvalIntegration.ts
// 组件化结构：审批结果触发其他模块更新
// 支持全部37种审批类型
// ============================================================

import type { Approval, BusinessLink } from './approval';

// ============================================================
// 联动处理器接口 - 37种审批类型全覆盖
// ============================================================

export interface ApprovalIntegrationHandler {
  // ========== 业务审批（10种）==========
  // 物资/领料申请
  onMaterialRequestApproved?: (approval: Approval, link: BusinessLink) => void;
  onMaterialRequestPartiallyApproved?: (approval: Approval, link: BusinessLink, approvedItems: Record<string, number>) => void;
  // 退料单
  onReturnMaterialApproved?: (approval: Approval, link: BusinessLink) => void;
  // 采购申请
  onPurchaseRequestApproved?: (approval: Approval, link: BusinessLink) => void;
  // 物料入库
  onMaterialInboundApproved?: (approval: Approval, link: BusinessLink) => void;
  // 库存调拨
  onMaterialTransferApproved?: (approval: Approval, link: BusinessLink) => void;
  // 种源入库
  onSeedSourceInboundApproved?: (approval: Approval, link: BusinessLink) => void;
  // 育苗计划
  onSeedlingPlanApproved?: (approval: Approval, link: BusinessLink) => void;
  // 种植计划
  onPlantingPlanApproved?: (approval: Approval, link: BusinessLink) => void;
  // 订单创建/变更
  onOrderCreateApproved?: (approval: Approval, link: BusinessLink) => void;
  onOrderChangeApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 生产审批（5种）==========
  // 生产计划
  onProductionPlanApproved?: (approval: Approval, link: BusinessLink) => void;
  // 生产批次
  onProductionBatchApproved?: (approval: Approval, link: BusinessLink) => void;
  // 批次变更
  onBatchChangeApproved?: (approval: Approval, link: BusinessLink) => void;
  // 批次作废
  onBatchVoidApproved?: (approval: Approval, link: BusinessLink) => void;
  // 技术方案
  onTechSolutionApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 农事审批（4种）==========
  // 任务派发
  onTaskDispatchApproved?: (approval: Approval, link: BusinessLink) => void;
  // 任务变更
  onTaskChangeApproved?: (approval: Approval, link: BusinessLink) => void;
  // 巡查问题
  onInspectionIssueApproved?: (approval: Approval, link: BusinessLink) => void;
  // 问题整改
  onIssueResolveApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 采收审批（1种）==========
  // 采收申请
  onHarvestRequestApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 作物补录审批（3种）==========
  // 种源补录
  onSeedSourceSupplementaryApproved?: (approval: Approval, link: BusinessLink) => void;
  // 育苗补录
  onSeedlingSupplementaryApproved?: (approval: Approval, link: BusinessLink) => void;
  // 作物入库补录
  onCropStorageSupplementaryApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 指标/公告审批（2种）==========
  // 指标审批
  onIndicatorApprovalApproved?: (approval: Approval, link: BusinessLink) => void;
  // 公告审批
  onAnnouncementApprovalApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 成本审批（2种）==========
  // 预算编制
  onBudgetCreateApproved?: (approval: Approval, link: BusinessLink) => void;
  // 预算调整
  onBudgetAdjustApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== HR审批（11种）==========
  // 请假
  onLeaveApproved?: (approval: Approval, link: BusinessLink) => void;
  // 加班
  onOvertimeApproved?: (approval: Approval, link: BusinessLink) => void;
  // 离职
  onResignationApproved?: (approval: Approval, link: BusinessLink) => void;
  // 招聘
  onRecruitmentApproved?: (approval: Approval, link: BusinessLink) => void;
  // 入职
  onOnboardingApproved?: (approval: Approval, link: BusinessLink) => void;
  // 考勤补录
  onAttendanceRepairApproved?: (approval: Approval, link: BusinessLink) => void;
  // 调薪
  onSalaryAdjustmentApproved?: (approval: Approval, link: BusinessLink) => void;
  // 合同续签
  onContractRenewalApproved?: (approval: Approval, link: BusinessLink) => void;
  // 工资预算
  onSalaryBudgetApproved?: (approval: Approval, link: BusinessLink) => void;
  // 转岗
  onTransferApproved?: (approval: Approval, link: BusinessLink) => void;

  // ========== 通用回调 ==========
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
        if (!businessLink) break;
        // ========== 业务审批（10种）==========
        if (businessLink.type === 'material' && handler.onMaterialRequestApproved) {
          handler.onMaterialRequestApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'return' && handler.onReturnMaterialApproved) {
          handler.onReturnMaterialApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'purchase' && handler.onPurchaseRequestApproved) {
          handler.onPurchaseRequestApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'material_inbound' && handler.onMaterialInboundApproved) {
          handler.onMaterialInboundApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'material_transfer' && handler.onMaterialTransferApproved) {
          handler.onMaterialTransferApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'seed_source_inbound' && handler.onSeedSourceInboundApproved) {
          handler.onSeedSourceInboundApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'seedling_plan' && handler.onSeedlingPlanApproved) {
          handler.onSeedlingPlanApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'planting_plan' && handler.onPlantingPlanApproved) {
          handler.onPlantingPlanApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'order_create' && handler.onOrderCreateApproved) {
          handler.onOrderCreateApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'order_change' && handler.onOrderChangeApproved) {
          handler.onOrderChangeApproved(approval, businessLink as BusinessLink);
        }
        // ========== 生产审批（5种）==========
        if (businessLink.type === 'production' && handler.onProductionPlanApproved) {
          handler.onProductionPlanApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'production_batch' && handler.onProductionBatchApproved) {
          handler.onProductionBatchApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'batch_change' && handler.onBatchChangeApproved) {
          handler.onBatchChangeApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'batch_void' && handler.onBatchVoidApproved) {
          handler.onBatchVoidApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'tech_solution' && handler.onTechSolutionApproved) {
          handler.onTechSolutionApproved(approval, businessLink as BusinessLink);
        }
        // ========== 农事审批（4种）==========
        if (businessLink.type === 'task_dispatch' && handler.onTaskDispatchApproved) {
          handler.onTaskDispatchApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'task_change' && handler.onTaskChangeApproved) {
          handler.onTaskChangeApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'inspection_issue' && handler.onInspectionIssueApproved) {
          handler.onInspectionIssueApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'issue_resolve' && handler.onIssueResolveApproved) {
          handler.onIssueResolveApproved(approval, businessLink as BusinessLink);
        }
        // ========== 采收审批（1种）==========
        if (businessLink.type === 'harvest' && handler.onHarvestRequestApproved) {
          handler.onHarvestRequestApproved(approval, businessLink as BusinessLink);
        }
        // ========== 作物补录审批（3种）==========
        if (businessLink.type === 'seed_source' && handler.onSeedSourceSupplementaryApproved) {
          handler.onSeedSourceSupplementaryApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'seedling' && handler.onSeedlingSupplementaryApproved) {
          handler.onSeedlingSupplementaryApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'crop_storage' && handler.onCropStorageSupplementaryApproved) {
          handler.onCropStorageSupplementaryApproved(approval, businessLink as BusinessLink);
        }
        // ========== 指标/公告审批（2种）==========
        if (businessLink.type === 'indicator' && handler.onIndicatorApprovalApproved) {
          handler.onIndicatorApprovalApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'announcement' && handler.onAnnouncementApprovalApproved) {
          handler.onAnnouncementApprovalApproved(approval, businessLink as BusinessLink);
        }
        // ========== 成本审批（2种）==========
        if (businessLink.type === 'budget_create' && handler.onBudgetCreateApproved) {
          handler.onBudgetCreateApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'budget_adjust' && handler.onBudgetAdjustApproved) {
          handler.onBudgetAdjustApproved(approval, businessLink as BusinessLink);
        }
        // ========== HR审批（11种）==========
        if (businessLink.type === 'leave' && handler.onLeaveApproved) {
          handler.onLeaveApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'overtime' && handler.onOvertimeApproved) {
          handler.onOvertimeApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'resign' && handler.onResignationApproved) {
          handler.onResignationApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'recruitment' && handler.onRecruitmentApproved) {
          handler.onRecruitmentApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'onboarding' && handler.onOnboardingApproved) {
          handler.onOnboardingApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'attendance_repair' && handler.onAttendanceRepairApproved) {
          handler.onAttendanceRepairApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'salary_adjustment' && handler.onSalaryAdjustmentApproved) {
          handler.onSalaryAdjustmentApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'contract_renewal' && handler.onContractRenewalApproved) {
          handler.onContractRenewalApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'salary_budget' && handler.onSalaryBudgetApproved) {
          handler.onSalaryBudgetApproved(approval, businessLink as BusinessLink);
        }
        if (businessLink.type === 'transfer' && handler.onTransferApproved) {
          handler.onTransferApproved(approval, businessLink as BusinessLink);
        }
        break;

      case 'partially_approved':
        if (businessLink?.type === 'material' && handler.onMaterialRequestPartiallyApproved) {
          handler.onMaterialRequestPartiallyApproved(
            approval,
            businessLink as BusinessLink,
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
// 联动场景示例 - 37种审批类型全覆盖
// ============================================================

// ========== 业务审批处理器（10种）==========

// 1. 物资/领料申请
export const materialRequestHandler: ApprovalIntegrationHandler = {
  onMaterialRequestApproved: (approval, link) => {
    console.log('【联动】领料申请审批通过', { approvalCode: approval.code, materials: link.materials });
    // 调用库存管理模块减少库存
  },
  onMaterialRequestPartiallyApproved: (approval, link, approvedItems) => {
    console.log('【联动】领料申请部分通过', { approvalCode: approval.code, approvedItems });
  },
};

// 2. 退料单
export const returnMaterialHandler: ApprovalIntegrationHandler = {
  onReturnMaterialApproved: (approval, link) => {
    console.log('【联动】退料单审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新库存增加退料数量
  },
};

// 3. 采购申请
export const purchaseRequestHandler: ApprovalIntegrationHandler = {
  onPurchaseRequestApproved: (approval, link) => {
    console.log('【联动】采购申请审批通过', { approvalCode: approval.code, totalAmount: link.totalAmount });
    if (link.requestId) {
      import('../hooks/usePurchasePlanStore').then(({ updatePurchasePlanStatus }) => {
        updatePurchasePlanStatus(link.requestId, 'purchasing', '采购中');
        console.log(`【联动】采购计划 ${link.requestId} 状态已更新为"采购中"`);
      });
    }
  },
};

// 4. 物料入库
export const materialInboundHandler: ApprovalIntegrationHandler = {
  onMaterialInboundApproved: (approval, link) => {
    console.log('【联动】物料入库审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 增加库存数量
  },
};

// 5. 库存调拨
export const materialTransferHandler: ApprovalIntegrationHandler = {
  onMaterialTransferApproved: (approval, link) => {
    console.log('【联动】库存调拨审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 执行调拨：源仓库减少，目标仓库增加
  },
};

// 6. 种源入库
export const seedSourceInboundHandler: ApprovalIntegrationHandler = {
  onSeedSourceInboundApproved: (approval, link) => {
    console.log('【联动】种源入库审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新种源库存
  },
};

// 7. 育苗计划
export const seedlingPlanHandler: ApprovalIntegrationHandler = {
  onSeedlingPlanApproved: (approval, link) => {
    console.log('【联动】育苗计划审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 创建育苗任务
  },
};

// 8. 种植计划
export const plantingPlanHandler: ApprovalIntegrationHandler = {
  onPlantingPlanApproved: (approval, link) => {
    console.log('【联动】种植计划审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 创建种植任务
  },
};

// 9. 订单创建
export const orderCreateHandler: ApprovalIntegrationHandler = {
  onOrderCreateApproved: (approval, link) => {
    console.log('【联动】订单创建审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新订单状态为已确认
  },
};

// 10. 订单变更
export const orderChangeHandler: ApprovalIntegrationHandler = {
  onOrderChangeApproved: (approval, link) => {
    console.log('【联动】订单变更审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 应用订单变更
  },
};

// ========== 生产审批处理器（5种）==========

// 11. 生产计划
export const productionPlanHandler: ApprovalIntegrationHandler = {
  onProductionPlanApproved: (approval, link) => {
    console.log('【联动】生产计划审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 创建生产批次
  },
};

// 12. 生产批次
export const productionBatchHandler: ApprovalIntegrationHandler = {
  onProductionBatchApproved: (approval, link) => {
    console.log('【联动】生产批次审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新批次状态
  },
};

// 13. 批次变更
export const batchChangeHandler: ApprovalIntegrationHandler = {
  onBatchChangeApproved: (approval, link) => {
    console.log('【联动】批次变更审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 应用批次变更
  },
};

// 14. 批次作废
export const batchVoidHandler: ApprovalIntegrationHandler = {
  onBatchVoidApproved: (approval, link) => {
    console.log('【联动】批次作废审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新批次状态为已作废
  },
};

// 15. 技术方案
export const techSolutionHandler: ApprovalIntegrationHandler = {
  onTechSolutionApproved: (approval, link) => {
    console.log('【联动】技术方案审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新技术方案状态
  },
};

// ========== 农事审批处理器（4种）==========

// 16. 任务派发
export const taskDispatchHandler: ApprovalIntegrationHandler = {
  onTaskDispatchApproved: (approval, link) => {
    console.log('【联动】任务派发审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新任务状态为已派发
  },
};

// 17. 任务变更
export const taskChangeHandler: ApprovalIntegrationHandler = {
  onTaskChangeApproved: (approval, link) => {
    console.log('【联动】任务变更审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 应用任务变更
  },
};

// 18. 巡查问题
export const inspectionIssueHandler: ApprovalIntegrationHandler = {
  onInspectionIssueApproved: (approval, link) => {
    console.log('【联动】巡查问题审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新问题状态
  },
};

// 19. 问题整改
export const issueResolveHandler: ApprovalIntegrationHandler = {
  onIssueResolveApproved: (approval, link) => {
    console.log('【联动】问题整改审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新整改状态
  },
};

// ========== 采收审批处理器（1种）==========

// 20. 采收申请
export const harvestRequestHandler: ApprovalIntegrationHandler = {
  onHarvestRequestApproved: (approval, link) => {
    console.log('【联动】采收申请审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新采收状态为已批准
  },
};

// ========== 作物补录审批处理器（3种）==========

// 21. 种源补录
export const seedSourceSupplementaryHandler: ApprovalIntegrationHandler = {
  onSeedSourceSupplementaryApproved: (approval, link) => {
    console.log('【联动】种源补录审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
  },
};

// 22. 育苗补录
export const seedlingSupplementaryHandler: ApprovalIntegrationHandler = {
  onSeedlingSupplementaryApproved: (approval, link) => {
    console.log('【联动】育苗补录审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
  },
};

// 23. 作物入库补录
export const cropStorageSupplementaryHandler: ApprovalIntegrationHandler = {
  onCropStorageSupplementaryApproved: (approval, link) => {
    console.log('【联动】作物入库补录审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
  },
};

// ========== 指标/公告审批处理器（2种）==========

// 24. 指标审批
export const indicatorApprovalHandler: ApprovalIntegrationHandler = {
  onIndicatorApprovalApproved: (approval, link) => {
    console.log('【联动】指标审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 发布指标
  },
};

// 25. 公告审批
export const announcementApprovalHandler: ApprovalIntegrationHandler = {
  onAnnouncementApprovalApproved: (approval, link) => {
    console.log('【联动】公告审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 发布公告
  },
};

// ========== 成本审批处理器（2种）==========

// 26. 预算编制
export const budgetCreateHandler: ApprovalIntegrationHandler = {
  onBudgetCreateApproved: (approval, link) => {
    console.log('【联动】预算编制审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新预算状态
  },
};

// 27. 预算调整
export const budgetAdjustHandler: ApprovalIntegrationHandler = {
  onBudgetAdjustApproved: (approval, link) => {
    console.log('【联动】预算调整审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 应用预算调整
  },
};

// ========== HR审批处理器（11种）==========

// 28. 请假
export const leaveHandler: ApprovalIntegrationHandler = {
  onLeaveApproved: (approval, link) => {
    console.log('【联动】请假审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新请假记录状态
  },
};

// 29. 加班
export const overtimeHandler: ApprovalIntegrationHandler = {
  onOvertimeApproved: (approval, link) => {
    console.log('【联动】加班审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新加班记录状态
  },
};

// 30. 离职
export const resignationHandler: ApprovalIntegrationHandler = {
  onResignationApproved: (approval, link) => {
    console.log('【联动】离职审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新员工状态为已离职
  },
};

// 31. 招聘
export const recruitmentHandler: ApprovalIntegrationHandler = {
  onRecruitmentApproved: (approval, link) => {
    console.log('【联动】招聘审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新招聘流程状态
  },
};

// 32. 入职
export const onboardingHandler: ApprovalIntegrationHandler = {
  onOnboardingApproved: (approval, link) => {
    console.log('【联动】入职审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 创建员工档案
  },
};

// 33. 考勤补录
export const attendanceRepairHandler: ApprovalIntegrationHandler = {
  onAttendanceRepairApproved: (approval, link) => {
    console.log('【联动】考勤补录审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新考勤记录
  },
};

// 34. 调薪
export const salaryAdjustmentHandler: ApprovalIntegrationHandler = {
  onSalaryAdjustmentApproved: (approval, link) => {
    console.log('【联动】调薪审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新员工薪资
  },
};

// 35. 合同续签
export const contractRenewalHandler: ApprovalIntegrationHandler = {
  onContractRenewalApproved: (approval, link) => {
    console.log('【联动】合同续签审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新合同状态
  },
};

// 36. 工资预算
export const salaryBudgetHandler: ApprovalIntegrationHandler = {
  onSalaryBudgetApproved: (approval, link) => {
    console.log('【联动】工资预算审批通过', { approvalCode: approval.code, requestCode: link.requestCode });
    // 更新预算状态
  },
};

// 37. 转岗
export const transferHandler: ApprovalIntegrationHandler = {
  onTransferApproved: (approval, link) => {
    console.log('【联动】转岗审批通过', { approvalCode: approval.code, applicantName: approval.applicantName });
    // 更新员工岗位信息
  },
};

// ============================================================
// 注册所有处理器
// ============================================================

export function registerAllHandlers(): void {
  // 业务审批（10种）
  registerApprovalIntegration(materialRequestHandler);
  registerApprovalIntegration(returnMaterialHandler);
  registerApprovalIntegration(purchaseRequestHandler);
  registerApprovalIntegration(materialInboundHandler);
  registerApprovalIntegration(materialTransferHandler);
  registerApprovalIntegration(seedSourceInboundHandler);
  registerApprovalIntegration(seedlingPlanHandler);
  registerApprovalIntegration(plantingPlanHandler);
  registerApprovalIntegration(orderCreateHandler);
  registerApprovalIntegration(orderChangeHandler);
  // 生产审批（5种）
  registerApprovalIntegration(productionPlanHandler);
  registerApprovalIntegration(productionBatchHandler);
  registerApprovalIntegration(batchChangeHandler);
  registerApprovalIntegration(batchVoidHandler);
  registerApprovalIntegration(techSolutionHandler);
  // 农事审批（4种）
  registerApprovalIntegration(taskDispatchHandler);
  registerApprovalIntegration(taskChangeHandler);
  registerApprovalIntegration(inspectionIssueHandler);
  registerApprovalIntegration(issueResolveHandler);
  // 采收审批（1种）
  registerApprovalIntegration(harvestRequestHandler);
  // 作物补录审批（3种）
  registerApprovalIntegration(seedSourceSupplementaryHandler);
  registerApprovalIntegration(seedlingSupplementaryHandler);
  registerApprovalIntegration(cropStorageSupplementaryHandler);
  // 指标/公告审批（2种）
  registerApprovalIntegration(indicatorApprovalHandler);
  registerApprovalIntegration(announcementApprovalHandler);
  // 成本审批（2种）
  registerApprovalIntegration(budgetCreateHandler);
  registerApprovalIntegration(budgetAdjustHandler);
  // HR审批（11种）
  registerApprovalIntegration(leaveHandler);
  registerApprovalIntegration(overtimeHandler);
  registerApprovalIntegration(resignationHandler);
  registerApprovalIntegration(recruitmentHandler);
  registerApprovalIntegration(onboardingHandler);
  registerApprovalIntegration(attendanceRepairHandler);
  registerApprovalIntegration(salaryAdjustmentHandler);
  registerApprovalIntegration(contractRenewalHandler);
  registerApprovalIntegration(salaryBudgetHandler);
  registerApprovalIntegration(transferHandler);
}
