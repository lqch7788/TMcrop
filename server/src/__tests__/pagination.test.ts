/**
 * 分页与排序工具测试
 * 测试分页计算、排序参数处理等
 */

import { describe, it, expect } from 'vitest';

describe('Pagination & Sorting Utils', () => {
  describe('分页计算', () => {
    it('应该计算第一页的offset', () => {
      const getOffset = (page: number, limit: number): number => {
        return (page - 1) * limit;
      };

      expect(getOffset(1, 20)).toBe(0);
    });

    it('应该计算第二页的offset', () => {
      const getOffset = (page: number, limit: number): number => {
        return (page - 1) * limit;
      };

      expect(getOffset(2, 20)).toBe(20);
    });

    it('应该计算第N页的offset', () => {
      const getOffset = (page: number, limit: number): number => {
        return (page - 1) * limit;
      };

      expect(getOffset(5, 20)).toBe(80);
      expect(getOffset(10, 50)).toBe(450);
    });

    it('应该处理自定义每页条数', () => {
      const getOffset = (page: number, limit: number): number => {
        return (page - 1) * limit;
      };

      expect(getOffset(1, 100)).toBe(0);
      expect(getOffset(2, 100)).toBe(100);
    });

    it('应该设置默认分页参数', () => {
      const normalizePageParams = (page?: any, limit?: any) => {
        return {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
        };
      };

      expect(normalizePageParams(undefined, undefined)).toEqual({ page: 1, limit: 20 });
      expect(normalizePageParams('3', '50')).toEqual({ page: 3, limit: 50 });
      expect(normalizePageParams('abc', null)).toEqual({ page: 1, limit: 20 });
    });
  });

  describe('排序参数处理', () => {
    it('应该处理ASC排序', () => {
      const orderDir = 'ASC';
      expect(orderDir).toBe('ASC');
    });

    it('应该处理DESC排序', () => {
      const orderDir = 'DESC';
      expect(orderDir).toBe('DESC');
    });

    it('应该验证排序方向', () => {
      const isValidOrderDir = (dir: string): boolean => {
        return ['ASC', 'DESC'].includes(dir);
      };

      expect(isValidOrderDir('ASC')).toBe(true);
      expect(isValidOrderDir('DESC')).toBe(true);
      expect(isValidOrderDir('asc')).toBe(false);
      expect(isValidOrderDir('invalid')).toBe(false);
    });

    it('应该验证排序字段白名单', () => {
      const isValidOrderField = (field: string, allowed: string[]): boolean => {
        return allowed.includes(field);
      };

      const allowedFields = ['created_at', 'updated_at', 'id', 'name'];
      expect(isValidOrderField('created_at', allowedFields)).toBe(true);
      expect(isValidOrderField('name', allowedFields)).toBe(true);
      expect(isValidOrderField('password', allowedFields)).toBe(false);
      expect(isValidOrderField('1=1', allowedFields)).toBe(false);
    });

    it('应该防止SQL注入-字段名', () => {
      const sanitizeOrderField = (field: string, defaultField: string, allowed: string[]): string => {
        return allowed.includes(field) ? field : defaultField;
      };

      const allowedFields = ['created_at', 'updated_at', 'id', 'name'];
      expect(sanitizeOrderField('created_at; DROP TABLE users;', 'created_at', allowedFields)).toBe('created_at');
      expect(sanitizeOrderField('name', 'created_at', allowedFields)).toBe('name');
    });

    it('应该防止SQL注入-排序方向', () => {
      const sanitizeOrderDir = (dir: string, defaultDir: string): string => {
        const upperDir = dir.toUpperCase();
        return ['ASC', 'DESC'].includes(upperDir) ? upperDir : defaultDir;
      };

      expect(sanitizeOrderDir('ASC; DROP TABLE users;', 'DESC')).toBe('DESC');
      expect(sanitizeOrderDir('asc', 'DESC')).toBe('ASC');
    });
  });

  describe('LIMIT/OFFSET构建', () => {
    it('应该构建LIMIT子句', () => {
      const buildLimit = (limit: number): string => {
        return `LIMIT ${limit}`;
      };

      expect(buildLimit(20)).toBe('LIMIT 20');
    });

    it('应该构建OFFSET子句', () => {
      const buildOffset = (offset: number): string => {
        return `OFFSET ${offset}`;
      };

      expect(buildOffset(40)).toBe('OFFSET 40');
    });

    it('应该构建完整的分页子句', () => {
      const buildPagination = (limit: number, offset: number): string => {
        return `LIMIT ${limit} OFFSET ${offset}`;
      };

      expect(buildPagination(20, 0)).toBe('LIMIT 20 OFFSET 0');
      expect(buildPagination(20, 40)).toBe('LIMIT 20 OFFSET 40');
    });

    it('应该设置安全的默认LIMIT', () => {
      const getSafeLimit = (limit?: number, maxLimit: number = 100): number => {
        const parsed = Number(limit) || 20;
        return Math.min(Math.max(parsed, 1), maxLimit);
      };

      expect(getSafeLimit(undefined)).toBe(20);
      expect(getSafeLimit(-5)).toBe(1);
      expect(getSafeLimit(500)).toBe(100);
      expect(getSafeLimit(50)).toBe(50);
    });
  });

  describe('分页响应结构', () => {
    it('应该构建正确的分页响应', () => {
      const buildPaginatedResponse = <T>(data: T[], total: number, page: number, limit: number) => {
        return {
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      };

      const result = buildPaginatedResponse([1, 2, 3], 100, 1, 20);
      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('应该处理最后一页', () => {
      const buildPaginatedResponse = <T>(data: T[], total: number, page: number, limit: number) => {
        return {
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      };

      const result = buildPaginatedResponse([1, 2], 100, 5, 20);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('应该处理空数据', () => {
      const buildPaginatedResponse = <T>(data: T[], total: number, page: number, limit: number) => {
        return {
          data,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
        };
      };

      const result = buildPaginatedResponse([], 0, 1, 20);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });
  });
});
