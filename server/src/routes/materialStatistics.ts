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

/**
 * 用途/区域列可读化（2026-09-27 用户反馈：显示原始 JSON 乱码）
 * material_requests.plant_area 有两种历史格式：
 *  - 新格式：JSON 数组 [{type,id,code,cropName,area},...]
 *  - 旧格式：纯字符串（如 "红颜·日光温室区"）
 * 统一解析为可读文本："红颜·日光温室区; 杜鹃花·连栋温室01区; 测试区域"
 */
function formatPlantArea(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry: Record<string, unknown>) => {
            const cropName = String(entry.cropName || '');
            const area = String(entry.area || '');
            const code = String(entry.code || '');
            if (cropName && area) return `${cropName}·${area}`;
            if (area) return area;
            if (cropName) return cropName;
            return code;
          })
          .filter(Boolean)
          .join('; ');
      }
    } catch {
      // 解析失败回退原值
    }
  }
  return trimmed;
}

/** 获取所有统计数据的聚合接口 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // 2026-09-27 审计修复：排序改为"最近优先"——物料行的部门/领用人/时间元数据取首个即
    // 最近一单（此前 ASC 取最早一单，按部门/领用人筛选会误判到最早的旧单上）
    const results = db.exec('SELECT * FROM material_requests ORDER BY apply_date DESC');
    const resultSet = results.length > 0 ? results[0] : null;
    const columns: string[] = resultSet ? resultSet.columns : [];
    // values 是二维数组 [[行1_val1, 行1_val2, ...], [行2_val1, ...]]
    const records = resultSet
      ? resultSet.values.map((rowValues: any[]) => {
          const item: Record<string, unknown> = {};
          rowValues.forEach((val, i) => { item[columns[i]] = val; });
          try { item.materials = JSON.parse(item.materials as string || '[]'); }
          catch { item.materials = []; }
          // 2026-09-26 防护：历史脏数据（双重 JSON 编码）解析结果是字符串而非数组，
          // 曾导致下方 mats.reduce 抛 TypeError → 统计接口 500。此处强制数组。
          if (!Array.isArray(item.materials)) item.materials = [];
          return item;
        })
      : [];

    // 2026-09-27 审计修复：只统计"已审批"申请单——此前 draft/pending/rejected/voided
    // 全部计入统计（与列表接口的状态过滤不一致，统计口径虚高）
    const approvedRecords = records.filter((r) => {
      const st = String((r as any).status || '');
      const aps = String((r as any).approval_status || '');
      return st === 'approved' || aps === 'approved';
    });

    // 2026-09-27 审计修复：实发量从出库单聚合——此前申请单行无 actualQuantity 字段，
    // actual_quantity 恒等于申请量、差异率恒为 0（统计页展示的是申请量而非实发量）。
    // 按"行级 applicationCode"归属到申请单；只统计已扣库存的出库单（completed/partial）。
    const dispatchedByRequest = new Map<string, Map<string, number>>();
    try {
      const exRows = db.exec('SELECT source_application_codes, execute_status_class, materials FROM material_executes');
      if (exRows.length > 0) {
        const cols = exRows[0].columns;
        const srcIdx = cols.indexOf('source_application_codes');
        const clsIdx = cols.indexOf('execute_status_class');
        const matIdx = cols.indexOf('materials');
        for (const row of exRows[0].values) {
          const cls = String(row[clsIdx] || '');
          if (cls !== 'completed' && cls !== 'partial') continue;
          let srcList: string[] = [];
          try { const p = JSON.parse(String(row[srcIdx] || '[]')); srcList = Array.isArray(p) ? p.map(String) : []; } catch { /* 忽略脏数据 */ }
          let mats: any[] = [];
          try { const p = JSON.parse(String(row[matIdx] || '[]')); mats = Array.isArray(p) ? p : []; } catch { /* 忽略脏数据 */ }
          for (const m of mats) {
            const code = m.materialCode || m.code || '';
            const qty = Number(m.actualQuantity ?? m.actualQty ?? m.quantity ?? 0) || 0;
            if (!code || qty <= 0) continue;
            // 行级来源优先；缺省时回退到单据级来源（历史数据兼容）
            const lineSrc = String(m.applicationCode || '');
            const targets = lineSrc ? [lineSrc] : srcList;
            for (const rc of targets) {
              const perMat = dispatchedByRequest.get(rc) || new Map<string, number>();
              perMat.set(code, (perMat.get(code) || 0) + qty);
              dispatchedByRequest.set(rc, perMat);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[material-statistics] 出库聚合失败（降级为仅申请量口径）:', e);
    }

    /** 全局物料实发量（跨申请单累加，物料统计行用） */
    const dispatchedByMaterial = new Map<string, number>();
    for (const perMat of dispatchedByRequest.values()) {
      for (const [code, qty] of perMat) {
        dispatchedByMaterial.set(code, (dispatchedByMaterial.get(code) || 0) + qty);
      }
    }

    // ------ 1. 物料级别统计 ------
    const materialMap = new Map<string, any>();
    for (const rec of approvedRecords) {
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
            // 2026-09-27 修复：plant_area JSON 解析为可读文本（此前原样透传显示乱码）
            usage_area: formatPlantArea((rec as any).plant_area),
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
        entry.total_amount += Number(m.unitPrice || 0) * Number(m.requestedQuantity || m.quantity || 0);
      }
    }
    // 2026-09-27 审计修复：实发量/实发金额 = 出库单聚合结果（此前恒等于申请量；
    // 实发金额按"申请金额/申请量"单价 × 实发量估算，用于差异分析）
    for (const entry of materialMap.values()) {
      const dispatched = dispatchedByMaterial.get(entry.material_code) || 0;
      entry.actual_quantity = dispatched;
      const unitPrice = entry.total_quantity > 0 ? entry.total_amount / entry.total_quantity : 0;
      entry.actual_amount = Math.round(dispatched * unitPrice * 100) / 100;
    }
    const materialStatistics = Array.from(materialMap.values());

    // ------ 2. 月度统计（按部门）------
    const monthlyMap = new Map<string, any>();
    for (const rec of approvedRecords) {
      const applyDate = String((rec as any).apply_date || '');
      if (!applyDate) continue;
      const parts = applyDate.split('-');
      const year = parts[0];
      const month = parts[1];
      if (!year || !month) continue;
      const dept = (rec as any).department_name || '';
      const key = `${year}-${month}-${dept}`;
      // 2026-09-27 审计修复：该单实发量 = 出库单按行归属到本单的实发量（此前恒等于申请量）
      const reqCode = String((rec as any).request_code || '');
      const perMatDispatched = dispatchedByRequest.get(reqCode) || new Map<string, number>();
      if (!monthlyMap.has(key)) {
        const mats = (rec.materials as any[]) || [];
        const totalQty = mats.reduce((s: number, m: any) => s + Number(m.requestedQuantity || m.quantity || 0), 0);
        const actualQty = mats.reduce((s: number, m: any) => s + (perMatDispatched.get(m.materialCode || m.code || '') || 0), 0);
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
        entry.actual_quantity += mats.reduce((s: number, m: any) => s + (perMatDispatched.get(m.materialCode || m.code || '') || 0), 0);
        entry.total_amount += mats.reduce((s: number, m: any) => s + Number(m.unitPrice || 0) * Number(m.requestedQuantity || m.quantity || 0), 0);
        entry.difference_rate = entry.total_quantity > 0 ? ((entry.actual_quantity - entry.total_quantity) / entry.total_quantity * 100) : 0;
      }
    }
    const monthlyStatistics = Array.from(monthlyMap.values()).map((e: any) => {
      e.material_types = e.material_types instanceof Set ? e.material_types.size : Number(e.material_types) || 0;
      e.difference_rate = Math.round(e.difference_rate * 10) / 10;
      return e;
    });

    // ------ 3. 分类汇总（饼图数据 + 真实金额）------
    const categoryMap = new Map<string, { qty: number; amount: number }>();
    for (const rec of approvedRecords) {
      const mats = (rec.materials as any[]) || [];
      for (const m of mats) {
        const code = m.materialCode || m.code || '';
        const cat = getCategoryByCode(code);
        const qty = Number(m.requestedQuantity || m.quantity || 0);
        const price = Number(m.unitPrice || 0);
        const itemAmount = qty * price;
        const existing = categoryMap.get(cat) || { qty: 0, amount: 0 };
        categoryMap.set(cat, { qty: existing.qty + qty, amount: existing.amount + itemAmount });
      }
    }
    const totalQty = Array.from(categoryMap.values()).reduce((s, v) => s + v.qty, 0);
    const categorySummary = Array.from(categoryMap.entries()).map(([name, { qty, amount }]) => {
      const amountInWan = Math.round((amount / 10000) * 100) / 100; // 转为万元，保留两位小数
      const percentage = totalQty > 0 ? Math.round((qty / totalQty) * 1000) / 10 : 0;
      const key = getCategoryKey(name);
      const colors = CATEGORY_COLORS[name] || { gradient: ['#9CA3AF', '#6B7280'], solid: '#9CA3AF' };
      return { name, key, value: qty, amount: amountInWan, percentage, ...colors };
    });

    // ------ 4. 分类趋势（月度堆叠柱状图）------
    const trendMap = new Map<string, Record<string, any>>();
    for (const rec of approvedRecords) {
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
