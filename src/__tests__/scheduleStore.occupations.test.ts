/**
 * scheduleStore 排班占用（fetchOccupations）单元测试
 *
 * Batch 2 审核修复配套测试，覆盖 3 个关键路径：
 * 1. fetchOccupations 缓存命中（TTL 内）不重复发请求
 * 2. invalidateOccupations 同时清理 occupations 和 lastFetchedAt
 * 3. fetchOccupations 错误路径下写入 lastFetchedAt（防死循环）
 *
 * 2026-07-29
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useScheduleStore } from '../stores/scheduleStore';

// Mock enhancedApiClient
vi.mock('../lib/apiClient', () => ({
  enhancedApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// 导入 mock 后的模块
import { enhancedApiClient } from '../lib/apiClient';

describe('scheduleStore.occupations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置排班占用相关状态，避免测试间相互污染
    useScheduleStore.setState({
      occupations: {},
      occupationsLoading: false,
      occupationsError: null,
      lastFetchedAt: {},
    });
  });

  it('TTL 内缓存命中不重复发请求', async () => {
    const today = '2026-07-29';
    // 第一次返回 1 个工人，第二次不应被调用
    (enhancedApiClient.get as any).mockResolvedValue({
      date: today,
      workers: [{ workerId: 'W001', workerName: '张三' }],
    });

    // 第一次调用：触发网络请求
    await useScheduleStore.getState().fetchOccupations(today);
    // 第二次调用：在 2 分钟 TTL 内，应直接走缓存
    await useScheduleStore.getState().fetchOccupations(today);

    expect(enhancedApiClient.get).toHaveBeenCalledTimes(1);
    expect(enhancedApiClient.get).toHaveBeenCalledWith(
      expect.stringContaining(`/schedules/occupations?date=${today}`)
    );
  });

  it('TTL 过期后重新发请求', async () => {
    const today = '2026-07-29';
    (enhancedApiClient.get as any).mockResolvedValue({
      date: today,
      workers: [],
    });

    // 手动写入 3 分钟前的 lastFetchedAt，模拟 TTL 已过期
    useScheduleStore.setState({
      lastFetchedAt: { [today]: Date.now() - 3 * 60 * 1000 },
    });

    await useScheduleStore.getState().fetchOccupations(today);

    // TTL 过期，应重新发请求
    expect(enhancedApiClient.get).toHaveBeenCalledTimes(1);
  });

  it('invalidateOccupations 同时清理 occupations 和 lastFetchedAt', () => {
    const today = '2026-07-29';
    useScheduleStore.setState({
      occupations: { [today]: [{ workerId: 'W001', workerName: '张三' } as any] },
      lastFetchedAt: { [today]: Date.now() },
    });

    useScheduleStore.getState().invalidateOccupations(today);

    const state = useScheduleStore.getState();
    // ★ 双向清理：缓存值 + 时间戳都必须被清掉，否则下次 fetch 仍会 cache hit
    expect(state.occupations[today]).toBeUndefined();
    expect(state.lastFetchedAt[today]).toBeUndefined();
  });

  it('错误路径写入 lastFetchedAt 防止无限重试', async () => {
    const today = '2026-07-29';
    (enhancedApiClient.get as any).mockRejectedValue(new Error('API fail'));

    await useScheduleStore.getState().fetchOccupations(today);

    const state = useScheduleStore.getState();
    expect(state.occupationsError).toBe('API fail');
    expect(state.occupationsLoading).toBe(false);
    // ★ 关键断言：错误路径也必须写入 lastFetchedAt，否则
    // getWorkerScheduleStatus cache miss 后每次 render 都会触发
    // setTimeout(() => fetchOccupations(date), 0)，陷入无限重试循环
    expect(state.lastFetchedAt[today]).toBeDefined();
    expect(typeof state.lastFetchedAt[today]).toBe('number');
  });

  it('成功后写入 lastFetchedAt', async () => {
    const today = '2026-07-29';
    (enhancedApiClient.get as any).mockResolvedValue({
      date: today,
      workers: [{ workerId: 'W001', workerName: '张三' }],
    });

    await useScheduleStore.getState().fetchOccupations(today);

    const state = useScheduleStore.getState();
    expect(state.lastFetchedAt[today]).toBeDefined();
    expect(state.occupations[today]).toHaveLength(1);
    expect(state.occupationsError).toBeNull();
    expect(state.occupationsLoading).toBe(false);
  });
});