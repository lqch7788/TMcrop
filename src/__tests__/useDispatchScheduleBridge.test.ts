/**
 * useDispatchScheduleBridge 单测
 *
 * 覆盖 3 个关键路径：
 * 1. PATCH 成功：调用 enhancedApiClient.patch + invalidateOccupations(today)
 * 2. 传入 taskPlanDate：PATCH body 含 date + 双日期 invalidate
 * 3. PATCH 失败：不抛错（alert 兜底 + 不调用 invalidate）
 *
 * 注意：项目未安装 @testing-library/react，使用 react-dom/client + React.act
 * 实现零依赖的 renderHook 等价物。
 *
 * 2026-07-29
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDispatchScheduleBridge } from '../hooks/useDispatchScheduleBridge';
import { enhancedApiClient } from '../lib/apiClient';
import { useScheduleStore } from '../stores';
import { useToastStore } from '../stores/useToastStore';

// ============ 零依赖 renderHook 等价物 ============

interface HookHandle<T> {
  current: T | undefined;
}

/**
 * 在临时 React 函数组件 body 中调用 hook，暴露返回值到 ref。
 * Hook 只在 body 顶部调用一次（符合 Rules of Hooks）。
 */
function renderHook<T>(callback: () => T): {
  result: HookHandle<T>;
  unmount: () => void;
} {
  const ref: HookHandle<T> = { current: undefined };

  function TestComp() {
    // ★ Hook 调用必须在组件 body 顶部（不在 effect / callback 内）
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

// ============ Mock 依赖 ============

// Mock useScheduleStore：暴露 mockState，selector 调用走 mockState
const mockState: { invalidateOccupations: ReturnType<typeof vi.fn> } = {
  invalidateOccupations: vi.fn(),
};

vi.mock('../stores', () => {
  const useScheduleStoreMock: any = vi.fn((selector?: any) => {
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  });
  return { useScheduleStore: useScheduleStoreMock };
});

// Mock useToastStore（store/index.ts 透传，单独路径 mock）
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};
vi.mock('../stores/useToastStore', () => ({
  useToastStore: {
    getState: () => ({ toast: mockToast }),
  },
}));

// Mock enhancedApiClient
vi.mock('../lib/apiClient', () => ({
  enhancedApiClient: {
    patch: vi.fn(),
  },
}));

// ============ 测试用例 ============

describe('useDispatchScheduleBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.invalidateOccupations = vi.fn();
    // 重置 toast mocks
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockToast.warning.mockReset();
    mockToast.info.mockReset();
  });

  it('成功 PATCH 后调用 invalidateOccupations(today)', async () => {
    (enhancedApiClient.patch as any).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDispatchScheduleBridge());

    await act(async () => {
      await result.current!.syncAfterDispatch(
        { source: 'farm', sourceId: 'FT-001' },
        'S001'
      );
    });

    // PATCH 调用参数：workerId / taskId / action='add'
    expect(enhancedApiClient.patch).toHaveBeenCalledWith(
      '/schedules/dispatch-tasks',
      expect.objectContaining({
        workerId: 'S001',
        taskId: 'FT-001',
        action: 'add',
      })
    );
    // 没有 taskPlanDate 时 body 不应含 date
    const body = (enhancedApiClient.patch as any).mock.calls[0][1];
    expect(body).not.toHaveProperty('date');
    // ★ invalidateOccupations 必须被调用，参数为今天 (YYYY-MM-DD)
    expect(mockState.invalidateOccupations).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    // 成功路径不应触发 toast
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.warning).not.toHaveBeenCalled();
  });

  it('传入 taskPlanDate 时 PATCH body 含 date 字段且双日期 invalidate', async () => {
    (enhancedApiClient.patch as any).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDispatchScheduleBridge());

    await act(async () => {
      await result.current!.syncAfterDispatch(
        { source: 'tempTask', sourceId: 'TT-001' },
        'S002',
        { taskPlanDate: '2026-08-01' }
      );
    });

    expect(enhancedApiClient.patch).toHaveBeenCalledWith(
      '/schedules/dispatch-tasks',
      expect.objectContaining({
        workerId: 'S002',
        taskId: 'TT-001',
        action: 'add',
        date: '2026-08-01',
      })
    );
    // ★ 跨日任务：今天 + 任务计划日 都要 invalidate
    expect(mockState.invalidateOccupations).toHaveBeenCalledTimes(2);
    expect(mockState.invalidateOccupations).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(mockState.invalidateOccupations).toHaveBeenCalledWith('2026-08-01');
  });

  it('PATCH 失败时不抛错（toast.error 兜底 + 不调用 invalidate）', async () => {
    (enhancedApiClient.patch as any).mockRejectedValue({
      status: 500,
      message: 'server error',
    });

    const { result } = renderHook(() => useDispatchScheduleBridge());

    // syncAfterDispatch 内部 catch 必须吞掉错误，不应抛
    await act(async () => {
      await result.current!.syncAfterDispatch(
        { source: 'farm', sourceId: 'FT-FAIL' },
        'S003'
      );
    });

    // ★ Batch 3 I-1 修复：toast.error 替代 alert（不阻塞 UI 线程）
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('排班占用同步失败')
    );
    // ★ 失败时不调用 invalidate（避免清理掉可能还有效的缓存）
    expect(mockState.invalidateOccupations).not.toHaveBeenCalled();
  });

  it('PATCH 网络失败时用 toast.warning（非 500）', async () => {
    // 模拟无 status 字段的网络错误（fetch 抛错）
    (enhancedApiClient.patch as any).mockRejectedValue({
      message: 'Network Error',
    });

    const { result } = renderHook(() => useDispatchScheduleBridge());

    await act(async () => {
      await result.current!.syncAfterDispatch(
        { source: 'farm', sourceId: 'FT-NET' },
        'S004'
      );
    });

    // 非 500 错误用 warning（用户可重试），不用 error
    expect(mockToast.warning).toHaveBeenCalledWith(
      expect.stringContaining('排班占用同步失败')
    );
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});