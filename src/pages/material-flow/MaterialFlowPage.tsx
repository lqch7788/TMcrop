/**
 * 物料流转追溯页面
 * 2026-06-13 新建
 * 2026-06-15 完全重写：参照 OutboundRecordsPage 模式
 *   - 5 个 tab 全部含 ActionToolbar（删除/导出/警告/格式选择）
 *   - 所有表格列宽固定 colgroup + 全部内容居中
 *   - 聚合 tab 禁用复选框/单条删除（数据无 id），按钮保留仅触发说明提示
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, BarChart3, TrendingUp, Package, Trash2, Download, X, RotateCcw } from 'lucide-react';
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Pagination, Checkbox, UnifiedModal, DeleteConfirmModal } from '@/components/ui';
import ActionToolbar from '@/components/warehouse/ActionToolbar';
import { useMaterialFlowStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { InventoryDetailModal } from '@/components/farm/inventory/InventoryDetailModal';
import * as XLSX from 'xlsx';

const FLOW_TYPE_OPTIONS = [
  { value: 'all', label: '全部流转' },
  { value: 'planting→seed_source', label: '种植→种源' },
  { value: 'seed_source→seedling', label: '种源→育苗' },
  { value: 'seed_source→planting', label: '种源→种植' },
  { value: 'seedling→planting', label: '育苗→种植' },
  { value: 'plan→seed_source', label: '计划→种源' },
  { value: 'correction', label: '修正' },
  { value: 'inventory→external', label: '库存→出库' },
  { value: 'inventory→freeze', label: '库存→冻结' },
  { value: 'inventory→planting', label: '库存→种植' },
  { value: 'external→planting', label: '外部→种植' },
  { value: 'seedling→harvest', label: '育苗→采收' },
  { value: 'external→seedling', label: '外部→育苗' },
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
  'plan→seed_source': '计划→种源',
  'planting→seed_source': '种植→种源',
  'inventory→freeze': '库存→冻结',
  'harvest→inventory': '采收→入库',
  'other': '其他',
};

// 2026-06-15: 流转类型配色 — 按业务环节分组用色系区分（同类相近，跨类高对比）
// 起步链（种源）=蓝；生长链（育苗/种植）=绿/靛；产出链（采收）=橙；库存链=青；外部=紫；修正/其他=灰
const FLOW_TYPE_COLOR: Record<string, string> = {
  'seed_source→seedling': 'bg-blue-500',
  'seed_source→planting': 'bg-indigo-500',
  'seed_source→harvest':  'bg-blue-600',
  'seedling→planting':    'bg-emerald-500',
  'seedling→harvest':     'bg-emerald-600',
  'planting→harvest':     'bg-orange-500',
  'inventory→external':   'bg-red-500',
  'inventory→planting':   'bg-cyan-500',
  'inventory→seedling':   'bg-cyan-600',
  'inventory→seed_source':'bg-cyan-700',
  'external→planting':    'bg-purple-500',
  'external→seedling':    'bg-purple-600',
  'correction':           'bg-gray-500',
  'manual_correction':    'bg-gray-500',
  'plan→seed_source':     'bg-sky-500',
  'planting→seed_source': 'bg-teal-500',
  'inventory→freeze':     'bg-rose-500',
  'harvest→inventory':    'bg-orange-600',
  'other':                'bg-slate-500',
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
  planting: '种植',
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

// 2026-06-15: 起点/去向 code 旁边的"业务类型"小徽章
// 优先用后端 sourceType/targetType 字段；其次按 code 前缀推断；都没有就显示纯 code
const TYPE_LABELS: Record<string, string> = {
  seed_source: '种源',
  seedling: '育苗',
  planting: '种植',
  harvest: '采收',
  plan: '计划',
  inventory: '库存',
  inventory_stock: '库存',
  seed: '种源',
  external_seed: '外部种',
  external: '外部',
  internal_planting: '内部种植',
  transfer_out: '调拨出库',
  correction: '修正',
  manual_freeze: '手动冻结',
  order: '订单冻结',
  customer_sale: '客户销售',
};
const CODE_PREFIX_TYPE: Record<string, string> = {
  SS: '种源',
  SD: '育苗',
  PL: '种植',
  HS: '采收',
  YM: '育苗',
  ZZ: '计划',
  EXT: '外部',
  STG: '阶段',
  R: '区域', // R6/R6B
  F: '农场', // F-P1A
  P: '区域', // P1A/P1B
  DEL: '删除', // 测试残留
  D: '调试', // 兜底
};
const TYPE_BADGE_COLOR: Record<string, string> = {
  种源: 'bg-blue-100 text-blue-700',
  育苗: 'bg-emerald-100 text-emerald-700',
  种植: 'bg-indigo-100 text-indigo-700',
  采收: 'bg-orange-100 text-orange-700',
  计划: 'bg-sky-100 text-sky-700',
  库存: 'bg-cyan-100 text-cyan-700',
  外部种: 'bg-purple-100 text-purple-700',
  外部: 'bg-purple-100 text-purple-700',
  内部种植: 'bg-teal-100 text-teal-700',
  调拨出库: 'bg-rose-100 text-rose-700',
  手动冻结: 'bg-blue-100 text-blue-700',
  订单冻结: 'bg-purple-100 text-purple-700',
  客户销售: 'bg-emerald-100 text-emerald-700',
  阶段: 'bg-slate-100 text-slate-700',
  区域: 'bg-slate-100 text-slate-700',
  农场: 'bg-slate-100 text-slate-700',
  删除: 'bg-rose-100 text-rose-700',
  调试: 'bg-gray-200 text-gray-700',
};
const badgeOf = (type?: string | null, code?: string | null): { label: string | null; color: string } => {
  let label: string | null = type ? TYPE_LABELS[type] || null : null;
  if (!label && code) {
    // 取 2-3 位大写字母前缀
    const m = String(code).match(/^([A-Z]{2,3})/);
    if (m) label = CODE_PREFIX_TYPE[m[1]] || null;
  }
  return { label, color: label ? (TYPE_BADGE_COLOR[label] || 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-500' };
};

// 在 code 前面加"业务类型"小徽章 + code 本身
// 当 type 为 inventory_stock 或 inventory 时，code 即为 instanceId，可点击跳转库存详情
const CodeCell: React.FC<{
  type?: string | null;
  code?: string | null;
  emptyLabel?: string;
  onInventoryClick?: (instanceId: string) => void;
}> = ({ type, code, emptyLabel = '-', onInventoryClick }) => {
  if (!code) return <span className="text-gray-400 text-xs">{emptyLabel}</span>;
  const { label, color } = badgeOf(type, code);
  const isInventory = type === 'inventory_stock' || type === 'inventory';

  return (
    <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
      {label && <span className={`px-1.5 py-0.5 ${color} text-[10px] rounded font-medium`}>{label}</span>}
      {isInventory && onInventoryClick ? (
        <button
          type="button"
          onClick={() => onInventoryClick(code)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs cursor-pointer"
          title={`查看库存详情: ${code}`}
        >
          {code}
        </button>
      ) : (
        <span className="text-gray-600 font-mono text-xs">{code}</span>
      )}
    </span>
  );
};

type TabKey = 'logs' | 'trace' | 'seedling' | 'planting' | 'annual';

// 2026-06-15: 标准表格壳 — 接收 colgroup + 全部居中
function StdTableShell({
  colSpan, children, colGroup, tableFixed,
}: {
  colSpan: number;
  children: React.ReactNode;
  colGroup?: React.ReactNode;
  // 2026-06-15: stats 表格需要 table-fixed 让 colgroup 百分比列宽生效
  tableFixed?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <table className={`w-full ${tableFixed ? 'table-fixed' : ''}`}>{colGroup}{children}</table>
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
  // 库存详情弹窗（从流转记录点击 instanceId 时触发）
  const [detailInstanceId, setDetailInstanceId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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

  // 各 tab 的原始数据
  const currentRows = useMemo<any[]>(() => {
    if (activeTab === 'logs') return logs;
    if (activeTab === 'trace') return traceData;
    return statsData;
  }, [activeTab, logs, traceData, statsData]);

  // 分页后展示的数据：logs 走服务端分页（数据已切好），其他 tab 走客户端切片
  const pagedData = useMemo<any[]>(() => {
    if (activeTab === 'logs') return currentRows;
    const start = (page - 1) * pageSize;
    return currentRows.slice(start, start + pageSize);
  }, [currentRows, page, pageSize, activeTab]);

  const allSelected = !isStatsTab && pagedData.length > 0 && selectedIds.length === pagedData.length;
  const someSelected = !isStatsTab && selectedIds.length > 0 && !allSelected;

  // 用稳定的 id key
  const keyOf = (item: any, idx: number) => item.id || `__idx_${idx}`;

  const toggleRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(pagedData.map((r, i) => keyOf(r, i)));
  };

  const cancelSelection = () => {
    setDeleteMode(false);
    setExportMode(false);
    setSelectedIds([]);
  };

  // 切换 tab 时重置页码并清空选中
  useEffect(() => {
    setPage(1);
    cancelSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 数据加载（logs 依赖筛选条件 + 分页，其他 tab 依赖年度 + 主动触发）
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs({ page, pageSize, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
    } else if (activeTab === 'trace') {
      // 2026-06-15: 进入批次追溯 tab 时若尚未有数据，自动取最近一条 source_code 加载示例，避免空表
      if (traceData.length === 0 && !traceCode) {
        const seed = logs[0]?.sourceCode || logs[0]?.source_code;
        if (seed) {
          setTraceCode(seed);
          loadTrace(seed);
        } else {
          // logs 还没拉过，临时拉第 1 条用作种子
          // 2026-07-10 P0-6 修复：catch(() => {}) → catch(e) { console.error(...) }
          // 2026-07-10 bugfix：补回 else 块闭合符（之前漏了导致 TS1128 编译错误）
          loadLogs({ page: 1, pageSize: 1 }).then(() => {
            const c = useMaterialFlowStore.getState().logs[0]?.sourceCode;
            if (c) { setTraceCode(c); loadTrace(c); }
          }).catch((e) => { console.error('[MaterialFlowPage] 初始 logs 拉取失败:', e); });
        }
      }
    } else if (activeTab === 'seedling') {
      loadCropStats(statYear);
    } else if (activeTab === 'planting') {
      loadSourceStats(statYear);
    } else if (activeTab === 'annual') {
      loadAnnualStats(statYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, pageSize, flowType, cropName, startDate, endDate, statYear]);

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
    if (!result) {
      showAlert('删除失败，请重试');
      return;
    }
    // 2026-07-28 审核 H-8：删除成功后重置 page=1，避免"幽灵页"（最后一页删完停在该页）
    setPage(1);
    loadLogs({ page: 1, pageSize, flowType: flowType === 'all' ? undefined : flowType, cropName, startDate, endDate });
  };

  // 点击库存实例ID → 打开库存详情弹窗
  const handleViewInventoryDetail = (instanceId: string) => {
    setDetailInstanceId(instanceId);
    setDetailOpen(true);
  };

  const handleDoExport = (format: 'excel' | 'csv' | 'pdf') => {
    const exportSource = selectedIds.length > 0
      ? currentRows.filter((r, i) => selectedIds.includes(keyOf(r, i)))
      : currentRows;

    let headers: Record<string, string> = {};
    let title = '';
    if (activeTab === 'logs') {
      headers = { createdAt: '时间', flowType: '流转类型', cropName: '作物', sourceCode: '起点', sourceQuantity: '消耗量', targetCode: '去向', targetQuantity: '产出量', sourceCategory: '来源' };
      title = '物料流转记录';
    } else if (activeTab === 'trace') {
      headers = { createdAt: '时间', flowType: '流转', sourceCode: '起点', sourceQuantity: '消耗', targetCode: '去向', sourceCategory: '来源' };
      title = '批次追溯';
    } else {
      const tk = activeTab as Exclude<TabKey, 'logs' | 'trace'>;
      const H: Record<typeof tk, Record<string, string>> = {
        // 2026-07-21 修复：删除不存在的 batchCount 字段（后端返回无此字段）
        seedling: { cropName: '作物', sourceCategory: '来源', totalQty: '总用量', sourceUnit: '单位' },
        planting: { cropName: '作物', flowType: '方式', sourceCategory: '来源', totalQty: '消耗量', sourceUnit: '单位' },
        annual:   { flowType: '流转环节', cropName: '作物', flowCount: '流转次数', totalQty: '总量', unit: '单位' },
      };
      headers = H[tk];
      title = STATS_TITLE[tk];
    }

    // 2026-07-10 P0-1 修复：用 todayLocal() 替代 toISOString() 避免 UTC 时区 bug
    const today = todayLocal().replace(/-/g, '');
    const ext = format === 'excel' ? 'xlsx' : format;
    const filename = `${title}_${today}_${exportSource.length}条.${ext}`;

    // 2026-07-21 修复：统一 camelCase 字段名（后端可能返回 snake_case）
    // 2026-07-28 审核 LOW：合并重复赋值（line 522 与 530 同名覆盖）+ 删除 unit: it.unit || it.unit 恒等赋值
    const exportRows = exportSource.map((it: any) => ({
      ...it,
      cropName: it.cropName || it.crop_name,
      totalQty: it.totalQty ?? it.total_qty,
      sourceUnit: it.sourceUnit || it.source_unit,
      flowCount: it.flowCount ?? it.flow_count,
      // 翻译（覆盖上面的未翻译值）
      flowType: it.flowType || it.flow_type ? labelFlowType(it.flowType || it.flow_type) : it.flowType,
      sourceCategory: it.sourceCategory || it.source_category ? labelCategory(it.sourceCategory || it.source_category) : it.sourceCategory,
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
      // 2026-07-10 P0-6 修复：浏览器拦截弹窗时 silent failure 加 console.warn
      else { console.warn('[MaterialFlowPage] window.open 被浏览器拦截，PDF 导出失败'); }
    }
    setShowExportModal(false);
    cancelSelection();
  };


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
    if (pagedData.length === 0) {
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
            <StdTh>起点</StdTh>
            <StdTh>消耗量</StdTh>
            <StdTh>去向</StdTh>
            <StdTh>产出量</StdTh>
            <StdTh>来源</StdTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {pagedData.map((log: any, i: number) => {
            const key = keyOf(log, i);
            const isSelected = selectedIds.includes(key);
            return (
              <tr key={key} className={`hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}>
                {effectiveHasActiveMode && (
                  <StdTd><Checkbox checked={isSelected} onCheckedChange={() => toggleRow(key)} className="rounded" /></StdTd>
                )}
                <StdTd className="text-gray-600 tabular-nums">{log.createdAt?.split('T')[0]}</StdTd>
                <StdTd>
                  <span className={`px-2 py-0.5 ${FLOW_TYPE_COLOR[log.flowType] || 'bg-slate-500'} text-white text-xs rounded-full inline-block whitespace-nowrap`}>
                    {labelFlowType(log.flowType)}
                  </span>
                </StdTd>
                <StdTd className="text-gray-900">{log.cropName || '-'}</StdTd>
                <StdTd><CodeCell type={log.sourceType} code={log.sourceCode} onInventoryClick={handleViewInventoryDetail} /></StdTd>
                <StdTd className="font-medium text-emerald-600 tabular-nums">
                  {log.sourceQuantity != null ? `${log.sourceQuantity} ${log.sourceUnit || ''}` : '-'}
                </StdTd>
                <StdTd><CodeCell type={log.targetType} code={log.targetCode} onInventoryClick={handleViewInventoryDetail} /></StdTd>
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
    if (pagedData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup}>{emptyRow(totalCols, traceCode ? '未找到相关流转记录' : '输入批次号后点击追溯')}</StdTableShell>;
    }
    return (
      <StdTableShell colSpan={totalCols} colGroup={colGroup}>
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
          <tr>
            {effectiveHasActiveMode && <StdTh width="3rem"><Checkbox checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onCheckedChange={toggleAll} className="border-white rounded" /></StdTh>}
            <StdTh>时间</StdTh>
            <StdTh>流转</StdTh>
            <StdTh>起点</StdTh>
            <StdTh>消耗</StdTh>
            <StdTh>去向</StdTh>
            <StdTh>来源</StdTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {pagedData.map((item: any, i: number) => {
            const key = keyOf(item, i);
            const isSelected = selectedIds.includes(key);
            return (
              <tr key={key} className={`hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}>
                {effectiveHasActiveMode && (
                  <StdTd><Checkbox checked={isSelected} onCheckedChange={() => toggleRow(key)} className="rounded" /></StdTd>
                )}
                <StdTd className="text-gray-600 tabular-nums">{item.createdAt?.split('T')[0]}</StdTd>
                <StdTd>
                  <span className={`px-2 py-0.5 ${FLOW_TYPE_COLOR[item.flowType] || 'bg-slate-500'} text-white text-xs rounded-full inline-block whitespace-nowrap`}>
                    {labelFlowType(item.flowType)}
                  </span>
                </StdTd>
                <StdTd><CodeCell type={item.sourceType} code={item.sourceCode} onInventoryClick={handleViewInventoryDetail} /></StdTd>
                <StdTd className="font-medium text-emerald-600 tabular-nums">
                  {item.sourceQuantity != null ? `${item.sourceQuantity} ${item.sourceUnit || ''}` : '-'}
                </StdTd>
                <StdTd><CodeCell type={item.targetType} code={item.targetCode} onInventoryClick={handleViewInventoryDetail} /></StdTd>
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
    // 2026-06-15: 等分列宽铺满整个容器 + 显式声明 table-fixed 让 colgroup 生效
    // 用百分比避免 w-20/w-28 这类固定宽度在窄屏溢出
    const equalPct = `${(100 / totalCols).toFixed(4)}%`;
    const colGroup = (
      <colgroup>
        {headers.map((h, i) => (
          <col key={i} style={{ width: h.width || equalPct }} />
        ))}
      </colgroup>
    );
    if (loading && pagedData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup} tableFixed>{emptyRow(totalCols, '加载中...')}</StdTableShell>;
    }
    if (pagedData.length === 0) {
      return <StdTableShell colSpan={totalCols} colGroup={colGroup} tableFixed>{emptyRow(totalCols, '暂无数据')}</StdTableShell>;
    }
    return (
      <StdTableShell colSpan={totalCols} colGroup={colGroup} tableFixed>
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
          <tr>
            {headers.map(h => (
              <StdTh key={h.key} width={h.width}>{h.label}</StdTh>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {pagedData.map((item: any, i: number) => {
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

  // 分页：logs 用服务端 total，其他 tab 用客户端 currentRows.length
  const renderPagination = () => {
    const totalItems = activeTab === 'logs' ? total : currentRows.length;
    if (totalItems === 0) return null;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-xl shadow-sm">
        <div className="text-sm text-gray-500">
          显示 {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} 条，共 {totalItems} 条
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
            <h1 className="text-2xl font-bold text-gray-900">流转追溯</h1>
            <p className="text-gray-500 text-sm">全链路物料流转记录与统计分析</p>
          </div>
        </div>
      </div>


      {/* Tab 切换 + 筛选 + 工具栏 + 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-4 pb-0">
        {/* Tab 导航 — 两层结构 */}
        <div className="border-b border-gray-200">
          {/* 第一层：主数据源 — 翠绿高亮背景 */}
          <div className={`flex items-center px-3 py-0.5 transition-colors ${
            activeTab === 'logs'
              ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50'
              : 'bg-gray-50/50'
          }`}>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('logs')}
              className={`relative py-3 text-sm font-semibold rounded-none ${
                activeTab === 'logs'
                  ? 'text-emerald-700'
                  : 'text-gray-600 hover:text-emerald-600'
              }`}
            >
              <Package className="w-4 h-4 mr-1.5" />
              流转记录
              <span className="ml-2 text-xs font-normal text-gray-400">全部物料流转原始明细</span>
              {activeTab === 'logs' && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Button>
          </div>

          {/* 关联箭头 + 第二层：数据分析视图 */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/70 border-t border-gray-100">
            <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
              <span className="text-gray-300">└</span>
              基于以上数据
            </span>
            <div className="flex items-center gap-1">
              {([
                { key: 'trace' as TabKey, label: '批次追溯', icon: Search, hint: '按批次号追踪完整链路', color: 'blue' },
                { key: 'seedling' as TabKey, label: '育苗用料', icon: BarChart3, hint: '种源→育苗消耗统计', color: 'green' },
                { key: 'planting' as TabKey, label: '种植用料', icon: BarChart3, hint: '种源/种苗→种植消耗统计', color: 'amber' },
                { key: 'annual' as TabKey, label: '年度总览', icon: TrendingUp, hint: '全链路年度汇总', color: 'purple' },
              ]).map(tab => {
                const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
                  green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700' },
                  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
                };
                const c = colorMap[tab.color];
                const isActive = activeTab === tab.key;
                return (
                  <Button
                    key={tab.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab.key)}
                    title={tab.hint}
                    className={`relative py-1.5 text-sm font-bold rounded-md transition-all ${
                      isActive
                        ? `${c.bg} ${c.text} border ${c.border} shadow-sm`
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60 border border-transparent'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-1" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
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
                    <Label className="text-gray-700">
                      批次号
                      <span className="text-gray-400 text-xs font-normal ml-2">
                        输入种源/育苗/种植/计划编码，追溯该批次的完整流转链路
                      </span>
                    </Label>
                    <Input
                      value={traceCode}
                      onChange={e => setTraceCode(e.target.value)}
                      ref={traceInputRef}
                      placeholder="如: ZZ20260630-001 / YM20260701-001 / PL1782974079098"
                      className="border-gray-300"
                      onKeyDown={e => e.key === 'Enter' && handleTrace()}
                    />
                  </div>
                  <Button size="sm" onClick={handleTrace}><Search className="w-4 h-4" /> 追溯</Button>
                </div>
              </div>

              {renderToolbar(tabToolbarTitle.trace, true)}
              {renderTraceTable()}
              {renderPagination()}
            </div>
          )}

          {/* 育苗用料 Tab */}
          {activeTab === 'seedling' && (
            <div>
              {renderToolbar(
                <span className="inline-flex items-center gap-1.5">
                  育苗用料统计
                  <Label className="text-gray-400 text-xs font-normal ml-3">年度</Label>
                  <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                    </SelectContent>
                  </Select>
                </span>,
                true,
              )}

              {renderStatsTable(
                tabToolbarTitle.seedling,
                [
                  { key: 'targetCode', label: '育苗批次号' },
                  { key: 'cropName', label: '作物' },
                  { key: 'sourceCategory', label: '来源' },
                  { key: 'totalQty', label: '总用量' },
                  { key: 'sourceUnit', label: '单位' },
                ],
                (item) => ({
                  targetCode: item.targetCode ?? item.target_code ?? '-',
                  cropName: item.cropName,
                  sourceCategory: labelCategory(item.sourceCategory),
                  totalQty: Number(item.totalQty ?? item.total_qty ?? 0).toLocaleString(),
                  sourceUnit: item.sourceUnit || '-',
                }),
              )}
              {renderPagination()}
            </div>
          )}

          {/* 种植用料 Tab */}
          {activeTab === 'planting' && (
            <div>
              {renderToolbar(
                <span className="inline-flex items-center gap-1.5">
                  种植用料统计
                  <Label className="text-gray-400 text-xs font-normal ml-3">年度</Label>
                  <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                    </SelectContent>
                  </Select>
                </span>,
                true,
              )}

              {renderStatsTable(
                tabToolbarTitle.planting,
                [
                  { key: 'targetCode', label: '种植批次号' },
                  { key: 'cropName', label: '作物' },
                  { key: 'flowType', label: '方式' },
                  { key: 'sourceCategory', label: '来源' },
                  { key: 'totalQty', label: '消耗量' },
                  { key: 'sourceUnit', label: '单位' },
                ],
                (item) => ({
                  targetCode: item.targetCode ?? item.target_code ?? '-',
                  cropName: item.cropName,
                  flowType: item.flowType === 'seed_source→planting' ? '直接播种' : '育苗移栽',
                  sourceCategory: labelCategory(item.sourceCategory),
                  totalQty: Number(item.totalQty ?? item.total_qty ?? 0).toLocaleString(),
                  sourceUnit: item.sourceUnit || '-',
                }),
              )}
              {renderPagination()}
            </div>
          )}

          {/* 年度总览 Tab */}
          {activeTab === 'annual' && (
            <div>
              {renderToolbar(
                <span className="inline-flex items-center gap-1.5">
                  年度总览
                  <Label className="text-gray-400 text-xs font-normal ml-3">年度</Label>
                  <Select value={String(statYear)} onValueChange={v => setStatYear(Number(v))}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[currentYear, currentYear - 1, currentYear - 2].map(y => <SelectItem key={y} value={String(y)}>{y}年</SelectItem>)}
                    </SelectContent>
                  </Select>
                </span>,
                true,
              )}

              {renderStatsTable(
                tabToolbarTitle.annual,
                [
                  { key: 'flowType', label: '流转环节' },
                  { key: 'cropName', label: '作物' },
                  { key: 'sourceCode', label: '来源批次' },
                  { key: 'targetCode', label: '去向批次' },
                  { key: 'sourceCategory', label: '来源类型' },
                  { key: 'flowCount', label: '流转次数' },
                  { key: 'totalQty', label: '总量' },
                  { key: 'unit', label: '单位' },
                ],
                (item) => ({
                  flowType: labelFlowType(item.flowType),
                  cropName: item.cropName,
                  sourceCode: item.sourceCode ?? item.source_code ?? '-',
                  targetCode: item.targetCode ?? item.target_code ?? '-',
                  sourceCategory: labelCategory(item.sourceCategory),
                  flowCount: item.flowCount ?? item.flow_count ?? 0,
                  totalQty: Number(item.totalQty ?? item.total_qty ?? 0).toLocaleString(),
                  unit: item.unit || '-',
                }),
              )}
              {renderPagination()}
            </div>
          )}
        </div>
      </div>

      {/* 库存详情弹窗（点击流转记录中的 instanceId 触发） */}
      <InventoryDetailModal
        isOpen={detailOpen}
        stock={detailInstanceId ? ({ instanceId: detailInstanceId } as any) : null}
        onClose={() => {
          setDetailOpen(false);
          setDetailInstanceId(null);
        }}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedIds.length}
        title="⚠️ 确认删除流转记录"
        description={`确定要删除选中的 ${selectedIds.length} 条流转记录吗？

⚠️ 删除后：
• 流转追溯链将断裂，无法还原作物从种源→育苗→种植→采收→出库的完整流转路径
• 数据永久丢失，无法恢复

ℹ️ 注意：删除仅移除流转日志记录，不会影响已执行的业务操作（冻结数量、种植数量、出库记录等保持不变）。

请谨慎操作，确认无误后再执行删除。`}
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
