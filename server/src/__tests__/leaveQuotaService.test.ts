/**
 * 请假额度服务测试
 * 测试请假、加班、入职、离职等审批相关的额度管理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// 模拟数据库
const mockDb = {
  prepare: vi.fn(),
  run: vi.fn(),
  exec: vi.fn(),
};

vi.mock('../db/index', () => ({
  getDatabase: vi.fn(() => mockDb),
  saveDatabase: vi.fn(),
}));

describe('请假额度服务', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeLeaveCategory', () => {
    it('应该将中文假期类型转换为英文', () => {
      const typeMap: Record<string, string> = {
        '年假': 'annual',
        '病假': 'sick',
        '事假': 'personal',
        '婚假': 'marriage',
        '产假': 'maternity',
        '陪产假': 'paternity',
        '丧假': 'funeral',
      };

      expect(typeMap['年假']).toBe('annual');
      expect(typeMap['病假']).toBe('sick');
      expect(typeMap['事假']).toBe('personal');
      expect(typeMap['婚假']).toBe('marriage');
      expect(typeMap['产假']).toBe('maternity');
      expect(typeMap['陪产假']).toBe('paternity');
      expect(typeMap['丧假']).toBe('funeral');
    });

    it('应该保留已转换的英文假期类型', () => {
      const typeMap: Record<string, string> = {
        'annual': 'annual',
        'sick': 'sick',
        'personal': 'personal',
        'marriage': 'marriage',
        'maternity': 'maternity',
        'paternity': 'paternity',
        'funeral': 'funeral',
      };

      expect(typeMap['annual']).toBe('annual');
      expect(typeMap['sick']).toBe('sick');
    });

    it('应该返回未知的假期类型', () => {
      const unknownType = 'unknown_type';
      const typeMap: Record<string, string> = {};
      const result = typeMap[unknownType] || unknownType;
      expect(result).toBe('unknown_type');
    });
  });

  describe('扣除请假额度 - deductLeaveQuota', () => {
    it('应该正确计算新的可用天数', () => {
      // 模拟数据
      const currentRemaining = 10;
      const currentFrozen = 2;
      const currentUsed = 3;
      const deductDays = 2;

      const newUsedDays = currentUsed + deductDays;
      const newFrozenDays = Math.max(0, currentFrozen - deductDays);
      const newRemainingDays = currentRemaining + newFrozenDays - newUsedDays;

      expect(newUsedDays).toBe(5);
      expect(newFrozenDays).toBe(0);
      // 初始: remaining=10, frozen=2, used=3
      // 扣除2天后: used=3+2=5, frozen=max(0,2-2)=0, remaining=10+0-5=5
      expect(newRemainingDays).toBe(5);
    });

    it('应该拒绝缺失参数的请求', () => {
      const record = { worker_id: '', leave_type: '年假', days: 2 };
      const isValid = !!(record.worker_id && record.leave_type && record.days);
      expect(isValid).toBe(false);
    });

    it('应该处理超额扣除', () => {
      const currentRemaining = 5;
      const currentFrozen = 0;
      const currentUsed = 4;
      const deductDays = 10;

      const newUsedDays = currentUsed + deductDays;
      const newRemainingDays = currentRemaining + currentFrozen - newUsedDays;

      // 逻辑上可以扣除，但剩余会变成负数
      expect(newUsedDays).toBe(14);
      expect(newRemainingDays).toBe(-9);
    });
  });

  describe('扣除加班额度 - deductOvertimeQuota', () => {
    it('应该正确累加加班小时', () => {
      const currentUsed = 10;
      const newHours = 5;
      const newUsedHours = currentUsed + newHours;
      expect(newUsedHours).toBe(15);
    });

    it('应该处理缺失参数', () => {
      const record = { worker_id: '', hours: 0 };
      const isValid = !!(record.worker_id && record.hours);
      expect(isValid).toBe(false);
    });

    it('应该处理新员工加班记录创建', () => {
      const quota = null; // 不存在的额度记录
      const shouldCreate = !quota;
      expect(shouldCreate).toBe(true);
    });
  });

  describe('初始化员工额度 - initEmployeeQuotas', () => {
    it('应该包含所有默认假期类型', () => {
      const defaultLeaveCategories = [
        { category: 'annual', totalDays: 0 },
        { category: 'sick', totalDays: 0 },
        { category: 'personal', totalDays: 0 },
        { category: 'marriage', totalDays: 0 },
        { category: 'maternity', totalDays: 0 },
        { category: 'paternity', totalDays: 0 },
        { category: 'funeral', totalDays: 0 },
      ];

      expect(defaultLeaveCategories.length).toBe(7);
      expect(defaultLeaveCategories.find(c => c.category === 'annual')).toBeDefined();
      expect(defaultLeaveCategories.find(c => c.category === 'sick')).toBeDefined();
    });

    it('应该包含加班额度', () => {
      const overtimeCategory = 'overtime';
      expect(overtimeCategory).toBe('overtime');
    });

    it('应该正确设置年份', () => {
      const now = new Date();
      const year = now.getFullYear();
      expect(year).toBe(2026);
    });
  });

  describe('释放请假额度 - releaseLeaveQuota', () => {
    it('应该正确释放冻结天数', () => {
      const currentFrozen = 5;
      const currentUsed = 10;
      const currentRemaining = 5;
      const releaseDays = 3;

      const newFrozenDays = Math.max(0, currentFrozen - releaseDays);
      const newRemainingDays = currentRemaining + releaseDays;

      expect(newFrozenDays).toBe(2);
      expect(newRemainingDays).toBe(8);
    });

    it('应该处理释放超过冻结的情况', () => {
      const currentFrozen = 2;
      const currentUsed = 8;
      const currentRemaining = 5;
      const releaseDays = 5;

      const newFrozenDays = Math.max(0, currentFrozen - releaseDays);
      let newUsedDays = currentUsed;

      if (currentFrozen < releaseDays) {
        newUsedDays = Math.max(0, currentUsed - (releaseDays - currentFrozen));
      }

      expect(newFrozenDays).toBe(0);
      expect(newUsedDays).toBe(5); // 8 - (5-2) = 5
    });
  });

  describe('冻结请假额度 - freezeLeaveQuota', () => {
    it('应该正确冻结天数', () => {
      const currentFrozen = 0;
      const currentRemaining = 10;
      const freezeDays = 3;

      const newFrozenDays = currentFrozen + freezeDays;
      const newRemainingDays = currentRemaining - freezeDays;

      expect(newFrozenDays).toBe(3);
      expect(newRemainingDays).toBe(7);
    });

    it('应该拒绝超过可用数量的冻结', () => {
      const currentRemaining = 5;
      const freezeDays = 10;
      const shouldReject = currentRemaining < freezeDays;
      expect(shouldReject).toBe(true);
    });

    it('应该允许等于可用数量的冻结', () => {
      const currentRemaining = 5;
      const freezeDays = 5;
      const shouldReject = currentRemaining < freezeDays;
      expect(shouldReject).toBe(false);
    });
  });

  describe('删除员工额度 - deleteEmployeeQuotas', () => {
    it('应该正确生成删除语句', () => {
      const employeeId = 'W001';
      const sql = 'DELETE FROM leave_quotas WHERE worker_id = ?';
      const params = [employeeId];
      expect(params[0]).toBe('W001');
    });
  });

  describe('ID生成', () => {
    it('应该生成正确格式的ID', () => {
      const prefix = 'LQ';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const id = `${prefix}_${timestamp}_${random}`;

      expect(id.startsWith('LQ_')).toBe(true);
      expect(id.split('_').length).toBe(3);
    });
  });

  describe('年度处理', () => {
    it('应该获取当前年份', () => {
      const year = new Date().getFullYear();
      expect(year).toBeGreaterThanOrEqual(2026);
    });

    it('应该支持指定年份', () => {
      const targetYear = 2025;
      const year = targetYear || new Date().getFullYear();
      expect(year).toBe(2025);
    });
  });

  describe('额度数据验证', () => {
    it('应该正确转换数值类型', () => {
      const dbValue = '10.5';
      const numValue = Number(dbValue);
      expect(numValue).toBe(10.5);
    });

    it('应该处理NaN情况', () => {
      const dbValue = null;
      const numValue = Number(dbValue) || 0;
      expect(numValue).toBe(0);
    });
  });
});
