/**
 * 考勤补录管理 Query Hooks
 * 使用 React Query 管理考勤补录数据的获取和缓存
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as attendanceRepairService from '../services/apiAttendanceRepairService';
import type {
  AttendanceRepairRecord,
  CreateAttendanceRepairParams,
  UpdateAttendanceRepairParams,
} from '../services/apiAttendanceRepairService';

// ==================== 考勤补录记录查询 ====================

/**
 * 获取考勤补录记录列表
 */
export function useAttendanceRepairRecords(
  filters?: {
    employeeName?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  },
  pagination?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['attendance-repair', 'records', filters, pagination],
    queryFn: () => attendanceRepairService.getAttendanceRepairRecords(filters, pagination),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个考勤补录记录
 */
export function useAttendanceRepairRecord(id: string) {
  return useQuery<AttendanceRepairRecord | null>({
    queryKey: ['attendance-repair', 'record', id],
    queryFn: () => attendanceRepairService.getAttendanceRepairById(id),
    enabled: !!id,
  });
}

// ==================== 考勤补录记录 Mutations ====================

/**
 * 创建考勤补录记录
 */
export function useCreateAttendanceRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repair: CreateAttendanceRepairParams) =>
      attendanceRepairService.createAttendanceRepairRecord(repair),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-repair'] });
    },
  });
}

/**
 * 更新考勤补录记录
 */
export function useUpdateAttendanceRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateAttendanceRepairParams }) =>
      attendanceRepairService.updateAttendanceRepairRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-repair'] });
    },
  });
}

/**
 * 删除考勤补录记录
 */
export function useDeleteAttendanceRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceRepairService.deleteAttendanceRepairRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-repair'] });
    },
  });
}
