/**
 * 2026-07-18 P2-M8：项目级常量集中管理（统一 LIMIT 等 magic numbers）
 */

/** 列表查询默认上限（GET /:resource 默认 limit） */
export const DEFAULT_LIST_LIMIT = 100;

/** 列表查询硬上限（前端可传但不能超过） */
export const MAX_LIST_LIMIT = 10000;

/** 批量操作上限（如批量删除、批量插入） */
export const MAX_BATCH_DELETE = 500;

/** 统计聚合上限（防 N+1 / 防爆栈） */
export const MAX_AGGREGATE_LIMIT = 200;

/** pest-records 路由相关 */
export const PEST_RECORDS = {
  DEFAULT_LIMIT: DEFAULT_LIST_LIMIT,
  MAX_LIMIT: MAX_LIST_LIMIT,
  BATCH_DELETE_LIMIT: MAX_BATCH_DELETE,
  FERTILIZER_STATS_LIMIT: MAX_AGGREGATE_LIMIT,
} as const;