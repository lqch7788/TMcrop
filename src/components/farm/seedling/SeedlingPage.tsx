/**
 * 育苗管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Printer, Eye, Image, X, Check, FileText, Shovel, Sprout } from 'lucide-react';
import { SeedlingFilter } from './components/SeedlingFilter';
import { SeedlingTable } from './components/SeedlingTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { DailyRecordModal } from './modals/DailyRecordModal';
import { TransplantModal } from './modals/TransplantModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import SeedlingLabelManageModal from './modals/SeedlingLabelManageModal';
import { useDictionaryStore, getDictItems, useSeedlingStore, useSeedSourceStore } from '../../../stores';
import { Seedling, SeedlingFilters, SeedlingStatus, SeedSource } from '../../../types/crop';
import * as cropVarietyService from '../../../services/cropVarietyService';
import * as cropBatchService from '../../../services/apiCropBatchService';
import { useAuthPermission } from '../../../hooks/usePermission';
import { showAlert, showConfirm } from '@/lib/dialogService';

export default function SeedlingPage() {
  const navigate = useNavigate();

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 育苗模块权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;
  const canPrint = true;

  // 字典数据
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

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

  // 从 Zustand Store 获取育苗数据
  const { items: seedlings, isLoading: loading, loadItems, deleteItem, deleteItems } = useSeedlingStore();
  // 种源数据（用于筛选和关联）
  const [seedSources, setSeedSources] = useState<SeedSource[]>([]);

  // 作物品种数据（从品种库服务获取）
  const cropVarietyOptions = useMemo(() => {
    cropVarietyService.initVarieties();
    return cropVarietyService.getVarietyOptions();
  }, []);

  // 用于页面筛选的作物品种选项（从品种库转换）
  const cropNames = useMemo(() => {
    return cropVarietyOptions.map(v => ({ value: v.value, label: v.label }));
  }, [cropVarietyOptions]);

  // 字典数据转换（使用 Zustand store 获取）
  // 育苗方式选项
  const seedlingTypes = useMemo(() => {
    const items = getDictItems('seedling_type').map(d => ({ value: d.dictCode, label: d.dictLabel }));
    // 去重：使用 value 作为唯一键
    const seen = new Set<string>();
    return items.filter(t => {
      if (seen.has(t.value)) return false;
      seen.add(t.value);
      return true;
    });
  }, [dictionaries]);

  // 场地选项
  const sites = useMemo(() => {
    const items = getDictItems('seedling_site').map(d => ({ value: d.dictCode, label: d.dictLabel }));
    // 去重
    const seen = new Set<string>();
    return items.filter(s => {
      if (seen.has(s.value)) return false;
      seen.add(s.value);
      return true;
    });
  }, [dictionaries]);

  // 育苗状态选项
  const seedlingStatusOptions = useMemo(() => {
    const items = getDictItems('seedling_status').map(d => ({ value: d.dictCode, label: d.dictLabel }));
    // 去重
    const seen = new Set<string>();
    return items.filter(s => {
      if (seen.has(s.value)) return false;
      seen.add(s.value);
      return true;
    });
  }, [dictionaries]);

  // 种植区域选项（用于定植操作）
  const areas = useMemo(() => {
    return getDictItems('planting_area').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  // 加载种源数据（通过 Store）
  useEffect(() => {
    const loadSeedSources = async () => {
      try {
        await useSeedSourceStore.getState().loadItems();
        setSeedSources(useSeedSourceStore.getState().items);
      } catch (error) {
        console.error('获取种源数据失败:', error);
      }
    };
    loadSeedSources();
  }, []);

  // 初始化数据（从 Store 加载）
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dailyRecordModalOpen, setDailyRecordModalOpen] = useState(false);
  const [transplantModalOpen, setTransplantModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [labelManageOpen, setLabelManageOpen] = useState(false);
  const [labelManageRecord, setLabelManageRecord] = useState<Seedling | null>(null);
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
      // 使用 startsWith 替代 includes，避免误匹配（如筛选"黄"会匹配到"黄瓜"和"黄番茄"）
      if (filters.cropName && filters.cropName !== '__all__' && !item.cropName.startsWith(filters.cropName)) return false;
      if (filters.seedlingCode && !item.seedlingCode.startsWith(filters.seedlingCode)) return false;
      if (filters.sourceCode && !item.sourceCode.startsWith(filters.sourceCode)) return false;
      if (filters.siteName && filters.siteName !== '__all__' && item.siteName !== filters.siteName) return false;
      if (filters.seedlingType && filters.seedlingType !== '__all__' && item.seedlingType !== filters.seedlingType) return false;
      if (filters.status && filters.status !== '__all__' && item.status !== filters.status) return false;
      if (filters.startDate && item.startDate < filters.startDate) return false;
      if (filters.endDate && item.startDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.startsWith(filters.createBy)) return false;
      // 更多筛选条件（新增）
      if (filters.initialCountMin !== undefined && item.initialCount < filters.initialCountMin) return false;
      if (filters.initialCountMax !== undefined && item.initialCount > filters.initialCountMax) return false;
      if (filters.survivalCountMin !== undefined && item.survivalCount < filters.survivalCountMin) return false;
      if (filters.survivalCountMax !== undefined && item.survivalCount > filters.survivalCountMax) return false;
      if (filters.lossCountMin !== undefined && item.lossCount < filters.lossCountMin) return false;
      if (filters.lossCountMax !== undefined && item.lossCount > filters.lossCountMax) return false;
      // 剩余数量 = initialCount - lossCount
      const surplus = item.initialCount - item.lossCount;
      if (filters.surplusMin !== undefined && surplus < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && surplus > filters.surplusMax) return false;
      if (filters.survivalRateMin !== undefined && item.survivalRate < filters.survivalRateMin) return false;
      if (filters.survivalRateMax !== undefined && item.survivalRate > filters.survivalRateMax) return false;
      if (filters.lossRateMin !== undefined && item.lossRate < filters.lossRateMin) return false;
      if (filters.lossRateMax !== undefined && item.lossRate > filters.lossRateMax) return false;
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

  const handleLabelManage = (record: Seedling) => {
    setLabelManageRecord(record);
    setLabelManageOpen(true);
  };

  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    const success = await deleteItems(ids);
    if (success) {
      setSelectedRows([]);
    }
  };

  // 处理结束计划
  const handleEnd = async (record: Seedling, endType: 'normal' | 'abnormal') => {
    // 检查是否有关联的生产计划
    const planCode = record.productionPlanCode;
    if (!planCode || planCode.trim() === '') {
      await showAlert('该育苗没有关联的生产计划，无法结束');
      return;
    }

    const batch = await cropBatchService.getCropBatchByCode(planCode);
    if (!batch) {
      await showAlert('未找到关联的生产计划 [' + planCode + ']，请检查生产计划是否存在');
      return;
    }

    if (batch.batchStatus === 'completed') {
      await showAlert('该生产计划已完成结束，不能重复结束');
      return;
    }

    const completionRate = cropBatchService.getCompletionRate(batch, record.survivalCount || 0);
    const isNormal = endType === 'normal';
    const confirmMsg = isNormal
      ? `确认正常结束此生产计划？\n\n入库完成比例：${Math.round(completionRate * 100)}%\n结束后禁止一切入库和补录操作`
      : `确认异常结束此生产计划？\n\n入库完成比例：${Math.round(completionRate * 100)}%\n结束后如需补录，需提交审核申请`;

    if (!await showConfirm(confirmMsg)) {
      return;
    }

    const result = await cropBatchService.endCropBatch(batch.id, endType);
    if (result) {
      await showAlert(isNormal ? '生产计划已正常结束' : '生产计划已异常结束');
      loadItems();
    } else {
      await showAlert('结束失败');
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
      status: '',
      // 更多筛选条件（新增）
      initialCountMin: undefined,
      initialCountMax: undefined,
      survivalCountMin: undefined,
      survivalCountMax: undefined,
      lossCountMin: undefined,
      lossCountMax: undefined,
      surplusMin: undefined,
      surplusMax: undefined,
      survivalRateMin: undefined,
      survivalRateMax: undefined,
      lossRateMin: undefined,
      lossRateMax: undefined
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
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 确认打印
  const handlePrintConfirm = (records: Seedling[]) => {
    if (records.length === 0) {
      showAlert('请先选择要打印的记录');
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

    // 导出表头（按规划完整字段）
    const headers = [
      '育苗批号', '作物编码', '关联种源', '作物名称', '作物品种',
      '育苗方式', '场地', '开始日期', '预计结束日期', '实际结束日期',
      '初始数量', '成苗数量', '已定植数量', '损耗数量', '剩余总数',
      '成苗率', '损耗率', '育苗结束', '状态', '品质等级',
      '创建人', '创建时间', '备注'
    ];

    // 计算剩余总数
    const getRemainingCount = (record: Seedling) => record.initialCount - record.lossCount;

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '育苗批号': record.seedlingCode,
      '作物编码': record.cropCode || '',
      '关联种源': record.sourceCode,
      '作物名称': record.cropName,
      '作物品种': record.cropVariety,
      '育苗方式': record.seedlingType || '',
      '场地': record.siteName,
      '开始日期': record.startDate,
      '预计结束日期': record.expectedEndDate || '',
      '实际结束日期': record.endDate || '',
      '初始数量': record.initialCount,
      '成苗数量': record.survivalCount,
      '已定植数量': record.plantedCount,
      '损耗数量': record.lossCount,
      '剩余总数': getRemainingCount(record),
      '成苗率': `${record.survivalRate}%`,
      '损耗率': `${record.lossRate}%`,
      '育苗结束': record.isFinished ? '是' : '否',
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
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">育苗管理</h1>
            <p className="text-gray-500">管理种苗培育、生长记录和移栽操作</p>
          </div>
        </div>
      </div>

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
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      )}
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
        onLabelManage={handleLabelManage}
        onDelete={handleDelete}
        onImageClick={handleImageClick}
        onEnd={handleEnd}
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
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={canExport}
        canPrint={canPrint}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadItems}
        seedSources={seedSources}
        cropVarietyOptions={cropVarietyOptions}
        seedlingTypes={seedlingTypes}
        sites={sites}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
          seedSources={seedSources}
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
          onSuccess={loadItems}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <TransplantModal
          isOpen={transplantModalOpen}
          onClose={() => setTransplantModalOpen(false)}
          onSuccess={loadItems}
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

      {labelManageRecord && (
        <SeedlingLabelManageModal
          isOpen={labelManageOpen}
          onClose={() => { setLabelManageOpen(false); setLabelManageRecord(null); }}
          seedlingId={labelManageRecord.id}
          seedlingCode={labelManageRecord.seedlingCode}
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
