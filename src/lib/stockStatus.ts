/**
 * 种源库存状态工具函数（V2.1 统一层）
 *
 * 唯一权威的计算入口，所有页面/弹窗/统计必须使用本文件导出的函数
 * 严禁在多处重复实现 0/20% 阈值逻辑
 */
import { StockStatus } from '../types/crop';

/** 库存状态颜色映射（统一来源） */
export const STOCK_STATUS_COLOR: Record<StockStatus, { text: string; bg: string; label: string }> = {
  [StockStatus.SUFFICIENT]: { text: 'text-green-600', bg: 'bg-green-50', label: '充足' },
  [StockStatus.LOW]:        { text: 'text-amber-600', bg: 'bg-amber-50', label: '不足' },
  [StockStatus.DEPLETED]:   { text: 'text-red-600',   bg: 'bg-red-50',   label: '耗尽' },
  [StockStatus.ACTIVE]:     { text: 'text-green-600', bg: 'bg-green-50', label: '充足' },
};

/** 临界值：可用量 < initialCount × 该比例 → LOW */
export const LOW_THRESHOLD_RATIO = 0.2;

/**
 * 核心计算：可用量 + 初始量 → 库存状态
 *
 * 规则（V2.1 统一）：
 * - availableCount === 0          → DEPLETED
 * - availableCount < 20% 初始量    → LOW
 * - 其他                          → SUFFICIENT
 *
 * @param availableCount 当前可用量（remaining_quantity 字段）
 * @param initialCount  初始量（quantity 字段，即入库数量）
 * @param fallback      当 initialCount <= 0 时的兜底（默认 SUFFICIENT）
 */
export function computeStockStatus(
  availableCount: number,
  initialCount: number,
  fallback: StockStatus = StockStatus.SUFFICIENT
): StockStatus {
  if (initialCount <= 0) return fallback;
  if (availableCount <= 0) return StockStatus.DEPLETED;
  if (availableCount < initialCount * LOW_THRESHOLD_RATIO) return StockStatus.LOW;
  return StockStatus.SUFFICIENT;
}

/**
 * 剩余率（百分比）= availableCount / initialCount
 * 注意：虽然函数名沿用 getCompletionRate，但实际含义是"剩余率"（种源表专用）
 * @returns 0-100 的整数，initialCount<=0 时返回 0
 */
export function getCompletionRate(availableCount: number, initialCount: number): number {
  if (initialCount <= 0) return 0;
  return Math.round((availableCount / initialCount) * 100);
}

/**
 * 取状态对应的 Tailwind 颜色 class
 */
export function getStatusColorClass(status: StockStatus | string): { text: string; bg: string } {
  const m = STOCK_STATUS_COLOR[status as StockStatus];
  if (m) return { text: m.text, bg: m.bg };
  return { text: 'text-gray-600', bg: 'bg-gray-50' };
}

/**
 * 取状态对应的中文标签
 */
export function getStatusLabel(status: StockStatus | string): string {
  return STOCK_STATUS_COLOR[status as StockStatus]?.label || String(status);
}

/**
 * 是否处于告警状态（LOW + DEPLETED）
 */
export function isAlertStatus(status: StockStatus | string): boolean {
  return status === StockStatus.LOW || status === StockStatus.DEPLETED;
}
