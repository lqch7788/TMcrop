import { useState } from 'react';
import { ClipboardList, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Plus, AlertTriangle, X, ClipboardCheck, BarChart3, DollarSign, FileText, RefreshCw, TrendingUp, TrendingDown, Package, MapPin, Calendar, BarChart2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// 从数据文件导入所有Mock数据
import {
  monthlyStatisticsData,
  materialStatisticsData,
  categorySummaryData,
  categoryTrendData,
  getMonthCategoryData,
  getMonthSummary,
  getMonthSummaries,
  getMonthDetails,
  getYearTotalQuantity,
  getYearTotalAmount,
  getSingleMonthTableData,
  getSingleMonthTotal,
} from '../../../data/materialReceivingData';

// 弹窗组件
import { ExportTypeModal } from '../../../components/materialReceiving/modals/ExportTypeModal';
import { StatDetailModal } from '../../../components/materialReceiving/modals/StatDetailModal';
import { StatSearchBar } from '../../../components/materialReceiving/stats/StatSearchBar';

// ============================================
// 领料统计页面状态
// ============================================
export default function StatisticsTab() {
  // 主Tab状态
  const [statActiveTab, setStatActiveTab] = useState<'monthly' | 'material'>('monthly');

  // 通用筛选条件
  const [statDepartmentFilter, setStatDepartmentFilter] = useState<string[]>([]);
  const [statDateRange, setStatDateRange] = useState<{ start: string; end: string }>({ start: '2026-01-01', end: '2026-12-31' });
  const [statCategoryFilter, setStatCategoryFilter] = useState<string[]>([]);
  const [statWarehouseFilter, setStatWarehouseFilter] = useState<string[]>([]);

  // 物料统计新增筛选条件
  const [statMaterialSearch, setStatMaterialSearch] = useState('');  // 物料编码/名称搜索
  const [statSupplierFilter, setStatSupplierFilter] = useState<string[]>([]);  // 供应商
  const [statBatchCodeFilter, setStatBatchCodeFilter] = useState<string[]>([]);  // 批次号
  const [statProductionPlanFilter, setStatProductionPlanFilter] = useState<string[]>([]);  // 生产计划批次
  const [statUsageAreaFilter, setStatUsageAreaFilter] = useState<string[]>([]);  // 用途/区域
  const [statRequisitionerFilter, setStatRequisitionerFilter] = useState<string[]>([]);  // 领料人

  // 领料物料统计过滤后的数据
  const materialStatFilteredData = materialStatisticsData.filter(item => {
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
    // 批次号筛选
    if (statBatchCodeFilter.length > 0 && !statBatchCodeFilter.includes(item.batchCode)) return false;
    // 生产计划批次筛选
    if (statProductionPlanFilter.length > 0 && !statProductionPlanFilter.includes(item.productionPlanBatchCode)) return false;
    // 用途/区域筛选
    if (statUsageAreaFilter.length > 0 && !statUsageAreaFilter.includes(item.usageArea)) return false;
    // 领料人筛选
    if (statRequisitionerFilter.length > 0 && !statRequisitionerFilter.includes(item.requisitioner)) return false;
    return true;
  });

  // 月份切换器状态（仪表盘用）
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // 快捷筛选周期状态
  const [statQuickFilterPeriod, setStatQuickFilterPeriod] = useState<string>('currentMonth');

  // 月度汇总表格专用筛选状态
  const [statYearFilter, setStatYearFilter] = useState<string>('2025');
  const [statMonthFilter, setStatMonthFilter] = useState<string>('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({ key: 'month', direction: 'asc' });

  // 分页
  const [statCurrentPage, setStatCurrentPage] = useState(1);
  const [statPageSize, setStatPageSize] = useState(10);

  // 导出
  const [statExportMode, setStatExportMode] = useState(false);
  const [statSelectedRows, setStatSelectedRows] = useState<number[]>([]);
  const [statShowExportTypeModal, setStatShowExportTypeModal] = useState(false);
  const [statExportFileType, setStatExportFileType] = useState('xlsx');
  const [statExportTarget, setStatExportTarget] = useState<'monthly' | 'material'>('monthly');

  // 弹窗
  const [statShowDetailModal, setStatShowDetailModal] = useState(false);
  const [statSelectedRecord, setStatSelectedRecord] = useState<any>(null);

  // ============================================
  // 统计相关函数
  // ============================================

  // 成本核算页面快捷筛选
  const handleStatQuickFilter = (period: string) => {
    setStatQuickFilterPeriod(period);
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'currentWeek': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        break;
      }
      case 'currentMonth':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
      case 'currentQuarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
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

  // 领料统计页面重置筛选
  const handleStatReset = () => {
    setStatDepartmentFilter([]);
    setStatDateRange({ start: '2026-01-01', end: '2026-12-31' });
    setStatCategoryFilter([]);
    setStatWarehouseFilter([]);
    setStatBatchFilter('');
    setStatComparisonPeriod('none');
    setStatCurrentPage(1);
    // 重置月度汇总专用筛选
    setStatYearFilter('2026');
    setStatMonthFilter('all');
    // 重置新增的物料统计筛选
    setStatMaterialSearch('');
    setStatSupplierFilter([]);
    setStatBatchCodeFilter([]);
    setStatProductionPlanFilter([]);
    setStatUsageAreaFilter([]);
    setStatRequisitionerFilter([]);
    setStatQuickFilterPeriod('currentMonth');
    setExpandedMonths(new Set());
    setSortConfig({ key: 'month', direction: 'asc' });
  };

  // 大棚筛选
  const [statGreenhouseTypeFilter, setStatGreenhouseTypeFilter] = useState<string>('all');
  const [statGreenhouseFilter, setStatGreenhouseFilter] = useState<string[]>([]);

  // 大田筛选
  const [statFieldFilter, setStatFieldFilter] = useState<string[]>([]);

  // 批次筛选
  const [statBatchFilter, setStatBatchFilter] = useState<string>('');

  // 对比周期
  const [statComparisonPeriod, setStatComparisonPeriod] = useState<string>('none');

  // 月度汇总表格辅助函数
  const toggleMonthExpand = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const handleMonthSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedMonthSummaries = () => {
    const data = getMonthSummaries(statYearFilter);
    const key = sortConfig.key;
    const sorted = [...data].sort((a, b) => {
      if (a[key as keyof typeof a] < b[key as keyof typeof b]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[key as keyof typeof a] > b[key as keyof typeof b]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // 月度统计辅助函数 - 排名/占比/环比/同比
  const getMonthStats = (month: string) => {
    const allMonthSummaries = getSortedMonthSummaries();
    const yearTotalQty = getYearTotalQuantity(statYearFilter);
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
    const lastYearMonth = `${parseInt(year) - 1}-${m}`;
    const lastYearData = allMonthSummaries.find(am => am.month === lastYearMonth);
    if (lastYearData && lastYearData.totalQuantity > 0) {
      const change = ((currentData?.totalQuantity || 0) - lastYearData.totalQuantity) / lastYearData.totalQuantity * 100;
      yoy = change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    }

    return { rank, percent, qoq, yoy };
  };

  const getCategoryStats = (detailQty: number, monthQty: number) => {
    const percent = monthQty > 0 ? ((detailQty / monthQty) * 100).toFixed(1) + '%' : '0.0%';
    return percent;
  };

  // 获取所有月份数据的key（用于全选）
  const getAllMonthKeys = (): number[] => {
    if (statMonthFilter !== 'all') {
      return getSingleMonthTableData(statYearFilter, statMonthFilter).map((_, idx) => idx);
    }
    return getSortedMonthSummaries().map((_, idx) => idx);
  };

  // 月度统计全选
  const handleStatSelectAll = () => {
    const allKeys = getAllMonthKeys();
    if (statSelectedRows.length === allKeys.length) {
      setStatSelectedRows([]);
    } else {
      setStatSelectedRows(allKeys);
    }
  };

  // 月度统计取消导出
  const handleStatCancelExport = () => {
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // 月度统计确认导出
  const handleStatExportConfirm = async () => {
    if (statSelectedRows.length === 0) {
      alert('请选择要导出的数据');
      return;
    }
    setStatExportTarget('monthly');
    setStatShowExportTypeModal(true);
  };

  // 月度统计执行导出
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
    const yearTotalQty = getYearTotalQuantity(statYearFilter);
    const yearTotalAmt = getYearTotalAmount(statYearFilter);
    const selectedData = statMonthFilter === 'all'
      ? statSelectedRows.map(idx => allMonthSummaries[idx]).filter(Boolean)
      : getSingleMonthTableData(statYearFilter, statMonthFilter).filter((_, idx) => statSelectedRows.includes(idx));

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
      selectedData.forEach(row => {
        csvContent += `${escapeCSV(row.monthName)},合计,${escapeCSV(row.totalQuantity.toString())},${escapeCSV(row.totalAmount.toString())},${escapeCSV(getMonthRank(row.month, 'qty').toString())},${escapeCSV(getMonthPercent(row.totalQuantity))},${escapeCSV(getMonthQoQ(row.month))},${escapeCSV(getMonthYoY(row.month))}\n`;
        getMonthDetails(row.month).forEach(detail => {
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
      selectedData.forEach(row => {
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
        getMonthDetails(row.month).forEach(detail => {
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
      selectedData.forEach(row => {
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
        getMonthDetails(row.month).forEach(detail => {
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

    setStatShowExportTypeModal(false);
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // 物料统计确认导出
  const handleMaterialStatExportConfirm = () => {
    if (statSelectedRows.length === 0) {
      alert('请选择要导出的数据');
      return;
    }
    setStatExportTarget('material');
    setStatShowExportTypeModal(true);
  };

  // 物料统计取消导出
  const handleMaterialStatCancelExport = () => {
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // 物料统计全选
  const handleMaterialStatSelectAll = () => {
    if (statSelectedRows.length === materialStatFilteredData.length) {
      setStatSelectedRows([]);
    } else {
      setStatSelectedRows(materialStatFilteredData.map((_, idx) => idx));
    }
  };

  // 物料统计执行导出
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
      selectedData.forEach(row => {
        csvContent += `${escapeCSV(row.materialCode)},${escapeCSV(row.materialName)},${escapeCSV(row.category)},${escapeCSV(row.spec)},${escapeCSV(row.barcode)},${escapeCSV(row.unit)},${escapeCSV(row.supplier)},${escapeCSV(row.batchCode)},${escapeCSV(row.productionDate)},${escapeCSV(row.expiryDate)},${escapeCSV(row.requisitionDepartment)},${escapeCSV(row.usageArea)},${escapeCSV(row.requisitioner)},${escapeCSV(row.requisitionTime)},${escapeCSV(row.requisitionCount.toString())},${escapeCSV(row.totalQuantity.toString())},${escapeCSV(row.actualQuantity.toString())},${escapeCSV(row.totalAmount.toString())},${escapeCSV(row.mainWarehouse)}\n`;
      });
      csvContent += `\n`;
      csvContent += `合计,,,,,,,,,,,,,,,${escapeCSV(selectedData.reduce((sum, r) => sum + r.requisitionCount, 0).toString())},${escapeCSV(selectedData.reduce((sum, r) => sum + r.totalQuantity, 0).toString())},${escapeCSV(selectedData.reduce((sum, r) => sum + r.actualQuantity, 0).toString())},${escapeCSV(selectedData.reduce((sum, r) => sum + r.totalAmount, 0).toString())}\n`;
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (statExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>领料统计表</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #ccc;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach((row, idx) => {
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
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${selectedData.reduce((sum, r) => sum + r.requisitionCount, 0)}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${selectedData.reduce((sum, r) => sum + r.totalQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${selectedData.reduce((sum, r) => sum + r.actualQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${selectedData.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}</td>`;
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
      selectedData.forEach((row, idx) => {
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
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${selectedData.reduce((sum, r) => sum + r.requisitionCount, 0)}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${selectedData.reduce((sum, r) => sum + r.totalQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${selectedData.reduce((sum, r) => sum + r.actualQuantity, 0).toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${selectedData.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}</td>`;
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

    setStatShowExportTypeModal(false);
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // 领料统计页面计算统计卡片数据
  const getStatSummaryData = () => {
    const allData = statActiveTab === 'monthly' ? monthlyStatisticsData :
                     materialStatisticsData;

    const totalRequisitions = allData.reduce((sum, item: any) => sum + (item.requisitionCount || 0), 0);
    const totalQuantity = allData.reduce((sum, item: any) => sum + (item.totalQuantity || 0), 0);
    const totalAmount = allData.reduce((sum, item: any) => sum + (item.totalAmount || 0), 0);
    const avgDifferenceRate = allData.length > 0 ?
      allData.reduce((sum, item: any) => sum + (item.differenceRate || 0), 0) / allData.length : 0;

    return {
      requisitionCount: totalRequisitions,
      totalQuantity,
      totalAmount,
      avgDifferenceRate,
      yearOnYearChange: 5.2
    };
  };

  // ============================================
  // JSX - 统计Tab内容
  // ============================================
  return (
    <>
      {/* Tab切换 - 子Tab（统计页面内部） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-4 pb-0 mb-4">
        <div className="flex gap-6 border-b border-gray-200">
          <button
            onClick={() => { setStatActiveTab('monthly'); setStatCurrentPage(1); }}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all relative ${
              statActiveTab === 'monthly'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            月度汇总
            {statActiveTab === 'monthly' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => { setStatActiveTab('material'); setStatCurrentPage(1); }}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all relative ${
              statActiveTab === 'material'
                ? 'text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            分类汇总
            {statActiveTab === 'material' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>

        <div className="px-6 pt-6 pb-0">
          {/* 统计卡片区域 - 紧凑横向布局 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {/* 卡片1: 领料单数 */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs text-emerald-600/70">领料单数</div>
                  <div className="text-xl font-bold text-emerald-700">{getStatSummaryData().requisitionCount}</div>
                </div>
              </div>
            </div>

            {/* 卡片2: 领料总量 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs text-blue-600/70">领料总量</div>
                  <div className="text-xl font-bold text-blue-700">{getStatSummaryData().totalQuantity.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* 卡片3: 总金额 */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg p-3 border border-amber-200/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">¥</span>
                </div>
                <div>
                  <div className="text-xs text-amber-600/70">总金额</div>
                  <div className="text-xl font-bold text-amber-700">¥{getStatSummaryData().totalAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* 卡片4: 差异率 */}
            <div className={`bg-gradient-to-br rounded-lg p-3 border ${
              getStatSummaryData().avgDifferenceRate < 0
                ? 'from-green-50 to-green-100/50 border-green-200/50'
                : 'from-red-50 to-red-100/50 border-red-200/50'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  getStatSummaryData().avgDifferenceRate < 0 ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <TrendingDown className={`w-4 h-4 text-white ${getStatSummaryData().avgDifferenceRate >= 0 ? 'transform rotate-180' : ''}`} />
                </div>
                <div>
                  <div className={`text-xs ${getStatSummaryData().avgDifferenceRate < 0 ? 'text-green-600/70' : 'text-red-600/70'}`}>差异率</div>
                  <div className={`text-xl font-bold ${getStatSummaryData().avgDifferenceRate < 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {getStatSummaryData().avgDifferenceRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 仪表盘 - 仅月度汇总Tab显示 */}
          {statActiveTab === 'monthly' && (
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-6 mb-6 shadow-lg shadow-cyan-500/10">
              {/* 仪表盘主体 - 左侧环形图 + 右侧堆叠柱状图 */}
              <div className="grid grid-cols-12 gap-6 mb-6">
                {/* 左侧：环形图 */}
                <div className="col-span-3 bg-white/50 rounded-xl p-4 border border-gray-100">
                  <h5 className="font-semibold text-gray-700 mb-4 text-center">2025年领料分类占比</h5>
                  <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySummaryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categorySummaryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.solid} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.5)'
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value.toLocaleString()} 件`,
                            props.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* 环形图中心 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-gray-800">
                        {selectedMonth === 'all' ? '29,450' : '2,450'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedMonth === 'all' ? '年度总计' : '当月总计'}
                      </div>
                    </div>
                  </div>
                  {/* 分类列表 */}
                  <div className="mt-4 space-y-2">
                    {categorySummaryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}></span>
                          <span className="text-gray-600 truncate" title={item.name}>{item.name}</span>
                        </div>
                        <span className="font-medium text-gray-800">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 右侧：堆叠柱状图 / 单独月份分组柱状图 */}
                <div className="col-span-9 bg-white/50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-semibold text-gray-700">
                      月度用量趋势（按物料分类）
                      {selectedMonth !== 'all' && <span className="ml-2 text-cyan-600">- {selectedMonth.replace('2025-','')}月 各分类详情</span>}
                    </h5>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-8 px-3 bg-white/60 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="all">全部月份</option>
                      <option value="2025-01">1月</option>
                      <option value="2025-02">2月</option>
                      <option value="2025-03">3月</option>
                      <option value="2025-04">4月</option>
                      <option value="2025-05">5月</option>
                      <option value="2025-06">6月</option>
                      <option value="2025-07">7月</option>
                      <option value="2025-08">8月</option>
                      <option value="2025-09">9月</option>
                      <option value="2025-10">10月</option>
                      <option value="2025-11">11月</option>
                      <option value="2025-12">12月</option>
                    </select>
                  </div>

                  {/* 全部月份：堆叠柱状图 */}
                  {selectedMonth === 'all' && (
                    <div className="h-[480px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={categoryTrendData}>
                          <defs>
                            <linearGradient id="grad-production" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#0891B2" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="grad-facility" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#7C3AED" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="grad-operation" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#D97706" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="grad-postprocess" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#EA580C" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="grad-digital" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#DB2777" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="grad-energy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#64748B"/><stop offset="100%" stopColor="#475569" stopOpacity={0.7}/>
                            </linearGradient>
                            <linearGradient id="grad-other" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#6B7280" stopOpacity={0.7}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                          <XAxis
                            dataKey="month"
                            tickFormatter={(v) => v.replace('2025-','')+'月'}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                          />
                          <YAxis tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, Math.ceil(Math.max(...categoryTrendData.map(d => d.total)) * 1.2 / 100) * 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              backdropFilter: 'blur(12px)',
                              borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.5)'
                            }}
                            formatter={(value: number, name: string, props: any) => {
                              const cat = categorySummaryData.find(c => c.key === name);
                              const amount = Math.round(value * 30);
                              return [`${value} 件 / ¥${(amount/10000).toFixed(2)} 万`, cat?.name || name];
                            }}
                          />
                          <Legend formatter={(value) => {
                            const cat = categorySummaryData.find(c => c.key === value);
                            return <span className="text-gray-600 text-xs">{cat?.name || value}</span>;
                          }} />
                          <Bar dataKey="生产投入" stackId="a" fill="url(#grad-production)" radius={[0,0,0,0]} barSize={28} />
                          <Bar dataKey="设施装备" stackId="a" fill="url(#grad-facility)" radius={[0,0,0,0]} />
                          <Bar dataKey="作业支持" stackId="a" fill="url(#grad-operation)" radius={[0,0,0,0]} />
                          <Bar dataKey="采后流通" stackId="a" fill="url(#grad-postprocess)" radius={[0,0,0,0]} />
                          <Bar dataKey="数字管理" stackId="a" fill="url(#grad-digital)" radius={[0,0,0,0]} />
                          <Bar dataKey="能源耗材" stackId="a" fill="url(#grad-energy)" radius={[0,0,0,0]} />
                          <Bar dataKey="其他" stackId="a" fill="url(#grad-other)" radius={[4,4,0,0]} />
                          <Bar dataKey="total" stackId="b" fill="transparent" label={{ position: 'top', formatter: (value: number) => value > 0 ? value.toLocaleString() : '', fontSize: 11, fill: '#374151', dy: -10 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 单独月份：7个竖向柱子 + 月份汇总 */}
                  {selectedMonth !== 'all' && (
                    <>
                      {/* 月份汇总提示 */}
                      <div className="mb-4 px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-600">选中月份：</span>
                            <span className="font-bold text-gray-800 ml-2">{selectedMonth.replace('2025-', '')}月</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <div>
                              <span className="text-gray-500 text-sm">总用量：</span>
                              <span className="font-bold text-cyan-600 ml-1">{getMonthSummary(selectedMonth).totalQuantity.toLocaleString()} 件</span>
                            </div>
                            <div>
                              <span className="text-gray-500 text-sm">总金额：</span>
                              <span className="font-bold text-purple-600 ml-1">¥{(getMonthSummary(selectedMonth).totalAmount / 10000).toFixed(1)} 万元</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 7分类竖向柱状图 */}
                      <div className="h-[480px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={getMonthCategoryData(selectedMonth)}>
                            <defs>
                              <linearGradient id="grad-production-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#0891B2" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="grad-facility-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#7C3AED" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="grad-operation-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#D97706" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="grad-postprocess-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#EA580C" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="grad-digital-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#DB2777" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="grad-energy-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#64748B"/><stop offset="100%" stopColor="#475569" stopOpacity={0.8}/>
                              </linearGradient>
                              <linearGradient id="grad-other-single" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#6B7280" stopOpacity={0.8}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11, fill: '#64748B' }}
                              tickFormatter={(v) => v.replace('类', '').replace('与', '/')}
                            />
                            <YAxis
                              yAxisId="left"
                              tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                              tick={{ fontSize: 11, fill: '#64748B' }}
                              label={{ value: '用量(件)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
                              domain={[0, 'auto']}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tickFormatter={(v) => `¥${(v/10000).toFixed(1)}万`}
                              tick={{ fontSize: 11, fill: '#64748B' }}
                              label={{ value: '金额(万元)', angle: 90, position: 'insideRight', fill: '#64748B', fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.5)'
                              }}
                              formatter={(value: number, name: string, props: any) => [
                                `${value} 件 / ¥${(props.payload.amount/10000).toFixed(2)} 万`,
                                props.payload.name
                              ]}
                            />
                            <Bar
                              dataKey="value"
                              yAxisId="left"
                              radius={[6, 6, 0, 0]}
                              barSize={48}
                              label={{
                                position: 'top',
                                formatter: (value: number) => value > 0 ? value.toLocaleString() : '',
                                fontSize: 11,
                                fill: '#374151'
                              }}
                            >
                              {getMonthCategoryData(selectedMonth).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.solid} />
                              ))}
                            </Bar>
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 底部：分类汇总卡片 */}
              <div className="grid grid-cols-8 gap-3">
                {categorySummaryData.map((item) => (
                  <div key={item.name} className="bg-white/60 rounded-xl p-3 border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}></span>
                      <span className="text-xs text-gray-600 truncate" title={item.name}>{item.name}</span>
                    </div>
                    <div className="text-lg font-bold text-gray-800">{item.value.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">件</div>
                    <div className="text-xs text-gray-400 mt-1">¥{item.amount}万</div>
                  </div>
                ))}
                {/* 合计卡片 */}
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-3 text-white">
                  <div className="text-xs opacity-80 mb-1">年度合计</div>
                  <div className="text-xl font-bold">29,450</div>
                  <div className="text-sm">件</div>
                  <div className="text-xs opacity-80 mt-1">¥89.5万</div>
                </div>
              </div>
            </div>
          )}

          {/* 筛选表单区域 - 月度汇总Tab专用 */}
          {statActiveTab === 'monthly' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1">年份</label>
                  <select
                    value={statYearFilter}
                    onChange={(e) => {
                      setStatYearFilter(e.target.value);
                      setStatCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="2025">2025年</option>
                    <option value="2024">2024年</option>
                    <option value="2023">2023年</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-1">月份</label>
                  <select
                    value={statMonthFilter}
                    onChange={(e) => {
                      setStatMonthFilter(e.target.value);
                      setExpandedMonths(new Set());
                      setStatCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">全部月份</option>
                    <option value="01">1月</option>
                    <option value="02">2月</option>
                    <option value="03">3月</option>
                    <option value="04">4月</option>
                    <option value="05">5月</option>
                    <option value="06">6月</option>
                    <option value="07">7月</option>
                    <option value="08">8月</option>
                    <option value="09">9月</option>
                    <option value="10">10月</option>
                    <option value="11">11月</option>
                    <option value="12">12月</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setStatYearFilter('2025');
                    setStatMonthFilter('all');
                    setExpandedMonths(new Set());
                    setStatCurrentPage(1);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                >
                  重置
                </button>
              </div>
            </div>
          )}

          {/* 筛选表单区域 - 使用StatSearchBar组件 */}
          {statActiveTab !== 'monthly' && (
            <StatSearchBar
              materialSearch={statMaterialSearch}
              departmentFilter={statDepartmentFilter}
              dateRange={statDateRange}
              categoryFilter={statCategoryFilter}
              warehouseFilter={statWarehouseFilter}
              supplierFilter={statSupplierFilter}
              batchCodeFilter={statBatchCodeFilter}
              productionPlanFilter={statProductionPlanFilter}
              usageAreaFilter={statUsageAreaFilter}
              requisitionerFilter={statRequisitionerFilter}
              quickFilterPeriod={statQuickFilterPeriod}
              departmentOptions={['生产部', '技术部', '设备部', '后勤部', '采后处理部']}
              categoryOptions={['肥料与土壤改良剂', '农药与植保产品', '种质资源', '劳保与防护用品', '农业机械', '采收容器', '监测设备']}
              warehouseOptions={['仓库A区', '仓库B区', '仓库C区']}
              supplierOptions={['有机肥供应商A', '化肥供应商B', '农药供应商C', '种子供应商D', '劳保用品供应商E', '农机供应商F', '包装材料供应商G', '监测设备供应商H']}
              batchCodeOptions={['YC20260301', 'HF20260315', 'NY20260220', 'NY20260110', 'ZZ20260201', 'ZZ20260115', 'LB20260228', 'LB20260305', 'NJ20260120', 'NJ20260210', 'BZ20260320', 'JC20260105']}
              productionPlanOptions={['ZZB2026-001', 'ZZB2026-002', 'ZZB2026-003', 'YMB2026-001', 'YMB2026-002', 'YMB2026-003', 'JZB2026-001', 'JZB2026-002']}
              usageAreaOptions={['玻璃温室A区', '日光温室1号', '塑料大棚1号', '露天种植区', '大田A区', '玻璃温室B区', '全园区', '日光温室2号', '设备维修间', '滴灌系统', '采后处理车间', '监测室']}
              requisitionerOptions={['张伟民', '李明轩', '王建国', '赵俊杰', '郑志远', '陈思远', '吴海龙', '孙晓峰', '郑志明', '周志刚']}
              onMaterialSearchChange={setStatMaterialSearch}
              onDepartmentChange={setStatDepartmentFilter}
              onDateRangeChange={setStatDateRange}
              onCategoryChange={setStatCategoryFilter}
              onWarehouseChange={setStatWarehouseFilter}
              onSupplierChange={setStatSupplierFilter}
              onBatchCodeChange={setStatBatchCodeFilter}
              onProductionPlanChange={setStatProductionPlanFilter}
              onUsageAreaChange={setStatUsageAreaFilter}
              onRequisitionerChange={setStatRequisitionerFilter}
              onQuickFilterChange={handleStatQuickFilter}
              onReset={handleStatReset}
            />
          )}



          {/* 月度汇总表格 - 按物料分类统计（折叠模式） */}
          {statActiveTab === 'monthly' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">月度领料统计</h3>
                <div className="flex gap-2">
                  {statExportMode ? (
                    <>
                      <button
                        onClick={handleStatExportConfirm}
                        className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        确认导出
                      </button>
                      <button
                        onClick={handleStatCancelExport}
                        className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setStatExportMode(true)}
                      className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      导出
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <tr>
                      {statExportMode && (
                        <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                          <input
                            type="checkbox"
                            checked={statSelectedRows.length === getAllMonthKeys().length && getAllMonthKeys().length > 0}
                            onChange={handleStatSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                      )}
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
                        onClick={() => handleMonthSort('month')}
                      >
                        月份 {sortConfig.key === 'month' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料分类</th>
                      <th
                        className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
                        onClick={() => handleMonthSort('totalQuantity')}
                      >
                        领料数量 {sortConfig.key === 'totalQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-400 whitespace-nowrap"
                        onClick={() => handleMonthSort('totalAmount')}
                      >
                        领料金额 {sortConfig.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">排名</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">占比</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">环比</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">同比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                  {/* 单月视图：直接显示7分类 */}
                  {statMonthFilter !== 'all' && (
                    <>
                      {getSingleMonthTableData(statYearFilter, statMonthFilter).map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-100 transition-colors">
                          {statExportMode && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={statSelectedRows.includes(idx)}
                                onChange={() => {
                                  if (statSelectedRows.includes(idx)) {
                                    setStatSelectedRows(statSelectedRows.filter(r => r !== idx));
                                  } else {
                                    setStatSelectedRows([...statSelectedRows, idx]);
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.monthName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.categoryName}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">{row.quantity.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600 whitespace-nowrap">¥{row.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">-</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">{getCategoryStats(row.quantity, getSingleMonthTotal(statYearFilter, statMonthFilter).totalQty)}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">-</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-500 whitespace-nowrap">-</td>
                        </tr>
                      ))}
                      {/* 当月合计 */}
                      <tr className="bg-emerald-50 font-bold">
                        {statExportMode && <td className="px-4 py-3"></td>}
                        <td className="px-4 py-3 text-sm text-emerald-700 whitespace-nowrap">当月合计</td>
                        <td className="px-4 py-3 text-sm text-emerald-600">-</td>
                        <td className="px-4 py-3 text-sm text-right text-emerald-700">{getSingleMonthTotal(statYearFilter, statMonthFilter).totalQty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right text-emerald-700">¥{getSingleMonthTotal(statYearFilter, statMonthFilter).totalAmt.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                        <td className="px-4 py-3 text-center text-sm text-emerald-700">100%</td>
                        <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                        <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                      </tr>
                    </>
                  )}

                  {/* 全部月份视图：折叠模式 */}
                  {statMonthFilter === 'all' && (
                    <>
                      {getSortedMonthSummaries().map((monthRow, monthIdx) => (
                        <tbody key={monthRow.month}>
                          {/* 月份汇总行（可点击展开） */}
                          <tr
                            className="cursor-pointer hover:bg-emerald-50/50 bg-gray-50"
                            onClick={() => toggleMonthExpand(monthRow.month)}
                          >
                            {statExportMode && (
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={statSelectedRows.includes(monthIdx)}
                                  onChange={() => {
                                    if (statSelectedRows.includes(monthIdx)) {
                                      setStatSelectedRows(statSelectedRows.filter(r => r !== monthIdx));
                                    } else {
                                      setStatSelectedRows([...statSelectedRows, monthIdx]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 font-bold">
                                  {expandedMonths.has(monthRow.month) ? '▼' : '▶'}
                                </span>
                                <span className="text-sm font-medium text-gray-900">{monthRow.monthName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              点击展开7分类详情
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {monthRow.totalQuantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">
                              ¥{monthRow.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                              {getMonthStats(monthRow.month).rank}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                              {getMonthStats(monthRow.month).percent}
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span className={getMonthStats(monthRow.month).qoq.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).qoq.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                                {getMonthStats(monthRow.month).qoq}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span className={getMonthStats(monthRow.month).yoy.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).yoy.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                                {getMonthStats(monthRow.month).yoy}
                              </span>
                            </td>
                          </tr>

                          {/* 展开的7分类明细 */}
                          {expandedMonths.has(monthRow.month) && getMonthDetails(monthRow.month).map((detail, idx) => (
                            <tr key={`${monthRow.month}-${idx}`} className="hover:bg-emerald-50/50">
                              <td className="px-4 py-3 pl-10 text-sm text-gray-400 whitespace-nowrap">
                                └ {detail.monthName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: (categorySummaryData.find(c => c.key === detail.categoryKey) as any)?.solid || '#999' }}
                                  />
                                  {detail.categoryName}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                {detail.quantity.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">
                                ¥{detail.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-400">-</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-500">
                                {getCategoryStats(detail.quantity, monthRow.totalQuantity)}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-400">-</td>
                              <td className="px-4 py-3 text-center text-gray-400">-</td>
                            </tr>
                          ))}
                        </tbody>
                      ))}

                      {/* 年度合计 */}
                      <tr className="bg-emerald-100 font-bold text-emerald-800">
                        {statExportMode && <td className="px-4 py-3"></td>}
                        <td className="px-4 py-3 whitespace-nowrap">年度合计</td>
                        <td className="px-4 py-3">-</td>
                        <td className="px-4 py-3 text-right">{getYearTotalQuantity(statYearFilter).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">¥{getYearTotalAmount(statYearFilter).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">100%</td>
                        <td className="px-4 py-3 text-center">-</td>
                        <td className="px-4 py-3 text-center">-</td>
                      </tr>
                    </>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 物料汇总表格 */}
          {statActiveTab === 'material' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">领料统计表</h3>
                <div className="flex gap-2">
                  {statExportMode ? (
                    <>
                      <button
                        onClick={handleMaterialStatExportConfirm}
                        className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        确认导出
                      </button>
                      <button
                        onClick={handleMaterialStatCancelExport}
                        className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setStatExportMode(true)}
                      className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      导出
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <tr>
                      {statExportMode && (
                        <th className="px-3 py-3 text-left text-sm font-semibold w-12">
                          <input
                            type="checkbox"
                            checked={statSelectedRows.length === materialStatFilteredData.length && materialStatFilteredData.length > 0}
                            onChange={handleMaterialStatSelectAll}
                            className="w-4 h-4 rounded border-white text-emerald-600 focus:ring-emerald-500"
                          />
                        </th>
                      )}
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">物料编号</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">物料名称</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">分类</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">规格型号</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">条形码</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">单位</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">批次号</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">生产日期</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">有效期至</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">领料部门</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">用途/区域</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">领料人</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">领料时间</th>
                      <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">领料次数</th>
                      <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">总数量</th>
                      <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">实际数量</th>
                      <th className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">总金额(元)</th>
                      <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">主要仓库</th>
                      {!statExportMode && (
                        <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-400">
                    {materialStatFilteredData.slice((statCurrentPage - 1) * statPageSize, statCurrentPage * statPageSize).map((item, idx) => {
                      const globalIdx = (statCurrentPage - 1) * statPageSize + idx;
                      return (
                        <tr key={idx} className="hover:bg-blue-100 transition-colors">
                          {statExportMode && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={statSelectedRows.includes(globalIdx)}
                                onChange={() => {
                                  if (statSelectedRows.includes(globalIdx)) {
                                    setStatSelectedRows(statSelectedRows.filter(r => r !== globalIdx));
                                  } else {
                                    setStatSelectedRows([...statSelectedRows, globalIdx]);
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                            </td>
                          )}
                          <td className="px-3 py-3 text-sm font-mono text-blue-600 whitespace-nowrap">{item.materialCode}</td>
                          <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.materialName}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.category}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.spec}</td>
                          <td className="px-3 py-3 text-sm font-mono text-gray-500 whitespace-nowrap">{item.barcode}</td>
                          <td className="px-3 py-3 text-sm text-center text-gray-600 whitespace-nowrap">{item.unit}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.supplier}</td>
                          <td className="px-3 py-3 text-sm font-mono text-gray-500 whitespace-nowrap">{item.batchCode}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionDate}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.expiryDate}</td>
                          <td className="px-3 py-3 text-sm font-mono text-cyan-600 whitespace-nowrap">{item.productionPlanBatchCode}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.requisitionDepartment}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.usageArea}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.requisitioner}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.requisitionTime}</td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-blue-600 whitespace-nowrap">{item.requisitionCount}</td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">{item.totalQuantity.toLocaleString()}</td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">{item.actualQuantity.toLocaleString()}</td>
                          <td className="px-3 py-3 text-sm text-right font-bold text-emerald-600 whitespace-nowrap">¥{item.totalAmount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{item.mainWarehouse}</td>
                          {!statExportMode && (
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <button
                                onClick={() => { setStatSelectedRecord(item); setStatShowDetailModal(true); }}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                查看明细
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 分页组件 */}
          {statActiveTab === 'material' && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">每页</span>
                <select
                  value={statPageSize}
                  onChange={(e) => { setStatPageSize(Number(e.target.value)); setStatCurrentPage(1); }}
                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-500">条</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">共 {materialStatFilteredData.length} 条</span>
                <button
                  onClick={() => setStatCurrentPage(Math.max(1, statCurrentPage - 1))}
                  disabled={statCurrentPage === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm">{statCurrentPage} / {Math.ceil(materialStatFilteredData.length / statPageSize) || 1}</span>
                <button
                  onClick={() => setStatCurrentPage(Math.min(Math.ceil(materialStatFilteredData.length / statPageSize), statCurrentPage + 1))}
                  disabled={statCurrentPage >= Math.ceil(materialStatFilteredData.length / statPageSize)}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 导出格式选择弹窗 */}
      <ExportTypeModal
        isOpen={statShowExportTypeModal}
        exportFileType={statExportFileType}
        onChange={setStatExportFileType}
        onConfirm={statExportTarget === 'monthly' ? confirmStatExport : confirmMaterialStatExport}
        onClose={() => setStatShowExportTypeModal(false)}
      />

      {/* 详情查看弹窗 */}
      <StatDetailModal
        isOpen={statShowDetailModal}
        record={statSelectedRecord}
        onClose={() => setStatShowDetailModal(false)}
      />
    </>
  );
}
