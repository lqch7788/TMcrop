/**
 * 工作日志相关类型定义
 */

// 工作日志数据
export interface WorkLog {
  id: number;
  code: string;
  date: string;
  worker: string;
  weather: string;
  temperature: string;
  crop: string;
  greenhouse: string;
  growthStatus: '良好' | '一般';
  tasks: string;
  problems: string;
  solutions: string;
}

// 筛选条件
export interface WorkLogFilters {
  date: string;
  worker: string;
  greenhouse: string;
}

// 分页信息
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
}

// 组件 Props
export interface WorkLogFiltersProps {
  filters: WorkLogFilters;
  onFiltersChange: (filters: WorkLogFilters) => void;
  onSearch: () => void;
  onAdd: () => void;
}

export interface WorkLogTableProps {
  data: WorkLog[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (log: WorkLog) => void;
}

export interface WorkLogDetailModalProps {
  log: WorkLog | null;
  open: boolean;
  onClose: () => void;
}

export interface WorkLogFormModalProps {
  log?: WorkLog | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<WorkLog>) => void;
}

export interface UseWorkLogReturn {
  data: WorkLog[];
  filters: WorkLogFilters;
  pagination: PaginationInfo;
  setFilters: (filters: WorkLogFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  selectedLog: WorkLog | null;
  setSelectedLog: (log: WorkLog | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  handleSave: (data: Partial<WorkLog>) => void;
}
