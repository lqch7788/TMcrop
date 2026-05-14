import { useEffect, useMemo } from 'react';
import { useScheduleStore, getWeekDateRange, getMonthDateRange } from '@/stores';
import type { ScheduleRecord, ShiftType, SwapRequest } from '../types';

export interface UseScheduleProps {
  initialDate?: string;
}

export function useSchedule({ initialDate }: UseScheduleProps = {}) {
  const store = useScheduleStore();

  // 组件挂载时初始化数据
  useEffect(() => {
    store.fetchSchedules();
  }, []);

  // 同步初始日期
  useEffect(() => {
    if (initialDate) {
      store.setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // 获取指定日期的排班
  const getScheduleByDate = (date: string) => {
    return store.schedules.filter(record => record.date === date);
  };

  // 获取指定员工指定日期的排班
  const getScheduleByStaffAndDate = (staffId: string, date: string) => {
    return store.schedules.find(record => record.staffId === staffId && record.date === date);
  };

  // 添加排班（同步封装，hook层保持同步API）
  const addSchedule = (record: Omit<ScheduleRecord, 'id'>) => {
    const newRecord: ScheduleRecord = {
      ...record,
      id: `SCH-${record.date.replace(/-/g, '')}-${record.staffId}-${Date.now()}`,
    };
    store.addSchedule(newRecord);
    return newRecord;
  };

  // 取消排班
  const cancelSchedule = (id: string) => {
    store.cancelSchedule(id);
  };

  // 删除排班
  const deleteSchedule = (id: string) => {
    store.deleteSchedule(id);
  };

  // 提交调班申请（同步封装）
  const submitSwapRequest = (request: Omit<SwapRequest, 'id' | 'status' | 'createTime'>) => {
    store.submitSwapRequest(request);
  };

  // 获取周视图日期范围（保留useMemo优化）
  const weekDateRange = useMemo(() => getWeekDateRange(store.selectedDate), [store.selectedDate]);

  // 获取月视图日期范围（保留useMemo优化）
  const monthDateRange = useMemo(() => getMonthDateRange(store.selectedDate), [store.selectedDate]);

  return {
    // 数据（从Store读取）
    scheduleList: store.schedules,
    shiftConfigs: store.shiftConfigs,
    staffList: store.staffList,
    swapRequests: store.swapRequests,
    // 视图
    selectedDate: store.selectedDate,
    viewMode: store.viewMode,
    weekDateRange,
    monthDateRange,
    // 设置
    setSelectedDate: store.setSelectedDate,
    setViewMode: store.setViewMode,
    // 查询
    getScheduleByDate,
    getScheduleByStaffAndDate,
    // 操作（保留hook层同步封装，实际调用Store异步方法）
    addSchedule,
    updateSchedule: store.updateSchedule,
    cancelSchedule,
    deleteSchedule,
    batchUpdateSchedule: store.batchUpdateSchedule,
    updateShiftConfig: store.updateShiftConfig,
    submitSwapRequest,
    handleSwapRequest: store.handleSwapRequest,
  };
}

export type UseScheduleReturn = ReturnType<typeof useSchedule>;
