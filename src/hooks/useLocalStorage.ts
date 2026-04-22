/**
 * localStorage 持久化 Hook
 * 提供数据持久化存储功能
 */

import { useState, useCallback } from 'react';

// 数据版本控制 - 用于强制刷新过时的模拟数据
const DATA_VERSION = 9; // 每次修改默认数据时递增（数字类型，与 useTasks 保持一致）

interface StoredData<T> {
  version: string;
  data: T;
}

/**
 * localStorage Hook
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 从 localStorage 获取数据，或使用初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      // 检查是否是带版本控制的数据格式
      try {
        const parsed = JSON.parse(item) as StoredData<T>;
        // 使用 == 进行松散比较（parsed.version 是字符串，DATA_VERSION 是数字）
        if (parsed.version == DATA_VERSION) {
          return parsed.data;
        } else {
          // 版本不匹配，使用新初始值并清除旧数据
          console.log(`[localStorage] ${key} 数据版本过旧，已清除并使用新数据`);
          return initialValue;
        }
      } catch {
        // 旧格式数据，直接使用
        return JSON.parse(item);
      }
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
      // 使用版本控制格式保存数据
      const storedData: StoredData<T> = { version: DATA_VERSION, data: valueToStore };
      window.localStorage.setItem(key, JSON.stringify(storedData));
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
  TEMP_TASKS: 'yuanxingtu_tempTasks',
  OPERATION_RECORDS: 'yuanxingtu_operationRecords',
  DISPATCH_RECORDS: 'yuanxingtu_dispatch_records',
  MY_TASKS: 'yuanxingtu_my_tasks',
  PROBLEM_ATTACHMENTS: 'yuanxingtu_problem_attachments',
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
