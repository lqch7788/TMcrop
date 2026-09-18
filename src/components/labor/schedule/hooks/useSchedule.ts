import { useEffect, useMemo } from 'react';
import { useScheduleStore, getWeekDateRange, getMonthDateRange } from '@/stores';

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
  // 2026-09-18 修复 C-8：暴露 error 给页面展示（此前页面完全不渲染错误）
  const error = useScheduleStore((s) => s.error);
  const isLoading = useScheduleStore((s) => s.isLoading);

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
  // 2026-09-15：拉取历史调班申请（修复刷新后数据丢失）
  const fetchSwapRequests = useScheduleStore((s) => s.fetchSwapRequests);

  // 组件挂载时初始化数据
  // 2026-09-18 修复 C-8：此前 `.catch(() => {})` 完全吞掉 Promise rejection，
  // 而 SchedulePage 从不渲染 store.error → 后端 500/网络断/401 时用户只看到空表格
  // 却无任何提示（静默失败）。现改为把错误写进 store.error，页面顶部横幅展示。
  useEffect(() => {
    // 两个请求并发（互不依赖），失败时各自写 store.error（store 内部已 set）
    void fetchSchedules().catch((err) => {
      console.error('[useSchedule] 排班数据加载失败:', err);
    });
    void fetchSwapRequests().catch((err) => {
      console.error('[useSchedule] 调班申请加载失败:', err);
    });
  }, [fetchSchedules, fetchSwapRequests]);

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

  // 添加排班（透传 store action：id 由 store 内部生成临时 id，API 成功后替换为真实 id）
  // ★ 修复（审核 P1-7）：原 hook 层生成 SCH-xxx 假 id 再传给 store，属无效口径，已移除
  const addSchedule = addScheduleAction;

  // 取消排班（透传 store action，保留原命名）
  const cancelScheduleById = cancelSchedule;

  // 删除排班（透传 store action，保留原命名）
  const deleteScheduleById = deleteSchedule;

  // 提交调班申请（透传 store action，错误由调用方 catch）
  const submitSwapRequest = submitSwapRequestAction;

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
    error,
    isLoading,
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
    fetchSwapRequests,
  };
}

export type UseScheduleReturn = ReturnType<typeof useSchedule>;
