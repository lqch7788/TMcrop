/**
 * 育苗管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Edit2, Trash2, Printer, Eye, Image, X, Check, FileText, Shovel, Sprout, Download, ChevronDown } from 'lucide-react';
import { SeedlingFilter } from './components/SeedlingFilter';
import { SeedlingTable } from './components/SeedlingTable';
import { AddModal } from './modals/AddModal';
import { Button } from '@/components/ui';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { DailyRecordModal } from './modals/DailyRecordModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { todayLocal } from '@/lib/dateUtils';
import { QUALITY_GRADE_MAP, HARVEST_FORM_MAP } from '@/constants/cropConstants';
import * as XLSX from 'xlsx';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { RecordModal } from '../planting/modals/RecordModal';
import SeedlingLabelManageModal from './modals/SeedlingLabelManageModal';
import { useDictionaryStore, getDictItems, useSeedlingStore, useSeedSourceStore, useToastStore, useInventoryInboundStore } from '../../../stores';
import { Seedling, SeedlingFilters, SeedlingStatus, SeedSource } from '../../../types/crop';
import * as cropVarietyService from '../../../services/cropVarietyService';
import * as cropBatchService from '../../../services/apiCropBatchService';
import { useAuthPermission } from '../../../hooks/usePermission';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { enhancedApiClient } from '@/lib/apiClient';
// 2026-06-09 删除警告弹窗（统一为 UI 库 DeleteConfirmModal，与技术方案一致）
import { DeleteConfirmModal } from '@/components/ui';
import { InventoryInboundModal } from '../inventory/InventoryInboundModal';
import { UnifiedRowHarvestInboundModal } from '../inventory/UnifiedRowHarvestInboundModal';
import type { InventoryInboundRecord } from '@/types/inventoryInbound';

export default function SeedlingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  // 2026-06-25 v3: 繁殖记录弹窗状态（仅 1:多 模式显示）
  const [propagationRecordModal, setPropagationRecordModal] = useState<{ open: boolean; record: Seedling | null }>({
    open: false,
    record: null,
  });
  const handlePropagationRecord = (record: Seedling) => {
    setPropagationRecordModal({ open: true, record });
  };
  const closePropagationRecordModal = () => {
    setPropagationRecordModal({ open: false, record: null });
  };

  const [inboundModal, setInboundModal] = useState<{ open: boolean; record: Seedling | null }>({
    open: false,
    record: null,
  });
  const inboundRecordsMap = useInventoryInboundStore((s) => s.recordsBySource);
  const loadInboundRecords = useInventoryInboundStore((s) => s.loadRecords);

  // 2026-06-27：修复入库记录不显示 bug — 页面挂载时自动加载"育苗模块全部入库记录"
  // 之前 bug: loadInboundRecords 只在用户点击"入库"按钮时调用，导致刷新页面后
  // recordsBySource 为空，折叠区始终显示"共 0 条"（但数据库其实有数据）
  // 位置说明：必须放在 loadInboundRecords 定义之后（避免 TDZ ReferenceError）
  useEffect(() => {
    void loadInboundRecords('seedling:__all__', {
      sourceModule: 'seedling',
      limit: 100,
    });
  }, [loadInboundRecords]);

  // flat 入库记录，按 createTime 倒序（仅育苗模块）
  const allInboundRecords: InventoryInboundRecord[] = Object.values(inboundRecordsMap)
    .flat()
    .filter((r) => r.sourceModule === 'seedling')
    .sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));

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
    void loadInboundRecords(`seedling:${record.id}`, {
      sourceModule: 'seedling',
      sourceId: record.id,
      limit: 100,
    });
  };

  const handleInboundSuccess = () => {
    const rec = inboundModal.record;
    if (!rec) return;
    void loadInboundRecords(`seedling:${rec.id}`, {
      sourceModule: 'seedling',
      sourceId: rec.id,
      limit: 100,
    });
    toast.success('入库成功');
  };

  // 2026-06-28：入库记录导出改为 Excel（用 xlsx 库生成真正的 .xlsx）
  // 之前是手写 CSV + UTF-8 BOM 兼容 Excel，但中文长内容偶尔列宽错乱；
  // 现在用 xlsx 库按列设置 wch，Excel/WPS 打开自动适配列宽
  const exportInboundExcel = () => {
    if (allInboundRecords.length === 0) {
      showAlert('没有入库记录可导出');
      return
    }
    const headers = ['入库日期', '来源编码', '作物编码', '作物品种', '采收形态', '仓库', '数量', '单位', '品质', '操作员', '备注']
    const rows = allInboundRecords.map((r) => [
      r.recordDate ? String(r.recordDate).split('T')[0] : '',
      r.sourceCode || r.sourceId,
      r.cropCode || '',
      r.cropName && r.varietyName ? `${r.cropName}/${r.varietyName}` : (r.cropName || r.varietyName || ''),
      r.harvestForm ? (HARVEST_FORM_MAP[r.harvestForm] ?? r.harvestForm) : '',
      r.warehouseName || r.warehouseId || '',
      r.quantity,
      r.unit,
      r.qualityGrade ? (QUALITY_GRADE_MAP[r.qualityGrade]?.label ?? r.qualityGrade) : '',
      r.operatorName || r.createBy || '',
      r.notes || '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    // 列宽：按表头最大字符数 × 2 估算（中文按 2 宽算）
    ws['!cols'] = headers.map((h, i) => {
      const maxCellLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length))
      return { wch: Math.max(12, maxCellLen * 2) }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '育苗入库记录')
    XLSX.writeFile(wb, `育苗入库记录_${todayLocal()}.xlsx`)
  }

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
  const handleEnd = async (record: Seedling, endType: 'normal' | 'abnormal') => {
    // 2026-06-13: 放宽限制 — 没关联生产计划的记录也允许结束（仅关本记录，不动生产计划）
    const planCode = record.productionPlanCode;
    const isNormal = endType === 'normal';
    let confirmMsg = planCode
      ? (isNormal
          ? `确认正常结束此生产计划？\n\n结束后禁止一切入库和补录操作`
          : `确认异常结束此生产计划？\n\n结束后如需补录，需提交审核申请`)
      : (isNormal
          ? `确认正常结束此育苗记录？\n（未关联生产计划，仅关闭本记录）`
          : `确认异常结束此育苗记录？\n（未关联生产计划，仅关闭本记录）`);

    if (!planCode || planCode.trim() === '') {
      // 本地强结 — 只需更新本条记录
      if (!await showConfirm(confirmMsg)) return;
      const result = await updateItem(record.id, {
        endType,
        endTime: todayLocal(),
      });
      if (result) {
        await showAlert(isNormal ? '育苗记录已正常结束' : '育苗记录已异常结束');
        await loadItems();
      } else {
        await showAlert('结束失败');
      }
      return;
    }

    const batch = await cropBatchService.getCropBatchByCode(planCode);
    if (!batch) {
      // 2026-06-05: 强结分支 — 关联生产计划被删/查不到时引导用户强制结束
      const confirmed = await showConfirm(
        `未找到关联的生产计划 [${planCode}]，可能已被删除。\n` +
        `是否强制结束该育苗记录？\n（结束后将解除生产计划关联，并记录结束标记）`
      );
      if (!confirmed) return;

      // 走 Store action（V2.1 铁律：写持久化数据走 Store）
      const isNormal = endType === 'normal';
      const result = await updateItem(record.id, {
        endType,
        endTime: todayLocal(),
      });
      if (result) {
        await showAlert(isNormal ? '育苗记录已正常结束（强结）' : '育苗记录已异常结束（强结）');
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

    const completionRate = cropBatchService.getCompletionRate(batch, record.survivalCount || 0);
    confirmMsg = isNormal
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
        onPropagationRecord={handlePropagationRecord}
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
          }}
        />
      )}

      {/* 2026-06-25 v3: 繁殖记录弹窗（复用 RecordModal，type='propagation'） */}
      {propagationRecordModal.record && (
        <RecordModal
          isOpen={propagationRecordModal.open}
          onClose={closePropagationRecordModal}
          onSuccess={loadItems}
          recordType="propagation"
          parentRecord={{
            id: propagationRecordModal.record.id,
            seedlingCode: propagationRecordModal.record.seedlingCode,
            cropName: propagationRecordModal.record.cropName,
          }}
        />
      )}

      {/* 2026-06-18: 任务 5 — 入库记录子表（折叠区） */}
      <details className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <summary className="cursor-pointer text-sm font-semibold p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            {/* 2026-06-28：折叠箭头 — group-open:rotate-180 在展开时旋转 180° */}
            <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
            入库记录 (共 {allInboundRecords.length} 条)
          </span>
          {/* 2026-06-28：导出按钮挪到 summary 同一行靠右；onClick 阻止冒泡到 summary 的折叠切换 */}
          {allInboundRecords.length > 0 && (
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                exportInboundExcel();
              }}
            >
              <Download className="w-4 h-4 mr-1" /> 导出 Excel
            </Button>
          )}
        </summary>
        <div className="p-3">
          {allInboundRecords.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">暂无入库记录</div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-blue-500 text-white sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left">入库日期</th>
                      <th className="px-2 py-2 text-left">来源编码</th>
                      <th className="px-2 py-2 text-left">作物编码</th>
                      <th className="px-2 py-2 text-left">作物品种</th>
                      <th className="px-2 py-2 text-left">采收形态</th>
                      <th className="px-2 py-2 text-left">仓库</th>
                      <th className="px-2 py-2 text-left">数量</th>
                      <th className="px-2 py-2 text-left">单位</th>
                      <th className="px-2 py-2 text-left">品质</th>
                      <th className="px-2 py-2 text-left">操作员</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInboundRecords.slice(0, 20).map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        {/* 2026-06-28：入库日期只显示年月日（防御 ISO 字符串含 T） */}
                        <td className="px-2 py-1.5">{r.recordDate ? String(r.recordDate).split('T')[0] : '-'}</td>
                        <td className="px-2 py-1.5">{r.sourceCode || r.sourceId}</td>
                        <td className="px-2 py-1.5">{r.cropCode || '-'}</td>
                        <td className="px-2 py-1.5">{r.cropName && r.varietyName ? `${r.cropName}/${r.varietyName}` : (r.cropName || r.varietyName || '-')}</td>
                        <td className="px-2 py-1.5">{r.harvestForm ? (HARVEST_FORM_MAP[r.harvestForm] ?? r.harvestForm) : '-'}</td>
                        <td className="px-2 py-1.5">{r.warehouseName || r.warehouseId || '-'}</td>
                        <td className="px-2 py-1.5">{r.quantity}</td>
                        <td className="px-2 py-1.5">{r.unit}</td>
                        {/* 2026-06-28：品质英文 → 中文（兼容 A/B/C/D 老数据） */}
                        <td className="px-2 py-1.5">{r.qualityGrade ? (QUALITY_GRADE_MAP[r.qualityGrade]?.label ?? r.qualityGrade) : '-'}</td>
                        <td className="px-2 py-1.5">{r.operatorName || r.createBy || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </details>

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
    </div>
  );
}
