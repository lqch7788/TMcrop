/**
 * 施肥管理主页面组件
 * 布局：PageHeader → FilterBar → IotIndicator → StatsBar → ActionBar → Table → StatsPanel → Modals
 * 所有数据通过 useFertilizerStore 管理
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, DeleteConfirmModal } from '@/components/ui';
import { Sprout } from 'lucide-react';
import { useFertilizerStore, FertilizerData, useIotStore, useToastStore } from '@/stores';
import { FertilizerFilter } from './FertilizerFilter';
import { FertilizerTable } from './FertilizerTable';
import { FertilizerAddModal } from './FertilizerAddModal';
import { FertilizerEditModal } from './FertilizerEditModal';
import { FertilizerDetailModal } from './FertilizerDetailModal';
import { todayLocal } from '@/lib/dateUtils';
// 2026-07-10 P1-1：抽取公共导出函数
import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
import FertilizerExportModal from './FertilizerExportModal';
import type { IotDeviceStatus } from './IotDataIndicator';

type OperationMode = 'normal' | 'delete' | 'export';

export default function FertilizerPage() {
  // ========== Store ==========
  const store = useFertilizerStore();
  const { items, isLoading, error, clearError } = store;
  const iotStore = useIotStore();
  // 2026-06-06: 监听 store 错误并弹 Toast（不修改 store 内部实现）
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // ========== 本地状态 ==========
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operationMode, setOperationMode] = useState<OperationMode>('normal');

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FertilizerData | null>(null);
  const [detailTarget, setDetailTarget] = useState<FertilizerData | null>(null);
  // 2026-06-09 删除警告弹窗：与技术方案/作物库存/出库记录统一用 UI 库 DeleteConfirmModal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);



  // ========== 数据加载 ==========
  useEffect(() => {
    store.fetchItems(filters);
    iotStore.fetchDevices();
  }, []); // 首次加载

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载施肥数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

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

  // 2026-06-09 改造：单条删除走 DeleteConfirmModal（与技术方案一致）
  const handleDelete = useCallback((id: string) => {
    setSelectedIds([id]);
    setShowDeleteModal(true);
  }, []);

  // ========== 批量操作 ==========
  const handleBatchDeleteMode = useCallback(() => {
    setOperationMode(prev => prev === 'delete' ? 'normal' : 'delete');
    setSelectedIds([]);
  }, []);

  // 2026-06-09 改造：批量删除直接弹 DeleteConfirmModal（替代旧自写 FertilizerBatchDeleteModal）
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShowDeleteModal(true);
  }, [selectedIds]);

  // 2026-06-09 改造：弹窗回调统一处理单条/批量删除
  // - 单条：store.deleteItem(id)
  // - 批量：store.deleteItems(ids) 返回 {deleted, skipped}（IoT 记录自动跳过）
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
        const { deleted, skipped } = await store.deleteItems(ids);
        if (skipped > 0) {
          toast.success(`已删除 ${deleted} 条，跳过 ${skipped} 条 IoT 记录（不可删）`);
        } else {
          toast.success(`已删除 ${deleted} 条记录`);
        }
      }
      setSelectedIds([]);
      setOperationMode('normal');
      store.fetchItems(filters);
    } catch (err: any) {
      toast.error(`删除失败：${err?.message || '未知错误'}`);
    }
  }, [selectedIds, filters, store, toast]);

  // ========== 导出处理 ==========
  const handleExport = useCallback(() => {
    const toExport = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;
    if (toExport.length === 0) return;
    setShowExportModal(true);
  }, [items, selectedIds]);

  // 2026-07-10 P1-1 bugfix：原 useCallback((format) => {...}) 内含 await 编译失败，改为 async
  const handleExportConfirm = useCallback(async (format: 'csv' | 'xlsx' | 'word') => {
    const toExport = selectedIds.length > 0
      ? items.filter((it) => selectedIds.includes(it.id))
      : items;

    const headers = ['施肥编号', '施肥时间', '作物', '温室', '区域数', '肥料种类', '总用量', '总成本', '操作员', '数据来源', '肥料明细(名称/区域/用量/稀释)'];
    const rows = toExport.map((it) => {
      let poolDetail = '';
      try {
        const pool = JSON.parse((it as any).fertilizationPool || '[]');
        if (Array.isArray(pool) && pool.length > 0) {
          poolDetail = pool.map((r: any) => `${r.fertilizerName||''} | ${r.area||''} | ${r.quantity}${r.unit||'kg'} | 1:${r.dilutionRatio||'-'}`).join('; ');
        }
      } catch {}
      const areas = new Set<string>();
      const ferts = new Set<string>();
      try {
        JSON.parse((it as any).fertilizationPool||'[]').forEach((r:any)=>{if(r.area)areas.add(r.area);if(r.fertilizerName)ferts.add(r.fertilizerName);});
      } catch {}
      return [it.fertilizerCode, it.fertilizeTime, it.cropName, it.greenhouseName,
        String(areas.size||1), String(ferts.size||1),
        String(it.quantity||0)+' '+it.unit, '¥'+(it.totalCost||0),
        it.operatorName||'', it.dataSource==='auto_iot'?'IoT自动':'手动',
        poolDetail];
    });

    const exportData = rows.map((r) => ({
      '施肥编号': r[0], '施肥时间': r[1], '作物': r[2], '温室': r[3],
      '区域数': r[4], '肥料种类': r[5], '总用量': r[6], '总成本': r[7],
      '操作员': r[8], '数据来源': r[9], '肥料明细': r[10],
    }));
    const filename = `施肥记录_${todayLocal()}`;
    if (format === 'csv') await exportCsv({ filename: `${filename}.csv`, headers, rows: exportData });
    else if (format === 'xlsx') await exportXlsx({ filename: `${filename}.xls`, headers, rows: exportData });
    else await exportWord({ filename: `${filename}.doc`, headers, rows: exportData });
    setShowExportModal(false); setSelectedIds([]); setOperationMode('normal');
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

      {/* 2026-07-05: 顶部统计卡片已删除（user 要求） */}

      {/* FilterBar */}
      <FertilizerFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* 批量删除操作栏 - 已移除：2026-06-21 改为在 FertilizerTable 工具栏原"批量删除"位置直接显示确认/取消按钮 */}

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
        onConfirmBatchDelete={handleBatchDelete}
        onCancelBatchDelete={() => { setOperationMode('normal'); setSelectedIds([]); }}
        onExportMode={handleExport}
        iotDevices={iotDevices}
        iotLoading={isLoading}
      />

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
      <FertilizerExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        selectedCount={selectedIds.length > 0 ? selectedIds.length : items.length}
      />
      {/* 2026-06-09 删除警告弹窗（统一为 DeleteConfirmModal，与技术方案/作物库存/出库记录一致） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedIds.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
