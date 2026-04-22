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
  // 【新增】关联字段（可选，保持向后兼容）
  taskId?: string;           // 关联任务ID
  batchId?: string;         // 关联批次ID
  batchCode?: string;        // 批次编号（冗余便于显示）
  // 【新增】任务相关信息
  taskCode?: string;        // 任务编号（如 RW-20260422-001）
  taskType?: string;        // 任务类型（spraying、irrigation等）
  taskTypeName?: string;    // 任务类型名称（施肥、灌溉等）
  progress?: number;         // 提交时的进度
  workloadHours?: number;    // 工作量（小时）
  workloadDays?: number;    // 工作量（天）
  workers?: number;          // 作业人数
  submitTime?: string;       // 提交时间
  feedbackText?: string;     // 反馈/备注内容
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
