// MaterialApproval 类型定义
// 物料审批页面的类型定义

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
  types: ApprovalType[];
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

  // 辅助函数
  getCategoryByCode: (code: string) => string;
  getStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnStatusBadge: (status: ApprovalStatus) => JSX.Element;
  getReturnType: (item: Approval) => string;
  getCurrentData: Approval[];
}
