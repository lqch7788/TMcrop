/**
 * 种植管理主页面
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, Printer, Eye, Image, X, Check, TreePine, Tag, MoveRight, Calendar, AlertTriangle } from 'lucide-react';
// 2026-07-01 修复：endConfirm 弹窗里用了 <Button> 但未导入，触发 "Button is not defined"
// 统一从 UI 库导入
import { Button } from '@/components/ui';
import { PlantingStats } from './components/PlantingStats';
import { PlantingFilter } from './components/PlantingFilter';
import { PlantingTable } from './components/PlantingTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { HarvestRecordModal } from './modals/HarvestRecordModal';
import { RecordModal } from './modals/RecordModal';
import { DailyRecordModal } from './modals/DailyRecordModal';
// 2026-07-09 v6：恢复 UnifiedRowHarvestInboundModal import（行级弹窗恢复，弹窗内"补录"按钮跳转）
import { UnifiedRowHarvestInboundModal } from '../inventory/UnifiedRowHarvestInboundModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { todayLocal } from '@/lib/dateUtils';
// 2026-07-10 P1-2：抽取筛选 Hook
import { useFilteredPlantings } from '@/hooks/useFilteredPlantings';
// 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
// 2026-07-10 P1-1：抽取公共导出函数
import { exportCsv, exportXlsx, exportWord } from '@/services/exporters';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { useDictionaryStore, getDictItems, usePlantingStore, useToastStore, useZoneStore, useGreenhouseStore, getGreenhouseByOid } from '../../../stores';
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
    areaOid: '',  // 2026-07-25: 区域 oid（FK 权威），替代 areaName 文本过滤
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
  // 2026-07-26：种植区域只加载当前基地（宁波北仑）的 zone，过滤无关基地区域
  const zones = useZoneStore((s) => s.zones);
  const loadZones = useZoneStore((s) => s.loadZones);
  const zoneLoading = useZoneStore((s) => s.loading);
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  useEffect(() => {
    if (zones.length === 0 && !zoneLoading) loadZones();
    if (greenhouses.length === 0) loadGreenhouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2026-07-26：注册基地温室 OID 集合（baseOid=base_1780023508412）
  const baseGhOids = useMemo(() => {
    return new Set(
      greenhouses
        .filter(gh => gh.baseOid === 'base_1780023508412')
        .map(gh => String(gh.oid))
    );
  }, [greenhouses]);

  // 种植区域选项（只显示当前基地的子级区块）
  const areas = useMemo(() => {
    return zones
      .filter((z) => (z.status ?? 'active') !== 'inactive' && baseGhOids.has(String(z.greenhouseOid || '')))
      .map((z) => ({
        value: z.oid,
        label: z.zoneName || '未命名区域',
        // parent 用 greenhouse.name 让 PlantingFilter 树形筛选可显示层级
        parent: z.greenhouseOid ? (getGreenhouseByOid(z.greenhouseOid)?.name || '') : '',
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, baseGhOids]);

  // 种植状态选项
  // 2026-07-28 审核 C-1：依赖改为 dictionaries，异步加载字典后能重新计算
  const plantingStatusOptions = useMemo(() => {
    return getDictItems('planting_status').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

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
  // 2026-07-09 v6：恢复 inboundUnifiedOpen / inboundUnifiedRecord 2 个 state（onInbound 改回弹窗）
  const [inboundUnifiedOpen, setInboundUnifiedOpen] = useState(false);
  // 2026-07-10 P1-3：用 Planting 子集 interface 替代 any（弹窗只需要种植行 + 状态/单位子集）
  interface InboundUnifiedRecord {
    id: string;
    plantingCode: string;
    cropName?: string;
    cropVariety?: string;
    cropCode?: string;
    unit?: string;
    plantingMode?: string;
    endTime?: string;
    status?: string;
  }
  const [inboundUnifiedRecord, setInboundUnifiedRecord] = useState<InboundUnifiedRecord | null>(null);
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
  // 2026-07-15：仅刷新数据，不关闭弹窗（add/delete 后用户应继续在弹窗里操作）
  const handleDailyRecordSuccess = () => {
    // Store action 内部已 await loadItems()，列表会实时刷新
    // 不调用 closeDailyRecord — 弹窗只在用户主动关闭（X/取消/保存）时才关闭
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

  // 2026-07-10 P1-2：抽到 useFilteredPlantings Hook
  const filteredData = useFilteredPlantings(plantings, filters);

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

  // 2026-07-09 v4: 结束确认弹窗 — 二选一（正常结束 / 异常结束）
  // 2026-07-09 v5（方案 A 阶段一）：单态结束弹窗
  // 砍掉"异常结束"选项——补录不再是状态机的开关，而是采收记录的属性
  // 历史 endType='abnormal' 数据保留兼容（PlantingTable 仍识别），但不再提供新建入口
  const [endConfirm, setEndConfirm] = useState<{ record: Planting | null }>({
    record: null,
  });

  const handleEnd = (record: Planting) => {
    // 单态：任何已结束的行都拦截
    if (record.endTime) {
      showAlert('该种植记录已结束，不能再次操作');
      return;
    }
    setEndConfirm({ record });
  };

  const executeEnd = async () => {
    const record = endConfirm.record;
    if (!record) return;
    // 2026-07-09 v5：单态结束 — 固定 endType='normal', isHarvestLocked=0（允许后续补录）
    // 补录走 HarvestRecordModal 的补录模式（自动判断），不依赖 endType
    const endStatus = PlantingStatus.ENDED;

    setEndConfirm({ record: null });

    const result = await updateItem(record.id, {
      endType: 'normal',
      endTime: todayLocal(),
      status: endStatus,
      isHarvestLocked: 0,
    } as Partial<Planting>);
    if (result) {
      await showAlert('种植记录已结束（仍可补录遗漏库存）');
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
        // 2026-07-10 P0-4 修复：去除 res?.data 二次解包（enhancedApiClient 已自动解包 data），保留 label 兼容
        const label = res?.label || res;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      areaOid: '',
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

    // 导出表头（2026-07-21：补全所有列表字段）
    // 2026-07-21 修复：补全"关联生产计划"列
    const headers = ['种植批号', '关联生产计划', '作物编码', '来源类型', '来源批号', '作物品种', '品种', '品种路径', '种植区域', '大棚名称', '种植数量', '单位', '种植日期', '土壤PH', '土壤EC', '目标产量', '移栽数量', '移栽日期', '是否采收', '采收日期', '已采收数量', '采收入库量', '种植自留种量', '损耗率', '损耗数量', '补栽数量', '剩余数量', '完成比例', '溯源码', '状态', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => {
      const remaining = Math.max(0, (record.plantingCount || 0) + (record.supplementCount || 0) - (record.lossCount || 0));
      // 2026-07-21 修复：完成比例计算与列表一致（用 harvestQuantity 而非 harvestToInventoryQty）
      const completionRate = record.targetYield && record.targetYield > 0 ? `${Math.round((record.harvestQuantity || 0) / record.targetYield * 100)}%` : '-';
      return {
        '种植批号': record.plantCode,
        '关联生产计划': record.productionPlanCode || '-',
        '作物编码': record.cropCode || '',
        '来源类型': record.sourceType === SourceType.SEED ? '种子' : '种苗',
        '来源批号': record.sourceCode,
        '作物品种': record.cropName,
        '品种': record.cropVariety,
        '品种路径': record.varietyPath || [record.categoryName, record.typeName, record.varietyName, record.subVariety1Name].filter(Boolean).join(' > ') || '-',
        '种植区域': record.areaName,
        '大棚名称': record.rootName,
        '种植数量': record.plantingCount,
        '单位': record.unit || '',
        '种植日期': record.plantingDate,
        '土壤PH': record.soilPH || '',
        '土壤EC': record.soilEC || '',
        '目标产量': record.targetYield || '',
        '移栽数量': record.transplantCount || '',
        '移栽日期': record.transplantDate || '',
        '是否采收': record.isHarvest ? '是' : '否',
        '采收日期': record.harvestDate || '',
        '已采收数量': record.harvestQuantity || '',
        '采收入库量': record.harvestToInventoryQty || '',
        '种植自留种量': record.selfKeptToSourceQty || '',
        '损耗率': `${record.attritionRate}%`,
        '损耗数量': record.lossCount || '',
        '补栽数量': record.supplementCount || '',
        '剩余数量': remaining,
        '完成比例': completionRate,
        '溯源码': record.traceabilityCode,
        '状态': record.status === PlantingStatus.PLANTED ? '已定植' : record.status === PlantingStatus.GROWING ? '生长期' : record.status === PlantingStatus.HARVESTING ? '采收中' : record.status === PlantingStatus.HARVESTED ? '已采收' : record.status === PlantingStatus.ENDED ? '已结束' : record.status === PlantingStatus.CANCELLED ? '已取消' : '-',
        '创建人': record.createBy,
        '创建时间': record.createTime,
        '备注': record.remarks || ''
      };
    });

    // 2026-07-10 P1-1：抽到底层公共函数
    const ext = exportFormat === 'csv' ? 'csv' : exportFormat === 'word' ? 'doc' : 'xls';
    const fileName = `种植管理_${todayLocal()}.${ext}`;

    try {
      if (exportFormat === 'csv') {
        await exportCsv({ filename: fileName, headers, rows: exportData });
      } else if (exportFormat === 'word') {
        await exportWord({ filename: fileName, headers, rows: exportData });
      } else {
        await exportXlsx({ filename: fileName, headers, rows: exportData });
      }
    } catch (err) {
      // 2026-07-10 P0-2：catch(e) + instanceof 守卫
      console.warn('[PlantingPage] 导出失败，降级 Blob:', err instanceof Error ? err.message : String(err));
      const { serializeCsv, serializeHtmlTable } = await import('@/services/exporters');
      const content = exportFormat === 'csv' ? serializeCsv(headers, exportData) : serializeHtmlTable(headers, exportData);
      const mimeType = exportFormat === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel;charset=utf-8';
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
            {/* 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件 */}
            <LoadingSpinner withText />
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      )}
      <PlantingTable
        data={filteredData}
        onEndV2={handleEndV2}
        onEnd={handleEnd}
        // 2026-07-09 v6：恢复 onInbound 弹窗模式（用户要求：必须打开采收弹窗，弹窗内"补录"按钮跳转）
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
          // 2026-08-14：key 按行强制重挂载（修复切换行后表单残留）
          key={currentRecord.id}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <DetailModal
          // 2026-08-14：key 按行强制重挂载
          key={currentRecord.id}
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
        />
      )}

      {/* V2 改造 (任务 16): 种植结束弹窗挂接 */}
      {currentRecord && (
        <HarvestRecordModal
          // 2026-08-14：key 按行强制重挂载
          key={currentRecord.id}
          isOpen={harvestModalOpen}
          onClose={() => setHarvestModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
        />
      )}

      {/* 2026-07-09 v5（方案 A 阶段一）：单态结束弹窗（仅 1 个"结束"按钮）
          2026-07-09 v4 历史：二选一（正常结束/异常结束）— v5 已合并
          2026-07-04 v3 历史：三选一（正常结束/异常结束/直接取消）— v4 已合并 */}
      {endConfirm.record && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 确认结束种植记录
              </h3>
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-700"
                onClick={() => setEndConfirm({ record: null })}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {/* 2026-07-09 v5（方案 A 阶段一）：单态提示框 */}
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-semibold text-red-800">⚠️ 结束种植记录</div>
                <div className="text-xs text-red-700 mt-1">
                  结束后将锁定日常运维操作（补栽、损耗、搬运等）。<br />
                  <span className="font-semibold">仍可补录遗漏的库存</span>（通过"采收入库"按钮，必填补录原因）。<br />
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

      {/* 2026-07-09 v6：恢复 UnifiedRowHarvestInboundModal 行级弹窗
          种植行点"采收入库" → 弹窗 → 弹窗内"补录"按钮跳转 AddStockModal
          必须打开采收弹窗，弹窗内"补录"按钮才能跳转（用户 v6 设计） */}
      {inboundUnifiedRecord && (
        <UnifiedRowHarvestInboundModal
          key={inboundUnifiedRecord.id}
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
            code: inboundUnifiedRecord.plantCode,
            cropName: inboundUnifiedRecord.cropName || '',
            cropVariety: inboundUnifiedRecord.cropVariety || '',
            cropCode: inboundUnifiedRecord.cropCode || '',
            unit: inboundUnifiedRecord.unit,
            plantingMode: inboundUnifiedRecord.plantingMode,
            // 2026-07-09 v6：传 endTime/status 让弹窗显示"补录"按钮（仅已结束/已取消行）
            endTime: inboundUnifiedRecord.endTime,
            status: inboundUnifiedRecord.status,
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
          // 2026-08-14：key 按行强制重挂载 — 修复切换行后表单残留上一行数据（与育苗同款 bug）
          key={dailyRecordModal.record.id}
          isOpen={dailyRecordModal.open}
          onClose={closeDailyRecord}
          onSuccess={handleDailyRecordSuccess}
          record={dailyRecordModal.record}
          // 2026-07-03：已结束的种植 → 只读模式（保留查看+导出）
          readOnly={Boolean(
            dailyRecordModal.record &&
            (dailyRecordModal.record.status === 'ended' || dailyRecordModal.record.endType === 'abnormal')
          )}
        />
      )}

      {currentRecord && (
        <PrintLabelModal
          // 2026-08-14：key 按行强制重挂载
          key={currentRecord.id}
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
          // 2026-07-03：已结束的种植 → 只读模式（保留查看+导出+打印）
          readOnly={Boolean(
            labelManageRecord.status === 'ended' || labelManageRecord.endType === 'abnormal'
          )}
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
