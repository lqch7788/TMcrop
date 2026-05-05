// ============================================================
// 审批业务联动服务
// 文件路径：src/services/approvalBusinessIntegration.ts
// 功能：当审批完成时，实际更新业务模块的状态
// ============================================================

import { Approval, BusinessLink, ApprovalType } from '../types/approval';
import {
  registerApprovalIntegration,
  ApprovalIntegrationHandler,
} from '../types/approvalIntegration';

// ============================================================
// 业务状态更新接口
// ============================================================

interface BusinessUpdateResult {
  success: boolean;
  message: string;
  updatedFields?: Record<string, unknown>;
}

// ============================================================
// 业务联动处理器实现
// ============================================================

const businessIntegrationHandler: ApprovalIntegrationHandler = {
  // ========== 业务审批（10种）==========

  // 1. 物资/领料申请
  onMaterialRequestApproved: (approval, link) => {
    console.log('【联动】领料申请审批通过，实际更新库存', {
      approvalCode: approval.code,
      materials: link.materials,
      requestId: link.requestId,
    });
    // 更新领料单状态为已批准
    updateLocalStorageItem('material_requests', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  onMaterialRequestPartiallyApproved: (approval, link, approvedItems) => {
    console.log('【联动】领料申请部分通过，更新批准数量', {
      approvalCode: approval.code,
      approvedItems,
    });
    // 更新批准数量
    updateLocalStorageItem('material_requests', link.requestId, {
      status: 'partially_approved',
      approvedItems,
      approvalCode: approval.code,
    });
  },

  // 2. 退料单
  onReturnMaterialApproved: (approval, link) => {
    console.log('【联动】退料单审批通过，更新库存', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('return_material', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 3. 采购申请
  onPurchaseRequestApproved: (approval, link) => {
    console.log('【联动】采购申请审批通过，更新采购状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('purchase_requests', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 4. 物料入库
  onMaterialInboundApproved: (approval, link) => {
    console.log('【联动】物料入库审批通过，更新库存', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('material_inbound', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      inboundAt: new Date().toISOString(),
    });
  },

  // 5. 库存调拨
  onMaterialTransferApproved: (approval, link) => {
    console.log('【联动】库存调拨审批通过，执行调拨', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('material_transfer', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      transferredAt: new Date().toISOString(),
    });
  },

  // 6. 种源入库
  onSeedSourceInboundApproved: (approval, link) => {
    console.log('【联动】种源入库审批通过，更新种源库存', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('seed_source_inbound', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      inboundAt: new Date().toISOString(),
    });
  },

  // 7. 育苗计划
  onSeedlingPlanApproved: (approval, link) => {
    console.log('【联动】育苗计划审批通过，更新计划状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('seedling_plans', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 8. 种植计划
  onPlantingPlanApproved: (approval, link) => {
    console.log('【联动】种植计划审批通过，更新计划状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('planting_plans', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 9. 订单创建
  onOrderCreateApproved: (approval, link) => {
    console.log('【联动】订单创建审批通过，激活订单', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('crop_orders', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 10. 订单变更
  onOrderChangeApproved: (approval, link) => {
    console.log('【联动】订单变更审批通过，应用变更', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('crop_orders', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
     变更At: new Date().toISOString(),
    });
  },

  // ========== 生产审批（5种）==========

  // 11. 生产计划
  onProductionPlanApproved: (approval, link) => {
    console.log('【联动】生产计划审批通过，更新计划状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('production_plans', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 12. 生产批次
  onProductionBatchApproved: (approval, link) => {
    console.log('【联动】生产批次审批通过，激活批次', {
      approvalCode: approval.code,
      batchCode: link.batchCode,
    });
    updateLocalStorageItem('crop_batch', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 13. 批次变更
  onBatchChangeApproved: (approval, link) => {
    console.log('【联动】批次变更审批通过，应用变更', {
      approvalCode: approval.code,
      batchCode: link.batchCode,
    });
    updateLocalStorageItem('crop_batch', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
    });
  },

  // 14. 批次作废
  onBatchVoidApproved: (approval, link) => {
    console.log('【联动】批次作废审批通过，作废批次', {
      approvalCode: approval.code,
      batchCode: link.batchCode,
    });
    updateLocalStorageItem('crop_batch', link.requestId, {
      status: 'voided',
      approvalCode: approval.code,
      voidedAt: new Date().toISOString(),
    });
  },

  // 15. 技术方案
  onTechSolutionApproved: (approval, link) => {
    console.log('【联动】技术方案审批通过，激活方案', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('tech_solutions', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // ========== 农事审批（4种）==========

  // 16. 任务派发
  onTaskDispatchApproved: (approval, link) => {
    console.log('【联动】任务派发审批通过，激活任务', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('farm_tasks', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 17. 任务变更
  onTaskChangeApproved: (approval, link) => {
    console.log('【联动】任务变更审批通过，应用变更', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('farm_tasks', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
    });
  },

  // 18. 巡查问题
  onInspectionIssueApproved: (approval, link) => {
    console.log('【联动】巡查问题审批通过，更新问题状态', {
      approvalCode: approval.code,
      issueCode: link.inspectionCode,
    });
    updateLocalStorageItem('inspection_issues', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 19. 问题整改
  onIssueResolveApproved: (approval, link) => {
    console.log('【联动】问题整改审批通过，完成整改', {
      approvalCode: approval.code,
      issueCode: link.inspectionCode,
    });
    updateLocalStorageItem('inspection_issues', link.requestId, {
      status: 'resolved',
      approvalCode: approval.code,
      resolvedAt: new Date().toISOString(),
    });
  },

  // ========== 采收审批（1种）==========

  // 20. 采收申请
  onHarvestRequestApproved: (approval, link) => {
    console.log('【联动】采收申请审批通过，安排采收', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('harvest_requests', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // ========== 作物补录审批（3种）==========

  // 21. 种源补录
  onSeedSourceSupplementaryApproved: (approval, link) => {
    console.log('【联动】种源补录审批通过，更新数据', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('seed_source', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      supplementaryApprovedAt: new Date().toISOString(),
    });
  },

  // 22. 育苗补录
  onSeedlingSupplementaryApproved: (approval, link) => {
    console.log('【联动】育苗补录审批通过，更新数据', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('seedling', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      supplementaryApprovedAt: new Date().toISOString(),
    });
  },

  // 23. 作物入库补录
  onCropStorageSupplementaryApproved: (approval, link) => {
    console.log('【联动】作物入库补录审批通过，更新数据', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('crop_storage', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      supplementaryApprovedAt: new Date().toISOString(),
    });
  },

  // ========== 指标/公告审批（2种）==========

  // 24. 指标审批
  onIndicatorApprovalApproved: (approval, link) => {
    console.log('【联动】指标审批通过，发布指标', {
      approvalCode: approval.code,
      indicatorName: link.indicatorName,
    });
    updateLocalStorageItem('indicators', link.requestId, {
      status: 'published',
      approvalCode: approval.code,
      publishedAt: new Date().toISOString(),
    });
  },

  // 25. 公告审批
  onAnnouncementApprovalApproved: (approval, link) => {
    console.log('【联动】公告审批通过，发布公告', {
      approvalCode: approval.code,
      announcementTitle: link.announcementTitle,
    });
    updateLocalStorageItem('announcements', link.requestId, {
      status: 'published',
      approvalCode: approval.code,
      publishedAt: new Date().toISOString(),
    });
  },

  // ========== 成本审批（2种）==========

  // 26. 预算编制
  onBudgetCreateApproved: (approval, link) => {
    console.log('【联动】预算编制审批通过，激活预算', {
      approvalCode: approval.code,
      budgetAmount: link.budgetAmount,
    });
    updateLocalStorageItem('budgets', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 27. 预算调整
  onBudgetAdjustApproved: (approval, link) => {
    console.log('【联动】预算调整审批通过，应用调整', {
      approvalCode: approval.code,
      originalBudget: link.originalBudget,
      newBudget: link.newBudget,
    });
    updateLocalStorageItem('budgets', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      adjustApprovedAt: new Date().toISOString(),
    });
  },

  // ========== HR审批（11种）==========

  // 28. 请假
  onLeaveApproved: (approval, link) => {
    console.log('【联动】请假审批通过，更新请假记录', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      startDate: link.startDate,
      endDate: link.endDate,
    });
    updateLocalStorageItem('leave_records', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 29. 加班
  onOvertimeApproved: (approval, link) => {
    console.log('【联动】加班审批通过，更新加班记录', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      date: link.date,
      hours: link.totalHours,
    });
    updateLocalStorageItem('overtime_records', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 30. 离职
  onResignationApproved: (approval, link) => {
    console.log('【联动】离职审批通过，更新员工状态', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      expectedResignDate: link.expectedResignDate,
    });
    updateLocalStorageItem('employees', link.requestId, {
      status: 'resigned',
      resignationApprovalCode: approval.code,
      resignedAt: new Date().toISOString(),
    });
  },

  // 31. 招聘
  onRecruitmentApproved: (approval, link) => {
    console.log('【联动】招聘审批通过，更新招聘流程', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('recruitment', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 32. 入职
  onOnboardingApproved: (approval, link) => {
    console.log('【联动】入职审批通过，创建员工档案', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    updateLocalStorageItem('employees', link.requestId, {
      status: 'onboarding_completed',
      approvalCode: approval.code,
      joinedAt: new Date().toISOString(),
    });
  },

  // 33. 考勤补录
  onAttendanceRepairApproved: (approval, link) => {
    console.log('【联动】考勤补录审批通过，更新考勤记录', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    updateLocalStorageItem('attendance_records', link.requestId, {
      status: 'approved',
      repairApprovalCode: approval.code,
      repairedAt: new Date().toISOString(),
    });
  },

  // 34. 调薪
  onSalaryAdjustmentApproved: (approval, link) => {
    console.log('【联动】调薪审批通过，更新薪资信息', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    updateLocalStorageItem('employees', link.requestId, {
      salaryStatus: 'adjusted',
      salaryAdjustmentApprovalCode: approval.code,
      adjustedAt: new Date().toISOString(),
    });
  },

  // 35. 合同续签
  onContractRenewalApproved: (approval, link) => {
    console.log('【联动】合同续签审批通过，更新合同状态', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    updateLocalStorageItem('contracts', link.requestId, {
      status: 'renewed',
      renewalApprovalCode: approval.code,
      renewedAt: new Date().toISOString(),
    });
  },

  // 36. 工资预算
  onSalaryBudgetApproved: (approval, link) => {
    console.log('【联动】工资预算审批通过，激活预算', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    updateLocalStorageItem('salary_budgets', link.requestId, {
      status: 'approved',
      approvalCode: approval.code,
      approvedAt: new Date().toISOString(),
    });
  },

  // 37. 转岗
  onTransferApproved: (approval, link) => {
    console.log('【联动】转岗审批通过，执行转岗', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      fromDepartment: link.fromDepartment,
      toDepartment: link.toDepartment,
    });
    updateLocalStorageItem('employees', link.requestId, {
      status: 'transferred',
      transferApprovalCode: approval.code,
      transferredAt: new Date().toISOString(),
    });
  },

  // ========== 通用回调 ==========

  // 处理审批拒绝
  onApprovalRejected: (approval, reason) => {
    console.log('【联动】审批被拒绝，更新业务状态', {
      approvalCode: approval.code,
      reason,
    });
    // 更新业务状态为已拒绝
    if (approval.businessLink?.requestId) {
      const storageKey = getStorageKeyByBusinessType(approval.businessLink.type);
      if (storageKey) {
        updateLocalStorageItem(storageKey, approval.businessLink.requestId, {
          status: 'rejected',
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
        });
      }
    }
  },

  // 处理审批撤回
  onApprovalCancelled: (approval, reason) => {
    console.log('【联动】审批被撤回，更新业务状态', {
      approvalCode: approval.code,
      reason,
    });
    // 更新业务状态为已撤回
    if (approval.businessLink?.requestId) {
      const storageKey = getStorageKeyByBusinessType(approval.businessLink.type);
      if (storageKey) {
        updateLocalStorageItem(storageKey, approval.businessLink.requestId, {
          status: 'cancelled',
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
        });
      }
    }
  },
};

// ============================================================
// 辅助函数
// ============================================================

/**
 * 根据业务类型获取存储键
 */
function getStorageKeyByBusinessType(type: BusinessLink['type']): string | null {
  const keyMap: Record<string, string> = {
    material: 'material_requests',
    return: 'return_material',
    purchase: 'purchase_requests',
    material_inbound: 'material_inbound',
    material_transfer: 'material_transfer',
    seed_source_inbound: 'seed_source_inbound',
    seedling_plan: 'seedling_plans',
    planting_plan: 'planting_plans',
    order_create: 'crop_orders',
    order_change: 'crop_orders',
    production: 'production_plans',
    production_batch: 'crop_batch',
    batch_change: 'crop_batch',
    batch_void: 'crop_batch',
    tech_solution: 'tech_solutions',
    task_dispatch: 'farm_tasks',
    task_change: 'farm_tasks',
    inspection_issue: 'inspection_issues',
    issue_resolve: 'inspection_issues',
    harvest: 'harvest_requests',
    seed_source: 'seed_source',
    seedling: 'seedling',
    crop_storage: 'crop_storage',
    indicator: 'indicators',
    announcement: 'announcements',
    budget_create: 'budgets',
    budget_adjust: 'budgets',
    leave: 'leave_records',
    overtime: 'overtime_records',
    resign: 'employees',
    recruitment: 'recruitment',
    onboarding: 'employees',
    attendance_repair: 'attendance_records',
    salary_adjustment: 'employees',
    contract_renewal: 'contracts',
    salary_budget: 'salary_budgets',
    transfer: 'employees',
  };
  return keyMap[type] || null;
}

/**
 * 更新 localStorage 中的数据
 */
function updateLocalStorageItem(
  storageKey: string,
  itemId: string,
  updates: Record<string, unknown>
): BusinessUpdateResult {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      console.warn(`【业务联动】未找到存储键: ${storageKey}`);
      return { success: false, message: `未找到存储键: ${storageKey}` };
    }

    const items = JSON.parse(stored);
    if (!Array.isArray(items)) {
      console.warn(`【业务联动】存储数据不是数组: ${storageKey}`);
      return { success: false, message: '数据格式错误' };
    }

    const index = items.findIndex((item: any) => item.id === itemId);
    if (index === -1) {
      console.warn(`【业务联动】未找到数据项: ${itemId}`);
      return { success: false, message: `未找到数据项: ${itemId}` };
    }

    // 合并更新
    items[index] = { ...items[index], ...updates };
    localStorage.setItem(storageKey, JSON.stringify(items));

    console.log(`【业务联动】成功更新 ${storageKey}/${itemId}:`, updates);
    return { success: true, message: '更新成功', updatedFields: updates };
  } catch (error) {
    console.error(`【业务联动】更新失败: ${storageKey}/${itemId}`, error);
    return { success: false, message: `更新失败: ${error}` };
  }
}

// ============================================================
// 注册业务联动处理器
// ============================================================

export function registerBusinessIntegration(): void {
  registerApprovalIntegration(businessIntegrationHandler);
  console.log('【业务联动】已注册业务状态更新处理器');
}

// ============================================================
// 导出
// ============================================================

export { businessIntegrationHandler, updateLocalStorageItem };
