/**
 * 批次汇总页面 - 种植批次全生命周期汇总
 * 包含：KPI指标卡片 + 甘特图 + 批次汇总表 + 详情抽屉
 * 数据源：useSummaryDataStore（Zustand Store）
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { PageHeader, KpiCard, KpiCardGrid, DetailDrawer } from '../../components/summary';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { useSummaryDataStore } from '../../stores';
import type { BatchStatItem } from '../../stores';

// ========== 状态筛选选项 ==========

const STATUS_FILTER_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'planning', label: '规划中' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '逾期' },
];

// ========== 状态 Badge 样式映射 ==========

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  planning: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-600',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  planning: '规划中',
  published: '已发布',
  in_progress: '进行中',
  completed: '已完成',
  overdue: '已逾期',
};

// ========== 甘特图颜色映射 ==========

const GANTT_COLORS: Record<string, { bg: string; isAnimated?: boolean }> = {
  draft: { bg: 'bg-gray-300' },
  planning: { bg: 'bg-gray-400' },
  published: { bg: 'bg-blue-400' },
  in_progress: { bg: 'bg-purple-500' },
  completed: { bg: 'bg-emerald-500' },
  overdue: { bg: 'bg-red-500', isAnimated: true },
};

/** 格式化金额为千分位 */
function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' 元';
}

/** 格式化数字 */
function formatNumber(value: number): string {
  return value?.toLocaleString('zh-CN') || '0';
}

/** 解析日期字符串为 Date 对象 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** 日期天数差 */
function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface BatchSummaryProps { hideHeader?: boolean; }

export default function BatchSummary({ hideHeader }: BatchSummaryProps) {
  // ========== Store ==========
  const batchItems = useSummaryDataStore((s) => s.batchItems);
  const fetchBatchStats = useSummaryDataStore((s) => s.fetchBatchStats);
  const isLoading = useSummaryDataStore((s) => s.isLoading);

  // ========== 本地状态 ==========
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchStatItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ========== 初始加载 ==========
  useEffect(() => {
    fetchBatchStats({});
  }, [fetchBatchStats]);

  // ========== 筛选后的批次数据 ==========
  const filteredBatches = useMemo(() => {
    if (!statusFilter) return batchItems;
    return batchItems.filter((b) => b.status === statusFilter);
  }, [batchItems, statusFilter]);

  // ========== KPI 计算 ==========
  const kpiCounts = useMemo(() => {
    const planning = batchItems.filter((b) => b.status === 'planning').length;
    const inProgress = batchItems.filter((b) => b.status === 'in_progress').length;
    const completed = batchItems.filter((b) => b.status === 'completed').length;
    const overdue = batchItems.filter((b) => b.status === 'overdue').length;
    return {
      total: batchItems.length,
      planning,
      inProgress: inProgress + planning, // 进行中 = in_progress + planning
      completed,
      overdue,
    };
  }, [batchItems]);

  // ========== 甘特图计算 ==========
  const ganttData = useMemo(() => {
    if (filteredBatches.length === 0) return { bars: [], minDate: new Date(), maxDate: new Date(), totalDays: 1 };

    // 找到最早和最晚日期
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const bars = filteredBatches.map((batch) => {
      const start = parseDate(batch.plantingDate);
      const endPlan = parseDate(batch.expectedHarvestDate);
      const endActual = parseDate(batch.actualHarvestDate);
      const end = (batch.status === 'completed' || batch.status === 'overdue') && endActual
        ? endActual
        : endPlan;

      if (start) {
        if (!minDate || start < minDate) minDate = start;
      }
      if (end) {
        if (!maxDate || end > maxDate) maxDate = end;
      }

      return {
        id: batch.id,
        batchCode: batch.batchCode,
        batchName: batch.batchName,
        start,
        end,
        status: batch.status,
        color: GANTT_COLORS[batch.status] || GANTT_COLORS.planning,
      };
    });

    const fallback = new Date();
    const effectiveMin = minDate || fallback;
    const effectiveMax = maxDate || new Date(fallback.getTime() + 30 * 24 * 60 * 60 * 1000);
    const totalDays = daysBetween(effectiveMin, effectiveMax) || 1;

    return { bars, minDate: effectiveMin, maxDate: effectiveMax, totalDays };
  }, [filteredBatches]);

  // ========== 打开批次详情 ==========
  const handleViewDetail = (batch: BatchStatItem) => {
    setSelectedBatch(batch);
    setDrawerOpen(true);
  };

  // ========== 刷新数据 ==========
  const handleRefresh = () => {
    fetchBatchStats(statusFilter ? { status: statusFilter } : {});
  };

  // ========== 筛选变更 ==========
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setShowFilterDropdown(false);
    fetchBatchStats(status ? { status } : {});
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 - purple 主题 */}
      {!hideHeader && (
        <div className="bg-white rounded-xl p-6 shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">批次汇总</h1>
              <p className="text-gray-500">种植批次全生命周期数据汇总与状态跟踪</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI 指标卡片 */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<Layers className="w-4 h-4 text-white" />}
          label="总批次"
          value={kpiCounts.total}
          colorScheme="slate"
          compact
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-white" />}
          label="进行中"
          value={kpiCounts.inProgress}
          trend={kpiCounts.total > 0 ? Math.round((kpiCounts.inProgress / kpiCounts.total) * 100) : 0}
          colorScheme="purple"
          compact
        />
        <KpiCard
          icon={<CheckCircle className="w-4 h-4 text-white" />}
          label="已完成"
          value={kpiCounts.completed}
          trend={kpiCounts.total > 0 ? Math.round((kpiCounts.completed / kpiCounts.total) * 100) : 0}
          colorScheme="emerald"
          compact
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-white" />}
          label="逾期"
          value={kpiCounts.overdue}
          colorScheme="red"
          compact
        />
      </KpiCardGrid>

      {/* 筛选器 + 刷新 */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-purple-300 transition-colors"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Filter className="w-4 h-4 text-purple-500" />
            <span>{STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label || '全部状态'}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showFilterDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-purple-50 transition-colors ${
                    statusFilter === opt.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700'
                  }`}
                  onClick={() => handleStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-purple-300 transition-colors"
          onClick={handleRefresh}
        >
          刷新数据
        </button>
      </div>

      {/* 批次甘特图（纯 CSS 实现） */}
      {ganttData.bars.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            批次甘特图
          </h2>
          {/* 图例 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-purple-500" /> 进行中
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-emerald-500" /> 已完成
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-red-500" /> 逾期
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded bg-gray-400" /> 规划中
            </div>
          </div>
          {/* 甘特图主体 */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {ganttData.bars.map((bar, idx) => {
                if (!bar.start || !bar.end) return null;
                const leftPct = Math.max(0, (daysBetween(ganttData.minDate, bar.start) / ganttData.totalDays) * 100);
                const widthPct = Math.max(1, (daysBetween(bar.start, bar.end) / ganttData.totalDays) * 100);
                return (
                  <div key={bar.id} className="flex items-center mb-2">
                    {/* 批次标签 */}
                    <div className="w-32 flex-shrink-0 text-xs text-gray-700 pr-3 truncate" title={bar.batchName}>
                      {bar.batchCode || bar.batchName}
                    </div>
                    {/* 甘特条轨道 */}
                    <div className="flex-1 h-8 relative bg-gray-100 rounded-full overflow-hidden">
                      {/* 甘特条 */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full ${bar.color.bg} ${
                          bar.color.isAnimated ? 'gantt-stripe-animated' : ''
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          minWidth: '4px',
                        }}
                      >
                        {/* 条内日期提示 */}
                        {widthPct > 8 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium truncate px-1">
                            {bar.start && formatDate(bar.start)} → {bar.end && formatDate(bar.end)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* 时间轴 */}
              <div className="flex items-center mt-3">
                <div className="w-32 flex-shrink-0" />
                <div className="flex-1 flex justify-between text-[10px] text-gray-400">
                  <span>{formatDate(ganttData.minDate)}</span>
                  <span>{formatDate(ganttData.maxDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          {isLoading ? '加载中...' : '暂无批次数据'}
        </div>
      )}

      {/* 批次汇总表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">批次明细数据</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">批次编号</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">批次名称</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">温室</TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">目标产量(kg)</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">实际产量(kg)</TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">完成率</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">总工时(h)</TableHead>
                <TableHead className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">人工成本(元)</TableHead>
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-300">
              {filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    {isLoading ? '加载中...' : '暂无批次数据'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="hover:bg-purple-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(batch)}
                  >
                    <TableCell className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                      {batch.batchCode}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{batch.batchName}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{batch.cropName}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{batch.greenhouse}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_BADGE[batch.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABEL[batch.status] || batch.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {formatNumber(batch.targetYield)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {formatNumber(batch.actualQuantity)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              batch.completionRate >= 100
                                ? 'bg-emerald-500'
                                : batch.completionRate >= 50
                                ? 'bg-purple-500'
                                : batch.completionRate >= 20
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(batch.completionRate || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {(batch.completionRate || 0).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {batch.totalWorkHours?.toFixed(1) || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {batch.laborCost ? formatCurrency(batch.laborCost) : '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-xs text-purple-600 hover:text-purple-800 font-medium">查看详情</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 批次详情抽屉 */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`批次详情 - ${selectedBatch?.batchCode || ''}`}
      >
        {selectedBatch && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">批次编号：</span>
                  <span className="text-gray-900 font-medium">{selectedBatch.batchCode}</span>
                </div>
                <div>
                  <span className="text-gray-400">批次名称：</span>
                  <span className="text-gray-900">{selectedBatch.batchName}</span>
                </div>
                <div>
                  <span className="text-gray-400">作物品种：</span>
                  <span className="text-gray-900">{selectedBatch.cropName}</span>
                </div>
                <div>
                  <span className="text-gray-400">品种：</span>
                  <span className="text-gray-900">{selectedBatch.variety || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">温室：</span>
                  <span className="text-gray-900">{selectedBatch.greenhouse}</span>
                </div>
                <div>
                  <span className="text-gray-400">种植面积：</span>
                  <span className="text-gray-900">{selectedBatch.plantingArea || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">状态：</span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_BADGE[selectedBatch.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_LABEL[selectedBatch.status] || selectedBatch.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 产量信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
                产量信息
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">目标产量：</span>
                  <span className="text-gray-900 font-medium">{formatNumber(selectedBatch.targetYield)} kg</span>
                </div>
                <div>
                  <span className="text-gray-400">实际产量：</span>
                  <span className="text-gray-900 font-medium">{formatNumber(selectedBatch.actualQuantity)} kg</span>
                </div>
                <div>
                  <span className="text-gray-400">采收数量：</span>
                  <span className="text-gray-900">{formatNumber(selectedBatch.harvestQuantity)} kg</span>
                </div>
                <div>
                  <span className="text-gray-400">剩余产量：</span>
                  <span className="text-gray-900">{formatNumber(selectedBatch.remainingYield)} kg</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">完成率：</span>
                  <div className="inline-flex items-center gap-2 ml-1">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${Math.min(selectedBatch.completionRate || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-900 font-medium">{(selectedBatch.completionRate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 日期信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
                时间节点
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">种植日期：</span>
                  <span className="text-gray-900">{selectedBatch.plantingDate || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">预计采收：</span>
                  <span className="text-gray-900">{selectedBatch.expectedHarvestDate || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">实际采收：</span>
                  <span className="text-gray-900">{selectedBatch.actualHarvestDate || '-'}</span>
                </div>
              </div>
            </div>

            {/* 任务信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
                任务统计
              </h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-bold text-purple-700">{selectedBatch.taskCount || 0}</p>
                  <p className="text-xs text-purple-500">总任务</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-700">{selectedBatch.completedTaskCount || 0}</p>
                  <p className="text-xs text-emerald-500">已完成</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-lg font-bold text-amber-700">{selectedBatch.pendingTaskCount || 0}</p>
                  <p className="text-xs text-amber-500">待处理</p>
                </div>
              </div>
            </div>

            {/* 成本信息 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">
                人力成本
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">总工时：</span>
                  <span className="text-gray-900 font-medium">
                    {selectedBatch.totalWorkHours ? selectedBatch.totalWorkHours.toFixed(1) + ' 小时' : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">人工成本：</span>
                  <span className="text-gray-900 font-medium">
                    {selectedBatch.laborCost ? formatCurrency(selectedBatch.laborCost) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* 甘特图动画样式 */}
      <style>{`
        @keyframes ganttStripe {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
        .gantt-stripe-animated {
          background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 5px,
            rgba(255,255,255,0.2) 5px,
            rgba(255,255,255,0.2) 10px
          );
          background-size: 20px 20px;
          animation: ganttStripe 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
