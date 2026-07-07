/**
 * V3.0 统一库存管理页面
 * 样式与 OrderPage（订单管理）保持一致
 * 数据流：组件 → enhancedApiClient → 后端 Express → SQLite
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Boxes, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ActionToolbar from '../components/warehouse/ActionToolbar';
// 2026-06-04 V2.1 铁律改造：持久化数据走 Store，删除走 Store action
// 一次性动作（CSV 导出）保留直调 client-side
import { useInventoryStore } from '../stores';
import {
  StockType,
  SourceType,
  InventoryStatus,
  InventoryStock,
} from '../types/inventory';
import { OutboundModal } from '../components/warehouse/OutboundModal';
import { AddStockModal } from '../components/farm/inventory/AddStockModal';
import { FreezeModal } from '../components/farm/inventory/FreezeModal';
import { showAlert } from '@/lib/dialogService';
// 2026-06-09 统一删除警告弹窗：与"技术方案"页面一致（UI 库 DeleteConfirmModal）
import { DeleteConfirmModal, Button } from '@/components/ui';

import { InventoryFilter, InventoryFilterState } from '../components/farm/inventory/InventoryFilter';
import { InventoryTable } from '../components/farm/inventory/InventoryTable';
import { InventoryDetailModal } from '../components/farm/inventory/InventoryDetailModal';

export default function InventoryV3Page() {
  // 持久化数据：list/stats/loading 全部从 useInventoryStore 读取
  const stocks = useInventoryStore((s) => s.items);
  const stats = useInventoryStore((s) => s.stats);
  const loading = useInventoryStore((s) => s.loading);
  const loadAll = useInventoryStore((s) => s.loadAll);
  const deleteBatch = useInventoryStore((s) => s.deleteBatch);

  // 筛选
  const [filters, setFilters] = useState<InventoryFilterState>({
    stockType: '',
    status: '',
    sourceType: '',
    keyword: '',
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // 弹窗状态
  const [outboundModalOpen, setOutboundModalOpen] = useState(false);
  const [selectedOutboundStock, setSelectedOutboundStock] = useState<InventoryStock | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [selectedFreezeStock, setSelectedFreezeStock] = useState<InventoryStock | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStock, setDetailStock] = useState<InventoryStock | null>(null);
  // 2026-06-09 删除警告弹窗（与"技术方案"页面一致：DeleteConfirmModal）
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 批量操作状态（与 ActionToolbar 协同）
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // 2026-07-07：种源采购入口跳转
  const navigate = useNavigate();

  // 跨页刷新：订阅 useInventoryStore.version
  // 任何写操作（采收入库 / 出库 / 冻结）成功后 store.notifyChange() 会触发这里自动重新加载
  const inventoryVersion = useInventoryStore((s) => s.version);

  useEffect(() => {
    // 2026-06-11 修复: 直接传 filters 给 loadAll, 消除 setStoreFilters 竞态
    loadAll({
      stockType: filters.stockType as StockType,
      status: filters.status as InventoryStatus,
      sourceType: filters.sourceType as SourceType,
    });
  }, [inventoryVersion, filters.stockType, filters.status, filters.sourceType, loadAll]);

  // 关键字过滤（前端）+ 低库存过滤
  const filteredStocks = useMemo(() => {
    let result = stocks;
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(stock =>
        (stock.instanceId || '').toLowerCase().includes(keyword) ||
        (stock.cropName || '').toLowerCase().includes(keyword) ||
        (stock.varietyName || '').toLowerCase().includes(keyword) ||
        (stock.warehouseName || '').toLowerCase().includes(keyword)
      );
    }
    if (showLowStockOnly) {
      // 数量 < 10 视为低库存（与后端 stats.lowStockCount 一致）
      result = result.filter(s => (s.currentQuantity ?? 0) < 10);
    }
    return result;
  }, [stocks, filters.keyword, showLowStockOnly]);

  // 退出批量模式时清空选中
  useEffect(() => {
    if (!batchEditMode && !deleteMode && !exportMode) {
      setSelectedRows([]);
    }
  }, [batchEditMode, deleteMode, exportMode]);

  // ===== 操作按钮处理 =====
  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const handleBatchEdit = () => {
    if (!showLowStockOnly && !batchEditMode) {
      setBatchEditMode(true);
      return;
    }
    showAlert('批量编辑暂未实现，请到出库弹窗调整单条库存数量。');
  };

  const handleDelete = () => {
    if (deleteMode) {
      // 确认模式：校验已选行 → 弹 DeleteConfirmModal（与"技术方案"流程一致）
      if (selectedRows.length === 0) {
        showAlert('请先选择要删除的库存记录');
        return;
      }
      setShowDeleteModal(true);
      return;
    }
    setDeleteMode(true);
  };

  // 2026-06-09 改造：弹窗回调直接调 Store action（替代旧 showConfirm 流程）
  const handleDeleteModalConfirm = async () => {
    // 2026-06-04 V2.1 铁律改造：删除走 Store action（自动 notifyChange 跨页刷新）
    const result: any = await deleteBatch(selectedRows);
    setShowDeleteModal(false);
    if (result.success) {
      showAlert(`已删除 ${result.deletedCount} 条记录`);
      setSelectedRows([]);
      setDeleteMode(false);
    } else {
      // 2026-07-03：用 alert 显示阻挡详情（showAlert 是居中弹窗不会消失）
      const blockingTxs = (result as any).blockingTransactions || [];
      const blockedList = (result as any).blocked || [];
      const renderTxList = (txs: any[]) => txs.map((tx: any) => {
        const type = tx.txTypeLabel || tx.txType || '-';
        return `  · ${tx.txId || '-'}  [${type}]  ${tx.businessCode || '-'}  ×${tx.qty || 0}  ${tx.operatorName || '-'} ${tx.operateDate || '-'}`;
      }).join('\n');
      let detailText = result.error || '删除失败';
      if (blockingTxs.length > 0) {
        detailText += '\n\n以下出库/调拨记录正在使用此库存：\n';
        detailText += renderTxList(blockingTxs);
        detailText += '\n\n请先在「出库记录」中撤销以上出库/调拨记录，再回来删除此作物库存。';
      } else if (blockedList.length > 0) {
        detailText += '\n\n以下库存被拦截：\n';
        for (const b of blockedList) {
          detailText += '\n【' + b.stockId + '】\n';
          const innerTxs = b.blockingTransactions || [];
          if (innerTxs.length > 0) detailText += renderTxList(innerTxs) + '\n';
        }
        detailText += '\n请先删除以上出库记录，再删除这些作物库存。';
      }
      showAlert(detailText);
    }
  };

  // 保留旧名以兼容 ActionToolbar 的 onConfirmDelete prop
  const handleConfirmDelete = () => setShowDeleteModal(true);

  const handleCancelDelete = () => {
    setDeleteMode(false);
    setSelectedRows([]);
  };

  const handleExport = () => {
    if (exportMode) {
      // 确认模式：执行导出
      handleConfirmExport();
      return;
    }
    setExportMode(true);
  };

  const handleConfirmExport = () => {
    const rowsToExport = selectedRows.length > 0
      ? filteredStocks.filter(s => selectedRows.includes(s.instanceId))
      : filteredStocks;
    if (rowsToExport.length === 0) {
      showAlert('没有可导出的数据');
      return;
    }
    // 导出 CSV（UTF-8 BOM 防止 Excel 打开乱码）
    const headers = ['实例ID', '类型', '作物', '品种', '数量', '可用', '冻结', '仓库', '来源', '状态', '入库日期'];
    const csvRows = [headers.join(',')];
    rowsToExport.forEach((s) => {
      const stockTypeLabel = s.stockType === 'seed'
        ? `商品种源${s.businessType === 'seed_source' ? '（历史迁移）' : ''}`
        : s.stockType === 'seedling' ? '种苗' : '成品';
      const statusLabel = s.status === 'in_stock' ? '库存中' : s.status === 'low_stock' ? '低库存' : s.status === 'frozen' ? '已冻结' : s.status === 'outbound' ? '已出库' : '已用完';
      const sourceLabel = s.sourceType === 'self_produced' ? '自产' : '外购';
      csvRows.push([
        s.instanceId, stockTypeLabel, s.cropName, s.varietyName,
        `${s.currentQuantity} ${s.unit}`, `${(s.currentQuantity ?? 0) - (s.frozenQuantity ?? 0)} ${s.unit}`,
        `${s.frozenQuantity} ${s.unit}`, s.warehouseName, sourceLabel, statusLabel, s.inboundDate,
      ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const csvContent = '﻿' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `作物库存_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert(`已导出 ${rowsToExport.length} 条记录`);
    setSelectedRows([]);
    setExportMode(false);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    const pageIds = filteredStocks
      .slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)
      .map(s => s.instanceId);
    const allSelected = pageIds.every(id => selectedRows.includes(id));
    if (allSelected) {
      setSelectedRows(selectedRows.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedRows(Array.from(new Set([...selectedRows, ...pageIds])));
    }
  };

  // 统计当前低库存数（用于 ActionToolbar 红点徽章）
  const lowStockCount = useMemo(
    () => stocks.filter(s => (s.currentQuantity ?? 0) < 10).length,
    [stocks]
  );

  // 打开冻结弹窗
  const handleOpenFreeze = (stock: InventoryStock) => {
    if (stock.status !== InventoryStatus.IN_STOCK && stock.status !== InventoryStatus.LOW_STOCK
      && stock.status !== 'in_stock' && stock.status !== 'low_stock') {
      showAlert('只有库存中或低库存状态的物品可以冻结');
      return;
    }
    setSelectedFreezeStock(stock);
    setFreezeModalOpen(true);
  };

  // 打开出库弹窗
  const handleOpenOutbound = (stock: InventoryStock) => {
    if (stock.status !== InventoryStatus.IN_STOCK && stock.status !== InventoryStatus.LOW_STOCK
      && stock.status !== 'in_stock' && stock.status !== 'low_stock') {
      showAlert('只有库存中或低库存状态的物品可以出库');
      return;
    }
    setSelectedOutboundStock(stock);
    setOutboundModalOpen(true);
  };

  // 出库成功回调（V2.1 铁律：仅触发跨页刷新订阅，具体 reload 由 useEffect 监 inventoryVersion 自动触发）
  const handleOutboundSuccess = () => {
    useInventoryStore.getState().notifyChange();
  };

  // 打开详情弹窗（合并原"追溯"功能）
  const handleViewDetail = (stock: InventoryStock) => {
    setDetailStock(stock);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题卡片（与 OrderPage 风格一致） */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">作物库存</h1>
              <p className="text-gray-500">管理采收入库产品的库存状态、出入库与全链路追溯</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2026-07-07：种源采购入口提示 banner（外购种子请到种源管理页面） */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-sm text-amber-800">
          <div className="font-medium">外购种子请到「种源管理」页面操作</div>
          <div className="text-xs mt-0.5 text-amber-700">
            作物库存页只展示种苗、成品两类（外购种源采购请到内部种源页面）。
            历史已迁移到本表的历史种源数据会在下方列表显示「历史迁移」徽章。
          </div>
        </div>
        <Button variant="default" size="sm" onClick={() => navigate('/crop/seed-source')}>
          前往种源管理
        </Button>
      </div>

      {/* 筛选工具栏（移到分类汇总上方，方便先过滤再看分类） */}
      <InventoryFilter
        filters={filters}
        onChange={setFilters}
        onRefresh={loadAll}
        loading={loading}
      />

      {/* 表格操作工具栏（与 OrderPage 风格一致：标题 + 新增/编辑/删除/导出按钮） */}
      <ActionToolbar
        title="库存列表"
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows as unknown as number[]}
        lowStockCount={lowStockCount}
        filters={{ showLowStock: showLowStockOnly }}
        onLowStockToggle={() => setShowLowStockOnly(v => !v)}
        onBatchEdit={handleBatchEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        onConfirmBatchEdit={() => showAlert('批量编辑暂未实现')}
        onCancelBatchEdit={() => setBatchEditMode(false)}
        onConfirmDelete={handleConfirmDelete}
        onCancelDelete={handleCancelDelete}
        onConfirmExport={handleConfirmExport}
        onCancelExport={handleCancelExport}
        onAdd={handleAdd}
        canCreate={true}
        canEdit={true}
        canDelete={true}
        canExport={true}
        showLowStockButton={true}
        showCustomerButton={false}
        noCard={true}
      />

      {/* 数据表格 */}
      <InventoryTable
        data={filteredStocks}
        loading={loading}
        pagination={pagination}
        onChange={setPagination}
        onOutbound={handleOpenOutbound}
        onFreeze={handleOpenFreeze}
        onViewDetail={handleViewDetail}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        showCheckboxes={batchEditMode || deleteMode || exportMode}
        onSelectAll={handleSelectAll}
      />

      {/* 冻结弹窗 */}
      <FreezeModal
        isOpen={freezeModalOpen}
        stock={selectedFreezeStock}
        onClose={() => setFreezeModalOpen(false)}
        onSuccess={handleOutboundSuccess}
      />

      {/* 出库弹窗 */}
      {selectedOutboundStock && (
        <OutboundModal
          isOpen={outboundModalOpen}
          onClose={() => setOutboundModalOpen(false)}
          stock={selectedOutboundStock}
          onSuccess={handleOutboundSuccess}
        />
      )}

      {/* 新建入库弹窗（支持外购/赠送/委托/调拨/手动等） */}
      <AddStockModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />

      {/* 详情弹窗（合并原"追溯"功能） */}
      <InventoryDetailModal
        isOpen={detailModalOpen}
        stock={detailStock}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailStock(null);
        }}
        onNavigateToInstance={(id) => setDetailStock({ instanceId: id } as any)}
      />

      {/* 2026-06-09 删除警告弹窗（与"技术方案"页面统一为 DeleteConfirmModal） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteModalConfirm}
      />
    </div>
  );
}
