/**
 * 加班管理相关类型定义
 */

// 加班类型
export type OvertimeType = '普通加班' | '周末加班' | '节假日加班';

// 加班状态
export type OvertimeStatus = '待审批' | '已审批' | '已驳回' | '已取消';

// 加班记录
export interface OvertimeRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  hours: number;
  type: OvertimeType;
  reason: string;
  status: OvertimeStatus;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  // 计算字段
  hourlyRate?: number;
  totalPay?: number;
}

// 加班筛选条件
export interface OvertimeFilters {
  staffName: string;
  type: OvertimeType | '';
  status: OvertimeStatus | '';
  startDate: string;
  endDate: string;
}

// 分页信息
export interface OvertimePaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
}

// 加班申请表单数据
export interface OvertimeFormData {
  staffId: string;
  staffName: string;
  date: string;
  hours: number;
  type: OvertimeType;
  reason: string;
}

// Props 接口
export interface OvertimeFiltersProps {
  filters: OvertimeFilters;
  onFiltersChange: (filters: OvertimeFilters) => void;
  onSearch: () => void;
  onAdd: () => void;
}

export interface OvertimeTableProps {
  data: OvertimeRecord[];
  pagination: OvertimePaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (record: OvertimeRecord) => void;
  onApprove: (record: OvertimeRecord) => void;
  onReject: (record: OvertimeRecord) => void;
}

export interface OvertimeDetailModalProps {
  record: OvertimeRecord | null;
  open: boolean;
  onClose: () => void;
  onApprove: (record: OvertimeRecord) => void;
  onReject: (record: OvertimeRecord) => void;
}

export interface OvertimeFormModalProps {
  record?: OvertimeRecord | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: OvertimeFormData) => void;
}

// Hook 返回类型
export interface UseOvertimeReturn {
  data: OvertimeRecord[];
  filters: OvertimeFilters;
  pagination: OvertimePaginationInfo;
  setFilters: (filters: OvertimeFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  selectedRecord: OvertimeRecord | null;
  setSelectedRecord: (record: OvertimeRecord | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  handleSave: (data: OvertimeFormData) => void;
  handleApprove: (record: OvertimeRecord) => void;
  handleReject: (record: OvertimeRecord) => void;
  handleCancel: (record: OvertimeRecord) => void;
}
