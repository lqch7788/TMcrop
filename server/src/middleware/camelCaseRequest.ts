/**
 * 请求体 camelCase 转换中间件
 * 2026-06-13 新建
 *
 * 把 req.body 的所有外层字段从 snake_case 转 camelCase，使后端路由可统一用 camelCase
 * 处理请求（与响应 camelCaseResponseMiddleware 对称）。
 *
 * 设计：嵌套对象也递归转。req.body 不存在时跳过。
 */
import { Request, Response, NextFunction } from 'express';

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

function convert(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(convert);
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;

  const result: any = {};
  for (const k of Object.keys(value)) {
    const camel = toCamel(k);
    result[camel] = convert(value[k]);
  }
  return result;
}

export function camelCaseRequestMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = convert(req.body);
  }
  next();
}

export default camelCaseRequestMiddleware;
