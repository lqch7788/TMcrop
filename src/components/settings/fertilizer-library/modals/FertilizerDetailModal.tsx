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
import { History, Package, Loader2, Download, X as XIcon, Trash2 } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { FertilizerSpec, useToastStore } from '@/stores';
import { getDictItemName } from '@/stores';
import { enhancedApiClient } from '@/lib/apiClient';
import { exportXlsx } from '@/services/exporters';
import { showAlert, showConfirm } from '@/lib/dialogService';

interface FertilizerDetailModalProps {
  isOpen: boolean;
  record: FertilizerSpec;
  onClose: () => void;
}

// 施肥时期 Badge 配置
const TIMING_OPTIONS = [
  { value: 'base', label: '底肥', bg: 'bg-amber-100', text: 'text-amber-700' },
  { value: 'dressing', label: '追肥', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'foliar', label: '叶面肥', bg: 'bg-blue-100', text: 'text-blue-700' },
];

const getTimingBadgeConfig = (timing: string) => {
  const found = TIMING_OPTIONS.find(t => t.value === timing);
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

// 统一字段配置（不再区分 fullWidth/highlight）
interface DetailField {
  label: string;
  value: React.ReactNode;
}

export function FertilizerDetailModal({ isOpen, record, onClose }: FertilizerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'usage'>('basic');
  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  // 翻页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // 导出模式（简化流程：点击"导出" → 勾选 → 点击"确认导出" → 直接下载 Excel，不再弹格式选择）
  const [exportMode, setExportMode] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // 切到「使用记录」tab 时拉数据
  useEffect(() => {
    if (!isOpen || !record || activeTab !== 'usage') return;
    setUsageLoading(true);
    setCurrentPage(1);  // 每次拉数据重置翻页
    setExportMode(false);  // 切 tab 时退出导出模式
    setSelectedRecordIds([]);
    enhancedApiClient
      .get<any[]>(`/pest-records/by-spec/${record.id}`)
      .then((resp: any) => {
        const arr = Array.isArray(resp) ? resp : (resp?.data ?? []);
        setUsageRecords(arr);
      })
      .catch((err) => console.error('[FertilizerDetailModal] 加载使用记录失败:', err))
      .finally(() => setUsageLoading(false));
  }, [isOpen, record?.id, activeTab]);

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
    const filename = `肥料使用记录_${record?.fertilizerName || ''}_${new Date().toISOString().slice(0, 10)}`;
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
  const toast = useToastStore((s: any) => s.toast);
  const handleDeleteRecord = async (r: any) => {
    const isFert = r.source === 'fertilization';
    const sourceLabel = isFert ? '施肥记录' : '防治记录';
    const confirmMsg = `确定要删除${sourceLabel}「${r.recordCode}」吗？\n\n这将从「${r.cropName} - ${r.greenhouseName || '-'}」移除 ${Number(r.totalDosage).toFixed(2)} ${record?.stockUnit || 'kg'} 肥料用量，并自动恢复库存。`;
    const ok = await showConfirm(confirmMsg, { title: '确认删除', confirmText: '删除', cancelText: '取消' });
    if (!ok) return;
    try {
      const url = isFert
        ? `/api/fertilizer/${r.recordId}`
        : `/api/pest-records/${r.recordId}`;
      await enhancedApiClient.delete(url);
      toast?.success?.(`已删除${sourceLabel}，库存已恢复`);
      // 重新拉取使用记录
      setUsageLoading(true);
      const resp: any = await enhancedApiClient.get(`/pest-records/by-spec/${record.id}`);
      const arr = Array.isArray(resp) ? resp : (resp?.data ?? []);
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
    { label: '创建时间', value: record.createTime || '-' },
    { label: '更新时间', value: record.updateTime || '-' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="肥料详情"
      size="xxxl"
      showFooter={false}
    >
      {/* 编号头部 — 单行展示：编码 + 名称 + 类型 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-5 mb-4 border border-amber-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">编码</span>
            <span className="text-xl font-mono font-bold text-amber-700">{record.fertilizerCode || '-'}</span>
          </div>
          <span className="text-gray-300 text-lg">|</span>
          <span className="text-base font-bold text-gray-800">{record.fertilizerName || '-'}</span>
          {record.fertilizerType && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded text-sm font-medium">
              {getFertilizerTypeLabel(record.fertilizerType)}
            </span>
          )}
        </div>
      </div>

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

      {/* 导出已简化为直接下载，不再需要 ExportFormatModal */}

      {/* 关闭按钮已由 UnifiedModal 右上角 X 提供 */}
    </UnifiedModal>
  );
}

/** 单个字段展示格子 — 统一浅灰色线框 */
function FieldCell({ field }: { field: DetailField }) {
  return (
    <div>
      <Label className="text-sm text-gray-500 mb-0.5">{field.label}</Label>
      <div className="text-base rounded-lg p-3 min-h-[44px] border border-gray-300 text-gray-800">
        {field.value}
      </div>
    </div>
  );
}
