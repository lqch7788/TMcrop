// 招聘管理模块类型定义

export type RecruitmentStatus = '待审批' | '招聘中' | '已完成' | '已取消';
export type RecruitmentSource = '劳务公司' | '个人零工' | '学生实习' | '内部推荐';

export interface RecruitmentRequest {
  id: string;
  requestCode: string;      // ZP-YYYYMMDD-XXX
  position: string;          // 招聘岗位
  department: string;        // 需求部门
  quantity: number;          // 招聘人数
  reason: string;           // 招聘原因
  requirements: string;      // 岗位要求
  source: RecruitmentSource; // 来源
  expectedDate: string;      // 期望到岗日期
  status: RecruitmentStatus;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  approverId?: string;
  approverName?: string;
  approveDate?: string;
  remarks?: string;
  // 审批历史
  approvalHistory?: ApprovalHistoryItem[];
}

export interface ApprovalHistoryItem {
  step: number;
  action: 'submit' | 'approve' | 'reject' | 'cancel';
  actionName: string;
  operatorId: string;
  operatorName: string;
  operateDate: string;
  comment?: string;
}

// 招聘表单数据
export interface RecruitmentFormData {
  position: string;
  department: string;
  quantity: number;
  reason: string;
  requirements: string;
  source: RecruitmentSource;
  expectedDate: string;
  remarks?: string;
}

// 筛选条件
export interface RecruitmentFilters {
  searchTerm: string;
  statusFilter: RecruitmentStatus | 'all';
  sourceFilter: RecruitmentSource | 'all';
}
