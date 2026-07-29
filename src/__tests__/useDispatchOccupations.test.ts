/**
 * useDispatchOccupations 单测
 *
 * Batch 3 审核修复配套测试，覆盖 3 个关键路径：
 * 1. mount 时自动调用 fetchOccupations(date)
 * 2. date 变化时重新 fetch
 * 3. refetch 手动触发 fetch
 *
 * 注意：项目未安装 @testing-library/react，使用 react-dom/client + React.act
 * 实现零依赖的 renderHook 等价物（与 useDispatchScheduleBridge.test.ts 一致风格）。
 *
 * 2026-07-29
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useDispatchOccupations } from '../hooks/useDispatchOccupations';
import { useScheduleStore } from '../stores';

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

// 支持 rerender（接收新 props 重新渲染）
function renderHookWithProps<T, P>(
  callback: (props: P) => T,
  initialProps: P
): {
  result: HookHandle<T>;
  rerender: (newProps: P) => void;
  unmount: () => void;
} {
  const ref: HookHandle<T> = { current: undefined };
  let currentProps = initialProps;

  function TestComp() {
    ref.current = callback(currentProps);
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
    rerender: (newProps: P) => {
      currentProps = newProps;
      act(() => {
        root.render(React.createElement(TestComp));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

// ============ Mock 依赖 ============

// Mock useScheduleStore：暴露 fetchOccupations mock + occupations/loading/error 派生 state
const mockFetchOccupations = vi.fn();

vi.mock('../stores', () => {
  const useScheduleStoreMock: any = vi.fn((selector?: any) => {
    const state = {
      occupations: {},
      occupationsLoading: false,
      occupationsError: null,
      fetchOccupations: mockFetchOccupations,
    };
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  });
  return { useScheduleStore: useScheduleStoreMock };
});

// ============ 测试用例 ============

describe('useDispatchOccupations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOccupations.mockReset();
  });

  it('mount 时自动调用 fetchOccupations(date)', () => {
    renderHook(() => useDispatchOccupations('2026-07-29'));

    expect(mockFetchOccupations).toHaveBeenCalledTimes(1);
    expect(mockFetchOccupations).toHaveBeenCalledWith('2026-07-29');
  });

  it('date 变化时重新 fetch', () => {
    const { rerender } = renderHookWithProps(
      ({ date }) => useDispatchOccupations(date),
      { date: '2026-07-29' }
    );

    // 初次 mount 已调用一次
    expect(mockFetchOccupations).toHaveBeenCalledTimes(1);
    expect(mockFetchOccupations).toHaveBeenLastCalledWith('2026-07-29');

    // 切换到新日期
    rerender({ date: '2026-07-30' });

    // ★ date 变化触发 useEffect deps 变更，必须重新 fetch
    expect(mockFetchOccupations).toHaveBeenCalledTimes(2);
    expect(mockFetchOccupations).toHaveBeenCalledWith('2026-07-29');
    expect(mockFetchOccupations).toHaveBeenCalledWith('2026-07-30');
  });

  it('refetch 手动触发 fetch', () => {
    const { result } = renderHook(() => useDispatchOccupations('2026-07-29'));

    // mount 时调用一次
    expect(mockFetchOccupations).toHaveBeenCalledTimes(1);

    // 手动调用 refetch
    act(() => {
      result.current!.refetch();
    });

    // ★ refetch 必须用 useCallback 稳定引用 + 调用当前 date 的 fetchOccupations
    expect(mockFetchOccupations).toHaveBeenCalledTimes(2);
    expect(mockFetchOccupations).toHaveBeenLastCalledWith('2026-07-29');
  });
});