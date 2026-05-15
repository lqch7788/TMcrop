/**
 * 领料统计 API 路由
 * 提供物料领用的汇总统计数据
 *
 * 数据来源: material_requests 表（聚合查询）
 * API前缀: /api/material-statistics
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';

const router = Router();

// 物料分类7色配色方案
const CATEGORY_COLORS: Record<string, { gradient: string[]; solid: string }> = {
  'SP-生产投入类': { gradient: ['#06B6D4', '#0891B2'], solid: '#06B6D4' },
  'EQ-设施与装备类': { gradient: ['#8B5CF6', '#7C3AED'], solid: '#8B5CF6' },
  'OP-作业支持类': { gradient: ['#F59E0B', '#D97706'], solid: '#F59E0B' },
  'PH-采后处理与流通类': { gradient: ['#F97316', '#EA580C'], solid: '#F97316' },
  'IT-数字化与管理类': { gradient: ['#EC4899', '#DB2777'], solid: '#EC4899' },
  'EC-能源与通用耗材': { gradient: ['#64748B', '#475569'], solid: '#64748B' },
  'OT-其他类': { gradient: ['#9CA3AF', '#6B7280'], solid: '#9CA3AF' },
};

/** 物料编码→分类名映射 */
function getCategoryByCode(code: string): string {
  const prefix = (code || '').substring(0, 2);
  const map: Record<string, string> = {
    'SP': 'SP-生产投入类',
    'EQ': 'EQ-设施与装备类',
    'OP': 'OP-作业支持类',
    'PH': 'PH-采后处理与流通类',
    'IT': 'IT-数字化与管理类',
    'EC': 'EC-能源与通用耗材',
  };
  return map[prefix] || 'OT-其他类';
}

function getCategoryKey(name: string): string {
  const map: Record<string, string> = {
    'SP-生产投入类': '生产投入',
    'EQ-设施与装备类': '设施装备',
    'OP-作业支持类': '作业支持',
    'PH-采后处理与流通类': '采后流通',
    'IT-数字化与管理类': '数字管理',
    'EC-能源与通用耗材': '能源耗材',
    'OT-其他类': '其他',
  };
  return map[name] || '其他';
}

/** 获取所有统计数据的聚合接口 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM material_requests ORDER BY apply_date ASC');
    const resultSet = results.length > 0 ? results[0] : null;
    const columns: string[] = resultSet ? resultSet.columns : [];
    // values 是二维数组 [[行1_val1, 行1_val2, ...], [行2_val1, ...]]
    const records = resultSet
      ? resultSet.values.map((rowValues: any[]) => {
          const item: Record<string, unknown> = {};
          rowValues.forEach((val, i) => { item[columns[i]] = val; });
          try { item.materials = JSON.parse(item.materials as string || '[]'); }
          catch { item.materials = []; }
          return item;
        })
      : [];

    // ------ 1. 物料级别统计 ------
    const materialMap = new Map<string, any>();
    for (const rec of records) {
      const mats = (rec.materials as any[]) || [];
      for (const m of mats) {
        const code = m.materialCode || m.code || '';
        if (!code) continue;
        const key = code;
        if (!materialMap.has(key)) {
          materialMap.set(key, {
            material_code: code,
            material_name: m.materialName || m.name || '',
            category: getCategoryByCode(code),
            spec: m.spec || '',
            barcode: m.barcode || '',
            unit: m.unit || '',
            supplier: m.supplier || '',
            batch_code: m.batchNo || m.batchCode || '',
            production_date: m.productionDate || '',
            expiry_date: m.expiryDate || '',
            production_plan_batch_code: (rec as any).production_batch_code || '',
            requisition_department: (rec as any).department_name || '',
            usage_area: (rec as any).plant_area || '',
            requisitioner: (rec as any).applicant_name || '',
            requisition_time: String((rec as any).apply_date || ''),
            requisition_count: 0,
            total_quantity: 0,
            actual_quantity: 0,
            total_amount: 0,
            main_warehouse: (rec as any).warehouse_name || '',
          });
        }
        const entry = materialMap.get(key);
        entry.requisition_count += 1;
        entry.total_quantity += Number(m.requestedQuantity || m.quantity || 0);
        entry.actual_quantity += Number(m.actualQuantity || m.requestedQuantity || m.quantity || 0);
        entry.total_amount += Number(m.unitPrice || 0) * Number(m.requestedQuantity || m.quantity || 0);
      }
    }
    const materialStatistics = Array.from(materialMap.values());

    // ------ 2. 月度统计（按部门）------
    const monthlyMap = new Map<string, any>();
    for (const rec of records) {
      const applyDate = String((rec as any).apply_date || '');
      if (!applyDate) continue;
      const parts = applyDate.split('-');
      const year = parts[0];
      const month = parts[1];
      if (!year || !month) continue;
      const dept = (rec as any).department_name || '';
      const key = `${year}-${month}-${dept}`;
      if (!monthlyMap.has(key)) {
        const mats = (rec.materials as any[]) || [];
        const totalQty = mats.reduce((s: number, m: any) => s + Number(m.requestedQuantity || m.quantity || 0), 0);
        const actualQty = mats.reduce((s: number, m: any) => s + Number(m.actualQuantity || m.requestedQuantity || m.quantity || 0), 0);
        const totalAmt = mats.reduce((s: number, m: any) => s + Number(m.unitPrice || 0) * Number(m.requestedQuantity || m.quantity || 0), 0);
        monthlyMap.set(key, {
          year, month,
          department: dept,
          requisition_count: 1,
          material_types: new Set(mats.map((m: any) => m.materialCode || m.code)),
          total_quantity: totalQty,
          actual_quantity: actualQty,
          difference_rate: totalQty > 0 ? ((actualQty - totalQty) / totalQty * 100) : 0,
          total_amount: totalAmt,
        });
      } else {
        const entry = monthlyMap.get(key);
        const mats = (rec.materials as any[]) || [];
        const matTypes = new Set(mats.map((m: any) => m.materialCode || m.code));
        entry.requisition_count += 1;
        entry.material_types = new Set([...entry.material_types, ...matTypes]);
        entry.total_quantity += mats.reduce((s: number, m: any) => s + Number(m.requestedQuantity || m.quantity || 0), 0);
        entry.actual_quantity += mats.reduce((s: number, m: any) => s + Number(m.actualQuantity || m.requestedQuantity || m.quantity || 0), 0);
        entry.total_amount += mats.reduce((s: number, m: any) => s + Number(m.unitPrice || 0) * Number(m.requestedQuantity || m.quantity || 0), 0);
        entry.difference_rate = entry.total_quantity > 0 ? ((entry.actual_quantity - entry.total_quantity) / entry.total_quantity * 100) : 0;
      }
    }
    const monthlyStatistics = Array.from(monthlyMap.values()).map((e: any) => {
      e.material_types = e.material_types instanceof Set ? e.material_types.size : Number(e.material_types) || 0;
      e.difference_rate = Math.round(e.difference_rate * 10) / 10;
      return e;
    });

    // ------ 3. 分类汇总（饼图数据）------
    const categoryMap = new Map<string, number>();
    for (const rec of records) {
      const mats = (rec.materials as any[]) || [];
      for (const m of mats) {
        const code = m.materialCode || m.code || '';
        const cat = getCategoryByCode(code);
        const qty = Number(m.requestedQuantity || m.quantity || 0);
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + qty);
      }
    }
    const totalQty = Array.from(categoryMap.values()).reduce((s, v) => s + v, 0);
    const categorySummary = Array.from(categoryMap.entries()).map(([name, value]) => {
      const amount = Math.round(value * 30 / 10000 * 100) / 100; // 万元
      const percentage = totalQty > 0 ? Math.round((value / totalQty) * 1000) / 10 : 0;
      const key = getCategoryKey(name);
      const colors = CATEGORY_COLORS[name] || { gradient: ['#9CA3AF', '#6B7280'], solid: '#9CA3AF' };
      return { name, key, value, amount, percentage, ...colors };
    });

    // ------ 4. 分类趋势（月度堆叠柱状图）------
    const trendMap = new Map<string, Record<string, any>>();
    for (const rec of records) {
      const applyDate = String((rec as any).apply_date || '');
      if (!applyDate) continue;
      const ym = applyDate.substring(0, 7); // YYYY-MM
      if (!trendMap.has(ym)) {
        trendMap.set(ym, { month: ym, 生产投入: 0, 设施装备: 0, 作业支持: 0, 采后流通: 0, 数字管理: 0, 能源耗材: 0, 其他: 0 });
      }
      const entry = trendMap.get(ym)!;
      const mats = (rec.materials as any[]) || [];
      for (const m of mats) {
        const code = m.materialCode || m.code || '';
        const catKey = getCategoryKey(getCategoryByCode(code));
        const qty = Number(m.requestedQuantity || m.quantity || 0);
        entry[catKey] = (entry[catKey] || 0) + qty;
      }
    }
    const categoryTrend = Array.from(trendMap.values()).map(e => ({
      ...e,
      total: (e.生产投入 || 0) + (e.设施装备 || 0) + (e.作业支持 || 0) + (e.采后流通 || 0) + (e.数字管理 || 0) + (e.能源耗材 || 0) + (e.其他 || 0),
    }));

    res.json({
      success: true,
      data: {
        material_statistics: materialStatistics,
        monthly_statistics: monthlyStatistics,
        category_summary: categorySummary,
        category_trend: categoryTrend,
      },
    });
  } catch (error) {
    console.error('获取领料统计失败:', error);
    res.status(500).json({ success: false, error: '获取领料统计失败' });
  }
});

export default router;
