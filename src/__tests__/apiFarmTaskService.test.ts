/**
 * 农事任务 API 服务测试用例
 * 测试 apiFarmTaskService 的各项功能
 *
 * 注意：这些测试主要测试 API 请求的结构和参数，
 * 实际的 API 调用会被 mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as apiFarmTaskService from '../services/apiFarmTaskService';
import { Task, TaskStatus } from '../types/task';

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

describe('农事任务 API 服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllTasks - 获取所有任务', () => {
    it('应该能够获取所有农事任务', async () => {
      const mockTasks: Task[] = [
        {
          id: 'NS20260417-001',
          taskCode: 'NS20260417-001',
          title: '8号棚辣椒采收',
          type: 'harvest',
          typeName: '采收',
          status: 'pending',
          sourceType: 'dispatch',
          assigneeId: 'W001',
          assigneeName: '张三',
          assignerId: 'M001',
          assignerName: '王主管',
          progress: 0,
          reworkCount: 0,
          reworkHistory: [],
          deadlineExtensions: [],
          feedbackRequirements: [],
          version: 1,
          createdAt: '2026-04-17T08:00:00Z',
          updatedAt: '2026-04-17T08:00:00Z',
        },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockTasks);

      const result = await apiFarmTaskService.getAllTasks();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks', {
        useCache: true,
        cacheStrategy: 'network-first',
      });
      expect(result).toEqual(mockTasks);
    });

    it('当 API 返回空时应该返回空数组', async () => {
      (enhancedApiClient.get as any).mockResolvedValue(null);

      const result = await apiFarmTaskService.getAllTasks();

      expect(result).toEqual([]);
    });
  });

  describe('getTaskById - 根据ID获取任务', () => {
    it('应该能够根据ID获取任务详情', async () => {
      const mockTask: Task = {
        id: 'NS20260417-001',
        taskCode: 'NS20260417-001',
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'pending',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 1,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-17T08:00:00Z',
      };

      (enhancedApiClient.get as any).mockResolvedValue(mockTask);

      const result = await apiFarmTaskService.getTaskById('NS20260417-001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks/NS20260417-001', {
        useCache: true,
        cacheStrategy: 'network-first',
      });
      expect(result).toEqual(mockTask);
    });
  });

  describe('getTasks - 获取任务列表（筛选）', () => {
    it('应该能够按状态筛选任务', async () => {
      const mockTasks: Task[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockTasks);

      await apiFarmTaskService.getTasks({
        status: ['pending', 'in_progress'] as TaskStatus[],
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks', {
        params: { status: 'pending,in_progress' },
        useCache: true,
        cacheStrategy: 'network-first',
      });
    });

    it('应该能够按执行人筛选任务', async () => {
      const mockTasks: Task[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockTasks);

      await apiFarmTaskService.getTasks({
        assigneeId: 'W001',
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks', {
        params: { assigneeId: 'W001' },
        useCache: true,
        cacheStrategy: 'network-first',
      });
    });

    it('应该能够按日期范围筛选任务', async () => {
      const mockTasks: Task[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockTasks);

      await apiFarmTaskService.getTasks({
        dateRange: {
          start: '2026-04-01',
          end: '2026-04-30',
        },
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks', {
        params: {
          startDate: '2026-04-01',
          endDate: '2026-04-30',
        },
        useCache: true,
        cacheStrategy: 'network-first',
      });
    });

    it('应该能够组合多个筛选条件', async () => {
      const mockTasks: Task[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockTasks);

      await apiFarmTaskService.getTasks({
        status: ['pending'] as TaskStatus[],
        assigneeId: 'W001',
        greenhouseId: 'GH001',
        priority: 'high',
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks', {
        params: {
          status: 'pending',
          assigneeId: 'W001',
          greenhouseId: 'GH001',
          priority: 'high',
        },
        useCache: true,
        cacheStrategy: 'network-first',
      });
    });
  });

  describe('createTask - 创建任务', () => {
    it('应该能够创建新任务', async () => {
      const newTaskData = {
        title: '测试任务',
        type: 'fertilization',
        typeName: '施肥',
        status: 'draft' as TaskStatus,
        sourceType: 'dispatch' as const,
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        priority: 'normal' as const,
      };

      const createdTask: Task = {
        ...newTaskData,
        id: 'NS20260430-001',
        taskCode: 'NS20260430-001',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 1,
        createdAt: '2026-04-30T08:00:00Z',
        updatedAt: '2026-04-30T08:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(createdTask);

      const result = await apiFarmTaskService.createTask(newTaskData);

      expect(enhancedApiClient.post).toHaveBeenCalledWith('/farm-tasks', newTaskData, {
        offlineQueue: true,
        useCache: true,
      });
      expect(result).toEqual(createdTask);
    });
  });

  describe('updateTask - 更新任务', () => {
    it('应该能够更新任务信息', async () => {
      const taskId = 'NS20260417-001';
      const updates = {
        title: '更新后的标题',
        progress: 50,
      };

      const updatedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '更新后的标题',
        type: 'harvest',
        typeName: '采收',
        status: 'in_progress',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 50,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T10:00:00Z',
      };

      (enhancedApiClient.put as any).mockResolvedValue(updatedTask);

      const result = await apiFarmTaskService.updateTask(taskId, updates);

      expect(enhancedApiClient.put).toHaveBeenCalledWith(`/farm-tasks/${taskId}`, updates, {
        offlineQueue: true,
      });
      expect(result).toEqual(updatedTask);
    });

    it('更新失败时应该返回 null', async () => {
      (enhancedApiClient.put as any).mockResolvedValue(null);

      const result = await apiFarmTaskService.updateTask('NS20260417-001', { title: 'test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteTask - 删除任务', () => {
    it('应该能够删除任务', async () => {
      (enhancedApiClient.delete as any).mockResolvedValue(undefined);

      const result = await apiFarmTaskService.deleteTask('NS20260417-001');

      expect(enhancedApiClient.delete).toHaveBeenCalledWith('/farm-tasks/NS20260417-001', {
        offlineQueue: true,
      });
      expect(result).toBe(true);
    });
  });

  describe('acceptTask - 接受任务', () => {
    it('应该能够接受任务', async () => {
      const taskId = 'NS20260417-001';
      const acceptedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'in_progress',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T09:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(acceptedTask);

      const result = await apiFarmTaskService.acceptTask(taskId);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(`/farm-tasks/${taskId}/accept`, undefined, {
        offlineQueue: true,
      });
      expect(result).toEqual(acceptedTask);
    });
  });

  describe('submitProgress - 提交进度', () => {
    it('应该能够提交进度', async () => {
      const taskId = 'NS20260417-001';
      const progress = 50;
      const feedback = { text: '已完成一半工作量' };

      const updatedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'in_progress',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 50,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T10:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(updatedTask);

      const result = await apiFarmTaskService.submitProgress(taskId, progress, feedback);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        `/farm-tasks/${taskId}/progress`,
        { progress, feedback },
        { offlineQueue: true }
      );
      expect(result).toEqual(updatedTask);
    });

    it('应该能够提交最终进度（申请验收）', async () => {
      const taskId = 'NS20260417-001';
      const progress = 100;
      const feedback = { text: '任务已完成，申请验收' };

      const waitingTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'waiting_acceptance',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 100,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T17:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(waitingTask);

      const result = await apiFarmTaskService.submitProgress(taskId, progress, feedback);

      expect(result?.status).toBe('waiting_acceptance');
    });
  });

  describe('publishTask - 发布任务', () => {
    it('应该能够发布任务', async () => {
      const taskId = 'NS20260417-001';
      const publishedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'pending',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T08:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(publishedTask);

      const result = await apiFarmTaskService.publishTask(taskId);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(`/farm-tasks/${taskId}/publish`, undefined, {
        offlineQueue: true,
      });
      expect(result).toEqual(publishedTask);
    });
  });

  describe('withdrawTask - 撤回任务', () => {
    it('应该能够撤回任务', async () => {
      const taskId = 'NS20260417-001';
      const withdrawnTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'draft',
        sourceType: 'dispatch',
        assigneeId: '',
        assigneeName: '',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T08:30:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(withdrawnTask);

      const result = await apiFarmTaskService.withdrawTask(taskId);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(`/farm-tasks/${taskId}/withdraw`, undefined, {
        offlineQueue: true,
      });
      expect(result).toEqual(withdrawnTask);
    });
  });

  describe('completeTask - 验收通过', () => {
    it('应该能够验收通过任务', async () => {
      const taskId = 'NS20260417-001';
      const comments = '验收通过';
      const completedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'completed',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 100,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 3,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T18:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(completedTask);

      const result = await apiFarmTaskService.completeTask(taskId, comments);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        `/farm-tasks/${taskId}/complete`,
        { comments },
        { offlineQueue: true }
      );
      expect(result).toEqual(completedTask);
    });
  });

  describe('rejectTask - 验收驳回', () => {
    it('应该能够驳回任务', async () => {
      const taskId = 'NS20260417-001';
      const reason = '质量问题，需要返工';
      const rejectedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'rejected',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 1,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 3,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T18:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(rejectedTask);

      const result = await apiFarmTaskService.rejectTask(taskId, reason);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        `/farm-tasks/${taskId}/reject`,
        { reason },
        { offlineQueue: true }
      );
      expect(result).toEqual(rejectedTask);
    });
  });

  describe('cancelTask - 取消任务', () => {
    it('应该能够取消任务', async () => {
      const taskId = 'NS20260417-001';
      const reason = '计划变更';
      const cancelledTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'cancelled',
        sourceType: 'dispatch',
        assigneeId: '',
        assigneeName: '',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T08:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(cancelledTask);

      const result = await apiFarmTaskService.cancelTask(taskId, reason);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        `/farm-tasks/${taskId}/cancel`,
        { reason },
        { offlineQueue: true }
      );
      expect(result).toEqual(cancelledTask);
    });
  });

  describe('abandonTask - 放弃任务', () => {
    it('应该能够放弃任务', async () => {
      const taskId = 'NS20260417-001';
      const reason = '无法执行';
      const abandonedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'abandoned',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 2,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T08:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(abandonedTask);

      const result = await apiFarmTaskService.abandonTask(taskId, reason);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        `/farm-tasks/${taskId}/abandon`,
        { reason },
        { offlineQueue: true }
      );
      expect(result).toEqual(abandonedTask);
    });
  });

  describe('reassignTask - 重新派发任务', () => {
    it('应该能够重新派发任务', async () => {
      const taskId = 'NS20260417-001';
      const newAssigneeId = 'W002';
      const reassignedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'pending',
        sourceType: 'dispatch',
        assigneeId: newAssigneeId,
        assigneeName: '李四',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 0,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 3,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T10:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(reassignedTask);

      const result = await apiFarmTaskService.reassignTask(taskId, newAssigneeId);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        `/farm-tasks/${taskId}/reassign`,
        { assigneeId: newAssigneeId },
        { offlineQueue: true }
      );
      expect(result).toEqual(reassignedTask);
    });
  });

  describe('getTaskStats - 获取任务统计', () => {
    it('应该能够获取任务统计', async () => {
      const mockStats = {
        total: 100,
        pending: 20,
        inProgress: 30,
        waitingAcceptance: 10,
        completed: 35,
        overdue: 5,
      };

      (enhancedApiClient.get as any).mockResolvedValue(mockStats);

      const result = await apiFarmTaskService.getTaskStats();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/farm-tasks/stats', {
        useCache: true,
        cacheStrategy: 'stale-while-revalidate',
      });
      expect(result).toEqual(mockStats);
    });
  });

  describe('deleteTasks - 批量删除任务', () => {
    it('应该能够批量删除任务', async () => {
      const taskIds = ['NS20260417-001', 'NS20260417-002'];

      (enhancedApiClient.delete as any).mockResolvedValue(undefined);

      const result = await apiFarmTaskService.deleteTasks(taskIds);

      expect(enhancedApiClient.delete).toHaveBeenCalledWith(
        `/farm-tasks/batch?ids=${taskIds.join(',')}`,
        { offlineQueue: true }
      );
      expect(result).toBe(true);
    });
  });

  describe('archiveTask - 归档任务', () => {
    it('应该能够归档任务', async () => {
      const taskId = 'NS20260417-001';
      const archivedTask: Task = {
        id: taskId,
        taskCode: taskId,
        title: '8号棚辣椒采收',
        type: 'harvest',
        typeName: '采收',
        status: 'completed',
        sourceType: 'dispatch',
        assigneeId: 'W001',
        assigneeName: '张三',
        assignerId: 'M001',
        assignerName: '王主管',
        progress: 100,
        reworkCount: 0,
        reworkHistory: [],
        deadlineExtensions: [],
        feedbackRequirements: [],
        version: 3,
        createdAt: '2026-04-17T08:00:00Z',
        updatedAt: '2026-04-30T18:00:00Z',
      };

      (enhancedApiClient.post as any).mockResolvedValue(archivedTask);

      const result = await apiFarmTaskService.archiveTask(taskId);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(`/farm-tasks/${taskId}/archive`, undefined, {
        offlineQueue: true,
      });
      expect(result).toEqual(archivedTask);
    });
  });
});
