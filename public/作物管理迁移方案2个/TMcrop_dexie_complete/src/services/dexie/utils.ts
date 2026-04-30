/**
 * Dexie.js 工具函数
 * 提供分页查询、搜索过滤、排序等通用功能
 * 第三种存储实现配套工具
 */

import { Table } from 'dexie';

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询结果
 */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Dexie 表通用分页查询
 * @param table Dexie 表实例
 * @param query 基础查询（Collection）
 * @param params 分页参数
 */
export async function paginate<T>(
  table: Table<T, string>,
  query: any,
  params: PaginationParams = {}
): Promise<PaginationResult<T>> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 50);

  // 先查总数
  const total = await query.count();

  // 再查分页数据
  const data = await query
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 对 Dexie 查询结果进行内存搜索过滤
 * 用于复杂字段匹配（多字段模糊搜索）
 */
export function filterByKeyword<T>(
  items: T[],
  keyword: string,
  fields: Array<keyof T>
): T[] {
  if (!keyword || keyword.trim() === '') return items;
  const lower = keyword.toLowerCase().trim();

  return items.filter(item =>
    fields.some(field => {
      const val = item[field];
      if (val == null) return false;
      return String(val).toLowerCase().includes(lower);
    })
  );
}

/**
 * 对 Dexie 查询结果进行内存范围过滤（日期/数值）
 */
export function filterByRange<T>(
  items: T[],
  field: keyof T,
  min?: string | number,
  max?: string | number
): T[] {
  if (min == null && max == null) return items;

  return items.filter(item => {
    const val = item[field];
    if (val == null) return false;

    if (min != null && val < min) return false;
    if (max != null && val > max) return false;
    return true;
  });
}

/**
 * 对 Dexie 查询结果进行内存精确匹配过滤
 */
export function filterByField<T>(
  items: T[],
  field: keyof T,
  value: any
): T[] {
  if (value == null || value === '') return items;
  return items.filter(item => item[field] === value);
}

/**
 * 多字段排序（支持字符串、数值、日期）
 */
export function sortBy<T>(
  items: T[],
  field: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  const sorted = [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];

    if (av == null && bv == null) return 0;
    if (av == null) return order === 'asc' ? -1 : 1;
    if (bv == null) return order === 'asc' ? 1 : -1;

    if (typeof av === 'number' && typeof bv === 'number') {
      return order === 'asc' ? av - bv : bv - av;
    }

    const as = String(av);
    const bs = String(bv);
    return order === 'asc' ? as.localeCompare(bs, 'zh-CN') : bs.localeCompare(as, 'zh-CN');
  });
  return sorted;
}

/**
 * 生成时间戳字符串（与 LocalStorage 实现保持一致）
 */
export function nowString(): string {
  return new Date().toLocaleString('zh-CN');
}

/**
 * 生成 ID 前缀 + 时间戳
 */
export function generateId(prefix: string): string {
  return `${prefix}${Date.now()}`;
}
