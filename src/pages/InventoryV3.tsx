/**
 * V3.0 统一库存管理页面
 * 样式与 OrderPage（订单管理）保持一致
 * 数据流：组件 → enhancedApiClient → 后端 Express → SQLite
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Boxes, Package, Leaf, Sprout } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '@/lib/utils';
import ActionToolbar from '../components/warehouse/ActionToolbar';
// 一次性动作（"非持久化数据"）：按修订后铁律直接调 service
import { getInventoryList, getInventoryStats, deleteInventoryBatch } from '../services/inventoryService';
import { useInventoryStore } from '../stores';
import {
  StockType,
  SourceType,
  InventoryStatus,
  InventoryStock,
} from '../types/inventory';
import { OutboundModal } from '../components/warehouse/OutboundModal';
import { AddStockModal } from '../components/farm/inventory/AddStockModal';
import { showAlert, showConfirm } from '@/lib/dialogService';

import { InventoryStockTypeCards } from '../components/farm/inventory/InventoryStockTypeCards';
import { InventoryFilter, InventoryFilterState } from '../components/farm/inventory/InventoryFilter';
import { InventoryTable } from '../components/farm/inventory/InventoryTable';
import { InventoryDetailModal } from '../components/farm/inventory/InventoryDetailModal';

export default function InventoryV3Page() {
  // 数据状态
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [stats, setStats] = useState<{
    totalInstances: number;
    totalQuantity: number;
    byStockType: Record<string, { count: number; quantity: number }>;
    lowStockCount: number;
    expiringCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailStock, setDetailStock] = useState<InventoryStock | null>(null);

  // 批量操作状态（与 ActionToolbar 协同）
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // 跨页刷新：订阅 useInventoryStore.version
  // 任何写操作（采收入库 / 出库 / 冻结）成功后 store.notifyChange() 会触发这里自动重新加载
  const inventoryVersion = useInventoryStore((s) => s.version);

  useEffect(() => {
    loadData();
  }, [inventoryVersion, filters.stockType, filters.status, filters.sourceType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const apiFilters: { stockType?: StockType; status?: InventoryStatus; sourceType?: SourceType } = {};
      if (filters.stockType) apiFilters.stockType = filters.stockType as StockType;
      if (filters.status) apiFilters.status = filters.status as InventoryStatus;
      if (filters.sourceType) apiFilters.sourceType = filters.sourceType as SourceType;

      const [stockList, statsData] = await Promise.all([
        getInventoryList(apiFilters),
        getInventoryStats(),
      ]);

      setStocks(stockList);
      setStats(statsData);
    } catch (error) {
      console.error('[InventoryV3] 加载库存数据失败:', error);
      showAlert('加载库存数据失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

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
      // 确认模式
      if (selectedRows.length === 0) {
        showAlert('请先选择要删除的库存记录');
        return;
      }
      handleConfirmDelete();
      return;
    }
    setDeleteMode(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要删除的库存记录');
      return;
    }
    const ok = await showConfirm(`确定要删除选中的 ${selectedRows.length} 条库存记录吗？此操作不可撤销。`);
    if (!ok) return;
    const result = await deleteInventoryBatch(selectedRows);
    if (result.success) {
      showAlert(`已删除 ${result.deletedCount} 条记录`);
      setSelectedRows([]);
      setDeleteMode(false);
      useInventoryStore.getState().notifyChange();
      loadData();
    } else {
      showAlert(`删除失败：${result.error || '未知错误'}`, 'error');
    }
  };

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
      const stockTypeLabel = s.stockType === 'seed' ? '种源' : s.stockType === 'seedling' ? '种苗' : '成品';
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

  // 出库成功回调
  const handleOutboundSuccess = () => {
    useInventoryStore.getState().notifyChange();
    loadData();
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

      {/* 筛选工具栏（移到分类汇总上方，方便先过滤再看分类） */}
      <InventoryFilter
        filters={filters}
        onChange={setFilters}
        onRefresh={loadData}
        loading={loading}
      />

      {/* 按库存类型分类小卡片 + Tab 切换（同一行：Tabs 左，分类汇总右） */}
      <div className="flex items-stretch gap-3 flex-wrap">
        {/* 库存类型 Tab 快速切换（加粗 + 高亮背景） */}
        <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-100 flex-1 min-w-0">
          <Tabs
            value={filters.stockType || 'all'}
            onValueChange={(val) => {
              // 同步更新筛选条件
              const stockType =
                val === 'all' ? '' :
                val === 'seed' ? StockType.SEED :
                val === 'seedling' ? StockType.SEEDLING :
                val === 'product' ? StockType.PRODUCT : '';
              setFilters({ ...filters, stockType: stockType as StockType | '' });
            }}
          >
            <TabsList className="w-full justify-start bg-transparent p-0 gap-2 flex-wrap">
              {[
                { key: 'all', label: '全部', icon: <Package className="w-4 h-4" />,
                  activeStyle: 'bg-blue-600 text-white shadow-md ring-1 ring-blue-700' },
                { key: 'seed', label: '种源', icon: <Leaf className="w-4 h-4" />,
                  activeStyle: 'bg-amber-500 text-white shadow-md ring-1 ring-amber-600' },
                { key: 'seedling', label: '种苗', icon: <Sprout className="w-4 h-4" />,
                  activeStyle: 'bg-green-500 text-white shadow-md ring-1 ring-green-600' },
                { key: 'product', label: '成品', icon: <Package className="w-4 h-4" />,
                  activeStyle: 'bg-emerald-500 text-white shadow-md ring-1 ring-emerald-600' },
              ].map((tab) => {
                const isActive =
                  (filters.stockType === '' && tab.key === 'all') ||
                  filters.stockType === tab.key;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                      isActive
                        ? tab.activeStyle
                        : 'text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* 分类汇总（靠右） */}
        <div className="shrink-0">
          <InventoryStockTypeCards byStockType={stats?.byStockType} />
        </div>
      </div>

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
        onViewDetail={handleViewDetail}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        showCheckboxes={batchEditMode || deleteMode || exportMode}
        onSelectAll={handleSelectAll}
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
      />
    </div>
  );
}
