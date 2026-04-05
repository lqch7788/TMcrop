// 计件工资类型定义

/**
 * 计件工资记录
 */
export interface PieceRate {
  id: string;
  workerId: string;
  workerName: string;
  taskId: string;
  taskName: string;
  unit: string;           // 单位：斤、箱、个等
  quantity: number;      // 数量
  unitPrice: number;     // 单价
  total: number;         // 总工资 = quantity * unitPrice
  workDate: string;      // 工作日期
  status: '待确认' | '已确认' | '已发放';
  creatorId: string;
  creatorName: string;
  createTime: string;
  remarks?: string;
}

/**
 * 计件工资筛选条件
 */
export interface PieceworkFilters {
  workerName?: string;
  taskName?: string;
  startDate?: string;
  endDate?: string;
  status?: PieceRate['status'];
}

/**
 * 计件工资分页
 */
export interface PieceworkPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

/**
 * 计件工资表单数据
 */
export interface PieceworkFormData {
  workerId: string;
  taskId: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  workDate: string;
  remarks?: string;
}

/**
 * 计件工资统计
 */
export interface PieceworkStats {
  totalWorkers: number;
  totalQuantity: number;
  totalAmount: number;
  avgAmountPerWorker: number;
}
