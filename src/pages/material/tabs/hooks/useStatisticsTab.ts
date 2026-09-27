// useStatisticsTab Hook
// 提取 StatisticsTab 的所有状态和筛选逻辑
// V2.0: 数据从 useStatisticsStore 获取（替代 mock 数据）
import { useState, useMemo, useEffect } from 'react';
import {
  useStatisticsStore,
  getMonthSummariesWithActual,
  getYearTotalQuantity,
  getYearTotalAmount,
  getSingleMonthTableData,
  getMonthDetails,
  getTrendTotalByMonth,
  getCategorySummaryByYear,
  type MaterialStatItem,
} from '@/stores';
import { todayLocal } from '@/lib/dateUtils';
import { logger } from '@/lib/logger';
import type {
  StatActiveTab,
  QuickFilterPeriod,
  DateRange,
  SortConfig,
  MonthStats,
  ExportTarget,
  ExportFileType,
  MonthSummary,
} from '../types/statisticsTab.types';
import type { MonthDetailRow, MonthlyStatItem } from '@/stores/useStatisticsStore';
import { showAlert } from '@/lib/dialogService';

// 默认日期范围常量
const DEFAULT_DATE_RANGE: DateRange = { start: '2026-01-01', end: '2026-12-31' };

export function useStatisticsTab() {
  // ============================================
  // 从 Store 获取统计数据（V2.0 架构）
  // ============================================
  const materialStatisticsData = useStatisticsStore((s) => s.materialStatistics);
  const monthlyStatisticsData = useStatisticsStore((s) => s.monthlyStatistics);
  const categorySummary = useStatisticsStore((s) => s.categorySummary);
  const categoryTrend = useStatisticsStore((s) => s.categoryTrend);
  const fetchStatistics = useStatisticsStore((s) => s.fetchStatistics);

  useEffect(() => { fetchStatistics(); }, [fetchStatistics]);

  // 2026-09-27 审计修复（B3）：挂载时执行一次"本月"快捷筛选——
  // 此前 statQuickFilterPeriod 标签显示"本月"，但 dateRange 初始是 2026 全年（状态撒谎）
  useEffect(() => {
    handleStatQuickFilter('currentMonth');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // 从统计数据中聚合筛选选项（替代硬编码 mock 列表）
  // ============================================
  const filterOptions = useMemo(() => {
    const departments = new Set<string>();
    const categories = new Set<string>();
    const suppliers = new Set<string>();
    const productionPlans = new Set<string>();
    const usageAreas = new Set<string>();
    const requisitioners = new Set<string>();
    materialStatisticsData.forEach((item: MaterialStatItem) => {
      if (item.requisitionDepartment) departments.add(item.requisitionDepartment);
      if (item.category) categories.add(item.category);
      if (item.supplier) suppliers.add(item.supplier);
      if (item.productionPlanBatchCode) productionPlans.add(item.productionPlanBatchCode);
      if (item.usageArea) usageAreas.add(item.usageArea);
      if (item.requisitioner) requisitioners.add(item.requisitioner);
    });
    return {
      departments: Array.from(departments).sort(),
      categories: Array.from(categories).sort(),
      suppliers: Array.from(suppliers).sort(),
      productionPlans: Array.from(productionPlans).sort(),
      usageAreas: Array.from(usageAreas).sort(),
      requisitioners: Array.from(requisitioners).sort(),
    };
  }, [materialStatisticsData]);

  // 2026-09-27 审计修复（B6）：月度汇总部门筛选选项（从 monthlyStatistics 聚合）
  const monthlyDeptOptions = useMemo(() => {
    const set = new Set<string>();
    monthlyStatisticsData.forEach((m: MonthlyStatItem) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [monthlyStatisticsData]);

  // ============================================
  // 主Tab状态
  // ============================================
  const [statActiveTab, setStatActiveTab] = useState<StatActiveTab>('monthly');

  // ============================================
  // 通用筛选条件
  // ============================================
  const [statDepartmentFilter, setStatDepartmentFilter] = useState<string[]>([]);
  const [statDateRange, setStatDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [statCategoryFilter, setStatCategoryFilter] = useState<string[]>([]);
  const [statWarehouseFilter, setStatWarehouseFilter] = useState<string[]>([]);

  // ============================================
  // 物料统计新增筛选条件
  // ============================================
  const [statMaterialSearch, setStatMaterialSearch] = useState<string>('');
  const [statSupplierFilter, setStatSupplierFilter] = useState<string[]>([]);
  const [statProductionPlanFilter, setStatProductionPlanFilter] = useState<string[]>([]);
  const [statUsageAreaFilter, setStatUsageAreaFilter] = useState<string[]>([]);
  const [statRequisitionerFilter, setStatRequisitionerFilter] = useState<string[]>([]);

  // ============================================
  // 领料物料统计过滤后的数据
  // ============================================
  const materialStatFilteredData = useMemo(() => {
    return materialStatisticsData.filter((item: MaterialStatItem) => {
      // 日期范围筛选
      if (item.requisitionTime) {
        if (item.requisitionTime < statDateRange.start || item.requisitionTime > statDateRange.end) return false;
      }
      // 部门筛选
      if (statDepartmentFilter.length > 0 && !statDepartmentFilter.includes(item.requisitionDepartment)) return false;
      // 分类筛选
      if (statCategoryFilter.length > 0 && !statCategoryFilter.includes(item.category)) return false;
      // 仓库筛选
      if (statWarehouseFilter.length > 0 && !statWarehouseFilter.includes(item.mainWarehouse)) return false;
      // 物料编码/名称搜索（模糊匹配）
      if (statMaterialSearch) {
        const search = statMaterialSearch.toLowerCase();
        if (!item.materialCode.toLowerCase().includes(search) && !item.materialName.toLowerCase().includes(search)) return false;
      }
      // 供应商筛选
      if (statSupplierFilter.length > 0 && !statSupplierFilter.includes(item.supplier)) return false;
      // 生产计划批次筛选
      if (statProductionPlanFilter.length > 0 && !statProductionPlanFilter.includes(item.productionPlanBatchCode)) return false;
      // 用途/区域筛选
      if (statUsageAreaFilter.length > 0 && !statUsageAreaFilter.includes(item.usageArea)) return false;
      // 领料人筛选
      if (statRequisitionerFilter.length > 0 && !statRequisitionerFilter.includes(item.requisitioner)) return false;
      return true;
    });
  }, [
    materialStatisticsData,
    statDateRange,
    statDepartmentFilter,
    statCategoryFilter,
    statWarehouseFilter,
    statMaterialSearch,
    statSupplierFilter,
    statProductionPlanFilter,
    statUsageAreaFilter,
    statRequisitionerFilter,
  ]);

  // ============================================
  // 月份切换器状态（仪表盘用）
  // ============================================
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // ============================================
  // 快捷筛选周期状态
  // ============================================
  const [statQuickFilterPeriod, setStatQuickFilterPeriod] = useState<QuickFilterPeriod>('currentMonth');

  // ============================================
  // 月度汇总表格专用筛选状态
  // ============================================
  const [statYearFilter, setStatYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [statMonthFilter, setStatMonthFilter] = useState<string>('all');
  // 2026-09-27 审计修复（B6）：月度汇总按部门筛选
  const [statMonthlyDeptFilter, setStatMonthlyDeptFilter] = useState<string>('all');

  // 2026-09-27 审计修复（A1）：当前年份的分类汇总（环形图/卡片随年份联动）
  const statYearCategorySummary = useMemo(
    () => getCategorySummaryByYear(statYearFilter, categoryTrend, categorySummary),
    [statYearFilter, categoryTrend, categorySummary]
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'month', direction: 'asc' });

  // ============================================
  // 分页
  // ============================================
  const [statCurrentPage, setStatCurrentPage] = useState(1);
  const [statPageSize, setStatPageSize] = useState(10);

  // ============================================
  // 导出
  // ============================================
  const [statExportMode, setStatExportMode] = useState(false);
  const [statSelectedRows, setStatSelectedRows] = useState<number[]>([]);
  const [statShowExportTypeModal, setStatShowExportTypeModal] = useState(false);
  const [statExportFileType, setStatExportFileType] = useState<ExportFileType>('xlsx');
  const [statExportTarget, setStatExportTarget] = useState<ExportTarget>('monthly');

  // ============================================
  // 弹窗
  // ============================================
  const [statShowDetailModal, setStatShowDetailModal] = useState(false);
  const [statSelectedRecord, setStatSelectedRecord] = useState<MaterialStatItem | null>(null);

  // ============================================
  // 大棚/大田/批次/对比筛选
  // ============================================
  const [statGreenhouseTypeFilter, setStatGreenhouseTypeFilter] = useState<string>('all');
  const [statGreenhouseFilter, setStatGreenhouseFilter] = useState<string[]>([]);
  const [statFieldFilter, setStatFieldFilter] = useState<string[]>([]);
  const [statBatchFilter, setStatBatchFilter] = useState<string>('');
  const [statComparisonPeriod, setStatComparisonPeriod] = useState<string>('none');

  // ============================================
  // 快捷筛选处理函数
  // ============================================
  const handleStatQuickFilter = (period: string) => {
    setStatQuickFilterPeriod(period as QuickFilterPeriod);
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'currentWeek': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        // 2026-09-27 审计修复（A4）：业务日期用本地时区（todayLocal），
        // 此前 toISOString() 是 UTC——北京时间 0-8 点会取到昨天
        start = todayLocal(weekStart);
        end = todayLocal(now);
        break;
      }
      case 'currentMonth':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = todayLocal(now);
        break;
      case 'currentQuarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = todayLocal(now);
        break;
      }
      case 'currentYear':
        start = `${now.getFullYear()}-01-01`;
        end = `${now.getFullYear()}-12-31`;
        break;
    }

    setStatDateRange({ start, end });
    setStatCurrentPage(1);
  };

  // ============================================
  // 重置筛选处理函数
  // ============================================
  const handleStatReset = () => {
    setStatDepartmentFilter([]);
    setStatDateRange(DEFAULT_DATE_RANGE);
    setStatCategoryFilter([]);
    setStatWarehouseFilter([]);
    setStatBatchFilter('');
    setStatComparisonPeriod('none');
    setStatCurrentPage(1);
    setStatYearFilter(String(new Date().getFullYear()));
    setStatMonthFilter('all');
    setStatMaterialSearch('');
    setStatSupplierFilter([]);
    setStatProductionPlanFilter([]);
    setStatUsageAreaFilter([]);
    setStatRequisitionerFilter([]);
    setStatQuickFilterPeriod('currentMonth');
    setStatMonthlyDeptFilter('all');
    setExpandedMonths(new Set());
    setSortConfig({ key: 'month', direction: 'asc' });
  };

  // ============================================
  // 2026-09-27 审计修复（B2）：数据刷新——手动刷新 + 主 tab 切到统计时自动刷新
  // 此前 fetchStatistics 仅挂载执行一次，申请/出库操作后统计数据永远不更新
  // ============================================
  const [statRefreshing, setStatRefreshing] = useState(false);
  const refreshStatistics = async () => {
    setStatRefreshing(true);
    try {
      await fetchStatistics();
    } finally {
      setStatRefreshing(false);
    }
  };
  useEffect(() => {
    const handler = () => { void refreshStatistics(); };
    window.addEventListener('material-statistics-refresh', handler);
    return () => window.removeEventListener('material-statistics-refresh', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatistics]);

  // ============================================
  // 月度汇总表格辅助函数
  // ============================================
  const toggleMonthExpand = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  // 重置展开的月份
  const resetExpandedMonths = () => {
    setExpandedMonths(new Set());
  };

  const handleMonthSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortedMonthSummaries = () => {
    // 2026-09-27 审计修复（A2+B6）：月度汇总改用 monthlyStatistics 真实数据
    // （实发量/差异率/真实金额），支持按部门筛选
    // 2026-09-27 修复（B6）：部门筛选下沉到聚合函数（按部门过滤后再按月聚合）
    const data = getMonthSummariesWithActual(
      statYearFilter, monthlyStatisticsData, categoryTrend,
      statMonthlyDeptFilter === 'all' ? undefined : statMonthlyDeptFilter
    );
    const key = sortConfig.key;
    const sorted = [...data].sort((a, b) => {
      if (a[key as keyof typeof a] < b[key as keyof typeof b]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[key as keyof typeof a] > b[key as keyof typeof b]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // ============================================
  // 月度统计辅助函数 - 排名/占比/环比/同比
  // ============================================
  const getMonthStats = (month: string): MonthStats => {
    const allMonthSummaries = getSortedMonthSummaries();
    const yearTotalQty = getYearTotalQuantity(statYearFilter, categoryTrend);
    const sortedByQty = [...allMonthSummaries].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const rank = sortedByQty.findIndex(m => m.month === month) + 1;
    const currentData = allMonthSummaries.find(m => m.month === month);
    const percent = yearTotalQty > 0 ? ((currentData?.totalQuantity || 0) / yearTotalQty * 100).toFixed(1) + '%' : '0.0%';

    const [year, m] = month.split('-');
    const monthNum = parseInt(m);
    let qoq = '-';
    if (monthNum > 1) {
      const prevMonth = `${year}-${String(monthNum - 1).padStart(2, '0')}`;
      const prevData = allMonthSummaries.find(am => am.month === prevMonth);
      if (prevData && prevData.totalQuantity > 0) {
        const change = ((currentData?.totalQuantity || 0) - prevData.totalQuantity) / prevData.totalQuantity * 100;
        qoq = change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
      }
    }

    let yoy = '-';
    // 2026-09-27 审计修复（A3）：此前在"本年度过滤后的列表"里查上年度月份恒查不到（同比恒 '-'），
    // 改为从全量 categoryTrend 取去年同月总量
    const lastYearMonth = `${parseInt(year) - 1}-${m}`;
    const lastYearQty = getTrendTotalByMonth(lastYearMonth, categoryTrend);
    if (lastYearQty > 0) {
      const change = ((currentData?.totalQuantity || 0) - lastYearQty) / lastYearQty * 100;
      yoy = change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    }

    return { rank, percent, qoq, yoy };
  };

  const getCategoryStats = (detailQty: number, monthQty: number): string => {
    const percent = monthQty > 0 ? ((detailQty / monthQty) * 100).toFixed(1) + '%' : '0.0%';
    return percent;
  };

  // ============================================
  // 导出相关函数
  // ============================================
  const getAllMonthKeys = (): number[] => {
    if (statMonthFilter !== 'all') {
      return getSingleMonthTableData(statYearFilter, statMonthFilter, categoryTrend, categorySummary).map((_, idx) => idx);
    }
    return getSortedMonthSummaries().map((_, idx) => idx);
  };

  const handleStatSelectAll = () => {
    const allKeys = getAllMonthKeys();
    if (statSelectedRows.length === allKeys.length) {
      setStatSelectedRows([]);
    } else {
      setStatSelectedRows(allKeys);
    }
  };

  const handleStatCancelExport = () => {
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  const handleStatExportConfirm = () => {
    if (statSelectedRows.length === 0) {
      showAlert('请选择要导出的数据');
      return;
    }
    setStatExportTarget('monthly');
    setStatShowExportTypeModal(true);
  };

  const handleMaterialStatExportConfirm = () => {
    if (statSelectedRows.length === 0) {
      showAlert('请选择要导出的数据');
      return;
    }
    setStatExportTarget('material');
    setStatShowExportTypeModal(true);
  };

  const handleMaterialStatCancelExport = () => {
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  const handleMaterialStatSelectAll = () => {
    if (statSelectedRows.length === materialStatFilteredData.length) {
      setStatSelectedRows([]);
    } else {
      setStatSelectedRows(materialStatFilteredData.map((_, idx) => idx));
    }
  };

  // ============================================
  // 月度统计确认导出
  // ============================================
  const confirmStatExport = async () => {
    const escapeCSV = (str: string): string => {
      if (str === null || str === undefined) return '';
      const strValue = String(str);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return '"' + strValue.replace(/"/g, '""') + '"';
      }
      return strValue;
    };

    let content = '';
    let mimeType = '';
    let extension = '';

    const headers = ['月份', '物料分类', '领料数量', '领料金额', '排名', '占比', '环比变化', '同比变化'];
    const allMonthSummaries = getSortedMonthSummaries();
    const yearTotalQty = getYearTotalQuantity(statYearFilter, categoryTrend);
    const yearTotalAmt = getYearTotalAmount(statYearFilter, categoryTrend, categorySummary);
    // 2026-09-27：selectedData 可能是月份汇总行或单月分类明细行，导出按公共字段读取
    const selectedData: any[] = statMonthFilter === 'all'
      ? statSelectedRows.map(idx => allMonthSummaries[idx]).filter(Boolean)
      : getSingleMonthTableData(statYearFilter, statMonthFilter, categoryTrend, categorySummary).filter((_, idx) => statSelectedRows.includes(idx));

    const sortedByQty = [...allMonthSummaries].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const sortedByAmt = [...allMonthSummaries].sort((a, b) => b.totalAmount - a.totalAmount);

    const getMonthRank = (month: string, sortBy: 'qty' | 'amt') => {
      const arr = sortBy === 'qty' ? sortedByQty : sortedByAmt;
      const idx = arr.findIndex(m => m.month === month);
      return idx >= 0 ? idx + 1 : '-';
    };

    const getMonthPercent = (qty: number) => {
      if (yearTotalQty === 0) return '0.00%';
      return ((qty / yearTotalQty) * 100).toFixed(2) + '%';
    };

    const getPrevMonth = (month: string) => {
      const monthNum = parseInt(month.split('-')[1]);
      if (monthNum === 1) return null;
      const prevMonth = monthNum - 1;
      return `${month.split('-')[0]}-${String(prevMonth).padStart(2, '0')}`;
    };

    const getNextMonth = (month: string) => {
      const monthNum = parseInt(month.split('-')[1]);
      if (monthNum === 12) return null;
      const nextMonth = monthNum + 1;
      return `${month.split('-')[0]}-${String(nextMonth).padStart(2, '0')}`;
    };

    const getMonthQoQ = (month: string) => {
      const prev = getPrevMonth(month);
      if (!prev) return '-';
      const prevData = allMonthSummaries.find(m => m.month === prev);
      if (!prevData || prevData.totalQuantity === 0) return '-';
      const curr = allMonthSummaries.find(m => m.month === month);
      if (!curr) return '-';
      const change = ((curr.totalQuantity - prevData.totalQuantity) / prevData.totalQuantity) * 100;
      return change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    };

    const getMonthYoY = (month: string) => {
      const [year, m] = month.split('-');
      const lastYearMonth = `${parseInt(year) - 1}-${m}`;
      const lastYearData = allMonthSummaries.find(m => m.month === lastYearMonth);
      if (!lastYearData || lastYearData.totalQuantity === 0) return '-';
      const curr = allMonthSummaries.find(m => m.month === month);
      if (!curr) return '-';
      const change = ((curr.totalQuantity - lastYearData.totalQuantity) / lastYearData.totalQuantity) * 100;
      return change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    };

    const getCategoryPercent = (detailQty: number, monthQty: number) => {
      if (monthQty === 0) return '0.00%';
      return ((detailQty / monthQty) * 100).toFixed(2) + '%';
    };

    const formatDate = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    if (statExportFileType === 'csv') {
      let csvContent = '﻿';
      csvContent += `月度领料统计\n`;
      csvContent += `年度,${statYearFilter}年\n`;
      csvContent += `筛选条件,${statMonthFilter === 'all' ? '全部月份' : statMonthFilter + '月'}\n`;
      csvContent += `导出时间,${formatDate()}\n`;
      csvContent += `\n`;
      csvContent += headers.map(h => escapeCSV(h)).join(',') + '\n';
      selectedData.forEach((row) => {
        csvContent += `${escapeCSV(row.monthName)},合计,${escapeCSV(row.totalQuantity.toString())},${escapeCSV(row.totalAmount.toString())},${escapeCSV(getMonthRank(row.month, 'qty').toString())},${escapeCSV(getMonthPercent(row.totalQuantity))},${escapeCSV(getMonthQoQ(row.month))},${escapeCSV(getMonthYoY(row.month))}\n`;
        getMonthDetails(row.month, categoryTrend, categorySummary).forEach((detail: any) => {
          csvContent += `,,${escapeCSV(detail.categoryName)},${escapeCSV(detail.quantity.toString())},${escapeCSV(detail.amount.toString())},,${escapeCSV(getCategoryPercent(detail.quantity, row.totalQuantity))},,\n`;
        });
      });
      csvContent += `\n`;
      csvContent += `合计,,,,${escapeCSV(yearTotalQty.toString())},${escapeCSV(yearTotalAmt.toString())}\n`;
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (statExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>月度领料统计</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">年度：${statYearFilter}年 | 筛选条件：${statMonthFilter === 'all' ? '全部月份' : statMonthFilter + '月'} | 导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #ccc;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach((row) => {
        tableContent += `<tr style="background-color:#fef3c7;font-weight:bold;">`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.monthName}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">合计</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${row.totalQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${row.totalAmount.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthRank(row.month, 'qty')}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthPercent(row.totalQuantity)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthQoQ(row.month)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthYoY(row.month)}</td>`;
        tableContent += `</tr>`;
        getMonthDetails(row.month, categoryTrend, categorySummary).forEach((detail: any) => {
          tableContent += `<tr>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;">${detail.categoryName}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${detail.quantity.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${detail.amount.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getCategoryPercent(detail.quantity, row.totalQuantity)}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `</tr>`;
        });
      });
      tableContent += `<tr style="background-color:#d1fae5;font-weight:bold;">`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;" colspan="2">年度合计</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${yearTotalQty.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${yearTotalAmt.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `</tr>`;
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (statExportFileType === 'doc') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>月度领料统计</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">年度：${statYearFilter}年 | 筛选条件：${statMonthFilter === 'all' ? '全部月份' : statMonthFilter + '月'} | 导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #000;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach((row) => {
        tableContent += `<tr style="background-color:#fef3c7;font-weight:bold;">`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.monthName}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">合计</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${row.totalQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${row.totalAmount.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthRank(row.month, 'qty')}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthPercent(row.totalQuantity)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthQoQ(row.month)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthYoY(row.month)}</td>`;
        tableContent += `</tr>`;
        getMonthDetails(row.month, categoryTrend, categorySummary).forEach((detail: any) => {
          tableContent += `<tr>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;">${detail.categoryName}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${detail.quantity.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${detail.amount.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getCategoryPercent(detail.quantity, row.totalQuantity)}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `</tr>`;
        });
      });
      tableContent += `<tr style="background-color:#d1fae5;font-weight:bold;">`;
      tableContent += `<td style="padding:8px;border:1px solid #000;" colspan="2">年度合计</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${yearTotalQty.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${yearTotalAmt.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `</tr>`;
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `月度领料统计_${statYearFilter}年_${statMonthFilter === 'all' ? '全部' : statMonthFilter + '月'}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: statExportFileType.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] },
          }],
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
      logger.error('Export failed', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setStatShowExportTypeModal(false);
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // ============================================
  // 物料统计执行导出
  // ============================================
  const confirmMaterialStatExport = async () => {
    const escapeCSV = (str: string): string => {
      if (str === null || str === undefined) return '';
      const strValue = String(str);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return '"' + strValue.replace(/"/g, '""') + '"';
      }
      return strValue;
    };

    let content = '';
    let mimeType = '';
    let extension = '';

    const headers = ['物料编号', '物料名称', '分类', '规格型号', '条形码', '单位', '供应商', '批次号', '生产日期', '有效期至', '领料部门', '用途/区域', '领料人', '领料时间', '领料次数', '总数量', '实际数量', '总金额', '主要仓库'];
    const selectedData = statSelectedRows.map(idx => materialStatisticsData[idx]).filter(Boolean);

    const formatDate = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    if (statExportFileType === 'csv') {
      let csvContent = '﻿';
      csvContent += `领料统计表\n`;
      csvContent += `导出时间,${formatDate()}\n`;
      csvContent += `\n`;
      csvContent += headers.map(h => escapeCSV(h)).join(',') + '\n';
      selectedData.forEach((row: MaterialStatItem) => {
        csvContent += `${escapeCSV(row.materialCode)},${escapeCSV(row.materialName)},${escapeCSV(row.category)},${escapeCSV(row.spec)},${escapeCSV(row.barcode)},${escapeCSV(row.unit)},${escapeCSV(row.supplier)},${escapeCSV(row.batchCode)},${escapeCSV(row.productionDate)},${escapeCSV(row.expiryDate)},${escapeCSV(row.requisitionDepartment)},${escapeCSV(row.usageArea)},${escapeCSV(row.requisitioner)},${escapeCSV(row.requisitionTime)},${escapeCSV(row.requisitionCount.toString())},${escapeCSV(row.totalQuantity.toString())},${escapeCSV(row.actualQuantity.toString())},${escapeCSV(row.totalAmount.toString())},${escapeCSV(row.mainWarehouse)}\n`;
      });
      csvContent += `\n`;
      csvContent += `合计,,,,,,,,,,,,,,,${escapeCSV(selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.requisitionCount, 0).toString())},${escapeCSV(selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.totalQuantity, 0).toString())},${escapeCSV(selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.actualQuantity, 0).toString())},${escapeCSV(selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.totalAmount, 0).toString())}\n`;
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (statExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>领料统计表</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #ccc;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach((row: MaterialStatItem, idx: number) => {
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        tableContent += `<tr style="background-color:${bgColor};">`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.materialCode}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.materialName}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.category}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.spec}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.barcode}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${row.unit}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.supplier}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.batchCode}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.productionDate}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.expiryDate}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.requisitionDepartment}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.usageArea}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.requisitioner}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.requisitionTime}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${row.requisitionCount}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${row.totalQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${row.actualQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${row.totalAmount.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.mainWarehouse}</td>`;
        tableContent += `</tr>`;
      });
      tableContent += `<tr style="background-color:#d1fae5;font-weight:bold;">`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;" colspan="14">合计</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.requisitionCount, 0)}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.totalQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.actualQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.totalAmount, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `</tr>`;
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (statExportFileType === 'doc') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>领料统计表</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #000;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach((row: MaterialStatItem, idx: number) => {
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        tableContent += `<tr style="background-color:${bgColor};">`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.materialCode}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.materialName}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.category}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.spec}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.barcode}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${row.unit}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.supplier}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.batchCode}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.productionDate}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.expiryDate}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.requisitionDepartment}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.usageArea}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.requisitioner}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.requisitionTime}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${row.requisitionCount}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${row.totalQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${row.actualQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${row.totalAmount.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.mainWarehouse}</td>`;
        tableContent += `</tr>`;
      });
      tableContent += `<tr style="background-color:#d1fae5;font-weight:bold;">`;
      tableContent += `<td style="padding:8px;border:1px solid #000;" colspan="14">合计</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.requisitionCount, 0)}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.totalQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.actualQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${selectedData.reduce((sum: number, r: MaterialStatItem) => sum + r.totalAmount, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `</tr>`;
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `领料统计表_${formatDate().replace(/[:\s]/g, '')}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: statExportFileType.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] },
          }],
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
      logger.error('Export failed', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setStatShowExportTypeModal(false);
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // ============================================
  // 返回所有状态和函数
  // ============================================
  return {
    // 状态
    statActiveTab,
    statDepartmentFilter,
    statDateRange,
    statCategoryFilter,
    statWarehouseFilter,
    statMaterialSearch,
    statSupplierFilter,
    statProductionPlanFilter,
    statUsageAreaFilter,
    statRequisitionerFilter,
    statQuickFilterPeriod,
    statYearFilter,
    statMonthFilter,
    // 2026-09-27 审计修复：部门筛选 / 年份分类汇总 / 刷新
    statMonthlyDeptFilter,
    setStatMonthlyDeptFilter,
    monthlyDeptOptions,
    statYearCategorySummary,
    statRefreshing,
    refreshStatistics,
    expandedMonths,
    sortConfig,
    statCurrentPage,
    statPageSize,
    statExportMode,
    statSelectedRows,
    statShowExportTypeModal,
    statExportFileType,
    statExportTarget,
    statShowDetailModal,
    statSelectedRecord,
    selectedMonth,
    statGreenhouseTypeFilter,
    statGreenhouseFilter,
    statFieldFilter,
    statBatchFilter,
    statComparisonPeriod,

    // 筛选选项（从真实数据派生）
    filterOptions,

    // 过滤后的数据
    materialStatFilteredData,

    // 设置函数
    setStatActiveTab,
    setStatDepartmentFilter,
    setStatDateRange,
    setStatCategoryFilter,
    setStatWarehouseFilter,
    setStatMaterialSearch,
    setStatSupplierFilter,
    setStatProductionPlanFilter,
    setStatUsageAreaFilter,
    setStatRequisitionerFilter,
    setStatQuickFilterPeriod,
    setStatYearFilter,
    setStatMonthFilter,
    setStatCurrentPage,
    setStatPageSize,
    setStatExportMode,
    setStatSelectedRows,
    setStatShowExportTypeModal,
    setStatExportFileType,
    setStatExportTarget,
    setStatShowDetailModal,
    setStatSelectedRecord,
    setSelectedMonth,
    setStatGreenhouseTypeFilter,
    setStatGreenhouseFilter,
    setStatFieldFilter,
    setStatBatchFilter,
    setStatComparisonPeriod,

    // 辅助函数
    handleStatQuickFilter,
    handleStatReset,
    toggleMonthExpand,
    resetExpandedMonths,
    handleMonthSort,
    getSortedMonthSummaries,
    getMonthStats,
    getCategoryStats,
    getAllMonthKeys,
    handleStatSelectAll,
    handleStatCancelExport,
    handleStatExportConfirm,
    confirmStatExport,
    handleMaterialStatExportConfirm,
    handleMaterialStatCancelExport,
    handleMaterialStatSelectAll,
    confirmMaterialStatExport,
  };
}
