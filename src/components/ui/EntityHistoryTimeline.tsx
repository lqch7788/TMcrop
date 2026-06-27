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
import { Button } from '@/components/ui';
import { fetchFullHistory, type HistoryItem } from '@/services/entityHistoryService';
import { SOURCE_TYPE_MAP } from '@/constants/cropConstants';
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

interface EntityHistoryTimelineProps {
  /** 实体标识（seed-sources / seedlings / plantings） */
  entity: 'seed-sources' | 'seedlings' | 'plantings';
  /** 实体 ID */
  entityId: string;
  /** 实体编码（用于关联 material_flow_log） */
  entityCode: string;
  /** 实体的种源类型标签（仅种源页面传，如 seed/cutting/grafting 等） */
  entitySourceType?: string;
}

const CATEGORY_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'lifecycle', label: '创建/修改/删除' },
  { key: 'inbound', label: '入库' },
  { key: 'transaction', label: '库存流水' },
  { key: 'circulation', label: '回流' },
  { key: 'flow', label: '流转' },
] as const;

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

/** 种源类型 → 中文 */
function fmtSourceType(t?: string): string {
  if (!t) return '-';
  return SOURCE_TYPE_MAP[t] || t;
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

export function EntityHistoryTimeline({ entity, entityId, entityCode, entitySourceType }: EntityHistoryTimelineProps) {
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
    const sourceTypeLabel = fmtSourceType(entitySourceType);
    const rows = filtered.map((r, i) => ({
      '序号': i + 1,
      '时间': fmtTime(r.occurredAt),
      '类型': r.action,
      '来源': fmtInboundSource(r.inboundSource),
      '作物品种': r.cropName || '-',
      '种源类型': sourceTypeLabel,
      '数量变化': fmtDelta(r.quantityDelta, r.unit),
      '关联单号': r.refCode || '-',
      '关联模块': r.refModule || '-',
      '操作员': r.operatorName || '-',
      '备注': r.remarks || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
    ];
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
      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* 视图切换 */}
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
          {/* 分类筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-colors ${
                  filter === f.key
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} className="text-sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> 刷新
          </Button>
          <Button variant="default" size="sm" onClick={handleExport} disabled={filtered.length === 0} className="text-sm">
            <Download className="w-3.5 h-3.5 mr-1" /> 导出 Excel
          </Button>
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
            <table className="w-full text-sm">
              <thead className="bg-blue-500 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-left w-36">时间</th>
                  <th className="px-2 py-2 text-left w-24">类型</th>
                  <th className="px-2 py-2 text-left w-24">来源</th>
                  <th className="px-2 py-2 text-left w-24">作物品种</th>
                  <th className="px-2 py-2 text-left w-28 whitespace-nowrap">种源类型</th>
                  <th className="px-2 py-2 text-left w-24">数量变化</th>
                  <th className="px-2 py-2 text-left">关联单号</th>
                  <th className="px-2 py-2 text-left w-16">操作员</th>
                  <th className="px-2 py-2 text-left">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-xs text-gray-500 font-mono">{fmtTime(r.occurredAt)}</td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 text-xs rounded border ${catBadge(r.category)}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-gray-600">{fmtInboundSource(r.inboundSource)}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-700">{r.cropName || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-600">{fmtSourceType(entitySourceType)}</td>
                    <td className={`px-2 py-1.5 text-xs font-medium ${(r.quantityDelta ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtDelta(r.quantityDelta, r.unit)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono text-gray-600">{r.refCode || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-600">{r.operatorName || '-'}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-500">{r.remarks || '-'}</td>
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
