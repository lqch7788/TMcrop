// ============================================================
// 审批提交辅助服务
// 文件路径：src/services/approvalSubmitService.ts
// 功能：帮助业务模块快速接入审批流程
// ============================================================

import { ApprovalType } from '../types/approval';
import { createApprovalWithLevel } from '../hooks/useApprovalLevel';
import { useApprovalContext } from '../contexts/ApprovalContext';

// ============================================================
// 业务数据接口
// ============================================================

export interface BusinessData {
  /** 业务ID */
  id: string;
  /** 业务编号 */
  code: string;
  /** 业务标题 */
  title: string;
  /** 业务类型 */
  type: ApprovalType;
  /** 申请金额 */
  amount: number;
  /** 申请人ID */
  applicantId: string;
  /** 申请人名称 */
  applicantName: string;
  /** 申请人部门 */
  applicantDepartment: string;
  /** 附加数据 */
  additionalData?: {
    leaveDays?: number;
    overtimeHours?: number;
    isHighValue?: boolean;
  };
  /** 业务关联数据 */
  businessLink?: {
    type: string;
    requestId: string;
    requestCode: string;
    [key: string]: unknown;
  };
}

// ============================================================
// 审批提交结果
// ============================================================

export interface ApprovalSubmitResult {
  success: boolean;
  approvalId?: string;
  approvalCode?: string;
  autoApprove: boolean;
  level: string;
  message: string;
}

// ============================================================
// 审批提交服务
// ============================================================

class ApprovalSubmitService {
  /**
   * 提交审批
   */
  async submitApproval(businessData: BusinessData): Promise<ApprovalSubmitResult> {
    try {
      // 1. 解析审批级别
      const { approval, levelResult } = createApprovalWithLevel({
        type: businessData.type,
        amount: businessData.amount,
        applicantId: businessData.applicantId,
        applicantName: businessData.applicantName,
        applicantDepartment: businessData.applicantDepartment,
        title: businessData.title,
        additionalData: businessData.additionalData,
        businessLink: businessData.businessLink as any,
      });

      // 2. 生成审批编号
      const approvalCode = this.generateApprovalCode(businessData.type);

      // 3. 补全审批数据（统一以 pending 提交，自动通过走 PATCH 联动）
      const fullApproval = {
        ...approval,
        id: this.generateId(),
        code: approvalCode,
        status: 'pending' as const,
      };

      // 4. 调用 API 保存审批数据（使用 enhancedApiClient，走三级降级）
      const { enhancedApiClient } = await import('../lib/apiClient');
      const response = await enhancedApiClient.post<{ success: boolean; id: string; code: string; error?: string }>(
        '/api/approvals',
        fullApproval
      );

      if (!response.success) {
        return {
          success: false,
          autoApprove: levelResult.autoApprove,
          level: levelResult.level,
          message: `提交审批失败: ${response.error}`,
        };
      }

      // 5. 如果是自动通过，调用 PATCH 端点触发审批联动（updateBusinessTable）
      if (levelResult.autoApprove) {
        console.log('【审批提交】自动通过审批，触发PATCH联动，businessLink:', businessData.businessLink);
        try {
          const approverId = businessData.applicantId || 'system';
          const approverName = businessData.applicantName || '系统';
          await enhancedApiClient.patch(
            `/api/approvals/${fullApproval.id}/action`,
            { action: 'approve', comment: '免审批自动通过', approverId, approverName }
          );
          console.log('【审批提交】自动通过审批，业务联动更新成功');
        } catch (linkError) {
          console.error('【审批提交】自动通过审批，业务联动更新失败:', linkError);
        }
      }

      return {
        success: true,
        approvalId: fullApproval.id,
        approvalCode: fullApproval.code,
        autoApprove: levelResult.autoApprove,
        level: levelResult.level,
        message: levelResult.autoApprove
          ? '金额在免审批阈值内，已自动通过'
          : `已提交审批，等待 ${levelResult.approverCount} 位审批人处理`,
      };
    } catch (error) {
      console.error('【审批提交】提交审批失败', error);
      return {
        success: false,
        autoApprove: false,
        level: 'unknown',
        message: `提交审批异常: ${error}`,
      };
    }
  }

  /**
   * 生成审批编号
   * 格式: SP + 年月日 + 类型代码 + 流水号
   */
  private generateApprovalCode(type: ApprovalType): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const typeCode = this.getTypeCode(type);
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SP${year}${month}${day}${typeCode}${seq}`;
  }

  /**
   * 获取类型代码
   */
  private getTypeCode(type: ApprovalType): string {
    const typeCodes: Record<ApprovalType, string> = {
      // 业务审批
      [ApprovalType.MATERIAL_REQUEST]: 'ML',
      [ApprovalType.RETURN_MATERIAL]: 'RM',
      [ApprovalType.PURCHASE_REQUEST]: 'CG',
      [ApprovalType.MATERIAL_INBOUND]: 'MI',
      [ApprovalType.MATERIAL_TRANSFER]: 'MT',
      [ApprovalType.SEED_SOURCE_INBOUND]: 'SS',
      [ApprovalType.SEEDLING_PLAN]: 'YP',
      [ApprovalType.PLANTING_PLAN]: 'ZZ',
      [ApprovalType.ORDER_CREATE]: 'DD',
      [ApprovalType.ORDER_CHANGE]: 'DG',
      // 生产审批
      [ApprovalType.PRODUCTION_PLAN]: 'SC',
      [ApprovalType.PRODUCTION_BATCH]: 'PC',
      [ApprovalType.BATCH_CHANGE]: 'BG',
      [ApprovalType.BATCH_VOID]: 'BV',
      [ApprovalType.TECH_SOLUTION]: 'JS',
      // 农事审批
      [ApprovalType.TASK_DISPATCH]: 'RW',
      [ApprovalType.TASK_CHANGE]: 'RG',
      [ApprovalType.INSPECTION_ISSUE]: 'XC',
      [ApprovalType.ISSUE_RESOLVE]: 'ZG',
      // 采收审批
      [ApprovalType.HARVEST_REQUEST]: 'HS',
      // 作物补录审批
      [ApprovalType.SEED_SOURCE_SUPPLEMENTARY]: 'SB',
      [ApprovalType.SEEDLING_SUPPLEMENTARY]: 'YB',
      [ApprovalType.CROP_STORAGE_SUPPLEMENTARY]: 'CB',
      // 指标/公告审批
      [ApprovalType.INDICATOR_APPROVAL]: 'ZB',
      [ApprovalType.INDICATOR_ADJUST]: 'ZT',
      [ApprovalType.ANNOUNCEMENT_APPROVAL]: 'GG',
      // 成本审批
      [ApprovalType.BUDGET_CREATE]: 'YS',
      [ApprovalType.BUDGET_ADJUST]: 'YG',
      // HR审批
      [ApprovalType.LEAVE]: 'QJ',
      [ApprovalType.OVERTIME]: 'JB',
      [ApprovalType.RESIGNATION]: 'LZ',
      [ApprovalType.RECRUITMENT]: 'ZP',
      [ApprovalType.ONBOARDING]: 'RS',
      [ApprovalType.ATTENDANCE_REPAIR]: 'BX',
      [ApprovalType.SALARY_ADJUSTMENT]: 'TX',
      [ApprovalType.CONTRACT_RENEWAL]: 'HT',
      [ApprovalType.SALARY_BUDGET]: 'GZ',
      [ApprovalType.TRANSFER]: 'ZG',
    };
    return typeCodes[type] || 'XX';
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================
// 导出单例
// ============================================================

export const approvalSubmitService = new ApprovalSubmitService();

// ============================================================
// 快捷审批提交函数
// ============================================================

/**
 * 提交订单审批
 */
export async function submitOrderApproval(params: {
  orderId: string;
  orderCode: string;
  orderName: string;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
  isHighValue?: boolean;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.orderId,
    code: params.orderCode,
    title: `订单创建: ${params.orderName}`,
    type: ApprovalType.ORDER_CREATE,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    additionalData: { isHighValue: params.isHighValue },
    businessLink: {
      type: 'order_create',
      requestId: params.orderId,
      requestCode: params.orderCode,
    },
  });
}

/**
 * 提交采购审批
 */
export async function submitPurchaseApproval(params: {
  purchaseId: string;
  purchaseCode: string;
  purchaseName: string;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.purchaseId,
    code: params.purchaseCode,
    title: `采购申请: ${params.purchaseName}`,
    type: ApprovalType.PURCHASE_REQUEST,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'purchase',
      requestId: params.purchaseId,
      requestCode: params.purchaseCode,
    },
  });
}

/**
 * 提交请假审批
 */
export async function submitLeaveApproval(params: {
  leaveId: string;
  leaveCode: string;
  leaveType: string;
  days: number;
  applicantId: string;
  applicantName: string;
  department: string;
  reason?: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.leaveId,
    code: params.leaveCode,
    title: `请假申请: ${params.leaveType} ${params.days}天`,
    type: ApprovalType.LEAVE,
    amount: 0, // 请假不计金额
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    additionalData: { leaveDays: params.days },
    businessLink: {
      type: 'leave',
      requestId: params.leaveId,
      requestCode: params.leaveCode,
      leaveType: params.leaveType,
      totalDays: params.days,
      reason: params.reason,
    },
  });
}

/**
 * 提交加班审批
 */
export async function submitOvertimeApproval(params: {
  overtimeId: string;
  overtimeCode: string;
  overtimeType: string;
  hours: number;
  applicantId: string;
  applicantName: string;
  department: string;
  date: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.overtimeId,
    code: params.overtimeCode,
    title: `加班申请: ${params.overtimeType} ${params.hours}小时`,
    type: ApprovalType.OVERTIME,
    amount: 0, // 加班不计金额
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    additionalData: { overtimeHours: params.hours },
    businessLink: {
      type: 'overtime',
      requestId: params.overtimeId,
      requestCode: params.overtimeCode,
      overtimeType: params.overtimeType,
      totalHours: params.hours,
      date: params.date,
    },
  });
}

/**
 * 提交离职审批
 */
export async function submitResignationApproval(params: {
  resignationId: string;
  resignationCode: string;
  employeeName: string;
  employeeId: string;
  applicantId: string;
  applicantName: string;
  department: string;
  expectedDate: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.resignationId,
    code: params.resignationCode,
    title: `离职申请: ${params.employeeName}`,
    type: ApprovalType.RESIGNATION,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'resign',
      requestId: params.resignationId,
      requestCode: params.resignationCode,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      expectedResignDate: params.expectedDate,
    },
  });
}

// ============================================================
// 以下为补充的快捷审批提交函数
// ============================================================

/**
 * 提交物资/领料申请审批
 */
export async function submitMaterialRequestApproval(params: {
  requestId: string;
  requestCode: string;
  materials: Array<{ name: string; quantity: number }>;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.requestId,
    code: params.requestCode,
    title: `领料申请: ${params.materials.map(m => m.name).join(', ')}`,
    type: ApprovalType.MATERIAL_REQUEST,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'material',
      requestId: params.requestId,
      requestCode: params.requestCode,
      materials: params.materials,
    },
  });
}

/**
 * 提交退料单审批
 */
export async function submitReturnMaterialApproval(params: {
  returnId: string;
  returnCode: string;
  materials: Array<{ name: string; quantity: number }>;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.returnId,
    code: params.returnCode,
    title: `退料申请: ${params.materials.map(m => m.name).join(', ')}`,
    type: ApprovalType.RETURN_MATERIAL,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'return',
      requestId: params.returnId,
      requestCode: params.returnCode,
      materials: params.materials,
    },
  });
}

/**
 * 提交物料入库审批
 */
export async function submitMaterialInboundApproval(params: {
  inboundId: string;
  inboundCode: string;
  materialName: string;
  quantity: number;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.inboundId,
    code: params.inboundCode,
    title: `物料入库: ${params.materialName}`,
    type: ApprovalType.MATERIAL_INBOUND,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'material_inbound',
      requestId: params.inboundId,
      requestCode: params.inboundCode,
    },
  });
}

/**
 * 提交库存调拨审批
 */
export async function submitMaterialTransferApproval(params: {
  transferId: string;
  transferCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  materials: Array<{ name: string; quantity: number }>;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.transferId,
    code: params.transferCode,
    title: `库存调拨: ${params.fromWarehouse} → ${params.toWarehouse}`,
    type: ApprovalType.MATERIAL_TRANSFER,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'material_transfer',
      requestId: params.transferId,
      requestCode: params.transferCode,
      fromWarehouse: params.fromWarehouse,
      toWarehouse: params.toWarehouse,
    },
  });
}

/**
 * 提交种源入库审批
 */
export async function submitSeedSourceInboundApproval(params: {
  inboundId: string;
  inboundCode: string;
  seedSourceName: string;
  quantity: number;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.inboundId,
    code: params.inboundCode,
    title: `种源入库: ${params.seedSourceName}`,
    type: ApprovalType.SEED_SOURCE_INBOUND,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'seed_source_inbound',
      requestId: params.inboundId,
      requestCode: params.inboundCode,
    },
  });
}

/**
 * 提交育苗计划审批
 */
export async function submitSeedlingPlanApproval(params: {
  planId: string;
  planCode: string;
  planName: string;
  seedlingCount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.planId,
    code: params.planCode,
    title: `育苗计划: ${params.planName}`,
    type: ApprovalType.SEEDLING_PLAN,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'seedling_plan',
      requestId: params.planId,
      requestCode: params.planCode,
    },
  });
}

/**
 * 提交种植计划审批
 */
export async function submitPlantingPlanApproval(params: {
  planId: string;
  planCode: string;
  planName: string;
  area: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.planId,
    code: params.planCode,
    title: `种植计划: ${params.planName}`,
    type: ApprovalType.PLANTING_PLAN,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'planting_plan',
      requestId: params.planId,
      requestCode: params.planCode,
    },
  });
}

/**
 * 提交生产计划审批
 */
export async function submitProductionPlanApproval(params: {
  planId: string;
  planCode: string;
  planName: string;
  batchCount: number;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.planId,
    code: params.planCode,
    title: `生产计划: ${params.planName}`,
    type: ApprovalType.PRODUCTION_PLAN,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'production',
      requestId: params.planId,
      requestCode: params.planCode,
    },
  });
}

/**
 * 提交生产批次审批
 */
export async function submitProductionBatchApproval(params: {
  batchId: string;
  batchCode: string;
  batchName: string;
  quantity: number;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.batchId,
    code: params.batchCode,
    title: `生产批次: ${params.batchName}`,
    type: ApprovalType.PRODUCTION_BATCH,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'production_batch',
      requestId: params.batchId,
      batchCode: params.batchCode,
    },
  });
}

/**
 * 提交批次变更审批
 */
export async function submitBatchChangeApproval(params: {
  changeId: string;
  changeCode: string;
  batchCode: string;
  changeType: string;
  description: string;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.changeId,
    code: params.changeCode,
    title: `批次变更: ${params.batchCode}`,
    type: ApprovalType.BATCH_CHANGE,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'batch_change',
      requestId: params.changeId,
      batchCode: params.batchCode,
    },
  });
}

/**
 * 提交批次作废审批
 */
export async function submitBatchVoidApproval(params: {
  voidId: string;
  voidCode: string;
  batchCode: string;
  reason: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.voidId,
    code: params.voidCode,
    title: `批次作废: ${params.batchCode}`,
    type: ApprovalType.BATCH_VOID,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'batch_void',
      requestId: params.voidId,
      batchCode: params.batchCode,
    },
  });
}

/**
 * 提交技术方案审批
 */
export async function submitTechSolutionApproval(params: {
  solutionId: string;
  solutionCode: string;
  solutionName: string;
  description: string;
  amount: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.solutionId,
    code: params.solutionCode,
    title: `技术方案: ${params.solutionName}`,
    type: ApprovalType.TECH_SOLUTION,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'tech_solution',
      requestId: params.solutionId,
      requestCode: params.solutionCode,
    },
  });
}

/**
 * 提交任务派发审批
 */
export async function submitTaskDispatchApproval(params: {
  taskId: string;
  taskCode: string;
  taskName: string;
  assigneeName: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.taskId,
    code: params.taskCode,
    title: `任务派发: ${params.taskName}`,
    type: ApprovalType.TASK_DISPATCH,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'task_dispatch',
      requestId: params.taskId,
      requestCode: params.taskCode,
    },
  });
}

/**
 * 提交任务变更审批
 */
export async function submitTaskChangeApproval(params: {
  changeId: string;
  changeCode: string;
  taskCode: string;
  changeType: string;
  description: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.changeId,
    code: params.changeCode,
    title: `任务变更: ${params.taskCode}`,
    type: ApprovalType.TASK_CHANGE,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'task_change',
      requestId: params.changeId,
      requestCode: params.changeCode,
    },
  });
}

/**
 * 提交巡查问题审批
 */
export async function submitInspectionIssueApproval(params: {
  issueId: string;
  issueCode: string;
  issueType: string;
  description: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.issueId,
    code: params.issueCode,
    title: `巡查问题: ${params.issueType}`,
    type: ApprovalType.INSPECTION_ISSUE,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'inspection_issue',
      requestId: params.issueId,
      inspectionCode: params.issueCode,
    },
  });
}

/**
 * 提交问题整改审批
 */
export async function submitIssueResolveApproval(params: {
  resolveId: string;
  resolveCode: string;
  issueCode: string;
  resolvePlan: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.resolveId,
    code: params.resolveCode,
    title: `问题整改: ${params.issueCode}`,
    type: ApprovalType.ISSUE_RESOLVE,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'issue_resolve',
      requestId: params.resolveId,
      inspectionCode: params.issueCode,
    },
  });
}

/**
 * 提交采收申请审批
 */
export async function submitHarvestRequestApproval(params: {
  harvestId: string;
  harvestCode: string;
  cropName: string;
  quantity: number;
  estimatedYield: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.harvestId,
    code: params.harvestCode,
    title: `采收申请: ${params.cropName}`,
    type: ApprovalType.HARVEST_REQUEST,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'harvest',
      requestId: params.harvestId,
      requestCode: params.harvestCode,
    },
  });
}

/**
 * 提交种源补录审批
 */
export async function submitSeedSourceSupplementaryApproval(params: {
  supplementaryId: string;
  supplementaryCode: string;
  seedSourceName: string;
  supplementaryType: string;
  quantity: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.supplementaryId,
    code: params.supplementaryCode,
    title: `种源补录: ${params.seedSourceName}`,
    type: ApprovalType.SEED_SOURCE_SUPPLEMENTARY,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'seed_source',
      requestId: params.supplementaryId,
      requestCode: params.supplementaryCode,
    },
  });
}

/**
 * 提交育苗补录审批
 */
export async function submitSeedlingSupplementaryApproval(params: {
  supplementaryId: string;
  supplementaryCode: string;
  seedlingName: string;
  supplementaryType: string;
  quantity: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.supplementaryId,
    code: params.supplementaryCode,
    title: `育苗补录: ${params.seedlingName}`,
    type: ApprovalType.SEEDLING_SUPPLEMENTARY,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'seedling',
      requestId: params.supplementaryId,
      requestCode: params.supplementaryCode,
    },
  });
}

/**
 * 提交作物入库补录审批
 */
export async function submitCropStorageSupplementaryApproval(params: {
  supplementaryId: string;
  supplementaryCode: string;
  cropName: string;
  supplementaryType: string;
  quantity: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.supplementaryId,
    code: params.supplementaryCode,
    title: `作物入库补录: ${params.cropName}`,
    type: ApprovalType.CROP_STORAGE_SUPPLEMENTARY,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'crop_storage',
      requestId: params.supplementaryId,
      requestCode: params.supplementaryCode,
    },
  });
}

/**
 * 提交指标审批
 */
export async function submitIndicatorApproval(params: {
  indicatorId: string;
  indicatorCode: string;
  indicatorName: string;
  indicatorType: string;
  targetValue: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.indicatorId,
    code: params.indicatorCode,
    title: `指标审批: ${params.indicatorName}`,
    type: ApprovalType.INDICATOR_APPROVAL,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'indicator',
      requestId: params.indicatorId,
      indicatorName: params.indicatorName,
    },
  });
}

/**
 * 提交公告审批
 */
export async function submitAnnouncementApproval(params: {
  announcementId: string;
  announcementCode: string;
  announcementTitle: string;
  announcementType: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.announcementId,
    code: params.announcementCode,
    title: `公告审批: ${params.announcementTitle}`,
    type: ApprovalType.ANNOUNCEMENT_APPROVAL,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'announcement',
      requestId: params.announcementId,
      announcementTitle: params.announcementTitle,
    },
  });
}

/**
 * 提交预算编制审批
 */
export async function submitBudgetCreateApproval(params: {
  budgetId: string;
  budgetCode: string;
  budgetName: string;
  department: string;
  amount: number;
  applicantId: string;
  applicantName: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.budgetId,
    code: params.budgetCode,
    title: `预算编制: ${params.budgetName}`,
    type: ApprovalType.BUDGET_CREATE,
    amount: params.amount,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'budget_create',
      requestId: params.budgetId,
      budgetAmount: params.amount,
    },
  });
}

/**
 * 提交预算调整审批
 */
export async function submitBudgetAdjustApproval(params: {
  adjustId: string;
  adjustCode: string;
  budgetCode: string;
  originalBudget: number;
  newBudget: number;
  adjustReason: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.adjustId,
    code: params.adjustCode,
    title: `预算调整: ${params.budgetCode}`,
    type: ApprovalType.BUDGET_ADJUST,
    amount: Math.abs(params.newBudget - params.originalBudget),
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'budget_adjust',
      requestId: params.adjustId,
      originalBudget: params.originalBudget,
      newBudget: params.newBudget,
    },
  });
}

/**
 * 提交合同续签审批
 */
export async function submitContractRenewalApproval(params: {
  renewalId: string;
  renewalCode: string;
  employeeName: string;
  employeeId: string;
  newContractEnd: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.renewalId,
    code: params.renewalCode,
    title: `合同续签: ${params.employeeName}`,
    type: ApprovalType.CONTRACT_RENEWAL,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'contract_renewal',
      requestId: params.renewalId,
      requestCode: params.renewalCode,
    },
  });
}

/**
 * 提交入职审批
 */
export async function submitOnboardingApproval(params: {
  onboardingId: string;
  onboardingCode: string;
  employeeName: string;
  department: string;
  position: string;
  expectedStartDate: string;
  applicantId: string;
  applicantName: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.onboardingId,
    code: params.onboardingCode,
    title: `入职申请: ${params.employeeName}`,
    type: ApprovalType.ONBOARDING,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'onboarding',
      requestId: params.onboardingId,
      requestCode: params.onboardingCode,
    },
  });
}

/**
 * 提交考勤补录审批
 */
export async function submitAttendanceRepairApproval(params: {
  repairId: string;
  repairCode: string;
  employeeName: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.repairId,
    code: params.repairCode,
    title: `考勤补录: ${params.employeeName}`,
    type: ApprovalType.ATTENDANCE_REPAIR,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'attendance_repair',
      requestId: params.repairId,
      requestCode: params.repairCode,
    },
  });
}

/**
 * 提交调薪审批
 */
export async function submitSalaryAdjustmentApproval(params: {
  adjustmentId: string;
  adjustmentCode: string;
  employeeName: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentType: string;
  effectiveDate: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.adjustmentId,
    code: params.adjustmentCode,
    title: `调薪申请: ${params.employeeName}`,
    type: ApprovalType.SALARY_ADJUSTMENT,
    amount: params.proposedSalary - params.currentSalary,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'salary_adjustment',
      requestId: params.adjustmentId,
      requestCode: params.adjustmentCode,
    },
  });
}

/**
 * 提交工资预算审批
 */
export async function submitSalaryBudgetApproval(params: {
  budgetId: string;
  budgetCode: string;
  deptName: string;
  budgetMonth: string;
  grandTotal: number;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.budgetId,
    code: params.budgetCode,
    title: `工资预算: ${params.deptName}${params.budgetMonth}月`,
    type: ApprovalType.SALARY_BUDGET,
    amount: params.grandTotal,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'salary_budget',
      requestId: params.budgetId,
      requestCode: params.budgetCode,
    },
  });
}

/**
 * 提交转岗审批
 */
export async function submitTransferApproval(params: {
  transferId: string;
  transferCode: string;
  employeeName: string;
  fromDepartment: string;
  toDepartment: string;
  transferReason: string;
  applicantId: string;
  applicantName: string;
  department: string;
}): Promise<ApprovalSubmitResult> {
  return approvalSubmitService.submitApproval({
    id: params.transferId,
    code: params.transferCode,
    title: `转岗申请: ${params.employeeName}`,
    type: ApprovalType.TRANSFER,
    amount: 0,
    applicantId: params.applicantId,
    applicantName: params.applicantName,
    applicantDepartment: params.department,
    businessLink: {
      type: 'transfer',
      requestId: params.transferId,
      requestCode: params.transferCode,
    },
  });
}

export default approvalSubmitService;
