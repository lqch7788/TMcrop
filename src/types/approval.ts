// ============================================================
// 审批管理系统 - 核心类型定义
// 文件路径：src/types/approval.ts
// ============================================================

// ============================================================
// 审批类型枚举 - 完整37种审批类型
// ============================================================

export enum ApprovalType {
  // ========== 业务审批（10种）==========
  MATERIAL_REQUEST = 'material_request',          // 物资/领料申请
  RETURN_MATERIAL = 'return_material',           // 退料单
  PURCHASE_REQUEST = 'purchase_request',        // 采购申请
  MATERIAL_INBOUND = 'material_inbound',        // 物料入库
  MATERIAL_TRANSFER = 'material_transfer',      // 库存调拨
  SEED_SOURCE_INBOUND = 'seed_source_inbound', // 种源入库
  SEEDLING_PLAN = 'seedling_plan',            // 育苗计划
  PLANTING_PLAN = 'planting_plan',             // 种植计划
  ORDER_CREATE = 'order_create',               // 订单创建
  ORDER_CHANGE = 'order_change',              // 订单变更

  // ========== 生产审批（5种）==========
  PRODUCTION_PLAN = 'production_plan',         // 生产计划
  PRODUCTION_BATCH = 'production_batch',        // 生产批次
  BATCH_CHANGE = 'batch_change',             // 批次变更
  BATCH_VOID = 'batch_void',                 // 批次作废
  TECH_SOLUTION = 'tech_solution',             // 技术方案

  // ========== 农事审批（4种）==========
  TASK_DISPATCH = 'task_dispatch',            // 任务派发
  TASK_CHANGE = 'task_change',               // 任务变更
  INSPECTION_ISSUE = 'inspection_issue',      // 巡查问题
  ISSUE_RESOLVE = 'issue_resolve',          // 问题整改

  // ========== 采收审批（1种）==========
  HARVEST_REQUEST = 'harvest_request',       // 采收申请

  // ========== 作物补录审批（3种）==========
  SEED_SOURCE_SUPPLEMENTARY = 'seed_source_supplementary', // 种源补录
  SEEDLING_SUPPLEMENTARY = 'seedling_supplementary',     // 育苗补录
  CROP_STORAGE_SUPPLEMENTARY = 'crop_storage_supplementary', // 作物入库补录

  // ========== 指标/公告审批（2种）==========
  INDICATOR_APPROVAL = 'indicator_approval',    // 指标审批
  ANNOUNCEMENT_APPROVAL = 'announcement_approval', // 公告审批

  // ========== 成本审批（2种）==========
  BUDGET_CREATE = 'budget_create',           // 预算编制
  BUDGET_ADJUST = 'budget_adjust',           // 预算调整

  // ========== HR审批（11种）==========
  LEAVE = 'leave',                          // 请假
  OVERTIME = 'overtime',                    // 加班
  RESIGNATION = 'resignation',               // 离职
  RECRUITMENT = 'recruitment',             // 招聘
  ONBOARDING = 'onboarding',               // 入职
  ATTENDANCE_REPAIR = 'attendance_repair', // 考勤补录
  SALARY_ADJUSTMENT = 'salary_adjustment',  // 调薪
  CONTRACT_RENEWAL = 'contract_renewal',    // 合同续签
  SALARY_BUDGET = 'salary_budget',         // 工资预算
  TRANSFER = 'transfer',                   // 转岗
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
  // 业务类型 - 支持全部37种审批类型
  type: 'material' | 'purchase' | 'production' | 'leave' | 'overtime' | 'transfer' |
        'resign' | 'return' | 'recruitment' | 'harvest' | 'seed_source' | 'seedling' |
        'material_inbound' | 'material_transfer' | 'seed_source_inbound' | 'seedling_plan' |
        'planting_plan' | 'order_create' | 'order_change' | 'production_batch' |
        'batch_change' | 'batch_void' | 'tech_solution' | 'task_dispatch' |
        'task_change' | 'inspection_issue' | 'issue_resolve' | 'crop_storage' |
        'indicator' | 'announcement' | 'budget_create' | 'budget_adjust';
  requestId: string;
  requestCode: string;

  // ========== 物料相关字段 ==========
  materials?: MaterialItem[];
  purpose?: string;
  expectedUseDate?: string;
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

  // ========== 生产/种植相关字段 ==========
  greenhouseId?: string;
  greenhouseName?: string;
  greenhouseIds?: string;
  batchCode?: string;
  plantArea?: string;
  planId?: string;
  planCode?: string;
  cropName?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  targetYield?: number;
  tasks?: string[];

  // ========== 订单相关字段 ==========
  customerName?: string;
  customerContact?: string;
  orderQuantity?: number;
  unit?: string;
  deadline?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  // ========== 请假/加班相关字段 ==========
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

  // ========== 人事相关字段 ==========
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

  // ========== 招聘相关字段 ==========
  recruitmentId?: string;
  headcount?: number;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;

  // ========== 预算相关字段 ==========
  budgetAmount?: number;
  budgetType?: 'create' | 'adjust';
  adjustReason?: string;
  originalBudget?: number;
  newBudget?: number;

  // ========== 巡查/问题相关字段 ==========
  inspectionId?: string;
  inspectionCode?: string;
  issueDescription?: string;
  severity?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  resolveDeadline?: string;

  // ========== 指标相关字段 ==========
  indicatorId?: string;
  indicatorName?: string;
  indicatorValue?: number;
  indicatorUnit?: string;
  targetValue?: number;
  actualValue?: number;
  baseId?: string;
  baseName?: string;

  // ========== 公告相关字段 ==========
  announcementId?: string;
  announcementTitle?: string;
  announcementContent?: string;
  publishDate?: string;

  // ========== 通用字段 ==========
  remarks?: string;
  attachments?: string[];
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
    // ========== 业务审批（10种）==========
    [ApprovalType.MATERIAL_REQUEST]: '领料申请',
    [ApprovalType.RETURN_MATERIAL]: '退料单',
    [ApprovalType.PURCHASE_REQUEST]: '采购申请',
    [ApprovalType.MATERIAL_INBOUND]: '物料入库',
    [ApprovalType.MATERIAL_TRANSFER]: '库存调拨',
    [ApprovalType.SEED_SOURCE_INBOUND]: '种源入库',
    [ApprovalType.SEEDLING_PLAN]: '育苗计划',
    [ApprovalType.PLANTING_PLAN]: '种植计划',
    [ApprovalType.ORDER_CREATE]: '订单创建',
    [ApprovalType.ORDER_CHANGE]: '订单变更',

    // ========== 生产审批（5种）==========
    [ApprovalType.PRODUCTION_PLAN]: '生产计划',
    [ApprovalType.PRODUCTION_BATCH]: '生产批次',
    [ApprovalType.BATCH_CHANGE]: '批次变更',
    [ApprovalType.BATCH_VOID]: '批次作废',
    [ApprovalType.TECH_SOLUTION]: '技术方案',

    // ========== 农事审批（4种）==========
    [ApprovalType.TASK_DISPATCH]: '任务派发',
    [ApprovalType.TASK_CHANGE]: '任务变更',
    [ApprovalType.INSPECTION_ISSUE]: '巡查问题',
    [ApprovalType.ISSUE_RESOLVE]: '问题整改',

    // ========== 采收审批（1种）==========
    [ApprovalType.HARVEST_REQUEST]: '采收申请',

    // ========== 作物补录审批（3种）==========
    [ApprovalType.SEED_SOURCE_SUPPLEMENTARY]: '种源补录',
    [ApprovalType.SEEDLING_SUPPLEMENTARY]: '育苗补录',
    [ApprovalType.CROP_STORAGE_SUPPLEMENTARY]: '作物入库补录',

    // ========== 指标/公告审批（2种）==========
    [ApprovalType.INDICATOR_APPROVAL]: '指标审批',
    [ApprovalType.ANNOUNCEMENT_APPROVAL]: '公告审批',

    // ========== 成本审批（2种）==========
    [ApprovalType.BUDGET_CREATE]: '预算编制',
    [ApprovalType.BUDGET_ADJUST]: '预算调整',

    // ========== HR审批（11种）==========
    [ApprovalType.LEAVE]: '请假',
    [ApprovalType.OVERTIME]: '加班',
    [ApprovalType.RESIGNATION]: '离职',
    [ApprovalType.RECRUITMENT]: '招聘',
    [ApprovalType.ONBOARDING]: '入职',
    [ApprovalType.ATTENDANCE_REPAIR]: '考勤补录',
    [ApprovalType.SALARY_ADJUSTMENT]: '调薪',
    [ApprovalType.CONTRACT_RENEWAL]: '合同续签',
    [ApprovalType.SALARY_BUDGET]: '工资预算',
    [ApprovalType.TRANSFER]: '转岗',
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
