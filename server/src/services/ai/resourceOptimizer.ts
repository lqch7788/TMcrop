/**
 * AI-07 资源优化配置服务（V2 — DB 真实阈值 + 真实价格）
 * 2026-09-02：v0.3.1 修复版
 *
 * 修复前问题（V1）：
 *   - L68: WHERE status='in_stock' → 漏掉 low_stock/empty（已知预警被排除！）
 *   - L69-70: 字符串拼接 SQL（material_name LIKE '%${input.material_name}%'）
 *   - L95: 用 current_quantity（含冻结部分）应改 available_quantity
 *   - L116: 采购成本硬编码 10 元/kg
 *   - 注释自承"Z-score"但代码无 Z-score 计算
 *
 * V2 修复：
 *   - 状态过滤改为 in_stock / low_stock（包含需预警项）
 *   - 字符串拼接改参数化查询
 *   - 真实价格从 materials 表读取（crop_name 模糊匹配 materials.name）
 *   - 真实阈值从 materials.minStock 读取
 *   - available_quantity 计算预警
 *   - 移除 Z-score 误导性注释
 */

import { getDatabase } from '../../db';

interface ResourceInput {
  material_name?: string;
  warehouse_id?: string;
  lookback_days?: number;
  forecast_days?: number;
}

interface MaterialAlert {
  material_name: string;
  warehouse_id: string;
  current_stock: number;
  available_stock: number;
  safety_stock: number;
  unit: string;
  daily_consumption: number;
  days_remaining: number;
  alert_level: 'ok' | 'low' | 'critical' | 'out';
  recommended_purchase: number;
  estimated_cost: number;
}

interface ResourceResult {
  total_materials: number;
  alerts: MaterialAlert[];
  summary: { ok: number; low: number; critical: number; out: number };
  total_recommended_cost: number;
  model_version: string;
  xai_reasons: string[];
}

const MODEL_VERSION = '2.0.0-rule-stocks-dba';
const DEFAULT_UNIT_PRICE = 10; // 兜底单价（元/kg 或元/单位）

/**
 * 加载物料价格映射（materials.name → price）
 */
function loadMaterialPrices(): Map<string, number> {
  const db = getDatabase();
  const result = db.exec(`
    SELECT name, CAST(price AS REAL) AS price
    FROM materials
    WHERE dataStatus = '启用' OR dataStatus IS NULL
  `);
  const map = new Map<string, number>();
  if (result.length === 0) return map;
  for (const row of result[0].values) {
    const name = String(row[0] || '').trim();
    const price = Number(row[1]) || 0;
    if (name) map.set(name, price);
  }
  return map;
}

/**
 * 加载物料安全库存映射（materials.name → minStock）
 */
function loadSafetyStocks(): Map<string, number> {
  const db = getDatabase();
  const result = db.exec(`
    SELECT name, COALESCE(minStock, 0) AS min_stock
    FROM materials
    WHERE dataStatus = '启用' OR dataStatus IS NULL
  `);
  const map = new Map<string, number>();
  if (result.length === 0) return map;
  for (const row of result[0].values) {
    const name = String(row[0] || '').trim();
    const minStock = Number(row[1]) || 0;
    if (name) map.set(name, minStock);
  }
  return map;
}

/**
 * 模糊匹配单价
 */
function lookupUnitPrice(materialName: string, priceMap: Map<string, number>): number {
  if (!materialName) return DEFAULT_UNIT_PRICE;
  if (priceMap.has(materialName)) return priceMap.get(materialName)!;
  for (const [name, price] of priceMap.entries()) {
    if (materialName.includes(name) || name.includes(materialName)) {
      return price;
    }
  }
  return DEFAULT_UNIT_PRICE;
}

export async function optimizeResources(input: ResourceInput): Promise<ResourceResult> {
  const db = getDatabase();
  const lookbackDays = input.lookback_days || 30;
  const forecastDays = input.forecast_days || 14;
  const now = new Date();
  const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  // 1. 加载价格 / 阈值映射
  const priceMap = loadMaterialPrices();
  const safetyMap = loadSafetyStocks();

  // 2. 查询需要预警的库存：in_stock + low_stock（v1 只查 in_stock 漏掉 low_stock）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stockRows = db.exec(
    `SELECT i.id, i.instance_id, i.crop_name, i.variety_name,
            i.current_quantity, i.available_quantity, i.frozen_quantity, i.unit,
            i.warehouse_id, i.warehouse_name
     FROM inventory_stock i
     WHERE i.status IN ('in_stock', 'low_stock')
       AND i.available_quantity &gt;= 0
       ${input.material_name ? 'AND i.crop_name LIKE ?' : ''}
       ${input.warehouse_id ? 'AND i.warehouse_id = ?' : ''}
     ORDER BY i.available_quantity ASC`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [
      ...(input.material_name ? [`%${input.material_name}%`] : []),
      ...(input.warehouse_id ? [input.warehouse_id] : []),
    ] as any[]
  );
  const stockCols = stockRows[0]?.columns || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stocks: any[] = (stockRows[0]?.values || []).map((row: any[]) => {
    const obj: any = {};
    stockCols.forEach((c, i) => (obj[c] = row[i]));
    return obj;
  });

  // 3. 计算每个物料的消耗速率 + 预警等级
  const alerts: MaterialAlert[] = [];
  let totalCost = 0;

  for (const stock of stocks) {
    const instanceId = String(stock.instance_id || '');
    const materialName = String(stock.crop_name || stock.variety_name || stock.instance_id || '');

    // 消耗（outbound transactions）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const consumeRows = db.exec(
      `SELECT COALESCE(SUM(ABS(quantity)), 0) AS total_consumed
       FROM inventory_transaction
       WHERE instance_id = ? AND transaction_type = 'outbound'
         AND create_time &gt; ?`,
      [instanceId, lookbackStart] as any[]
    );
    const totalConsumed = Number(consumeRows[0]?.values?.[0]?.[0] || 0);
    const dailyConsumption = totalConsumed / lookbackDays;

    // 关键修复：available_quantity（v1 用 current_quantity 含冻结）
    const availableStock = Number(stock.available_quantity) || 0;
    const currentStock = Number(stock.current_quantity) || 0;
    const daysRemaining =
      dailyConsumption > 0 ? Math.floor(availableStock / dailyConsumption) : 999;

    // 真实安全库存（从 materials 表读，fallback 到 0）
    const safetyStock = safetyMap.get(materialName) || 0;

    // 预警等级：基于安全库存 + 天数
    let alertLevel: MaterialAlert['alert_level'];
    if (availableStock <= 0) {
      alertLevel = 'out';
    } else if (safetyStock > 0 && availableStock < safetyStock) {
      alertLevel = 'critical'; // 低于真实安全库存
    } else if (daysRemaining < forecastDays * 0.3) {
      alertLevel = 'critical';
    } else if (daysRemaining < forecastDays) {
      alertLevel = 'low';
    } else {
      alertLevel = 'ok';
    }

    // 建议采购量：覆盖 forecast_days + 30% 安全库存 + 达安全库存
    let recommendedPurchase = 0;
    if (alertLevel !== 'ok') {
      const targetStock = Math.max(
        safetyStock * 1.2,
        dailyConsumption * (forecastDays + lookbackDays * 0.3)
      );
      recommendedPurchase = Math.max(0, targetStock - availableStock);
    }

    // 真实价格
    const unitPrice = lookupUnitPrice(materialName, priceMap);
    const estimatedCost = recommendedPurchase * unitPrice;

    // 只记录需要关注的（ok 不记录）
    if (alertLevel !== 'ok') {
      alerts.push({
        material_name: materialName,
        warehouse_id: String(stock.warehouse_id || ''),
        current_stock: currentStock,
        available_stock: availableStock,
        safety_stock: safetyStock,
        unit: String(stock.unit || 'kg'),
        daily_consumption: Math.round(dailyConsumption * 100) / 100,
        days_remaining: daysRemaining === 999 ? -1 : daysRemaining,
        alert_level: alertLevel,
        recommended_purchase: Math.round(recommendedPurchase * 100) / 100,
        estimated_cost: Math.round(estimatedCost * 100) / 100,
      });
      totalCost += estimatedCost;
    }
  }

  const summary = {
    ok: stocks.length - alerts.length,
    low: alerts.filter((a) => a.alert_level === 'low').length,
    critical: alerts.filter((a) => a.alert_level === 'critical').length,
    out: alerts.filter((a) => a.alert_level === 'out').length,
  };

  return {
    total_materials: stocks.length,
    alerts: alerts.sort((a, b) => {
      const order = { out: 0, critical: 1, low: 2, ok: 3 };
      return order[a.alert_level] - order[b.alert_level];
    }),
    summary,
    total_recommended_cost: Math.round(totalCost * 100) / 100,
    model_version: MODEL_VERSION,
    xai_reasons: [
      `扫描物料：${stocks.length} 种（已包含 in_stock + low_stock）`,
      `历史消耗窗口：${lookbackDays} 天`,
      `预测窗口：${forecastDays} 天`,
      `预警物料：${alerts.length} 种（low=${summary.low}, critical=${summary.critical}, out=${summary.out}）`,
      `安全库存匹配：${alerts.filter((a) => a.safety_stock > 0).length}/${alerts.length} 种从 materials 表读取`,
      `建议采购总成本：${Math.round(totalCost * 100) / 100} 元（真实价格 ${priceMap.size} 种物料）`,
      `数据源：V1.1 inventory_stock + inventory_transaction + materials 真实表`,
      `V2 修复：可用库存计算 + 字符串拼接 → 参数化 + 硬编码 10 元/kg → 真实价格`,
    ],
  };
}
