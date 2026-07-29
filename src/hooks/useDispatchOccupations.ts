/**
 * useDispatchOccupations
 *
 * 包装 scheduleStore.fetchOccupations，提供当日 occupations 数据 + refetch。
 *
 * 设计要点（Batch 3）：
 * 1. 直接派生自 scheduleStore：单一数据源，避免重复缓存
 * 2. useEffect 在 date 变化时自动触发 fetchOccupations
 * 3. refetch 暴露给调用方做手动刷新（useCallback 稳定引用，避免子组件 useEffect 依赖抖动）
 *
 * Batch 3 修复（2026-07-29）：
 * - L-2 LOW：refetch 用 useCallback 稳定引用，依赖 [date, fetchOccupations]
 */

import { useEffect, useCallback } from 'react';
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

  // ★ Batch 3 L-2 修复：useCallback 稳定 refetch 引用
  const refetch = useCallback(() => fetchOccupations(date), [date, fetchOccupations]);

  return {
    occupations,
    loading,
    error,
    refetch,
  };
}