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
import { Input } from '../../ui/input';
import { Pagination } from '../../ui/Pagination';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { DatePicker } from '../../ui/DatePicker';
import { RotateCcw, Eye, ClipboardList, Box, Clock, Sprout } from 'lucide-react';
import {
  OutboundRow,
  OutboundSummary,
  OutboundQuery,
} from '../../../services/inventoryTransactionService';
import {
  getPlantingModeLabel,
} from '../../../constants/cropConstants';

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
  // V3.1 用户调整：7 个卡（4 数值 + 3 分类）强制同一行
  // 数据全部从 props 传入（summary），**不硬编码**任何 mock 数据
  const numberCards = [
    { label: '总条数',       value: summary?.totalCount ?? 0,     color: 'bg-blue-500',   Icon: ClipboardList },
    { label: '总出库量',     value: summary?.totalQuantity ?? 0,  color: 'bg-emerald-500', Icon: Box },
    { label: '今日出库次数', value: summary?.todayCount ?? 0,     color: 'bg-orange-500',  Icon: Clock },
    { label: '品种数',       value: Object.keys(summary?.byStockType ?? {}).length, color: 'bg-purple-500', Icon: Sprout },
  ];
  // 3 个类型卡（从 byStockType 取数，不硬编码）
  const typeCards = [
    { key: 'seed',     label: '种源', color: 'amber',   data: summary?.byStockType?.seed     || { count: 0, quantity: 0 } },
    { key: 'seedling', label: '种苗', color: 'green',   data: summary?.byStockType?.seedling || { count: 0, quantity: 0 } },
    { key: 'product',  label: '成品', color: 'emerald', data: summary?.byStockType?.product  || { count: 0, quantity: 0 } },
  ];
  const typeColorMap: Record<string, { text: string; bg: string }> = {
    amber:   { text: 'text-amber-700',   bg: 'bg-amber-100' },
    green:   { text: 'text-green-700',   bg: 'bg-green-100' },
    emerald: { text: 'text-emerald-700', bg: 'bg-emerald-100' },
  };
  return (
    // 7 个卡同一行：grid-cols-7 强制 7 列（小屏可滚动 overflow-x-auto）
    <div className="grid grid-cols-7 gap-4 overflow-x-auto">
      {/* 4 个数值卡（带图标） */}
      {numberCards.map((card, i) => {
        const IconComponent = card.Icon;
        return (
          <div
            key={`n-${i}`}
            className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight truncate">
                  {loading ? '…' : card.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 leading-tight truncate">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}
      {/* 3 个类型卡（无图标，纯色 chip 风格） */}
      {typeCards.map((t) => {
        const c = typeColorMap[t.color];
        return (
          <div
            key={t.key}
            className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <span className={`text-sm font-bold ${c.text}`}>
                  {t.label.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight truncate">
                  {loading ? '…' : t.data.count.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 leading-tight truncate">
                  {t.label} · {loading ? '…' : t.data.quantity.toLocaleString()}
                </p>
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
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-end gap-4 flex-wrap">
        {/* 开始日期 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">开始日期</Label>
          <DatePicker
            selected={value.from ? new Date(value.from) : undefined}
            onChange={(d) => handleField('from', d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '')}
            className="border-gray-300"
          />
        </div>
        {/* 结束日期 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">结束日期</Label>
          <DatePicker
            selected={value.to ? new Date(value.to) : undefined}
            onChange={(d) => handleField('to', d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '')}
            className="border-gray-300"
          />
        </div>
        {/* 库存类型 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">库存类型</Label>
          <Select
            value={value.stockType || 'all'}
            onValueChange={(v) => handleField('stockType', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="seed">种源</SelectItem>
              <SelectItem value="seedling">种苗</SelectItem>
              <SelectItem value="product">成品</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* 业务类型 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">业务类型</Label>
          <Select
            value={value.businessType || 'all'}
            onValueChange={(v) => handleField('businessType', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="harvest">采收入库</SelectItem>
              <SelectItem value="purchase">采购入库</SelectItem>
              <SelectItem value="manual">手动新建</SelectItem>
              <SelectItem value="transfer">调拨入库</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* 品种 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">品种</Label>
          <Input
            value={value.cropName || ''}
            onChange={(e) => handleField('cropName', e.target.value)}
            placeholder="品种名模糊搜索"
            className="border-gray-300"
          />
        </div>
        {/* 出库人 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">出库人</Label>
          <Input
            value={value.operatorName || ''}
            onChange={(e) => handleField('operatorName', e.target.value)}
            placeholder="操作人姓名"
            className="border-gray-300"
          />
        </div>
        {/* 按钮 */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onReset} className="whitespace-nowrap">
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ 4. 15 列表格（加 exportMode checkbox 共 16 列） ============

interface OutboundRecordsTableProps {
  data: OutboundRow[];
  loading: boolean;
  pagination: { current: number; pageSize: number };
  total: number;
  onChange: (p: { current: number; pageSize: number }) => void;
  onViewDetail: (instanceId: string) => void;
  /** 导出模式：开启后表格第 1 列显示 checkbox */
  exportMode?: boolean;
  /** 已选中的 instanceId 列表 */
  selectedRows?: string[];
  onSelectionChange?: (instanceIds: string[]) => void;
  /** 表头全选 checkbox 回调 */
  onSelectAll?: () => void;
}

export function OutboundRecordsTable({
  data, loading, pagination, total, onChange, onViewDetail,
  exportMode = false, selectedRows = [], onSelectionChange, onSelectAll,
}: OutboundRecordsTableProps) {
  // 字典/标签全部从映射取（不硬编码）
  const stockLabel = (s: string) => STOCK_TYPE_LABEL[s]?.label || s;
  const stockColor = (s: string) => STOCK_TYPE_LABEL[s]?.color || 'bg-gray-500';
  const bizMeta = (b?: string) => BUSINESS_TYPE_META[b || 'unknown'] || BUSINESS_TYPE_META.unknown;

  const colSpan = exportMode ? 16 : 15;
  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const toggleRow = (instanceId: string) => {
    if (!onSelectionChange) return;
    if (selectedRows.includes(instanceId)) {
      onSelectionChange(selectedRows.filter(id => id !== instanceId));
    } else {
      onSelectionChange([...selectedRows, instanceId]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold w-14 whitespace-nowrap">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onSelectAll}
                    className="border-white rounded"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">实例ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">业务单号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植模式</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收区域</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">品质</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">出库量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">仓库</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">业务</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出库人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">余额前→后</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>加载中...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                  暂无出库记录
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-emerald-50 transition-colors">
                  {exportMode && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRows.includes(row.instanceId)}
                        onCheckedChange={() => toggleRow(row.instanceId)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onViewDetail(row.instanceId)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                    >
                      {row.instanceId}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{row.businessCode || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 ${stockColor(row.stockType)} text-white text-xs rounded-full`}>
                      {stockLabel(row.stockType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{row.cropName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{row.varietyName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getPlantingModeLabel(row.plantingMode) || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-xs truncate" title={row.greenhouseName}>{row.greenhouseName || '-'}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{row.grade || '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-emerald-600 whitespace-nowrap">
                    {row.quantityOut} {row.unit || ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-xs truncate" title={row.warehouseName}>{row.warehouseName || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${bizMeta(row.businessType).color}`}>
                      {bizMeta(row.businessType).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.operatorName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap font-mono">
                    {row.balanceBefore} → {row.balanceAfter}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button variant="link" size="sm" onClick={() => onViewDetail(row.instanceId)} className="text-blue-600 hover:text-blue-800" title="查看详情">
                      <Eye className="w-4 h-4" />
                      详情
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.operateDate}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={pagination.current}
          totalPages={Math.max(1, Math.ceil(total / pagination.pageSize))}
          onPageChange={(p) => onChange({ ...pagination, current: p })}
          pageSize={pagination.pageSize}
          onPageSizeChange={(s) => onChange({ current: 1, pageSize: s })}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
