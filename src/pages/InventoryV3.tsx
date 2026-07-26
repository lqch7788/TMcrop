/**
 * V3.0 统一库存管理页面
 * 样式与 OrderPage（订单管理）保持一致
 * 数据流：组件 → enhancedApiClient → 后端 Express → SQLite
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Boxes } from 'lucide-react';
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
import { todayLocal } from '@/lib/dateUtils';
// 2026-07-10 P1-1：抽取公共导出函数
import { exportCsv, exportXlsx } from '@/services/exporters';
// 2026-06-09 统一删除警告弹窗：与"技术方案"页面一致（UI 库 DeleteConfirmModal）
import { DeleteConfirmModal, Button } from '@/components/ui';
// 2026-07-19 P2：100% 对齐内部种源导出模式（2 步流程 + ExportFormatModal 弹窗）
import { ExportFormatModal } from '@/components/common/ExportFormatModal';

import { InventoryFilter, InventoryFilterState } from '../components/farm/inventory/InventoryFilter';
import { InventoryTable } from '../components/farm/inventory/InventoryTable';
import { InventoryDetailModal } from '../components/farm/inventory/InventoryDetailModal';
// 2026-07-14：操作列编辑弹窗
import { InventoryEditModal } from '../components/farm/inventory/InventoryEditModal';

/** 删除拦截明细——与 useInventoryStore.deleteBatch 返回类型对齐 */
interface BlockingTx {
  txId?: string;
  txType?: string;
  txTypeLabel?: string;
  businessCode?: string;
  qty?: number;
  operatorName?: string;
  operateDate?: string;
}

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
  // 2026-07-13 方案 D：删除 supplementaryMode state（补录入口统一在 AddStockModal 内"补录入库"来源按钮）
  // 2026-07-14：编辑弹窗状态
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editStock, setEditStock] = useState<InventoryStock | null>(null);
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

  // 2026-07-13 方案 B：删除 URL 自动开弹窗 useEffect（补录走内部按钮）
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
  // 2026-07-10 P1-3：类型直接从 useInventoryStore.deleteBatch 推断（Store 接口已补 blockingTransactions/blocked 字段）
  const handleDeleteModalConfirm = async () => {
    // 2026-06-04 V2.1 铁律改造：删除走 Store action（自动 notifyChange 跨页刷新）
    // 2026-07-10 P1-3 bugfix：删 as unknown as 双断言（Store 接口补全 blockingTransactions/blocked）
    const result = await deleteBatch(selectedRows);
    setShowDeleteModal(false);
    if (result.success) {
      showAlert(`已删除 ${result.deletedCount} 条记录`);
      setSelectedRows([]);
      setDeleteMode(false);
    } else {
      // 2026-07-03：用 alert 显示阻挡详情（showAlert 是居中弹窗不会消失）
      const blockingTxs = result.blockingTransactions || [];
      const blockedList = result.blocked || [];
      const renderTxList = (txs: BlockingTx[]) => txs.map((tx) => {
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

  // 2026-07-19 P2：100% 对齐内部种源导出模式（参照 SeedSourcePage handleExportClickConfirm）
  //   - 旧版：直接 exportCsv（1 步完成）
  //   - 新版：handleConfirmExport 只 setShowExportModal(true)，等用户在弹窗选格式
  //     + handleExportFormatConfirm 真正执行导出（按选中格式）
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'word'>('excel');

  const handleConfirmExport = () => {
    // 第 2 步：进入格式选择弹窗
    if (selectedRows.length === 0 && filteredStocks.length === 0) {
      showAlert('没有可导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleExportFormatConfirm = async () => {
    const rowsToExport = selectedRows.length > 0
      ? filteredStocks.filter(s => selectedRows.includes(s.instanceId))
      : filteredStocks;
    setShowExportModal(false);
    if (rowsToExport.length === 0) {
      showAlert('没有可导出的数据');
      return;
    }
    // 2026-07-21 修复：导出包含所有列表字段（15 列全部覆盖）
    const headers = ['实例ID', '作物编码', '类型', '作物信息', '品质', '采收区域', '形态', '数量', '可用', '冻结', '单位', '仓库', '来源', '状态', '入库日期'];
    const exportData = rowsToExport.map((s) => {
      const stockTypeLabel = s.stockType === 'seed'
        ? `商品种源${s.businessType === 'seed_source' ? '（历史迁移）' : ''}`
        : s.stockType === 'seedling' ? '种苗' : '成品';
      const statusLabel = s.status === 'in_stock' ? '库存中' : s.status === 'low_stock' ? '低库存' : s.status === 'frozen' ? '已冻结' : s.status === 'outbound' ? '已出库' : '已用完';
      const sourceLabel = s.sourceType === 'self_produced' ? '自产' : s.sourceType === 'external_purchase' ? '外购' : s.sourceType === 'transfer' ? '调拨' : s.sourceType || '-';
      const formLabel = s.sourceForm || s.productForm || '-';
      return {
        '实例ID': s.instanceId,
        '作物编码': s.cropCode || '-',
        '类型': stockTypeLabel,
        '作物信息': s.cropName || '-',
        '品质': s.grade || '-',
        '采收区域': s.greenhouseName || s.areaName || '-',
        '形态': formLabel,
        '数量': `${s.currentQuantity} ${s.unit}`,
        '可用': `${(s.currentQuantity ?? 0) - (s.frozenQuantity ?? 0)} ${s.unit}`,
        '冻结': `${s.frozenQuantity} ${s.unit}`,
        '单位': s.unit || '-',
        '仓库': s.warehouseName || '-',
        '来源': sourceLabel,
        '状态': statusLabel,
        '入库日期': s.inboundDate || '-',
      };
    });
    try {
      // 2026-07-19 P2：按 exportFormat 分支（参照通用 ExportFormatModal 接口 excel/csv/word）
      if (exportFormat === 'csv') {
        await exportCsv({ filename: `作物库存_${todayLocal()}.csv`, headers, rows: exportData });
        toast.success(`CSV 下载已开始（共 ${rowsToExport.length} 条）`);
      } else if (exportFormat === 'excel') {
        exportXlsx({ filename: `作物库存_${todayLocal()}.xlsx`, headers, rows: exportData });
        toast.success(`Excel 下载已开始（共 ${rowsToExport.length} 条）`);
      } else {
        toast.warning('Word 格式作物库存暂不支持，请选 Excel 或 CSV');
      }
    } catch (e) {
      toast.error(`导出失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      // 2026-07-16：try/finally 确保弹窗始终关闭 + 清理状态
      setSelectedRows([]);
      setExportMode(false);
    }
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

  // 重置筛选条件（与种植管理 handleReset 风格一致）
  // 2026-07-14：原"刷新"按钮改为"重置"，筛选清空后 useEffect 自动 loadAll 重新加载
  const handleReset = () => {
    setFilters({
      stockType: '',
      status: '',
      sourceType: '',
      keyword: '',
    });
    setPagination({ ...pagination, current: 1 });
  };

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

  // 2026-07-14：打开编辑弹窗
  const handleEdit = (stock: InventoryStock) => {
    setEditStock(stock);
    setEditModalOpen(true);
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
        onReset={handleReset}
      />

      {/* 表格操作工具栏（与 OrderPage 风格一致：标题 + 新增/编辑/删除/导出按钮） */}
      <ActionToolbar
        title="库存列表"
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
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
        canEdit={false}
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
        // 2026-07-14：操作列编辑
        onEdit={handleEdit}
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
        onClose={() => {
          setAddModalOpen(false);
        }}
      />

      {/* 2026-07-14：编辑弹窗 */}
      {editModalOpen && editStock && (
        // 2026-07-14：key={stock.instanceId} 强制 remount 防止切 stock 时字段 stale
        <InventoryEditModal
          key={editStock.instanceId}
          isOpen={editModalOpen}
          stock={editStock}
          onClose={() => {
            setEditModalOpen(false);
            setEditStock(null);
          }}
          onSuccess={() => {
            useInventoryStore.getState().notifyChange();
          }}
        />
      )}

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

      {/* 2026-06-09 删除警告弹窗（与"技术方案"页面统一为 DeleteConfirmModal）
          2026-07-08 V3.4：传 impactHint 提示用户"删除作物库存会破坏追溯链"，谨慎删除 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteModalConfirm}
        impactHint="删除作物库存会破坏「采收入库 → 库存 → 出库」的完整追溯链。系统已拦截有出库/冻结的记录；如果通过校验，请确认该库存从未被出库使用过，且后续审计不需要追溯。"
      />

      {/* 2026-07-19 P2：导出格式选择弹窗（与内部种源/育苗/种植/订单 100% 一致） */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportFormatConfirm}
        selectedCount={selectedRows.length > 0 ? selectedRows.length : filteredStocks.length}
      />
    </div>
  );
}
