/**
 * 施肥管理主页面组件
 * 布局：PageHeader → FilterBar → StatsBar → ActionBar → Table → StatsPanel → Modals
 * 所有数据通过 useFertilizerStore 管理
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sprout, Plus, Trash2, Download, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useFertilizerStore, FertilizerData } from '@/stores';
import { FertilizerFilter } from './FertilizerFilter';
import { FertilizerTable } from './FertilizerTable';
import { FertilizerAddModal } from './FertilizerAddModal';
import { FertilizerEditModal } from './FertilizerEditModal';
import { FertilizerDetailModal } from './FertilizerDetailModal';
import { FertilizerBatchDeleteModal } from './FertilizerBatchDeleteModal';
import { FertilizerStatsPanel } from './FertilizerStatsPanel';

type OperationMode = 'normal' | 'delete' | 'export';

export default function FertilizerPage() {
  // ========== Store ==========
  const store = useFertilizerStore();
  const { items, isLoading, error } = store;

  // ========== 本地状态 ==========
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operationMode, setOperationMode] = useState<OperationMode>('normal');
  const [showStats, setShowStats] = useState(false);

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FertilizerData | null>(null);
  const [detailTarget, setDetailTarget] = useState<FertilizerData | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // ========== 数据加载 ==========
  useEffect(() => {
    store.fetchItems(filters);
  }, []); // 首次加载

  // ========== 统计数据计算 ==========
  const stats = useMemo(() => {
    const total = items.length;
    const totalQuantity = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const totalCost = items.reduce((sum, it) => sum + (it.totalCost || 0), 0);
    const iotCount = items.filter((it) => it.dataSource === 'auto_iot').length;
    return { total, totalQuantity, totalCost, iotCount };
  }, [items]);

  // ========== 筛选处理 ==========
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

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  const handleEdit = useCallback((record: FertilizerData) => {
    setEditTarget(record);
  }, []);

  const handleDetail = useCallback((record: FertilizerData) => {
    setDetailTarget(record);
  }, []);

  const handleDelete = useCallback((id: string) => {
    store.deleteItem(id);
  }, [store]);

  // ========== 批量操作 ==========
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShowBatchDeleteModal(true);
  }, [selectedIds]);

  const confirmBatchDelete = useCallback(async () => {
    await store.deleteItems(selectedIds);
    setShowBatchDeleteModal(false);
    setSelectedIds([]);
    setOperationMode('normal');
    store.fetchItems(filters);
  }, [selectedIds, filters, store]);

  // ========== 导出处理 ==========
  const handleExport = useCallback(() => {
    // 导出为 CSV
    const selectedItems = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;
    if (selectedItems.length === 0) return;

    const headers = ['施肥编号', '肥料名称', '肥料类型', '作物品种', '温室位置', '稀释比例', '施肥量(kg)', '总成本', '施肥时间', '数据来源', '操作员'];
    const rows = selectedItems.map((it) => [
      it.fertilizerCode,
      it.fertilizerName,
      it.fertilizerType,
      it.cropName,
      it.greenhouseName,
      it.dilutionRatio,
      it.quantity,
      it.totalCost,
      it.fertilizeTime,
      it.dataSource === 'auto_iot' ? 'IoT自动' : '手动',
      it.operatorName || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `施肥记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setSelectedIds([]);
    setOperationMode('normal');
  }, [items, selectedIds]);

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems(filters);
  }, [filters, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems(filters);
  }, [filters, store]);

  // ========== 渲染 ==========
  return (
    <div className="space-y-4 p-6 min-h-screen bg-gray-50">
      {/* PageHeader */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">施肥管理</h1>
            <p className="text-gray-500">管理施肥记录、追踪肥料使用和成本分析</p>
          </div>
        </div>
      </div>

      {/* FilterBar */}
      <FertilizerFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Stats summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">总记录数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.totalQuantity.toLocaleString()} kg</p>
              <p className="text-xs text-gray-500">施肥总量</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.totalCost.toLocaleString()} 元</p>
              <p className="text-xs text-gray-500">总成本</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
              <Sprout className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.iotCount}</p>
              <p className="text-xs text-gray-500">IoT记录数</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="h-9 px-4 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增施肥记录
          </button>
          <button
            onClick={() => {
              setOperationMode('delete');
            }}
            className={`h-9 px-4 flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${
              operationMode === 'delete'
                ? 'bg-red-600 text-white'
                : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            批量删除
          </button>
          <button
            onClick={handleExport}
            className="h-9 px-4 flex items-center gap-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="h-9 px-4 flex items-center gap-2 bg-white text-emerald-600 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          统计分析
          {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 批量删除操作栏 */}
      {operationMode === 'delete' && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="text-sm text-red-700">已选择 {selectedIds.length} 条记录</span>
          <button
            onClick={handleBatchDelete}
            className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            确认删除
          </button>
          <button
            onClick={() => { setOperationMode('normal'); setSelectedIds([]); }}
            className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          加载出错：{error}
        </div>
      )}

      {/* Table */}
      <FertilizerTable
        data={items}
        isLoading={isLoading}
        operationMode={operationMode}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onDetail={handleDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
      />

      {/* Stats Panel (collapsible) */}
      {showStats && <FertilizerStatsPanel filters={filters} />}

      {/* Modals */}
      {showAddModal && (
        <FertilizerAddModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSaved={handleAddSaved}
        />
      )}
      {editTarget && (
        <FertilizerEditModal
          isOpen={!!editTarget}
          record={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      {detailTarget && (
        <FertilizerDetailModal
          isOpen={!!detailTarget}
          record={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
      {showBatchDeleteModal && (
        <FertilizerBatchDeleteModal
          isOpen={showBatchDeleteModal}
          count={selectedIds.length}
          selectedItems={items.filter((it) => selectedIds.includes(it.id))}
          onClose={() => setShowBatchDeleteModal(false)}
          onConfirm={confirmBatchDelete}
        />
      )}
    </div>
  );
}
