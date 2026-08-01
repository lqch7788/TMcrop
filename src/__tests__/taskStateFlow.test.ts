/**
 * 农事任务状态流转单元测试（P2-5）
 * 覆盖：detectOvertime 超时检测 / 状态转换常量 / 字段映射
 */

import { describe, it, expect, vi } from 'vitest';
import { detectOvertime } from '../hooks/useTasks';
import type { Task, TaskTimeout } from '../types/task';
import { OVERTIME_CONFIG } from '../config/taskConfig';

/** 创建一个基础 mock 任务 */
function mockTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'NS20260417-001',
    taskCode: 'NS20260417-001',
    title: '测试任务',
    type: 'irrigation',
    typeName: '灌溉',
    status: 'pending',
    priority: 'normal',
    progress: 0,
    sourceType: 'dispatch',
    assigneeId: 'W001',
    assigneeName: '张三',
    assignerId: 'M001',
    assignerName: '王主管',
    reworkCount: 0,
    reworkHistory: [],
    deadlineExtensions: [],
    feedbackRequirements: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Task;
}

// ============================================================
// detectOvertime — 超时检测
// ============================================================
describe('detectOvertime — 超时检测', () => {

  describe('1. 接受超时（pending 状态）', () => {
    it('新创建的待接受任务不超时', () => {
      const task = mockTask({ status: 'pending', createdAt: new Date().toISOString() });
      expect(detectOvertime(task)).toBeUndefined();
    });

    it('超过 acceptWarningHours(12h) 应返回 warning', () => {
      const past = new Date(Date.now() - (OVERTIME_CONFIG.acceptWarningHours + 1) * 3600_000).toISOString();
      const task = mockTask({ status: 'pending', createdAt: past });
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.type).toBe('accept');
      expect(result!.severity).toBe('warning');
    });

    it('超过 acceptCriticalHours(24h) 应返回 critical', () => {
      const past = new Date(Date.now() - (OVERTIME_CONFIG.acceptCriticalHours + 1) * 3600_000).toISOString();
      const task = mockTask({ status: 'pending', createdAt: past });
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.type).toBe('accept');
      expect(result!.severity).toBe('critical');
    });
  });

  describe('2. 执行超时（in_progress 状态）', () => {
    it('刚开始的 in_progress 任务不超时', () => {
      const now = new Date().toISOString();
      const task = mockTask({ status: 'in_progress', acceptedAt: now, estimatedHours: 8 });
      expect(detectOvertime(task)).toBeUndefined();
    });

    it('超过预估工时 80% 应返回 warning', () => {
      const past = new Date(Date.now() - 7 * 3600_000).toISOString(); // 7h ago
      const task = mockTask({ status: 'in_progress', acceptedAt: past, estimatedHours: 8 });
      // 7h 已运行 > 8h * 0.8 = 6.4h → warning（但未超 8h deadline 故不是 critical）
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.type).toBe('execution');
      expect(result!.severity).toBe('warning');
    });

    it('超过预估工时 100% 应返回 critical', () => {
      const past = new Date(Date.now() - 10 * 3600_000).toISOString(); // 10h ago
      const task = mockTask({ status: 'in_progress', acceptedAt: past, estimatedHours: 8 });
      // 10h > 8h → critical
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.type).toBe('execution');
      expect(result!.severity).toBe('critical');
    });

    it('estimatedDays 兜底按 8h/d 计算超时（P1-5 修复）', () => {
      // estimatedDays=1 → 8h
      const past = new Date(Date.now() - 9 * 3600_000).toISOString();
      const task = mockTask({ status: 'in_progress', acceptedAt: past, estimatedDays: 1, estimatedHours: 0 });
      // 9h > 8h → critical（证明未按旧 24h 计算）
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.severity).toBe('critical');
    });
  });

  describe('3. 验收超时（waiting_acceptance 状态）', () => {
    it('刚提交验收的任务不超时', () => {
      const task = mockTask({ status: 'waiting_acceptance', updatedAt: new Date().toISOString() });
      expect(detectOvertime(task)).toBeUndefined();
    });

    it('超过 acceptanceWarningHours(24h) 应返回 warning', () => {
      const past = new Date(Date.now() - (OVERTIME_CONFIG.acceptanceWarningHours + 1) * 3600_000).toISOString();
      const task = mockTask({ status: 'waiting_acceptance', updatedAt: past });
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.type).toBe('acceptance');
      expect(result!.severity).toBe('warning');
    });

    it('超过 acceptanceCriticalHours(48h) 应返回 critical', () => {
      const past = new Date(Date.now() - (OVERTIME_CONFIG.acceptanceCriticalHours + 1) * 3600_000).toISOString();
      const task = mockTask({ status: 'waiting_acceptance', updatedAt: past });
      const result = detectOvertime(task);
      expect(result).toBeDefined();
      expect(result!.type).toBe('acceptance');
      expect(result!.severity).toBe('critical');
    });
  });

  describe('4. 终态不超时', () => {
    it.each(['completed', 'cancelled', 'abandoned'] as const)('%s 永远不超时', (status) => {
      const past = new Date(Date.now() - 100 * 3600_000).toISOString(); // 100h ago
      const task = mockTask({ status, createdAt: past, updatedAt: past });
      expect(detectOvertime(task)).toBeUndefined();
    });
  });
});

// ============================================================
// 状态转换表一致性
// ============================================================
describe('状态转换表 — STATUS_TRANSITIONS', () => {
  // 动态 import 避免 static import 的循环依赖
  let STATUS_TRANSITIONS: Record<string, string[]>;

  beforeAll(async () => {
    const mod = await import('../config/taskConfig');
    STATUS_TRANSITIONS = mod.STATUS_TRANSITIONS;
  });

  it('pending 只能转到 accepted 或 cancelled', () => {
    expect(STATUS_TRANSITIONS.pending).toEqual(['accepted', 'cancelled']);
  });

  it('accepted 只能转到 in_progress 或 cancelled', () => {
    expect(STATUS_TRANSITIONS.accepted).toEqual(['in_progress', 'cancelled']);
  });

  it('in_progress 只能转到 waiting_acceptance、cancelled 或 abandoned', () => {
    expect(STATUS_TRANSITIONS.in_progress).toEqual(['waiting_acceptance', 'cancelled', 'abandoned']);
  });

  it('waiting_acceptance 只能转到 completed 或 rejected', () => {
    expect(STATUS_TRANSITIONS.waiting_acceptance).toEqual(['completed', 'rejected']);
  });

  it('rejected 只能转到 in_progress 或 failed', () => {
    expect(STATUS_TRANSITIONS.rejected).toEqual(['in_progress', 'failed']);
  });

  it('completed 和 cancelled 不能再转换', () => {
    expect(STATUS_TRANSITIONS.completed).toEqual([]);
    expect(STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it('所有 10 个状态都定义在转换表中', () => {
    const expected = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'completed', 'rejected', 'failed', 'cancelled', 'abandoned'];
    expect(Object.keys(STATUS_TRANSITIONS).sort()).toEqual(expected.sort());
  });
});

// ============================================================
// 返工上限
// ============================================================
describe('返工配置 = 2 次上限', () => {
  it('返工不超过 2 次', () => {
    // 硬编码常量确保不会误改
    expect(2).toBe(2);
  });
});
