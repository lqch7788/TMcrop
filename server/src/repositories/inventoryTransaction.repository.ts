/**
 * 出库流水 Repository (V3.1 出库记录独立页)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §6
 *
 * 关键设计：
 * - LEFT JOIN inventory_stock，**过滤条件放 ON 子句**（防 INNER JOIN 退化，已删库存的流水不丢）
 * - operate_date 是纯日期字符串（YYYY-MM-DD），用 >= / <= 范围比较
 * - 所有查询走 queryToObjects 自动转 camelCase
 * - 性能：靠 fixMissingSchema 加的 3 个复合索引
 */

import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

export interface TransactionQuery {
  from: string;                   // YYYY-MM-DD 必填
  to: string;                     // YYYY-MM-DD 必填
  stockType?: string;             // seed | seedling | product
  warehouseId?: string;
  cropName?: string;
  operatorName?: string;
  businessType?: string;
  page?: number;                  // 默认 1
  limit?: number;                 // 默认 50
}

export interface OutboundRow {
  id: string;
  instanceId: string;
  stockType: string;
  transactionType: string;
  quantity: number;
  quantityOut: number;            // abs(quantity)，永远正数
  balanceBefore: number;
  balanceAfter: number;
  businessId?: string;
  businessType?: string;
  businessCode?: string;
  operatorId?: string;
  operatorName?: string;
  operateDate: string;
  remarks?: string;
  createTime: string;
  // JOIN inventory_stock 字段（可能为 null，已删 stock）
  cropName?: string;
  varietyName?: string;
  cropCode?: string;
  unit?: string;
  warehouseName?: string;
  plantingMode?: string;
  grade?: string;
  greenhouseName?: string;
}

export interface OutboundSummary {
  totalCount: number;
  totalQuantity: number;
  todayCount: number;
  byStockType: Record<string, { count: number; quantity: number }>;
  byBusinessType: Record<string, { count: number; quantity: number }>;
}

export class InventoryTransactionRepository {
  /**
   * 列表查询（LEFT JOIN + 过滤放 ON 子句）
   * 设计 §6.1
   */
  async findOutbound(query: TransactionQuery): Promise<{ rows: OutboundRow[]; total: number }> {
    const db = getDatabase();
    const {
      from, to,
      stockType, warehouseId, cropName, operatorName, businessType,
      page = 1, limit = 50,
    } = query;

    // WHERE 子句条件（针对 transactions 表自身字段）
    const where: string[] = [
      `t.transaction_type = 'outbound'`,
      `t.operate_date >= ?`,
      `t.operate_date <= ?`,
    ];
    const whereParams: any[] = [from, to];
    if (stockType)    { where.push(`t.stock_type = ?`);     whereParams.push(stockType); }
    if (operatorName) { where.push(`t.operator_name LIKE ?`); whereParams.push(`%${operatorName}%`); }
    if (businessType) { where.push(`t.business_type = ?`);  whereParams.push(businessType); }

    // ON 子句过滤（针对 inventory_stock 字段，LEFT JOIN 不退化为 INNER JOIN）
    const onClauses: string[] = [];
    if (warehouseId) { onClauses.push(`s.warehouse_id = ?`);  whereParams.push(warehouseId); }
    if (cropName)    { onClauses.push(`s.crop_name LIKE ?`);  whereParams.push(`%${cropName}%`); }

    const onSql = onClauses.length ? `AND ${onClauses.join(' AND ')}` : '';

    // 列表查询
    const listSql = `
      SELECT
        t.id, t.instance_id AS instanceId, t.stock_type AS stockType, t.transaction_type AS transactionType,
        t.quantity, t.balance_before AS balanceBefore, t.balance_after AS balanceAfter,
        t.business_id AS businessId, t.business_type AS businessType, t.business_code AS businessCode,
        t.operator_id AS operatorId, t.operator_name AS operatorName, t.operate_date AS operateDate,
        t.remarks, t.create_time AS createTime,
        s.crop_name AS cropName, s.variety_name AS varietyName, s.crop_code AS cropCode, s.unit,
        s.warehouse_name AS warehouseName, s.planting_mode AS plantingMode, s.grade,
        s.greenhouse_name AS greenhouseName
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onSql}
      WHERE ${where.join(' AND ')}
      ORDER BY t.operate_date DESC, t.create_time DESC
      LIMIT ? OFFSET ?
    `;
    const listParams = [...whereParams, limit, (page - 1) * limit];
    const rows = queryToObjects<OutboundRow>(db, listSql, listParams);
    // quantityOut 永远正数（数据库 quantity 存负值）
    rows.forEach(r => { r.quantityOut = Math.abs(r.quantity); });

    // 总数（不带分页，复用 WHERE/ON 条件）
    const countSql = `
      SELECT COUNT(*) AS cnt
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onSql}
      WHERE ${where.join(' AND ')}
    `;
    const countResult = queryToObjects<{ cnt: number }>(db, countSql, whereParams);
    const total = countResult[0]?.cnt || 0;

    return { rows, total };
  }

  /**
   * 统计聚合（顶部 4 个卡 + 库存类型 + 业务类型）
   * 设计 §6.2
   */
  async getStats(query: TransactionQuery): Promise<OutboundSummary> {
    const db = getDatabase();
    const {
      from, to,
      stockType, warehouseId, cropName, operatorName, businessType,
    } = query;

    const where: string[] = [
      `t.transaction_type = 'outbound'`,
      `t.operate_date >= ?`,
      `t.operate_date <= ?`,
    ];
    const whereParams: any[] = [from, to];
    if (stockType)    { where.push(`t.stock_type = ?`);     whereParams.push(stockType); }
    if (operatorName) { where.push(`t.operator_name LIKE ?`); whereParams.push(`%${operatorName}%`); }
    if (businessType) { where.push(`t.business_type = ?`);  whereParams.push(businessType); }

    const onClauses: string[] = [];
    if (warehouseId) { onClauses.push(`s.warehouse_id = ?`);  whereParams.push(warehouseId); }
    if (cropName)    { onClauses.push(`s.crop_name LIKE ?`);  whereParams.push(`%${cropName}%`); }
    const onSql = onClauses.length ? `AND ${onClauses.join(' AND ')}` : '';
    const whereSql = where.join(' AND ');

    // 总数 + 总量
    const totalSql = `
      SELECT COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)), 0) AS totalQty
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onSql}
      WHERE ${whereSql}
    `;
    const totalResult = queryToObjects<{ cnt: number; totalQty: number }>(db, totalSql, whereParams);
    const totalCount = totalResult[0]?.cnt || 0;
    const totalQuantity = Number(totalResult[0]?.totalQty || 0);

    // 今日出库次数（独立 SQL：不受当前筛选影响，全局当天）
    const todayResult = queryToObjects<{ cnt: number }>(db,
      `SELECT COUNT(*) AS cnt FROM inventory_transaction WHERE transaction_type = 'outbound' AND operate_date = date('now')`,
      []
    );
    const todayCount = todayResult[0]?.cnt || 0;

    // byStockType
    const byStockRows = queryToObjects<{ stockType: string; cnt: number; qty: number }>(db, `
      SELECT t.stock_type AS stockType, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)), 0) AS qty
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onSql}
      WHERE ${whereSql}
      GROUP BY t.stock_type
    `, whereParams);
    const byStockType: Record<string, { count: number; quantity: number }> = {};
    byStockRows.forEach(r => {
      byStockType[r.stockType] = { count: r.cnt, quantity: Number(r.qty) };
    });

    // byBusinessType
    const byBizRows = queryToObjects<{ businessType: string; cnt: number; qty: number }>(db, `
      SELECT COALESCE(t.business_type, 'unknown') AS businessType, COUNT(*) AS cnt, COALESCE(SUM(ABS(t.quantity)), 0) AS qty
      FROM inventory_transaction t
      LEFT JOIN inventory_stock s
        ON s.instance_id = t.instance_id
        ${onSql}
      WHERE ${whereSql}
      GROUP BY t.business_type
    `, whereParams);
    const byBusinessType: Record<string, { count: number; quantity: number }> = {};
    byBizRows.forEach(r => {
      byBusinessType[r.businessType] = { count: r.cnt, quantity: Number(r.qty) };
    });

    return { totalCount, totalQuantity, todayCount, byStockType, byBusinessType };
  }
}

export const inventoryTransactionRepository = new InventoryTransactionRepository();
