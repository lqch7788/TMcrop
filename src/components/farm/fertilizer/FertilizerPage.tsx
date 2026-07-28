/**
 * 水肥管理主页面组件（2026-07-20 升级）
 * Tab 系统：施肥记录 | 浇水记录
 * 布局：PageHeader → Tabs → [Tab1: 施肥原有结构 | Tab2: 浇水结构]
 * 施肥数据通过 useFertilizerStore；浇水数据通过 useWateringStore
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §8
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button, DeleteConfirmModal, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Sprout } from 'lucide-react';
import { useFertilizerStore, FertilizerData, useWateringStore, useIotStore, useToastStore, getDictItemName } from '@/stores';
import type { WateringData } from '@/stores';
import { FertilizerFilter } from './FertilizerFilter';
import { FertilizerTable } from './FertilizerTable';
import { FertilizerAddModal } from './FertilizerAddModal';
import { FertilizerEditModal } from './FertilizerEditModal';
import { FertilizerDetailModal } from './FertilizerDetailModal';
import WaterFilter from './WaterFilter';
import { WaterTable } from './WaterTable';
import WaterAddModal from './WaterAddModal';
import WaterEditModal from './WaterEditModal';
import WaterDetailModal from './WaterDetailModal';
import WaterExportModal from './WaterExportModal';
import { todayLocal } from '@/lib/dateUtils';
import { exportXlsx, exportWord } from '@/services/exporters';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import FertilizerExportModal from './FertilizerExportModal';
import type { IotDeviceStatus } from './IotDataIndicator';
import { calcWaterFromPoolRow } from '@/lib/dilutionWater';

type OperationMode = 'normal' | 'delete' | 'export';
type ActiveTab = 'fertilizer' | 'watering';

// 2026-07-25：水肥管理 Tab 选中态覆盖默认"白底绿字"为"绿底白字"
// - 用 data-[state=active]: 前缀（属性选择器特异性 0,2,0 > 类选择器 0,1,0），必然覆盖 tabs.tsx 默认样式
// - 不动 UI 通用组件，仅在水肥管理页面生效，避免影响其他用 Tabs 的页面
const WATER_FERTILIZER_TAB_ACTIVE_CLASS =
  'data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md';

export default function FertilizerPage() {
  // ========== Store ==========
  const store = useFertilizerStore();
  const { items, isLoading, error, clearError } = store;
  const iotStore = useIotStore();
  // 2026-06-06: 监听 store 错误并弹 Toast（不修改 store 内部实现）
  const toast = useToastStore((s) => s.toast);
  const lastShownErrorRef = useRef<string | null>(null);

  // 2026-07-20：浇水 Store（与施肥独立）
  const waterStore = useWateringStore();
  const { items: waterItems, isLoading: waterLoading, error: waterError, clearError: clearWaterError } = waterStore;
  const lastShownWaterErrorRef = useRef<string | null>(null);

  // 2026-07-20：Tab 状态 + URL 深链状态
  const [activeTab, setActiveTab] = useState<ActiveTab>('fertilizer');

  // ========== 本地状态 ==========
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operationMode, setOperationMode] = useState<OperationMode>('normal');

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FertilizerData | null>(null);
  const [detailTarget, setDetailTarget] = useState<FertilizerData | null>(null);
  // 2026-06-09 删除警告弹窗：与技术方案/作物库存/出库记录统一用 UI 库 DeleteConfirmModal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  // 2026-07-19 P2：参照 SeedSource 100% 对齐 2 步导出流程
  //   - 第 1 次点"导出"：setExportMode(true) → 表格显示 checkbox
  //   - 勾选后第 2 次点"确认导出"：handleConfirmExport → setShowExportModal(true)
  //   - 导出完成后重置 exportMode + operationMode + selectedIds（避免复选框残留）
  const [exportMode, setExportMode] = useState(false);

  // 2026-07-20：浇水独立状态（与施肥解耦，tab 切换不互相干扰）
  const [waterFilters, setWaterFilters] = useState<Record<string, string>>({});
  const [waterSelectedIds, setWaterSelectedIds] = useState<string[]>([]);
  const [waterOperationMode, setWaterOperationMode] = useState<OperationMode>('normal');
  const [waterExportMode, setWaterExportMode] = useState(false);
  // 浇水模态框
  const [showWaterAddModal, setShowWaterAddModal] = useState(false);
  const [waterEditTarget, setWaterEditTarget] = useState<WateringData | null>(null);
  const [waterDetailTarget, setWaterDetailTarget] = useState<WateringData | null>(null);
  const [showWaterDeleteModal, setShowWaterDeleteModal] = useState(false);
  const [showWaterExportModal, setShowWaterExportModal] = useState(false);



  // ========== 数据加载 ==========
  useEffect(() => {
    store.fetchItems(filters);
    iotStore.fetchDevices();
  }, []); // 首次加载

  // 2026-06-06: 监听 store.error 变化，新错误弹 Toast（用 useRef 去重）
  useEffect(() => {
    if (error && error !== lastShownErrorRef.current) {
      lastShownErrorRef.current = error;
      toast.error(`加载施肥数据失败：${error}`);
      clearError();
    }
  }, [error, toast, clearError]);

  // 2026-07-20：监听浇水 store.error（与施肥对称风格）
  useEffect(() => {
    if (waterError && waterError !== lastShownWaterErrorRef.current) {
      lastShownWaterErrorRef.current = waterError;
      toast.error(`加载浇水数据失败：${waterError}`);
      clearWaterError();
    }
  }, [waterError, toast, clearWaterError]);

  // 2026-07-20：URL 深链 — ?tab=watering 自动切到浇水 Tab（参照 ?new=1 模式，操作后 replaceState 清理）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'watering') {
      setActiveTab('watering');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // ========== IoT设备状态（从施肥记录中提取auto_iot记录） ==========
  const iotDevices = useMemo<IotDeviceStatus[]>(() => {
    const deviceMap = new Map<string, { deviceName: string; count: number; lastActive: string }>();
    items.filter(it => it.dataSource === 'auto_iot').forEach((it) => {
      const key = it.iotDeviceId || 'unknown';
      const existing = deviceMap.get(key);
      if (existing) {
        existing.count++;
        if (it.fertilizeTime > existing.lastActive) existing.lastActive = it.fertilizeTime;
      } else {
        deviceMap.set(key, {
          deviceName: it.iotDeviceId || '未知IoT设备',
          count: 1,
          lastActive: it.fertilizeTime,
        });
      }
    });
    return Array.from(deviceMap.entries()).map(([id, d]) => ({
      // 2026-07-16 审核修复：与 IotDeviceStatus interface camelCase 对齐
      deviceId: id,
      deviceName: d.deviceName,
      recordCount: d.count,
      lastActive: d.lastActive || undefined,
    }));
  }, [items]);

  // ========== 统计数据计算 ==========
  const stats = useMemo(() => {
    const total = items.length;
    const totalQuantity = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const totalCost = items.reduce((sum, it) => sum + (it.totalCost || 0), 0);
    const iotCount = items.filter((it) => it.dataSource === 'auto_iot').length;
    return { total, totalQuantity, totalCost, iotCount };
  }, [items]);

  // ========== 筛选处理 ==========
  const handleSearch = useCallback(() => {
    store.fetchItems(filters);
    setSelectedIds([]);
    setOperationMode('normal');
  }, [filters, store]);

  const handleReset = useCallback(() => {
    setFilters({});
    store.fetchItems({});
    setSelectedIds([]);
    setOperationMode('normal');
  }, [store]);

  // ========== CRUD 处理 ==========
  const handleAdd = useCallback(() => setShowAddModal(true), []);

  const handleEdit = useCallback((record: FertilizerData) => {
    setEditTarget(record);
  }, []);

  const handleDetail = useCallback((record: FertilizerData) => {
    setDetailTarget(record);
  }, []);

  // 2026-06-09 改造：单条删除走 DeleteConfirmModal（与技术方案一致）
  const handleDelete = useCallback((id: string) => {
    setSelectedIds([id]);
    setShowDeleteModal(true);
  }, []);

  // ========== 批量操作 ==========
  const handleBatchDeleteMode = useCallback(() => {
    setOperationMode(prev => prev === 'delete' ? 'normal' : 'delete');
    setSelectedIds([]);
  }, []);

  // 2026-06-09 改造：批量删除直接弹 DeleteConfirmModal（替代旧自写 FertilizerBatchDeleteModal）
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShowDeleteModal(true);
  }, [selectedIds]);

  // 2026-06-09 改造：弹窗回调统一处理单条/批量删除
  // - 单条：store.deleteItem(id)
  // - 批量：store.deleteItems(ids) 返回 {deleted, skipped}（IoT 记录自动跳过）
  const handleDeleteConfirm = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setShowDeleteModal(false);
    try {
      if (ids.length === 1) {
        const ok = await store.deleteItem(ids[0]);
        if (ok) {
          toast.success('已删除 1 条记录');
        } else {
          toast.error('删除失败');
        }
      } else {
        const { deleted, skipped } = await store.deleteItems(ids);
        if (skipped > 0) {
          toast.success(`已删除 ${deleted} 条，跳过 ${skipped} 条 IoT 记录（不可删）`);
        } else {
          toast.success(`已删除 ${deleted} 条记录`);
        }
      }
      setSelectedIds([]);
      setOperationMode('normal');
      store.fetchItems(filters);
    } catch (err: any) {
      // 2026-07-16：失败也重置选中（避免重复触发同一失败请求）
      setSelectedIds([]);
      setOperationMode('normal');
      toast.error(`删除失败：${err?.message || '未知错误'}`);
    }
  }, [selectedIds, filters, store, toast]);

  // ========== 导出处理（2026-07-19 P2：100% 对齐内部种源 2 步流程）==========
  const exportCount = selectedIds.length > 0 ? selectedIds.length : items.length;

  // 第 1 步：点"导出" → 进入 exportMode（表格显示 checkbox）
  // 参照 SeedSourcePage.handleExportClick
  // 2026-07-28 审核 M：deps 加 toast，与 handleWaterExport 对齐
  const handleExport = useCallback(() => {
    if (exportCount === 0) {
      toast.warning('当前筛选条件下没有可导出的数据');
      return;
    }
    setOperationMode('export');
    setExportMode(true);
    setSelectedIds([]);
  }, [exportCount, toast]);

  // 第 2 步：勾选后点"确认导出" → 校验 + 弹格式选择弹窗
  // 参照 SeedSourcePage.handleExportClickConfirm
  const handleConfirmExport = useCallback(() => {
    if (selectedIds.length === 0) {
      toast.warning('请先勾选要导出的施肥记录');
      return;
    }
    setShowExportModal(true);
  }, [selectedIds]);

  // 取消导出模式（参照 SeedSourcePage.handleExportCancel）
  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setOperationMode('normal');
    setSelectedIds([]);
  }, []);

  // 实际导出（参照 SeedSourcePage.handleConfirmExport）
  const handleExportConfirm = useCallback(async (format: 'csv' | 'xlsx' | 'pdf') => {
    // 2026-07-16：try/finally 确保弹窗始终关闭（修 silent failure：导出失败时弹窗曾卡原地）
    try {
      const toExport = selectedIds.length > 0
        ? items.filter((it) => selectedIds.includes(it.id))
        : items;

      if (toExport.length === 0) {
        toast.error('没有可导出的数据');
        return;
      }

// 2026-07-25 P1+：单 sheet 宽表模式（参照物料入库导出风格）
      // - 父级字段（11 列）：只在每条记录第一条写值，其他行留空（视觉分组）
      // - 子级字段（10 列）：每行都有值
      // - 序号列：`${i+1}/${total}` 形式（如 "1/3"）
      // 列顺序：父级在前（11 列） + 子级在后（10 列）= 共 21 列
      const headers = [
        '施肥编号', '施肥时间', '施肥类型', '数据来源', '作物', '温室',
        '肥料类型', '稀释倍数', '肥料品牌', '操作员', '备注',
        '序号', '批号', '来源', '区域', '作物品种', '用量', '稀释', '用水量', '方式', '单价', '小计',
      ];

      const rows: Array<Record<string, unknown>> = [];
      for (const it of toExport) {
        // 解析池
        let pool: any[] = [];
        try { pool = JSON.parse((it as any).fertilizationPool || '[]'); }
        catch (e) { console.warn(`[export] 记录 ${it.id} 池 JSON 损坏:`, e); }

        // 作物多作物聚合
        let cropsLabel = '';
        try {
          const arr = JSON.parse((it as any).cropNames || '');
          if (Array.isArray(arr) && arr.length > 0) cropsLabel = arr.filter(Boolean).join('、');
        } catch {}
        if (!cropsLabel && it.cropName) cropsLabel = it.cropName;

        // 业务类型翻译
        const sourceTypeLabel = (it as any).sourceType === 'fertilizer_dilution'
          ? '施肥稀释'
          : (it as any).sourceType === 'daily_sync'
            ? '每日记录同步'
            : '手动录入';

        // 父级字段（只在第一条写值）
        const parentRow = {
          施肥编号: it.fertilizerCode || '',
          施肥时间: it.fertilizeTime || '',
          施肥类型: sourceTypeLabel,
          数据来源: it.dataSource === 'auto_iot' ? 'IoT自动' : '手动',
          作物: cropsLabel,
          温室: it.greenhouseName || '',
          肥料类型: it.fertilizerType || '',
          稀释倍数: it.dilutionRatio || '',
          肥料品牌: (it as any).specBrandName || '',
          操作员: it.operatorName || '',
          备注: it.description || '',
        };
        // 父级空白占位（后续行使用）
        const emptyParent = {
          施肥编号: '', 施肥时间: '', 施肥类型: '', 数据来源: '',
          作物: '', 温室: '', 肥料类型: '', 稀释倍数: '', 肥料品牌: '',
          操作员: '', 备注: '',
        };

        const total = pool.length;
        if (total === 0) {
          // 无池数据 — 输出一行兜底
          rows.push({
            ...parentRow,
            序号: '1/1',
            批号: '',
            来源: '-',
            区域: it.areaName || '-',
            作物品种: it.cropName || '-',
            用量: `${it.quantity || 0} ${it.unit || 'kg'}`,
            稀释: '-',
            用水量: '-',
            方式: '-',
            单价: '',
            小计: (it.totalCost || 0).toFixed(2),
          });
        } else {
          pool.forEach((r: any, i: number) => {
            const methodLabel = r.fertilizationMethod
              ? (getDictItemName('fertilization_method', r.fertilizationMethod) || r.fertilizationMethod)
              : '-';
            const subTotal = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
            const waterText = (() => { const w = calcWaterFromPoolRow(r); return w ? `${w.amount} ${w.unit}` : '-'; })();
            rows.push({
              ...(i === 0 ? parentRow : emptyParent),
              序号: `${i + 1}/${total}`,
              批号: r.code || '',
              来源: r.type === 'planting' ? '种植' : r.type === 'seedling' ? '育苗' : '-',
              区域: r.area || '-',
              作物品种: r.cropName || '-',
              用量: `${r.quantity || 0} ${r.unit || 'kg'}`,
              稀释: r.dilutionRatio || '-',
              用水量: waterText,
              方式: methodLabel,
              单价: (r.unitPrice || 0).toFixed(2),
              小计: subTotal.toFixed(2),
            });
          });
        }
      }

      const filename = `施肥记录_${todayLocal()}`;

      if (format === 'csv') {
        const csvRows = rows.map((r) => headers.map((h) => `"${String((r as any)[h] || '').replace(/"/g, '""')}"`).join(','));
        const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        // 2026-07-25 P1+：单 sheet 宽表（参照物料入库导出风格）
        await exportXlsx({ filename: `${filename}.xlsx`, sheetName: '施肥记录', headers, rows });
      } else if (format === 'pdf') {
        const doc = new jsPDF('l', 'mm', 'a4');
        const data = rows.map((r) => headers.map((h) => String((r as any)[h] || '')));
        (doc as any).autoTable({ head: [headers], body: data, startY: 15, styles: { fontSize: 6 }, headStyles: { fillColor: [16, 185, 129] } });
        doc.save(`${filename}.pdf`);
      }
      toast.success(`已导出 ${toExport.length} 条记录`);
    } catch (err: any) {
      // 2026-07-16：catch 显式提示，避免静默失败
      console.error('[export] 失败:', err);
      toast.error(`导出失败：${err?.message || '未知错误'}`);
    } finally {
      // 2026-07-16：finally 确保弹窗始终关闭（即使抛错也不卡 UI）
      // 2026-07-19 P2-fix: 重置 exportMode + operationMode + selectedIds
      //   否则 FertilizerTable showCb = operationMode==='delete' || !!exportMode 仍为 true
      //   → 复选框导出完成后不消失(参考 Seedling 同样 bug 修复)
      setShowExportModal(false);
      setSelectedIds([]);
      setOperationMode('normal');
      setExportMode(false);
    }
  }, [items, selectedIds, toast]);

  // 2026-07-20：Tab 切换（activeTab 变化时的统一重置入口；保留各自 filters 不丢）
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setWaterSelectedIds([]);
    setOperationMode('normal');
    setWaterOperationMode('normal');
    setExportMode(false);
    setWaterExportMode(false);
  }, []);

  // ========== 编辑保存后刷新 ==========
  const handleEditSaved = useCallback(() => {
    setEditTarget(null);
    store.fetchItems(filters);
  }, [filters, store]);

  const handleAddSaved = useCallback(() => {
    setShowAddModal(false);
    store.fetchItems(filters);
  }, [filters, store]);

  // ========== 2026-07-20：浇水 handlers（与施肥解耦） ==========

  // 浇水筛选/重置
  const handleWaterSearch = useCallback(() => {
    waterStore.fetchItems(waterFilters);
    setWaterSelectedIds([]);
    setWaterOperationMode('normal');
  }, [waterStore, waterFilters]);

  const handleWaterReset = useCallback(() => {
    setWaterFilters({});
    waterStore.fetchItems({});
    setWaterSelectedIds([]);
    setWaterOperationMode('normal');
  }, [waterStore]);

  // 浇水 CRUD
  const handleWaterAdd = useCallback(() => setShowWaterAddModal(true), []);
  const handleWaterEdit = useCallback((r: WateringData) => setWaterEditTarget(r), []);
  const handleWaterDetail = useCallback((r: WateringData) => setWaterDetailTarget(r), []);

  const handleWaterDelete = useCallback((id: string) => {
    setWaterSelectedIds([id]);
    setShowWaterDeleteModal(true);
  }, []);

  // 浇水批量删除（toggle 模式）
  const handleWaterBatchDeleteMode = useCallback(() => {
    setWaterOperationMode((prev) => (prev === 'delete' ? 'normal' : 'delete'));
    setWaterSelectedIds([]);
  }, []);

  // 浇水批量删除确认（弹窗回调）
  const handleWaterBatchDelete = useCallback(() => {
    if (waterSelectedIds.length === 0) return;
    setShowWaterDeleteModal(true);
  }, [waterSelectedIds]);

  // 浇水删除确认 — 走 store.deleteItems（deleted/skipped 统计）
  // 2026-07-28 审核 C-4：删除后显式按当前筛选 refetch（由调用方负责刷新，与 useFertilizerStore 对齐）
  const handleWaterDeleteConfirm = useCallback(async () => {
    const ids = [...waterSelectedIds];
    if (ids.length === 0) return;
    setShowWaterDeleteModal(false);
    try {
      const { deleted, skipped } = await waterStore.deleteItems(ids);
      if (skipped > 0) {
        toast.success(`已删除 ${deleted} 条，跳过 ${skipped} 条受保护的浇水记录`);
      } else {
        toast.success(`已删除 ${deleted} 条浇水记录`);
      }
      setWaterSelectedIds([]);
      setWaterOperationMode('normal');
      // 重新加载当前筛选条件下的列表（删除的可能不在当前 items 中）
      waterStore.fetchItems(waterFilters);
    } catch (err: any) {
      setWaterSelectedIds([]);
      setWaterOperationMode('normal');
      toast.error(`删除失败：${err?.message || '未知错误'}`);
    }
  }, [waterSelectedIds, waterStore, waterFilters, toast]);

  // 浇水导出（2 步流程，对齐施肥/FertilizerExportModal）
  const handleWaterExport = useCallback(() => {
    if (waterItems.length === 0) {
      toast.warning('当前筛选条件下没有可导出的浇水记录');
      return;
    }
    setWaterOperationMode('export');
    setWaterExportMode(true);
    setWaterSelectedIds([]);
  }, [waterItems.length, toast]);

  const handleWaterConfirmExport = useCallback(() => {
    if (waterSelectedIds.length === 0) {
      toast.warning('请先勾选要导出的浇水记录');
      return;
    }
    setShowWaterExportModal(true);
  }, [waterSelectedIds, toast]);

  const handleWaterCancelExport = useCallback(() => {
    setWaterExportMode(false);
    setWaterOperationMode('normal');
    setWaterSelectedIds([]);
  }, []);

  // 浇水导出确认（xlsx / csv / word 三格式）
  const handleWaterExportConfirm = useCallback(async (format: 'csv' | 'xlsx' | 'word') => {
    try {
      const toExport = waterSelectedIds.length > 0
        ? waterItems.filter((it) => waterSelectedIds.includes(it.id))
        : waterItems;
      if (toExport.length === 0) {
        toast.error('没有可导出的数据');
        return;
      }
      // 2026-07-25 P1+：单 sheet 宽表模式（参照物料入库导出风格）
      // - 父级字段（9 列）：只在每条记录第一条写值，其他行留空（视觉分组）
      // - 子级字段（8 列）：每行都有值
      // - 序号列：`${i+1}/${total}` 形式（如 "1/3"）
      // 列顺序：父级在前（9 列） + 子级在后（8 列）= 共 17 列
      const headers = [
        '浇水编号', '浇水时间', '记录类型', '录入来源', '作物', '温室',
        '总用水量', '水费', '操作员',
        '序号', '批号', '区域', '作物品种', '浇水方式', '用水量', '单位', '备注',
      ];

      const rows: Array<Record<string, unknown>> = [];
      for (const it of toExport) {
        // 解析池
        let pool: any[] = [];
        try { pool = JSON.parse((it as any).waterPool || '[]'); } catch (e) { console.warn('[water export] 池 JSON 损坏:', e); }

        // 作物多作物聚合
        let cropsLabel = '';
        try {
          const arr = JSON.parse(it.cropNames || '');
          if (Array.isArray(arr) && arr.length > 0) cropsLabel = arr.filter(Boolean).join('、');
        } catch {}
        if (!cropsLabel && it.cropName) cropsLabel = it.cropName;

        const recordTypeLabel = it.recordType === 'manual'
          ? '手动录入'
          : it.recordType === 'fertilizer_dilution'
            ? '施肥稀释'
            : '每日记录同步';
        const dataSourceLabel = it.dataSource === 'auto_iot' ? 'IoT 自动' : '手动录入';

        // 父级字段（只在第一条写值）
        const parentRow = {
          浇水编号: it.waterCode || '',
          浇水时间: it.waterTime || '',
          记录类型: recordTypeLabel,
          录入来源: dataSourceLabel,
          作物: cropsLabel,
          温室: it.greenhouseName || '',
          总用水量: `${it.totalWater || 0} ${it.waterUnit || 'L'}`,
          水费: it.waterCost != null ? `¥${Number(it.waterCost).toFixed(2)}` : '',
          操作员: it.operatorName || '',
        };
        // 父级空白占位（后续行使用）
        const emptyParent = {
          浇水编号: '', 浇水时间: '', 记录类型: '', 录入来源: '',
          作物: '', 温室: '', 总用水量: '', 水费: '', 操作员: '',
        };

        const total = pool.length;
        if (total === 0) {
          // 无池数据 — 输出一行兜底（父级写值，子级填空）
          rows.push({
            ...parentRow,
            序号: '1/1',
            批号: '',
            区域: it.areaName || '-',
            作物品种: it.cropName || '-',
            浇水方式: '-',
            用水量: '',
            单位: '',
            备注: it.description || '-',
          });
        } else {
          pool.forEach((r, i) => {
            const methodLabel = r.wateringMethod
              ? (getDictItemName('watering_method', r.wateringMethod) || r.wateringMethod)
              : '-';
            rows.push({
              ...(i === 0 ? parentRow : emptyParent),
              序号: `${i + 1}/${total}`,
              批号: r.code || '',
              区域: r.area || '-',
              作物品种: r.cropName || '-',
              浇水方式: methodLabel,
              用水量: r.waterAmount ?? '-',
              单位: r.waterUnit || '-',
              备注: r.remark || '-',
            });
          });
        }
      }
      const filename = `浇水记录_${todayLocal()}`;

      if (format === 'csv') {
        const csvRows = rows.map((r) => headers.map((h) => `"${String((r as any)[h] || '').replace(/"/g, '""')}"`).join(','));
        const csv = '﻿' + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${filename}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'xlsx') {
        // 2026-07-25 P1+：单 sheet 宽表（参照物料入库导出风格）
        await exportXlsx({
          filename: `${filename}.xlsx`,
          sheetName: '浇水记录',
          headers,
          rows: rows as Array<Record<string, unknown>>,
        });
      } else if (format === 'word') {
        await exportWord({ filename: `${filename}.doc`, headers, rows: rows as Array<Record<string, unknown>> });
      }
      toast.success(`已导出 ${toExport.length} 条浇水记录`);
    } catch (err: any) {
      console.error('[water export] 失败:', err);
      toast.error(`导出失败：${err?.message || '未知错误'}`);
    } finally {
      setShowWaterExportModal(false);
      setWaterSelectedIds([]);
      setWaterOperationMode('normal');
      setWaterExportMode(false);
    }
  }, [waterItems, waterSelectedIds, toast]);

  // 浇水保存后回调
  const handleWaterAddSaved = useCallback(() => {
    setShowWaterAddModal(false);
    waterStore.fetchItems(waterFilters);
  }, [waterFilters, waterStore]);

  const handleWaterEditSaved = useCallback(() => {
    setWaterEditTarget(null);
    waterStore.fetchItems(waterFilters);
  }, [waterFilters, waterStore]);

  // 2026-07-20：浇水数据懒加载 — 切到浇水 tab（含 URL 深链 ?tab=watering）时按当前筛选拉一次
  useEffect(() => {
    if (activeTab === 'watering') {
      waterStore.fetchItems(waterFilters);
    }
    // 仅依赖 activeTab；筛选变化由 handleWaterSearch / handleWaterReset / 保存回调主动触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ========== 渲染 ==========
  return (
    <div className="space-y-6">
      {/* PageHeader — 2026-07-20：标题改为"水肥管理"（保留 Sprout 图标） */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">水肥管理</h1>
              <p className="text-gray-500">管理施肥记录、浇水记录、肥料使用和水费追踪</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2026-07-20：Tab 系统 — 施肥记录 | 浇水记录 */}
      {/* 2026-07-25：选中态改为绿底白字（用户要求） */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="fertilizer" className={WATER_FERTILIZER_TAB_ACTIVE_CLASS}>施肥记录</TabsTrigger>
          <TabsTrigger value="watering" className={WATER_FERTILIZER_TAB_ACTIVE_CLASS}>浇水记录</TabsTrigger>
        </TabsList>

        {/* ========== Tab1：施肥记录（原有结构） ========== */}
        <TabsContent value="fertilizer" className="space-y-6">
          {/* 2026-07-05: 顶部统计卡片已删除（user 要求） */}

          {/* FilterBar */}
          <FertilizerFilter
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {/* 批量删除操作栏 - 已移除：2026-06-21 改为在 FertilizerTable 工具栏原"批量删除"位置直接显示确认/取消按钮 */}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{error}
            </div>
          )}

          {/* Table */}
          <FertilizerTable
            data={items}
            isLoading={isLoading}
            operationMode={operationMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={handleAdd}
            onBatchDeleteMode={handleBatchDeleteMode}
            onConfirmBatchDelete={handleBatchDelete}
            onCancelBatchDelete={() => { setOperationMode('normal'); setSelectedIds([]); }}
            onExportMode={handleExport}
            // 2026-07-19 P2：传 exportMode 相关 props 完整实现 2 步流程
            exportMode={exportMode}
            onConfirmExport={handleConfirmExport}
            onCancelExport={handleCancelExport}
            iotDevices={iotDevices}
            iotLoading={isLoading}
          />

          {/* 施肥 Modals */}
          {showAddModal && (
            <FertilizerAddModal
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              onSaved={handleAddSaved}
            />
          )}
          {editTarget && (
            <FertilizerEditModal
              isOpen={!!editTarget}
              record={editTarget}
              onClose={() => setEditTarget(null)}
              onSaved={handleEditSaved}
            />
          )}
          {detailTarget && (
            <FertilizerDetailModal
              isOpen={!!detailTarget}
              record={detailTarget}
              onClose={() => setDetailTarget(null)}
            />
          )}
          <FertilizerExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            onConfirm={handleExportConfirm}
            // 2026-07-19 P2：prop 名 rowCount → selectedCount 对齐通用 ExportFormatModal 接口
            selectedCount={selectedIds.length > 0 ? selectedIds.length : items.length}
          />
          {/* 2026-06-09 删除警告弹窗（统一为 DeleteConfirmModal，与技术方案/作物库存/出库记录一致） */}
          <DeleteConfirmModal
            isOpen={showDeleteModal}
            selectedCount={selectedIds.length}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDeleteConfirm}
          />
        </TabsContent>

        {/* ========== Tab2：浇水记录（2026-07-20 新增） ========== */}
        <TabsContent value="watering" className="space-y-6">
          {/* 浇水筛选器 */}
          <WaterFilter
            filters={waterFilters}
            onChange={setWaterFilters}
            onSearch={handleWaterSearch}
            onReset={handleWaterReset}
          />

          {/* 浇水错误提示 */}
          {waterError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              加载出错：{waterError}
            </div>
          )}

          {/* 浇水表格 */}
          <WaterTable
            data={waterItems}
            isLoading={waterLoading}
            selectedIds={waterSelectedIds}
            onSelectionChange={setWaterSelectedIds}
            onDetail={handleWaterDetail}
            onEdit={handleWaterEdit}
            onDelete={handleWaterDelete}
            onAdd={handleWaterAdd}
            onBatchDeleteMode={handleWaterBatchDeleteMode}
            onConfirmBatchDelete={handleWaterBatchDelete}
            onCancelBatchDelete={() => { setWaterOperationMode('normal'); setWaterSelectedIds([]); }}
            onExportMode={handleWaterExport}
            exportMode={waterExportMode}
            onConfirmExport={handleWaterConfirmExport}
            onCancelExport={handleWaterCancelExport}
            // 2026-07-27 修复：传 deleteMode 让 WaterTable 在批量删除模式下显示 checkbox
            deleteMode={waterOperationMode === 'delete'}
          />

          {/* 浇水 Modals */}
          {showWaterAddModal && (
            <WaterAddModal
              isOpen={showWaterAddModal}
              onClose={() => setShowWaterAddModal(false)}
              onSaved={handleWaterAddSaved}
            />
          )}
          {waterEditTarget && (
            <WaterEditModal
              isOpen={!!waterEditTarget}
              record={waterEditTarget}
              onClose={() => setWaterEditTarget(null)}
              onSaved={handleWaterEditSaved}
            />
          )}
          {waterDetailTarget && (
            <WaterDetailModal
              isOpen={!!waterDetailTarget}
              record={waterDetailTarget}
              onClose={() => setWaterDetailTarget(null)}
            />
          )}
          <WaterExportModal
            isOpen={showWaterExportModal}
            onClose={() => setShowWaterExportModal(false)}
            selectedCount={waterSelectedIds.length > 0 ? waterSelectedIds.length : waterItems.length}
            onConfirm={handleWaterExportConfirm}
          />
          {/* 浇水删除确认（与施肥一致用 DeleteConfirmModal） */}
          <DeleteConfirmModal
            isOpen={showWaterDeleteModal}
            selectedCount={waterSelectedIds.length}
            onClose={() => setShowWaterDeleteModal(false)}
            onConfirm={handleWaterDeleteConfirm}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
