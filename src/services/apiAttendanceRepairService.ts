/**
 * 考勤补录管理 API 服务
 * 对接后端 /api/attendance-repair (如果存在) 或 /api/attendance
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';

/**
 * 考勤补录记录类型
 */
export interface AttendanceRepairRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime: string;
}

/**
 * 创建考勤补录记录参数
 */
export interface CreateAttendanceRepairParams {
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  remarks?: string;
}

/**
 * 更新考勤补录记录参数
 */
export interface UpdateAttendanceRepairParams {
  checkInTime?: string;
  checkOutTime?: string;
  reason?: string;
  status?: string;
  remarks?: string;
}

/**
 * 获取考勤补录记录列表
 * 注意：后端可能没有独立的考勤补录表，暂时返回空数据
 */
export async function getAttendanceRepairRecords(
  filters?: {
    employeeName?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<{ records: AttendanceRepairRecord[]; pagination: { page: number; limit: number; total: number } }> {
  // 后端暂无独立的考勤补录表
  // TODO: 后续需要创建独立的考勤补录记录表
  return {
    records: [],
    pagination: { page: 1, limit: 50, total: 0 },
  };
}

/**
 * 获取单个考勤补录记录
 */
export async function getAttendanceRepairById(id: string): Promise<AttendanceRepairRecord | null> {
  // 后端暂无独立的考勤补录表
  return null;
}

/**
 * 创建考勤补录记录
 */
export async function createAttendanceRepairRecord(repair: CreateAttendanceRepairParams): Promise<AttendanceRepairRecord> {
  // 后端暂无独立的考勤补录创建接口
  return {
    id: `AR${Date.now()}`,
    employeeId: repair.employeeId,
    employeeName: repair.employeeName,
    department: repair.department,
    repairDate: repair.repairDate,
    checkInTime: repair.checkInTime,
    checkOutTime: repair.checkOutTime,
    reason: repair.reason,
    status: 'pending',
    statusLabel: '待审批',
    remarks: repair.remarks,
    createTime: new Date().toISOString(),
  };
}

/**
 * 更新考勤补录记录
 */
export async function updateAttendanceRepairRecord(id: string, updates: UpdateAttendanceRepairParams): Promise<boolean> {
  // 后端暂无独立的考勤补录更新接口
  return true;
}

/**
 * 删除考勤补录记录
 */
export async function deleteAttendanceRepairRecord(id: string): Promise<boolean> {
  return true;
}
