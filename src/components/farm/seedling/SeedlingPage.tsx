/**
 * 育苗管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit2, Trash2, Printer, Image, X, Sprout, Download, AlertTriangle } from 'lucide-react';
import { SeedlingFilter } from './components/SeedlingFilter';
import { SeedlingTable } from './components/SeedlingTable';
import { AddModal } from './modals/AddModal';
import { Button } from '@/components/ui';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { DailyRecordModal } from './modals/DailyRecordModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
// 2026-07-04：育苗无性繁殖记录弹窗（独立入口）
import { SeedlingPropagationModal } from './modals/SeedlingPropagationModal';
import { todayLocal } from '@/lib/dateUtils';
// 2026-07-10 P1-2：抽取筛选 Hook（与 useFilteredSeedSources 对齐）
import { useFilteredSeedlings } from '@/hooks/useFilteredSeedlings';
// 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
// 2026-07-10 P1-1：抽取公共导出函数
import { exportCsv, exportXlsx } from '@/services/exporters';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
// 2026-06-28 方案B：移除 RecordModal import — 繁殖记录已合并到每日记录弹窗
import SeedlingLabelManageModal from './modals/SeedlingLabelManageModal';
import { useDictionaryStore, getDictItems, useSeedlingStore, useSeedSourceStore, useToastStore } from '../../../stores';
import { Seedling, SeedlingFilters, SeedlingStatus, SeedSource } from '../../../types/crop';
import * as cropVarietyService from '../../../services/cropVarietyService';
import * as cropBatchService from '../../../services/apiCropBatchService';
// 2026-07-01 P2-8 修复：useAuthPermission 是死代码（已 hardcode 全部 true），删除
import { showAlert } from '@/lib/dialogService';
import { enhancedApiClient } from '@/lib/apiClient';
// 2026-06-09 删除警告弹窗（统一为 UI 库 DeleteConfirmModal，与技术方案一致）
import { DeleteConfirmModal } from '@/components/ui';
// 2026-07-09 v6：恢复 UnifiedRowHarvestInboundModal import（行级弹窗恢复，弹窗内"补录"按钮跳转）
import { UnifiedRowHarvestInboundModal } from '../inventory/UnifiedRowHarvestInboundModal';

export default function SeedlingPage() {
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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 从 Zustand Store 获取育苗数据
  const { items: seedlings, isLoading: loading, error, clearError, loadItems, deleteItem, deleteItems, updateItem } = useSeedlingStore();
  // 2026-06-06: 监听 store 错误并弹 Toast
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);
  // 种源数据（用于筛选和关联）
  const [seedSources, setSeedSources] = useState<SeedSource[]>([]);

  // 作物品种选项（从育苗记录中实际存在的品种提取，用于筛选）
  const cropNames = useMemo(() => {
    // 从育苗记录中提取不重复的作物品种
    const seen = new Set<string>();
    const uniqueCrops: Array<{ value: string; label: string }> = [];
    seedlings.forEach(item => {
      if (item.cropName && !seen.has(item.cropName)) {
        seen.add(item.cropName);
        uniqueCrops.push({ value: item.cropName, label: item.cropName });
      }
    });
    // 按名称排序
    uniqueCrops.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    return uniqueCrops;
  }, [seedlings]);

  // 作物品种数据（从品种库服务获取，供弹窗使用）
  const cropVarietyOptions = useMemo(() => cropVarietyService.getVarietyOptions(), []);

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

  // 育苗区域选项
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

  // 2026-07-04 v2：6 状态筛选项（与种植对齐，不用字典）
  const seedlingStatusOptions = useMemo(() => [
    { value: SeedlingStatus.SOWN, label: '已播种' },
    { value: SeedlingStatus.IN_PROGRESS, label: '生长中' },
    { value: SeedlingStatus.TRANSPLANT_READY, label: '待出圃' },
    { value: SeedlingStatus.COMPLETED, label: '已出圃' },
    { value: SeedlingStatus.CANCELLED, label: '已取消' },
    { value: SeedlingStatus.ABNORMAL, label: '异常结束' },
  ], []);

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
        // logger.error('获取种源数据失败:', error);
      }
    };
    loadSeedSources();
  }, []);

  // 初始化数据（从 Store 加载）
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载育苗数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // 2026-07-09 v5（方案 A 阶段一）：单态结束弹窗
  // 砍掉"异常结束"选项——补录不再是状态机的开关，而是采收记录的属性
  // 历史 endType='abnormal' 数据保留兼容（SeedlingTable 仍识别），但不再提供新建入口
  const [endConfirm, setEndConfirm] = useState<{ record: Seedling | null }>({
    record: null,
  });

  // 2026-06-23: 扫码跳转 — 解析 URL ?labelNumber= 参数，自动打开标签管理弹窗
  useEffect(() => {
    const labelNumber = searchParams.get('labelNumber');
    if (!labelNumber) return;
    let cancelled = false;

    (async () => {
      try {
        const res: any = await enhancedApiClient.get(`/plant-labels/by-number/${encodeURIComponent(labelNumber)}`);
        // 2026-07-10 P0-4 修复：去除 res?.data 二次解包（enhancedApiClient 已自动解包 data），保留 label 兼容
        const label = res?.label || res;
        if (!label || !label.seedlingId) return;
        if (cancelled) return;

        // 从 labelNumber 提取 seedlingCode（格式：{seedlingCode}-{4位序号}）
        const parts = String(labelNumber).split('-');
        const seedlingCode = parts.length > 1 ? parts.slice(0, -1).join('-') : labelNumber;

        setLabelManageRecord({ id: String(label.seedlingId), seedlingCode } as Seedling);
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

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [dailyRecordModalOpen, setDailyRecordModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  // 2026-07-04：育苗无性繁殖记录弹窗状态
  const [propagationModalOpen, setPropagationModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [labelManageOpen, setLabelManageOpen] = useState(false);
  const [labelManageRecord, setLabelManageRecord] = useState<Seedling | null>(null);
  const [autoSelectLabelNumber, setAutoSelectLabelNumber] = useState<string | undefined>(undefined);
  const [currentRecord, setCurrentRecord] = useState<Seedling | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);
  // 2026-06-09 删除警告弹窗
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 操作模式状态（用于查看详情、编辑、每日记录、打印、图片、删除等操作的统一流程，2026-06-25 移除 transplant 模式）
  const [operationMode, setOperationMode] = useState<'normal' | 'detail' | 'edit' | 'dailyRecord' | 'print' | 'image' | 'delete' | 'export'>('normal');

  // 打印模式状态
  const [printMode, setPrintMode] = useState(false);
  const [printRecords, setPrintRecords] = useState<Seedling[]>([]);

  // 2026-06-28 方案B：移除独立繁殖记录弹窗（已合并到每日记录弹窗的 🌱 繁殖事件 折叠面板）
  // 2026-07-09 v6：恢复 inboundModal 死 state（onInbound 改回弹窗）

  const [inboundModal, setInboundModal] = useState<{ open: boolean; record: Seedling | null }>({
    open: false,
    record: null,
  });

  // 2026-07-10 P1-2：抽到 useFilteredSeedlings Hook（与 useFilteredSeedSources 对齐）
  const filteredData = useFilteredSeedlings(seedlings, filters);

  // 2026-07-04 v2：6 状态统计（对齐种植）
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

  // 2026-07-04：打开无性繁殖记录弹窗
  const handlePropagation = (record: Seedling) => {
    setCurrentRecord(record);
    setPropagationModalOpen(true);
  };

  // 每日记录保存成功后刷新数据
  const handleDailyRecordSuccess = async () => {
    await loadItems();
    // 从最新 store 数据中找到对应的记录并更新 currentRecord
    if (currentRecord) {
      const updatedRecord = useSeedlingStore.getState().items.find(s => s.id === currentRecord.id);
      if (updatedRecord) {
        setCurrentRecord(updatedRecord);
      }
    }
  };

  const handlePrint = (record: Seedling) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  const handleLabelManage = (record: Seedling) => {
    setLabelManageRecord(record);
    setLabelManageOpen(true);
  };

  // 2026-07-09 v6：恢复 handleInbound 弹窗模式（用户要求：必须打开采收弹窗，弹窗内"补录"按钮跳转）
  const handleInbound = (record: Seedling) => {
    setInboundModal({ open: true, record });
  };

  // 2026-07-01 P0-5 修复：入库成功后立即刷新列表（与种植侧 onSuccess={loadItems} 对齐）
  // 原因：之前只弹 toast，列表的 harvestStockedCount 不刷新，要等下次进入页面才看到最新入库量
  const handleInboundSuccess = async () => {
    toast.success('入库成功');
    await loadItems();
  };

  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  // 2026-06-09 改造：单条删除入口仅弹 DeleteConfirmModal
  // 2026-06-12 修复：使用独立的 pendingDeleteIds 而非 selectedRows
  // 根因：SeedlingTable 的 executeOperation 在 onDelete 后立即 onSelectionChange([])，
  //       React 批处理后 selectedRows 被清空，弹窗回调里读到 [] 直接 return。
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const handleDelete = useCallback((ids: string[]) => {
    setPendingDeleteIds(ids);
    setShowDeleteModal(true);
  }, []);

  // 弹窗回调：真正调 Store action 删除
  const handleDeleteConfirm = useCallback(async () => {
    const ids = [...pendingDeleteIds];
    if (ids.length === 0) return;
    setShowDeleteModal(false);
    setPendingDeleteIds([]);
    const success = await deleteItems(ids);
    if (success) {
      setSelectedRows([]);
    }
  }, [pendingDeleteIds, deleteItems]);

  // 处理结束计划
  // 2026-07-09 v5（方案 A 阶段一）：单态结束 — 任何已结束都拦截
  const handleEnd = (record: Seedling) => {
    if (record.endTime) {
      showAlert('该育苗记录已结束，不能再次操作');
      return;
    }
    setEndConfirm({ record });
  };

  // 执行结束操作
  const executeEnd = async () => {
    const record = endConfirm.record;
    if (!record) return;
    // 2026-07-09 v5：单态结束 — 固定 endType='normal', isHarvestLocked=0（允许后续补录）
    const endType = 'normal' as const;
    const endStatus = SeedlingStatus.COMPLETED;
    const planCode = record.productionPlanCode;

    setEndConfirm({ record: null });

    // 保留无 planCode 时不联动生产计划的逻辑
    if (!planCode || planCode.trim() === '') {
      const result = await updateItem(record.id, { endType, endTime: todayLocal(), status: endStatus });
      if (result) {
        await showAlert('育苗记录已结束（仍可补录遗漏库存）');
        await loadItems();
      } else {
        await showAlert('结束失败');
      }
      return;
    }

    const batch = await cropBatchService.getCropBatchByCode(planCode);
    if (!batch) {
      const result = await updateItem(record.id, { endType, endTime: todayLocal(), status: endStatus });
      if (result) {
        await showAlert('育苗记录已结束（强结，仍可补录遗漏库存）');
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

    const result = await cropBatchService.endCropBatch(batch.id, endType);
    if (result) {
      await updateItem(record.id, { endType, endTime: todayLocal(), status: endStatus });
      await showAlert('生产计划已正常结束（育苗记录同步结束）');
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

    // 导出表头（按规划完整字段，2026-06-28：移除"已定植数量"列）
    const headers = [
      '育苗批号', '作物编码', '关联种源', '作物名称', '作物品种',
      '育苗方式', '育苗区域', '开始日期', '预计结束日期', '实际结束日期',
      '初始数量', '目标成苗率', '目标成苗数', '成活数量', '损耗数量', '现存数量',
      '完成比例', '损耗率', '育苗结束', '状态', '品质等级',
      '创建人', '创建时间', '备注'
    ];

    // 计算剩余总数 = 产出 - 损耗 - 采收入库（2026-06-28：移除已定植统计）
    const getRemainingCount = (record: Seedling) => Math.max(0,
      (record.expandedPlantCount || 0)
      - (record.seedlingLossCount || 0)
      - (record.harvestStockedCount || 0)
    );

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '育苗批号': record.seedlingCode,
      '作物编码': record.cropCode || '',
      '关联种源': record.sourceCode,
      '作物名称': record.cropName,
      '作物品种': record.cropVariety,
      '育苗方式': record.seedlingType || '',
      '育苗区域': record.siteName,
      '开始日期': record.startDate,
      '预计结束日期': record.expectedEndDate || '',
      '实际结束日期': record.endDate || '',
      '初始数量': record.initialCount,
      '目标成苗率': record.targetSurvivalRate != null ? `${record.targetSurvivalRate}%` : '-',
      '目标成苗数': record.targetSurvivalCount ?? '-',
      '成活数量': record.survivalCount,
      '损耗数量': record.lossCount,
      '现存数量': getRemainingCount(record),
      // 2026-06-28：完成比例 = (产出 - 损耗) / 目标（与 SeedlingTable 一致）
      '完成比例': record.targetSurvivalCount && record.targetSurvivalCount > 0 ? `${Math.round(Math.max(0, ((record.expandedPlantCount || 0) - (record.seedlingLossCount || 0))) / record.targetSurvivalCount * 100)}%` : '-',
      '损耗率': `${record.lossRate}%`,
      '育苗结束': record.isFinished ? '是' : '否',
      // 状态（2026-07-04 v2：6 态对齐种植）
      '状态': (() => {
        switch (record.status) {
          case 'sown': return '已播种';
          case 'in_progress': return '生长中';
          case 'transplant_ready': return '待出圃';
          case 'completed': return '已出圃';
          case 'cancelled': return '已取消';
          case 'abnormal': return '异常结束';
          default: return record.status || '-';
        }
      })(),
      '品质等级': record.qualityGrade || '',
      '创建人': record.createBy,
      '创建时间': record.createTime,
      '备注': record.remarks || ''
    }));

    // 创建内容
    let content = '';
    let mimeType = '';
    let extension = '';

    // 2026-07-10 P1-1：抽到底层公共函数（保留 showSaveFilePicker 支持在 exporters/shared.ts）
    const fileName = `育苗管理_${todayLocal()}.${exportFormat === 'csv' ? 'csv' : 'xls'}`;

    try {
      if (exportFormat === 'csv') {
        await exportCsv({ filename: fileName, headers, rows: exportData });
      } else {
        await exportXlsx({ filename: fileName, headers, rows: exportData });
      }
    } catch (err) {
      // 2026-07-10 P0-2：catch(e) + instanceof 守卫
      console.warn('[SeedlingPage] 导出失败，降级 Blob:', err instanceof Error ? err.message : String(err));
      // 降级到 Blob 下载（保留原有行为）
      const { serializeCsv, serializeHtmlTable } = await import('@/services/exporters');
      const content = exportFormat === 'csv' ? serializeCsv(headers, exportData) : serializeHtmlTable(headers, exportData);
      const blob = new Blob([content], { type: exportFormat === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel;charset=utf-8' });
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
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">育苗管理</h1>
              <p className="text-gray-500">管理种苗培育、生长记录和移栽操作</p>
            </div>
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
            {/* 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件 */}
            <LoadingSpinner withText />
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
        onPropagation={handlePropagation}
        // 2026-06-28 方案B：移除 onPropagationRecord 引用 — 繁殖记录已合并到每日记录
        onPrint={handlePrint}
        onLabelManage={handleLabelManage}
        onInbound={handleInbound}
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
          onSuccess={handleDailyRecordSuccess}
          record={currentRecord}
          // 2026-07-03：已结束的育苗 → 只读模式（保留查看+导出）
          // 2026-07-04 修复：补 cancelled 到只读判断
          readOnly={Boolean(
            currentRecord.status === 'completed' || currentRecord.status === 'abnormal' || currentRecord.status === 'cancelled' ||
            currentRecord.endType === 'normal' || currentRecord.endType === 'abnormal'
          )}
        />
      )}

      {/* 2026-07-04：育苗无性繁殖记录弹窗（独立入口） */}
      {currentRecord && (
        <SeedlingPropagationModal
          isOpen={propagationModalOpen}
          onClose={() => setPropagationModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
          // 已结束的育苗 → 只读模式（保留查看+导出）
          readOnly={Boolean(
            currentRecord.status === 'completed' || currentRecord.status === 'abnormal' ||
            currentRecord.endType === 'normal' || currentRecord.endType === 'abnormal'
          )}
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
          onClose={() => { setLabelManageOpen(false); setLabelManageRecord(null); setAutoSelectLabelNumber(undefined); }}
          seedlingId={labelManageRecord.id}
          seedlingCode={labelManageRecord.seedlingCode}
          autoSelectLabelNumber={autoSelectLabelNumber}
          // 2026-07-03：已结束的育苗 → 只读模式（保留查看+导出+打印）
          readOnly={Boolean(
            labelManageRecord.status === 'completed' || labelManageRecord.status === 'abnormal' ||
            labelManageRecord.endType === 'normal' || labelManageRecord.endType === 'abnormal'
          )}
        />
      )}

      {/* 2026-07-09 v6：恢复 UnifiedRowHarvestInboundModal 行级弹窗
          育苗行点"出圃入库" → 弹窗 → 弹窗内"补录"按钮跳转 AddStockModal
          必须打开采收弹窗，弹窗内"补录"按钮才能跳转（用户 v6 设计） */}
      {inboundModal.record && (
        <UnifiedRowHarvestInboundModal
          isOpen={inboundModal.open}
          onClose={() => setInboundModal({ open: false, record: null })}
          onSuccess={handleInboundSuccess}
          stockType="seedling"
          sourceModule="seedling"
          sourceRecord={{
            id: inboundModal.record.id,
            code: inboundModal.record.seedlingCode,
            cropName: inboundModal.record.cropName || '',
            cropVariety: inboundModal.record.cropVariety || '',
            cropCode: inboundModal.record.cropCode || '',
            unit: undefined,
            // 2026-07-09 v6：传 endTime/status 让弹窗显示"补录"按钮（仅已结束/已取消行）
            endTime: inboundModal.record.endTime,
            status: inboundModal.record.status,
          }}
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

      {/* 2026-06-09 删除警告弹窗（统一为 DeleteConfirmModal，与技术方案一致） */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        selectedCount={pendingDeleteIds.length}
        onClose={() => { setShowDeleteModal(false); setPendingDeleteIds([]); }}
        onConfirm={handleDeleteConfirm}
      />

      {/* 2026-07-09 v5（方案 A 阶段一）：单态结束弹窗（仅 1 个"结束"按钮）
          2026-07-09 v4 历史：二选一（正常结束/异常结束）— v5 已合并
          2026-07-04 v3 历史：三选一（正常结束/异常结束/直接取消）— v4 已合并 */}
      {endConfirm.record && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 确认结束育苗记录
              </h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-700"
                onClick={() => setEndConfirm({ record: null })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {/* 2026-07-09 v5（方案 A 阶段一）：单态提示框 */}
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-semibold text-red-800">⚠️ 结束育苗记录</div>
                <div className="text-xs text-red-700 mt-1">
                  结束后将锁定日常运维操作（移栽、出圃、修改等）。<br />
                  <span className="font-semibold">仍可补录遗漏的库存</span>（通过"出圃入库"按钮，必填补录原因）。<br />
                  <span className="font-semibold">此操作不可撤销！</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm"
                onClick={() => setEndConfirm({ record: null })}>
                取消
              </Button>
              <Button variant="default" size="sm"
                onClick={executeEnd}
                className="bg-red-600 hover:bg-red-700">
                确认结束
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
