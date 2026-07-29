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

/** 模块级稳定空数组引用：避免 selector 返回新引用触发死循环 */
const EMPTY_ARRAY: ReadonlyArray<never> = Object.freeze([]) as ReadonlyArray<never>;

/**
 * 获取指定日期的排班占用数据
 *
 * @param date YYYY-MM-DD 格式日期
 * @returns occupations 当日占用列表 + loading + error + refetch
 */
export function useDispatchOccupations(date: string) {
  // ★ 修复 ScheduleCalendar 死循环（React Maximum update depth）：
  //   原代码 `s.occupations[date] ?? []` 在 store 未命中时每次返回**新的空数组**，
  //   导致 selector 永远返回新引用 → zustand useSyncExternalStore 触发 forceStoreRerender
  //   → ScheduleCalendar re-render → 再次返回新 `[]` → 死循环。
  //   第二次尝试 `s.occupations` 整字段引用：fetchOccupations 内 set 用 spread `{...state.occupations, [date]: workers}`
  //   每次都创建新对象引用 → 仍然触发 forceStoreRerender → 同样死循环。
  //   最终修复：selector 直接返回 `s.occupations[date]`（引用稳定的数组元素本身，
  //   fetchOccupations 完成时该 date 元素引用变化才触发 update；中间过程不触发）。
  const occupations = useScheduleStore((s) => s.occupations[date]);
  const loading = useScheduleStore((s) => s.occupationsLoading);
  const error = useScheduleStore((s) => s.occupationsError);
  const fetchOccupations = useScheduleStore((s) => s.fetchOccupations);

  useEffect(() => {
    fetchOccupations(date);
  }, [date, fetchOccupations]);

  // ★ Batch 3 L-2 修复：useCallback 稳定 refetch 引用
  const refetch = useCallback(() => fetchOccupations(date), [date, fetchOccupations]);

  return {
    // 兜底 EMPTY_ARRAY 保证调用方 .find() 不报错
    occupations: occupations ?? EMPTY_ARRAY,
    loading,
    error,
    refetch,
  };
}