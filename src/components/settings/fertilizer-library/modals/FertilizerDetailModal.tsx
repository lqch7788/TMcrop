/**
 * 肥料详情查看弹窗组件（扁平化 2026-07-12）
 * 2026-07-17：重构为 Tab 布局 — 基础信息 + 使用记录
 * - 基础信息 Tab：原 26 字段（DB fertilizer_specs 所有列）
 * - 使用记录 Tab：调用 GET /api/pest-records/by-spec/:specId，反向追溯防治记录
 *   - 显示用过此肥料的防治记录：编号/作物/区域/操作员/时间/用量/费用
 *   - 顶部 stat 卡：累计用量 / 累计费用 / 使用次数
 *   - 表格样式与肥料库一致：蓝色渐变表头 + divide-gray-300
 *   - 底部翻页 + 页码 + 导出按钮（CSV / XLSX / Word 仿肥料库）
 */
import React, { useEffect, useState, useMemo } from 'react';
import { History, Package, Loader2, Download, X as XIcon, Trash2, ArrowDownToLine } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { FertilizerSpec, useToastStore, useFertilizerLibraryStore } from '@/stores';
import { getDictItemName } from '@/stores';
import { exportXlsx, exportCsv } from '@/services/exporters';
import { showConfirm } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
// 2026-08-15：施肥时期 Badge 配色从共享常量导入（原 Detail/StockIn 两处重复定义）
import { TIMING_BADGE_OPTIONS } from '../constants';

interface FertilizerDetailModalProps {
  isOpen: boolean;
  record: FertilizerSpec;
  onClose: () => void;
}

const getTimingBadgeConfig = (timing: string) => {
  const found = TIMING_BADGE_OPTIONS.find(t => t.value === timing);
  return found || { bg: 'bg-gray-100', text: 'text-gray-700', label: timing };
};

// 施肥时期 Badge 渲染（支持逗号分隔多选）
const renderApplicationTiming = (timing?: string) => {
  if (!timing) return <span className="text-gray-400">-</span>;
  const timings = timing.split(',').map(t => t.trim()).filter(Boolean);
  if (timings.length === 0) return <span className="text-gray-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {timings.map((t, idx) => {
        const cfg = getTimingBadgeConfig(t);
        return (
          <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
};

// 肥料类型中文标签
const getFertilizerTypeLabel = (type?: string) => {
  if (!type) return '-';
  return getDictItemName('fertilizer_type', type) || type;
};

// 库存颜色
const getStockColor = (stock: number) => {
  if (stock === 0) return 'text-red-600 font-semibold';
  if (stock < 50) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
};

// 2026-08-15：时间显示格式化 — 存量数据是 ISO UTC 字符串（如 2026-07-12T07:58:37.762Z），
// 新数据是本地时间戳（如 2026-08-15 21:30:00），统一转为本地时间显示
function formatTimeDisplay(t?: string): string {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleString();
}

// 统一字段配置（不再区分 fullWidth/highlight）
interface DetailField {
  label: string;
  value: React.ReactNode;
}

export function FertilizerDetailModal({ isOpen, record, onClose }: FertilizerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'usage' | 'stockIn'>('basic');
  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  // 2026-07-27：入库记录 Tab 数据
  const [stockInRecords, setStockInRecords] = useState<any[]>([]);
  const [stockInLoading, setStockInLoading] = useState(false);
  const [stockInFormat, setStockInFormat] = useState<'xlsx' | 'csv'>('xlsx'); // 用户最新选择：默认 Excel
  const [stockInExportOpen, setStockInExportOpen] = useState(false); // 控制格式选择弹窗
  // 2026-08-15 审核修复：改用 selector 取 store 字段/actions（整 store 订阅是页面 H22 已修复的反模式）
  const fetchUsageRecords = useFertilizerLibraryStore((s) => s.fetchUsageRecords);
  const fetchStockInRecords = useFertilizerLibraryStore((s) => s.fetchStockInRecords);
  const deleteUsageRecord = useFertilizerLibraryStore((s) => s.deleteUsageRecord);
  const fetchLibItems = useFertilizerLibraryStore((s) => s.fetchItems);
  // 2026-07-22：把 toast 上移到 useEffect 之前（C9 修复后 useEffect 内要调 toast?.error）
  const toast = useToastStore((s: any) => s.toast);
  // 翻页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // 导出模式（简化流程：点击"导出" → 勾选 → 点击"确认导出" → 直接下载 Excel，不再弹格式选择）
  const [exportMode, setExportMode] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // 切到「使用记录」tab 时拉数据
  // C9 修复：走 store.fetchUsageRecords，不再绕过 store 直接 fetch
  // 2026-08-15 审核修复：store 已 rethrow（原吞错返回 [] 导致此处 catch 永不触发，失败被显示成「暂无使用记录」）
  useEffect(() => {
    if (!isOpen || !record || activeTab !== 'usage') return;
    setUsageLoading(true);
    setCurrentPage(1);  // 每次拉数据重置翻页
    setExportMode(false);  // 切 tab 时退出导出模式
    setSelectedRecordIds([]);
    fetchUsageRecords(record.id)
      .then((arr) => {
        setUsageRecords(arr);
      })
      .catch(() => {
        // H30 修复：失败要给用户可见提示，不再静默 console.error
        toast?.error?.('加载使用记录失败，请稍后重试');
      })
      .finally(() => setUsageLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, record?.id, activeTab, fetchUsageRecords]);

  // 2026-07-27：切到「入库记录」tab 时拉数据
  useEffect(() => {
    if (!isOpen || !record || activeTab !== 'stockIn') return;
    setStockInLoading(true);
    setStockInExportOpen(false); // 切 tab 时关闭导出选择弹窗
    fetchStockInRecords(record.id)
      .then((arr) => {
        setStockInRecords(arr);
      })
      .catch(() => {
        toast?.error?.('加载入库记录失败，请稍后重试');
      })
      .finally(() => setStockInLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, record?.id, activeTab, fetchStockInRecords]);

  // 2026-07-27：入库记录统计聚合（顶部 stat 卡用）
  const stockInStats = useMemo(() => {
    const totalQty = stockInRecords.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const totalAmount = stockInRecords.reduce(
      (acc, r) => acc + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
      0,
    );
    const lastTime = stockInRecords[0]?.create_time || stockInRecords[0]?.createTime || '-';
    return { totalQty, totalAmount, count: stockInRecords.length, lastTime };
  }, [stockInRecords]);

  // 2026-07-27：入库记录导出（用户最新选择：默认 Excel 格式，提供 Excel/CSV 选项）
  const handleExportStockIn = async () => {
    if (stockInRecords.length === 0) return;
    const headers = ['入库时间', '数量', '单位', '单价 (元)', '小计 (元)', '操作人', '数据来源', '备注'];
    const rows = stockInRecords.map((r: any) => {
      const qty = Number(r.quantity || 0);
      const price = Number(r.unit_price ?? r.unitPrice ?? 0);
      const subtotal = qty * price;
      const sourceLabel = r.source === 'manual' ? '手动入库' : r.source === 'auto_iot' ? 'IoT 同步' : (r.source || '-');
      return {
        '入库时间': r.create_time || r.createTime || '-',
        '数量': qty.toFixed(2),
        '单位': record?.stockUnit || 'kg',
        '单价 (元)': price > 0 ? price.toFixed(2) : '-',
        '小计 (元)': subtotal > 0 ? subtotal.toFixed(2) : '-',
        '操作人': r.operator_name || r.operatorName || '-',
        '数据来源': sourceLabel,
        '备注': r.remark || '-',
      };
    });
    const filename = `肥料入库记录_${record?.fertilizerName || ''}_${todayLocal()}`;
    try {
      if (stockInFormat === 'xlsx') {
        await exportXlsx({ filename, headers, rows, sheetName: '入库记录' });
      } else {
        await exportCsv({ filename, headers, rows });
      }
      toast?.success?.(`已导出 ${rows.length} 条入库记录`);
    } catch (err) {
      toast?.error?.('导出失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setStockInExportOpen(false);
    }
  };

  // 顶部 stat 卡聚合
  const usageStats = useMemo(() => {
    return usageRecords.reduce(
      (acc, r) => {
        acc.totalDosage += Number(r.totalDosage) || 0;
        acc.totalCost += Number(r.totalCost) || 0;
        return acc;
      },
      { totalDosage: 0, totalCost: 0 },
    );
  }, [usageRecords]);

  // 翻页派生：每页显示 pageSize 条
  const totalPages = Math.ceil(usageRecords.length / pageSize) || 1;
  const pagedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return usageRecords.slice(startIdx, startIdx + pageSize);
  }, [usageRecords, currentPage, pageSize]);

  // 当前页超出范围时回退到第 1 页
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [usageRecords.length, totalPages, currentPage]);

  // 导出模式切换（点击"导出"进入选择模式 → 表格显示复选框）
  const handleEnterExportMode = () => {
    setExportMode(true);
    setSelectedRecordIds([]);  // 默认不勾选，让用户主动选
  };

  // 退出导出模式
  const handleExitExportMode = () => {
    setExportMode(false);
    setSelectedRecordIds([]);
  };

  // 单行复选框 toggle
  const toggleRowSelection = (recordId: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  // 全选/全不选（当前页）
  const toggleSelectAll = () => {
    const pageIds = pagedRecords.map((r) => r.recordId);
    const allSelected = pageIds.every((id) => selectedRecordIds.includes(id));
    if (allSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // 确认导出（直接下载 Excel，不再弹格式选择）
  const handleConfirmExport = async () => {
    const selectedRows = usageRecords.filter((r) => selectedRecordIds.includes(r.recordId));
    if (selectedRows.length === 0) return;
    const headers = ['来源', '记录编号', '作物', '防治区域', '操作员', '防治时间', '用量', '单位', '费用'];
    const sourceLabel = (s: string) => s === 'pest_control' ? '防治记录' : s === 'fertilization' ? '施肥记录' : s;
    const rows = selectedRows.map((r: any) => ({
      '来源': sourceLabel(r.source),
      '记录编号': r.recordCode || '',
      '作物': r.cropName || '',
      '防治区域': r.greenhouseName || '',
      '操作员': r.operatorName || '',
      '防治时间': r.sprayTime || '',
      '用量': Number(r.totalDosage || 0).toFixed(2),
      '单位': record?.stockUnit || 'kg',
      '费用': Number(r.totalCost || 0).toFixed(2),
    }));
    // H18 修复：用 todayLocal() 取本地日期，避免 UTC 跨天导致中国早晨 8 点前显示昨天
    const filename = `肥料使用记录_${record?.fertilizerName || ''}_${todayLocal()}`;
    try {
      // 默认导出 Excel 格式（直接下载，不再弹窗）
      await exportXlsx({ filename, headers, rows, sheetName: '使用记录' });
    } catch (err) {
      console.error('[FertilizerDetailModal] 导出失败:', err);
    }
    // 退出选择模式
    setExportMode(false);
    setSelectedRecordIds([]);
  };

  // 2026-07-17：删除单条使用记录（按 source 调对应表的 DELETE 端点）
  // - source=pest_control → DELETE /api/pest-records/:id（删除整条防治记录 + 回补库存）
  // - source=fertilization → DELETE /api/fertilizer/:id（删除整条施肥记录 + 回补库存）
  // 2026-08-15 审核修复：改走 store.deleteUsageRecord + store.fetchUsageRecords
  // （原代码绕过 store 直调 enhancedApiClient，违反 V2.1 架构铁律）
  const handleDeleteRecord = async (r: any) => {
    const isFert = r.source === 'fertilization';
    const sourceLabel = isFert ? '施肥记录' : '防治记录';
    const confirmMsg = `确定要删除${sourceLabel}「${r.recordCode}」吗？\n\n这将从「${r.cropName} - ${r.greenhouseName || '-'}」移除 ${Number(r.totalDosage).toFixed(2)} ${record?.stockUnit || 'kg'} 肥料用量，并自动恢复库存。`;
    const ok = await showConfirm(confirmMsg, { title: '确认删除', confirmText: '删除', cancelText: '取消' });
    if (!ok) return;
    try {
      await deleteUsageRecord(r.recordId, r.source);
      toast?.success?.(`已删除${sourceLabel}，库存已恢复`);
      // 刷新肥料库列表（让库存数字实时更新）
      fetchLibItems();
      // 重新拉取使用记录
      setUsageLoading(true);
      const arr = await fetchUsageRecords(record.id);
      setUsageRecords(arr);
      setCurrentPage(1);
    } catch (err) {
      toast?.error?.('删除失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUsageLoading(false);
    }
  };

  if (!record) return null;

  const fields: DetailField[] = [
    { label: '肥料编码', value: <span className="font-mono">{record.fertilizerCode || '-'}</span> },
    { label: '肥料名称', value: <span className="font-bold">{record.fertilizerName || '-'}</span> },
    { label: '肥料类型', value: getFertilizerTypeLabel(record.fertilizerType) },
    { label: '施肥时期', value: renderApplicationTiming(record.applicationTiming) },
    { label: '状态', value: record.status === 'active' ? <span className="text-green-600 font-medium">启用</span> : <span className="text-gray-400">停用</span> },
    { label: '品牌名称', value: record.brandName || '主品牌' },
    { label: '成份与含量', value: record.specContent || '-' },
    { label: '生产厂家', value: record.manufacturer || '-' },
    { label: '包装规格', value: record.packageSpec || '-' },
    { label: '建议用量', value: <span className="font-mono">{record.suggestedDosage || '-'}</span> },
    { label: '单位', value: getDictItemName('dosage_unit', record.dosageUnit || '') || record.dosageUnit || '-' },
    { label: '稀释比例', value: <span className="font-mono">{record.suggestedRatio || '-'}</span> },
    { label: '单价 (元/单位)', value: record.unitPrice != null && record.unitPrice > 0 ? <span className="font-mono">{Number(record.unitPrice).toFixed(2)}</span> : '-' },
    { label: '库存量', value: <span className={`font-mono ${getStockColor(record.stockQuantity ?? 0)}`}>{(record.stockQuantity ?? 0).toFixed(2)}</span> },
    { label: '库存单位', value: record.stockUnit || 'kg' },
    { label: '产品批次', value: <span className="font-mono">{record.batchNumber || '-'}</span> },
    { label: '生产日期', value: record.productionDate || '-' },
    { label: '过期日期', value: record.expirationDate || '-' },
    { label: '保质期', value: record.shelfLife || '-' },
    { label: '存储条件', value: record.storageCondition || '-' },
    { label: '功能说明', value: record.functionDesc || '-' },
    { label: '使用禁忌', value: record.tabooDesc || '-' },
    { label: '供应商信息', value: record.supplierInfo || '-' },
    { label: '备注', value: record.remark || '-' },
    { label: '创建时间', value: formatTimeDisplay(record.createTime) },
    { label: '更新时间', value: formatTimeDisplay(record.updateTime) },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="肥料详情"
      size="xxxl"
      showFooter={false}
    >
      {/* 2026-08-15：删除头部标题卡片（编码/名称/类型）— 与下方"基础信息"字段内容重复（对齐药剂详情弹窗） */}

      {/* Tab 切换栏 */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'basic'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" /> 基础信息
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'usage'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" /> 使用记录
          {usageRecords.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              {usageRecords.length}
            </span>
          )}
        </button>
        {/* 2026-07-27：入库记录 Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('stockIn')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'stockIn'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" /> 入库记录
          {stockInRecords.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              {stockInRecords.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'basic' && (
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-4 gap-3">
            {fields.map((f, i) => (
              <FieldCell key={i} field={f} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {/* 顶部统计条（紧凑型：单行 flex 横排，浅色实色背景） */}
          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-md text-xs">
            <span className="text-gray-500">累计用量</span>
            <span className="font-bold text-amber-700 text-sm">
              {usageStats.totalDosage.toFixed(2)}<span className="text-xs font-normal text-gray-400 ml-0.5">{record.stockUnit || 'kg'}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">累计费用</span>
            <span className="font-bold text-emerald-700 text-sm">
              ¥<span>{usageStats.totalCost.toFixed(2)}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">使用次数</span>
            <span className="font-bold text-blue-700 text-sm">
              {usageRecords.length}<span className="text-xs font-normal text-gray-400 ml-0.5">条</span>
            </span>
          </div>

          {/* 使用记录表（样式与肥料库表头一致：蓝色渐变 + divide-gray-300） */}
          {usageLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 加载中…
            </div>
          ) : usageRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg">
              暂无使用记录（未在任何防治/施肥记录中用过此肥料）
            </div>
          ) : (
            <>
              {/* 工具栏：导出模式切换（绿色导出按钮 + 选中数提示 + 确认/取消） */}
              <div className="flex items-center justify-between mb-2">
                {exportMode && (
                  <span className="text-xs text-emerald-700 font-medium">
                    已选择 <span className="font-bold">{selectedRecordIds.length}</span> 条
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  {exportMode ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={handleExitExportMode} className="h-8 text-xs">
                        <XIcon className="w-3.5 h-3.5 mr-1" />取消导出
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleConfirmExport}
                        disabled={selectedRecordIds.length === 0}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />确认导出 ({selectedRecordIds.length})
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleEnterExportMode}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />导出
                    </Button>
                  )}
                </div>
              </div>

              {/* 表格 */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <tr className="hover:bg-transparent">
                      {exportMode && (
                        <th className="px-3 py-3 text-center text-xs font-semibold text-white whitespace-nowrap w-10">
                          <input
                            type="checkbox"
                            checked={pagedRecords.length > 0 && pagedRecords.every((r) => selectedRecordIds.includes(r.recordId))}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-white cursor-pointer"
                            title="全选当前页"
                          />
                        </th>
                      )}
                      <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">来源</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">记录编号</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">作物</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">防治区域</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">操作员</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">防治时间</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">用量</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">费用</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-white whitespace-nowrap w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 bg-white">
                    {pagedRecords.map((r: any) => {
                      const isFert = r.source === 'fertilization';
                      const checked = selectedRecordIds.includes(r.recordId);
                      return (
                        <tr
                          key={r.recordId}
                          className={`hover:bg-amber-50/50 ${checked ? 'bg-emerald-50/30' : ''}`}
                        >
                          {exportMode && (
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleRowSelection(r.recordId)}
                                className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              isFert
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {isFert ? '施肥' : '防治'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-blue-600 whitespace-nowrap">{r.recordCode || '-'}</td>
                          <td className="px-3 py-2 text-gray-800">{r.cropName || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.greenhouseName || '-'}</td>
                          <td className="px-3 py-2 text-gray-600">{r.operatorName || '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{r.sprayTime?.slice(0, 16) || '-'}</td>
                          <td className="px-3 py-2 text-right font-mono text-amber-700 whitespace-nowrap">
                            {Number(r.totalDosage || 0).toFixed(2)} <span className="text-xs text-gray-400">{record.stockUnit || 'kg'}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                            ¥{Number(r.totalCost || 0).toFixed(2)}
                          </td>
                          {/* 2026-07-17：每行删除按钮（按 source 调对应表 DELETE） */}
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(r)}
                              disabled={exportMode}
                              className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1"
                              title="删除该使用记录"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页 + 页码显示（与肥料库一致） */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 mt-3">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                  pageSizeOptions={[10, 20, 50]}
                  showPageSize
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* 2026-07-27：入库记录 Tab 内容 */}
      {activeTab === 'stockIn' && (
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {/* 顶部统计条 */}
          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-md text-xs flex-wrap">
            <span className="text-gray-500">累计入库</span>
            <span className="font-bold text-amber-700 text-sm">
              {stockInStats.totalQty.toFixed(2)}<span className="text-xs font-normal text-gray-400 ml-0.5">{record.stockUnit || 'kg'}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">累计金额</span>
            <span className="font-bold text-emerald-700 text-sm">
              ¥<span>{stockInStats.totalAmount.toFixed(2)}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">入库次数</span>
            <span className="font-bold text-blue-700 text-sm">
              {stockInStats.count}<span className="text-xs font-normal text-gray-400 ml-0.5">次</span>
            </span>
            {stockInStats.lastTime !== '-' && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500">最近入库</span>
                <span className="font-mono text-gray-700 text-xs">
                  {String(stockInStats.lastTime).slice(0, 16)}
                </span>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              {stockInExportOpen ? (
                <>
                  <select
                    value={stockInFormat}
                    onChange={(e) => setStockInFormat(e.target.value as 'xlsx' | 'csv')}
                    className="h-8 text-xs px-2 border border-gray-300 rounded bg-white"
                  >
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </select>
                  <Button variant="default" size="sm" onClick={handleExportStockIn} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                    <Download className="w-3.5 h-3.5 mr-1" />确认导出
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setStockInExportOpen(false)} className="h-8 text-xs">
                    <XIcon className="w-3.5 h-3.5 mr-1" />取消
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setStockInExportOpen(true)}
                  disabled={stockInRecords.length === 0}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />导出 ({stockInRecords.length})
                </Button>
              )}
            </div>
          </div>

          {stockInLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 加载中…
            </div>
          ) : stockInRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg">
              暂无入库记录
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <tr className="hover:bg-transparent">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">入库时间</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">数量</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">单价 (元)</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-white whitespace-nowrap">小计 (元)</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">操作人</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">数据来源</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 bg-white">
                  {stockInRecords.map((r: any) => {
                    const qty = Number(r.quantity || 0);
                    const price = Number(r.unit_price ?? r.unitPrice ?? 0);
                    const subtotal = qty * price;
                    const sourceLabel = r.source === 'manual' ? '手动入库' : r.source === 'auto_iot' ? 'IoT 同步' : (r.source || '-');
                    return (
                      <tr key={r.id} className="hover:bg-amber-50/50">
                        <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap font-mono">
                          {String(r.create_time || r.createTime || '-').slice(0, 16)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-amber-700 whitespace-nowrap">
                          {qty.toFixed(2)} <span className="text-xs text-gray-400">{record.stockUnit || 'kg'}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700 whitespace-nowrap">
                          {price > 0 ? price.toFixed(2) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {subtotal > 0 ? subtotal.toFixed(2) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {r.operator_name || r.operatorName || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            r.source === 'auto_iot'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {sourceLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {r.remark || <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 导出已简化为直接下载，不再需要 ExportFormatModal */}

      {/* 关闭按钮已由 UnifiedModal 右上角 X 提供 */}
    </UnifiedModal>
  );
}

/** 单个字段展示行 — 2026-08-15：标签与值同一行（"编码：xxx"）、无背景色无底框（对齐药剂详情弹窗） */
function FieldCell({ field }: { field: DetailField }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-xs text-gray-500 shrink-0">{field.label}：</span>
      <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{field.value}</span>
    </div>
  );
}
