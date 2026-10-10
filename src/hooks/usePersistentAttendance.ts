/**
 * 考勤持久化 Hook
 * 2026-10-10 修复（农事任务中心卡死根因之一）：
 *   原实现用 useLocalStorage（localStorage 读写 + storage 跨标签页事件监听）。
 *   该监听器会让"任意标签页写一次 localStorage → 所有开着任务中心的标签页整体重渲染"，
 *   多标签页（或多实例）场景下互相触发形成渲染风暴 → 页面卡死 30~60 秒。
 *   按 V2.1 铁律改为纯内存 useState：数据源为 API/Store，刷新即重置，不再读写 localStorage。
 */

import { useState, useCallback } from 'react';

// 考勤记录类型
export interface AttendanceEntry {
  id: number;
  workerId: string;
  name: string;
  dept: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: string;
  statusClass: string;
  taskId?: string;
  batchId?: string;
}

// 初始 mock 考勤数据
const INITIAL_ATTENDANCE: AttendanceEntry[] = [
  { id: 1, workerId: 'W001', name: '郭靖', dept: '生产部', date: '2024-03-14', checkIn: '07:50', checkOut: '18:10', hours: 10, status: '正常', statusClass: 'normal', taskId: 'T001', batchId: 'B001' },
  { id: 2, workerId: 'W002', name: '杨过', dept: '生产部', date: '2024-03-14', checkIn: '08:00', checkOut: '18:00', hours: 10, status: '正常', statusClass: 'normal', taskId: 'T002', batchId: 'B002' },
  { id: 3, workerId: 'W003', name: '张无忌', dept: '生产部', date: '2024-03-14', checkIn: '07:45', checkOut: '17:50', hours: 10, status: '正常', statusClass: 'normal', taskId: 'T003', batchId: 'B003' },
  { id: 4, workerId: 'W004', name: '令狐冲', dept: '技术部', date: '2024-03-13', checkIn: '08:10', checkOut: '18:00', hours: 9.5, status: '迟到', statusClass: 'warning', taskId: 'T004', batchId: 'B004' },
  { id: 5, workerId: 'W005', name: '段誉', dept: '生产部', date: '2024-03-13', checkIn: '-', checkOut: '-', hours: 0, status: '请假', statusClass: 'draft', taskId: undefined, batchId: 'B005' },
  { id: 6, workerId: 'W006', name: '黄蓉', dept: '仓储部', date: '2024-03-12', checkIn: '08:05', checkOut: '17:55', hours: 9.8, status: '正常', statusClass: 'normal', taskId: 'T004', batchId: 'B004' },
  { id: 7, workerId: 'W007', name: '陈家洛', dept: '生产部', date: '2024-03-12', checkIn: '07:30', checkOut: '18:30', hours: 11, status: '加班', statusClass: 'info', taskId: 'T006', batchId: 'B007' },
  { id: 8, workerId: 'W008', name: '任盈盈', dept: '生产部', date: '2024-03-11', checkIn: '08:20', checkOut: '18:00', hours: 9.7, status: '早退', statusClass: 'warning', taskId: 'T001', batchId: 'B001' },
];

let nextAttendanceId = INITIAL_ATTENDANCE.length + 1;

/**
 * 考勤持久化 Hook
 */
export function usePersistentAttendance() {
  // 2026-10-10：纯内存状态（V2.1 铁律：禁 localStorage）
  const [attendance, setAttendance] = useState<AttendanceEntry[]>(INITIAL_ATTENDANCE);

  // 添加考勤记录
  const addAttendance = useCallback((entry: Omit<AttendanceEntry, 'id'>) => {
    const newEntry: AttendanceEntry = {
      ...entry,
      id: nextAttendanceId++,
    };
    setAttendance(prev => [newEntry, ...prev]);
    return newEntry;
  }, []);

  // 更新考勤记录
  const updateAttendance = useCallback((id: number, updates: Partial<AttendanceEntry>) => {
    setAttendance(prev => prev.map(record => record.id === id ? { ...record, ...updates } : record));
  }, []);

  // 删除考勤记录
  const deleteAttendance = useCallback((id: number) => {
    setAttendance(prev => prev.filter(record => record.id !== id));
  }, []);

  // 重置为初始数据
  const resetToInitial = useCallback(() => {
    setAttendance(INITIAL_ATTENDANCE);
    nextAttendanceId = INITIAL_ATTENDANCE.length + 1;
  }, []);

  return {
    attendance,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    resetToInitial,
    resetAttendance: resetToInitial, // 别名
  };
}

export { INITIAL_ATTENDANCE };
