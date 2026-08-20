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
import { ReprintLabelInline, type ReprintLabelDetail } from '@/components/farm/seedling/modals/ReprintLabelInline';
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
  move: '位置变更',
  move_in: '移入（历史）',
  move_out: '移出（历史）',
  patch: '属性补录',
  reprint: '补印',
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

  // ---------- 补印状态（2026-08-19 重构：补印 = 重打 N 份相同标签） ----------
  const [showReprint, setShowReprint] = useState(false);
  const [reprintCount, setReprintCount] = useState('1');
  const [reprintDate, setReprintDate] = useState(todayLocal());
  const [reprinting, setReprinting] = useState(false);
  // 2026-08-19：补印成功后保存源标签详情，打开预览+打印弹窗
  const [reprintDetail, setReprintDetail] = useState<ReprintLabelDetail | null>(null);

  const handleReprint = async () => {
    if (!selectedLabelId) { showAlert('请先在左侧选择一个标签'); return; }
    const n = parseInt(reprintCount, 10);
    if (!n || n < 1 || n > 50) { showAlert('打印份数必须在 1-50 之间'); return; }
    setReprinting(true);
    try {
      const operatorName = useAuthStore.getState().currentUser?.realName ||
                           useAuthStore.getState().currentUser?.username || 'system';
      const res: any = await enhancedApiClient.post('/plant-labels/reprint', {
        source_label_id: selectedLabelId,
        copy_count: n,
        mark_date: reprintDate,
        operator_name: operatorName,
      });
      if (res?.success !== false) {
        // 2026-08-19：响应经 camelCase 中间件转换，兼容两种 key（防御中间件配置变化）
        let detail = res?.data?.sourceLabelDetail || res?.data?.source_label_detail;
        // 兜底：如果 /reprint 响应没带 detail（防御性），直接 GET /:id/detail 端点拿详情
        // ⚠️ enhancedApiClient 自动解包 .data，detailRes 直接就是 detail 对象！
        if (!detail) {
          try {
            const detailRes: any = await enhancedApiClient.get(`/plant-labels/${selectedLabelId}/detail`);
            detail = detailRes?.labelNumber ? detailRes : undefined;
          } catch (e: any) {
            console.error('[reprint] 兜底获取 detail 失败:', e);
          }
        }
        // 2026-08-19：无论 detail 是否完整，强制打开 modal（modal 容忍空字段用 placeholder）
        //   不再用 alert 阻塞；alert 只用于真正的 /reprint 失败（success=false）
        setReprintDetail(detail || { labelId: selectedLabelId, labelNumber: '(加载失败)', quantity: 1 });
        setShowReprint(false);
        // 调试日志（用户可在 DevTools Console 看到）
        console.log('[reprint] success, detail:', detail);
      } else {
        showAlert('补印失败：' + (res?.error || '未知错误'));
      }
    } catch (e: any) {
      showAlert('网络错误：' + e.message);
    } finally {
      setReprinting(false);
    }
  };

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
      // 2026-08-20：点击行 = 单标签模式，自动清空勾选状态（避免模式混淆）
      setSelectedIds(new Set());
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

  // 2026-08-20：打开弹窗时自动选中第 1 个标签（无需用户先点行）— 单标签操作零摩擦
  useEffect(() => {
    if (!isOpen || seedSourceLabels.length === 0) return;
    if (autoSelectLabelNumber) return; // 扫码跳转优先（下面的逻辑处理）
    if (selectedLabelId !== null) return; // 已选中不覆盖
    const first = seedSourceLabels[0] as any;
    setSelectedLabelId(first.id);
    loadResumesForLabels([first.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seedSourceLabels.length]);

  // 切换标签时收起表单
  useEffect(() => {
    setShowAddResume(false);
  }, [selectedLabelId]);

  // 履历提交成功回调
  const handleResumeSubmitted = useCallback(async () => {
    if (selectedLabelId !== null) {
      await loadResumesForLabels([selectedLabelId]);
    }
    // 2026-08-17：刷新标签列表，避免 selectedLabel.quantity 过期导致下次提交 409
    await loadLabels({ seedSourceId });
    setShowAddResume(false);
  }, [selectedLabelId, loadResumesForLabels, loadLabels, seedSourceId]);

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
              // 2026-08-19：patch 现在是合并履历（mark + 位置在同一行），4 种情况
              if (r.operationType === 'mark') {
                return `${opTypeCn} ${markName || '-'}${qtyChange}${operator}${reason}`;
              }
              if (r.operationType === 'patch') {
                const hasArea = !!(r.fromAreaName || r.toAreaName);
                if (markName && hasArea) {
                  return `${opTypeCn} ${markName} ${fromArea}→${toArea} ${date}${qtyChange}${operator}${reason}`;
                }
                if (markName) {
                  return `${opTypeCn} ${markName}${qtyChange}${operator}${reason}`;
                }
                return `${opTypeCn} ${fromArea}→${toArea} ${date}${qtyChange}${operator}${reason}`;
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

      {/* 2026-08-17：补印弹窗 */}
      {showReprint && (
        <div className="px-4 py-3 border-t border-amber-200 bg-amber-50 flex-shrink-0">
          <div className="text-xs font-semibold text-amber-900 mb-2">补印标签</div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              value={reprintCount}
              onChange={(e) => setReprintCount(e.target.value)}
              placeholder="补印数量"
              min={1}
              max={50}
              className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-24"
            />
            <Input
              type="date"
              value={reprintDate}
              onChange={(e) => setReprintDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-40"
            />
            <span className="text-xs text-gray-500">
              新批号格式：原号 + -R{1..N}
            </span>
            <Button onClick={handleReprint} disabled={reprinting} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
              {reprinting ? '补印中...' : '确认补印'}
            </Button>
            <Button onClick={() => setShowReprint(false)} variant="secondary" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
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
          {/* 2026-08-20：方案 C — 按键始终可用，按"单标签/多标签"语义自适应 */}
          <Button
            onClick={() => {
              if (selectedIds.size > 1) {
                showAlert('新增履历是单标签操作，请只勾选 1 个标签或点击行选择单标签');
                return;
              }
              let targetId: number | null = null;
              if (selectedIds.size === 1) {
                targetId = Array.from(selectedIds)[0];
                setSelectedLabelId(targetId);
              } else if (selectedLabelId) {
                targetId = selectedLabelId;
              } else if (filteredLabels[0]) {
                targetId = (filteredLabels[0] as any).id;
                setSelectedLabelId(targetId);
              }
              if (!targetId) { showAlert('暂无标签可操作'); return; }
              setShowAddResume((v) => !v);
            }}
            disabled={filteredLabels.length === 0}
            variant="default"
            size="sm"
            title={
              filteredLabels.length === 0 ? '暂无可操作标签'
              : selectedIds.size > 1 ? '单标签操作 — 请只勾选 1 个标签或点击行选择单标签'
              : selectedIds.size === 1 ? '为勾选的 1 个标签新增履历'
              : selectedLabelId ? `为选中标签新增履历（标签号 ${(selectedLabel as any)?.labelNumber || ''}）`
              : '请先在左侧选择标签'
            }
          >
            <Plus className="w-4 h-4" /> 新增履历
          </Button>
          <Button
            onClick={() => {
              if (selectedIds.size > 1) {
                showAlert('补印是单标签操作，请只勾选 1 个标签或点击行选择单标签');
                return;
              }
              let targetId: number | null = null;
              if (selectedIds.size === 1) {
                targetId = Array.from(selectedIds)[0];
                setSelectedLabelId(targetId);
              } else if (selectedLabelId) {
                targetId = selectedLabelId;
              } else if (filteredLabels[0]) {
                targetId = (filteredLabels[0] as any).id;
                setSelectedLabelId(targetId);
              }
              if (!targetId) { showAlert('请先在左侧选择标签'); return; }
              setShowReprint((v) => !v);
            }}
            disabled={filteredLabels.length === 0}
            variant="outline"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            title={
              filteredLabels.length === 0 ? '暂无可补印标签'
              : selectedIds.size > 1 ? '单标签操作 — 请只勾选 1 个标签或点击行选择单标签'
              : selectedIds.size === 1 ? '为勾选的 1 个标签补印'
              : selectedLabelId ? `为选中标签补印（标签号 ${(selectedLabel as any)?.labelNumber || ''}）`
              : '请先在左侧选择标签'
            }
          >
            <Plus className="w-4 h-4" /> 补印标签
          </Button>
          <Button
            onClick={handleOpenExport}
            variant="outline"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
            title={
              selectedIds.size > 0 ? `导出已勾选的 ${selectedIds.size} 个标签`
              : '导出全部可见标签（弹窗可选范围和字段）'
            }
          >
            <Download className="w-4 h-4 mr-1" /> 导出
          </Button>
          <Button
            onClick={() => {
              if (selectedIds.size === 0) {
                showAlert('批量作废需要勾选标签（左侧复选框）');
                return;
              }
              setBatchVoidReason('');
              setShowBatchVoid(true);
            }}
            disabled={filteredLabels.length === 0}
            variant="outline"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
            title={
              filteredLabels.length === 0 ? '暂无可作废标签'
              : selectedIds.size === 0 ? '请先勾选要作废的标签（左侧复选框）'
              : `批量作废已选 ${selectedIds.size} 个标签`
            }
          >
            <Trash2 className="w-4 h-4 mr-1" /> 批量作废{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
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

      {/* 2026-08-19：补印标签预览+打印弹窗（重打 N 份相同标签，DB 不入库新行） */}
      {/* 2026-08-19：补印标签预览+打印内联面板（不弹新 Modal，避免弹窗重叠/联动拖动） */}
      {reprintDetail && (
        <ReprintLabelInline
          sourceDetail={reprintDetail}
          sourceLabelId={selectedLabelId || undefined}
          onClose={() => setReprintDetail(null)}
        />
      )}
    </UnifiedModal>
  );
}
