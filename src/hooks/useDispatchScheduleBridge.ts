/**
 * useDispatchScheduleBridge
 *
 * 派发副作用桥接器：
 *   - syncAfterDispatch：派发成功后同步 schedules.dispatched_task_ids + 清缓存 + toast。
 *   - confirmDispatchWithSoftWarn：派发前占用检查 + 软警告 Modal + override 日志 + 主流程。
 *
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
 *
 * Batch 6 新增（2026-07-30）：
 * - confirmDispatchWithSoftWarn：派发前查 /schedules/occupations，若 workerId 在该日
 *   状态为 off_duty / no_schedule 则弹 DispatchConflictSoftWarn Modal；用户填原因接受时
 *   POST /dispatch/override 写日志，最后调 syncAfterDispatch 同步占用。
 *   - 软警告检查 / Modal 取消 / override 写失败 **均不阻塞** syncAfterDispatch 主流程（catch 静默）
 *   - 用户取消 → return false，不调 syncAfterDispatch（取消是用户明确意图）
 */

import { useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';
import { todayLocal } from '../lib/dateUtils';
import { useScheduleStore, type ScheduleOccupation } from '../stores';
import { useToastStore } from '../stores/useToastStore';
import { showSoftWarnModal } from './dispatchSoftWarnModal';

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

// ============== Hook 主实现 ==============

/**
 * 派发 → 排班占用同步桥接器
 *
 * 使用：
 *   const { syncAfterDispatch, confirmDispatchWithSoftWarn } = useDispatchScheduleBridge();
 *   // 派发成功后 fire-and-forget 调用，不阻塞主流程
 *   syncAfterDispatch({ source: 'farm', sourceId: task.id }, workerId, { taskPlanDate: task.planDate });
 *
 * Batch 6 +confirmDispatchWithSoftWarn：
 *   const accepted = await confirmDispatchWithSoftWarn(task, workerId, options);
 *   if (!accepted) return; // 用户取消，不发派工
 *   await doDispatch(task, workerId);
 */
export function useDispatchScheduleBridge() {
  // ★ 修复（B4 导航卡死死循环）：原整对象订阅 scheduleStore,
  //   改为 selector 单独订阅 invalidateOccupations（action 引用稳定）。
  const invalidateOccupations = useScheduleStore((s) => s.invalidateOccupations);

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
        invalidateOccupations(today);
        if (options?.taskPlanDate && options.taskPlanDate !== today) {
          invalidateOccupations(options.taskPlanDate);
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
    [invalidateOccupations]
  );

  /**
   * Batch 6 新增：派发前占用检查 + 软警告 + override 日志 + 派工主流程。
   *
   * 流程：
   *   1. 调用 GET /schedules/occupations?date=YYYY-MM-DD 查工人当日占用
   *   2. 若 scheduleStatus ∈ {off_duty, no_schedule} 弹软警告 Modal
   *   3. 用户接受覆写 → POST /dispatch/override 写日志（含 reason + conflictType）
   *   4. 调 syncAfterDispatch 派发主流程
   *
   * 返回 true  → 派工主流程已调度（含/不含 override 都算"用户接受了派工"）
   * 返回 false → 用户取消 / silent skip（workerId 或 sourceId 为空）
   *
   * 关键语义：
   *   - 用户取消（Modal 上点"取消"）→ return false，不调 syncAfterDispatch
   *   - 软警告检查失败（API 报错）→ console.warn + 继续 syncAfterDispatch
   *   - override 日志写失败 → console.warn + 继续 syncAfterDispatch（覆写日志是审计用，不应阻塞派工）
   */
  const confirmDispatchWithSoftWarn = useCallback(
    async (
      task: DispatchTaskRef,
      workerId: string,
      options?: DispatchBridgeOptions,
    ): Promise<boolean> => {
      // ★ Silent skip：workerId 或 sourceId 为空时跳过（与 syncAfterDispatch 行为一致）
      if (!workerId || !task.sourceId) {
        return false;
      }

      const date = options?.taskPlanDate ?? todayLocal();

      try {
        // 1. 查工人当日占用
        // 后端 route /api/schedules/occupations 只接受 date + 可选 teamId，不过滤 workerId
        // → 前端本地按 workerId 过滤（一般占用列表 < 50 人，开销可接受）
        const response = await enhancedApiClient.get<{
          date: string;
          workers: ScheduleOccupation[];
        }>(`/schedules/occupations?date=${encodeURIComponent(date)}`);
        const occ = response?.workers?.find((w) => w.workerId === workerId);

        // 2. 若是 off_duty / no_schedule → 弹软警告
        if (
          occ &&
          (occ.scheduleStatus === 'off_duty' || occ.scheduleStatus === 'no_schedule')
        ) {
          const reason = await showSoftWarnModal({
            workerName: occ.workerName || workerId,
            date,
            scheduleStatus: occ.scheduleStatus,
          });

          // 用户取消（空 reason）
          if (!reason) {
            return false;
          }

          // 3. 接受覆写 → POST 日志
          // 失败时同样不阻塞主流程（override 是审计用途，写不进也不影响派工）
          try {
            await enhancedApiClient.post('/dispatch/override', {
              taskId: task.sourceId,
              workerId,
              overrideReason: reason,
              conflictType: occ.scheduleStatus,
            });
          } catch (overrideErr: unknown) {
            const msg = overrideErr instanceof Error ? overrideErr.message : String(overrideErr);
            console.warn('派工覆写日志写入失败（继续主流程）:', msg);
          }
        }
      } catch (checkErr: unknown) {
        // 软警告检查失败不阻塞派工（与 syncAfterDispatch 错误处理一致）
        const message = checkErr instanceof Error ? checkErr.message : String(checkErr);
        console.warn('派工前占用检查失败（继续主流程）:', message);
      }

      // 4. 继续派工主流程
      await syncAfterDispatch(task, workerId, options);
      return true;
    },
    [syncAfterDispatch]
  );

  return { syncAfterDispatch, confirmDispatchWithSoftWarn };
}