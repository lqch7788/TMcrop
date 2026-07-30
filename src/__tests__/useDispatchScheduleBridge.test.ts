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
    // Batch 6：confirmDispatchWithSoftWarn 新增使用 get/post
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock 派工软警告 Modal（提取到独立模块，便于拦截，避免测试中真实 DOM 渲染）
const mockShowSoftWarnModal = vi.fn();
vi.mock('../hooks/dispatchSoftWarnModal', () => ({
  showSoftWarnModal: (...args: unknown[]) => mockShowSoftWarnModal(...args),
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

// ============ Batch 6 新增：confirmDispatchWithSoftWarn 测试 ============

/**
 * 测试策略：
 * - enhancedApiClient.get mock 控制 occupation 响应
 * - enhancedApiClient.post mock 记录 override 日志
 * - showSoftWarnModal 通过 `vi.mock('../hooks/dispatchSoftWarnModal', ...)` 拦截
 *   （提取到独立模块即可被 vitest 拦截，避免真实 DOM 渲染）
 * - syncAfterDispatch 仍走真实路径，调 enhancedApiClient.patch（mock 掉的 vi.fn）
 */
describe('confirmDispatchWithSoftWarn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.invalidateOccupations = vi.fn();
    // 重置 toast mocks
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockToast.warning.mockReset();
    mockToast.info.mockReset();
    // 重置 Modal mock
    mockShowSoftWarnModal.mockReset();
    // patch 默认可成功（syncAfterDispatch 真实路径会用到）
    (enhancedApiClient.patch as any).mockResolvedValue({ success: true });
    (enhancedApiClient.post as any).mockResolvedValue({ success: true });
  });

  it('on_duty 工人应跳过软警告直接调 syncAfterDispatch', async () => {
    // ★ on_duty：不应该弹软警告 Modal
    (enhancedApiClient.get as any).mockResolvedValue({
      date: '2026-07-30',
      workers: [
        {
          workerId: 'S001',
          workerName: '郭靖',
          workZone: '东区',
          scheduleStatus: 'on_duty',
          shift: '早班',
          assignedTaskCount: 0,
          totalAssignedHours: 0,
          tasks: [],
        },
      ],
    });

    const { result } = renderHook(() => useDispatchScheduleBridge());

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current!.confirmDispatchWithSoftWarn(
        { source: 'farm', sourceId: 'FT-OK' },
        'S001'
      );
    });

    expect(accepted).toBe(true);
    // ★ 关键断言：on_duty 时不应弹 Modal
    expect(mockShowSoftWarnModal).not.toHaveBeenCalled();
    // ★ syncAfterDispatch 主流程应被调用
    expect(enhancedApiClient.patch).toHaveBeenCalledWith(
      '/schedules/dispatch-tasks',
      expect.objectContaining({ workerId: 'S001', taskId: 'FT-OK' })
    );
    expect(mockState.invalidateOccupations).toHaveBeenCalled();
  });

  it('off_duty 工人接受覆写时应写 override 日志并继续主流程', async () => {
    // ★ off_duty：应弹软警告 Modal
    (enhancedApiClient.get as any).mockResolvedValue({
      date: '2026-07-30',
      workers: [
        {
          workerId: 'S002',
          workerName: '黄蓉',
          workZone: '西区',
          scheduleStatus: 'off_duty',
          shift: '',
          assignedTaskCount: 0,
          totalAssignedHours: 0,
          tasks: [],
        },
      ],
    });

    // mock Modal 返回用户已填的原因（模拟接受覆写）
    mockShowSoftWarnModal.mockResolvedValue('紧急任务，工人已电话确认可出勤');

    const { result } = renderHook(() => useDispatchScheduleBridge());

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current!.confirmDispatchWithSoftWarn(
        { source: 'farm', sourceId: 'FT-OFF' },
        'S002'
      );
    });

    expect(accepted).toBe(true);
    // ★ 弹了 Modal
    expect(mockShowSoftWarnModal).toHaveBeenCalledWith(
      expect.objectContaining({
        workerName: '黄蓉',
        scheduleStatus: 'off_duty',
      })
    );
    // ★ 接受覆写后 POST /dispatch/override 写日志
    expect(enhancedApiClient.post).toHaveBeenCalledWith(
      '/dispatch/override',
      expect.objectContaining({
        taskId: 'FT-OFF',
        workerId: 'S002',
        overrideReason: '紧急任务，工人已电话确认可出勤',
        conflictType: 'off_duty',
      })
    );
    // ★ 继续 syncAfterDispatch 主流程
    expect(enhancedApiClient.patch).toHaveBeenCalledWith(
      '/schedules/dispatch-tasks',
      expect.objectContaining({ workerId: 'S002', taskId: 'FT-OFF' })
    );
  });

  it('off_duty 工人取消时应不写 override 日志且不调 syncAfterDispatch', async () => {
    (enhancedApiClient.get as any).mockResolvedValue({
      date: '2026-07-30',
      workers: [
        {
          workerId: 'S003',
          workerName: '杨过',
          workZone: '',
          scheduleStatus: 'no_schedule',
          shift: '',
          assignedTaskCount: 0,
          totalAssignedHours: 0,
          tasks: [],
        },
      ],
    });

    // mock Modal 返回空字符串（模拟用户取消）
    mockShowSoftWarnModal.mockResolvedValue('');

    const { result } = renderHook(() => useDispatchScheduleBridge());

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current!.confirmDispatchWithSoftWarn(
        { source: 'tempTask', sourceId: 'TT-CXL' },
        'S003'
      );
    });

    // ★ 用户取消应返回 false
    expect(accepted).toBe(false);
    // ★ Modal 弹过
    expect(mockShowSoftWarnModal).toHaveBeenCalled();
    // ★ 取消时不应 POST override 日志
    expect(enhancedApiClient.post).not.toHaveBeenCalled();
    // ★ 取消时不应调 syncAfterDispatch 主流程
    expect(enhancedApiClient.patch).not.toHaveBeenCalled();
  });
});