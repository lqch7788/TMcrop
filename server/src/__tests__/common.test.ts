/**
 * 通用工具函数测试
 * 测试日期处理、字符串处理、数据转换等工具函数
 */

import { describe, it, expect } from 'vitest';

describe('Common Utils', () => {
  describe('日期处理', () => {
    it('应该格式化日期为 YYYY-MM-DD', () => {
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      expect(formatDate(new Date('2026-05-08'))).toBe('2026-05-08');
      expect(formatDate(new Date('2026-1-1'))).toBe('2026-01-01');
    });

    it('应该格式化时间为 HH:mm:ss', () => {
      const formatTime = (date: Date): string => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      };

      expect(formatTime(new Date('2026-05-08 10:30:45'))).toBe('10:30:45');
    });

    it('应该获取当前时间戳', () => {
      const now = Date.now();
      expect(typeof now).toBe('number');
      expect(now).toBeGreaterThan(0);
    });

    it('应该验证日期格式', () => {
      const isValidDateFormat = (str: string): boolean => {
        return /^\d{4}-\d{2}-\d{2}$/.test(str);
      };

      expect(isValidDateFormat('2026-05-08')).toBe(true);
      expect(isValidDateFormat('2026-5-8')).toBe(false);
      expect(isValidDateFormat('2026/05/08')).toBe(false);
    });

    it('应该验证日期有效性', () => {
      const isValidDate = (str: string): boolean => {
        const date = new Date(str);
        return !isNaN(date.getTime());
      };

      expect(isValidDate('2026-05-08')).toBe(true);
      expect(isValidDate('2026-02-30')).toBe(true); // JS会修正为3月2日
    });
  });

  describe('字符串处理', () => {
    it('应该转驼峰命名', () => {
      const toCamelCase = (str: string): string => {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      };

      expect(toCamelCase('worker_name')).toBe('workerName');
      expect(toCamelCase('created_at')).toBe('createdAt');
      expect(toCamelCase('my_test_value')).toBe('myTestValue');
    });

    it('应该转下划线命名', () => {
      const toSnakeCase = (str: string): string => {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      };

      expect(toSnakeCase('workerName')).toBe('worker_name');
      expect(toSnakeCase('createdAt')).toBe('created_at');
    });

    it('应该转首字母大写', () => {
      const capitalize = (str: string): string => {
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('worker')).toBe('Worker');
    });

    it('应该截断字符串', () => {
      const truncate = (str: string, maxLength: number): string => {
        if (str.length <= maxLength) return str;
        return str.slice(0, maxLength) + '...';
      };

      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('应该去除首尾空白', () => {
      const trim = '  hello  '.trim();
      expect(trim).toBe('hello');
    });
  });

  describe('数字处理', () => {
    it('应该保留小数位', () => {
      const toFixed = (num: number, decimals: number): string => {
        return num.toFixed(decimals);
      };

      expect(toFixed(3.14159, 2)).toBe('3.14');
      expect(toFixed(3.1, 2)).toBe('3.10');
    });

    it('应该四舍五入', () => {
      const round = (num: number): number => {
        return Math.round(num);
      };

      expect(round(3.5)).toBe(4);
      expect(round(3.4)).toBe(3);
    });

    it('应该格式化货币', () => {
      const formatCurrency = (amount: number): string => {
        return `¥${amount.toFixed(2)}`;
      };

      expect(formatCurrency(100)).toBe('¥100.00');
      expect(formatCurrency(99.9)).toBe('¥99.90');
    });

    it('应该限制数字范围', () => {
      const clamp = (num: number, min: number, max: number): number => {
        return Math.min(Math.max(num, min), max);
      };

      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('数组处理', () => {
    it('应该去除重复项', () => {
      const unique = (arr: any[]): any[] => {
        return [...new Set(arr)];
      };

      expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
    });

    it('应该分页数组', () => {
      const paginate = <T>(arr: T[], page: number, limit: number): T[] => {
        const start = (page - 1) * limit;
        return arr.slice(start, start + limit);
      };

      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(paginate(arr, 1, 3)).toEqual([1, 2, 3]);
      expect(paginate(arr, 2, 3)).toEqual([4, 5, 6]);
    });

    it('应该分组数组', () => {
      const groupBy = <T>(arr: T[], key: keyof T): Record<string, T[]> => {
        return arr.reduce((result, item) => {
          const groupKey = String(item[key]);
          if (!result[groupKey]) {
            result[groupKey] = [];
          }
          result[groupKey].push(item);
          return result;
        }, {} as Record<string, T[]>);
      };

      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const grouped = groupBy(items, 'type');
      expect(grouped['a']).toHaveLength(2);
      expect(grouped['b']).toHaveLength(1);
    });
  });

  describe('对象处理', () => {
    it('应该浅拷贝对象', () => {
      const obj = { a: 1, b: 2 };
      const copy = { ...obj };
      copy.a = 10;

      expect(copy.a).toBe(10);
      expect(obj.a).toBe(1);
    });

    it('应该深度拷贝对象', () => {
      const deepClone = <T>(obj: T): T => {
        return JSON.parse(JSON.stringify(obj));
      };

      const obj = { a: 1, b: { c: 2 } };
      const copy = deepClone(obj);
      copy.b.c = 10;

      expect(obj.b.c).toBe(2);
      expect(copy.b.c).toBe(10);
    });

    it('应该pick指定字段', () => {
      const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
        const result = {} as Pick<T, K>;
        keys.forEach((key) => {
          if (key in obj) {
            result[key] = obj[key];
          }
        });
        return result;
      };

      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('应该omit指定字段', () => {
      const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
        const result = { ...obj };
        keys.forEach((key) => {
          delete result[key];
        });
        return result as Omit<T, K>;
      };

      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('验证函数', () => {
    it('应该验证邮箱', () => {
      const isEmail = (str: string): boolean => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
      };

      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('invalid.email')).toBe(false);
    });

    it('应该验证手机号', () => {
      const isPhone = (str: string): boolean => {
        return /^1[3-9]\d{9}$/.test(str);
      };

      expect(isPhone('13812345678')).toBe(true);
      expect(isPhone('12345678901')).toBe(false);
    });

    it('应该验证必填', () => {
      const isRequired = (value: any): boolean => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
      };

      expect(isRequired('hello')).toBe(true);
      expect(isRequired('')).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
    });

    it('应该验证数字范围', () => {
      const inRange = (num: number, min: number, max: number): boolean => {
        return num >= min && num <= max;
      };

      expect(inRange(5, 1, 10)).toBe(true);
      expect(inRange(0, 1, 10)).toBe(false);
      expect(inRange(15, 1, 10)).toBe(false);
    });
  });

  describe('SQL注入防护', () => {
    it('应该转义特殊字符', () => {
      const escapeSql = (str: string): string => {
        return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
      };

      expect(escapeSql("test'value")).toBe("test''value");
      expect(escapeSql('test\\value')).toBe('test\\\\value');
    });

    it('应该使用参数化查询', () => {
      const buildParamQuery = (table: string, conditions: string[]): string => {
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return `SELECT * FROM ${table} ${where}`;
      };

      const sql = buildParamQuery('users', ['name = ?', 'status = ?']);
      expect(sql).toBe('SELECT * FROM users WHERE name = ? AND status = ?');
    });
  });
});
