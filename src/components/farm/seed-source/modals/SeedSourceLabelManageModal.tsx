/**
 * 种源标签管理弹窗 — 编排层
 * 2026-07-01: 从育苗标签管理弹窗适配，支持种源标签全生命周期管理
 * 功能：标签列表/搜索/分页、履历（时间线+表格）、新增履历（移入/移出/打标记/作废）、
 *        补充生成、批量作废、导出（可选字段+可选范围）
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Download, Plus, Trash2 } from 'lucide-react';
import { Button, UnifiedModal } from '@/components/ui';
import { Input } from '@/components/ui';
import { usePlantLabelStore } from '@/stores/usePlantLabelStore';
import type { PlantLabel, PlantLabelResume } from '@/stores/usePlantLabelStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { enhancedApiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { LabelTable } from '@/components/farm/seedling/modals/LabelTable';
import { LabelResumePanel } from '@/components/farm/seedling/modals/LabelResumePanel';
import { AddResumeForm } from '@/components/farm/seedling/modals/AddResumeForm';

const PAGE_SIZE = 20;

// 导出可选字段
const EXPORT_FIELDS = [
  { key: 'labelNumber', label: '标签编号', defaultChecked: true },
  { key: 'moveInAreaName', label: '移入位置', defaultChecked: true },
  { key: 'moveInDate', label: '移入日期', defaultChecked: true },
  { key: 'moveOutAreaName', label: '移出位置', defaultChecked: true },
  { key: 'moveOutDate', label: '移出日期', defaultChecked: true },
  { key: 'quantity', label: '数量', defaultChecked: true },
  { key: 'status', label: '状态', defaultChecked: false },
  { key: 'createTime', label: '创建时间', defaultChecked: true },
  { key: 'resumes', label: '履历记录（移入/移出/标记）', defaultChecked: false },
] as const;

// 枚举值中文映射
const STATUS_LABEL_MAP: Record<string, string> = {
  active: '在用',
  void: '已作废',
  voided: '已作废',
  printed: '已打印',
  archived: '已归档',
  disabled: '已停用',
};
const OPERATION_TYPE_MAP: Record<string, string> = {
  move_in: '移入',
  move_out: '移出',
  mark: '标记',
  void: '作废',
};

interface SeedSourceLabelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedSourceId: string;
  seedSourceCode: string;
  /** 标签单位（默认"株"，种源可能为"粒/颗/kg"等） */
  unit?: string;
  /** 扫码跳转时自动选中指定编号的标签 */
  autoSelectLabelNumber?: string;
}

export default function SeedSourceLabelManageModal({
  isOpen,
  onClose,
  seedSourceId,
  seedSourceCode,
  unit = '粒',
  autoSelectLabelNumber,
}: SeedSourceLabelManageModalProps) {
  const { labels, labelsLoading, resumeMap, resumeLoading, loadLabels, loadResumesForLabels } =
    usePlantLabelStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  // ---------- 标签列表状态 ----------
  const [searchText, setSearchText] = useState('');
  const [labelPage, setLabelPage] = useState(1);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showAddResume, setShowAddResume] = useState(false);
  const [showBatchVoid, setShowBatchVoid] = useState(false);
  const [batchVoidReason, setBatchVoidReason] = useState('');
  const [batchVoiding, setBatchVoiding] = useState(false);

  // ---------- 补充生成状态 ----------
  const [showBatchGenerate, setShowBatchGenerate] = useState(false);
  const [batchCount, setBatchCount] = useState('10');
  const [batchAreaName, setBatchAreaName] = useState('');
  const [batchGenerating, setBatchGenerating] = useState(false);

  // ---------- 导出弹窗状态 ----------
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.filter((f) => f.defaultChecked).map((f) => f.key))
  );
  const [exportScope, setExportScope] = useState<'selected' | 'filtered' | 'currentPage'>('filtered');

  // ---------- 自动选中（扫码跳转，仅执行一次） ----------
  const hasAutoSelected = useRef(false);

  // 打开弹窗时加载标签
  useEffect(() => {
    if (isOpen && seedSourceId) {
      loadLabels({ seedSourceId });
      hasAutoSelected.current = false;
    }
  }, [isOpen, seedSourceId, loadLabels]);

  // 自动选中指定编号标签
  useEffect(() => {
    if (isOpen && autoSelectLabelNumber && labels.length > 0 && !hasAutoSelected.current) {
      const idx = labels.findIndex(
        (l: any) => l.labelNumber === autoSelectLabelNumber
      );
      if (idx !== -1) {
        hasAutoSelected.current = true;
        const label = labels[idx] as any;
        setSelectedLabelId(label.id);
        setLabelPage(Math.floor(idx / PAGE_SIZE) + 1);
        loadResumesForLabels([label.id]);
      }
    }
  }, [isOpen, autoSelectLabelNumber, labels, loadResumesForLabels]);

  // ---------- 派生数据 ----------
  const seedSourceLabels = labels;

  const filteredLabels = useMemo(() => {
    if (!searchText) return seedSourceLabels;
    return seedSourceLabels.filter((l: any) =>
      l.labelNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [seedSourceLabels, searchText]);

  const paginatedLabels = useMemo(() => {
    const start = (labelPage - 1) * PAGE_SIZE;
    return filteredLabels.slice(start, start + PAGE_SIZE) as PlantLabel[];
  }, [filteredLabels, labelPage]);

  const labelTotalPages = Math.max(1, Math.ceil(filteredLabels.length / PAGE_SIZE));

  const selectedLabel = seedSourceLabels.find(
    (l: any) => l.id === selectedLabelId
  ) as PlantLabel | undefined;

  const selectedResumes: PlantLabelResume[] = useMemo(() => {
    if (selectedLabelId === null) return [];
    return resumeMap[selectedLabelId] || [];
  }, [selectedLabelId, resumeMap]);

  // ---------- 事件处理 ----------
  const handleSelectLabel = useCallback(
    async (labelId: number) => {
      setSelectedLabelId(labelId);
      await loadResumesForLabels([labelId]);
    },
    [loadResumesForLabels]
  );

  const toggleSelectLabel = useCallback((labelId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelectAll = useCallback(() => {
    const pageIds = new Set(paginatedLabels.map((l: any) => l.id));
    const allSelected = paginatedLabels.every((l: any) => selectedIds.has(l.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...pageIds]));
    }
  }, [paginatedLabels, selectedIds]);

  // 批量作废
  const handleBatchVoid = async () => {
    if (selectedIds.size === 0) { showAlert('请先勾选要作废的标签'); return; }
    if (!batchVoidReason.trim()) { showAlert('请填写作废原因'); return; }
    setBatchVoiding(true);
    let success = 0;
    let fail = 0;
    try {
      for (const labelId of selectedIds) {
        try {
          await enhancedApiClient.post(`/plant-labels/${labelId}/resumes`, {
            operation_type: 'void',
            operation_date: todayLocal(),
            operator_name: currentUser?.realName || 'system',
            reason: batchVoidReason.trim(),
            quantity_change: 0,
          });
          success++;
        } catch { fail++; }
      }
      showAlert(`批量作废完成：成功 ${success} 个${fail > 0 ? `，失败 ${fail} 个` : ''}`);
      setShowBatchVoid(false);
      setBatchVoidReason('');
      setSelectedIds(new Set());
      await loadLabels({ seedSourceId });
      if (selectedLabelId && selectedIds.has(selectedLabelId)) {
        setSelectedLabelId(null);
      }
    } catch (e) {
      console.error('[SeedSourceLabelManageModal] 批量作废失败:', e);
      const msg = e instanceof Error ? e.message : String(e);
      showAlert('网络错误：' + msg);
    } finally {
      setBatchVoiding(false);
    }
  };

  const handleSearchChange = useCallback((v: string) => {
    setSearchText(v);
    setLabelPage(1);
  }, []);

  // 切换标签时收起表单
  useEffect(() => {
    setShowAddResume(false);
    setShowBatchGenerate(false);
  }, [selectedLabelId]);

  // 履历提交成功回调
  const handleResumeSubmitted = useCallback(async () => {
    if (selectedLabelId !== null) {
      await loadResumesForLabels([selectedLabelId]);
    }
    setShowAddResume(false);
  }, [selectedLabelId, loadResumesForLabels]);

  // ---------- 导出 ----------
  const handleOpenExport = () => setExportModalOpen(true);

  const toggleExportField = (key: string) => {
    setSelectedExportFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllExportFields = () => {
    setSelectedExportFields(new Set(EXPORT_FIELDS.map((f) => f.key)));
  };

  const deselectAllExportFields = () => {
    setSelectedExportFields(new Set());
  };

  const handleConfirmExport = useCallback(async () => {
    if (selectedExportFields.size === 0) {
      showAlert('请至少选择一个导出字段');
      return;
    }

    let dataSource: any[];
    if (exportScope === 'selected') {
      dataSource = filteredLabels.filter((l: any) => selectedIds.has(l.id));
    } else if (exportScope === 'currentPage') {
      dataSource = paginatedLabels;
    } else {
      dataSource = filteredLabels;
    }
    if (dataSource.length === 0) {
      showAlert('无数据可导出');
      return;
    }

    const selectedFields = EXPORT_FIELDS.filter((f) => selectedExportFields.has(f.key));
    const headers = selectedFields.map((f) => f.label);

    const needResumes = selectedExportFields.has('resumes');
    let resumeMapForExport = resumeMap;
    if (needResumes && dataSource.length > 0) {
      const labelIds = dataSource.map((l: any) => l.id);
      await loadResumesForLabels(labelIds);
      resumeMapForExport = usePlantLabelStore.getState().resumeMap;
    }

    const rows = dataSource.map((l: any) => {
      const resumeText = needResumes
        ? (resumeMapForExport[l.id] || [])
            .map((r: any) => {
              const opTypeCn = OPERATION_TYPE_MAP[r.operationType] || r.operationType || '-';
              const fromArea = r.fromAreaName || '-';
              const toArea = r.toAreaName || '-';
              const date = r.operationDate || '';
              const markName = r.markName || '';
              const qtyChange = r.quantityChange != null
                ? `(数量${r.quantityChange > 0 ? '+' : ''}${r.quantityChange}${r.quantityAfter != null ? `→剩${r.quantityAfter}` : ''})`
                : '';
              const reason = r.reason ? ` 备注:${r.reason}` : '';
              const operator = r.operatorName ? ` 操作人:${r.operatorName}` : '';
              if (r.operationType === 'mark') {
                return `${opTypeCn} ${markName || '-'}${qtyChange}${operator}${reason}`;
              }
              return `${opTypeCn} ${fromArea}→${toArea} ${date}${qtyChange}${operator}${reason}`;
            })
            .join('; ')
        : '';

      return selectedFields.map((f) => {
        switch (f.key) {
          case 'labelNumber': return l.labelNumber || '';
          case 'moveInAreaName': return l.moveInAreaName || '';
          case 'moveInDate': return l.moveInDate || '';
          case 'moveOutAreaName': return l.moveOutAreaName || '';
          case 'moveOutDate': return l.moveOutDate || '';
          case 'quantity': return l.quantity ?? '';
          case 'status': return STATUS_LABEL_MAP[l.status] || l.status || '';
          case 'createTime': return l.createTime || '';
          case 'resumes': return resumeText;
          default: return '';
        }
      });
    });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>种源标签数据</title>
<style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px}th{background:#059669;color:#fff}</style>
</head><body><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;

    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `种源标签_${seedSourceCode}_${todayLocal()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  }, [selectedExportFields, exportScope, paginatedLabels, filteredLabels, selectedIds, resumeMap, loadResumesForLabels, seedSourceCode]);

  // ---------- 补充生成 ----------
  const handleBatchGenerate = async () => {
    const count = parseInt(batchCount, 10);
    if (!count || count < 1) { showAlert('请输入有效的生成数量'); return; }
    setBatchGenerating(true);
    try {
      const store = usePlantLabelStore.getState();
      const result = await store.generateBatchLabels({
        seed_source_id: seedSourceId,
        count,
        area_name: batchAreaName.trim() || undefined,
        start_date: todayLocal(),
      });
      if (result) {
        showAlert(`成功生成 ${result.totalPrinted} 个标签`);
        await loadLabels({ seedSourceId });
        setShowBatchGenerate(false);
        setBatchAreaName('');
      } else {
        showAlert('生成失败，请重试');
      }
    } catch (e) {
      console.error('[SeedSourceLabelManageModal] 补充生成失败:', e);
      const msg = e instanceof Error ? e.message : String(e);
      showAlert('网络错误：' + msg);
    } finally {
      setBatchGenerating(false);
    }
  };

  // ---------- 渲染 ----------
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`种源标签管理 - ${seedSourceCode}`}
      size="xxxl"
      showFooter={false}
      enableDrag={true}
      enableResize={true}
      showMaximize={true}
    >
      {/* 主体：左侧标签列表 + 右侧履历 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 左侧：标签列表 */}
        <div className="w-1/2 border-r border-gray-200">
          <LabelTable
            labels={paginatedLabels as any}
            selectedLabelId={selectedLabelId}
            searchText={searchText}
            onSearchChange={handleSearchChange}
            page={labelPage}
            totalPages={labelTotalPages}
            onPageChange={setLabelPage}
            onSelectLabel={handleSelectLabel}
            loading={labelsLoading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectLabel}
            onToggleSelectAll={toggleSelectAll}
            onClearSelection={clearSelection}
            unit={unit}
          />
        </div>

        {/* 右侧：标签履历 */}
        <div className="w-1/2 overflow-y-auto p-4">
          <LabelResumePanel
            selectedLabel={selectedLabel}
            resumes={selectedResumes}
            loading={resumeLoading}
          />
        </div>
      </div>

      {/* 新增履历表单 */}
      {showAddResume && (
        <AddResumeForm
          selectedLabel={selectedLabel as any}
          onSubmitted={handleResumeSubmitted}
          onCancel={() => setShowAddResume(false)}
        />
      )}

      {/* 补充生成表单 */}
      {showBatchGenerate && (
        <div className="px-4 py-3 border-t border-blue-200 bg-blue-50 flex-shrink-0">
          <div className="text-xs font-semibold text-blue-900 mb-2">补充生成标签</div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              value={batchCount}
              onChange={(e) => setBatchCount(e.target.value)}
              placeholder="生成数量"
              className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-24"
            />
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={batchAreaName}
                onChange={(e) => setBatchAreaName(e.target.value)}
                placeholder="区域（如：A区-1号架）"
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-40"
              />
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold cursor-help" title="该种源标签所在的具体仓库位置（如：A区-1号架-3层），非育苗温室区域">?</span>
            </div>
            <Button onClick={handleBatchGenerate} disabled={batchGenerating} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              {batchGenerating ? '生成中...' : '生成'}
            </Button>
            <Button onClick={() => setShowBatchGenerate(false)} variant="secondary" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
        <span className="text-xs text-gray-400">
          共 {filteredLabels.length} 个标签
        </span>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddResume((v) => !v)}
            disabled={!selectedLabelId || selectedLabel?.status === 'voided' || selectedIds.size > 0}
            variant="default"
            size="sm"
            title={
              selectedIds.size > 0 ? '多选模式下请先取消勾选，再点击行选择单个标签'
              : !selectedLabelId ? '请先在左侧选择标签'
              : selectedLabel?.status === 'voided' ? '已作废标签无法添加履历'
              : '为当前标签新增履历'
            }
          >
            <Plus className="w-4 h-4" /> 新增履历
          </Button>
          <Button
            onClick={() => setShowBatchGenerate((v) => !v)}
            variant="outline"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
          >
            <Plus className="w-4 h-4" /> 补充生成
          </Button>
          <Button
            onClick={handleOpenExport}
            variant="outline"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
          >
            <Download className="w-4 h-4 mr-1" /> 导出
          </Button>
          <Button
            onClick={() => {
              if (selectedIds.size === 0) { showAlert('请先勾选要作废的标签'); return; }
              setBatchVoidReason('');
              setShowBatchVoid(true);
            }}
            disabled={selectedIds.size === 0}
            variant="outline"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            title={selectedIds.size === 0 ? '请先勾选标签' : `批量作废已选 ${selectedIds.size} 个标签`}
          >
            <Trash2 className="w-4 h-4 mr-1" /> 批量作废{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
          <Button onClick={onClose} variant="secondary" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
            <X className="w-4 h-4" /> 关闭
          </Button>
        </div>
      </div>

      {/* 导出弹窗 */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Download className="w-4 h-4" />
                选择导出内容
              </h3>
              <Button onClick={() => setExportModalOpen(false)} variant="ghost" size="icon" className="text-white hover:bg-blue-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">导出字段（可多选）</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={selectAllExportFields} className="text-xs text-blue-600 hover:bg-blue-50">全选</Button>
                    <Button size="sm" variant="ghost" onClick={deselectAllExportFields} className="text-xs text-gray-500 hover:bg-gray-50">全不选</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {EXPORT_FIELDS.map((f) => (
                    <label
                      key={f.key}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-blue-50 transition-colors ${
                        selectedExportFields.has(f.key) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExportFields.has(f.key)}
                        onChange={() => toggleExportField(f.key)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-gray-700">{f.label}</span>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  已选 {selectedExportFields.size} / {EXPORT_FIELDS.length} 个字段
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-gray-700 block mb-2">导出范围</span>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    exportScope === 'selected' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="exportScope" checked={exportScope === 'selected'} onChange={() => setExportScope('selected')} className="w-4 h-4 text-blue-600" disabled={selectedIds.size === 0} />
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">已选标签</div>
                      <div className="text-xs text-gray-500">{selectedIds.size > 0 ? `共 ${selectedIds.size} 条` : '请先在左侧勾选标签'}</div>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    exportScope === 'filtered' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="exportScope" checked={exportScope === 'filtered'} onChange={() => setExportScope('filtered')} className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">当前筛选结果</div>
                      <div className="text-xs text-gray-500">共 {filteredLabels.length} 条</div>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    exportScope === 'currentPage' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input type="radio" name="exportScope" checked={exportScope === 'currentPage'} onChange={() => setExportScope('currentPage')} className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">当前页</div>
                      <div className="text-xs text-gray-500">最多 20 条</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setExportModalOpen(false)}>取消</Button>
              <Button variant="blue" size="sm" onClick={handleConfirmExport}>
                <Download className="w-4 h-4 mr-1" /> 确认导出
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 批量作废弹窗 */}
      {showBatchVoid && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                批量作废 {selectedIds.size} 个标签
              </h3>
              <Button onClick={() => setShowBatchVoid(false)} variant="ghost" size="icon" className="text-white hover:bg-red-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作废原因 *</label>
                <Input
                  value={batchVoidReason}
                  onChange={(e) => setBatchVoidReason(e.target.value)}
                  placeholder="如：标签重复、录入错误等"
                  className="px-3 py-2 border border-gray-400 rounded-lg text-sm w-full"
                />
              </div>
              <div className="text-sm text-gray-500">
                将对已选的 {selectedIds.size} 个标签执行作废操作，操作后标签状态变为"已作废"且不可再添加履历。
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowBatchVoid(false)} disabled={batchVoiding}>取消</Button>
              <Button variant="default" size="sm" onClick={handleBatchVoid} disabled={batchVoiding || !batchVoidReason.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                {batchVoiding ? '作废中...' : '确认作废'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}
