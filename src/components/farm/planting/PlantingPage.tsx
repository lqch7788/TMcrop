/**
 * 种植管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, Printer, Eye, Image, X, Check, TreePine, Tag, MoveRight, Bookmark } from 'lucide-react';
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
import { useDictionaryStore, getDictItems, usePlantingStore, usePlantLabelStore } from '../../../stores';
import type { PlantLabel, PlantMark } from '../../../stores/usePlantLabelStore';
import PlantingLabelDetailModal from './modals/PlantingLabelDetailModal';
import PlantingMoveModal from './modals/PlantingMoveModal';
import PlantingMarkModal from './modals/PlantingMarkModal';
import { Planting, PlantingFilters, PlantingStatus, SourceType } from '../../../types/crop';
import * as cropBatchService from '../../../services/apiCropBatchService';
import { useAuthPermission } from '../../../hooks/usePermission';
import { enhancedApiClient } from '../../../lib/apiClient';
import { showAlert, showConfirm } from '@/lib/dialogService';

export default function PlantingPage() {
  const navigate = useNavigate();

  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 种植模块权限 - 已取消，直接设置为 true
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
  const [filters, setFilters] = useState<PlantingFilters>({
    cropName: '',
    plantCode: '',
    sourceCode: '',
    areaName: '',
    isHarvest: '',
    startDate: '',
    endDate: '',
    transplantDate: '',
    createBy: '',
    orgName: '',
    countMin: undefined,
    countMax: undefined,
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 从 Zustand Store 获取种植数据
  const { items: plantings, isLoading: loading, loadItems, deleteItem, deleteItems, updateItem } = usePlantingStore();

  // 从标签 Store 获取标签/标记数据
  const {
    labels: plantLabels, resumeMap, marks,
    loadLabels, loadMarks, loadResumesForLabels,
    submitMove, submitMark
  } = usePlantLabelStore();

  // 作物品种数据（从种植数据中提取唯一品种，而不是从品种库获取所有品种）
  const cropNames = useMemo(() => {
    // 从种植数据中提取所有唯一的作物名称
    const uniqueCropNames = [...new Set(plantings.map(item => item.cropName).filter(Boolean))];
    // 转换为下拉选项格式
    return uniqueCropNames
      .sort((a, b) => a.localeCompare(b)) // 按字母顺序排序
      .map(name => ({ value: name, label: name }));
  }, [plantings]);

  // 字典数据转换（使用 Zustand store 获取）
  // 种植区域选项
  const areas = useMemo(() => {
    return getDictItems('planting_area').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  // 来源类型选项
  const sourceTypeOptions = useMemo(() => {
    return getDictItems('source_type').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  // 种植状态选项
  const plantingStatusOptions = useMemo(() => {
    return getDictItems('planting_status').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [getDictItems]);

  // 初始化数据（从 Store 加载）
  useEffect(() => {
    loadItems();
    // loadItems 是稳定的 store 函数，不需要作为依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Planting | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 标签/标记/移动弹窗状态
  const [labelDetailOpen, setLabelDetailOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [currentLabelPlanting, setCurrentLabelPlanting] = useState<Planting | null>(null);

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
      // 方案3.3: 组织筛选 + 定植数量范围
      if (filters.orgName && !(item as any).orgName?.includes(filters.orgName)) return false;
      if (filters.countMin !== undefined && item.plantingCount < filters.countMin) return false;
      if (filters.countMax !== undefined && item.plantingCount > filters.countMax) return false;
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

  const handleDelete = async (ids: string[]) => {
    // 删除前检查标签履历关联
    for (const id of ids) {
      try {
        const res = await enhancedApiClient.get<{success: boolean; data: {deletable: boolean; labelCount: number}}>(`/plantings/${id}/check-deletable`);
        if (res.data && !res.data.deletable) {
          await showAlert(`种植记录已被 ${res.data.labelCount} 个标签引用，无法删除。\n请先清理标签关联后再删除。`);
          return;
        }
      } catch {
        // 检查失败不阻止删除（降级策略）
      }
    }
    const success = await deleteItems(ids);
    if (success) {
      setSelectedRows([]);
    } else {
      await showAlert('删除失败，请重试。');
    }
  };

  // 处理结束计划
  const handleEnd = async (record: Planting, endType: 'normal' | 'abnormal') => {
    if (!record.productionPlanCode) {
      await showAlert('该种植没有关联的生产计划，无法结束');
      return;
    }

    const batch = await cropBatchService.getCropBatchByCode(record.productionPlanCode);
    if (!batch) {
      // 2026-06-05: 强结分支 — 关联生产计划被删/查不到时引导用户强制结束
      const confirmed = await showConfirm(
        `未找到关联的生产计划 [${record.productionPlanCode}]，可能已被删除。\n` +
        `是否强制结束该种植记录？\n（结束后将解除生产计划关联，并记录结束标记）`
      );
      if (!confirmed) return;

      // 走 Store action（V2.1 铁律：写持久化数据走 Store）
      const isNormal = endType === 'normal';
      const result = await updateItem(record.id, {
        endType,
        endTime: new Date().toISOString(),
        productionPlanCode: null as unknown as string, // 清空关联（解幽灵引用）
      });
      if (result) {
        await showAlert(isNormal ? '种植记录已正常结束（强结）' : '种植记录已异常结束（强结）');
        await loadItems();
      } else {
        await showAlert('强结失败');
      }
      return;
    }

    if (batch.batchStatus === 'completed') {
      await showAlert('该生产计划已完成结束，不能重复结束');
      return;
    }

    const completionRate = cropBatchService.getCompletionRate(batch, record.harvestQuantity || 0);
    const isNormal = endType === 'normal';
    const confirmMsg = isNormal
      ? `确认正常结束此生产计划？\n\n采收完成比例：${Math.round(completionRate * 100)}%\n结束后禁止一切入库和补录操作`
      : `确认异常结束此生产计划？\n\n采收完成比例：${Math.round(completionRate * 100)}%\n结束后如需补录，需提交审核申请`;

    if (!await showConfirm(confirmMsg)) {
      return;
    }

    const result = await cropBatchService.endCropBatch(batch.id, endType);
    if (result) {
      await showAlert(isNormal ? '生产计划已正常结束' : '生产计划已异常结束');
      window.location.reload();
    } else {
      await showAlert('结束失败');
    }
  };

  // 标签详情 - 加载该种植的标签并打开弹窗
  const handleLabelDetail = async (record: Planting) => {
    setCurrentLabelPlanting(record);
    await loadLabels(record.id);
    // 从 store 读取最新状态（避免闭包陷阱）
    const freshLabels = usePlantLabelStore.getState().labels;
    const labelIds = freshLabels.map(l => l.id);
    if (labelIds.length > 0) {
      await loadResumesForLabels(labelIds);
    }
    setLabelDetailOpen(true);
  };

  // 移入/移出 - 打开弹窗
  const handleMove = (record: Planting) => {
    setCurrentRecord(record);
    setMoveModalOpen(true);
  };

  // 标记管理 - 加载标签和标记后打开弹窗
  const handleMark = async (record: Planting) => {
    setCurrentLabelPlanting(record);
    await loadLabels(record.id);
    await loadMarks();
    setMarkModalOpen(true);
  };

  // 留种操作 - 跳转到种源管理页面，自动打开留种弹窗
  const handleSeedSaving = (record: Planting) => {
    const params = new URLSearchParams({
      action: 'seed-saving',
      plantingId: record.id,
      plantingCode: record.plantingCode || '',
      cropName: record.cropName || '',
    });
    navigate(`/farm/seed-source?${params.toString()}`);
  };

  const handleMoveSubmit = async (data: { operationType: 'move_in' | 'move_out'; labelNumber: string; targetArea: string; operationDate: string; remarks: string }) => {
    // 从 store 读取最新标签列表（避免闭包陷阱）
    const freshLabels = usePlantLabelStore.getState().labels;
    const label = freshLabels.find(l => l.label_number === data.labelNumber);
    if (!label) {
      await showAlert('未找到对应标签，请检查标签编号');
      return false;
    }
    const ok = await submitMove(label.id, data);
    if (ok) {
      await showAlert('移动操作成功');
    } else {
      await showAlert('移动操作失败');
    }
    return ok;
  };

  const handleMarkSubmit = async (markId: number, labelIds: number[]) => {
    const ok = await submitMark(markId, labelIds);
    if (ok) {
      await showAlert('标记分配成功');
    } else {
      await showAlert('标记分配失败');
    }
    return ok;
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
      createBy: '',
      orgName: '',
      countMin: undefined,
      countMax: undefined,
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
  const handlePrintConfirm = (records: Planting[]) => {
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
    } else if (exportFormat === 'word') {
      content = `<html><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #4a90d9; color: white; }</style></head><body><table border="1"><tr>${headers.map(h => `<th style="background-color: #4a90d9; color: white;">${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'docx';
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

  return (
    <div className="space-y-6">
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      )}
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
        onEnd={handleEnd}
        onAdd={() => setAddModalOpen(true)}
        onLabelDetail={handleLabelDetail}
        onMove={handleMove}
        onMark={handleMark}
        onSeedSaving={handleSeedSaving}
        operationMode={operationMode}
        onOperationModeChange={setOperationMode}
        exportMode={exportMode}
        onExportClick={handleExportClick}
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
        cropNames={cropNames}
        areas={areas}
        sourceTypeOptions={sourceTypeOptions}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
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
          onSuccess={loadItems}
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

      {/* 标签详情弹窗 */}
      <PlantingLabelDetailModal
        isOpen={labelDetailOpen}
        onClose={() => setLabelDetailOpen(false)}
        labels={plantLabels.map(l => ({
          id: l.id,
          labelNumber: l.label_number,
          plantingId: parseInt(l.planting_id, 10) || 0,
          moveInAreaName: l.move_in_area_name || '',
          moveInDate: l.move_in_date || '',
          moveOutAreaName: l.move_out_area_name || '',
          moveOutDate: l.move_out_date || '',
        }))}
        resumeMap={resumeMap}
      />

      {/* 移入/移出弹窗 */}
      {currentRecord && (
        <PlantingMoveModal
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          areaOptions={areas}
          isHarvested={currentRecord.isHarvest}
          onSubmit={handleMoveSubmit}
        />
      )}

      {/* 标记管理弹窗 */}
      <PlantingMarkModal
        isOpen={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        marks={marks.map(m => ({
          id: m.id,
          name: m.name,
          color: m.color,
          icon: m.icon,
          parentId: m.parent_id,
          markAid: m.mark_aid,
          isUse: m.is_use,
          sortOrder: m.sort_order,
        }))}
        labels={plantLabels.map(l => ({
          id: l.id,
          labelNumber: l.label_number,
        }))}
        onSubmit={handleMarkSubmit}
      />
    </div>
  );
}
