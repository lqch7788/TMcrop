/**
 * 催办管理 Hook
 * 功能：管理催办记录、催办间隔限制、每日催办次数限制
 * 2026-10-10 修复（农事任务中心卡死根因之一）：
 *   原实现挂载时读写 localStorage（farm_task_reminders），每次挂载都可能向其它标签页
 *   广播 storage 事件——多标签页场景下成为渲染风暴的触发源之一。
 *   按 V2.1 铁律改为纯内存：催办记录仅存于 useReminderStore（API 同步），不再读写 localStorage。
 */

import { useState, useCallback, useEffect } from 'react';
import { REMINDER_CONFIG } from '../config/taskConfig';
import type { ReminderRecord } from '../types/task';
// 2026-06-04 V2.1 铁律改造：useReminderStore 同步双写（API → SQLite）
import { useReminderStore } from '../stores/useReminderStore';

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface UseReminderReturn {
  // 催办记录列表
  reminderRecords: ReminderRecord[];

  // 检查是否可以催办
  canRemind: (taskId: string) => { allowed: boolean; reason?: string };

  // 执行催办
  sendReminder: (taskId: string, taskCode: string, remindedTo: string, remindedToName: string, remindedBy: string, remindedByName: string, message?: string) => boolean;

  // 获取任务的所有催办记录
  getRemindersByTaskId: (taskId: string) => ReminderRecord[];

  // 获取任务今天的催办次数
  getTodayReminderCount: (taskId: string) => number;

  // 检查是否在催办冷却期内
  isInCooldown: (taskId: string) => boolean;

  // 获取距离下次可催办的时间（秒）
  getCooldownRemaining: (taskId: string) => number;
}

export function useReminder(): UseReminderReturn {
  // 2026-10-10：纯内存状态（V2.1 铁律：禁 localStorage）
  const [reminderRecords, setReminderRecords] = useState<ReminderRecord[]>([]);

  /**
   * 检查任务是否可以催办
   */
  const canRemind = useCallback((taskId: string): { allowed: boolean; reason?: string } => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 获取该任务今天的催办记录
    const todayRecords = reminderRecords.filter(
      r => r.taskId === taskId && r.remindedAt.startsWith(todayStr)
    );

    // 检查每日催办次数限制
    if (todayRecords.length >= REMINDER_CONFIG.maxRemindersPerDay) {
      return {
        allowed: false,
        reason: `今日催办次数已达上限（${REMINDER_CONFIG.maxRemindersPerDay}次/天）`
      };
    }

    // 检查催办间隔限制
    const lastReminder = todayRecords
      .sort((a, b) => new Date(b.remindedAt).getTime() - new Date(a.remindedAt).getTime())[0];

    if (lastReminder) {
      const lastTime = new Date(lastReminder.remindedAt).getTime();
      const cooldownMs = REMINDER_CONFIG.minIntervalMinutes * 60 * 1000;
      if (now.getTime() - lastTime < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - (now.getTime() - lastTime)) / 60000);
        return {
          allowed: false,
          reason: `催办间隔需大于${REMINDER_CONFIG.minIntervalMinutes}分钟，请${remainingMinutes}分钟后再试`
        };
      }
    }

    return { allowed: true };
  }, [reminderRecords]);

  /**
   * 执行催办
   */
  const sendReminder = useCallback((
    taskId: string,
    taskCode: string,
    remindedTo: string,
    remindedToName: string,
    remindedBy: string,
    remindedByName: string,
    message?: string
  ): boolean => {
    const check = canRemind(taskId);
    if (!check.allowed) {
      return false;
    }

    const newRecord: ReminderRecord = {
      id: generateId(),
      taskId,
      taskCode,
      remindedBy,
      remindedByName,
      remindedTo,
      remindedToName,
      remindType: 'manual',
      message,
      remindedAt: new Date().toISOString(),
    };

    const updatedRecords = [...reminderRecords, newRecord];
    // 2026-10-10：不再写 localStorage（跨标签页 storage 事件会触发其它标签页整体重渲染）
    setReminderRecords(updatedRecords);

    // 2026-06-04 V2.1 铁律改造：双写 Store（异步，失败不影响主流程）
    void useReminderStore.getState().sendReminder({
      id: newRecord.id,
      taskId: newRecord.taskId,
      taskCode: newRecord.taskCode,
      operatorId: newRecord.remindedBy,
      operatorName: newRecord.remindedByName,
      message: newRecord.message,
      createTime: newRecord.remindedAt,
    } as any);

    return true;
  }, [reminderRecords, canRemind]);

  /**
   * 获取任务的所有催办记录
   */
  const getRemindersByTaskId = useCallback((taskId: string): ReminderRecord[] => {
    return reminderRecords
      .filter(r => r.taskId === taskId)
      .sort((a, b) => new Date(b.remindedAt).getTime() - new Date(a.remindedAt).getTime());
  }, [reminderRecords]);

  /**
   * 获取任务今天的催办次数
   */
  const getTodayReminderCount = useCallback((taskId: string): number => {
    const todayStr = new Date().toISOString().split('T')[0];
    return reminderRecords.filter(r => r.taskId === taskId && r.remindedAt.startsWith(todayStr)).length;
  }, [reminderRecords]);

  /**
   * 检查是否在催办冷却期内
   */
  const isInCooldown = useCallback((taskId: string): boolean => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayRecords = reminderRecords.filter(
      r => r.taskId === taskId && r.remindedAt.startsWith(todayStr)
    );

    if (todayRecords.length === 0) return false;

    const lastReminder = todayRecords
      .sort((a, b) => new Date(b.remindedAt).getTime() - new Date(a.remindedAt).getTime())[0];

    if (!lastReminder) return false;

    const cooldownMs = REMINDER_CONFIG.minIntervalMinutes * 60 * 1000;
    return now.getTime() - new Date(lastReminder.remindedAt).getTime() < cooldownMs;
  }, [reminderRecords]);

  /**
   * 获取距离下次可催办的时间（秒）
   */
  const getCooldownRemaining = useCallback((taskId: string): number => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayRecords = reminderRecords.filter(
      r => r.taskId === taskId && r.remindedAt.startsWith(todayStr)
    );

    if (todayRecords.length === 0) return 0;

    const lastReminder = todayRecords
      .sort((a, b) => new Date(b.remindedAt).getTime() - new Date(a.remindedAt).getTime())[0];

    if (!lastReminder) return 0;

    const cooldownMs = REMINDER_CONFIG.minIntervalMinutes * 60 * 1000;
    const elapsed = now.getTime() - new Date(lastReminder.remindedAt).getTime();
    const remaining = cooldownMs - elapsed;

    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }, [reminderRecords]);

  return {
    reminderRecords,
    canRemind,
    sendReminder,
    getRemindersByTaskId,
    getTodayReminderCount,
    isInCooldown,
    getCooldownRemaining,
  };
}
