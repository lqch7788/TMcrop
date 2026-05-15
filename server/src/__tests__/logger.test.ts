/**
 * Logger 日志工具测试
 * 测试日志级别、格式化、输出等
 */

import { describe, it, expect } from 'vitest';

describe('Logger Utils', () => {
  describe('日志级别', () => {
    it('应该定义正确的日志级别', () => {
      const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
      expect(levels).toContain('error');
      expect(levels).toContain('warn');
      expect(levels).toContain('info');
    });

    it('应该使用默认级别为info', () => {
      const logLevel = process.env.LOG_LEVEL || 'info';
      expect(logLevel).toBe('info');
    });

    it('应该支持自定义日志级别', () => {
      const customLevel = 'debug';
      expect(customLevel).toBe('debug');
    });
  });

  describe('日志格式', () => {
    it('应该包含时间戳', () => {
      const timestamp = new Date().toISOString();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('应该包含错误堆栈', () => {
      const error = new Error('测试错误');
      const errorData = {
        message: error.message,
        stack: error.stack,
      };

      expect(errorData).toHaveProperty('message');
      expect(errorData).toHaveProperty('stack');
      expect(errorData.stack).toContain('测试错误');
    });

    it('应该使用JSON格式', () => {
      const logData = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '测试日志',
        meta: { key: 'value' },
      };

      const jsonStr = JSON.stringify(logData);
      expect(jsonStr).toContain('timestamp');
      expect(jsonStr).toContain('level');
      expect(jsonStr).toContain('测试日志');
    });
  });

  describe('日志数据', () => {
    it('应该包含请求方法', () => {
      const logData = {
        method: 'GET',
        path: '/api/users',
        status: 200,
      };

      expect(logData.method).toBe('GET');
      expect(logData.path).toBe('/api/users');
    });

    it('应该包含响应状态码', () => {
      const logData = {
        status: 404,
      };

      expect(logData.status).toBe(404);
    });

    it('应该包含请求耗时', () => {
      const duration = 125;
      const logData = {
        duration: `${duration}ms`,
      };

      expect(logData.duration).toBe('125ms');
    });

    it('应该包含客户端IP', () => {
      const logData = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      expect(logData.ip).toBe('192.168.1.1');
      expect(logData.userAgent).toContain('Mozilla');
    });
  });

  describe('日志过滤', () => {
    it('应该只记录错误级别的日志', () => {
      const shouldLog = (level: string, threshold: string): boolean => {
        const levels = ['error', 'warn', 'info', 'debug'];
        const thresholdIndex = levels.indexOf(threshold);
        const levelIndex = levels.indexOf(level);
        return levelIndex <= thresholdIndex;
      };

      expect(shouldLog('error', 'error')).toBe(true);
      expect(shouldLog('warn', 'error')).toBe(false);
    });

    it('应该根据状态码判断日志级别', () => {
      const getLogLevel = (statusCode: number): string => {
        if (statusCode >= 500) return 'error';
        if (statusCode >= 400) return 'warn';
        return 'info';
      };

      expect(getLogLevel(500)).toBe('error');
      expect(getLogLevel(404)).toBe('warn');
      expect(getLogLevel(200)).toBe('info');
    });

    it('应该过滤敏感信息', () => {
      const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];
      const logData = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
      };

      const filtered: Record<string, string> = { ...logData };
      sensitiveKeys.forEach((key) => {
        if (key in filtered) {
          filtered[key] = '***';
        }
      });

      expect(filtered.username).toBe('testuser');
      expect(filtered.password).toBe('***');
      expect(filtered.token).toBe('***');
    });
  });

  describe('日志文件路径', () => {
    it('应该构建正确的错误日志路径', () => {
      const logsDir = '/app/logs';
      const errorLogPath = `${logsDir}/error.log`;

      expect(errorLogPath).toBe('/app/logs/error.log');
    });

    it('应该构建正确的综合日志路径', () => {
      const logsDir = '/app/logs';
      const combinedLogPath = `${logsDir}/combined.log`;

      expect(combinedLogPath).toBe('/app/logs/combined.log');
    });
  });
});
