/**
 * usePersistentWorkLogs.syncWorkLogFromTask 单测（2026-10-24 整改配套）
 *
 * 覆盖改造前的三个缺陷：
 * 1. 任务反馈必须写入后端 —— 原实现只 setWorkLogs 本地 state，刷新即消失；
 * 2. 同一任务再次反馈应更新已有日志，而不是新建 —— 原实现只在本地 7 条 mock 里找，
 *    永远找不到，同一任务每提交一次就多一条；
 * 3. 作业人默认当前登录用户（测试阶段操作人统一为管理员）。
 *
 * 注意：项目未安装 @testing-library/react，沿用 useDispatchOccupations.test.ts 的
 * 零依赖 renderHook 等价物。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePersistentWorkLogs } from '../hooks/usePersistentWorkLogs';
import { useWorkLogStore } from '../stores/useWorkLogStore';
import { useAuthStore } from '../stores/useAuthStore';

// ============ 零依赖 renderHook 等价物 ============

interface HookHandle<T> {
  current: T | undefined;
}

/** 在临时组件中调用 hook，把返回值暴露到 ref */
function renderHook<T>(callback: () => T): { result: HookHandle<T>; unmount: () => void } {
  const ref: HookHandle<T> = { current: undefined };

  function TestComp() {
    ref.current = callback();
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(React.createElement(TestComp));
  });

  return {
    result: ref,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

// ============ 测试数据 ============

const TASK = {
  id: 'NS20261024-999',
  taskCode: 'NS20261024-999',
  assigneeName: '张三',
  cropName: '番茄',
  greenhouseName: '1号棚',
  title: '测试任务',
};

const PROGRESS = { progress: 50, notes: '进行中' };

/** 构造一条已存在的日志（模拟后端数据） */
function existingLog(taskId: string) {
  return {
    id: 'wl_existing_1',
    code: 'WL20261024001',
    date: '2026-10-24',
    worker: '陆启闯',
    weather: '',
    temperature: '',
    crop: '番茄',
    greenhouse: '1号棚',
    growthStatus: '良好' as const,
    tasks: '测试任务',
    problems: '',
    solutions: '',
    taskId,
  };
}

describe('syncWorkLogFromTask — 任务反馈写工作日志', () => {
  let addSpy: ReturnType<typeof vi.fn>;
  let updateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addSpy = vi.fn().mockResolvedValue({});
    updateSpy = vi.fn().mockResolvedValue(undefined);
    useWorkLogStore.setState({
      workLogs: [],
      addWorkLog: addSpy as never,
      updateWorkLog: updateSpy as never,
      deleteWorkLog: vi.fn() as never,
      fetchWorkLogs: vi.fn() as never,
    });
    useAuthStore.setState({ currentUser: { realName: '陆启闯', username: 'lqc' } } as never);
  });

  it('无同任务日志时新建，并写入后端（addWorkLog 被调用）', () => {
    const { result, unmount } = renderHook(() => usePersistentWorkLogs());

    act(() => {
      result.current!.syncWorkLogFromTask(TASK, PROGRESS);
    });

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(addSpy.mock.calls[0][0].taskId).toBe(TASK.id);
    expect(addSpy.mock.calls[0][0].progress).toBe(50);
    unmount();
  });

  it('作业人默认当前登录用户，而不是任务执行人', () => {
    const { result, unmount } = renderHook(() => usePersistentWorkLogs());

    act(() => {
      result.current!.syncWorkLogFromTask(TASK, PROGRESS);
    });

    expect(addSpy.mock.calls[0][0].worker).toBe('陆启闯');
    unmount();
  });

  it('未登录时作业人退回任务执行人姓名', () => {
    useAuthStore.setState({ currentUser: null } as never);
    const { result, unmount } = renderHook(() => usePersistentWorkLogs());

    act(() => {
      result.current!.syncWorkLogFromTask(TASK, PROGRESS);
    });

    expect(addSpy.mock.calls[0][0].worker).toBe('张三');
    unmount();
  });

  it('已有同任务日志时更新，不再新建（防止重复累积）', () => {
    useWorkLogStore.setState({ workLogs: [existingLog(TASK.id)] as never });
    const { result, unmount } = renderHook(() => usePersistentWorkLogs());

    act(() => {
      result.current!.syncWorkLogFromTask(TASK, PROGRESS);
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).not.toHaveBeenCalled();
    // 按后端 id 更新，而不是新建
    expect(updateSpy.mock.calls[0][0]).toBe('wl_existing_1');
    expect(updateSpy.mock.calls[0][1].progress).toBe(50);
    unmount();
  });

  it('日志属于别的任务时不影响判定（仍新建）', () => {
    useWorkLogStore.setState({ workLogs: [existingLog('NS20261024-888')] as never });
    const { result, unmount } = renderHook(() => usePersistentWorkLogs());

    act(() => {
      result.current!.syncWorkLogFromTask(TASK, PROGRESS);
    });

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();
    unmount();
  });
});
