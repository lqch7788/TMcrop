/**
 * 分页大小 Hook — V3.0 Phase 5
 *
 * 从系统配置读取表格默认分页大小 'ui.table.default-page-size'
 * 支持运行时动态变更（Store更新后自动重渲染）
 */

import { useSystemConfigValueNumber } from './useSystemConfigValue';

/** 默认分页大小兜底值 */
const PAGE_SIZE_FALLBACK = 20;

/**
 * 获取当前系统分页大小
 * @param fallback - 配置缺失时的兜底值（默认 20）
 * @returns 分页大小数字
 */
export function usePageSize(fallback: number = PAGE_SIZE_FALLBACK): number {
  return useSystemConfigValueNumber('ui.table.default-page-size', fallback);
}
