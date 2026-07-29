/**
 * useDispatchScheduleBridge
 *
 * 派发副作用桥接器：派发成功后同步 schedules.dispatched_task_ids + 清缓存 + toast。
 * 不改 confirmDispatch 签名（保持同步 DispatchActionResult）。
 *
 * 设计要点（Batch 3）：
 * 1. 派发主流程已成功，副作用失败不应破坏主流程 → catch 静默 + toast 兜底
 * 2. 默认同步"今天"占用（本地时区 todayLocal，避免 UTC 跨天）；taskPlanDate 传入时同步"任务计划日期"占用（跨日任务）
 * 3. 不阻塞：调用方 await syncAfterDispatch(...) 仅用于日志/测试，不影响派发结果
 *
 * Batch 3 修复（2026-07-29）：
 * - C-1 CRITICAL：UTC split('T')[0] 在中国凌晨 0-8 点会算出"昨天"，导致 invalidateOccupations 清理错误日期
 *   改用 todayLocal() 统一本地时区
 * - I-1 Important：alert() 阻塞 UI 线程，改用 useToastStore（不阻塞 + 视觉更友好）
 * - L-1 LOW：body 类型 Record<string, string> 弱类型化，显式声明字段 + 可选 date
 *
 * Batch 4+5 修复（2026-07-29）：
 * - C-NEW CRITICAL：workerId 空串或 task.sourceId 缺失时，PATCH 必然 400 + 误导 toast。
 *   表格派发按钮在 draft 状态且 assigneeId 未设置时，task.assigneeId || '' 是空串
 *   → 后端 400 → toast.warning 误导用户。改为函数体开头 silent skip：
 *   无 workerId 或无 sourceId → 直接 return，不发请求、不弹 toast。
 */

import { useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';
import { todayLocal } from '../lib/dateUtils';
import { useScheduleStore } from '../stores';
import { useToastStore } from '../stores/useToastStore';

/** 派发任务来源引用 */
export interface DispatchTaskRef {
  /** 任务来源类型：farmTask 走 farmTask 逻辑、tempTask 走临时任务逻辑 */
  source: 'farm' | 'tempTask';
  /** 任务 ID（farmTask ID 或 tempTask ID） */
  sourceId: string;
}

/** 桥接器可选配置 */
export interface DispatchBridgeOptions {
  /** 任务的 plan_date，决定要同步到哪天的 schedule 行。默认 today */
  taskPlanDate?: string;
}

/**
 * 派发 → 排班占用同步桥接器
 *
 * 使用：
 *   const { syncAfterDispatch } = useDispatchScheduleBridge();
 *   // 派发成功后 fire-and-forget 调用，不阻塞主流程
 *   syncAfterDispatch({ source: 'farm', sourceId: task.id }, workerId, { taskPlanDate: task.planDate });
 */
export function useDispatchScheduleBridge() {
  const scheduleStore = useScheduleStore();

  const syncAfterDispatch = useCallback(
    async (task: DispatchTaskRef, workerId: string, options?: DispatchBridgeOptions) => {
      // ★ Silent skip：workerId 或 sourceId 为空时跳过（避免误导 toast）
      // 场景：表格派发按钮在 draft 状态且 assigneeId 未设置时，
      // task.assigneeId || '' 是空串 → 后端 400 → toast.warning 误导用户。
      // 此时同步 schedule 没有意义（没有 worker 可同步），直接 return。
      if (!workerId || !task.sourceId) {
        return;
      }
      try {
        const body: {
          workerId: string;
          taskId: string;
          action: 'add' | 'remove';
          date?: string;
        } = {
          workerId,
          taskId: task.sourceId,
          action: 'add',
        };
        if (options?.taskPlanDate) {
          body.date = options.taskPlanDate;
        }
        await enhancedApiClient.patch('/schedules/dispatch-tasks', body);
        // PATCH 成功后清理当日 + 任务计划日的占用缓存，下次 fetchOccupations 重新拉取
        // ★ Batch 3 C-1 修复：使用 todayLocal() 本地时区，避免 UTC split 在中国凌晨 0-8 点算出"昨天"
        const today = todayLocal();
        scheduleStore.invalidateOccupations(today);
        if (options?.taskPlanDate && options.taskPlanDate !== today) {
          scheduleStore.invalidateOccupations(options.taskPlanDate);
        }
      } catch (err: any) {
        // ★ 不抛错避免破坏主流程（派发已成功，仅占用同步失败）
        const message =
          err?.status >= 500
            ? '排班占用同步失败（服务器异常），请刷新日历'
            : `排班占用同步失败：${err?.message ?? '未知错误'}`;
        // ★ Batch 3 I-1 修复：用 useToastStore 替代 alert（避免阻塞 UI 线程）
        // 500+ 视为硬错误用 error 样式；其他错误视为可重试用 warning 样式
        if (err?.status >= 500) {
          useToastStore.getState().toast.error(message);
        } else {
          useToastStore.getState().toast.warning(message);
        }
      }
    },
    [scheduleStore]
  );

  return { syncAfterDispatch };
}