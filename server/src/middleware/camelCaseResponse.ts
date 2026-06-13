/**
 * 统一响应 camelCase 转换中间件
 * 2026-06-13 新建
 *
 * 把 res.json 写入的 {success, data, meta, ...} 内的对象自动转 camelCase。
 * 解决：seed source 等 controller 用 stmt.getAsObject() 直接返回 snake_case
 * 字段，导致前端读不到 seedCode/remainingQuantity 等 camelCase 字段。
 *
 * 性能：单次 JSON 序列化前做一次浅/深转换，开销可忽略。
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

export function camelCaseResponseMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = function (body: any): Response {
    if (body && typeof body === 'object') {
      // 仅在 success / error / data / meta / list / items / total 包装下转换
      // 避免破坏流式响应或大文件
      body = convert(body);
    }
    return originalJson(body);
  };
  next();
}

export default camelCaseResponseMiddleware;
