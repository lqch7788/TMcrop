/**
 * 种植管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, Printer, Eye, Image, X, Check, TreePine, Tag, MoveRight, Calendar, AlertTriangle } from 'lucide-react';
import { PlantingStats } from './components/PlantingStats';
import { PlantingFilter } from './components/PlantingFilter';
import { PlantingTable } from './components/PlantingTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { HarvestRecordModal } from './modals/HarvestRecordModal';
import { RecordModal } from './modals/RecordModal';
import { DailyRecordModal } from './modals/DailyRecordModal';
import { UnifiedRowHarvestInboundModal } from '../inventory/UnifiedRowHarvestInboundModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { todayLocal } from '@/lib/dateUtils';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { useDictionaryStore, getDictItems, usePlantingStore, useToastStore } from '../../../stores';
// 2026-06-29：合并 onLabelDetail + onMark → onLabelManage（参考育苗管理 SeedlingTable）
import PlantingLabelManageModal from './modals/PlantingLabelManageModal';
import PlantingMoveModal from './modals/PlantingMoveModal';
import PlantingMoveRecordsModal from './modals/PlantingMoveRecordsModal';
import { Planting, PlantingFilters, PlantingStatus, SourceType } from '../../../types/crop';
// 2026-07-01 P2-8 修复：useAuthPermission 是死代码（已 hardcode 全部 true），删除
// 2026-06-09 删除警告弹窗（统一为 UI 库 DeleteConfirmModal，与技术方案一致）
import { DeleteConfirmModal } from '@/components/ui';
import { enhancedApiClient } from '../../../lib/apiClient';
import { showAlert, showConfirm } from '@/lib/dialogService';
import type { MovePlantingInputV2 } from '@/services/apiPlantingService';

export default function PlantingPage() {
  // 2026-06-29：扫码跳转 — 解析 URL ?labelNumber= 参数（参考 SeedlingPage）
  const [searchParams] = useSearchParams();

  // 权限检查 - 已取消，所有人可使用所有功能
  // 2026-07-01 P2-8 修复：原 useAuthPermission hook 是死代码（已 hardcode 全部 true），删除
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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 从 Zustand Store 获取种植数据
  const { items: plantings, isLoading: loading, error, clearError, loadItems, deleteItem, deleteItems, updateItem } = usePlantingStore();
  // 2026-06-06: 监听 store 错误并弹 Toast
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // 2026-06-29：移除 usePlantLabelStore 调用 — 新 PlantingLabelManageModal 内部自带 store 调用
  // （旧 markModal/labelDetailModal 路径已删除；planting page 不再预加载标签列表）

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

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载种植数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  // V2 改造 (任务 16): 种植结束弹窗状态 (5 种结束方式 + 4 层嵌套)
  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  // 2026-06-19: 行级采收入库弹窗状态（unify-harvest-inbound-into-source-operations）
  const [inboundUnifiedOpen, setInboundUnifiedOpen] = useState(false);
  const [inboundUnifiedRecord, setInboundUnifiedRecord] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Planting | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 2026-06-25 v3: 育种/留种记录弹窗状态
  const [recordModal, setRecordModal] = useState<{
    open: boolean;
    recordType: 'breeding' | 'seed_saving';
    record: Planting | null;
  }>({ open: false, recordType: 'breeding', record: null });
  const handleBreedingRecord = (record: Planting) => {
    setRecordModal({ open: true, recordType: 'breeding', record });
  };
  const handleSeedSavingRecord = (record: Planting) => {
    setRecordModal({ open: true, recordType: 'seed_saving', record });
  };
  // 2026-06-28: 每日记录弹窗状态
  const [dailyRecordModal, setDailyRecordModal] = useState<{
    open: boolean;
    record: Planting | null;
  }>({ open: false, record: null });
  const handleDailyRecord = (record: Planting) => {
    setDailyRecordModal({ open: true, record });
  };
  const closeDailyRecord = () => {
    setDailyRecordModal({ open: false, record: null });
  };
  const handleDailyRecordSuccess = () => {
    closeDailyRecord();
    // Store action 内部已 await loadItems()，列表会实时刷新
  };
  const closeRecordModal = () => {
    setRecordModal({ open: false, recordType: 'breeding', record: null });
  };

  // 2026-06-29：标签管理弹窗状态（合并原 labelDetailOpen + markModalOpen）
  const [labelManageOpen, setLabelManageOpen] = useState(false);
  // 标签管理弹窗用：只存 id+code 即可，避免 Planting 全量 state 引起不必要的 re-render
  const [labelManageRecord, setLabelManageRecord] = useState<{ id: string; plantCode: string } | null>(null);
  // 2026-06-29：扫码跳转 — 自动选中指定 labelNumber
  const [autoSelectLabelNumber, setAutoSelectLabelNumber] = useState<string | undefined>(undefined);
  // 移入/移出弹窗状态（保留 — 种植特有全批级操作）
  const [moveModalOpen, setMoveModalOpen] = useState(false);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);
  // 2026-06-09 删除警告弹窗
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handlePrint = (record: Planting) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  // V2 改造 (任务 16): 触发种植结束弹窗
  const handleEndV2 = (record: Planting) => {
    // 2026-06-30 Bug 11 修复：实时从 store 取最新 record
    // 原因：setCurrentRecord 用传入的 record 是 stale 快照（store items 后续会被
    //       行级采收入库 onSuccess=loadItems 刷新，但 currentRecord 不会自动同步），
    //       导致 HarvestRecordModal 里的 harvestToInventoryQty 永远是打开时的旧值（显示 0）。
    // 限制：handleEdit / handleDetail / handleMove 有同样风险，但用户未报，按 Rule 3 不主动改
    const latest = usePlantingStore.getState().items.find((i) => i.id === record.id) || record;
    setCurrentRecord(latest);
    setHarvestModalOpen(true);
  };

  // 2026-07-01: 合并正常/异常结束 → 一个"结束"按钮 + 弹窗内勾选
  const [endConfirm, setEndConfirm] = useState<{ record: Planting | null; allowSupplemental: boolean }>({
    record: null, allowSupplemental: false,
  });

  const handleEnd = (record: Planting) => {
    if (record.endTime) {
      showAlert('该种植记录已结束，不能重复操作');
      return;
    }
    setEndConfirm({ record, allowSupplemental: false });
  };

  const executeEnd = async () => {
    const record = endConfirm.record;
    if (!record) return;
    const allowSupplemental = endConfirm.allowSupplemental;
    const endType = allowSupplemental ? 'abnormal' : 'normal';
    const endStatus = allowSupplemental ? PlantingStatus.CANCELLED : PlantingStatus.ENDED;

    setEndConfirm({ record: null, allowSupplemental: false });

    const result = await updateItem(record.id, {
      endType,
      endTime: todayLocal(),
      status: endStatus,
      isHarvestLocked: !allowSupplemental,
    } as Partial<Planting>);
    if (result) {
      await showAlert(allowSupplemental ? '种植记录已异常结束（保留补录通道）' : '种植记录已正常结束');
      await loadItems();
    } else {
      await showAlert('结束失败');
    }
  };

  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  // 2026-06-09 改造：单条删除入口仅弹 DeleteConfirmModal
  const handleDelete = useCallback((ids: string[]) => {
    setSelectedRows(ids);
    setShowDeleteModal(true);
  }, []);

  // 弹窗回调：引用检查 + 调 Store action 删除
  const handleDeleteConfirm = useCallback(async () => {
    const ids = [...selectedRows];
    if (ids.length === 0) return;
    setShowDeleteModal(false);
    // 1. 删除前检查标签履历关联
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
    // 2. 调 Store action 删除
    const success = await deleteItems(ids);
    if (success) {
      setSelectedRows([]);
    } else {
      await showAlert('删除失败，请重试。');
    }
  }, [selectedRows, deleteItems, showAlert, enhancedApiClient]);

  // 2026-06-29：标签管理（合并原 handleLabelDetail + handleMark）— 装载标签后打开新 PlantingLabelManageModal
  const handleLabelManage = (record: Planting) => {
    setLabelManageRecord({ id: record.id, plantCode: record.plantCode || '' });
    setAutoSelectLabelNumber(undefined);
    setLabelManageOpen(true);
  };

  // 移入/移出 - 打开弹窗（整批级别，不依赖标签）
  const handleMove = (record: Planting) => {
    setCurrentRecord(record);
    setMoveModalOpen(true);
  };

  // 2026-06-19: 移入/移出记录查看
  const [moveRecordsOpen, setMoveRecordsOpen] = useState(false)
  const handleViewMoveRecords = (record: Planting) => {
    setCurrentRecord(record)
    setMoveRecordsOpen(true)
  }

  // 2026-06-22: 弹窗内部已调 movePlantingV2；handleMoveSubmit 仅用于通知父组件刷新列表
  const handleMoveSubmit = async (_input: MovePlantingInputV2) => {
    await loadItems();
    return true;
  };

  // 2026-06-29：扫码跳转 — 解析 URL ?labelNumber= 参数（参考 SeedlingPage L173-208）
  // QR 码扫描后跳转到本页面 + 自动开标签管理弹窗 + 定位到指定标签
  useEffect(() => {
    const labelNumber = searchParams.get('labelNumber');
    if (!labelNumber) return;
    let cancelled = false;

    (async () => {
      try {
        const res: any = await enhancedApiClient.get(`/plant-labels/by-number/${encodeURIComponent(labelNumber)}`);
        // enhancedApiClient 已解包 data，兼容 {success, data} 和直接返回
        const payload = res?.data || res;
        const label = payload?.label || payload;
        if (!label || !label.plantingId) return;
        if (cancelled) return;

        // 从 labelNumber 提取 plantCode（格式：{plantCode}-{4位序号}）
        const parts = String(labelNumber).split('-');
        const plantCode = parts.length > 1 ? parts.slice(0, -1).join('-') : labelNumber;

        setLabelManageRecord({ id: String(label.plantingId), plantCode });
        setAutoSelectLabelNumber(labelNumber);
        setLabelManageOpen(true);

        // 清理 URL 参数，避免刷新重复打开
        const next = new URLSearchParams(searchParams);
        next.delete('labelNumber');
        const newUrl = next.toString()
          ? `${window.location.pathname}?${next.toString()}`
          : window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      } catch {
        // 扫码查询失败，静默处理
      }
    })();

    return () => { cancelled = true; };
  }, []); // 仅在 mount 时执行一次

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

    const fileName = `种植管理_${todayLocal()}.${extension}`;

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
        onEndV2={handleEndV2}
        onEnd={handleEnd}
        onInbound={(record) => {
          setInboundUnifiedRecord(record)
          setInboundUnifiedOpen(true)
        }}
        pagination={pagination}
        onChange={setPagination}
        onPageSizeChange={(pageSize) => setPagination(p => ({ ...p, pageSize }))}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onImageClick={handleImageClick}
        onAdd={() => setAddModalOpen(true)}
        onLabelManage={handleLabelManage}
        onMove={handleMove}
        onViewMoveRecords={handleViewMoveRecords}
        onBreedingRecord={handleBreedingRecord}
        onSeedSavingRecord={handleSeedSavingRecord}
        onDailyRecord={handleDailyRecord}
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
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <DetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
        />
      )}

      {/* V2 改造 (任务 16): 种植结束弹窗挂接 */}
      {currentRecord && (
        <HarvestRecordModal
          isOpen={harvestModalOpen}
          onClose={() => setHarvestModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
        />
      )}

      {/* 2026-07-01: 结束确认弹窗（合并正常/异常为一个按钮） */}
      {endConfirm.record && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 确认结束种植记录
              </h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-700"
                onClick={() => setEndConfirm({ record: null, allowSupplemental: false })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {!endConfirm.allowSupplemental ? (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-semibold text-red-800">⚠️ 正常结束 — 完成后将【锁定】</div>
                  <div className="text-xs text-red-700 mt-1">
                    结束后禁止一切后续操作：入库、补录、修改均不可用。<br />
                    <span className="font-semibold">此操作不可撤销！</span>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-sm font-semibold text-amber-800">异常结束 — 保留补录通道</div>
                  <div className="text-xs text-amber-700 mt-1">
                    结束后可继续补录入库。
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={endConfirm.allowSupplemental}
                  onChange={(e) => setEndConfirm({ ...endConfirm, allowSupplemental: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  保留补录通道（勾选后状态为"异常结束"，可继续补录操作）
                </span>
              </label>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm"
                onClick={() => setEndConfirm({ record: null, allowSupplemental: false })}>
                取消
              </Button>
              <Button variant="default" size="sm"
                onClick={executeEnd}
                className={endConfirm.allowSupplemental ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}>
                确认{endConfirm.allowSupplemental ? '异常' : '正常'}结束
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2026-06-19: 行级采收入库弹窗（unify-harvest-inbound-into-source-operations）
          2026-06-25 v3: 移除 stockType='seed' 路径 — 留种采收也入产品库存，后续由种源库手动调拨入种源 */}
      {inboundUnifiedRecord && (
        <UnifiedRowHarvestInboundModal
          key={inboundUnifiedRecord.id}  // 2026-06-30 Bug 修复：强制 sourceRecord 变化时重 mount，避免 useState 复用旧值
          isOpen={inboundUnifiedOpen}
          onClose={() => {
            setInboundUnifiedOpen(false)
            setInboundUnifiedRecord(null)
          }}
          onSuccess={loadItems}
          stockType="product"
          sourceModule="planting"
          sourceRecord={{
            id: inboundUnifiedRecord.id,
            code: inboundUnifiedRecord.plantingCode,
            cropName: inboundUnifiedRecord.cropName || '',
            cropVariety: inboundUnifiedRecord.cropVariety || '',
            cropCode: inboundUnifiedRecord.cropCode || '',
            unit: inboundUnifiedRecord.unit,
            plantingMode: inboundUnifiedRecord.plantingMode,
          }}
        />
      )}

      {/* 2026-06-25 v3: 育种/留种记录弹窗 */}
      {recordModal.record && (
        <RecordModal
          isOpen={recordModal.open}
          onClose={closeRecordModal}
          onSuccess={loadItems}
          recordType={recordModal.recordType}
          parentRecord={{
            id: recordModal.record.id,
            plantCode: recordModal.record.plantCode,
            cropName: recordModal.record.cropName,
          }}
        />
      )}

      {/* 2026-06-28: 种植管理每日记录弹窗（与育苗管理 DailyRecordModal 一致；单池简化版） */}
      {dailyRecordModal.record && (
        <DailyRecordModal
          isOpen={dailyRecordModal.open}
          onClose={closeDailyRecord}
          onSuccess={handleDailyRecordSuccess}
          record={dailyRecordModal.record}
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

      {/* 2026-06-29：种植标签管理弹窗（合并原 PlantingLabelDetailModal + PlantingMarkModal，参考 SeedlingLabelManageModal） */}
      {labelManageRecord && (
        <PlantingLabelManageModal
          isOpen={labelManageOpen}
          onClose={() => { setLabelManageOpen(false); setLabelManageRecord(null); setAutoSelectLabelNumber(undefined); }}
          plantingId={labelManageRecord.id}
          plantingCode={labelManageRecord.plantCode}
          autoSelectLabelNumber={autoSelectLabelNumber}
        />
      )}

      {/* 移入/移出弹窗（整批级别） */}
      {currentRecord && (
        <PlantingMoveModal
          isOpen={moveModalOpen}
          initialPlanting={currentRecord}
          availablePlantings={plantings}
          onClose={() => setMoveModalOpen(false)}
          onSubmit={handleMoveSubmit}
        />
      )}

      {/* 2026-06-19: 移入/移出记录弹窗 */}
      {currentRecord && (
        <PlantingMoveRecordsModal
          isOpen={moveRecordsOpen}
          onClose={() => setMoveRecordsOpen(false)}
          planting={currentRecord}
        />
      )}

      {/* 2026-06-09 删除警告弹窗（统一为 DeleteConfirmModal，与技术方案一致） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
