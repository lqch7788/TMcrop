/**
 * 请假管理相关类型定义
 */

// 请假类型
export type LeaveType = '事假' | '病假' | '年假' | '婚假' | '产假' | '陪产假' | '丧假' | '工伤假';

// 请假状态
export type LeaveStatus = '待审批' | '已通过' | '已拒绝' | '已撤回' | '已取消';

// 请假配额
export interface LeaveQuota {
  staffId: string;
  staffName: string;
  year: number;
  // 年假
  annualLeaveTotal: number;    // 年假总额
  annualLeaveUsed: number;    // 年假已用
  annualLeaveRemaining: number; // 年假剩余
  // 病假
  sickLeaveTotal: number;      // 病假总额
  sickLeaveUsed: number;       // 病假已用
  sickLeaveRemaining: number;  // 病假剩余
  // 其他假
  otherLeaveTotal: number;     // 其他假总额
  otherLeaveUsed: number;      // 其他假已用
  otherLeaveRemaining: number; // 其他假剩余
}

// 请假记录
export interface LeaveRecord {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

// 筛选条件
export interface LeaveFilters {
  staffName: string;
  leaveType: LeaveType | '';
  status: LeaveStatus | '';
  startDate: string;
  endDate: string;
}

// 分页信息
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
}

// 组件 Props
export interface LeaveFiltersProps {
  filters: LeaveFilters;
  onFiltersChange: (filters: LeaveFilters) => void;
  onSearch: () => void;
  onAdd: () => void;
}

export interface LeaveTableProps {
  data: LeaveRecord[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (record: LeaveRecord) => void;
  onApprove: (record: LeaveRecord) => void;
  onReject: (record: LeaveRecord) => void;
}

export interface LeaveDetailModalProps {
  record: LeaveRecord | null;
  open: boolean;
  onClose: () => void;
  onApprove: (record: LeaveRecord) => void;
  onReject: (record: LeaveRecord) => void;
}

export interface LeaveFormModalProps {
  record?: LeaveRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<LeaveRecord>) => void;
}

export interface UseLeaveReturn {
  data: LeaveRecord[];
  filters: LeaveFilters;
  pagination: PaginationInfo;
  setFilters: (filters: LeaveFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  selectedRecord: LeaveRecord | null;
  setSelectedRecord: (record: LeaveRecord | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  handleSave: (data: Partial<LeaveRecord>) => void;
  handleApprove: (record: LeaveRecord) => void;
  handleReject: (record: LeaveRecord) => void;
  handleCancel: (record: LeaveRecord) => void;
}
