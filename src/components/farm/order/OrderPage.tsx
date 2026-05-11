/**
 * 订单管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Download, Eye, X, ShoppingCart, Trash2 } from 'lucide-react';
import { OrderStats } from './components/OrderStats';
import { OrderFilter } from './components/OrderFilter';
import { OrderTable } from './components/OrderTable';
import { AddModal } from './modals/AddModal';
import { DetailModal } from './modals/DetailModal';
import { EditModal } from './modals/EditModal';
import { ExportFormatModal } from '@/components/common/ExportFormatModal';
import ActionToolbar from '@/components/warehouse/ActionToolbar';
import {
  cropCategories,
} from '@/data/cropData';
import { CropOrder, CropOrderFilters, CropOrderStatus } from '@/types/crop';
import { getOrderStats } from '@/services/apiCropOrderService';
import * as cropOrderService from '@/services/apiCropOrderService';
import * as cropInstanceService from '@/services/apiCropInstanceService';
import * as cropVarietyService from '@/services/apiCropVarietyService';

export default function OrderPage() {
  // 权限检查 - 已取消，所有人可使用所有功能
  const canCreate = true;
  const canDelete = true;
  const canExport = true;

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
  const [refreshKey, setRefreshKey] = useState(0);

  // 订单数据
  const [orders, setOrders] = useState<CropOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // API统计数据（感知后端stats路由）
  const [apiStats, setApiStats] = useState<{ total: number; inProgress: number; completed: number; thisMonth: number } | null>(null);

  // 作物品种数据（从品种库服务获取）
  const cropVarietyOptions = useMemo(() => {
    cropVarietyService.initVarieties();
    return cropVarietyService.getVarietyOptions();
  }, []);

  // 将品种库选项转换为旧格式以兼容现有组件
  const cropNames = cropVarietyOptions.map(v => ({ value: v.value, label: v.label }));
  const cropVarieties = cropVarietyOptions.map(v => ({ value: v.varietyCode, label: v.label }));

  // 刷新数据
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cropOrderService.getOrders();
      setOrders(data || []);
    } catch (error) {
      console.error('获取订单数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    refreshData();
  }, []);

  // 获取API统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getOrderStats();
        if (stats) {
          setApiStats(stats);
        }
      } catch (error) {
        console.warn('获取API统计失败，使用本地计算:', error);
      }
    };
    fetchStats();
  }, [refreshKey]);

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

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return orders.filter(item => {
      if (filters.orderCode && !item.orderCode.includes(filters.orderCode)) return false;
      if (filters.orderName && !item.orderName.includes(filters.orderName)) return false;
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.startDate && item.orderDate < filters.startDate) return false;
      if (filters.endDate && item.orderDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      return true;
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
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  const handleEdit = (record: CropOrder) => {
    setCurrentRecord(record);
    setEditModalOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (confirm(`确定要删除选中的 ${ids.length} 条记录吗？`)) {
      try {
        await cropOrderService.deleteOrders(ids);
        refreshData();
        setSelectedRows([]);
      } catch (error) {
        console.error('删除订单失败:', error);
        alert('删除失败，请稍后重试');
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
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleConfirmExport = async () => {
    // 获取选中的数据
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头
    const headers = ['订单编号', '订单名称', '订单类型', '品种路径', '作物品种', '计划数量', '实际数量', '单位', '订单日期', '预计采收日期', '状态', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '订单编号': record.orderCode,
      '订单名称': record.orderName,
      '订单类型': record.orderType === 'breeding' ? '育种订单' : record.orderType === 'seedling' ? '育苗订单' : record.orderType === 'production' ? '生产订单' : record.orderType === 'research' ? '研发订单' : '其他',
      '品种路径': record.cropCategory,
      '作物品种': record.cropVariety,
      '计划数量': record.plannedQuantity,
      '实际数量': record.actualQuantity,
      '单位': record.unit,
      '订单日期': record.orderDate,
      '预计采收日期': record.expectedHarvestDate || '',
      '状态': record.status === CropOrderStatus.PLANNED ? '已计划' : record.status === CropOrderStatus.IN_PROGRESS ? '进行中' : record.status === CropOrderStatus.COMPLETED ? '已完成' : '已取消',
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
      console.error('Export failed:', err);
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
    <div className="p-6 space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
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
        onConfirmDelete={() => {}}
        onCancelDelete={() => setDeleteMode(false)}
        onConfirmExport={handleExportClickConfirm}
        onCancelExport={handleExportCancel}
        onAdd={() => setAddModalOpen(true)}
        canCreate={canCreate}
        canEdit={false}
        canDelete={false}
        canExport={true}
        showLowStockButton={false}
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
          refreshData();
        }}
        orderTypeOptions={orderTypeOptions}
      />

      {currentRecord && (
        <DetailModal
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
            refreshData();
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
