/**
 * 种植管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, Printer, Eye, Image, X, Check, TreePine } from 'lucide-react';
import { PlantingStats } from './components/PlantingStats';
import { PlantingFilter } from './components/PlantingFilter';
import { PlantingTable } from './components/PlantingTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { HarvestModal } from './modals/HarvestModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import {
  areas,
  sourceTypeOptions,
  plantingStatusOptions
} from '../../../data/cropData';
import { Planting, PlantingFilters, PlantingStatus, SourceType } from '../../../types/crop';
import * as plantingService from '../../../services/plantingService';
import * as cropVarietyService from '../../../services/cropVarietyService';

export default function PlantingPage() {
  const navigate = useNavigate();

  // 产品编码生成器状态
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [filters, setFilters] = useState<PlantingFilters>({
    cropName: '',
    plantCode: '',
    sourceCode: '',
    areaName: '',
    isHarvest: '',
    startDate: '',
    endDate: '',
    transplantDate: '',
    createBy: ''
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 从localStorage加载数据
  const [plantings, setPlantings] = useState<Planting[]>(() =>
    plantingService.initPlantings()
  );

  // 作物品种数据（从品种库服务获取）
  const cropVarietyOptions = useMemo(() => {
    cropVarietyService.initVarieties();
    return cropVarietyService.getVarietyOptions();
  }, []);

  // 将品种库选项转换为旧格式以兼容现有组件（仅用于页面筛选）
  const cropNames = cropVarietyOptions.map(v => ({ value: v.value, label: v.label }));
  const cropVarieties = cropVarietyOptions.map(v => ({ value: v.varietyCode, label: v.label }));

  // 刷新数据
  const refreshData = useCallback(() => {
    setPlantings(plantingService.getPlantings());
    setRefreshKey(k => k + 1);
  }, []);

  // 初始化数据
  useEffect(() => {
    refreshData();
  }, [refreshKey]);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Planting | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);

  // 操作模式状态（用于查看详情、编辑、采收登记、打印、图片、删除等操作的统一流程）
  const [operationMode, setOperationMode] = useState<'normal' | 'detail' | 'edit' | 'harvest' | 'print' | 'image' | 'delete' | 'export'>('normal');

  // 打印模式状态
  const [printMode, setPrintMode] = useState(false);
  const [printRecords, setPrintRecords] = useState<Planting[]>([]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return plantings.filter(item => {
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      if (filters.plantCode && !item.plantCode.includes(filters.plantCode)) return false;
      if (filters.sourceCode && !item.sourceCode.includes(filters.sourceCode)) return false;
      if (filters.areaName && !item.areaName.includes(filters.areaName)) return false;
      if (filters.isHarvest && String(item.isHarvest) !== filters.isHarvest) return false;
      if (filters.startDate && item.plantingDate < filters.startDate) return false;
      if (filters.endDate && item.plantingDate > filters.endDate) return false;
      if (filters.transplantDate && item.transplantDate !== filters.transplantDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      return true;
    });
  }, [plantings, filters]);

  // 统计卡片数据
  const statsData = useMemo(() => {
    const total = plantings.length;
    const growing = plantings.filter(p => p.status === PlantingStatus.PLANTED || p.status === PlantingStatus.GROWING).length;
    const harvested = plantings.filter(p => p.status === PlantingStatus.HARVESTED).length;
    const monthCount = plantings.filter(p => {
      const date = new Date(p.createTime);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total, growing, harvested, monthCount };
  }, [plantings]);

  // 处理操作
  const handleEdit = (record: Planting) => {
    setCurrentRecord(record);
    setEditModalOpen(true);
  };

  const handleDetail = (record: Planting) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  const handleHarvest = (record: Planting) => {
    setCurrentRecord(record);
    setHarvestModalOpen(true);
  };

  const handlePrint = (record: Planting) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  const handleDelete = (ids: string[]) => {
    if (confirm(`确定要删除选中的 ${ids.length} 条记录吗？`)) {
      plantingService.deletePlantings(ids);
      refreshData();
      setSelectedRows([]);
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    setFilters({
      cropName: '',
      plantCode: '',
      sourceCode: '',
      areaName: '',
      isHarvest: '',
      startDate: '',
      endDate: '',
      transplantDate: '',
      createBy: ''
    });
    setPagination({ ...pagination, current: 1 });
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
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 确认打印
  const handlePrintConfirm = (records: Planting[]) => {
    if (records.length === 0) {
      alert('请先选择要打印的记录');
      return;
    }
    setPrintRecords(records);
    if (records.length === 1) {
      // 单条记录直接打印
      setCurrentRecord(records[0]);
      setPrintModalOpen(true);
    } else {
      // 多条记录打开打印弹窗选择
      setPrintModalOpen(true);
    }
    setPrintMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = async () => {
    // 获取选中的数据
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头
    const headers = ['种植批号', '来源类型', '来源批号', '作物品种', '品种', '种植区域', '大棚名称', '种植数量', '种植日期', '土壤PH', '土壤EC', '移栽数量', '移栽日期', '是否采收', '采收日期', '损耗率', '溯源码', '状态', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '种植批号': record.plantCode,
      '来源类型': record.sourceType === SourceType.SEED ? '种子' : '种苗',
      '来源批号': record.sourceCode,
      '作物品种': record.cropName,
      '品种': record.cropVariety,
      '种植区域': record.areaName,
      '大棚名称': record.rootName,
      '种植数量': record.plantingCount,
      '种植日期': record.plantingDate,
      '土壤PH': record.soilPH || '',
      '土壤EC': record.soilEC || '',
      '移栽数量': record.transplantCount || '',
      '移栽日期': record.transplantDate || '',
      '是否采收': record.isHarvest ? '是' : '否',
      '采收日期': record.harvestDate || '',
      '损耗率': `${record.attritionRate}%`,
      '溯源码': record.traceabilityCode,
      '状态': record.status === PlantingStatus.PLANTED ? '已定植' : record.status === PlantingStatus.GROWING ? '生长期' : record.status === PlantingStatus.HARVESTED ? '已采收' : '已取消',
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

    const fileName = `种植管理_${new Date().toISOString().slice(0, 10)}.${extension}`;

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

  return (
    <div className="p-6 space-y-4">
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">种植管理</h1>
            <p className="text-gray-500">管理种植批次、生产计划和技术方案</p>
          </div>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <PlantingFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        cropNames={cropNames}
        areas={areas}
        statusOptions={plantingStatusOptions}
      />

      {/* 数据表格 */}
      <PlantingTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        onPageSizeChange={(pageSize) => setPagination(p => ({ ...p, pageSize }))}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onHarvest={handleHarvest}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onImageClick={handleImageClick}
        onAdd={() => setAddModalOpen(true)}
        operationMode={operationMode}
        onOperationModeChange={setOperationMode}
        exportMode={exportMode}
        onExportSelectAll={handleExportSelectAll}
        onExportCancel={handleExportCancel}
        onConfirmExport={handleExportClickConfirm}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onConfirmPrint={handlePrintConfirm}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={refreshData}
        cropNames={cropNames}
        cropVarieties={cropVarieties}
        areas={areas}
        sourceTypeOptions={sourceTypeOptions}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          record={currentRecord}
          cropVarietyOptions={cropVarietyOptions}
          areas={areas}
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
        <HarvestModal
          isOpen={harvestModalOpen}
          onClose={() => setHarvestModalOpen(false)}
          onSuccess={refreshData}
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
    </div>
  );
}
