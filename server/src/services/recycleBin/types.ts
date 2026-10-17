/**
 * 作物管理通用回收站 —— 类型定义
 *
 * 设计：中心归档表 + 实体处理器（Registry）。
 * - 通用层只负责归档、列表、权限、状态、审计；
 * - 每类实体的快照抓取与恢复逻辑收敛到 RecycleHandler，避免删除页各自实现。
 */
import type { Database } from 'sql.js';

/** 删除时抓取的快照与联动数据 */
export interface RecycleCapture {
  /** 业务单号（ZY.../YM.../ZZ...），用于回收站列表展示与检索 */
  entityCode: string;
  /** 列表展示摘要（如「草莓 / 红颜 / 10 株」） */
  displayName: string;
  /** 主表整行（snake_case，恢复时按列原样写回） */
  snapshot: Record<string, unknown>;
  /** 删除时被联动修改/删除的关联行（恢复时需要写回） */
  dependencies?: Array<{ table: string; rows: Record<string, unknown>[] }>;
  /** 恢复所需的附加信息（如每日记录同步扣减的库存明细） */
  restoreInfo?: Record<string, unknown>;
}

/** 恢复时的操作人信息 */
export interface RecycleOperator {
  name?: string;
  id?: string;
  role?: string;
}

/** 恢复结果 */
export interface RestoreResult {
  /** 恢复后的主键 */
  id: string;
  /** 需要提示用户的警告（例如关联记录已不存在） */
  warnings?: string[];
}

/** 实体处理器：每类可回收实体注册一个 */
export interface RecycleHandler {
  entityType: string;
  label: string;
  /** soft = 原表保留 deleted_at；hard = 物理删除 */
  deleteMode: 'soft' | 'hard';
  /** restore = 可恢复；view_only = 流水类只归档查看（不可恢复） */
  restoreMode: 'restore' | 'view_only';
  /** 删除前抓取快照（返回 null 表示记录不存在/无需归档） */
  capture(db: Database, id: string): RecycleCapture | null;
  /** 恢复主表行与删除时的联动副作用（在调用方事务内执行） */
  restore(
    db: Database,
    snapshot: Record<string, unknown>,
    dependencies: Array<{ table: string; rows: Record<string, unknown>[] }>,
    operator: RecycleOperator,
    now: string,
    restoreInfo?: Record<string, unknown>,
  ): Promise<RestoreResult>;
}

/** 回收站记录（数据库行，snake_case） */
export interface RecycleBinRow {
  id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  entity_code: string | null;
  display_name: string | null;
  snapshot: string;
  dependencies: string | null;
  delete_mode: string;
  source_page: string | null;
  deleted_by: string | null;
  deleted_by_id: string | null;
  deleted_at: string;
  restore_status: string;
  restored_by: string | null;
  restored_at: string | null;
  restore_error: string | null;
  purge_at: string | null;
  created_at: string;
}
