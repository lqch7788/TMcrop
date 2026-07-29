/**
 * useDispatchOccupations
 *
 * 包装 scheduleStore.fetchOccupations，提供当日 occupations 数据 + refetch。
 *
 * 设计要点（Batch 3）：
 * 1. 直接派生自 scheduleStore：单一数据源，避免重复缓存
 * 2. useEffect 在 date 变化时自动触发 fetchOccupations
 * 3. refetch 暴露给调用方做手动刷新
 */

import { useEffect } from 'react';
import { useScheduleStore } from '../stores';

/**
 * 获取指定日期的排班占用数据
 *
 * @param date YYYY-MM-DD 格式日期
 * @returns occupations 当日占用列表 + loading + error + refetch
 */
export function useDispatchOccupations(date: string) {
  const occupations = useScheduleStore((s) => s.occupations[date] ?? []);
  const loading = useScheduleStore((s) => s.occupationsLoading);
  const error = useScheduleStore((s) => s.occupationsError);
  const fetchOccupations = useScheduleStore((s) => s.fetchOccupations);

  useEffect(() => {
    fetchOccupations(date);
  }, [date, fetchOccupations]);

  return {
    occupations,
    loading,
    error,
    refetch: () => fetchOccupations(date),
  };
}