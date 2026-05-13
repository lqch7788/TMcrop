/**
 * 生产链条统计数据类型定义
 */

/**
 * 生产链条统计数据结构
 */
export interface ChainStats {
  /** 总数 */
  total: number;
  /** 关联数 */
  related: number;
  /** 待处理数（可选） */
  pending?: number;
  /** 已完成数（可选） */
  completed?: number;
}
