/**
 * 成本统计 Service（2026-10-01 新建）
 *
 * 背景：src/hooks/useProductionReports.ts 引用本文件作为 getCostStats 来源，
 *      但本文件此前不存在（孤儿 import），vite import-analysis 失败。
 *      这里按 useProductionReports.ts 期望的接口补齐：
 *
 *   - getCostStats({cost_type}) → GET /summary/cost-stats?cost_type=...
 *     返回 {data: {labor, material, energy}, summary: {total_labor_cost, ...}}
 *
 * 字段 shape 与 useProductionReports.ts 第 62-74 行的 state 定义严格对齐
 * （labor/material/energy 是 CostDetailItem[]，summary 7 字段）。
 *
 * 后端 /summary/cost-stats 当前只返回 {labor, material, energy} 三数组，
 * 不返回 summary。本 service 在客户端聚合数组得到 summary。
 *
 * 已迁移到 /summary/overview（Reports.tsx 已废弃），但 useProductionReports
 * 仍可能被任何间接 import 链触达，因此本 service 必须存在以让 vite 通过。
 */

import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

/** 人工成本明细项（精确匹配 useProductionReports.ts 第 63 行 state 字段集）
 *  注：用 type 而非 interface，以确保与调用方 inline Array<{...}> 完全结构化兼容 */
export type LaborCostDetail = {
  costCategory: string;
  costType: string;
  month: string;
  workHours: number;
  totalAmount: number;
  workerCount: number;
};

/** 物料/能源成本明细项（精确匹配 useProductionReports.ts 第 64-65 行 state 字段集） */
export type MaterialEnergyCostDetail = {
  costCategory: string;
  costType: string;
  costTypeCode: string;
  month: string;
  totalQuantity: number;
  totalAmount: number;
  recordCount: number;
};

/** 成本汇总（与 useProductionReports.ts 第 67-74 行 state 对齐） */
export interface CostSummaryStats {
  total_labor_cost: number;
  total_material_cost: number;
  total_energy_cost: number;
  total_cost: number;
  total_work_hours: number;
  avg_hourly_rate: number;
}

/** getCostStats 完整结构（与 useProductionReports.ts 期望一致） */
export interface CostStatsResult {
  data: {
    labor: LaborCostDetail[];
    material: MaterialEnergyCostDetail[];
    energy: MaterialEnergyCostDetail[];
  };
  summary: CostSummaryStats;
}

/** getCostStats 入参 */
export interface GetCostStatsParams {
  cost_type?: string;
  start_date?: string;
  end_date?: string;
  batch_code?: string;
}

// ========== 默认空数据 ==========

const EMPTY_RESULT: CostStatsResult = {
  data: { labor: [], material: [], energy: [] },
  summary: {
    total_labor_cost: 0,
    total_material_cost: 0,
    total_energy_cost: 0,
    total_cost: 0,
    total_work_hours: 0,
    avg_hourly_rate: 0,
  },
};

// ========== API ==========

/**
 * 获取成本统计
 * GET /api/summary/cost-stats?cost_type=...
 *
 * 后端返回 {success, data: {labor, material, energy}}，
 * enhancedApiClient 自动解包 .data 后实际返回 {labor, material, energy}。
 * 本函数在此基础上聚合出 summary 字段，封装为 useProductionReports 期望的 shape。
 */
export async function getCostStats(params: GetCostStatsParams = {}): Promise<CostStatsResult> {
  try {
    const query: Record<string, string> = {};
    if (params.cost_type) query.cost_type = params.cost_type;
    if (params.start_date) query.start_date = params.start_date;
    if (params.end_date) query.end_date = params.end_date;
    if (params.batch_code) query.batch_code = params.batch_code;

    const queryStr = new URLSearchParams(query).toString();
    const url = `/summary/cost-stats${queryStr ? `?${queryStr}` : ''}`;

    // enhancedApiClient 解包 .data 后返回 {labor, material, energy}
    const raw = await enhancedApiClient.get<{
      labor: LaborCostDetail[];
      material: MaterialEnergyCostDetail[];
      energy: MaterialEnergyCostDetail[];
    }>(url);

    const labor = Array.isArray(raw?.labor) ? raw.labor : [];
    const material = Array.isArray(raw?.material) ? raw.material : [];
    const energy = Array.isArray(raw?.energy) ? raw.energy : [];

    // 客户端聚合 summary（后端未提供时由前端算）
    const totalLaborCost = labor.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const totalMaterialCost = material.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const totalEnergyCost = energy.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
    const totalWorkHours = labor.reduce((s, i) => s + (Number(i.workHours) || 0), 0);
    const totalCost = totalLaborCost + totalMaterialCost + totalEnergyCost;
    const avgHourlyRate = totalWorkHours > 0
      ? Math.round((totalLaborCost / totalWorkHours) * 100) / 100
      : 0;

    return {
      data: { labor, material, energy },
      summary: {
        total_labor_cost: Math.round(totalLaborCost * 100) / 100,
        total_material_cost: Math.round(totalMaterialCost * 100) / 100,
        total_energy_cost: Math.round(totalEnergyCost * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        total_work_hours: Math.round(totalWorkHours * 100) / 100,
        avg_hourly_rate: avgHourlyRate,
      },
    };
  } catch (err) {
    // 服务层不抛错（保持与 summaryService 容错风格一致），返回空数据让上层回退
    // eslint-disable-next-line no-console
    console.warn('[costService] getCostStats 失败:', err);
    return EMPTY_RESULT;
  }
}