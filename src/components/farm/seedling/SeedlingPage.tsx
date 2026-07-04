/**
 * 育苗管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Edit2, Trash2, Printer, Eye, Image, X, Check, FileText, Shovel, Sprout, Download, ChevronDown, AlertTriangle } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
// 2026-06-28 方案B：移除 RecordModal import — 繁殖记录已合并到每日记录弹窗
import SeedlingLabelManageModal from './modals/SeedlingLabelManageModal';
import { useDictionaryStore, getDictItems, useSeedlingStore, useSeedSourceStore, useToastStore } from '../../../stores';
import { Seedling, SeedlingFilters, SeedlingStatus, SeedSource } from '../../../types/crop';
import * as cropVarietyService from '../../../services/cropVarietyService';
import * as cropBatchService from '../../../services/apiCropBatchService';
// 2026-07-01 P2-8 修复：useAuthPermission 是死代码（已 hardcode 全部 true），删除
import { showAlert, showConfirm } from '@/lib/dialogService';
import { enhancedApiClient } from '@/lib/apiClient';
// 2026-06-09 删除警告弹窗（统一为 UI 库 DeleteConfirmModal，与技术方案一致）
import { DeleteConfirmModal } from '@/components/ui';
import { UnifiedRowHarvestInboundModal } from '../inventory/UnifiedRowHarvestInboundModal';

export default function SeedlingPage() {
  const navigate = useNavigate();
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
    { value: SeedlingStatus.ABNORMAL, label: '异常' },
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

  // 2026-07-04 v3: 结束确认弹窗 — 三选一（正常结束 / 异常结束 / 直接取消）
  const [endConfirm, setEndConfirm] = useState<{ record: Seedling | null; endType: 'normal' | 'abnormal' | 'cancelled' }>({
    record: null, endType: 'normal',
  });

  // 2026-06-23: 扫码跳转 — 解析 URL ?labelNumber= 参数，自动打开标签管理弹窗
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

  // 2026-06-18: 任务 5 — 出圃入库弹窗状态 + 入库记录子表数据
  // 2026-06-28 方案B：移除独立繁殖记录弹窗（已合并到每日记录弹窗的 🌱 繁殖事件 折叠面板）

  const [inboundModal, setInboundModal] = useState<{ open: boolean; record: Seedling | null }>({
    open: false,
    record: null,
  });

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return seedlings.filter(item => {
      // 2026-07-01 P1-2 修复：cropName 筛选统一用 includes，与 PlantingPage 一致
      // 原因：startsWith 要求前缀匹配，但 cropName 可能是 subVariety1Name（如"红树莓"），
      //       而筛选下拉显示父类（如"树莓"）时 startsWith 会过滤掉
      if (filters.cropName && filters.cropName !== '__all__' && !item.cropName.includes(filters.cropName)) return false;
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
      // 现存数量 = 小苗剩余 = 产出 - 损耗 - 采收入库（2026-06-28：彻底移除已定植统计）
      const surplus = Math.max(0,
        (item.expandedPlantCount || 0)
        - (item.seedlingLossCount || 0)
        - (item.harvestStockedCount || 0)
      );
      if (filters.surplusMin !== undefined && surplus < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && surplus > filters.surplusMax) return false;
      if (filters.survivalRateMin !== undefined && item.survivalRate < filters.survivalRateMin) return false;
      if (filters.survivalRateMax !== undefined && item.survivalRate > filters.survivalRateMax) return false;
      if (filters.lossRateMin !== undefined && item.lossRate < filters.lossRateMin) return false;
      if (filters.lossRateMax !== undefined && item.lossRate > filters.lossRateMax) return false;
      return true;
    });
  }, [seedlings, filters]);

  // 2026-07-04 v2：6 状态统计（对齐种植）
  const statsData = useMemo(() => {
    const total = seedlings.length;
    const sown = seedlings.filter(s => s.status === SeedlingStatus.SOWN).length;
    const inProgress = seedlings.filter(s => s.status === SeedlingStatus.IN_PROGRESS).length;
    const transplantReady = seedlings.filter(s => s.status === SeedlingStatus.TRANSPLANT_READY).length;
    const completed = seedlings.filter(s => s.status === SeedlingStatus.COMPLETED).length;
    const abnormal = seedlings.filter(s => s.status === SeedlingStatus.ABNORMAL).length;
    const cancelled = seedlings.filter(s => s.status === SeedlingStatus.CANCELLED).length;
    const monthCount = seedlings.filter(s => {
      const date = new Date(s.createTime);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total, sown, inProgress, transplantReady, completed, abnormal, cancelled, monthCount };
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

  // 2026-06-18: 任务 5 — 出圃入库入口 + 加载/导出辅助
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
  // 2026-07-04 v3: 三选一（正常结束/异常结束/直接取消）
  const handleEnd = (record: Seedling) => {
    if (record.endTime) {
      showAlert('该育苗记录已结束，不能重复操作');
      return;
    }
    setEndConfirm({ record, endType: 'normal' });
  };

  // 执行结束操作
  const executeEnd = async () => {
    const record = endConfirm.record;
    if (!record) return;
    const endType = endConfirm.endType;
    // 2026-07-04 v3: 三选一 → 3 个不同 endStatus
    const endStatus =
      endType === 'abnormal' ? SeedlingStatus.ABNORMAL :
      endType === 'cancelled' ? SeedlingStatus.CANCELLED :
      SeedlingStatus.COMPLETED;
    const planCode = record.productionPlanCode;

    setEndConfirm({ record: null, endType: 'normal' });

    // 取消操作不允许"强结"（cancelled 是用户主动放弃，不与生产计划联动）
    if (endType === 'cancelled' || !planCode || planCode.trim() === '') {
      const result = await updateItem(record.id, { endType, endTime: todayLocal(), status: endStatus });
      if (result) {
        const tip =
          endType === 'abnormal' ? '育苗记录已异常结束（保留补录通道）' :
          endType === 'cancelled' ? '育苗记录已取消' :
          '育苗记录已正常结束';
        await showAlert(tip);
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
        const tip =
          endType === 'abnormal' ? '育苗记录已异常结束（强结，保留补录通道）' :
          '育苗记录已正常结束（强结）';
        await showAlert(tip);
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
      const tip =
        endType === 'abnormal' ? '生产计划已异常结束（保留补录通道）' :
        '生产计划已正常结束';
      await showAlert(tip);
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
          case 'abnormal': return '异常';
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

    const fileName = `育苗管理_${todayLocal()}.${extension}`;

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

      {/* 2026-06-19: 任务 5 — 行级采收入库弹窗（unify-harvest-inbound-into-source-operations） */}
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
            // 2026-07-03：传 endType 让 modal 判断是否强制补录模式
            endType: inboundModal.record.endType,
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

      {/* 2026-07-04 v3: 结束确认弹窗 — 三选一（正常结束/异常结束/直接取消） */}
      {endConfirm.record && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 确认结束育苗记录
              </h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-700"
                onClick={() => setEndConfirm({ record: null, endType: 'normal' })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {/* 三选一提示框（根据 endType 动态切换） */}
              {endConfirm.endType === 'normal' && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-semibold text-red-800">⚠️ 正常结束 — 完成后将【锁定】</div>
                  <div className="text-xs text-red-700 mt-1">
                    结束后禁止一切后续操作：入库、补录、修改均不可用。<br />
                    <span className="font-semibold">此操作不可撤销！</span>
                  </div>
                </div>
              )}
              {endConfirm.endType === 'abnormal' && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-sm font-semibold text-amber-800">异常结束 — 保留补录通道</div>
                  <div className="text-xs text-amber-700 mt-1">
                    结束后可继续补录入库（需审核）。
                  </div>
                </div>
              )}
              {endConfirm.endType === 'cancelled' && (
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                  <div className="text-sm font-semibold text-gray-800">取消育苗 — 放弃此批次</div>
                  <div className="text-xs text-gray-700 mt-1">
                    标记为"已取消"，归档不再继续。不会联动生产计划结束。
                  </div>
                </div>
              )}
              {/* 三选一 RadioGroup */}
              <div className="space-y-2">
                <label className={`flex items-start gap-2 px-3 py-2 rounded border cursor-pointer ${endConfirm.endType === 'normal' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="endTypeChoice"
                    checked={endConfirm.endType === 'normal'}
                    onChange={() => setEndConfirm({ ...endConfirm, endType: 'normal' })}
                    className="mt-0.5 w-4 h-4 text-red-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">正常结束</div>
                    <div className="text-xs text-gray-500">所有操作锁定，育苗归档为"已出圃"</div>
                  </div>
                </label>
                <label className={`flex items-start gap-2 px-3 py-2 rounded border cursor-pointer ${endConfirm.endType === 'abnormal' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="endTypeChoice"
                    checked={endConfirm.endType === 'abnormal'}
                    onChange={() => setEndConfirm({ ...endConfirm, endType: 'abnormal' })}
                    className="mt-0.5 w-4 h-4 text-amber-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">异常结束（保留补录通道）</div>
                    <div className="text-xs text-gray-500">归档为"异常"，可继续补录入库</div>
                  </div>
                </label>
                <label className={`flex items-start gap-2 px-3 py-2 rounded border cursor-pointer ${endConfirm.endType === 'cancelled' ? 'border-gray-400 bg-gray-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="endTypeChoice"
                    checked={endConfirm.endType === 'cancelled'}
                    onChange={() => setEndConfirm({ ...endConfirm, endType: 'cancelled' })}
                    className="mt-0.5 w-4 h-4 text-gray-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">直接取消</div>
                    <div className="text-xs text-gray-500">放弃此批次育苗，归档为"已取消"</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm"
                onClick={() => setEndConfirm({ record: null, endType: 'normal' })}>
                取消
              </Button>
              <Button variant="default" size="sm"
                onClick={executeEnd}
                className={
                  endConfirm.endType === 'abnormal' ? 'bg-amber-600 hover:bg-amber-700' :
                  endConfirm.endType === 'cancelled' ? 'bg-gray-600 hover:bg-gray-700' :
                  'bg-red-600 hover:bg-red-700'
                }>
                确认{
                  endConfirm.endType === 'abnormal' ? '异常结束' :
                  endConfirm.endType === 'cancelled' ? '取消育苗' :
                  '正常结束'
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
