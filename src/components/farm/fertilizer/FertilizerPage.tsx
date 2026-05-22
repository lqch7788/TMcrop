/**
 * 施肥管理主页面组件
 * 布局：PageHeader → FilterBar → IotIndicator → StatsBar → ActionBar → Table → StatsPanel → Modals
 * 所有数据通过 useFertilizerStore 管理
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Sprout, Trash2 } from 'lucide-react';
import { useFertilizerStore, FertilizerData, useIotStore } from '@/stores';
import { FertilizerFilter } from './FertilizerFilter';
import { FertilizerTable } from './FertilizerTable';
import { FertilizerAddModal } from './FertilizerAddModal';
import { FertilizerEditModal } from './FertilizerEditModal';
import { FertilizerDetailModal } from './FertilizerDetailModal';
import { FertilizerBatchDeleteModal } from './FertilizerBatchDeleteModal';
import { FertilizerStatsPanel } from './FertilizerStatsPanel';
import FertilizerExportModal from './FertilizerExportModal';
import type { IotDeviceStatus } from './IotDataIndicator';

type OperationMode = 'normal' | 'delete' | 'export';

export default function FertilizerPage() {
  // ========== Store ==========
  const store = useFertilizerStore();
  const { items, isLoading, error } = store;
  const iotStore = useIotStore();

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
  const [showExportModal, setShowExportModal] = useState(false);

  // ========== 数据加载 ==========
  useEffect(() => {
    store.fetchItems(filters);
    iotStore.fetchDevices();
  }, []); // 首次加载

  // ========== IoT设备状态（从施肥记录中提取auto_iot记录） ==========
  const iotDevices = useMemo<IotDeviceStatus[]>(() => {
    const deviceMap = new Map<string, { deviceName: string; count: number; lastActive: string }>();
    items.filter(it => it.dataSource === 'auto_iot').forEach((it) => {
      const key = it.iotDeviceId || 'unknown';
      const existing = deviceMap.get(key);
      if (existing) {
        existing.count++;
        if (it.fertilizeTime > existing.lastActive) existing.lastActive = it.fertilizeTime;
      } else {
        deviceMap.set(key, {
          deviceName: it.iotDeviceId || '未知IoT设备',
          count: 1,
          lastActive: it.fertilizeTime,
        });
      }
    });
    return Array.from(deviceMap.entries()).map(([id, d]) => ({
      device_id: id,
      device_name: d.deviceName,
      record_count: d.count,
      last_active: d.lastActive || undefined,
    }));
  }, [items]);

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
  const handleBatchDeleteMode = useCallback(() => {
    setOperationMode(prev => prev === 'delete' ? 'normal' : 'delete');
    setSelectedIds([]);
  }, []);

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
    const toExport = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;
    if (toExport.length === 0) return;
    setShowExportModal(true);
  }, [items, selectedIds]);

  const handleExportConfirm = useCallback((format: 'csv' | 'xlsx' | 'word') => {
    const toExport = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;

    const headers = ['施肥编号', '肥料名称', '肥料类型', '作物品种', '温室位置', '稀释比例', '施肥量(kg)', '总成本', '施肥时间', '数据来源', '操作员'];
    const rows = toExport.map((it) => [
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

    if (format === 'csv') {
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `施肥记录_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx' || format === 'word') {
      // 生成简单的 HTML 表格，能被 Excel/Word 打开
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>施肥记录</title>
<style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#059669;color:#fff}</style>
</head><body><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const blob = new Blob(['﻿' + html], { type: format === 'xlsx' ? 'application/vnd.ms-excel' : 'application/msword' });
      const ext = format === 'xlsx' ? '.xls' : '.doc';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `施肥记录_${new Date().toISOString().slice(0, 10)}${ext}`;
      link.click();
      URL.revokeObjectURL(url);
    }

    setShowExportModal(false);
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
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">施肥管理</h1>
              <p className="text-gray-500">管理施肥记录、追踪肥料使用和成本分析</p>
            </div>
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

      {/* 批量删除操作栏 */}
      {operationMode === 'delete' && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="text-sm text-red-700">已选择 {selectedIds.length} 条记录</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDelete}
          >
            <Trash2 className="w-4 h-4" />
            确认删除
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setOperationMode('normal'); setSelectedIds([]); }}
          >
            取消
          </Button>
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
        onBatchDeleteMode={handleBatchDeleteMode}
        onExportMode={handleExport}
        iotDevices={iotDevices}
        iotLoading={isLoading}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
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
      <FertilizerExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        selectedCount={selectedIds.length > 0 ? selectedIds.length : items.length}
      />
    </div>
  );
}
