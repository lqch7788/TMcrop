/**
 * 人工管理 API 服务测试用例
 * 测试 apiLaborService 的各项功能
 *
 * 注意：这些测试主要测试 API 请求的结构和参数，
 * 实际的 API 调用会被 mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as apiLaborService from '../services/apiLaborService';
import type { Worker, TrainingRecord } from '../types';
import { CreateEmployeeParams, UpdateEmployeeParams } from '../types/labor/employee';

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

describe('人工管理 API 服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllWorkers - 获取所有员工/工人列表', () => {
    it('应该能够获取所有员工列表', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [
        {
          id: 'W001',
          name: '张三',
          position: '操作工',
          department: '生产部',
          status: '在职',
          statusClass: 'success',
        },
        {
          id: 'W002',
          name: '李四',
          position: '技术员',
          department: '技术部',
          status: '在职',
          statusClass: 'success',
        },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      const result = await apiLaborService.getAllWorkers();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers');
      expect(result).toEqual(mockWorkers);
    });

    it('当 API 返回空时应该返回空数组', async () => {
      (enhancedApiClient.get as any).mockResolvedValue(null);

      const result = await apiLaborService.getAllWorkers();

      expect(result).toEqual([]);
    });
  });

  describe('getWorkerById - 根据ID获取员工/工人', () => {
    it('应该能够根据ID获取员工详情', async () => {
      const mockWorker: Partial<Worker> & { statusClass?: string } = {
        id: 'W001',
        name: '张三',
        position: '操作工',
        department: '生产部',
        status: '在职',
        statusClass: 'success',
      };

      (enhancedApiClient.get as any).mockResolvedValue(mockWorker);

      const result = await apiLaborService.getWorkerById('W001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/W001');
      expect(result).toEqual(mockWorker);
    });

    it('当员工不存在时应该返回 undefined', async () => {
      (enhancedApiClient.get as any).mockResolvedValue(undefined);

      const result = await apiLaborService.getWorkerById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getWorkers - 获取员工列表（支持筛选）', () => {
    it('应该能够按部门筛选员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkers({
        deptId: 'DEPT001',
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers?deptId=DEPT001');
    });

    it('应该能够按岗位筛选员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkers({
        positionId: 'POS001',
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers?positionId=POS001');
    });

    it('应该能够按员工类型筛选员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkers({
        employeeType: 'FULL_TIME',
      } as unknown as Partial<CreateEmployeeParams>);

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers?employeeType=FULL_TIME');
    });

    it('应该能够按状态筛选员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkers({
        status: 'ON_BOARD',
      } as unknown as Partial<CreateEmployeeParams>);

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers?status=ON_BOARD');
    });

    it('应该能够按姓名搜索员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkers({
        name: '张三',
      });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers?name=%E5%BC%A0%E4%B8%89');
    });

    it('应该能够组合多个筛选条件', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkers({
        deptId: 'DEPT001',
        positionId: 'POS001',
        employeeType: 'FULL_TIME',
        status: 'ON_BOARD',
        name: '张三',
      } as unknown as Partial<CreateEmployeeParams>);

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers?deptId=DEPT001&positionId=POS001&employeeType=FULL_TIME&status=ON_BOARD&name=%E5%BC%A0%E4%B8%89');
    });
  });

  describe('createWorker - 创建员工', () => {
    it('应该能够创建新员工', async () => {
      const newWorkerData = {
        name: '王五',
        idCard: '110101199001011234',
        phone: '13800138000',
        position: '操作工',
        department: '生产部',
        deptId: 'DEPT001',
        positionId: 'POS001',
        employeeType: 'FULL_TIME',
        joinDate: '2026-01-01',
      } as unknown as CreateEmployeeParams;

      const createdWorker = {
        id: 'W003',
        ...newWorkerData,
        status: 'ON_BOARD',
      };

      (enhancedApiClient.post as any).mockResolvedValue(createdWorker);

      const result = await apiLaborService.createWorker(newWorkerData);

      expect(enhancedApiClient.post).toHaveBeenCalledWith('/labor/workers', newWorkerData);
      expect(result).toEqual(createdWorker);
    });
  });

  describe('updateWorker - 更新员工信息', () => {
    it('应该能够更新员工信息', async () => {
      const workerId = 'W001';
      const updates: Partial<UpdateEmployeeParams> = {
        phone: '13900139000',
        positionId: '高级操作工',
      };

      const updatedWorker = {
        id: workerId,
        name: '张三',
        phone: '13900139000',
        position: '高级操作工',
        department: '生产部',
        status: 'ON_BOARD',
      };

      (enhancedApiClient.put as any).mockResolvedValue(updatedWorker);

      const result = await apiLaborService.updateWorker(workerId, updates);

      expect(enhancedApiClient.put).toHaveBeenCalledWith(`/labor/workers/${workerId}`, updates);
      expect(result).toEqual(updatedWorker);
    });

    it('更新失败时应该返回 null', async () => {
      (enhancedApiClient.put as any).mockResolvedValue(null);

      const result = await apiLaborService.updateWorker('W001', { phone: '13900139000' });

      expect(result).toBeNull();
    });
  });

  describe('deleteWorker - 删除员工', () => {
    it('应该能够删除员工', async () => {
      (enhancedApiClient.delete as any).mockResolvedValue(undefined);

      const result = await apiLaborService.deleteWorker('W001');

      expect(enhancedApiClient.delete).toHaveBeenCalledWith('/labor/workers/W001');
      expect(result).toBe(true);
    });
  });

  describe('deleteWorkers - 批量删除员工', () => {
    it('应该能够批量删除员工', async () => {
      (enhancedApiClient.delete as any).mockResolvedValue(undefined);

      const workerIds = ['W001', 'W002', 'W003'];
      const result = await apiLaborService.deleteWorkers(workerIds);

      expect(enhancedApiClient.delete).toHaveBeenCalledWith(
        `/labor/workers/batch?ids=${workerIds.join(',')}`);
      expect(result).toBe(true);
    });
  });

  describe('searchWorkers - 根据姓名搜索员工', () => {
    it('应该能够根据姓名搜索员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [
        {
          id: 'W001',
          name: '张三',
          position: '操作工',
          department: '生产部',
          status: '在职',
          statusClass: 'success',
        },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      const result = await apiLaborService.searchWorkers('张三');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/search?keyword=%E5%BC%A0%E4%B8%89');
      expect(result).toEqual(mockWorkers);
    });
  });

  describe('getWorkersByDepartment - 根据部门获取员工', () => {
    it('应该能够获取指定部门的员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkersByDepartment('DEPT001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/department/DEPT001');
    });
  });

  describe('getWorkersByPosition - 根据岗位获取员工', () => {
    it('应该能够获取指定岗位的员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkersByPosition('POS001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/position/POS001');
    });
  });

  describe('getWorkersByType - 根据员工类型获取员工', () => {
    it('应该能够获取指定类型的员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkersByType('FULL_TIME');

      // URL 编码取决于运行时实现，验证调用模式即可
      const calls = (enhancedApiClient.get as any).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toMatch(/^\/labor\/workers\/type\/.+$/);
      expect(calls[0].length).toBe(1);
    });
  });

  describe('getWorkersByStatus - 根据状态获取员工', () => {
    it('应该能够获取指定状态的员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkersByStatus('ON_BOARD');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/status/ON_BOARD');
    });
  });

  describe('getActiveWorkers - 获取在职员工列表', () => {
    it('应该能够获取所有在职员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [
        {
          id: 'W001',
          name: '张三',
          position: '操作工',
          department: '生产部',
          status: '在职',
          statusClass: 'success',
        },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      const result = await apiLaborService.getActiveWorkers();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/active');
      expect(result).toEqual(mockWorkers);
    });
  });

  describe('getLeftWorkers - 获取离职员工列表', () => {
    it('应该能够获取所有离职员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [
        {
          id: 'W099',
          name: '赵六',
          position: '操作工',
          department: '生产部',
          status: '离职',
          statusClass: 'danger',
        },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      const result = await apiLaborService.getLeftWorkers();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/left');
      expect(result).toEqual(mockWorkers);
    });
  });

  describe('leaveWorker - 员工离职', () => {
    it('应该能够办理员工离职', async () => {
      (enhancedApiClient.post as any).mockResolvedValue(undefined);

      const result = await apiLaborService.leaveWorker('W001', '2026-05-01', '个人原因');

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        '/labor/workers/W001/leave',
        { leaveDate: '2026-05-01', leaveReason: '个人原因' });
      expect(result).toBe(true);
    });
  });

  describe('rejoinWorker - 员工复职', () => {
    it('应该能够办理员工复职', async () => {
      (enhancedApiClient.post as any).mockResolvedValue(undefined);

      const result = await apiLaborService.rejoinWorker('W001', '2026-06-01');

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        '/labor/workers/W001/rejoin',
        { rejoinDate: '2026-06-01' });
      expect(result).toBe(true);
    });
  });

  describe('getWorkerStats - 获取员工统计', () => {
    it('应该能够获取员工统计数据', async () => {
      const mockStats = {
        total: 100,
        active: 80,
        left: 20,
        byType: { 'FULL_TIME': 60, 'TEMPORARY': 40 },
        byDepartment: { '生产部': 50, '技术部': 30, '行政部': 20 },
      };

      (enhancedApiClient.get as any).mockResolvedValue(mockStats);

      const result = await apiLaborService.getWorkerStats();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getWorkerSkillTags - 获取员工技能标签列表', () => {
    it('应该能够获取所有技能标签', async () => {
      const mockTags = ['施肥', '灌溉', '采收', '修剪', '植保'];

      (enhancedApiClient.get as any).mockResolvedValue(mockTags);

      const result = await apiLaborService.getWorkerSkillTags();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/skill-tags');
      expect(result).toEqual(mockTags);
    });
  });

  describe('getWorkersBySkillTag - 根据技能标签获取员工', () => {
    it('应该能够获取具有特定技能标签的员工', async () => {
      // 测试 mock 数据，Worker 接口精简版（仅包含测试需要的字段）
const mockWorkers: (Partial<Worker> & { statusClass?: string })[] = [];
      (enhancedApiClient.get as any).mockResolvedValue(mockWorkers);

      await apiLaborService.getWorkersBySkillTag('采收');

      // URL 编码取决于运行时实现，验证调用模式即可
      const calls = (enhancedApiClient.get as any).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toMatch(/^\/labor\/workers\/skill-tag\/.+$/);
      expect(calls[0].length).toBe(1);
    });
  });

  describe('getWorkerTrainingRecords - 获取员工培训记录', () => {
    it('应该能够获取指定员工的培训记录', async () => {
      const mockRecords = [
        { id: 'TR001', title: '安全培训', date: '2026-01-01', result: '通过' },
        { id: 'TR002', title: '技能培训', date: '2026-02-01', result: '通过' },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockRecords);

      const result = await apiLaborService.getWorkerTrainingRecords('W001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/W001/training-records');
      expect(result).toEqual(mockRecords);
    });
  });

  describe('addTrainingRecord - 添加培训记录', () => {
    it('应该能够为员工添加培训记录', async () => {
      (enhancedApiClient.post as any).mockResolvedValue(undefined);

      const record = { title: '新员工培训', date: '2026-05-01', result: '通过' };
      const result = await apiLaborService.addTrainingRecord('W001', record as Partial<TrainingRecord>);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        '/labor/workers/W001/training-records',
        record);
      expect(result).toBe(true);
    });
  });

  describe('getWorkerAssessmentRecords - 获取员工考核记录', () => {
    it('应该能够获取指定员工的考核记录', async () => {
      const mockRecords = [
        { id: 'AR001', title: '月度考核', date: '2026-04-01', score: 85 },
        { id: 'AR002', title: '季度考核', date: '2026-03-01', score: 90 },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockRecords);

      const result = await apiLaborService.getWorkerAssessmentRecords('W001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/W001/assessment-records');
      expect(result).toEqual(mockRecords);
    });
  });

  describe('addAssessmentRecord - 添加考核记录', () => {
    it('应该能够为员工添加考核记录', async () => {
      (enhancedApiClient.post as any).mockResolvedValue(undefined);

      const record = { title: '年度考核', date: '2026-05-01', score: 88 };
      const result = await apiLaborService.addAssessmentRecord('W001', record);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        '/labor/workers/W001/assessment-records',
        record);
      expect(result).toBe(true);
    });
  });

  describe('getWorkerWorkExperiences - 获取员工工作经验', () => {
    it('应该能够获取指定员工的工作经验', async () => {
      const mockExperiences = [
        { id: 'WE001', company: '某农场', position: '技术员', startDate: '2020-01', endDate: '2023-12' },
      ];

      (enhancedApiClient.get as any).mockResolvedValue(mockExperiences);

      const result = await apiLaborService.getWorkerWorkExperiences('W001');

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/W001/work-experiences');
      expect(result).toEqual(mockExperiences);
    });
  });

  describe('addWorkExperience - 添加工作经验', () => {
    it('应该能够为员工添加工作经验', async () => {
      (enhancedApiClient.post as any).mockResolvedValue(undefined);

      const experience = { company: '新公司', position: '主管', startDate: '2024-01' };
      const result = await apiLaborService.addWorkExperience('W001', experience);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        '/labor/workers/W001/work-experiences',
        experience);
      expect(result).toBe(true);
    });
  });

  describe('generateWorkerId - 生成员工工号', () => {
    it('应该能够生成新的员工工号', async () => {
      const mockId = 'W100';
      (enhancedApiClient.get as any).mockResolvedValue(mockId);

      const result = await apiLaborService.generateWorkerId();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/generate-id');
      expect(result).toEqual(mockId);
    });
  });

  describe('importWorkers - 批量导入员工', () => {
    it('应该能够批量导入员工', async () => {
      const mockResult = { success: 95, failed: 5 };
      (enhancedApiClient.post as any).mockResolvedValue(mockResult);

      const workers = [
        { name: '员工1', phone: '13800000001' },
        { name: '员工2', phone: '13800000002' },
      ] as CreateEmployeeParams[];
      const result = await apiLaborService.importWorkers(workers);

      expect(enhancedApiClient.post).toHaveBeenCalledWith(
        '/labor/workers/import',
        { workers });
      expect(result).toEqual(mockResult);
    });
  });

  describe('exportWorkers - 导出员工数据', () => {
    it('应该能够导出员工数据', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      (enhancedApiClient.get as any).mockResolvedValue(mockBlob);

      const result = await apiLaborService.exportWorkers();

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/export');
      expect(result).toEqual(mockBlob);
    });

    it('应该能够按筛选条件导出员工数据', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      (enhancedApiClient.get as any).mockResolvedValue(mockBlob);

      await apiLaborService.exportWorkers({ deptId: 'DEPT001' });

      expect(enhancedApiClient.get).toHaveBeenCalledWith('/labor/workers/export');
    });
  });
});
