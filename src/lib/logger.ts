/**
 * 应用日志工具
 * 提供统一的日志记录接口，支持不同级别的日志输出
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

/**
 * 格式化日志输出
 */
function formatLog(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

/**
 * 日志记录器
 * 生产环境可扩展为发送到日志服务
 */
export const logger = {
  info: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.info(formatLog('info', message, data));
    }
  },

  warn: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.warn(formatLog('warn', message, data));
    }
  },

  error: (message: string, data?: unknown) => {
    // error级别在生产环境也应记录，可扩展为发送到错误追踪服务
    console.error(formatLog('error', message, data));
  },

  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(formatLog('debug', message, data));
    }
  },
};
