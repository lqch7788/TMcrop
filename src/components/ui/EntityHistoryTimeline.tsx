/**
 * EntityHistoryTimeline — 实体历史双视图组件（2026-06-27）
 *
 * 功能：
 * - 双视图切换：时间线 ↔ 表格
 * - 分类筛选：全部 / 创建修改 / 入库 / 库存流水 / 回流 / 流转
 * - 导出 Excel（表格视图下可用）
 * - 刷新按钮
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Clock, Table2, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button, Tooltip } from '@/components/ui';
import { fetchFullHistory, type HistoryItem } from '@/services/entityHistoryService';
import * as XLSX from 'xlsx';

/** 入库来源类型 → 中文（外购入库/调拨入库/自产入库 等） */
const INBOUND_SOURCE_LABELS: Record<string, string> = {
  external_purchased: '外购入库',
  self_produced: '自产入库',
  self_use: '自用入库',
  external_sale: '外售入库',
  transfer_inbound: '调拨入库',
  transfer_out: '调拨出库',
  transfer_in: '退库入库',
  circulation: '回流',
  seed_saving: '留种',
  // 实际数据中 source_type 也会存 source_module 的值
  seed_source: '种源入库',
  seedling: '育苗入库',
  planting: '种植入库',
  inventory: '库存调拨',
  manual: '手动入库',
  correction: '数量修正',
  external: '外部入库',
};

/**
 * 类型列配置：每个 entity 都有自己的"类型"概念
 * - 种源：source_type（seed/cutting/grafting 等）→ "种源类型"
 * - 育苗：seedling_form（花朵/枝条/裸根苗/穴盘苗 等）→ "种苗类型"
 * - 种植：harvest_form（整株/花朵/果实/种子 等）→ "成品类型"
 * 调用方传 typeColumn 才会显示该列；不传则不显示
 */
export interface TypeColumnConfig {
  /** 列标题（"种源类型"/"种苗类型"/"成品类型"） */
  label: string;
  /** 该 entity 的类型值（已格式化好的中文） */
  value: string;
}

interface EntityHistoryTimelineProps {
  /** 实体标识（seed-sources / seedlings / plantings） */
  entity: 'seed-sources' | 'seedlings' | 'plantings';
  /** 实体 ID */
  entityId: string;
  /** 实体编码（用于关联 material_flow_log） */
  entityCode: string;
  /**
   * 实体的"类型"列配置（2026-06-27 新增，替代原硬编码"种源类型"列）
   * - 不传则不显示"类型"列
   * - 传了则按 label 显示列标题，value 显示单元格内容
   */
  typeColumn?: TypeColumnConfig;
}

/** 分类筛选配置（含悬停说明） */
const CATEGORY_FILTERS: ReadonlyArray<{
  key: string;
  label: string;
  description: string;
}> = [
  { key: 'all',          label: '全部',              description: '显示所有类型的追溯记录，不做分类筛选。' },
  { key: 'lifecycle',    label: '创建/修改/删除',     description: '记录本身的生命周期变更：创建、修改、删除等基础操作。' },
  { key: 'inbound',      label: '入库',              description: '实体相关的入库记录，如外购入库、调拨入库、自产入库、自用入库、外售入库等。' },
  { key: 'transaction',  label: '库存流水',          description: '库存数量进出流水：领料出库、退料入库、库存调拨、采收入库、库存修正等。' },
  { key: 'circulation',  label: '回流',              description: '种源自身的状态变更账：无性繁殖、留种、G0/G1 育种、数量回填、废弃处置等（数据源：crop_circulation_records）。' },
  { key: 'flow',         label: '流转',              description: '全链路物料流日志：种源↔育苗、种源↔种植、库存↔种源、外部↔育苗等业务流转事件（数据源：material_flow_log）。' },
];

/** 时间格式化 */
function fmtTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}

/** 数量变化显示 */
function fmtDelta(delta?: number, unit?: string): string {
  if (delta == null) return '-';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${unit ? ' ' + unit : ''}`;
}

/** 入库来源 → 中文 */
function fmtInboundSource(t?: string): string {
  if (!t) return '-';
  return INBOUND_SOURCE_LABELS[t] || t;
}

/** 分类标签颜色 */
function catBadge(cat: string): string {
  switch (cat) {
    case 'lifecycle': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'inbound': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'transaction': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'circulation': return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'flow': return 'bg-purple-100 text-purple-700 border-purple-300';
    default: return 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

export function EntityHistoryTimeline({ entity, entityId, entityCode, typeColumn }: EntityHistoryTimelineProps) {
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const data = await fetchFullHistory(entity, entityId, entityCode);
      setItems(data);
    } catch (e) {
      console.error('[EntityHistoryTimeline] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [entity, entityId, entityCode]);

  useEffect(() => { void load(); }, [load]);

  // 筛选
  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.category === filter)),
    [items, filter],
  );

  // 导出 Excel
  const handleExport = () => {
    if (filtered.length === 0) return;
    // 类型列：有 typeColumn 则用其 label/value，否则不导出该列
    const typeLabel = typeColumn?.label;
    const typeValue = typeColumn?.value || '-';
    const rows = filtered.map((r, i) => {
      const row: Record<string, string | number> = {
        '序号': i + 1,
        '时间': fmtTime(r.occurredAt),
        '类型': r.action,
        '来源': fmtInboundSource(r.inboundSource),
        '作物品种': r.cropName || '-',
        '数量变化': fmtDelta(r.quantityDelta, r.unit),
        '关联单号': r.refCode || '-',
        '关联模块': r.refModule || '-',
        '操作员': r.operatorName || '-',
        '备注': r.remarks || '-',
      };
      if (typeLabel) row[typeLabel] = typeValue;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    // 动态列宽：固定列 + 可选类型列
    const baseCols = [
      { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
    ];
    if (typeLabel) {
      // 把"类型列"插入到"作物品种"之后（位置 4）
      baseCols.splice(4, 0, { wch: 12 });
    }
    ws['!cols'] = baseCols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '追溯历史');
    XLSX.writeFile(wb, `追溯历史_${entityCode}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 工具栏：拆成两行，用文字标签明确维度（视图 / 数据分类） */}
      <div className="space-y-2.5">
        {/* 第一行：视图切换（左侧） + 操作按钮（右侧） */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 shrink-0">视图：</span>
            {/* 视图切换：pill 风格，强互斥二选一 */}
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                onClick={() => setView('timeline')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                  view === 'timeline' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="w-4 h-4" /> 时间线
              </button>
              <button
                onClick={() => setView('table')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md flex items-center gap-1.5 transition-colors ${
                  view === 'table' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Table2 className="w-4 h-4" /> 表格
              </button>
            </div>
          </div>
          {/* 操作按钮（独立于筛选） */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={load} className="text-sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> 刷新
            </Button>
            <Button variant="default" size="sm" onClick={handleExport} disabled={filtered.length === 0} className="text-sm">
              <Download className="w-3.5 h-3.5 mr-1" /> 导出 Excel
            </Button>
          </div>
        </div>

        {/* 第二行：数据分类筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 shrink-0">数据分类：</span>
          {CATEGORY_FILTERS.map((f) => (
            <Tooltip key={f.key} content={f.description} position="top" multiline>
              <button
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors ${
                  filter === f.key
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="text-xs text-gray-500">
        共 {filtered.length} 条记录
        {filter !== 'all' && `（已筛选：${CATEGORY_FILTERS.find((f) => f.key === filter)?.label}）`}
      </div>

      {/* 内容区 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">暂无追溯记录</div>
      ) : view === 'timeline' ? (
        /* ===== 时间线模式 ===== */
        <div className="relative pl-6 border-l-2 border-emerald-200 space-y-3">
          {filtered.map((item, idx) => (
            <div key={item.id || idx} className="relative">
              {/* 时间线圆点 */}
              <div className="absolute -left-[calc(1.5rem+3px)] top-1.5 w-3 h-3 rounded-full border-2 border-emerald-400 bg-white" />
              {/* 卡片 */}
              <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">{fmtTime(item.occurredAt)}</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded border ${catBadge(item.category)}`}>
                    {item.action}
                  </span>
                  {item.quantityDelta != null && (
                    <span className={`text-xs font-medium ${item.quantityDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtDelta(item.quantityDelta, item.unit)}
                    </span>
                  )}
                  {item.refCode && (
                    <span className="text-xs text-gray-500 font-mono">{item.refCode}</span>
                  )}
                  {item.operatorName && (
                    <span className="text-xs text-gray-400 ml-auto">by {item.operatorName}</span>
                  )}
                </div>
                {item.remarks && (
                  <div className="text-xs text-gray-500 mt-1">{item.remarks}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ===== 表格模式 ===== */
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            {/* table-fixed：列宽由 <th> 决定，不被内容撑开（解决"备注列占 1/3 宽度"问题） */}
            <table className="w-full text-sm table-fixed">
              <colgroup>
                {/* 不带 typeColumn 时：8 列比例 18/9/12/11/13/17/8/12 */}
                {/* 带 typeColumn 时：9 列比例 17/9/11/10/10/11/16/7/9 */}
                {typeColumn ? (
                  <>
                    <col className="w-[17%]" /> {/* 时间 */}
                    <col className="w-[9%]" />  {/* 类型 */}
                    <col className="w-[11%]" /> {/* 来源 */}
                    <col className="w-[10%]" /> {/* 作物品种 */}
                    <col className="w-[10%]" /> {/* 类型列（种源类型/种苗类型/成品类型） */}
                    <col className="w-[11%]" /> {/* 数量变化 */}
                    <col className="w-[16%]" /> {/* 关联单号 */}
                    <col className="w-[7%]" />  {/* 操作员 */}
                    <col className="w-[9%]" />  {/* 备注 */}
                  </>
                ) : (
                  <>
                    <col className="w-[18%]" /> {/* 时间 */}
                    <col className="w-[9%]" />  {/* 类型 */}
                    <col className="w-[12%]" /> {/* 来源 */}
                    <col className="w-[11%]" /> {/* 作物品种 */}
                    <col className="w-[13%]" /> {/* 数量变化 */}
                    <col className="w-[17%]" /> {/* 关联单号 */}
                    <col className="w-[8%]" />  {/* 操作员 */}
                    <col className="w-[12%]" /> {/* 备注 */}
                  </>
                )}
              </colgroup>
              <thead className="bg-blue-500 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left whitespace-nowrap">时间</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap">类型</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap">来源</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap">作物品种</th>
                  {typeColumn && (
                    <th className="px-2 py-2 text-left whitespace-nowrap">{typeColumn.label}</th>
                  )}
                  <th className="px-2 py-2 text-left whitespace-nowrap">数量变化</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap">关联单号</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap">操作员</th>
                  <th className="px-2 py-2 text-left whitespace-nowrap">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-xs text-gray-500 font-mono truncate" title={fmtTime(r.occurredAt)}>{fmtTime(r.occurredAt)}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 text-xs rounded border whitespace-nowrap ${catBadge(r.category)}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-600 truncate" title={fmtInboundSource(r.inboundSource)}>{fmtInboundSource(r.inboundSource)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700 truncate" title={r.cropName || '-'}>{r.cropName || '-'}</td>
                    {typeColumn && (
                      <td className="px-2 py-1.5 text-xs text-gray-600 truncate" title={typeColumn.value || '-'}>{typeColumn.value || '-'}</td>
                    )}
                    <td className={`px-2 py-1.5 text-xs font-medium whitespace-nowrap ${(r.quantityDelta ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtDelta(r.quantityDelta, r.unit)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono text-gray-600 truncate" title={r.refCode || '-'}>{r.refCode || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-600 truncate" title={r.operatorName || '-'}>{r.operatorName || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-500 truncate" title={r.remarks || '-'}>
                      {r.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default EntityHistoryTimeline;
