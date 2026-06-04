/**
 * 出库流水 Service (V3.1 出库记录独立页)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §9
 *
 * 职责：
 * - 参数校验（日期格式、from<=to 必填）
 * - 调用 Repository 包装业务结果
 * - 业务异常统一抛出，由 Controller 捕获返回 400
 */

import {
  inventoryTransactionRepository,
  TransactionQuery,
  OutboundRow,
  OutboundSummary,
} from '../repositories/inventoryTransaction.repository';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class InventoryTransactionService {
  /**
   * 列表查询
   */
  async listOutbound(query: TransactionQuery): Promise<{
    rows: OutboundRow[];
    total: number;
  }> {
    this.validateQuery(query);
    return inventoryTransactionRepository.findOutbound(query);
  }

  /**
   * 统计查询
   */
  async getStats(query: TransactionQuery): Promise<OutboundSummary> {
    this.validateQuery(query);
    return inventoryTransactionRepository.getStats(query);
  }

  /**
   * 参数校验
   */
  private validateQuery(query: TransactionQuery): void {
    if (!query.from || !query.to) {
      throw new Error('from 和 to 是必填参数');
    }
    if (!DATE_REGEX.test(query.from) || !DATE_REGEX.test(query.to)) {
      throw new Error('日期格式必须为 YYYY-MM-DD');
    }
    if (query.from > query.to) {
      throw new Error('开始日期不能晚于结束日期');
    }
  }
}

export const inventoryTransactionService = new InventoryTransactionService();
