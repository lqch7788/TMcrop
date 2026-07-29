import { useEffect, useMemo } from 'react';
import { useScheduleStore, getWeekDateRange, getMonthDateRange } from '@/stores';
import type { ScheduleRecord, ShiftType, SwapRequest } from '../types';

export interface UseScheduleProps {
  initialDate?: string;
}

// ★ 修复（B4 导航卡死死循环）：原整对象订阅 scheduleStore,
  //   改为 selector 单独订阅各字段（action 引用稳定，data 字段才触发重渲染）。
export function useSchedule({ initialDate }: UseScheduleProps = {}) {
  // 数据字段（selector 订阅）
  const schedules = useScheduleStore((s) => s.schedules);
  const shiftConfigs = useScheduleStore((s) => s.shiftConfigs);
  const staffList = useScheduleStore((s) => s.staffList);
  const swapRequests = useScheduleStore((s) => s.swapRequests);
  const selectedDate = useScheduleStore((s) => s.selectedDate);
  const viewMode = useScheduleStore((s) => s.viewMode);

  // Action 字段（引用稳定）
  const fetchSchedules = useScheduleStore((s) => s.fetchSchedules);
  const setSelectedDate = useScheduleStore((s) => s.setSelectedDate);
  const setViewMode = useScheduleStore((s) => s.setViewMode);
  const addScheduleAction = useScheduleStore((s) => s.addSchedule);
  const updateSchedule = useScheduleStore((s) => s.updateSchedule);
  const cancelSchedule = useScheduleStore((s) => s.cancelSchedule);
  const deleteSchedule = useScheduleStore((s) => s.deleteSchedule);
  const batchUpdateSchedule = useScheduleStore((s) => s.batchUpdateSchedule);
  const updateShiftConfig = useScheduleStore((s) => s.updateShiftConfig);
  const submitSwapRequestAction = useScheduleStore((s) => s.submitSwapRequest);
  const handleSwapRequest = useScheduleStore((s) => s.handleSwapRequest);

  // 组件挂载时初始化数据
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // 同步初始日期
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate, setSelectedDate]);

  // 获取指定日期的排班
  const getScheduleByDate = (date: string) => {
    return schedules.filter(record => record.date === date);
  };

  // 获取指定员工指定日期的排班
  const getScheduleByStaffAndDate = (staffId: string, date: string) => {
    return schedules.find(record => record.staffId === staffId && record.date === date);
  };

  // 添加排班（同步封装，hook层保持同步API）
  const addSchedule = (record: Omit<ScheduleRecord, 'id'>) => {
    const newRecord: ScheduleRecord = {
      ...record,
      id: `SCH-${record.date.replace(/-/g, '')}-${record.staffId}-${Date.now()}`,
    };
    addScheduleAction(newRecord);
    return newRecord;
  };

  // 取消排班
  const cancelScheduleById = (id: string) => {
    cancelSchedule(id);
  };

  // 删除排班
  const deleteScheduleById = (id: string) => {
    deleteSchedule(id);
  };

  // 提交调班申请（同步封装）
  const submitSwapRequest = (request: Omit<SwapRequest, 'id' | 'status' | 'createTime'>) => {
    submitSwapRequestAction(request);
  };

  // 获取周视图日期范围（保留useMemo优化）
  const weekDateRange = useMemo(() => getWeekDateRange(selectedDate), [selectedDate]);

  // 获取月视图日期范围（保留useMemo优化）
  const monthDateRange = useMemo(() => getMonthDateRange(selectedDate), [selectedDate]);

  return {
    // 数据（从Store读取）
    scheduleList: schedules,
    shiftConfigs,
    staffList,
    swapRequests,
    // 视图
    selectedDate,
    viewMode,
    weekDateRange,
    monthDateRange,
    // 设置
    setSelectedDate,
    setViewMode,
    // 查询
    getScheduleByDate,
    getScheduleByStaffAndDate,
    // 操作（保留hook层同步封装，实际调用Store异步方法）
    addSchedule,
    updateSchedule,
    cancelSchedule: cancelScheduleById,
    deleteSchedule: deleteScheduleById,
    batchUpdateSchedule,
    updateShiftConfig,
    submitSwapRequest,
    handleSwapRequest,
  };
}

export type UseScheduleReturn = ReturnType<typeof useSchedule>;
