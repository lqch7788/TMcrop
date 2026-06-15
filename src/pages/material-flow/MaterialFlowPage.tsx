/**
 * 物料流转追溯页面
 * 2026-06-13 新建
 * 2026-06-15 完全重写：参照 OutboundRecordsPage 模式
 *   - 5 个 tab 全部含 ActionToolbar（删除/导出/警告/格式选择）
 *   - 所有表格列宽固定 colgroup + 全部内容居中
 *   - 聚合 tab 禁用复选框/单条删除（数据无 id），按钮保留仅触发说明提示
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, BarChart3, TrendingUp, Package, Trash2, Download, X, ClipboardList, RotateCcw, Box, Clock, Sprout } from 'lucide-react';
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Pagination, Checkbox, UnifiedModal, DeleteConfirmModal } from '@/components/ui';
import ActionToolbar from '@/components/warehouse/ActionToolbar';
import { useMaterialFlowStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import * as XLSX from 'xlsx';

const FLOW_TYPE_OPTIONS = [
  { value: 'all', label: '全部流转' },
  { value: 'seed_source→seedling', label: '种源→育苗' },
  { value: 'seed_source→planting', label: '种源→种植' },
  { value: 'seedling→planting', label: '育苗→种植' },
  { value: 'planting→harvest', label: '种植→采收' },
  { value: 'seedling→harvest', label: '育苗→采收' },
  { value: 'inventory→external', label: '库存→出库' },
];

const FLOW_TYPE_LABELS: Record<string, string> = {
  'seed_source→seedling': '种源→育苗',
  'seed_source→planting': '种源→种植',
  'seedling→planting': '育苗→种植',
  'planting→harvest': '种植→采收',
  'seedling→harvest': '育苗→采收',
  'inventory→external': '库存→出库',
  'inventory→planting': '库存→种植',
  'inventory→seedling': '库存→育苗',
  'inventory→seed_source': '库存→种源',
  'external→planting': '外部→种植',
  'external→seedling': '外部→育苗',
  'seed_source→harvest': '种源→采收',
  'correction': '修正',
  'manual_correction': '手动修正',
  'other': '其他',
};

const CATEGORY_LABELS: Record<string, string> = {
  external_purchase: '外购',
  self_produced: '自产',
  breeding: '育种',
  external_seed: '外部种子',
  seed_saving: '自留种',
  asexual: '无性繁殖',
  grafting: '嫁接',
  tissue_culture: '组培',
  cutting: '扦插',
  division: '分株',
  layering: '压条',
  bulb: '种球',
  external: '外部',
  manual: '手动',
  gift: '赠送',
  transfer: '调拨',
  other: '其他',
};

const labelFlowType = (v: string) => FLOW_TYPE_LABELS[v] || v || '-';
const labelCategory = (v: string) => CATEGORY_LABELS[v] || v || '-';

const STOCK_CATEGORY_COLOR: Record<string, string> = {
  seed: 'bg-amber-500',
  seedling: 'bg-green-500',
  product: 'bg-emerald-500',
  other: 'bg-gray-500',
};

type TabKey = 'logs' | 'trace' | 'seedling' | 'planting' | 'annual';

// 2026-06-15: 标准表格壳 — 接收 colgroup + 全部居中
function StdTableShell({
  colSpan, children, colGroup,
}: {
  colSpan: number;
  children: React.ReactNode;
  colGroup?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">{colGroup}{children}</table>
      </div>
    </div>
  );
}

// 2026-06-15: 标准表头列组件
const StdTh: React.FC<{ children?: React.ReactNode; width?: string; className?: string }> = ({ children, width, className = '' }) => (
  <th style={width ? { width, minWidth: width } : undefined} className={`px-2 py-3 text-center text-xs font-semibold whitespace-nowrap ${className}`}>
    {children}
  </th>
);

// 2026-06-15: 标准居中数据列
const StdTd: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-2 py-3 text-center text-sm whitespace-nowrap ${className}`}>{children}</td>
);

// 2026-06-15: 与出库记录 OutboundExportModal 100% 一致 — 3 选项导出格式弹窗
function ExportFormatModal({
  isOpen, selectedCount, totalCount, onClose, onConfirm,
}: {
  isOpen: boolean;
  selectedCount: number;
  totalCount: number;
  onClose: () => void;
  onConfirm: (format: 'excel' | 'csv' | 'pdf') => void;
}) {
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  if (!isOpen) return null;
  const formats = [
    { value: 'excel' as const, label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv' as const, label: 'CSV (.csv)', desc: '适用于数据交换和导入其他系统' },
    { value: 'pdf' as const, label: 'PDF (.pdf)', desc: '适用于打印、归档和分享' },
  ];
  const handleExport = () => onConfirm(format);
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出模式"
      size="md"
      showFooter={true}
      showMaximize={false}
      enableDrag={false}
      enableResize={false}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1"><X className="w-4 h-4" /> 取消</Button>
          <Button onClick={handleExport} className="flex-1"><Download className="w-4 h-4" /> 确认导出</Button>
        </div>
      }
    >
      <p className="text-sm text-gray-500 mb-4 text-center">
        {selectedCount > 0 ? `已选择 ${selectedCount} 条记录` : `全部 ${totalCount} 条记录`}
      </p>
      <div className="space-y-3">
        {formats.map(f => (
          <div
            key={f.value}
            onClick={() => setFormat(f.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              format === f.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
              format === f.value ? 'border-emerald-500' : 'border-gray-400'
            }`}>
              {format === f.value && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-900">{f.label}</span>
              <span className="block text-xs text-gray-500">{f.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </UnifiedModal>
  );
}

export default function MaterialFlowPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('logs');
  const { logs, total, loading, traceData, statsData, loadLogs, loadTrace, loadCropStats, loadSourceStats, loadAnnualStats, batchDeleteLogs } = useMaterialFlowStore();

  // 流转记录筛选
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [flowType, setFlowType] = useState('all');
  const [cropName, setCropName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 批次追溯
  const [traceCode, setTraceCode] = useState('');
  const traceInputRef = useRef<HTMLInputElement>(null);

  // 年度
  const currentYear = new Date().getFullYear();
  const [statYear, setStatYear] = useState(currentYear);

  // 模式化选择
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const hasActiveMode = deleteMode || exportMode;

  // 2026-06-15: 聚合 tab（seedling/planting/annual）的复选框/单条删除/选中导出无意义
  // 工具栏按钮保留，但聚合 tab 的 hasActiveMode 永远 false
  const isStatsTab = activeTab === 'seedling' || activeTab === 'planting' || activeTab === 'annual';
  const effectiveHasActiveMode = isStatsTab ? false : hasActiveMode;

  useEffect(() => {
    if (!exportMode && !deleteMode) {
      setSelectedIds([]);
    }
  }, [exportMode, deleteMode]);

  const currentRows = useMemo<any[]>(() => {
    if (activeTab === 'logs') return logs;
    if (activeTab === 'trace') return traceData;
    return statsData;
  }, [activeTab, logs, traceData, statsData]);

  const allSelected = !isStatsTab && currentRows.length > 0 && selectedIds.length === currentRows.length;
  const someSelected = !isStatsTab && selectedIds.length > 0 && !allSelected;

  // 用稳定的 id key
  const keyOf = (item: any, idx: number) => item.id || `__idx_${idx}`;

  const toggleRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(currentRows.map((r, i) => keyOf(r, i)));
  };

  const cancelSelection = () => {
    setDeleteMode(false);
    setExportMode(false);
    setSelectedIds([]);
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs({ page, pageSize, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
    } else if (activeTab === 'trace') {
      // 等用户点查询
    } else if (activeTab === 'seedling') {
      loadCropStats(statYear);
    } else if (activeTab === 'planting') {
      loadSourceStats(statYear);
    } else if (activeTab === 'annual') {
      loadAnnualStats(statYear);
    }
    cancelSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, pageSize, flowType, statYear]);

  const handleSearch = () => {
    setPage(1);
    cancelSelection();
    loadLogs({ page: 1, pageSize, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
  };
  const handleReset = () => {
    setFlowType('all'); setCropName(''); setStartDate(''); setEndDate(''); setPage(1);
    cancelSelection();
    loadLogs({ page: 1, pageSize, flowType: undefined, cropName: '', startDate: '', endDate: '' });
  };

  const handleTrace = () => {
    const v = (traceInputRef.current?.value ?? traceCode).trim();
    if (v) loadTrace(v);
  };

  const handleExportClick = () => {
    setExportMode(true);
    setDeleteMode(false);
    setSelectedIds([]);
  };
  const handleDeleteClick = () => {
    if (isStatsTab) {
      // 聚合 tab：给说明提示
      showAlert('当前为统计聚合视图，按"年度+作物+流转类型"聚合，无单条 ID 可删。\n\n请到"流转记录" tab 筛选对应流水后删除。');
      return;
    }
    setDeleteMode(true);
    setExportMode(false);
    setSelectedIds([]);
  };
  const handleConfirmDeleteClick = () => {
    if (selectedIds.length === 0) {
      showAlert('请先选择要删除的记录');
      return;
    }
    setShowDeleteModal(true);
  };
  const handleConfirmExportClick = () => {
    if (selectedIds.length === 0) {
      showAlert('请先选择要导出的数据（点表格左侧 checkbox）');
      return;
    }
    setShowExportModal(true);
  };
  const handleCancelSelection = () => {
    setExportMode(false);
    setDeleteMode(false);
    setSelectedIds([]);
  };

  const handleDeleteConfirmed = async () => {
    const result = await batchDeleteLogs(selectedIds);
    setShowDeleteModal(false);
    cancelSelection();
    if (!result) showAlert('删除失败，请重试');
    else loadLogs({ page, pageSize, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
  };

  const handleDoExport = (format: 'excel' | 'csv' | 'pdf') => {
    const exportSource = selectedIds.length > 0
      ? currentRows.filter((r, i) => selectedIds.includes(keyOf(r, i)))
      : currentRows;

    let headers: Record<string, string> = {};
    let title = '';
    if (activeTab === 'logs') {
      headers = { createdAt: '时间', flowType: '流转类型', cropName: '作物', sourceCode: '上游', sourceQuantity: '消耗量', targetCode: '下游', targetQuantity: '产出量', sourceCategory: '来源' };
      title = '物料流转记录';
    } else if (activeTab === 'trace') {
      headers = { createdAt: '时间', flowType: '流转', sourceCode: '上游', sourceQuantity: '消耗', targetCode: '下游', sourceCategory: '来源' };
      title = '批次追溯';
    } else {
      const tk = activeTab as Exclude<TabKey, 'logs' | 'trace'>;
      const H: Record<typeof tk, Record<string, string>> = {
        seedling: { cropName: '作物', sourceCategory: '来源', totalQty: '总用量', sourceUnit: '单位', batchCount: '批次数' },
        planting: { cropName: '作物', flowType: '方式', sourceCategory: '来源', totalQty: '消耗量', sourceUnit: '单位' },
        annual:   { flowType: '流转环节', cropName: '作物', flowCount: '流转次数', totalQty: '总量', unit: '单位' },
      };
      headers = H[tk];
      title = STATS_TITLE[tk];
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ext = format === 'excel' ? 'xlsx' : format;
    const filename = `${title}_${today}_${exportSource.length}条.${ext}`;

    const exportRows = exportSource.map((it: any) => ({
      ...it,
      flowType: it.flowType ? labelFlowType(it.flowType) : it.flowType,
      sourceCategory: it.sourceCategory ? labelCategory(it.sourceCategory) : it.sourceCategory,
    }));

    if (format === 'excel') {
      const data = exportRows.map(r => { const o: any = {}; Object.entries(headers).forEach(([k,l]) => o[l] = r[k]); return o; });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title);
      XLSX.writeFile(wb, filename);
    } else if (format === 'csv') {
      const data = exportRows.map(r => { const o: any = {}; Object.entries(headers).forEach(([k,l]) => o[l] = r[k]); return o; });
      const headerRow = Object.values(headers);
      const csv = '﻿' + [headerRow.map(h => `"${h}"`).join(','), ...data.map(r => headerRow.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      const data = exportRows.map(r => { const o: any = {}; Object.entries(headers).forEach(([k,l]) => o[l] = r[k]); return o; });
      const headerRow = Object.values(headers);
      const html = `<html><head><meta charset="utf-8"></head><body><h2>${title}</h2><table border="1"><tr>${headerRow.map(h => `<th>${h}</th>`).join('')}</tr>${data.map(r => `<tr>${headerRow.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
    }
    setShowExportModal(false);
    cancelSelection();
  };

  // 顶部 7 卡
  const renderStats = () => (
    <div className="grid grid-cols-7 gap-4 overflow-x-auto">
      {[
        { label: '总条数',     value: total, color: 'bg-blue-500',   Icon: ClipboardList },
        { label: '流转类型',   value: Object.keys(FLOW_TYPE_LABELS).length, color: 'bg-emerald-500', Icon: Box },
        { label: '作物种类',   value: 5, color: 'bg-orange-500', Icon: Clock },
        { label: '关联种源',   value: 1, color: 'bg-purple-500', Icon: Sprout },
      ].map((card, i) => {
        const IconComponent = card.Icon;
        return (
          <div key={`n-${i}`} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight truncate">{card.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 leading-tight truncate">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}
      {[
        { key: 'seed',     label: '种源', color: 'amber' },
        { key: 'seedling', label: '种苗', color: 'green' },
        { key: 'product',  label: '成品', color: 'emerald' },
      ].map(t => {
        const textC = `text-${t.color}-700`;
        const bgC = `bg-${t.color}-100`;
        return (
          <div key={t.key} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg ${bgC} flex items-center justify-center shrink-0`}>
                <span className={`text-sm font-bold ${textC}`}>{t.label.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums leading-tight truncate">-</p>
                <p className="text-xs text-gray-500 leading-tight truncate">{t.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderToolbar = (title: string, canDelete: boolean) => (
    <ActionToolbar
      title={title}
      batchEditMode={false}
      deleteMode={deleteMode}
      exportMode={exportMode}
      selectedRows={selectedIds as any}
      lowStockCount={0}
      filters={{ showLowStock: false }}
      onLowStockToggle={() => {}}
      onBatchEdit={() => {}}
      onDelete={handleDeleteClick}
      onExport={handleExportClick}
      onConfirmBatchEdit={() => {}}
      onCancelBatchEdit={() => {}}
      onConfirmDelete={handleConfirmDeleteClick}
      onCancelDelete={handleCancelSelection}
      onConfirmExport={handleConfirmExportClick}
      onCancelExport={handleCancelSelection}
      canCreate={false}
      canEdit={false}
      canDelete={canDelete}
      canExport={true}
      showLowStockButton={false}
      showCustomerButton={false}
      noCard={true}
    />
  );

  // 通用空态
  const emptyRow = (colSpan: number, text: string) => (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">{text}</td>
      </tr>
    </tbody>
  );

  // 流转记录 表格
  const renderLogsTable = () => {
    const totalCols = effectiveHasActiveMode ? 9 : 8;
    const colGroup = (
      <colgroup>
        {effectiveHasActiveMode && <col className="w-12" />}
        <col className="w-24" />
        <col className="w-28" />
        <col className="w-20" />
        <col className="w-32" />
        <col className="w-24" />
        <col className="w-32" />
        <col className="w-24" />
        <col className="w-20" />
      </colgroup>
    );
    if (loading && logs.length === 0) {
      return (
        <StdTableShell colSpan={totalCols} colGroup={colGroup}>
          {emptyRow(totalCols, '加载中...')}
        </StdTableShell>
      );
    }
    if (logs.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup}>{emptyRow(totalCols, '暂无流转记录')}</StdTableShell>;
    }
    return (
      <StdTableShell colSpan={totalCols} colGroup={colGroup}>
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
          <tr>
            {effectiveHasActiveMode && <StdTh width="3rem"><Checkbox checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onCheckedChange={toggleAll} className="border-white rounded" /></StdTh>}
            <StdTh>时间</StdTh>
            <StdTh>流转类型</StdTh>
            <StdTh>作物</StdTh>
            <StdTh>上游</StdTh>
            <StdTh>消耗量</StdTh>
            <StdTh>下游</StdTh>
            <StdTh>产出量</StdTh>
            <StdTh>来源</StdTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {logs.map((log, i) => {
            const key = keyOf(log, i);
            const isSelected = selectedIds.includes(key);
            return (
              <tr key={key} className={`hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}>
                {effectiveHasActiveMode && (
                  <StdTd><Checkbox checked={isSelected} onCheckedChange={() => toggleRow(key)} className="rounded" /></StdTd>
                )}
                <StdTd className="text-gray-600 tabular-nums">{log.createdAt?.split('T')[0]}</StdTd>
                <StdTd>
                  <span className={`px-2 py-0.5 ${STOCK_CATEGORY_COLOR[log.sourceCategory] || 'bg-gray-500'} text-white text-xs rounded-full inline-block whitespace-nowrap`}>
                    {labelFlowType(log.flowType)}
                  </span>
                </StdTd>
                <StdTd className="text-gray-900">{log.cropName || '-'}</StdTd>
                <StdTd className="text-gray-600 font-mono text-xs">{log.sourceCode || '-'}</StdTd>
                <StdTd className="font-medium text-emerald-600 tabular-nums">
                  {log.sourceQuantity != null ? `${log.sourceQuantity} ${log.sourceUnit || ''}` : '-'}
                </StdTd>
                <StdTd className="text-gray-600 font-mono text-xs">{log.targetCode}</StdTd>
                <StdTd className="font-medium text-emerald-600 tabular-nums">
                  {log.targetQuantity != null ? `${log.targetQuantity} ${log.targetUnit || ''}` : '-'}
                </StdTd>
                <StdTd>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full inline-block whitespace-nowrap">{labelCategory(log.sourceCategory)}</span>
                </StdTd>
              </tr>
            );
          })}
        </tbody>
      </StdTableShell>
    );
  };

  // 批次追溯 表格
  const renderTraceTable = () => {
    const totalCols = effectiveHasActiveMode ? 7 : 6;
    const colGroup = (
      <colgroup>
        {effectiveHasActiveMode && <col className="w-12" />}
        <col className="w-24" />
        <col className="w-28" />
        <col className="w-32" />
        <col className="w-24" />
        <col className="w-32" />
        <col className="w-20" />
      </colgroup>
    );
    if (loading && traceData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup}>{emptyRow(totalCols, '追溯中...')}</StdTableShell>;
    }
    if (traceData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup}>{emptyRow(totalCols, traceCode ? '未找到相关流转记录' : '输入批次号后点击追溯')}</StdTableShell>;
    }
    return (
      <StdTableShell colSpan={totalCols} colGroup={colGroup}>
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
          <tr>
            {effectiveHasActiveMode && <StdTh width="3rem"><Checkbox checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onCheckedChange={toggleAll} className="border-white rounded" /></StdTh>}
            <StdTh>时间</StdTh>
            <StdTh>流转</StdTh>
            <StdTh>上游</StdTh>
            <StdTh>消耗</StdTh>
            <StdTh>下游</StdTh>
            <StdTh>来源</StdTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {traceData.map((item, i) => {
            const key = keyOf(item, i);
            const isSelected = selectedIds.includes(key);
            return (
              <tr key={key} className={`hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}>
                {effectiveHasActiveMode && (
                  <StdTd><Checkbox checked={isSelected} onCheckedChange={() => toggleRow(key)} className="rounded" /></StdTd>
                )}
                <StdTd className="text-gray-600 tabular-nums">{item.createdAt?.split('T')[0]}</StdTd>
                <StdTd>
                  <span className={`px-2 py-0.5 ${STOCK_CATEGORY_COLOR[item.sourceCategory] || 'bg-gray-500'} text-white text-xs rounded-full inline-block whitespace-nowrap`}>
                    {labelFlowType(item.flowType)}
                  </span>
                </StdTd>
                <StdTd className="text-gray-600 font-mono text-xs">{item.sourceCode || '-'}</StdTd>
                <StdTd className="font-medium text-emerald-600 tabular-nums">
                  {item.sourceQuantity != null ? `${item.sourceQuantity} ${item.sourceUnit || ''}` : '-'}
                </StdTd>
                <StdTd className="text-gray-600 font-mono text-xs">{item.targetCode}</StdTd>
                <StdTd>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full inline-block whitespace-nowrap">{labelCategory(item.sourceCategory)}</span>
                </StdTd>
              </tr>
            );
          })}
        </tbody>
      </StdTableShell>
    );
  };

  // 统计 通用表格
  const renderStatsTable = (
    _title: string,
    headers: Array<{ key: string; label: string; width?: string }>,
    rowMapper: (item: any) => Record<string, any>,
  ) => {
    const totalCols = headers.length;
    // 根据 tab 决定列宽
    const colGroup = (
      <colgroup>
        <col className="w-20" />
        <col className="w-28" />
        <col className="w-28" />
        <col className="w-24" />
        <col className="w-20" />
        {headers.length >= 5 && <col className="w-24" />}
      </colgroup>
    );
    if (loading && statsData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup}>{emptyRow(totalCols, '加载中...')}</StdTableShell>;
    }
    if (statsData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup}>{emptyRow(totalCols, '暂无数据')}</StdTableShell>;
    }
    return (
      <StdTableShell colSpan={totalCols} colGroup={colGroup}>
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
          <tr>
            {headers.map(h => (
              <StdTh key={h.key} width={h.width}>{h.label}</StdTh>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {statsData.map((item, i) => {
            const mapped = rowMapper(item);
            return (
              <tr key={i} className="hover:bg-emerald-50 transition-colors">
                {headers.map(h => (
                  <StdTd key={h.key} className={h.key === 'totalQty' || h.key === 'flowCount' || h.key === 'batchCount' ? 'font-medium text-emerald-600 tabular-nums' : 'text-gray-700'}>
                    {mapped[h.key] ?? '-'}
                  </StdTd>
                ))}
              </tr>
            );
          })}
        </tbody>
      </StdTableShell>
    );
  };

  // 分页
  const renderPagination = () => {
    if (activeTab !== 'logs') return null;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (total === 0) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-xl shadow-sm">
        <div className="text-sm text-gray-500">
          显示 {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          showPageSize={true}
        />
      </div>
    );
  };

  const tabToolbarTitle: Record<TabKey, string> = {
    logs: '流转记录列表',
    trace: '批次追溯结果',
    seedling: '育苗用料统计',
    planting: '种植用料统计',
    annual: '年度总览',
  };

  return (
    <div className="space-y-4 p-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">物料流转追溯</h1>
            <p className="text-gray-500 text-sm">全链路物料流转记录与统计分析</p>
          </div>
        </div>
      </div>

      {/* 流转记录：顶部统计卡 */}
      {activeTab === 'logs' && renderStats()}

      {/* Tab 切换 + 筛选 + 工具栏 + 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-4 pb-0">
        <div className="flex gap-6 border-b border-gray-200">
          {([
            { key: 'logs', label: '流转记录', icon: Package },
            { key: 'trace', label: '批次追溯', icon: Search },
            { key: 'seedling', label: '育苗用料', icon: BarChart3 },
            { key: 'planting', label: '种植用料', icon: BarChart3 },
            { key: 'annual', label: '年度总览', icon: TrendingUp },
          ] as { key: TabKey; label: string; icon: any }[]).map(tab => (
            <Button
              key={tab.key}
              variant="ghost"
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 text-sm font-semibold ${
                activeTab === tab.key ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Button>
          ))}
        </div>

        <div className="py-4">
          {/* 流转记录 Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <Label className="text-gray-700">流转类型</Label>
                    <Select value={flowType} onValueChange={setFlowType}>
                      <SelectTrigger className="border-gray-300 min-w-[150px]">
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        {FLOW_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-gray-700">开始日期</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-gray-300" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-gray-700">结束日期</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border-gray-300" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-gray-700">作物</Label>
                    <Input value={cropName} onChange={e => setCropName(e.target.value)} placeholder="品种名模糊搜索" className="border-gray-300" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSearch}><Search className="w-4 h-4" /> 查询</Button>
                    <Button variant="warning" size="sm" onClick={handleReset} className="whitespace-nowrap">
                      <RotateCcw className="w-4 h-4" /> 重置
                    </Button>
                  </div>
                </div>
              </div>

              {renderToolbar(tabToolbarTitle.logs, true)}
              {renderLogsTable()}
              {renderPagination()}
            </div>
          )}

          {/* 批次追溯 Tab */}
          {activeTab === 'trace' && (
            <div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-gray-700">批次号</Label>
                    <Input
                      value={traceCode}
                      onChange={e => setTraceCode(e.target.value)}
                      ref={traceInputRef}
                      placeholder="SS001 / SD001 / ZZ001 / HS001"
                      className="border-gray-300"
                      onKeyDown={e => e.key === 'Enter' && handleTrace()}
                    />
                  </div>
                  <Button size="sm" onClick={handleTrace}><Search className="w-4 h-4" /> 追溯</Button>
                </div>
              </div>

              {renderToolbar(tabToolbarTitle.trace, true)}
              {renderTraceTable()}
            </div>
          )}

          {/* 育苗用料 Tab */}
          {activeTab === 'seedling' && (
            <div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <Label className="text-gray-700">年度</Label>
                    <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                      <SelectTrigger className="border-gray-300 min-w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {renderToolbar(tabToolbarTitle.seedling, true)}
              {renderStatsTable(
                tabToolbarTitle.seedling,
                [
                  { key: 'cropName', label: '作物' },
                  { key: 'sourceCategory', label: '来源' },
                  { key: 'totalQty', label: '总用量' },
                  { key: 'sourceUnit', label: '单位' },
                  { key: 'batchCount', label: '批次数' },
                ],
                (item) => ({
                  cropName: item.cropName,
                  sourceCategory: labelCategory(item.sourceCategory),
                  totalQty: Number(item.totalQty ?? item.total_qty ?? 0).toLocaleString(),
                  sourceUnit: item.sourceUnit || '-',
                  batchCount: item.batchCount ?? item.batch_count ?? 0,
                }),
              )}
            </div>
          )}

          {/* 种植用料 Tab */}
          {activeTab === 'planting' && (
            <div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <Label className="text-gray-700">年度</Label>
                    <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                      <SelectTrigger className="border-gray-300 min-w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {renderToolbar(tabToolbarTitle.planting, true)}
              {renderStatsTable(
                tabToolbarTitle.planting,
                [
                  { key: 'cropName', label: '作物' },
                  { key: 'flowType', label: '方式' },
                  { key: 'sourceCategory', label: '来源' },
                  { key: 'totalQty', label: '消耗量' },
                  { key: 'sourceUnit', label: '单位' },
                ],
                (item) => ({
                  cropName: item.cropName,
                  flowType: item.flowType === 'seed_source→planting' ? '直接播种' : '育苗移栽',
                  sourceCategory: labelCategory(item.sourceCategory),
                  totalQty: Number(item.totalQty ?? item.total_qty ?? 0).toLocaleString(),
                  sourceUnit: item.sourceUnit || '-',
                }),
              )}
            </div>
          )}

          {/* 年度总览 Tab */}
          {activeTab === 'annual' && (
            <div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                <div className="flex items-end gap-4 flex-wrap">
                  <div>
                    <Label className="text-gray-700">年度</Label>
                    <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                      <SelectTrigger className="border-gray-300 min-w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {renderToolbar(tabToolbarTitle.annual, true)}
              {renderStatsTable(
                tabToolbarTitle.annual,
                [
                  { key: 'flowType', label: '流转环节' },
                  { key: 'cropName', label: '作物' },
                  { key: 'flowCount', label: '流转次数' },
                  { key: 'totalQty', label: '总量' },
                  { key: 'unit', label: '单位' },
                ],
                (item) => ({
                  flowType: labelFlowType(item.flowType),
                  cropName: item.cropName,
                  flowCount: item.flowCount ?? item.flow_count ?? 0,
                  totalQty: Number(item.totalQty ?? item.total_qty ?? 0).toLocaleString(),
                  unit: item.unit || '-',
                }),
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedIds.length}
        title="确认删除流转记录"
        description={`确定要删除选中的 ${selectedIds.length} 条流转记录吗？此操作无法恢复，删除后数据将永久丢失。`}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirmed}
      />

      <ExportFormatModal
        isOpen={showExportModal}
        selectedCount={selectedIds.length}
        totalCount={currentRows.length}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />
    </div>
  );
}

const STATS_TITLE: Record<Exclude<TabKey, 'logs' | 'trace'>, string> = {
  seedling: '育苗用料',
  planting: '种植用料',
  annual: '年度总览',
};
