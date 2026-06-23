/**
 * 育苗标签管理弹窗 — 编排层（~150 行）
 * 拆分为 4 子组件：LabelBadge / LabelTable / LabelResumePanel / AddResumeForm
 * 2026-06-23: 粒度扩展 + autoSelectLabelNumber + 补充生成入口
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { usePlantLabelStore } from '@/stores/usePlantLabelStore';
import type { PlantLabel, PlantLabelResume } from '@/stores/usePlantLabelStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { LabelTable } from './LabelTable';
import { LabelResumePanel } from './LabelResumePanel';
import { AddResumeForm } from './AddResumeForm';

const PAGE_SIZE = 20;
const EXPORT_SIZES = [1000, 2000, 0]; // 0 = 全部

interface SeedlingLabelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  seedlingId: string;
  seedlingCode: string;
  /** 扫码跳转时自动选中指定编号的标签（2026-06-23 新增） */
  autoSelectLabelNumber?: string;
}

export default function SeedlingLabelManageModal({
  isOpen,
  onClose,
  seedlingId,
  seedlingCode,
  autoSelectLabelNumber,
}: SeedlingLabelManageModalProps) {
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

  // 打开弹窗时加载标签
  useEffect(() => {
    if (isOpen && seedlingId) {
      loadLabels({ seedlingId });
      hasAutoSelected.current = false;
    }
  }, [isOpen, seedlingId, loadLabels]);

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
  const seedlingLabels = labels;

  const filteredLabels = useMemo(() => {
    if (!searchText) return seedlingLabels;
    return seedlingLabels.filter((l: any) =>
      l.labelNumber.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [seedlingLabels, searchText]);

  const paginatedLabels = useMemo(() => {
    const start = (labelPage - 1) * PAGE_SIZE;
    return filteredLabels.slice(start, start + PAGE_SIZE) as PlantLabel[];
  }, [filteredLabels, labelPage]);

  const labelTotalPages = Math.max(1, Math.ceil(filteredLabels.length / PAGE_SIZE));

  const selectedLabel = seedlingLabels.find(
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
  const handleExport = useCallback(
    (size: number) => {
      const toExport = size === 0 ? filteredLabels : filteredLabels.slice(0, size);
      if (toExport.length === 0) { showAlert('无数据可导出'); return; }

      const headers = ['标签编号', '移入位置', '移入日期', '移出位置', '移出日期', '数量', '状态', '创建时间'];
      const rows = toExport.map((l: any) => [
        l.labelNumber,
        l.moveInAreaName || '',
        l.moveInDate || '',
        l.moveOutAreaName || '',
        l.moveOutDate || '',
        l.quantity ?? '',
        l.status || '',
        l.createTime || '',
      ]);

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>育苗标签数据</title>
<style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px 10px}th{background:#059669;color:#fff}</style>
</head><body><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;

      const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `育苗标签_${seedlingCode}_${todayLocal()}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [filteredLabels, seedlingCode]
  );

  // ---------- 补充生成 ----------
  const handleBatchGenerate = async () => {
    const count = parseInt(batchCount, 10);
    if (!count || count < 1) { showAlert('请输入有效的生成数量'); return; }
    setBatchGenerating(true);
    try {
      const store = usePlantLabelStore.getState();
      const result = await store.generateBatchLabels({
        seedling_id: seedlingId,
        count,
        area_name: batchAreaName.trim() || undefined,
        start_date: todayLocal(),
      });
      if (result) {
        showAlert(`成功生成 ${result.totalPrinted} 个标签`);
        await loadLabels({ seedlingId });
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
            育苗标签管理 - {seedlingCode}
          </h3>
          <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-emerald-700">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 工具栏: 导出 */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">导出:</span>
            {EXPORT_SIZES.map((size) => (
              <Button
                key={size}
                onClick={() => handleExport(size)}
                variant="outline"
                size="sm"
                className="text-xs hover:bg-emerald-50 hover:border-emerald-300"
              >
                <Download className="w-4 h-4" />
                {size === 0 ? '全部' : `${size}条`}
              </Button>
            ))}
          </div>
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
              <Button onClick={handleBatchGenerate} disabled={batchGenerating} size="sm">
                {batchGenerating ? '生成中...' : '生成'}
              </Button>
              <Button onClick={() => setShowBatchGenerate(false)} variant="secondary" size="sm">
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
            <Button
              onClick={() => setShowAddResume((v) => !v)}
              disabled={!selectedLabelId}
              variant="default"
              size="sm"
              title={!selectedLabelId ? '请先在左侧选择一个标签' : '为当前标签新增履历'}
            >
              <Plus className="w-4 h-4" /> 新增履历
            </Button>
            <Button
              onClick={() => setShowBatchGenerate((v) => !v)}
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" /> 补充生成
            </Button>
            <Button onClick={onClose} variant="secondary" size="sm">
              <X className="w-4 h-4" /> 关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
