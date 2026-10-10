// MaterialApproval 类型定义
// 库存审批页面的类型定义（页面原「物料审批」，2026-10-10 更名）

import { Approval, ApprovalStatus, ApprovalType } from '@/types/approval';

// Tab类型
export type MaterialApprovalTab =
  | 'material'
  | 'return'
  | 'purchase'
  | 'material_inbound'
  | 'material_transfer'
  | 'seed_inbound'
  | 'seedling'
  | 'planting'
  | 'order'
  | 'supplementary';

// Tab配置
export interface TabConfig {
  key: MaterialApprovalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  // 2026-10-09：改 readonly——tabs 定义用 as const（readonly tuple），原 mutable 数组类型不兼容
  types: readonly ApprovalType[];
  /** 2026-10-09：tab 悬停提示——告知用户该 tab 对应哪个业务页面的提交入口 */
  hint?: string;
}

// 统计数据
export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

// 详情弹窗状态
export interface DetailModalState {
  show: boolean;
  item: Approval | null;
}

// 拒绝原因弹窗状态
export interface RejectModalState {
  show: boolean;
  item: Approval | null;
  reason: string;
  /** 2026-09-27 审计修复：弹窗双模式（approve 通过意见选填 / reject 拒绝原因必填） */
  mode: 'reject' | 'approve';
}

// Hook返回类型
export interface UseMaterialApprovalReturn {
  // 数据
  approvals: Approval[];
  stats: ApprovalStats;
  tabs: readonly TabConfig[];

  // 筛选状态
  activeTab: MaterialApprovalTab;
  setActiveTab: (tab: MaterialApprovalTab) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  searchApplicant: string;
  setSearchApplicant: (applicant: string) => void;
  searchBatchCode: string;
  setSearchBatchCode: (code: string) => void;
  searchDepartment: string;
  setSearchDepartment: (dept: string) => void;
  searchDateStart: string;
  setSearchDateStart: (date: string) => void;
  searchDateEnd: string;
  setSearchDateEnd: (date: string) => void;

  // 分页状态
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  filteredData: Approval[];
  paginatedData: Approval[];

  // 展开行
  expandedRows: Set<string>;
  toggleExpandRow: (id: string) => void;

  // 详情弹窗
  detailModal: DetailModalState;
  handleViewDetail: (item: Approval) => void;
  handleCloseDetail: () => void;

  // 拒绝弹窗
  rejectModal: RejectModalState;
  setRejectReason: (reason: string) => void;
  handleRejectClick: (item: Approval) => void;
  handleConfirmReject: () => void;
  handleCancelReject: () => void;

  // 操作
  handleApprove: (item: Approval) => void;
  /** 2026-09-28：直接调用审批接口（返回 boolean，false=失败，调用方负责提示） */
  approve: (id: string, comment?: string) => Promise<boolean>;
  reject: (id: string, comment: string) => Promise<boolean>;

  // 辅助函数
  getCategoryByCode: (code: string) => string;
  getStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnType: (item: Approval) => string;
  getCurrentData: Approval[];
}
