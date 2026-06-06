/**
 * 订单管理主页面
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { OrderStats } from './components/OrderStats';
import { OrderFilter } from './components/OrderFilter';
import { OrderTable } from './components/OrderTable';
import { AddModal } from './modals/AddModal';
import { OrderDetailModal } from './modals/DetailModal';
import { EditModal } from './modals/EditModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import ActionToolbar from '@/components/warehouse/ActionToolbar';
import { Button } from '@/components/ui/button';
import {
  cropCategories,
} from '@/data/cropData';
import { CropOrder, CropOrderFilters, CropOrderStatus } from '@/types/crop';
import { useOrderDataStore } from '@/stores/useOrderDataStore';
import { useToastStore } from '@/stores/useToastStore';
import * as cropInstanceService from '@/services/apiCropInstanceService';
import { showAlert, showConfirm } from '@/lib/dialogService';

export default function OrderPage() {
  const navigate = useNavigate();

  // 权限检查 - 已取消，所有人可使用所有功能
  const canCreate = true;
  const canDelete = true;
  const canExport = true;

  // 从 Zustand Store 获取订单数据和操作方法
  const {
    orders,
    isLoading: loading,
    stats: apiStats,
    error,
    fetchOrders,
    fetchStats,
    addOrder,
    updateOrder,
    deleteOrder,
    deleteOrders,
    // [M-3] 2026-06-06 移除 syncPending 调用（apiCropOrderService.syncPendingOrders() 当前是 stub 返回 {0,0}，
    // 客户端 fire-and-forget 调用是无效网络往返；后续真同步接入时再恢复）
    clearError,
  } = useOrderDataStore();
  // 2026-06-06: 监听 store 错误并弹 Toast
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // 筛选状态
  const [filters, setFilters] = useState<CropOrderFilters>({
    orderCode: '',
    orderName: '',
    cropName: '',
    status: '',
    startDate: '',
    endDate: '',
    createBy: ''
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  // [L-5] 2026-06-06 移除 refreshKey 死状态（仅 setRefreshKey 未被使用，refreshKey 自身也未被消费）

  // 作物品种数据（从订单数据中提取唯一品种，而不是从品种库获取所有品种）
  const cropNames = useMemo(() => {
    // 从订单数据中提取所有唯一的作物品种（对应表格中显示的 cropVariety 字段）
    const uniqueCropVarieties = [...new Set(orders.map(order => order.cropVariety).filter(Boolean))];
    // 转换为下拉选项格式
    return uniqueCropVarieties
      .sort((a, b) => a.localeCompare(b)) // 按字母顺序排序
      .map(name => ({ value: name, label: name }));
  }, [orders]);

  // 组件挂载时加载数据
  useEffect(() => {
    // [M-3] 2026-06-06 移除 syncPending() 调用（详见 store 解构处注释）
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载订单数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<CropOrder | null>(null);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);

  // 工具栏模式状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // 筛选后的数据 - 按创建时间倒序排列，确保新建订单排在第一位
  const filteredData = useMemo(() => {
    const filtered = orders.filter(item => {
      if (filters.orderCode && !item.orderCode.includes(filters.orderCode)) return false;
      if (filters.orderName && !item.orderName.includes(filters.orderName)) return false;
      if (filters.cropName && !item.cropVariety.includes(filters.cropName)) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.startDate && item.orderDate < filters.startDate) return false;
      if (filters.endDate && item.orderDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      return true;
    });
    // 按创建时间倒序排列（新建的排在前面）
    return filtered.sort((a, b) => {
      const timeA = a.createTime || '';
      const timeB = b.createTime || '';
      return timeB.localeCompare(timeA);
    });
  }, [orders, filters]);

  // 统计卡片数据（优先使用后端API统计数据，否则回退到本地计算）
  const statsData = useMemo(() => {
    // 如果有API统计数据，优先使用
    if (apiStats) {
      return apiStats;
    }
    // 回退到本地计算
    const total = orders.length;
    const inProgress = orders.filter(o => o.status === CropOrderStatus.IN_PROGRESS).length;
    const completed = orders.filter(o => o.status === CropOrderStatus.COMPLETED).length;
    const thisMonth = orders.filter(o => {
      const date = new Date(o.createTime);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total, inProgress, completed, thisMonth };
  }, [orders, apiStats]);

  // 处理操作
  const handleDetail = (record: CropOrder) => {
    // 从 store 中获取最新数据，确保显示最新的客户和预计完成日期
    const latestRecord = orders.find(o => o.id === record.id) || record;
    setCurrentRecord(latestRecord);
    setDetailModalOpen(true);
  };

  const handleEdit = (record: CropOrder) => {
    // 从 store 中获取最新数据
    const latestRecord = orders.find(o => o.id === record.id) || record;
    setCurrentRecord(latestRecord);
    setEditModalOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    // 2026-06-07: 业务调整允许删除任何状态订单；已完成/已取消订单给二次确认警告
    const selectedOrders = orders.filter(o => ids.includes(o.id));
    const completedOrCancelled = selectedOrders.filter(
      o => o.status === CropOrderStatus.COMPLETED || o.status === CropOrderStatus.CANCELLED
    );
    const confirmMsg = completedOrCancelled.length > 0
      ? `选中的 ${ids.length} 条订单中包含 ${completedOrCancelled.length} 条已完成/已取消订单，删除后不可恢复。\n\n确定要继续删除吗？`
      : `确定要删除选中的 ${ids.length} 条记录吗？`;
    if (await showConfirm(confirmMsg)) {
      try {
        await deleteOrders(ids);
        setSelectedRows([]);
        // [H-4 perf] 2026-06-06 修复：删除后立即刷新统计，保证顶部统计卡片数量同步
        await fetchStats();
      } catch (error) {
        // [M-5] 2026-06-06 修复：catch 之前只弹通用文案，丢 error.message；现把 error.message 拼到 alert
        console.error('[OrderPage] 删除订单失败:', error);
        const msg = error instanceof Error ? error.message : String(error);
        showAlert(`删除失败：${msg || '请稍后重试'}`);
      }
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    setFilters({
      orderCode: '',
      orderName: '',
      cropName: '',
      status: '',
      startDate: '',
      endDate: '',
      createBy: ''
    });
    setPagination({ ...pagination, current: 1 });
  };

  // 导出相关处理
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleExportSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleExportCancel = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleConfirmExport = async () => {
    // 获取选中的数据
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头
    const headers = ['订单编号', '订单名称', '订单类型', '品种路径', '作物品种', '计划数量', '完成数量', '单位', '订单日期', '预计完成日期', '状态', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '订单编号': record.orderCode,
      '订单名称': record.orderName,
      '订单类型': record.orderType === 'breeding' ? '育种订单' : record.orderType === 'seedling' ? '育苗订单' : record.orderType === 'production' ? '生产订单' : record.orderType === 'research' ? '研发订单' : '其他',
      '品种路径': record.cropCategory,
      '作物品种': record.cropVariety,
      '计划数量': record.plannedQuantity,
      '完成数量': record.completedQuantity,
      '单位': record.unit,
      '订单日期': record.orderDate,
      '预计完成日期': record.expectedCompletionDate || '',
      '状态': (() => {
        if (record.status === CropOrderStatus.COMPLETED) return '已完成';
        if (record.status === CropOrderStatus.CANCELLED) return '已取消';
        return (record.completedQuantity || 0) > 0 ? '进行中' : '已计划';
      })(),
      '创建人': record.createBy,
      '创建时间': record.createTime,
      '备注': record.remarks || ''
    }));

    // 创建内容
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'word') {
      // Word 格式，使用带样式的 HTML
      content = `<html><head><meta charset="utf-8"><style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4a90d9; color: white; }
      </style></head><body>
        <table border="1">
          <tr>${headers.map(h => `<th style="background-color: #4a90d9; color: white;">${h}</th>`).join('')}</tr>
          ${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}
        </table>
      </body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'docx';
    } else {
      // Excel 格式，使用 HTML
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    }

    const fileName = `订单管理_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFormat.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // logger.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 订单状态选项（使用枚举值保证一致性）
  const orderStatusOptions = [
    { value: CropOrderStatus.PLANNED, label: '已计划' },
    { value: CropOrderStatus.IN_PROGRESS, label: '进行中' },
    { value: CropOrderStatus.COMPLETED, label: '已完成' },
    { value: CropOrderStatus.CANCELLED, label: '已取消' },
  ];

  const orderTypeOptions = [
    { value: 'breeding', label: '育种订单' },
    { value: 'seedling', label: '育苗订单' },
    { value: 'production', label: '生产订单' },
    { value: 'research', label: '研发订单' },
    { value: 'other', label: '其他' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
              <p className="text-gray-500">管理作物订单、跟踪订单执行状态和交付进度</p>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <OrderStats data={statsData} />

      {/* 筛选工具栏 */}
      <OrderFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        orderStatusOptions={orderStatusOptions}
        cropNames={cropNames}
      />

      {/* 操作按钮 */}
      <ActionToolbar
        title="订单列表"
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
        lowStockCount={0}
        filters={{ showLowStock: false }}
        onLowStockToggle={() => {}}
        onBatchEdit={() => setBatchEditMode(true)}
        onDelete={() => setDeleteMode(true)}
        onExport={handleExportClick}
        onConfirmBatchEdit={() => {}}
        onCancelBatchEdit={() => setBatchEditMode(false)}
        onConfirmDelete={() => handleDelete(selectedRows)}
        onCancelDelete={() => { setDeleteMode(false); setSelectedRows([]); }}
        onConfirmExport={handleExportClickConfirm}
        onCancelExport={handleExportCancel}
        onAdd={() => setAddModalOpen(true)}
        canCreate={canCreate}
        canEdit={false}
        canDelete={canDelete}
        canExport={true}
        showLowStockButton={false}
        showCustomerButton={true}
        onCustomer={() => navigate('/crop/customer')}
        noCard={true}
      />

      {/* 数据表格 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      )}
      <OrderTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onDetail={handleDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => setAddModalOpen(true)}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        onExportSelectAll={handleExportSelectAll}
        onExportCancel={handleExportCancel}
        onConfirmExport={handleExportClickConfirm}
        canCreate={canCreate}
        canDelete={canDelete}
        canExport={canExport}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          // [H-4 perf] 2026-06-06 修复：新增订单后同时刷新列表 + 统计，
          // 否则顶部 OrderStats 数量不更新
          fetchOrders();
          fetchStats();
        }}
        orderTypeOptions={orderTypeOptions}
      />

      {currentRecord && (
        <OrderDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            // Store 的 updateOrder 已同步更新本地状态，无需重新 fetch
          }}
          record={currentRecord}
          orderTypeOptions={orderTypeOptions}
        />
      )}

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        selectedCount={selectedRows.length}
      />
    </div>
  );
}
