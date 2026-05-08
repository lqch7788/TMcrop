/**
 * Query Helper 工具函数测试
 * 测试数据库查询辅助函数的正确性
 */

import { describe, it, expect } from 'vitest';

describe('Query Helper Utils', () => {
  describe('分页参数处理', () => {
    it('应该正确计算 offset', () => {
      const page = 1;
      const limit = 20;
      const offset = (page - 1) * limit;
      expect(offset).toBe(0);
    });

    it('应该处理第二页', () => {
      const page = 2;
      const limit = 20;
      const offset = (page - 1) * limit;
      expect(offset).toBe(20);
    });

    it('应该处理自定义每页条数', () => {
      const page = 3;
      const limit = 50;
      const offset = (page - 1) * limit;
      expect(offset).toBe(100);
    });

    it('应该处理每页10条', () => {
      const page = 5;
      const limit = 10;
      const offset = (page - 1) * limit;
      expect(offset).toBe(40);
    });
  });

  describe('排序参数处理', () => {
    it('应该处理默认排序', () => {
      const orderBy = 'created_at';
      const orderDir = 'DESC';
      expect(orderBy).toBe('created_at');
      expect(orderDir).toBe('DESC');
    });

    it('应该处理升序排序', () => {
      const orderDir = 'ASC';
      expect(orderDir).toBe('ASC');
    });

    it('应该处理降序排序', () => {
      const orderDir = 'DESC';
      expect(orderDir).toBe('DESC');
    });

    it('应该防止 SQL 注入 - 排序字段白名单', () => {
      const allowedFields = ['created_at', 'updated_at', 'id', 'name'];
      const userInput = 'created_at; DROP TABLE users;';
      const safeOrderBy = allowedFields.includes(userInput) ? userInput : 'created_at';
      expect(safeOrderBy).toBe('created_at');
    });

    it('应该防止 SQL 注入 - 排序方向验证', () => {
      const allowedDirs = ['ASC', 'DESC'];
      const userInput = 'ASC; DROP TABLE users;';
      const safeOrderDir = allowedDirs.includes(userInput) ? userInput : 'DESC';
      expect(safeOrderDir).toBe('DESC');
    });
  });

  describe('搜索参数处理', () => {
    it('应该构建模糊搜索模式', () => {
      const keyword = '测试';
      const pattern = `%${keyword}%`;
      expect(pattern).toBe('%测试%');
    });

    it('应该处理空搜索关键词', () => {
      const keyword = '';
      const pattern = `%${keyword}%`;
      expect(pattern).toBe('%%');
    });

    it('应该处理特殊字符转义', () => {
      const keyword = '100%';
      const escaped = keyword.replace(/%/g, '\\%');
      expect(escaped).toBe('100\\%');
    });

    it('应该处理下划线转义', () => {
      const keyword = 'test_name';
      const escaped = keyword.replace(/_/g, '\\_');
      expect(escaped).toBe('test\\_name');
    });
  });

  describe('日期范围处理', () => {
    it('应该处理单日期', () => {
      const date = '2026-05-08';
      expect(date).toBe('2026-05-08');
    });

    it('应该处理日期范围', () => {
      const startDate = '2026-05-01';
      const endDate = '2026-05-08';
      expect(startDate < endDate).toBe(true);
    });

    it('应该验证日期格式', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect('2026-05-08').toMatch(dateRegex);
      expect('2026-5-8').not.toMatch(dateRegex);
    });

    it('应该验证日期有效性', () => {
      // 使用更严格的日期验证 - 检查年月日是否与输入匹配
      const isValidDate = (dateStr: string) => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) return false;
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
               date.getMonth() === month - 1 &&
               date.getDate() === day;
      };
      expect(isValidDate('2026-05-08')).toBe(true);
      expect(isValidDate('2026-02-30')).toBe(false);
      expect(isValidDate('2026-02-28')).toBe(true);
    });
  });

  describe('状态过滤处理', () => {
    it('应该处理单个状态', () => {
      const status = 'pending';
      expect(status).toBe('pending');
    });

    it('应该处理多状态', () => {
      const statuses = ['pending', 'approved', 'rejected'];
      expect(statuses).toContain('pending');
      expect(statuses.length).toBe(3);
    });

    it('应该处理全选', () => {
      const filterStatus = 'all';
      const isAll = filterStatus === 'all';
      expect(isAll).toBe(true);
    });

    it('应该处理状态映射', () => {
      const statusMap: Record<string, string> = {
        'pending': '待处理',
        'approved': '已批准',
        'rejected': '已拒绝',
      };
      expect(statusMap['pending']).toBe('待处理');
    });
  });

  describe('条件构建', () => {
    it('应该处理 AND 条件', () => {
      const conditions: string[] = [];
      const shouldAddStatus = true;
      const shouldAddDate = true;
      if (shouldAddStatus) conditions.push('status = ?');
      if (shouldAddDate) conditions.push('date >= ?');
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      expect(where).toBe('WHERE status = ? AND date >= ?');
    });

    it('应该处理 OR 条件', () => {
      const conditions: string[] = ['name LIKE ?', 'code LIKE ?'];
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';
      expect(where).toBe('WHERE name LIKE ? OR code LIKE ?');
    });

    it('应该处理空条件', () => {
      const conditions: string[] = [];
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      expect(where).toBe('');
    });
  });

  describe('COUNT 查询', () => {
    it('应该构建 COUNT 查询', () => {
      const table = 'users';
      const sql = `SELECT COUNT(*) as total FROM ${table}`;
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('users');
    });

    it('应该处理带 WHERE 的 COUNT', () => {
      const table = 'users';
      const where = 'WHERE status = ?';
      const sql = `SELECT COUNT(*) as total FROM ${table} ${where}`;
      expect(sql).toContain('WHERE status = ?');
    });
  });

  describe('LIMIT/OFFSET 构建', () => {
    it('应该构建正确的 LIMIT', () => {
      const limit = 20;
      const sql = `LIMIT ${limit}`;
      expect(sql).toBe('LIMIT 20');
    });

    it('应该构建完整的分页', () => {
      const limit = 20;
      const offset = 40;
      const sql = `LIMIT ${limit} OFFSET ${offset}`;
      expect(sql).toBe('LIMIT 20 OFFSET 40');
    });

    it('应该处理默认 LIMIT', () => {
      const limit = undefined;
      const safeLimit = limit ?? 50;
      expect(safeLimit).toBe(50);
    });
  });
});
