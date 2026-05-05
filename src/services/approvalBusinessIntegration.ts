// ============================================================
// 审批业务联动服务
// 文件路径：src/services/approvalBusinessIntegration.ts
// 功能：当审批完成时，实际更新业务模块的状态
// 调用后端API /api/approval-linkage/update
// ============================================================

import { Approval, BusinessLink, ApprovalType } from '../types/approval';
import {
  registerApprovalIntegration,
  ApprovalIntegrationHandler,
} from '../types/approvalIntegration';

// ============================================================
// API 配置
// ============================================================
const API_BASE = '/api/approval-linkage';

// 批量更新结果项类型
interface BatchUpdateResultItem {
  success: boolean;
  approvalId?: string;
  error?: string;
}

// ============================================================
// 业务状态更新接口
// ============================================================

interface BusinessUpdateResult {
  success: boolean;
  message: string;
  updatedFields?: Record<string, unknown>;
}

// ============================================================
// 后端API调用函数
// ============================================================

/**
 * 调用后端API更新业务表
 */
async function updateBusinessTableAPI(
  approval: Approval,
  action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved',
  extra?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const businessLink = approval.businessLink;
  if (!businessLink) {
    return { success: false, message: '无业务关联信息' };
  }

  try {
    const response = await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalId: approval.id,
        approvalCode: approval.code,
        action,
        businessLink,
        operatorId: approval.applicantId,
        operatorName: approval.applicantName,
        extra,
      }),
    });

    const result = await response.json();
    return {
      success: result.success,
      message: result.message || (result.success ? '业务表已更新' : '更新失败'),
    };
  } catch (error) {
    console.error('【审批联动】调用后端API失败:', error);
    return { success: false, message: `API调用失败: ${error}` };
  }
}

/**
 * 批量更新业务表
 */
async function batchUpdateBusinessTableAPI(
  approvals: Approval[],
  action: 'approved' | 'rejected' | 'cancelled' | 'partially_approved'
): Promise<{ successCount: number; failCount: number }> {
  const results = { successCount: 0, failCount: 0 };

  try {
    const response = await fetch(`${API_BASE}/batch-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvals: approvals.map(a => ({
          approvalId: a.id,
          approvalCode: a.code,
          action,
          businessLink: a.businessLink,
          operatorId: a.applicantId,
          operatorName: a.applicantName,
        })),
      }),
    });

    const result = await response.json();
    if (result.success && result.data) {
      results.successCount = (result.data as BatchUpdateResultItem[]).filter((r) => r.success).length;
      results.failCount = (result.data as BatchUpdateResultItem[]).filter((r) => !r.success).length;
    }
  } catch (error) {
    console.error('【审批联动】批量更新失败:', error);
    results.failCount = approvals.length;
  }

  return results;
}

// ============================================================
// 业务联动处理器实现
// 调用后端API更新业务表
// ============================================================

const businessIntegrationHandler: ApprovalIntegrationHandler = {
  // ========== 业务审批（10种）==========

  // 1. 物资/领料申请
  onMaterialRequestApproved: async (approval, link) => {
    console.log('【联动】领料申请审批通过，实际更新库存', {
      approvalCode: approval.code,
      materials: link.materials,
      requestId: link.requestId,
    });
    // 调用后端API更新业务表
    await updateBusinessTableAPI(approval, 'approved');
  },

  onMaterialRequestPartiallyApproved: async (approval, link, approvedItems) => {
    console.log('【联动】领料申请部分通过，更新批准数量', {
      approvalCode: approval.code,
      approvedItems,
    });
    await updateBusinessTableAPI(approval, 'partially_approved', { approvedItems });
  },

  // 2. 退料单
  onReturnMaterialApproved: async (approval, link) => {
    console.log('【联动】退料单审批通过，更新库存', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 3. 采购申请
  onPurchaseRequestApproved: async (approval, link) => {
    console.log('【联动】采购申请审批通过，更新采购状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 4. 物料入库
  onMaterialInboundApproved: async (approval, link) => {
    console.log('【联动】物料入库审批通过，更新库存', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 5. 库存调拨
  onMaterialTransferApproved: async (approval, link) => {
    console.log('【联动】库存调拨审批通过，执行调拨', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 6. 种源入库
  onSeedSourceInboundApproved: async (approval, link) => {
    console.log('【联动】种源入库审批通过，更新种源库存', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 7. 育苗计划
  onSeedlingPlanApproved: async (approval, link) => {
    console.log('【联动】育苗计划审批通过，更新计划状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 8. 种植计划
  onPlantingPlanApproved: async (approval, link) => {
    console.log('【联动】种植计划审批通过，更新计划状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 9. 订单创建
  onOrderCreateApproved: async (approval, link) => {
    console.log('【联动】订单创建审批通过，激活订单', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 10. 订单变更
  onOrderChangeApproved: async (approval, link) => {
    console.log('【联动】订单变更审批通过，应用变更', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 生产审批（5种）==========

  // 11. 生产计划
  onProductionPlanApproved: async (approval, link) => {
    console.log('【联动】生产计划审批通过，更新计划状态', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 12. 生产批次
  onProductionBatchApproved: async (approval, link) => {
    console.log('【联动】生产批次审批通过，激活批次', {
      approvalCode: approval.code,
      batchCode: link.batchCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 13. 批次变更
  onBatchChangeApproved: async (approval, link) => {
    console.log('【联动】批次变更审批通过，应用变更', {
      approvalCode: approval.code,
      batchCode: link.batchCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 14. 批次作废
  onBatchVoidApproved: async (approval, link) => {
    console.log('【联动】批次作废审批通过，作废批次', {
      approvalCode: approval.code,
      batchCode: link.batchCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 15. 技术方案
  onTechSolutionApproved: async (approval, link) => {
    console.log('【联动】技术方案审批通过，激活方案', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 农事审批（4种）==========

  // 16. 任务派发
  onTaskDispatchApproved: async (approval, link) => {
    console.log('【联动】任务派发审批通过，激活任务', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 17. 任务变更
  onTaskChangeApproved: async (approval, link) => {
    console.log('【联动】任务变更审批通过，应用变更', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 18. 巡查问题
  onInspectionIssueApproved: async (approval, link) => {
    console.log('【联动】巡查问题审批通过，更新问题状态', {
      approvalCode: approval.code,
      issueCode: link.inspectionCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 19. 问题整改
  onIssueResolveApproved: async (approval, link) => {
    console.log('【联动】问题整改审批通过，完成整改', {
      approvalCode: approval.code,
      issueCode: link.inspectionCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 采收审批（1种）==========

  // 20. 采收申请
  onHarvestRequestApproved: async (approval, link) => {
    console.log('【联动】采收申请审批通过，安排采收', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 作物补录审批（3种）==========

  // 21. 种源补录
  onSeedSourceSupplementaryApproved: async (approval, link) => {
    console.log('【联动】种源补录审批通过，更新数据', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 22. 育苗补录
  onSeedlingSupplementaryApproved: async (approval, link) => {
    console.log('【联动】育苗补录审批通过，更新数据', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 23. 作物入库补录
  onCropStorageSupplementaryApproved: async (approval, link) => {
    console.log('【联动】作物入库补录审批通过，更新数据', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 指标/公告审批（2种）==========

  // 24. 指标审批
  onIndicatorApprovalApproved: async (approval, link) => {
    console.log('【联动】指标审批通过，发布指标', {
      approvalCode: approval.code,
      indicatorName: link.indicatorName,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 25. 公告审批
  onAnnouncementApprovalApproved: async (approval, link) => {
    console.log('【联动】公告审批通过，发布公告', {
      approvalCode: approval.code,
      announcementTitle: link.announcementTitle,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 成本审批（2种）==========

  // 26. 预算编制
  onBudgetCreateApproved: async (approval, link) => {
    console.log('【联动】预算编制审批通过，激活预算', {
      approvalCode: approval.code,
      budgetAmount: link.budgetAmount,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 27. 预算调整
  onBudgetAdjustApproved: async (approval, link) => {
    console.log('【联动】预算调整审批通过，应用调整', {
      approvalCode: approval.code,
      originalBudget: link.originalBudget,
      newBudget: link.newBudget,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== HR审批（11种）==========

  // 28. 请假
  onLeaveApproved: async (approval, link) => {
    console.log('【联动】请假审批通过，更新请假记录', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      startDate: link.startDate,
      endDate: link.endDate,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 29. 加班
  onOvertimeApproved: async (approval, link) => {
    console.log('【联动】加班审批通过，更新加班记录', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      date: link.date,
      hours: link.totalHours,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 30. 离职
  onResignationApproved: async (approval, link) => {
    console.log('【联动】离职审批通过，更新员工状态', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      expectedResignDate: link.expectedResignDate,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 31. 招聘
  onRecruitmentApproved: async (approval, link) => {
    console.log('【联动】招聘审批通过，更新招聘流程', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 32. 入职
  onOnboardingApproved: async (approval, link) => {
    console.log('【联动】入职审批通过，创建员工档案', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 33. 考勤补录
  onAttendanceRepairApproved: async (approval, link) => {
    console.log('【联动】考勤补录审批通过，更新考勤记录', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 34. 调薪
  onSalaryAdjustmentApproved: async (approval, link) => {
    console.log('【联动】调薪审批通过，更新薪资信息', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 35. 合同续签
  onContractRenewalApproved: async (approval, link) => {
    console.log('【联动】合同续签审批通过，更新合同状态', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 36. 工资预算
  onSalaryBudgetApproved: async (approval, link) => {
    console.log('【联动】工资预算审批通过，激活预算', {
      approvalCode: approval.code,
      requestCode: link.requestCode,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // 37. 转岗
  onTransferApproved: async (approval, link) => {
    console.log('【联动】转岗审批通过，执行转岗', {
      approvalCode: approval.code,
      applicantName: approval.applicantName,
      fromDepartment: link.fromDepartment,
      toDepartment: link.toDepartment,
    });
    await updateBusinessTableAPI(approval, 'approved');
  },

  // ========== 通用回调 ==========

  // 处理审批拒绝
  onApprovalRejected: async (approval, reason) => {
    console.log('【联动】审批被拒绝，更新业务状态', {
      approvalCode: approval.code,
      reason,
    });
    // 调用后端API更新业务表
    await updateBusinessTableAPI(approval, 'rejected', { rejectionReason: reason });
  },

  // 处理审批撤回
  onApprovalCancelled: async (approval, reason) => {
    console.log('【联动】审批被撤回，更新业务状态', {
      approvalCode: approval.code,
      reason,
    });
    await updateBusinessTableAPI(approval, 'cancelled', { cancellationReason: reason });
  },
};

// ============================================================
// 注册业务联动处理器
// ============================================================

export function registerBusinessIntegration(): void {
  registerApprovalIntegration(businessIntegrationHandler);
  console.log('【业务联动】已注册业务状态更新处理器（调用后端API）');
}

// ============================================================
// 导出
// ============================================================

export { businessIntegrationHandler, updateBusinessTableAPI, batchUpdateBusinessTableAPI };
