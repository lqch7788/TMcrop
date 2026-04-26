// ============================================================
// 审批管理系统 - 核心类型定义
// 文件路径：src/types/approval.ts
// ============================================================

// ============================================================
// 审批类型枚举
// ============================================================

export enum ApprovalType {
  // 业务审批
  MATERIAL_REQUEST = 'material_request',    // 物资/领料申请
  PURCHASE_REQUEST = 'purchase_request',   // 采购申请
  PRODUCTION_PLAN = 'production_plan',   // 生产计划
  HARVEST_REQUEST = 'harvest_request',    // 采收申请
  RETURN_MATERIAL = 'return_material',     // 退料单

  // HR审批
  LEAVE = 'leave',                       // 请假申请
  OVERTIME = 'overtime',                 // 加班申请
  RESIGNATION = 'resignation',           // 离职申请
  RECRUITMENT = 'recruitment',           // 招聘申请
  ONBOARDING = 'onboarding',             // 入职办理
  ATTENDANCE_REPAIR = 'attendance_repair', // 考勤补录
  SALARY_ADJUSTMENT = 'salary_adjustment', // 调薪申请
  CONTRACT_RENEWAL = 'contract_renewal',   // 合同续签
  SALARY_BUDGET = 'salary_budget',       // 工资预算
  TRANSFER = 'transfer',                  // 转岗申请
}

// ============================================================
// 审批状态
// ============================================================

export enum ApprovalStatus {
  DRAFT = 'draft',                       // 草稿
  PENDING = 'pending',                   // 待审批
  APPROVED = 'approved',                 // 已通过
  PARTIALLY_APPROVED = 'partially_approved', // 部分通过
  REJECTED = 'rejected',               // 已拒绝
  CANCELLED = 'cancelled',              // 已撤回
}

// ============================================================
// 审批动作
// ============================================================

export enum ApprovalAction {
  APPROVE = 'approve',                   // 通过
  REJECT = 'reject',                     // 拒绝
  PARTIALLY_APPROVE = 'partially_approve', // 部分通过
  CANCEL = 'cancel',                     // 撤回
}

// ============================================================
// 审批人信息
// ============================================================

export interface Approver {
  userId: string;
  userName: string;
  role: string;
  order: number;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comment?: string;
  actionTime?: string;
}

// ============================================================
// 审批记录
// ============================================================

export interface ApprovalRecord {
  id: string;
  approvalId: string;
  approverId: string;
  approverName: string;
  action: ApprovalAction;
  comment?: string;
  attachments?: string[];
  actionTime: string;
}

// ============================================================
// 物料项
// ============================================================

export interface MaterialItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  unit: string;
}

// ============================================================
// 业务关联数据
// ============================================================

export interface BusinessLink {
  type: 'material' | 'purchase' | 'production' | 'leave' | 'overtime' | 'transfer' | 'resign' | 'return' | 'recruitment';
  requestId: string;
  requestCode: string;
  materials?: MaterialItem[];
  purpose?: string;
  expectedUseDate?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  batchCode?: string;
  plantArea?: string;
  warehouseLocation?: string;
  totalAmount?: number;
  items?: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    estimatedPrice: number;
    supplier?: string;
  }>;
  expectedDeliveryDate?: string;
  planId?: string;
  planCode?: string;
  greenhouseIds?: string;
  cropName?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  targetYield?: number;
  tasks?: string[];
  leaveType?: 'annual' | 'sick' | 'personal' | 'marriage' | 'maternity' | 'funeral';
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  reason?: string;
  substituteId?: string;
  substituteName?: string;
  contactPhone?: string;
  overtimeType?: 'weekday' | 'weekend' | 'holiday';
  date?: string;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  employeeId?: string;
  employeeName?: string;
  fromDepartment?: string;
  fromPosition?: string;
  toDepartment?: string;
  toPosition?: string;
  effectiveDate?: string;
  department?: string;
  position?: string;
  joinDate?: string;
  expectedResignDate?: string;
  handoverNotes?: string;
  // 招聘相关
  recruitmentId?: string;
  department?: string;
  position?: string;
  headcount?: number;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// ============================================================
// 审批单
// ============================================================

export interface Approval {
  id: string;
  code: string;
  type: ApprovalType;
  typeName: string;
  category: 'business' | 'hr' | 'quality';
  title: string;
  description?: string;
  applicantId: string;
  applicantName: string;
  applicantDepartment: string;
  applyDate: string;
  applyTime: string;
  currentStep: number;
  totalSteps: number;
  approvers: Approver[];
  records: ApprovalRecord[];
  status: ApprovalStatus;
  businessLink?: BusinessLink;
  attachments?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string;
  reminderCount: number;
  createdAt: string;
  updatedAt: string;
  relatedBatchCode?: string;
  relatedTaskIds?: string[];
  notificationSent: boolean;
  amount?: string;
  materials?: MaterialItem[];
}

// ============================================================
// 审批统计数据
// ============================================================

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  partiallyApproved: number;
  myPending: number;
  mySubmitted: number;
  overdue: number;
  urgent: number;
}

// ============================================================
// 筛选条件
// ============================================================

export interface ApprovalFilters {
  type?: ApprovalType[];
  status?: ApprovalStatus[];
  category?: ('business' | 'hr' | 'quality')[];
  department?: string[];
  priority?: ('low' | 'normal' | 'high' | 'urgent')[];
  startDate?: string;
  endDate?: string;
  keyword?: string;
  myPending?: boolean;
  mySubmitted?: boolean;
}

// ============================================================
// 获取类型名称
// ============================================================

export const getApprovalTypeName = (type: ApprovalType): string => {
  const typeNames: Record<ApprovalType, string> = {
    [ApprovalType.MATERIAL_REQUEST]: '领料单',
    [ApprovalType.PURCHASE_REQUEST]: '采购申请',
    [ApprovalType.PRODUCTION_PLAN]: '生产计划',
    [ApprovalType.HARVEST_REQUEST]: '采收申请',
    [ApprovalType.RETURN_MATERIAL]: '退料单',
    [ApprovalType.LEAVE]: '请假申请',
    [ApprovalType.OVERTIME]: '加班申请',
    [ApprovalType.RESIGNATION]: '离职申请',
    [ApprovalType.RECRUITMENT]: '招聘申请',
    [ApprovalType.ONBOARDING]: '入职办理',
    [ApprovalType.ATTENDANCE_REPAIR]: '考勤补录',
    [ApprovalType.SALARY_ADJUSTMENT]: '调薪申请',
    [ApprovalType.CONTRACT_RENEWAL]: '合同续签',
    [ApprovalType.SALARY_BUDGET]: '工资预算',
    [ApprovalType.TRANSFER]: '转岗申请',
  };
  return typeNames[type] || type;
};

// ============================================================
// 获取状态名称
// ============================================================

export const getApprovalStatusName = (status: ApprovalStatus): string => {
  const statusNames: Record<ApprovalStatus, string> = {
    [ApprovalStatus.DRAFT]: '草稿',
    [ApprovalStatus.PENDING]: '待审批',
    [ApprovalStatus.APPROVED]: '已通过',
    [ApprovalStatus.PARTIALLY_APPROVED]: '部分通过',
    [ApprovalStatus.REJECTED]: '已拒绝',
    [ApprovalStatus.CANCELLED]: '已撤回',
  };
  return statusNames[status] || status;
};
