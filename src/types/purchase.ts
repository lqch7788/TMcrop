// ============================================================
// 采购申请单类型定义
// 文件路径：src/types/purchase.ts
// 业务说明：一个采购申请单对应一个生产计划批次
// ============================================================

/**
 * 采购申请单状态
 */
export type PurchaseStatus =
  | 'draft'           // 草稿
  | 'pending'        // 待审批
  | 'approved'       // 已通过
  | 'purchasing'     // 采购中
  | 'completed'      // 已完成
  | 'cancelled';    // 已取消

/**
 * 采购申请单优先级
 */
export type PurchasePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 采购申请单类型（业务分类）
 */
export type PurchaseType = 'production' | 'urgent' | 'routine' | 'material' | 'equipment' | 'other';

/**
 * 物料明细项 - 对齐仓库物料总览字段结构
 * 支持后续导出用于入库
 */
export interface PurchaseItem {
  id: string;
  // 关联信息（可选，非生产物资可为空）
  relatedBatchCode?: string;       // 关联生产计划批次号

  // 物料信息
  materialId: string;
  materialCode: string;         // 物料编码（仓库编码规则 SP0201-xxx）
  materialName: string;          // 物料名称
  barcode?: string;              // 条码

  // 分类信息 - 对齐仓库物料三级分类
  category: string;             // 分类：中分类-子分类格式
  bigCategory?: string;         // 大分类
  midCategory?: string;         // 中分类
  subCategory?: string;         // 子分类

  // 规格与单位
  specification: string;        // 规格型号
  unit: string;                 // 单位

  // 数量与价格
  quantity: number;             // 采购数量
  estimatedPrice: number;       // 预估单价（元）
  estimatedTotalPrice: number;  // 预估总价 = quantity * estimatedPrice

  // 供应商与库位（一个采购申请单可能有多家供应商）
  supplier: string;             // 供应商
  location?: string;            // 期望存放位置

  // 批次信息
  batchNo?: string;            // 批号
  productionDate?: string;       // 生产日期
  expiryDate?: string;          // 有效期/到期日期

  // 业务字段
  purpose?: string;             // 用途说明（关键业务字段）
  remark?: string;             // 备注
}

/**
 * 采购申请单
 * 核心变化：一个采购申请单对应一个生产计划批次
 */
export interface PurchaseApplication {
  id: string;
  // 采购申请编号（必填，唯一标识）
  purchaseApplicationCode: string;
  // 关联生产计划批次号（可选，非生产物资采购可为空）
  relatedBatchCode?: string;

  // 基本信息
  purchaseType: PurchaseType;           // 采购类型
  purchaseTypeName: string;            // 类型显示名称
  applicant: string;                   // 申请人
  applicantId: string;                 // 申请人ID
  applicantDepartment: string;           // 申请部门 **新增**
  applyDate: string;                   // 申请日期
  requiredDate: string;                // 需求日期（原交货日期改名）
  priority: PurchasePriority;           // 优先级
  priorityText: string;                // 优先级显示文本
  status: PurchaseStatus;              // 状态
  statusText: string;                  // 状态显示文本

  // 物料明细
  items: PurchaseItem[];               // 物料明细数组
  itemCount: number;                  // 物料种类数

  // 审批相关（如果已关联审批单）
  approvalId?: string;
  approvalCode?: string;
  approvalStatus?: string;
  approvalPerson?: string;           // 审批人

  // 备注
  remark?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 类型别名（兼容旧代码）
// ============================================================
export type PurchasePlan = PurchaseApplication;
export type PurchasePlanItem = PurchaseItem;
export type PurchasePlanStatus = PurchaseStatus;
export type PurchasePlanPriority = PurchasePriority;
export type PurchasePlanType = PurchaseType;

// ============================================================
// 排序字段
// ============================================================
export type PurchaseSortField =
  | 'relatedBatchCode'
  | 'purchaseType'
  | 'applicant'
  | 'applicantDepartment'
  | 'applyDate'
  | 'requiredDate'
  | 'priority'
  | 'status';

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 排序配置
 */
export interface SortConfig {
  field: PurchaseSortField;
  direction: SortDirection;
}

// ============================================================
// 预警类型定义
// ============================================================

/**
 * 预警等级
 */
export type OverdueAlertLevel = 'normal' | 'warning' | 'overdue';

/**
 * 预警信息
 */
export interface OverdueAlert {
  level: OverdueAlertLevel;       // 预警等级
  daysOverdue: number;           // 逾期天数（负数表示剩余天数）
  message: string;               // 预警消息
}

/**
 * 计算采购计划的预警状态
 * @param plan 采购计划
 * @returns 预警信息
 */
export function calculateOverdueAlert(plan: PurchasePlan): OverdueAlert {
  // 已完成或已取消的不预警
  if (plan.status === 'completed' || plan.status === 'cancelled' || plan.status === 'draft') {
    return { level: 'normal', daysOverdue: 0, message: '' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requiredDate = new Date(plan.requiredDate);
  requiredDate.setHours(0, 0, 0, 0);

  const diffTime = requiredDate.getTime() - today.getTime();
  const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 逾期：当前日期 > 需求日期
  if (daysOverdue < 0) {
    return {
      level: 'overdue',
      daysOverdue: Math.abs(daysOverdue),
      message: `已逾期 ${Math.abs(daysOverdue)} 天`,
    };
  }

  // 即将逾期：3天内即将到期
  if (daysOverdue <= 3) {
    return {
      level: 'warning',
      daysOverdue: -daysOverdue, // 负数表示剩余天数
      message: `还有 ${daysOverdue} 天到期`,
    };
  }

  return { level: 'normal', daysOverdue: 0, message: '' };
}

/**
 * 预警样式映射
 */
export const OVERDUE_ALERT_STYLE: Record<OverdueAlertLevel, { bg: string; text: string; icon: string }> = {
  normal: { bg: '', text: '', icon: '' },
  warning: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⚠️' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
};

/**
 * 筛选条件
 */
export interface PurchaseFilters {
  relatedBatchCode?: string;           // 关联生产计划批次号
  purchaseType?: PurchaseType | 'all';
  status?: PurchaseStatus | 'all';
  applicant?: string;
  applicantDepartment?: string;
  priority?: PurchasePriority | 'all';
  requiredStartDate?: string;
  requiredEndDate?: string;
  applyStartDate?: string;
  applyEndDate?: string;
  keyword?: string;                     // 搜索关键字（匹配批次号、物料名称、供应商）
  materialName?: string;                 // 物料名称（明细级搜索）
  supplier?: string;                     // 供应商（明细级搜索）
}

// ============================================================
// 状态显示文本映射
// ============================================================
export const PURCHASE_STATUS_TEXT: Record<PurchaseStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approved: '已通过',
  purchasing: '采购中',
  completed: '已完成',
  cancelled: '已取消',
};

export const PURCHASE_PRIORITY_TEXT: Record<PurchasePriority, string> = {
  urgent: '紧急',
  high: '高',
  normal: '中',
  low: '低',
};

export const PURCHASE_TYPE_TEXT: Record<PurchaseType, string> = {
  production: '生产物资采购',
  urgent: '紧急采购',
  routine: '常规采购',
  material: '通用物资',
  equipment: '设备采购',
  other: '其他',
};

// ============================================================
// 状态样式映射
// ============================================================
export const PURCHASE_STATUS_STYLE: Record<PurchaseStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700' },
  purchasing: { bg: 'bg-purple-100', text: 'text-purple-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const PURCHASE_PRIORITY_STYLE: Record<PurchasePriority, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

// ============================================================
// 兼容旧代码的导出
// ============================================================
export const PURCHASE_PLAN_STATUS_TEXT = PURCHASE_STATUS_TEXT;
export const PURCHASE_PLAN_PRIORITY_TEXT = PURCHASE_PRIORITY_TEXT;
export const PURCHASE_PLAN_TYPE_TEXT = PURCHASE_TYPE_TEXT;
export const PURCHASE_PLAN_STATUS_STYLE = PURCHASE_STATUS_STYLE;
export const PURCHASE_PLAN_PRIORITY_STYLE = PURCHASE_PRIORITY_STYLE;
