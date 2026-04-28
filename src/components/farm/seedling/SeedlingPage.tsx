/**
 * 育苗管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, Printer, Eye, Image, X, Check, FileText, Shovel } from 'lucide-react';
import { SeedlingStats } from './components/SeedlingStats';
import { SeedlingFilter } from './components/SeedlingFilter';
import { SeedlingTable } from './components/SeedlingTable';
import { CodeToolbar } from '../common/CodeToolbar';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { DailyRecordModal } from './modals/DailyRecordModal';
import { TransplantModal } from './modals/TransplantModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import ProduceCodeGenerator from '../common/ProduceCodeGenerator';
import {
  seedlingTypes,
  sites,
  seedlingStatusOptions,
  areas
} from '../../../data/cropData';
import { Seedling, SeedlingFilters, SeedlingStatus } from '../../../types/crop';
import * as seedlingService from '../../../services/seedlingService';
import * as seedSourceService from '../../../services/seedSourceService';
import * as cropVarietyService from '../../../services/cropVarietyService';

export default function SeedlingPage() {
  const navigate = useNavigate();

  // 产品编码生成器状态
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [filters, setFilters] = useState<SeedlingFilters>({
    cropName: '',
    seedlingCode: '',
    sourceCode: '',
    startDate: '',
    endDate: '',
    siteName: '',
    seedlingType: '',
    createBy: '',
    status: ''
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 从localStorage加载数据
  const [seedlings, setSeedlings] = useState<Seedling[]>(() =>
    seedlingService.initSeedlings()
  );

  // 作物品种数据（从品种库服务获取）
  const cropVarietyOptions = useMemo(() => {
    cropVarietyService.initVarieties();
    return cropVarietyService.getVarietyOptions();
  }, []);

  // 用于页面筛选的作物品种选项（从品种库转换）
  const cropNames = useMemo(() => {
    return cropVarietyOptions.map(v => ({ value: v.value, label: v.label }));
  }, [cropVarietyOptions]);

  // 刷新数据
  const refreshData = useCallback(() => {
    setSeedlings(seedlingService.getSeedlings());
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
  const [dailyRecordModalOpen, setDailyRecordModalOpen] = useState(false);
  const [transplantModalOpen, setTransplantModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Seedling | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);

  // 操作模式状态（用于查看详情、编辑、每日记录、定植操作、打印、图片、删除等操作的统一流程）
  const [operationMode, setOperationMode] = useState<'normal' | 'detail' | 'edit' | 'dailyRecord' | 'transplant' | 'print' | 'image' | 'delete' | 'export'>('normal');

  // 打印模式状态
  const [printMode, setPrintMode] = useState(false);
  const [printRecords, setPrintRecords] = useState<Seedling[]>([]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return seedlings.filter(item => {
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      if (filters.seedlingCode && !item.seedlingCode.includes(filters.seedlingCode)) return false;
      if (filters.sourceCode && !item.sourceCode.includes(filters.sourceCode)) return false;
      if (filters.siteName && item.siteName !== filters.siteName) return false;
      if (filters.seedlingType && item.seedlingType !== filters.seedlingType) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.startDate && item.startDate < filters.startDate) return false;
      if (filters.endDate && item.startDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      return true;
    });
  }, [seedlings, filters]);

  // 统计卡片数据
  const statsData = useMemo(() => {
    const total = seedlings.length;
    const inProgress = seedlings.filter(s => s.status === SeedlingStatus.IN_PROGRESS).length;
    const completed = seedlings.filter(s => s.status === SeedlingStatus.COMPLETED).length;
    const monthCount = seedlings.filter(s => {
      const date = new Date(s.createTime);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total, inProgress, completed, monthCount };
  }, [seedlings]);

  // 处理操作
  const handleEdit = (record: Seedling) => {
    setCurrentRecord(record);
    setEditModalOpen(true);
  };

  const handleDetail = (record: Seedling) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  const handleDailyRecord = (record: Seedling) => {
    setCurrentRecord(record);
    setDailyRecordModalOpen(true);
  };

  const handleTransplant = (record: Seedling) => {
    setCurrentRecord(record);
    setTransplantModalOpen(true);
  };

  const handlePrint = (record: Seedling) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  const handleDelete = (ids: string[]) => {
    if (confirm(`确定要删除选中的 ${ids.length} 条记录吗？`)) {
      seedlingService.deleteSeedlings(ids);
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
      seedlingCode: '',
      sourceCode: '',
      startDate: '',
      endDate: '',
      siteName: '',
      seedlingType: '',
      createBy: '',
      status: ''
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
  const handlePrintConfirm = (records: Seedling[]) => {
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
    const headers = ['育苗批号', '关联种源', '作物品种', '品种', '育苗方式', '场地', '开始日期', '预计结束日期', '实际结束日期', '初始数量', '成活数量', '已定植数量', '成苗率', '损耗数量', '损耗率', '状态', '品质等级', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '育苗批号': record.seedlingCode,
      '关联种源': record.sourceCode,
      '作物品种': record.cropName,
      '品种': record.cropVariety,
      '育苗方式': record.seedlingType,
      '场地': record.siteName,
      '开始日期': record.startDate,
      '预计结束日期': record.expectedEndDate || '',
      '实际结束日期': record.endDate || '',
      '初始数量': record.initialCount,
      '成活数量': record.survivalCount,
      '已定植数量': record.plantedCount,
      '成苗率': `${record.survivalRate}%`,
      '损耗数量': record.lossCount,
      '损耗率': `${record.lossRate}%`,
      '状态': record.status === SeedlingStatus.IN_PROGRESS ? '进行中' : record.status === SeedlingStatus.TRANSPLANT_READY ? '待定植' : record.status === SeedlingStatus.COMPLETED ? '已完成' : '异常',
      '品质等级': record.qualityGrade || '',
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

    const fileName = `育苗管理_${new Date().toISOString().slice(0, 10)}.${extension}`;

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
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">育苗管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增
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
      <CodeToolbar
        codeGenExpanded={codeGenExpanded}
        onCodeGenToggle={() => setCodeGenExpanded(!codeGenExpanded)}
        onCodeRuleClick={() => navigate('/produce-code-rule')}
      />

      {/* 产品编码生成器 */}
      <ProduceCodeGenerator codeGenExpanded={codeGenExpanded} />

      {/* 统计卡片 */}
      <SeedlingStats data={statsData} />

      {/* 筛选工具栏 */}
      <SeedlingFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        cropNames={cropNames}
        seedlingTypes={seedlingTypes}
        sites={sites}
        statusOptions={seedlingStatusOptions}
      />

      {/* 数据表格 */}
      <SeedlingTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onDailyRecord={handleDailyRecord}
        onTransplant={handleTransplant}
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
        seedSources={seedSourceService.getSeedSources()}
        cropVarietyOptions={cropVarietyOptions}
        seedlingTypes={seedlingTypes}
        sites={sites}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={refreshData}
          record={currentRecord}
          seedSources={seedSourceService.getSeedSources()}
          cropVarietyOptions={cropVarietyOptions}
          seedlingTypes={seedlingTypes}
          sites={sites}
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
        <DailyRecordModal
          isOpen={dailyRecordModalOpen}
          onClose={() => setDailyRecordModalOpen(false)}
          onSuccess={refreshData}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <TransplantModal
          isOpen={transplantModalOpen}
          onClose={() => setTransplantModalOpen(false)}
          onSuccess={refreshData}
          record={currentRecord}
          areas={areas}
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
