/**
 * 审计日志业务类型枚举（v2 设计文档 §3.1）
 * 所有 audit_logs.business_type 必须从此枚举取，禁止魔法字符串
 */

export type AuditBusinessType =
  // 实体级（entityHistory.queryEntityHistory 已支持）
  | 'seed_source'
  | 'seedling'
  | 'planting'
  // 实体子操作
  | 'seed_source.propagation'
  | 'seed_source.print'
  | 'seed_source.status_change'
  | 'seedling.propagation'
  | 'seedling.transplant'
  | 'seedling.print'
  | 'seedling.daily_record'
  | 'planting.move'
  | 'planting.daily_record'
  | 'planting.breeding'
  | 'planting.seed_saving'
  | 'planting.end'
  | 'planting.create'
  | 'planting.update'
  | 'planting.delete'
  | 'seedling.create'
  | 'seedling.update'
  | 'seedling.delete'
  // 库存级
  | 'inventory_stock.create'
  | 'inventory_stock.update'
  | 'inventory_stock.delete';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'daily_record_change'
  | 'move'
  | 'print'
  | 'propagation'
  | 'breeding'
  | 'seed_saving'
  | 'transplant'
  | 'decrease_available'
  | 'propagation_stage'
  | 'complete_propagation'
  | 'end'
  | 'harvest_create'
  | 'harvest_update'
  | 'harvest_delete';