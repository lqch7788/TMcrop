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
import { exportXlsx } from '@/services/exporters';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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
  // 2026-07-19 P2：参照 SeedSource 100% 对齐 2 步导出流程
  //   - 第 1 次点"导出"：setExportMode(true) → 表格显示 checkbox
  //   - 勾选后第 2 次点"确认导出"：handleConfirmExport → setShowExportModal(true)
  //   - 导出完成后重置 exportMode + operationMode + selectedIds（避免复选框残留）
  const [exportMode, setExportMode] = useState(false);



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
      // 2026-07-16 审核修复：与 IotDeviceStatus interface camelCase 对齐
      deviceId: id,
      deviceName: d.deviceName,
      recordCount: d.count,
      lastActive: d.lastActive || undefined,
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
      // 2026-07-16：失败也重置选中（避免重复触发同一失败请求）
      setSelectedIds([]);
      setOperationMode('normal');
      toast.error(`删除失败：${err?.message || '未知错误'}`);
    }
  }, [selectedIds, filters, store, toast]);

  // ========== 导出处理（2026-07-19 P2：100% 对齐内部种源 2 步流程）==========
  const exportCount = selectedIds.length > 0 ? selectedIds.length : items.length;

  // 第 1 步：点"导出" → 进入 exportMode（表格显示 checkbox）
  // 参照 SeedSourcePage.handleExportClick
  const handleExport = useCallback(() => {
    if (exportCount === 0) {
      toast.warning('当前筛选条件下没有可导出的数据');
      return;
    }
    setOperationMode('export');
    setExportMode(true);
    setSelectedIds([]);
  }, [exportCount]);

  // 第 2 步：勾选后点"确认导出" → 校验 + 弹格式选择弹窗
  // 参照 SeedSourcePage.handleExportClickConfirm
  const handleConfirmExport = useCallback(() => {
    if (selectedIds.length === 0) {
      toast.warning('请先勾选要导出的施肥记录');
      return;
    }
    setShowExportModal(true);
  }, [selectedIds]);

  // 取消导出模式（参照 SeedSourcePage.handleExportCancel）
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setOperationMode('normal');
    setSelectedIds([]);
  }, []);

  // 实际导出（参照 SeedSourcePage.handleConfirmExport）
  const handleExportConfirm = useCallback(async (format: 'csv' | 'xlsx' | 'pdf') => {
    // 2026-07-16：try/finally 确保弹窗始终关闭（修 silent failure：导出失败时弹窗曾卡原地）
    try {
      const toExport = selectedIds.length > 0
        ? items.filter((it) => selectedIds.includes(it.id))
        : items;

      if (toExport.length === 0) {
        toast.error('没有可导出的数据');
        return;
      }

      // 解析池数据生成导出行（2026-07-16：池损坏时 warn，但仍走导出）
      const rows = toExport.map((it) => {
        let pool: any[] = [];
        try { pool = JSON.parse((it as any).fertilizationPool || '[]'); }
        catch (e) { console.warn(`[export] 记录 ${it.id} 池 JSON 损坏:`, e); }
        const areas = new Set<string>();
        const ferts = new Set<string>();
        pool.forEach((r: any) => { if (r.area) areas.add(r.area); if (r.fertilizerName) ferts.add(r.fertilizerName); });
        const poolDetail = pool.length > 0
          ? pool.map((r: any) => `${r.fertilizerName||''}|${r.area||''}|${r.quantity}${r.unit||'kg'}|${r.dilutionRatio||'-'}`).join('; ')
          : '';
        return {
          施肥编号: it.fertilizerCode, 施肥时间: it.fertilizeTime, 作物: it.cropName,
          温室: it.greenhouseName, 区域数: String(areas.size || 1), 肥料种类: String(ferts.size || 1),
          总用量: `${it.quantity||0} ${it.unit||'kg'}`, 总成本: `¥${it.totalCost||0}`,
          操作员: it.operatorName||'', 数据来源: it.dataSource==='auto_iot'?'IoT自动':'手动', 肥料明细: poolDetail,
        };
      });

      const filename = `施肥记录_${todayLocal()}`;

      if (format === 'csv') {
        const headers = Object.keys(rows[0] || {});
        const csvRows = rows.map((r) => headers.map((h) => `"${String((r as any)[h] || '').replace(/"/g, '""')}"`).join(','));
        const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        await exportXlsx({ filename: `${filename}.xlsx`, headers: Object.keys(rows[0]||{}), rows });
      } else if (format === 'pdf') {
        const doc = new jsPDF('l', 'mm', 'a4');
        const headers = [Object.keys(rows[0] || {})];
        const data = rows.map((r) => Object.values(r).map(String));
        (doc as any).autoTable({ head: headers, body: data, startY: 15, styles: { fontSize: 7 }, headStyles: { fillColor: [16, 185, 129] } });
        doc.save(`${filename}.pdf`);
      }
      toast.success(`已导出 ${toExport.length} 条记录`);
    } catch (err: any) {
      // 2026-07-16：catch 显式提示，避免静默失败
      console.error('[export] 失败:', err);
      toast.error(`导出失败：${err?.message || '未知错误'}`);
    } finally {
      // 2026-07-16：finally 确保弹窗始终关闭（即使抛错也不卡 UI）
      // 2026-07-19 P2-fix: 重置 exportMode + operationMode + selectedIds
      //   否则 FertilizerTable showCb = operationMode==='delete' || !!exportMode 仍为 true
      //   → 复选框导出完成后不消失(参考 Seedling 同样 bug 修复)
      setShowExportModal(false);
      setSelectedIds([]);
      setOperationMode('normal');
      setExportMode(false);
    }
  }, [items, selectedIds, toast]);

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
        // 2026-07-19 P2：传 exportMode 相关 props 完整实现 2 步流程
        exportMode={exportMode}
        onConfirmExport={handleConfirmExport}
        onCancelExport={handleCancelExport}
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
        // 2026-07-19 P2：prop 名 rowCount → selectedCount 对齐通用 ExportFormatModal 接口
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
