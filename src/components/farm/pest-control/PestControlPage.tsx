/**
 * 病虫害防治记录主页面组件
 * V12.0 新增
 * 布局：PageHeader → FilterBar → StatsCards → Table → Modals
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sprout, Loader2, Package, MapPin, Wallet, Calendar, BarChart3 } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/ui';
import { usePestControlStore, PestControlData, useToastStore } from '@/stores';
import { PestControlFilter } from './PestControlFilter';
import { PestControlTable } from './PestControlTable';
import { AddPestControlModal } from './modals/AddPestControlModal';
import { EditPestControlModal } from './modals/EditPestControlModal';
import { PestControlDetailModal } from './modals/PestControlDetailModal';
import { todayLocal } from '@/lib/dateUtils';
// 2026-07-10 P1-1：抽取公共导出函数
import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
import { PestControlExportModal } from './modals/PestControlExportModal';
// 2026-07-10：导出时把 pesticideTypes 转中文
import { getDictLabel } from '@/stores/useDictionaryStore';
import { enhancedApiClient } from '@/lib/apiClient';

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

  // 2026-07-17：肥料统计（总用量 / 总费用 / 种类数 / 区域数）— 顶部 stats cards
  const [fertilizerStats, setFertilizerStats] = useState<{
    totalDosage: number;
    totalCost: number;
    typesCount: number;
    cropsCount: number;
    loading: boolean;
  }>({ totalDosage: 0, totalCost: 0, typesCount: 0, cropsCount: 0, loading: true });

  const loadFertilizerStats = useCallback(async () => {
    setFertilizerStats((s) => ({ ...s, loading: true }));
    try {
      // 拉 4 个维度并行（用 Promise.all）
      const [byName, byType, byCrop, byRegion] = await Promise.all([
        enhancedApiClient.get<any>('/pest-records/fertilizer-stats?group_by=fertilizer_name').catch(() => []),
        enhancedApiClient.get<any>('/pest-records/fertilizer-stats?group_by=fertilizer_type').catch(() => []),
        enhancedApiClient.get<any>('/pest-records/fertilizer-stats?group_by=crop_name').catch(() => []),
        enhancedApiClient.get<any>('/pest-records/fertilizer-stats?group_by=greenhouse_name').catch(() => []),
      ]);
      const norm = (resp: any): any[] => Array.isArray(resp) ? resp : (resp?.data ?? []);
      const listName = norm(byName);
      const listType = norm(byType);
      const listCrop = norm(byCrop);
      const listRegion = norm(byRegion);
      // 过滤掉 "unknown"（旧 schema 数据）
      const totalDosage = listName.reduce((s, r) => s + (Number(r.totalDosage) || 0), 0);
      const totalCost = listName.reduce((s, r) => s + (Number(r.totalCost) || 0), 0);
      const typesCount = listType.filter((r) => r.label && r.label !== 'unknown').length;
      const cropsCount = listCrop.filter((r) => r.label && r.label !== 'unknown').length;
      void listRegion; // 暂未直接显示区域数，预留给后续扩展
      setFertilizerStats({ totalDosage, totalCost, typesCount, cropsCount, loading: false });
    } catch (e) {
      console.error('[PestControlPage] 加载肥料统计失败:', e);
      setFertilizerStats((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { loadFertilizerStats(); }, [loadFertilizerStats]);

  // 保存/删除防治记录后，重新拉统计
  const handleStatsRefresh = useCallback(() => { loadFertilizerStats(); }, [loadFertilizerStats]);

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

  // 2026-07-10：取消 controlType 分类，stats 简化为只统计 total（按需扩展）
  const stats = useMemo(() => {
    return { total: items.length };
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

  // 2026-07-17：导出模式下点「取消」 → 退出 export 模式
  const handleExportCancel = useCallback(() => {
    setOperationMode('normal');
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
          handleStatsRefresh();
        } else {
          toast.error('删除失败');
        }
      } else {
        const { deleted } = await store.deleteItems(ids);
        toast.success(`已删除 ${deleted} 条记录`);
        handleStatsRefresh();
      }
      setSelectedIds([]);
      setOperationMode('normal');
      await store.fetchItems(filters);
    } catch (err: any) {
      toast.error(`删除失败：${err?.message || '未知错误'}`);
    }
  }, [selectedIds, filters, store, toast]);

  // 2026-07-17：点「导出」→ 进入 export 模式（显示复选框 + 顶部确认栏），不直接弹窗
  const handleExport = useCallback(() => {
    if (operationMode === 'export') {
      // 已在 export 模式再点 = 取消并退出
      setOperationMode('normal');
      setSelectedIds([]);
      return;
    }
    // 退出其他模式（避免 delete 和 export 同时激活）
    setOperationMode('export');
    setSelectedIds([]);
  }, [operationMode]);

  // 2026-07-17：export 模式下点「确认导出」→ 弹格式选择弹窗
  const handleExportModeConfirm = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // 2026-07-10 P1-1 bugfix：原 useCallback((format) => {...}) 内含 await 编译失败，改为 async
  const handleExportConfirm = useCallback(async (format: 'csv' | 'xlsx' | 'word') => {
    const toExport = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;
    if (toExport.length === 0) return;
    // 2026-07-10：导出表头删除「防治类型」列（controlType 字段已删除）
    const headers = ['记录编号', '防治日期', '药剂类型', '作物', '温室', '药剂名称', '用药量', '稀释比例', '防治对象', '操作员'];
    const rows = toExport.map((it) => [
      it.recordCode, it.sprayTime,
      // 药剂类型多值
      (it.pesticideTypes || []).map(t => getDictLabel('pesticide_type', t) || t).join('、'),
      it.cropName, it.greenhouseName || '',
      it.pesticideName || it.bioAgentName || it.equipmentName || '',
      it.dosage ? `${it.dosage}${it.dosageUnit || ''}` : '', it.dilutionRatio || '', it.targetPest || '', it.operatorName || '',
    ]);

    // 2026-07-10 P1-1：抽到底层公共函数
    const exportData = rows.map((r) => ({
      '记录编号': r[0],
      '防治日期': r[1],
      '防治类型': r[2],
      '作物': r[3],
      '温室': r[4],
      '药剂名称': r[5],
      '用药量': r[6],
      '稀释比例': r[7],
      '防治对象': r[8],
      '操作员': r[9],
    }));
    const filename = `病虫害防治记录_${todayLocal()}`;
    if (format === 'csv') {
      await exportCsv({ filename: `${filename}.csv`, headers, rows: exportData });
    } else if (format === 'xlsx') {
      await exportXlsx({ filename: `${filename}.xls`, headers, rows: exportData });
    } else {
      await exportWord({ filename: `${filename}.doc`, headers, rows: exportData });
    }
    setShowExportModal(false);
    setSelectedIds([]);
    setOperationMode('normal');
  }, [items, selectedIds]);

  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems(filters);
    handleStatsRefresh();
  }, [filters, store, handleStatsRefresh]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems(filters);
    handleStatsRefresh();
  }, [filters, store, handleStatsRefresh]);

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

      {/* 2026-07-17：肥料使用统计卡（4 张：总用量 / 总费用 / 种类数 / 作物数） */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">累计用量</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {fertilizerStats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : fertilizerStats.totalDosage.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">肥料库消耗总量</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">累计费用</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {fertilizerStats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `¥${fertilizerStats.totalCost.toFixed(2)}`}
          </div>
          <div className="text-xs text-gray-400 mt-1">元</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">涉及种类</span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {fertilizerStats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : fertilizerStats.typesCount}
          </div>
          <div className="text-xs text-gray-400 mt-1">种肥料类型</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">涉及作物</span>
            <Sprout className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {fertilizerStats.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : fertilizerStats.cropsCount}
          </div>
          <div className="text-xs text-gray-400 mt-1">种作物</div>
        </div>
      </div>

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
        onExportConfirm={handleExportModeConfirm}
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
