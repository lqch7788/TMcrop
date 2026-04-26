/**
 * 订单管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Eye, X } from 'lucide-react';
import { OrderStats } from './components/OrderStats';
import { OrderFilter } from './components/OrderFilter';
import { OrderTable } from './components/OrderTable';
import { OrderCodeToolbar } from './components/OrderCodeToolbar';
import { AddModal } from './modals/AddModal';
import { DetailModal } from './modals/DetailModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import ProduceCodeGenerator from '../common/ProduceCodeGenerator';
import {
  cropCategories,
  cropNames,
  cropVarieties,
} from '@/data/cropData';
import { CropOrder, CropOrderFilters, CropOrderStatus } from '@/types/crop';
import * as cropOrderService from '@/services/cropOrderService';
import * as cropInstanceService from '@/services/cropInstanceService';

export default function OrderPage() {
  const navigate = useNavigate();

  // 产品编码生成器状态
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
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

  // 从localStorage加载数据
  const [orders, setOrders] = useState<CropOrder[]>(() =>
    cropOrderService.initOrders()
  );

  // 刷新数据
  const refreshData = useCallback(() => {
    setOrders(cropOrderService.getOrders());
    setRefreshKey(k => k + 1);
  }, []);

  // 初始化数据
  useEffect(() => {
    refreshData();
  }, [refreshKey]);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<CropOrder | null>(null);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);

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

  // 统计卡片数据
  const statsData = useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter(o => o.status === CropOrderStatus.IN_PROGRESS).length;
    const completed = orders.filter(o => o.status === CropOrderStatus.COMPLETED).length;
    const thisMonth = orders.filter(o => {
      const date = new Date(o.createTime);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total, inProgress, completed, thisMonth };
  }, [orders]);

  // 处理操作
  const handleDetail = (record: CropOrder) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  const handleDelete = (ids: string[]) => {
    if (confirm(`确定要删除选中的 ${ids.length} 条记录吗？`)) {
      cropOrderService.deleteOrders(ids);
      refreshData();
      setSelectedRows([]);
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
    const headers = ['订单编号', '订单名称', '订单类型', '作物类别', '作物名称', '作物品种', '计划数量', '实际数量', '单位', '订单日期', '预计采收日期', '状态', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '订单编号': record.orderCode,
      '订单名称': record.orderName,
      '订单类型': record.orderType === 'production' ? '生产订单' : record.orderType === 'seed' ? '种子订单' : '研发订单',
      '作物类别': record.cropCategory,
      '作物名称': record.cropName,
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
    } else {
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

  // 订单选项
  const orderStatusOptions = [
    { value: 'planned', label: '已计划' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ];

  const orderTypeOptions = [
    { value: 'production', label: '生产订单' },
    { value: 'seed', label: '种子订单' },
    { value: 'research', label: '研发订单' },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增订单
          </button>
          <button
            onClick={exportMode ? handleExportClickConfirm : handleExportClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              exportMode
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Download className="w-4 h-4" />
            {exportMode ? `导出选中 (${selectedRows.length})` : '导出'}
          </button>
        </div>
      </div>

      {/* 产品编码生成工具栏 */}
      <OrderCodeToolbar
        codeGenExpanded={codeGenExpanded}
        onCodeGenToggle={() => setCodeGenExpanded(!codeGenExpanded)}
        onCodeRuleClick={() => navigate('/produce-code-rule')}
      />

      {/* 产品编码生成器 */}
      <ProduceCodeGenerator codeGenExpanded={codeGenExpanded} />

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

      {/* 数据表格 */}
      <OrderTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onDetail={handleDetail}
        onDelete={handleDelete}
        onAdd={() => setAddModalOpen(true)}
        exportMode={exportMode}
        onExportSelectAll={handleExportSelectAll}
        onExportCancel={handleExportCancel}
        onConfirmExport={handleExportClickConfirm}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={refreshData}
        cropCategories={cropCategories}
        cropNames={cropNames}
        cropVarieties={cropVarieties}
        orderTypeOptions={orderTypeOptions}
      />

      {currentRecord && (
        <DetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
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
