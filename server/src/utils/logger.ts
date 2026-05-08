/**
 * Winston 日志工具
 * 结构化日志记录
 */

import winston from 'winston';
import path from 'path';

// 确保 logs 目录存在
const logsDir = path.join(__dirname, '../../logs');
import fs from 'fs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 控制台输出（开发环境使用彩色格式）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    // 综合日志文件
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    }),
  ],
});
