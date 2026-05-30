/**
 * 种源管理主页面
 * 功能：种源列表展示、筛选、新增、编辑、删除、标签打印、图片查看、导出Excel
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Edit2, Trash2, Printer, Eye, Image, Package } from 'lucide-react';
import { SeedSourceFilter } from './components/SeedSourceFilter';
import { SeedSourceTable } from './components/SeedSourceTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { PropagationRecordModal } from './modals/PropagationRecordModal';
import { PropagationStageModal } from './modals/PropagationStageModal';
import {
  cropCategories,
  suppliers,
  units,
  seedSourceStatusOptions
} from '../../../data/cropData';
import { SeedSource, SeedSourceFilters, StockStatus, SourceType } from '../../../types/crop';
import * as cropBatchService from '../../../services/apiCropBatchService';
import { useAuthPermission } from '../../../hooks/usePermission';
import { useSeedSourceStore } from '../../../stores/useSeedSourceStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useToastStore } from '../../../stores/useToastStore';
import { enhancedApiClient } from '../../../lib/apiClient';
import * as XLSX from 'xlsx';
import { showAlert, showConfirm } from '@/lib/dialogService';

export default function SeedSourcePage() {
  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 种源模块权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;
  const canPrint = true;

  // 从 Zustand Store 获取种源数据和操作方法
  const {
    items: seedSources,
    isLoading,
    loadItems,
    deleteItem,
    deleteItems,
  } = useSeedSourceStore();

  // Toast 通知
  const toast = useToastStore((s) => s.toast);

  // 状态
  const [filters, setFilters] = useState<SeedSourceFilters>({
    cropCategory: '',
    cropName: '',
    seedCode: '',
    sourceType: '',
    supplierName: '',
    startDate: '',
    endDate: '',
    status: '',
    createBy: '',
    cropType: '',
    orgId: '',
    recorderId: '',
    surplusMin: undefined,
    surplusMax: undefined,
    propagationType: undefined,
    propagationStatus: undefined
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 组件挂载时加载数据
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SeedSource | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);

  // 操作模式状态（用于批量操作：编辑、删除、导出、打印）
  const [operationMode, setOperationMode] = useState<'normal' | 'edit' | 'delete' | 'export' | 'print'>('normal');

  // 打印模式状态
  const [printMode, setPrintMode] = useState(false);
  const [printRecords, setPrintRecords] = useState<SeedSource[]>([]);

  // 繁殖途径弹窗状态
  const [propagationRecordOpen, setPropagationRecordOpen] = useState(false);
  const [propagationStageOpen, setPropagationStageOpen] = useState(false);
  const [propagationRecord, setPropagationRecord] = useState<SeedSource | null>(null);

  // 留种初始化数据（从种植页面跳转来）
  const [seedSavingInit, setSeedSavingInit] = useState<{
    linkedPlantingId?: string;
    linkedPlantingCode?: string;
    cropName?: string;
  } | null>(null);

  // 处理从种植页面跳转来的留种请求
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'seed-saving') {
      const plantingId = params.get('plantingId') || '';
      const plantingCode = params.get('plantingCode') || '';
      const cropName = params.get('cropName') || '';
      setSeedSavingInit({ linkedPlantingId: plantingId, linkedPlantingCode: plantingCode, cropName });
      setAddModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 筛选后的数据（按创建时间倒序，新数据在前）
  const filteredData = useMemo(() => {
    // 方案1.3: 记录人ID转名称（用于级联筛选）
    let recorderName = '';
    if (filters.recorderId) {
      const userStore = useUserStore.getState();
      const user = userStore.users.find((u: any) => (u.oid || u.id) === filters.recorderId);
      recorderName = user?.name || '';
    }

    const filtered = seedSources.filter(item => {
      if (filters.cropCategory && filters.cropCategory !== '__all__' && item.cropCategory !== filters.cropCategory) return false;
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      // 方案1.3: 作物类型筛选（按cropCategory匹配）
      if (filters.cropType && filters.cropType !== '__all__' && item.cropCategory !== filters.cropType) return false;
      if (filters.seedCode && !item.seedCode.includes(filters.seedCode)) return false;
      if (filters.sourceType && filters.sourceType !== '__all__' && item.sourceType !== filters.sourceType) return false;
      if (filters.supplierName && filters.supplierName !== '__all__' && !item.supplierName.includes(filters.supplierName)) return false;
      if (filters.status && filters.status !== '__all__' && item.status !== filters.status) return false;
      if (filters.startDate && item.purchaseDate < filters.startDate) return false;
      if (filters.endDate && item.purchaseDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      // 方案1.3: 记录人筛选
      if (recorderName && item.createBy !== recorderName) return false;
      // 方案1.3: 剩余数量范围筛选 (surplus = availableCount)
      if (filters.surplusMin !== undefined && item.availableCount < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && item.availableCount > filters.surplusMax) return false;
      // 繁殖途径筛选
      if (filters.propagationType) {
        const itemPropType = (item as any).propagationType || 'external';
        if (itemPropType !== filters.propagationType) return false;
      }
      if (filters.propagationStatus) {
        const itemPropStatus = (item as any).propagationStatus;
        if (itemPropStatus !== filters.propagationStatus) return false;
      }
      return true;
    });
    // 按创建时间倒序排列（最新的在前）
    return filtered.sort((a, b) => {
      const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
      const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [filters, seedSources]);

  // 统计卡片数据
  const statsData = useMemo(() => {
    const total = seedSources.length;
    const totalQuantity = seedSources.reduce((sum, item) => sum + item.availableCount, 0);
    const monthCount = seedSources.filter(item => {
      const date = new Date(item.createTime);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    const alertCount = seedSources.filter(item =>
      item.status === StockStatus.LOW || item.status === StockStatus.DEPLETED
    ).length;
    return { total, totalQuantity, monthCount, alertCount };
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  // 处理重置
  const handleReset = () => {
    setFilters({
      cropCategory: '',
      cropName: '',
      seedCode: '',
      sourceType: '',
      supplierName: '',
      startDate: '',
      endDate: '',
      status: '',
      createBy: '',
      cropType: '',
      orgId: '',
      recorderId: '',
      surplusMin: undefined,
      surplusMax: undefined,
      propagationType: undefined,
      propagationStatus: undefined
    });
    setPagination({ ...pagination, current: 1 });
  };

  // 处理新增
  const handleAdd = () => {
    setCurrentRecord(null);
    setAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (record: SeedSource) => {
    setCurrentRecord(record);
    setEditModalOpen(true);
  };

  // 处理详情
  const handleDetail = (record: SeedSource) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  // 处理打印
  const handlePrint = (record: SeedSource) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  // 处理图片放大
  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  // 处理删除（通过 Store，删除前检查是否有育苗引用）
  const handleDelete = async (ids: string[]) => {
    for (const id of ids) {
      try {
        const res = await enhancedApiClient.get<{ deletable: boolean; refCount: number }>(`/seed-sources/${id}/check-deletable`);
        if (!res?.deletable) {
          await showAlert(`该种源已被 ${res?.refCount || '多个'} 条育苗记录引用，无法删除。\n请先清理育苗关联后再删除。`);
          return;
        }
      } catch { /* 降级策略：检查失败时允许继续删除 */ }
    }
    const success = await deleteItems(ids);
    if (success) {
      setSelectedRows([]);
    }
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择要删除的记录');
      return;
    }
    handleDelete(selectedRows);
  };

  // 处理结束计划
  const handleEnd = async (record: SeedSource, endType: 'normal' | 'abnormal') => {
    // 获取关联的生产计划批次号
    if (!record.productionPlanCode) {
      await showAlert('该种源没有关联的生产计划，无法结束');
      return;
    }

    // 查找对应的生产计划
    const batch = await cropBatchService.getCropBatchByCode(record.productionPlanCode);
    if (!batch) {
      await showAlert('未找到关联的生产计划');
      return;
    }

    // 检查是否已完成
    if (batch.batchStatus === 'completed') {
      await showAlert('该生产计划已完成结束，不能重复结束');
      return;
    }

    // 计算完成比例
    const completionRate = cropBatchService.getCompletionRate(batch, record.initialCount);

    // 确认对话框
    const isNormal = endType === 'normal';
    const confirmMsg = isNormal
      ? `确认正常结束此生产计划？\n\n入库完成比例：${Math.round(completionRate * 100)}%\n结束后禁止一切入库和补录操作`
      : `确认异常结束此生产计划？\n\n入库完成比例：${Math.round(completionRate * 100)}%\n结束后如需补录，需提交审核申请`;

    if (!await showConfirm(confirmMsg)) {
      return;
    }

    // 执行结束
    const result = await cropBatchService.endCropBatch(batch.id, endType);
    if (result) {
      await showAlert(isNormal ? '生产计划已正常结束' : '生产计划已异常结束');
      // 刷新页面数据
      window.location.reload();
    } else {
      await showAlert('结束失败');
    }
  };

  // 导出相关处理
  const handleExportClick = () => {
    setOperationMode('export');
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
    setOperationMode('normal');
    setSelectedRows([]);
  };

  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 确认打印
  const handlePrintConfirm = (records: SeedSource[]) => {
    if (records.length === 0) {
      showAlert('请先选择要打印的记录');
      return;
    }
    setPrintRecords(records);
    setCurrentRecord(records[0]);
    setPrintModalOpen(true);
    setPrintMode(false);
    setSelectedRows([]);
  };

  // 处理繁殖过程记录
  const handlePropagationRecord = (record: SeedSource) => {
    setPropagationRecord(record);
    setPropagationRecordOpen(true);
  };

  // 处理繁殖阶段推进
  const handlePropagationStage = (record: SeedSource) => {
    setPropagationRecord(record);
    setPropagationStageOpen(true);
  };

  const handleConfirmExport = async () => {
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头（含图片列）
    const headers = ['种源图片', '种源批号', '种源类型', '作物类别', '作物品种', '品种路径', '供应商', '采购日期', '采购数量', '单位', '单价(元)', '总金额(元)', '初始数量', '可用数量', '库存状态', '溯源码', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '种源图片': (record.pictures && record.pictures.length > 0) ? record.pictures[0] : '',
      '种源批号': record.seedCode,
      '种源类型': record.sourceType === SourceType.SEED ? '种子' :
                  record.sourceType === SourceType.SEEDLING ? '种苗/实生苗' :
                  record.sourceType === SourceType.CUTTING ? '扦插苗' :
                  record.sourceType === SourceType.GRAFTING ? '嫁接苗' :
                  record.sourceType === SourceType.TISSUE_CULTURE ? '组培苗' :
                  record.sourceType === SourceType.SPLIT ? '分株苗' :
                  record.sourceType === SourceType.BULB ? '种球/球根' :
                  record.sourceType === SourceType.SELF_PRODUCED ? '自繁苗' :
                  record.sourceType === SourceType.EXTERNAL ? '外购苗' : '其他',
      '作物类别': record.cropCategory,
      '作物品种（最细化）': record.cropName,
      '作物品种': record.cropVariety,
      '供应商': record.supplierName,
      '采购日期': record.purchaseDate,
      '采购数量': record.quantity,
      '单位': record.unit,
      '单价(元)': record.unitPrice,
      '总金额(元)': record.totalAmount,
      '初始数量': record.initialCount,
      '可用数量': record.availableCount,
      '库存状态': record.status === StockStatus.SUFFICIENT ? '充足' : record.status === StockStatus.LOW ? '不足' : '耗尽',
      '溯源码': record.traceabilityCode || '',
      '创建人': record.createBy,
      '创建时间': record.createTime,
      '备注': record.remarks || ''
    }));

    const fileName = `种源管理_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;

    try {
      if (exportFormat === 'xlsx') {
        // 使用 SheetJS 导出 xlsx（含图片列）
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        // 设置图片列宽约 240px (30字符) + 行高
        ws['!cols'] = headers.map((h, i) => {
          if (h === '种源图片') return { wch: 30 }; // 图片列宽
          if (h === '备注') return { wch: 25 };
          return { wch: 15 };
        });
        XLSX.utils.book_append_sheet(wb, ws, '种源记录');
        XLSX.writeFile(wb, fileName);

        // 如果有图片数据，尝试嵌入base64图片（xlsx原生图片支持）
        selectedData.forEach((record, rowIdx) => {
          if (record.pictures && record.pictures.length > 0) {
            const imgData = record.pictures[0];
            if (imgData.startsWith('data:image/')) {
              try {
                // 将base64图片嵌入到单元格（通过xlsx cell comment方式存储URL）
                const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 0 });
                if (ws[cellRef]) {
                  ws[cellRef].l = { Target: imgData }; // 存储为超链接
                }
              } catch { /* 图片嵌入失败不影响导出 */ }
            }
          }
        });
      } else if (exportFormat === 'csv') {
        const content = headers.join(',') + '\n' + exportData.map(row =>
          headers.map(h => `"${typeof row[h] === 'string' ? row[h].replace(/"/g, '""') : row[h] || ''}"`).join(',')
        ).join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('xlsx', 'xls');
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // logger.error('Export failed:', err);
      // 降级：xls格式
      const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `种源管理_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">种源管理</h1>
              <p className="text-gray-500">管理种源批次、采购入库和库存记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <SeedSourceFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        cropCategories={cropCategories}
        suppliers={suppliers}
        statusOptions={seedSourceStatusOptions}
      />

      {/* 数据表格 */}
      <SeedSourceTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onImageClick={handleImageClick}
        onEnd={handleEnd}
        onAdd={handleAdd}
        operationMode={operationMode}
        onOperationModeChange={setOperationMode}
        exportMode={exportMode}
        onExportSelectAll={handleExportSelectAll}
        onExportCancel={handleExportCancel}
        onConfirmExport={handleExportClickConfirm}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onConfirmPrint={handlePrintConfirm}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={canExport}
        canPrint={canPrint}
        onPropagationRecord={handlePropagationRecord}
        onPropagationStage={handlePropagationStage}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setSeedSavingInit(null); }}
        onSuccess={() => { loadItems(); setSeedSavingInit(null); }}
        units={units}
        seedSavingInit={seedSavingInit}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
          suppliers={suppliers}
        />
      )}

      {currentRecord && (
        <DetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <PrintLabelModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          record={currentRecord}
        />
      )}

      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={currentImages}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        selectedCount={selectedRows.length}
      />

      {/* 繁殖途径弹窗 */}
      <PropagationRecordModal
        isOpen={propagationRecordOpen}
        onClose={() => setPropagationRecordOpen(false)}
        record={propagationRecord}
        onSuccess={loadItems}
      />

      <PropagationStageModal
        isOpen={propagationStageOpen}
        onClose={() => setPropagationStageOpen(false)}
        record={propagationRecord}
        onSuccess={loadItems}
      />
    </div>
  );
}
