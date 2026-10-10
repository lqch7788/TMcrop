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
  InventoryStatus,
  InventoryStock,
} from '../types/inventory';
// 2026-10-10：状态/来源筛选改为客户端匹配（含历史别名集合）——选项常量与 match 集合统一来自此处
import {
  INVENTORY_STATUS_FILTER_OPTIONS,
  INVENTORY_SOURCE_FILTER_OPTIONS,
  LOW_STOCK_THRESHOLD,
} from '../constants/cropConstants';
import { OutboundModal } from '../components/warehouse/OutboundModal';
import { AddStockModal } from '../components/farm/inventory/AddStockModal';
import { FreezeModal } from '../components/farm/inventory/FreezeModal';
import { showAlert } from '@/lib/dialogService';
// 2026-07-28 审核 C-2：导入 useToast 修复导出时 toast.success/warning/error ReferenceError
import { useToast } from '../contexts/ToastContext';
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
  // 2026-07-28 审核 C-2：获取 toast 用于导出提示
  const { toast } = useToast();
  // 持久化数据：list/stats/loading 全部从 useInventoryStore 读取
  const stocks = useInventoryStore((s) => s.items);
  // 2026-10-10 死代码清理：删除未使用的 stats 选择器（低库存徽章一直是本地重算）
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
  // 2026-10-10 死路径清理：删除 batchEditMode——工具栏早已移除"批量编辑"按钮，
  // 该状态进入后无任何确认/退出入口（半死状态）；ActionToolbar 为共享组件仍要求传 prop，固定传 false
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // 跨页刷新：订阅 useInventoryStore.version
  // 任何写操作（采收入库 / 出库 / 冻结）成功后 store.notifyChange() 会触发这里自动重新加载
  const inventoryVersion = useInventoryStore((s) => s.version);

  useEffect(() => {
    // 2026-10-10：改为只拉一次全量（服务端 500 上限），筛选在客户端做——
    // 原因：服务端过滤要求"精确单值"，无法覆盖历史别名（external_purchase/external_purchased、
    // active 等），且每次筛选都重发请求；关键词/低库存本来就是客户端过滤，口径统一
    loadAll();
    // 注：loadAll 不传参 → 使用 store 默认空筛选
  }, [inventoryVersion, loadAll]);

  // 2026-07-13 方案 B：删除 URL 自动开弹窗 useEffect（补录走内部按钮）
  // 2026-10-10：关键词 + 类型/状态/来源 + 低库存 全部客户端过滤（别名集合匹配）
  const filteredStocks = useMemo(() => {
    let result = stocks;
    // 类型（枚举值精确匹配）
    if (filters.stockType) {
      result = result.filter(stock => stock.stockType === filters.stockType);
    }
    // 状态（含历史别名：active→库存中、frozen→部分冻结 等，见常量 match 集合）
    if (filters.status) {
      const statusOpt = INVENTORY_STATUS_FILTER_OPTIONS.find(o => o.value === filters.status);
      if (statusOpt) {
        result = result.filter(stock => statusOpt.match.includes(String(stock.status || '')));
      }
    }
    // 来源（含历史别名：external_purchase/external_harvest、transfer/cross_warehouse 等）
    if (filters.sourceType) {
      const sourceOpt = INVENTORY_SOURCE_FILTER_OPTIONS.find(o => o.value === filters.sourceType);
      if (sourceOpt) {
        result = result.filter(stock => sourceOpt.match.includes(String(stock.sourceType || '')));
      }
    }
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(stock =>
        (stock.instanceId || '').toLowerCase().includes(keyword) ||
        // 2026-10-09：搜索兼容内部主键 id（如 STK-20260619-0002）——instance_id 与 id 在历史数据中
        // 并不相同（种苗/种源行 instance_id 为 ISE-/INS- 前缀），只搜 instanceId 会搜不到内部 id
        (stock.id || '').toLowerCase().includes(keyword) ||
        (stock.cropName || '').toLowerCase().includes(keyword) ||
        (stock.varietyName || '').toLowerCase().includes(keyword) ||
        (stock.warehouseName || '').toLowerCase().includes(keyword)
      );
    }
    if (showLowStockOnly) {
      // 数量 < LOW_STOCK_THRESHOLD 视为低库存（与后端 repository getStats 口径一致）
      result = result.filter(s => (s.currentQuantity ?? 0) < LOW_STOCK_THRESHOLD);
    }
    return result;
  }, [stocks, filters.stockType, filters.status, filters.sourceType, filters.keyword, showLowStockOnly]);

  // 2026-10-10：筛选条件变化时回到第 1 页（此前停留在旧页码，筛出结果可能为空页）
  useEffect(() => {
    setPagination((p) => (p.current === 1 ? p : { ...p, current: 1 }));
  }, [filters.stockType, filters.status, filters.sourceType, filters.keyword, showLowStockOnly]);

  // 退出批量模式时清空选中
  useEffect(() => {
    if (!deleteMode && !exportMode) {
      setSelectedRows([]);
    }
  }, [deleteMode, exportMode]);

  // ===== 操作按钮处理 =====
  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const handleBatchEdit = () => {
    // 2026-10-10：批量编辑从未实现（工具栏也早已移除入口）——直接提示，不再进入半死模式
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
      // 2026-10-09：status 强转 string 比较——补录占位记录的 active/pending/cancelled 不在 InventoryStatus 枚举内
      const st = String(s.status);
      const statusLabel = st === 'in_stock' || st === 'active' ? '库存中' : st === 'pending' ? '审核中' : st === 'cancelled' ? '已取消' : st === 'low_stock' ? '低库存' : st === 'frozen' ? '已冻结' : st === 'outbound' ? '已出库' : '已用完';
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
        // 2026-10-10 修复：exportXlsx 是 async——此前未 await，失败会逃出 catch
        // （且成功提示先于实际完成），改为 await 与 CSV 分支对齐
        await exportXlsx({ filename: `作物库存_${todayLocal()}.xlsx`, headers, rows: exportData });
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
    () => stocks.filter(s => (s.currentQuantity ?? 0) < LOW_STOCK_THRESHOLD).length,
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
        batchEditMode={false}
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
        // batchEditMode 恒为 false → 该取消键永不渲染，回调留空壳仅为满足共享组件必填 prop
        onCancelBatchEdit={() => {}}
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
        showCheckboxes={deleteMode || exportMode}
        onSelectAll={handleSelectAll}
      />

      {/* 冻结弹窗 */}
      <FreezeModal
        // 2026-08-14：key 按库存实例强制重挂载（修复切换库存后字段残留）
        key={selectedFreezeStock?.instanceId ?? selectedFreezeStock?.id ?? 'freeze'}
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
        // 2026-08-14：key 按库存实例强制重挂载（修复切换库存后详情/追溯 tab 残留）
        key={detailStock?.instanceId ?? detailStock?.id ?? 'detail'}
        isOpen={detailModalOpen}
        stock={detailStock}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailStock(null);
        }}
        onNavigateToInstance={(id) => setDetailStock({ instanceId: id } as Partial<InventoryStock> as InventoryStock)}
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
