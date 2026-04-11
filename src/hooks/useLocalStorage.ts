/**
 * localStorage 持久化 Hook
 * 提供数据持久化存储功能
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * localStorage Hook
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 从 localStorage 获取数据，或使用初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 更新 localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // 删除数据（恢复初始值）
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // 清空所有数据
  const clearAll = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue, clearAll] as const;
}

/**
 * 存储键名常量
 */
export const STORAGE_KEYS = {
  WORK_LOGS: 'yuanxingtu_worklogs',
  INSPECTION_RECORDS: 'yuanxingtu_inspections',
  ATTENDANCE: 'yuanxingtu_attendance',
  DAILY_PROBLEMS: 'yuanxingtu_daily_problems',
  TASKS: 'yuanxingtu_tasks',
  DISPATCH_RECORDS: 'yuanxingtu_dispatch_records',
} as const;

/**
 * 检查是否有持久化数据
 */
export function hasPersistedData(): boolean {
  return Object.values(STORAGE_KEYS).some(key => {
    try {
      return window.localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });
}

/**
 * 清空所有持久化数据
 */
export function clearAllPersistedData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error clearing ${key}:`, error);
    }
  });
}
