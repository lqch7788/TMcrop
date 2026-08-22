/**
 * AI-07 资源优化配置服务（V1 — 库存预警 + 采购建议）
 * 2026-08-22：P1 MVP
 *
 * Plan 要求：
 * - 基于历史消耗数据、种植计划、季节性因素
 * - 智能预测物料需求，优化采购计划和库存水平
 * - 提供库存预警
 *
 * V1 实现：
 * - 输入：物料类型 + 时间范围
 * - 输出：当前库存 + 消耗速率 + 库存预警 + 建议采购量
 * - 数据源：V1.1 现有 inventory_stock + inventory_transaction 表
 */

import { getDatabase } from '../../db';

interface ResourceInput {
  material_name?: string;           // 可选：按物料过滤
  warehouse_id?: string;
  lookback_days?: number;          // 历史消耗查询天数（默认 30）
  forecast_days?: number;          // 预测天数（默认 14）
}

interface MaterialAlert {
  material_name: string;
  warehouse_id: string;
  current_stock: number;
  unit: string;
  daily_consumption: number;
  days_remaining: number;           // 预计多少天后用完
  alert_level: 'ok' | 'low' | 'critical' | 'out';
  recommended_purchase: number;     // 建议采购量（覆盖 forecast_days）
  estimated_cost: number;           // 估算采购成本（假设单价 10 元/kg）
}

interface ResourceResult {
  total_materials: number;
  alerts: MaterialAlert[];
  summary: {
    ok: number;
    low: number;
    critical: number;
    out: number;
  };
  total_recommended_cost: number;
  model_version: string;
  xai_reasons: string[];
}

const MODEL_VERSION = '1.0.0-rule-stocks';

/**
 * 主函数：资源优化
 */
export async function optimizeResources(input: ResourceInput): Promise<ResourceResult> {
  const db = getDatabase();
  const lookbackDays = input.lookback_days || 30;
  const forecastDays = input.forecast_days || 14;
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  // 1. 查询所有物料当前库存
  const stockRows = db.exec(`
    SELECT i.id, i.instance_id, i.crop_name, i.variety_name, i.current_quantity, i.unit,
           i.warehouse_id, i.warehouse_name, i.available_quantity
    FROM inventory_stock i
    WHERE i.status = 'in_stock'
      ${input.material_name ? `AND i.crop_name LIKE '%${input.material_name}%'` : ''}
      ${input.warehouse_id ? `AND i.warehouse_id = '${input.warehouse_id}'` : ''}
    ORDER BY i.current_quantity ASC
  `);
  const stockCols = stockRows[0]?.columns || [];
  const stocks = (stockRows[0]?.values || []).map((row: any[]) => {
    const obj: any = {};
    stockCols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });

  // 2. 计算每个物料的消耗速率（过去 lookback_days）
  const alerts: MaterialAlert[] = [];
  let totalCost = 0;

  for (const stock of stocks) {
    // 查询该物料的消耗（outbound transactions）
    const consumeRows = db.exec(`
      SELECT COALESCE(SUM(ABS(quantity)), 0) AS total_consumed
      FROM inventory_transaction
      WHERE instance_id = ? AND transaction_type = 'outbound'
        AND create_time > ?
    `, [stock.instance_id, lookbackStart]);
    const totalConsumed = Number(consumeRows[0]?.values?.[0]?.[0] || 0);
    const dailyConsumption = totalConsumed / lookbackDays;

    const currentStock = Number(stock.current_quantity) || 0;
    const daysRemaining = dailyConsumption > 0 ? Math.floor(currentStock / dailyConsumption) : 999;

    // 预警等级
    let alertLevel: MaterialAlert['alert_level'];
    if (currentStock <= 0) {
      alertLevel = 'out';
    } else if (daysRemaining < forecastDays * 0.3) {
      alertLevel = 'critical';
    } else if (daysRemaining < forecastDays) {
      alertLevel = 'low';
    } else {
      alertLevel = 'ok';
    }

    // 建议采购量（覆盖 forecast_days + 30% 安全库存）
    let recommendedPurchase = 0;
    if (alertLevel !== 'ok') {
      const targetStock = Math.ceil(dailyConsumption * (forecastDays + lookbackDays * 0.3));
      recommendedPurchase = Math.max(0, targetStock - currentStock);
    }
    const estimatedCost = recommendedPurchase * 10;  // 假设单价 10 元/kg

    if (alertLevel !== 'ok') {
      alerts.push({
        material_name: stock.crop_name || stock.variety_name || stock.instance_id,
        warehouse_id: stock.warehouse_id || '',
        current_stock: currentStock,
        unit: stock.unit || 'kg',
        daily_consumption: Math.round(dailyConsumption * 100) / 100,
        days_remaining: daysRemaining === 999 ? -1 : daysRemaining,
        alert_level: alertLevel,
        recommended_purchase: recommendedPurchase,
        estimated_cost: estimatedCost,
      });
      totalCost += estimatedCost;
    }
  }

  // 3. 汇总
  const summary = {
    ok: stocks.length - alerts.length,
    low: alerts.filter(a => a.alert_level === 'low').length,
    critical: alerts.filter(a => a.alert_level === 'critical').length,
    out: alerts.filter(a => a.alert_level === 'out').length,
  };

  // 4. XAI 推理
  const xai_reasons = [
    `扫描物料：${stocks.length} 种`,
    `历史消耗窗口：${lookbackDays} 天`,
    `预测窗口：${forecastDays} 天`,
    `预警物料：${alerts.length} 种（low=${summary.low}, critical=${summary.critical}, out=${summary.out}）`,
    `建议采购总成本：${totalCost.toFixed(0)} 元（假设单价 10 元/kg）`,
    `数据源：V1.1 inventory_stock + inventory_transaction 实测`,
  ];

  return {
    total_materials: stocks.length,
    alerts: alerts.sort((a, b) => {
      const order = { out: 0, critical: 1, low: 2, ok: 3 };
      return order[a.alert_level] - order[b.alert_level];
    }),
    summary,
    total_recommended_cost: totalCost,
    model_version: MODEL_VERSION,
    xai_reasons,
  };
}
