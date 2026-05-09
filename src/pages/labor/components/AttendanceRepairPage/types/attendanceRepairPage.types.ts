/**
 * 考勤补录页面类型定义
 */

/** 补录原因选项 */
export const REPAIR_REASON_OPTIONS = [
  { value: '忘记打卡', label: '忘记打卡' },
  { value: '外出办公', label: '外出办公' },
  { value: '出差', label: '出差' },
  { value: '其他', label: '其他' },
];

/** 状态筛选选项 */
export const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
];

/** 考勤补录记录类型 */
export interface AttendanceRepairRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  status: '待审批' | '已通过' | '已拒绝' | '已取消';
  approver?: string;
  approveTime?: string;
  remarks?: string;
}

/** 考勤补录筛选条件类型 */
export interface AttendanceRepairFilters {
  employeeName: string;
  department: string;
  reason: string;
  status: string;
  startDate: string;
  endDate: string;
}

/** 表单数据类型 */
export interface AttendanceRepairFormData {
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  customReason: string;
  remarks: string;
}

/** 批量操作模式 */
export type BatchMode = 'none' | 'approve' | 'reject' | 'export';

/** 分页状态类型 */
export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}
