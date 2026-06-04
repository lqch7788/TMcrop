/**
 * 出库记录 4 个组件 (V3.1)
 * 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §7
 *
 * 组件模式：每个组件独立 export，按 props 解耦
 * - OutboundRecordsStats:           4 个紧凑型统计卡
 * - (OutboundRecordsStockTypeCards 复用作物库存 InventoryStockTypeCards)
 * - OutboundRecordsFilter:          6 维筛选 + 时间范围
 * - OutboundRecordsTable:           15 列数据表（含操作）
 *
 * 数据全部从 props 传入，**不硬编码**任何业务数据
 * 字典码 → 中文从 cropConstants.ts 复用映射
 */

import React, { useMemo } from 'react';
import { Button } from '../../ui/button';
import { Input, Select } from '../../ui/Modal';
import { Pagination } from '../../ui/Pagination';
import { Eye, ClipboardList, Box, Clock, Sprout } from 'lucide-react';
import {
  OutboundRow,
  OutboundSummary,
  OutboundQuery,
} from '../../../services/inventoryTransactionService';
import {
  getPlantingModeLabel,
} from '../../../constants/cropConstants';

// 复用作物库存的"分类汇总"紧凑型组件（组件模式 — 不重复造轮子）
export { InventoryStockTypeCards as OutboundRecordsStockTypeCards } from './InventoryStockTypeCards';

// ============ 1. Stats 4 卡 ============

interface OutboundRecordsStatsProps {
  summary: OutboundSummary | null;
  loading: boolean;
}

const STOCK_TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  seed:     { label: '种源', color: 'bg-amber-500',   icon: '🌱' },
  seedling: { label: '种苗', color: 'bg-green-500',   icon: '🌿' },
  product:  { label: '成品', color: 'bg-emerald-500', icon: '📦' },
};

const BUSINESS_TYPE_META: Record<string, { label: string; color: string }> = {
  harvest:     { label: '采收入库', color: 'bg-orange-100 text-orange-700' },
  purchase:    { label: '采购入库', color: 'bg-blue-100 text-blue-700' },
  manual:      { label: '手动新建', color: 'bg-slate-100 text-slate-700' },
  transfer:    { label: '调拨入库', color: 'bg-cyan-100 text-cyan-700' },
  other:       { label: '其他',     color: 'bg-gray-100 text-gray-700' },
  unknown:     { label: '未知',     color: 'bg-gray-100 text-gray-500' },
};

export function OutboundRecordsStats({ summary, loading }: OutboundRecordsStatsProps) {
  // 紧凑型（对齐作物库存 InventoryStats 风格：小图标 + 小 padding + lucide 图标）
  const cards = [
    { label: '总条数',       value: summary?.totalCount ?? 0,     color: 'bg-blue-500',   Icon: ClipboardList },
    { label: '总出库量',     value: summary?.totalQuantity ?? 0,  color: 'bg-emerald-500', Icon: Box },
    { label: '今日出库次数', value: summary?.todayCount ?? 0,     color: 'bg-orange-500',  Icon: Clock },
    { label: '品种数',       value: Object.keys(summary?.byStockType ?? {}).length, color: 'bg-purple-500', Icon: Sprout },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const IconComponent = card.Icon;
        return (
          <div
            key={i}
            className="bg-white rounded-lg p-2 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-md ${card.color} flex items-center justify-center shrink-0`}>
                <IconComponent className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 tabular-nums leading-tight">
                  {loading ? '…' : card.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ 2. 3 个库存类型卡 ============

// OutboundRecordsStockTypeCards 已在文件顶部 re-export 复用作物库存 InventoryStockTypeCards

// ============ 3. 6 维筛选 ============

interface OutboundRecordsFilterProps {
  value: OutboundQuery;
  onChange: (q: OutboundQuery) => void;
  onReset: () => void;
}

export function OutboundRecordsFilter({ value, onChange, onReset }: OutboundRecordsFilterProps) {
  const handleField = (field: keyof OutboundQuery, v: string) => {
    onChange({ ...value, [field]: v || undefined });
  };
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">开始日期</label>
          <Input
            type="date"
            value={value.from}
            onChange={(e) => handleField('from', e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">结束日期</label>
          <Input
            type="date"
            value={value.to}
            onChange={(e) => handleField('to', e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">库存类型</label>
          <Select
            value={value.stockType || ''}
            onChange={(e) => handleField('stockType', e.target.value)}
            options={[
              { value: '',         label: '全部' },
              { value: 'seed',     label: '种源' },
              { value: 'seedling', label: '种苗' },
              { value: 'product',  label: '成品' },
            ]}
            className="w-32"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">业务类型</label>
          <Select
            value={value.businessType || ''}
            onChange={(e) => handleField('businessType', e.target.value)}
            options={[
              { value: '',         label: '全部' },
              { value: 'harvest',  label: '采收入库' },
              { value: 'purchase', label: '采购入库' },
              { value: 'manual',   label: '手动新建' },
              { value: 'transfer', label: '调拨入库' },
            ]}
            className="w-32"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">品种</label>
          <Input
            value={value.cropName || ''}
            onChange={(e) => handleField('cropName', e.target.value)}
            placeholder="品种名模糊搜索"
            className="w-32"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">出库人</label>
          <Input
            value={value.operatorName || ''}
            onChange={(e) => handleField('operatorName', e.target.value)}
            placeholder="操作人姓名"
            className="w-32"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          重置
        </Button>
      </div>
    </div>
  );
}

// ============ 4. 18 列表格 ============

interface OutboundRecordsTableProps {
  data: OutboundRow[];
  loading: boolean;
  pagination: { current: number; pageSize: number };
  total: number;
  onChange: (p: { current: number; pageSize: number }) => void;
  onViewDetail: (instanceId: string) => void;
}

export function OutboundRecordsTable({ data, loading, pagination, total, onChange, onViewDetail }: OutboundRecordsTableProps) {
  // 字典/标签全部从映射取（不硬编码）
  const stockLabel = (s: string) => STOCK_TYPE_LABEL[s]?.label || s;
  const stockColor = (s: string) => STOCK_TYPE_LABEL[s]?.color || 'bg-gray-500';
  const bizMeta = (b?: string) => BUSINESS_TYPE_META[b || 'unknown'] || BUSINESS_TYPE_META.unknown;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-420px)]">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">业务单号</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">操作时间</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">实例ID</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">类型</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">作物</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">品种</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">种植模式</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">采收区域</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">品质</th>
              <th className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap">出库量</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">仓库</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">业务</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">出库人</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">余额前→后</th>
              <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>加载中...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
                  暂无出库记录
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-emerald-50 transition-colors">
                  <td className="px-3 py-2 text-xs font-mono text-gray-700 whitespace-nowrap">{row.businessCode || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.operateDate}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onViewDetail(row.instanceId)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                    >
                      {row.instanceId}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 ${stockColor(row.stockType)} text-white text-xs rounded font-medium`}>
                      {stockLabel(row.stockType)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">{row.cropName || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.varietyName || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{getPlantingModeLabel(row.plantingMode) || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap max-w-xs truncate" title={row.greenhouseName}>{row.greenhouseName || '-'}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{row.grade || '-'}</td>
                  <td className="px-3 py-2 text-xs font-medium text-right text-emerald-600 whitespace-nowrap">
                    {row.quantityOut} {row.unit || ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap max-w-xs truncate" title={row.warehouseName}>{row.warehouseName || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs rounded ${bizMeta(row.businessType).color}`}>
                      {bizMeta(row.businessType).label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.operatorName || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap font-mono">
                    {row.balanceBefore} → {row.balanceAfter}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Button variant="link" size="sm" onClick={() => onViewDetail(row.instanceId)} className="text-blue-600 hover:text-blue-800" title="查看详情">
                      <Eye className="w-4 h-4" />
                      详情
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">共 {total.toLocaleString()} 条</div>
        <Pagination
          currentPage={pagination.current}
          totalPages={Math.max(1, Math.ceil(total / pagination.pageSize))}
          onPageChange={(p) => onChange({ ...pagination, current: p })}
          pageSize={pagination.pageSize}
          onPageSizeChange={(s) => onChange({ current: 1, pageSize: s })}
          pageSizeOptions={[20, 50, 100]}
          showPageSize
        />
      </div>
    </div>
  );
}
