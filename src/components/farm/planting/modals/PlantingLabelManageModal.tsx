/**
 * 种植标签管理弹窗 — 编排层（~150 行）
 * 拆分为 4 子组件：LabelBadge / LabelTable / LabelResumePanel / AddResumeForm
 * 2026-06-29：从育苗标签管理复制并适配种植数据
 *  - seedlingId → plantingId
 *  - 标题/导出文件名后缀改种植
 *  - 区域字段 areaName（种植用 areaName，育苗用 siteName）
 *
 * 跨目录引用 4 子组件（来自 seedling/modals/）：
 *  因为 4 子组件已被设计为 props-driven 复用（只读 labels 数组、无 seedling 字段耦合）。
 *  后续如需重构可搬到 src/components/farm/labels/ 公共目录。
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Download, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { usePlantLabelStore } from '@/stores/usePlantLabelStore';
import type { PlantLabel, PlantLabelResume } from '@/stores/usePlantLabelStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
// 跨目录 import 种苗 4 子组件（保持原位避免目录重构）
import { LabelTable } from '../../seedling/modals/LabelTable';
import { LabelResumePanel } from '../../seedling/modals/LabelResumePanel';
import { AddResumeForm } from '../../seedling/modals/AddResumeForm';

const PAGE_SIZE = 20;

// 2026-06-28：导出可选字段（用户点击"导出"按钮后弹窗勾选）
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

// 2026-06-28：枚举值中文映射字典（导出 Excel 用，避免用户看到英文）
// plant_labels.status 枚举
const STATUS_LABEL_MAP: Record<string, string> = {
  active: '在用',
  void: '已作废',
  printed: '已打印',
  archived: '已归档',
  disabled: '已停用',
};
// plant_label_resume.operation_type 枚举
const OPERATION_TYPE_MAP: Record<string, string> = {
  move_in: '移入',
  move_out: '移出',
  mark: '标记',
  void: '作废',
};

interface PlantingLabelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantingId: string;
  plantingCode: string;
  /** 扫码跳转时自动选中指定编号的标签（2026-06-29 新增） */
  autoSelectLabelNumber?: string;
  // 2026-07-03：只读模式（已结束的记录）— 禁用所有写操作，保留查看+导出+打印
  readOnly?: boolean;
}

export default function PlantingLabelManageModal({
  isOpen,
  onClose,
  plantingId,
  plantingCode,
  autoSelectLabelNumber,
  readOnly,
}: PlantingLabelManageModalProps) {
  const { labels, labelsLoading, resumeMap, resumeLoading, loadLabels, loadResumesForLabels } =
    usePlantLabelStore();

  // ---------- 标签列表状态 ----------
  const [searchText, setSearchText] = useState('');
  const [labelPage, setLabelPage] = useState(1);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [showAddResume, setShowAddResume] = useState(false);

  // ---------- 补充生成状态 ----------
  const [showBatchGenerate, setShowBatchGenerate] = useState(false);
  const [batchCount, setBatchCount] = useState('10');
  const [batchAreaName, setBatchAreaName] = useState('');
  const [batchGenerating, setBatchGenerating] = useState(false);

  // ---------- 自动选中（扫码跳转，仅执行一次） ----------
  const hasAutoSelected = useRef(false);

  // 打开弹窗时加载标签 + 扫码深链自动选中
  // 2026-06-29 修复：合并两个 useEffect 为一个，在 loadLabels 完成后立即执行 autoSelect，
  // 避免 React 18 批处理下两个 useEffect 的 race condition 导致 autoSelectLabelNumber 未触发 setSelectedLabelId
  useEffect(() => {
    if (isOpen && plantingId) {
      hasAutoSelected.current = false;
      loadLabels({ plantingId }).then(() => {
        // 加载完成后，检查扫码深链传入的 autoSelectLabelNumber
        if (!autoSelectLabelNumber || hasAutoSelected.current) return;
        const freshLabels = usePlantLabelStore.getState().labels;
        const idx = freshLabels.findIndex(
          (l: any) => l.labelNumber === autoSelectLabelNumber
        );
        if (idx !== -1) {
          hasAutoSelected.current = true;
          const label = freshLabels[idx] as any;
          setSelectedLabelId(label.id);
          setLabelPage(Math.floor(idx / PAGE_SIZE) + 1);
          loadResumesForLabels([label.id]);
        }
      });
    }
  }, [isOpen, plantingId, loadLabels, autoSelectLabelNumber, loadResumesForLabels]);

  // ---------- 派生数据 ----------
  const plantingLabels = labels;

  const filteredLabels = useMemo(() => {
    if (!searchText) return plantingLabels;
    return plantingLabels.filter((l: any) =>
      l.labelNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [plantingLabels, searchText]);

  const paginatedLabels = useMemo(() => {
    const start = (labelPage - 1) * PAGE_SIZE;
    return filteredLabels.slice(start, start + PAGE_SIZE) as PlantLabel[];
  }, [filteredLabels, labelPage]);

  const labelTotalPages = Math.max(1, Math.ceil(filteredLabels.length / PAGE_SIZE));

  const selectedLabel = plantingLabels.find(
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

  const handleSearchChange = useCallback((v: string) => {
    setSearchText(v);
    setLabelPage(1);
  }, []);

  // 切换标签时收起表单
  useEffect(() => {
    setShowAddResume(false);
    setShowBatchGenerate(false);
  }, [selectedLabelId]);

  // 履历提交成功回调：刷新履历
  const handleResumeSubmitted = useCallback(async () => {
    if (selectedLabelId !== null) {
      await loadResumesForLabels([selectedLabelId]);
    }
    setShowAddResume(false);
  }, [selectedLabelId, loadResumesForLabels]);

  // ---------- 导出 ----------
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.filter((f) => f.defaultChecked).map((f) => f.key))
  );
  const [exportScope, setExportScope] = useState<'filtered' | 'currentPage'>('filtered');

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

  // 实际执行导出（按选中的字段动态生成列）
  const handleConfirmExport = useCallback(async () => {
    if (selectedExportFields.size === 0) {
      showAlert('请至少选择一个导出字段');
      return;
    }

    // 决定导出范围
    const dataSource = exportScope === 'currentPage' ? paginatedLabels : filteredLabels;
    if (dataSource.length === 0) {
      showAlert('无数据可导出');
      return;
    }

    const selectedFields = EXPORT_FIELDS.filter((f) => selectedExportFields.has(f.key));
    const headers = selectedFields.map((f) => f.label);

    // 检查是否需要加载履历（如果选了"履历记录"）
    const needResumes = selectedExportFields.has('resumes');
    let resumeMapForExport = resumeMap;
    if (needResumes && dataSource.length > 0) {
      const labelIds = dataSource.map((l: any) => l.id);
      await loadResumesForLabels(labelIds);
      // 从 Store 拿最新的 resumeMap
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

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>种植标签数据</title>
<style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px}th{background:#059669;color:#fff}</style>
</head><body><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;

    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `种植标签_${plantingCode}_${todayLocal()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  }, [selectedExportFields, exportScope, paginatedLabels, filteredLabels, resumeMap, loadResumesForLabels, plantingCode]);

  // ---------- 补充生成 ----------
  const handleBatchGenerate = async () => {
    const count = parseInt(batchCount, 10);
    if (!count || count < 1) { showAlert('请输入有效的生成数量'); return; }
    setBatchGenerating(true);
    try {
      const store = usePlantLabelStore.getState();
      const result = await store.generateBatchLabels({
        planting_id: plantingId,
        count,
        area_name: batchAreaName.trim() || undefined,
        start_date: todayLocal(),
      });
      if (result) {
        showAlert(`成功生成 ${result.totalPrinted} 个标签`);
        await loadLabels({ plantingId });
        setShowBatchGenerate(false);
        setBatchAreaName('');
      } else {
        showAlert('生成失败，请重试');
      }
    } catch (e) {
      showAlert('网络错误：' + (e as Error).message);
    } finally {
      setBatchGenerating(false);
    }
  };

  // ---------- 渲染 ----------
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-6xl shadow-xl max-h-[85vh] flex flex-col">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">
            种植标签管理 - {plantingCode}
          </h3>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-emerald-700">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 2026-07-03：只读模式横幅（已结束的记录） */}
        {readOnly && (
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-sm text-gray-700">该种植已结束，标签管理处于<strong>只读模式</strong>（可查看、导出、打印）</span>
          </div>
        )}

        {/* 工具栏: 导出 */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-end">
          <Button
            onClick={handleOpenExport}
            variant="blue"
            size="sm"
            className="text-xs"
          >
            <Download className="w-4 h-4 mr-1" />
            导出
          </Button>
        </div>

        {/* 主体：左侧标签列表 + 右侧履历时间线 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：标签列表（含搜索） */}
          <div className="w-2/5 border-r border-gray-200">
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
            />
          </div>

          {/* 右侧：标签履历时间线 */}
          <div className="w-3/5 overflow-y-auto p-4">
            <LabelResumePanel
              selectedLabel={selectedLabel}
              resumes={selectedResumes}
              loading={resumeLoading}
            />
          </div>
        </div>

        {/* 新增履历行内表单 */}
        {showAddResume && (
          <AddResumeForm
            selectedLabel={selectedLabel as any}
            onSubmitted={handleResumeSubmitted}
            onCancel={() => setShowAddResume(false)}
          />
        )}

        {/* 补充生成小表单 */}
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
              <Input
                type="text"
                value={batchAreaName}
                onChange={(e) => setBatchAreaName(e.target.value)}
                placeholder="移入区域（如：东区-A区）"
                className="px-2 py-1 border border-gray-300 rounded text-xs h-7 w-40"
              />
              <Button onClick={handleBatchGenerate} disabled={batchGenerating} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                {batchGenerating ? '生成中...' : '生成'}
              </Button>
              <Button onClick={() => setShowBatchGenerate(false)} variant="secondary" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 底部 */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-gray-400">
            共 {filteredLabels.length} 个标签
          </span>
          <div className="flex items-center gap-2">
            {/* 2026-07-03：只读模式下隐藏所有"写"操作按钮（新增履历、批量生成） */}
            {!readOnly && (
              <Button
                onClick={() => setShowAddResume((v) => !v)}
                disabled={!selectedLabelId}
                variant="default"
                size="sm"
                title={!selectedLabelId ? '请先在左侧选择一个标签' : '为当前标签新增履历'}
              >
                <Plus className="w-4 h-4" /> 新增履历
              </Button>
            )}
            {!readOnly && (
              <Button
                onClick={() => setShowBatchGenerate((v) => !v)}
              variant="outline"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              <Plus className="w-4 h-4" /> 补充生成
            </Button>
            )}
            <Button onClick={onClose} variant="secondary" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <X className="w-4 h-4" /> 关闭
            </Button>
          </div>
        </div>
      </div>

      {/* 2026-06-28：导出弹窗（选择字段 + 范围） */}
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
              {/* 字段多选 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">导出字段（可多选）</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={selectAllExportFields} className="text-xs text-blue-600 hover:bg-blue-50">
                      全选
                    </Button>
                    <Button size="sm" variant="ghost" onClick={deselectAllExportFields} className="text-xs text-gray-500 hover:bg-gray-50">
                      全不选
                    </Button>
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

              {/* 导出范围 */}
              <div>
                <span className="text-sm font-semibold text-gray-700 block mb-2">导出范围</span>
                <div className="flex gap-2">
                  <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    exportScope === 'filtered' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'filtered'}
                      onChange={() => setExportScope('filtered')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">当前筛选结果</div>
                      <div className="text-xs text-gray-500">共 {filteredLabels.length} 条</div>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors ${
                    exportScope === 'currentPage' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'currentPage'}
                      onChange={() => setExportScope('currentPage')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">当前页</div>
                      <div className="text-xs text-gray-500">最多 20 条</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setExportModalOpen(false)}>
                取消
              </Button>
              <Button variant="blue" size="sm" onClick={handleConfirmExport}>
                <Download className="w-4 h-4 mr-1" />
                确认导出
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
