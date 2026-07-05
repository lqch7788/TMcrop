/**
 * 病虫害防治记录主页面组件
 * V12.0 新增
 * 布局：PageHeader → FilterBar → StatsCards → Table → Modals
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sprout } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/ui';
import { usePestControlStore, PestControlData, useToastStore } from '@/stores';
import { PestControlFilter } from './PestControlFilter';
import { PestControlTable } from './PestControlTable';
import { AddPestControlModal } from './modals/AddPestControlModal';
import { EditPestControlModal } from './modals/EditPestControlModal';
import { PestControlDetailModal } from './modals/PestControlDetailModal';
import { todayLocal } from '@/lib/dateUtils';
import { PestControlExportModal } from './modals/PestControlExportModal';

type OperationMode = 'normal' | 'delete' | 'export';

export default function PestControlPage() {
  const store = usePestControlStore();
  const { items, isLoading, error, clearError } = store;
  // 2026-06-06: 监听 store 错误并弹 Toast
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operationMode, setOperationMode] = useState<OperationMode>('normal');

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<PestControlData | null>(null);
  const [detailTarget, setDetailTarget] = useState<PestControlData | null>(null);
  // 2026-06-09 删除警告弹窗：与技术方案/作物库存/出库记录/施肥管理统一用 UI 库 DeleteConfirmModal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    store.fetchItems(filters);
  }, []);

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载病虫害数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // 统计数据
  const stats = useMemo(() => {
    const total = items.length;
    const chemical = items.filter((it) => it.controlType === 'chemical').length;
    const bio = items.filter((it) => it.controlType === 'bio').length;
    const physical = items.filter((it) => it.controlType === 'physical').length;
    return { total, chemical, bio, physical };
  }, [items]);

  const handleSearch = useCallback(() => {
    store.fetchItems(filters);
    setSelectedIds([]);
    setOperationMode('normal');
  }, [filters, store]);

  const handleReset = useCallback(() => {
    setFilters({});
    store.fetchItems({});
    setSelectedIds([]);
    setOperationMode('normal');
  }, [store]);

  const handleAdd = useCallback(() => setShowAddModal(true), []);
  const handleEdit = useCallback((record: PestControlData) => setEditTarget(record), []);
  const handleDetail = useCallback((record: PestControlData) => setDetailTarget(record), []);
  // 2026-06-09 改造：单条删除走 DeleteConfirmModal（与技术方案一致）
  const handleDelete = useCallback((id: string) => {
    setSelectedIds([id]);
    setShowDeleteModal(true);
  }, []);

  const handleBatchDeleteMode = useCallback(() => {
    setOperationMode(prev => prev === 'delete' ? 'normal' : 'delete');
    setSelectedIds([]);
  }, []);

  // 2026-06-09 改造：批量删除直接弹 DeleteConfirmModal（替代旧自写 BatchDeleteModal + 直删逻辑）
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShowDeleteModal(true);
  }, [selectedIds]);

  // 2026-06-09 改造：弹窗回调统一处理单条/批量删除
  const handleDeleteConfirm = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setShowDeleteModal(false);
    try {
      if (ids.length === 1) {
        const ok = await store.deleteItem(ids[0]);
        if (ok) {
          toast.success('已删除 1 条记录');
        } else {
          toast.error('删除失败');
        }
      } else {
        const { deleted } = await store.deleteItems(ids);
        toast.success(`已删除 ${deleted} 条记录`);
      }
      setSelectedIds([]);
      setOperationMode('normal');
      await store.fetchItems(filters);
    } catch (err: any) {
      toast.error(`删除失败：${err?.message || '未知错误'}`);
    }
  }, [selectedIds, filters, store, toast]);

  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleExportConfirm = useCallback((format: 'csv' | 'xlsx' | 'word') => {
    const toExport = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;
    if (toExport.length === 0) return;
    // 导出逻辑
    const headers = ['记录编号', '防治日期', '防治类型', '作物', '温室', '药剂名称', '用药量', '稀释比例', '防治对象', '操作员'];
    const rows = toExport.map((it) => [
      it.recordCode, it.sprayTime,
      it.controlType === 'chemical' ? '化学防治' : it.controlType === 'bio' ? '生物防治' : '物理防治',
      it.cropName, it.greenhouseName || '', it.pesticideName || it.bioAgentName || it.equipmentName || '',
      it.dosage ? `${it.dosage}${it.dosageUnit || ''}` : '', it.dilutionRatio || '', it.targetPest || '', it.operatorName || '',
    ]);

    if (format === 'csv') {
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `病虫害防治记录_${todayLocal()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx' || format === 'word') {
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>病虫害防治记录</title>
<style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#059669;color:#fff}</style>
</head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const blob = new Blob(['﻿' + html], { type: format === 'xlsx' ? 'application/vnd.ms-excel' : 'application/msword' });
      const ext = format === 'xlsx' ? '.xls' : '.doc';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `病虫害防治记录_${todayLocal()}${ext}`;
      link.click();
      URL.revokeObjectURL(url);
    }
    setShowExportModal(false);
    setSelectedIds([]);
    setOperationMode('normal');
  }, [items, selectedIds]);

  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems(filters);
  }, [filters, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems(filters);
  }, [filters, store]);

  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">病虫害管理</h1>
              <p className="text-gray-500">管理化学/生物/物理防治记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2026-07-05: 统计卡片已删除（user 要求） */}

      <PestControlFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          加载出错：{error}
        </div>
      )}

      <PestControlTable
        data={items}
        isLoading={isLoading}
        operationMode={operationMode}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onDetail={handleDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onBatchDeleteMode={handleBatchDeleteMode}
        onBatchDelete={handleBatchDelete}
        onBatchDeleteConfirm={handleDeleteConfirm}
        onExportMode={handleExport}
      />

      {showAddModal && (
        <AddPestControlModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSaved={handleAddSaved} />
      )}
      {editTarget && (
        <EditPestControlModal isOpen={!!editTarget} record={editTarget} onClose={() => setEditTarget(null)} onSaved={handleEditSaved} />
      )}
      {detailTarget && (
        <PestControlDetailModal isOpen={!!detailTarget} record={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
      <PestControlExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm} selectedCount={selectedIds.length > 0 ? selectedIds.length : items.length} />
      {/* 2026-06-09 删除警告弹窗（统一为 DeleteConfirmModal，与技术方案/作物库存/出库记录/施肥管理一致） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedIds.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
