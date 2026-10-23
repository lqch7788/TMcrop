/**
 * 通用状态枚举常量
 * 解决魔法字符串问题，统一管理状态值
 */

// ============================================================
// 通用状态
// ============================================================

export enum CommonStatus {
  ACTIVE = 'active',           // 激活/启用
  INACTIVE = 'inactive',       // 未激活/停用
  PENDING = 'pending',         // 待处理
  APPROVED = 'approved',       // 已批准
  REJECTED = 'rejected',       // 已拒绝
  CANCELLED = 'cancelled',     // 已取消
  COMPLETED = 'completed',     // 已完成
  FAILED = 'failed',           // 失败
  DRAFT = 'draft',             // 草稿
}

// ============================================================
// 任务状态
// ============================================================

/**
 * 2026-10-20 P0-10：补全为实际的 10 态
 * （此前只有 5 态，缺 draft/accepted/waiting_acceptance/rejected/failed/abandoned）
 * 注意：overdue 是**派生状态**（由 plan_date 过期推导），不落库
 */
export enum TaskStatus {
  DRAFT = 'draft',                   // 草稿
  PENDING_APPROVAL = 'pending_approval', // 派发审批中
  PENDING = 'pending',               // 待接受
  ACCEPTED = 'accepted',             // 已接受
  IN_PROGRESS = 'in_progress',       // 进行中
  WAITING_ACCEPTANCE = 'waiting_acceptance', // 待验收
  COMPLETED = 'completed',           // 已完成
  REJECTED = 'rejected',             // 返工中
  FAILED = 'failed',                 // 任务失败
  CANCELLED = 'cancelled',           // 已取消
  ABANDONED = 'abandoned',           // 已放弃
  OVERDUE = 'overdue',               // 已逾期（派生，不落库）
}

/**
 * 2026-10-20 P0-10：状态转移表 —— **后端权威**
 * 此前转移表只存在于前端 src/config/taskConfig.ts，导致后端 17 个流转端点零守卫，
 * 直调 API 可把 completed 改回 pending。
 * 前端应从 /api/task-status-transitions 拉取或与此保持一致。
 */
export const TASK_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending_approval: ['pending', 'draft', 'cancelled'],
  // 2026-10-23：补 rejected。执行人拒单（「我的任务」行内「拒绝」）走的是
  //   useTasks.rejectByExecutor → PUT /farm-tasks/:id {status:'rejected'}，
  //   缺这条边时实测返回 409「状态转移非法：pending → rejected」，
  //   按钮点了必失败、乐观更新被回滚，「拒绝 2 次必须换人」规则随之失效。
  pending: ['accepted', 'cancelled', 'draft', 'rejected'],
  // 2026-10-20：补 waiting_acceptance。执行人可以直接在「已接受」状态下提交进度，
  //   进度到 100% 即为「申请验收」（submitProgress 的 isFinal 分支）。
  //   缺这条边时该操作必被守卫拒绝（实测 accepted → waiting_acceptance 返回 409），
  //   而 UI 对 accepted 行本来就显示「提交进度」按钮 —— 用户拖到 100% 就撞墙。
  // 2026-10-23：补 rejected —— 已接受后执行人仍可能「无法继续」（拒绝执行），
  //   与 pending 同理，缺边会让该操作静默失败。
  accepted: ['in_progress', 'waiting_acceptance', 'cancelled', 'draft', 'rejected'],
  in_progress: ['waiting_acceptance', 'cancelled', 'abandoned'],
  // 2026-10-20：补 failed。POST /:id/reject 的规则是「返工次数 >= 2 判定失败」，
  //   而驳回只能从 waiting_acceptance 发起 —— 若这里不允许 failed，
  //   第二次驳回会被守卫判为非法转移（实测 NS20261017-516：
  //   rework_count=1 → 本次算 2 → newStatus=failed → 409
  //   "状态转移非法：waiting_acceptance → failed（允许：completed/rejected）"），
  //   任务永远驳不掉。failed 在 rejected 的转移里本来就已开放，语义一致。
  waiting_acceptance: ['completed', 'rejected', 'failed'],
  completed: [],
  // 2026-10-20：补 pending。「重新派发」就是从 rejected 选新执行人回到待接受，
  //   历史上 task_operation_records 里已有 rejected → pending 的真实记录。
  //   缺这条边时前端 validateTransition 直接 return（且弹窗照关），
  //   表现为点了「重新派发」什么都没发生 —— 任务卡死在返工中。
  rejected: ['in_progress', 'pending', 'failed'],
  failed: ['pending'],
  abandoned: ['pending'],
  cancelled: [],
  overdue: [],
};

/**
 * 断言状态转移是否合法；不合法时抛出带说明的错误
 */
export function assertTaskTransition(from: string, to: string): void {
  // 自转移允许（如 progress 端点重复提交同一状态）
  if (from === to) return;
  const allowed = TASK_STATUS_TRANSITIONS[from];
  if (!allowed) {
    // 未知源状态：不做拦截（历史脏数据），但记录
    console.warn(`[taskStatus] 未知源状态 ${from} → ${to}，跳过守卫`);
    return;
  }
  if (!allowed.includes(to)) {
    const error = new Error(
      `状态转移非法：${from} → ${to}（允许：${allowed.length ? allowed.join('/') : '无'}）`,
    );
    (error as Error & { code?: string }).code = 'ILLEGAL_TASK_TRANSITION';
    throw error;
  }
}

// ============================================================
// 作物生长阶段
// ============================================================

export enum CropStage {
  SEEDLING = 'seedling',             // 育苗期
  VEGETATIVE = 'vegetative',         // 营养生长期
  FLOWERING = 'flowering',           // 开花期
  FRUITING = 'fruiting',             // 结果期
  HARVEST = 'harvest',               // 采收期
  DORMANT = 'dormant',               // 休眠期
}

// ============================================================
// 库存状态
// ============================================================

export enum InventoryStatus {
  IN_STOCK = 'in_stock',             // 在库
  OUT_OF_STOCK = 'out_of_stock',     // 缺货
  LOW_STOCK = 'low_stock',           // 库存不足
  EXPIRED = 'expired',               // 已过期
  DAMAGED = 'damaged',               // 损坏
  RESERVED = 'reserved',             // 已预留
}

// ============================================================
// 审批状态（从前端 types/approval.ts 同步）
// ============================================================

export enum ApprovalStatusEnum {
  DRAFT = 'draft',                       // 草稿
  PENDING = 'pending',                   // 待审批
  APPROVED = 'approved',                 // 已通过
  PARTIALLY_APPROVED = 'partially_approved', // 部分通过
  REJECTED = 'rejected',                 // 已拒绝
  CANCELLED = 'cancelled',               // 已撤回
}

// ============================================================
// 审批动作
// ============================================================

export enum ApprovalActionEnum {
  APPROVE = 'approve',                   // 通过
  REJECT = 'reject',                     // 拒绝
  PARTIALLY_APPROVE = 'partially_approve', // 部分通过
  CANCEL = 'cancel',                     // 撤回
}

// ============================================================
// 优先级
// ============================================================

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================================
// 请假类型
// ============================================================

export enum LeaveType {
  ANNUAL = 'annual',                   // 年假
  SICK = 'sick',                       // 病假
  PERSONAL = 'personal',                // 事假
  MARRIAGE = 'marriage',               // 婚假
  MATERNITY = 'maternity',             // 产假
  FUNERAL = 'funeral',                 // 丧假
}

// ============================================================
// 加班类型
// ============================================================

export enum OvertimeType {
  WEEKDAY = 'weekday',                 // 工作日加班
  WEEKEND = 'weekend',                  // 周末加班
  HOLIDAY = 'holiday',                  // 节假日加班
}

// ============================================================
// 人员状态
// ============================================================

export enum EmployeeStatus {
  ON_BOARD = 'on_board',               // 在职
  RESIGNED = 'resigned',               // 已离职
  PROBATION = 'probation',              // 试用期
  SUSPENDED = 'suspended',              // 停职
  RETIRED = 'retired',                  // 退休
}

// ============================================================
// 性别
// ============================================================

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

// ============================================================
// 状态映射表（用于显示）- 每个枚举类型独立映射
// ============================================================

export const COMMON_STATUS_LABELS: Record<CommonStatus, string> = {
  [CommonStatus.ACTIVE]: '启用',
  [CommonStatus.INACTIVE]: '停用',
  [CommonStatus.PENDING]: '待处理',
  [CommonStatus.APPROVED]: '已批准',
  [CommonStatus.REJECTED]: '已拒绝',
  [CommonStatus.CANCELLED]: '已取消',
  [CommonStatus.COMPLETED]: '已完成',
  [CommonStatus.FAILED]: '失败',
  [CommonStatus.DRAFT]: '草稿',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.DRAFT]: '草稿',
  [TaskStatus.PENDING_APPROVAL]: '派发审批中',
  [TaskStatus.PENDING]: '待接受',
  [TaskStatus.ACCEPTED]: '已接受',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.WAITING_ACCEPTANCE]: '待验收',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.REJECTED]: '返工中',
  [TaskStatus.FAILED]: '任务失败',
  [TaskStatus.CANCELLED]: '已取消',
  [TaskStatus.ABANDONED]: '已放弃',
  [TaskStatus.OVERDUE]: '已逾期',
};

export const CROP_STAGE_LABELS: Record<CropStage, string> = {
  [CropStage.SEEDLING]: '育苗期',
  [CropStage.VEGETATIVE]: '营养生长期',
  [CropStage.FLOWERING]: '开花期',
  [CropStage.FRUITING]: '结果期',
  [CropStage.HARVEST]: '采收期',
  [CropStage.DORMANT]: '休眠期',
};

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  [InventoryStatus.IN_STOCK]: '在库',
  [InventoryStatus.OUT_OF_STOCK]: '缺货',
  [InventoryStatus.LOW_STOCK]: '库存不足',
  [InventoryStatus.EXPIRED]: '已过期',
  [InventoryStatus.DAMAGED]: '损坏',
  [InventoryStatus.RESERVED]: '已预留',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatusEnum, string> = {
  [ApprovalStatusEnum.DRAFT]: '草稿',
  [ApprovalStatusEnum.PENDING]: '待审批',
  [ApprovalStatusEnum.APPROVED]: '已通过',
  [ApprovalStatusEnum.PARTIALLY_APPROVED]: '部分通过',
  [ApprovalStatusEnum.REJECTED]: '已拒绝',
  [ApprovalStatusEnum.CANCELLED]: '已撤回',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: '低',
  [Priority.NORMAL]: '普通',
  [Priority.HIGH]: '高',
  [Priority.URGENT]: '紧急',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  [LeaveType.ANNUAL]: '年假',
  [LeaveType.SICK]: '病假',
  [LeaveType.PERSONAL]: '事假',
  [LeaveType.MARRIAGE]: '婚假',
  [LeaveType.MATERNITY]: '产假',
  [LeaveType.FUNERAL]: '丧假',
};

export const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  [OvertimeType.WEEKDAY]: '工作日加班',
  [OvertimeType.WEEKEND]: '周末加班',
  [OvertimeType.HOLIDAY]: '节假日加班',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ON_BOARD]: '在职',
  [EmployeeStatus.RESIGNED]: '已离职',
  [EmployeeStatus.PROBATION]: '试用期',
  [EmployeeStatus.SUSPENDED]: '停职',
  [EmployeeStatus.RETIRED]: '退休',
};

/**
 * 获取状态标签（通用版本）
 */
export function getCommonStatusLabel(status: string): string {
  return COMMON_STATUS_LABELS[status as CommonStatus] || status;
}

export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as TaskStatus] || status;
}

export function getCropStageLabel(status: string): string {
  return CROP_STAGE_LABELS[status as CropStage] || status;
}

export function getInventoryStatusLabel(status: string): string {
  return INVENTORY_STATUS_LABELS[status as InventoryStatus] || status;
}

export function getApprovalStatusLabel(status: string): string {
  return APPROVAL_STATUS_LABELS[status as ApprovalStatusEnum] || status;
}

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as Priority] || priority;
}

export function getLeaveTypeLabel(type: string): string {
  return LEAVE_TYPE_LABELS[type as LeaveType] || type;
}

export function getOvertimeTypeLabel(type: string): string {
  return OVERTIME_TYPE_LABELS[type as OvertimeType] || type;
}

export function getEmployeeStatusLabel(status: string): string {
  return EMPLOYEE_STATUS_LABELS[status as EmployeeStatus] || status;
}
