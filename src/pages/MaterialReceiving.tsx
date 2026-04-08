import { useState } from 'react';
import { ClipboardList, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, Plus, AlertTriangle, X, ClipboardCheck, BarChart3, DollarSign, FileText, RefreshCw, TrendingUp, TrendingDown, Package, MapPin, Calendar, BarChart2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';

// 类型导入
import { MaterialItem, ExecuteMaterialItem } from '../types/materialReceiving';

// 从数据文件导入所有Mock数据
import {
  materialReceivingDetails,
  materialExecuteDetails,
  monthlyStatisticsData,
  materialStatisticsData,
  departmentStatisticsData,
  greenhouseStatisticsData,
  fieldStatisticsData,
  batchStatisticsData,
  CATEGORY_COLORS,
  categorySummaryData,
  categoryTrendData,
  trendChartData,
  departmentPieData,
  categoryPieData,
  getCategoryByCode,
  getMonthCategoryData,
  getMonthSummary,
  getMonthSummaries,
  getMonthDetails,
  getYearTotalQuantity,
  getYearTotalAmount,
  getSingleMonthTableData,
  getSingleMonthTotal,
} from '../data/materialReceivingData';

// 弹窗组件
import { ExportTypeModal } from '../components/materialReceiving/modals/ExportTypeModal';
import { DetailModal } from '../components/materialReceiving/modals/DetailModal';
import { EditModal } from '../components/materialReceiving/modals/EditModal';
import { AddModal } from '../components/materialReceiving/modals/AddModal';
import { DeleteConfirm } from '../components/materialReceiving/modals/DeleteConfirm';
import { VoidModal } from '../components/materialReceiving/modals/VoidModal';
import { BatchEditModal } from '../components/materialReceiving/modals/BatchEditModal';
import { ExecuteBatchEditModal } from '../components/materialReceiving/modals/ExecuteBatchEditModal';
import { EditWarningModal } from '../components/materialReceiving/modals/EditWarningModal';
import { DeleteWarningModal } from '../components/materialReceiving/modals/DeleteWarningModal';
import { BatchDeleteConfirmModal } from '../components/materialReceiving/modals/BatchDeleteConfirmModal';
import { ExecuteEditWarningModal } from '../components/materialReceiving/modals/ExecuteEditWarningModal';
import { ExecuteDeleteWarningModal } from '../components/materialReceiving/modals/ExecuteDeleteWarningModal';
import { ExecuteBatchDeleteConfirmModal } from '../components/materialReceiving/modals/ExecuteBatchDeleteConfirmModal';
import { ExecuteDetailModal } from '../components/materialReceiving/modals/ExecuteDetailModal';
import { StatDetailModal } from '../components/materialReceiving/modals/StatDetailModal';
import { StatSearchBar } from '../components/materialReceiving/stats/StatSearchBar';

// 成本核算组件
import { CostTabSwitcher } from '../components/cost/CostTabSwitcher';
import { CostFiltersForm, CostFilters } from '../components/cost/CostFiltersForm';
import { CostKPICards } from '../components/cost/CostKPICards';
import { CostPieChart } from '../components/cost/CostPieChart';
import { CostTrendChart } from '../components/cost/CostTrendChart';
import { CostComparisonTable } from '../components/cost/CostComparisonTable';
import { CostDetailModal } from '../components/cost/CostDetailModal';
import {
  filterCostRecords,
  calcCostTotal,
  calcMonthlyCost,
  aggregateByCategory,
  aggregateByDepartment,
  aggregateByBatch,
  aggregateByMonth,
  getFilteredMaterialDetails,
  getBatchMaterialDetails,
  CategoryAgg,
  DepartmentAgg,
  BatchAgg,
  MonthlyAgg,
} from '../data/costData';

export default function MaterialReceiving() {
  const [activeTab, setActiveTab] = useState('application');
  const [searchCode, setSearchCode] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<typeof materialReceivingDetails[0] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, typeof materialReceivingDetails[0]>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 领料出库页面状态
  const [executeSearchCode, setExecuteSearchCode] = useState('');
  const [executeSearchApplicant, setExecuteSearchApplicant] = useState('');
  const [executeSearchBatchCode, setExecuteSearchBatchCode] = useState('');
  const [executeSearchWarehouse, setExecuteSearchWarehouse] = useState('');
  const [executeStatusFilter, setExecuteStatusFilter] = useState('all');
  const [executeCurrentPage, setExecuteCurrentPage] = useState(1);
  const [executePageSize, setExecutePageSize] = useState(10);
  const [executeExportMode, setExecuteExportMode] = useState(false);
  const [executeSelectedRows, setExecuteSelectedRows] = useState<number[]>([]);
  const [executeShowDetailModal, setExecuteShowDetailModal] = useState(false);
  const [executeShowEditModal, setExecuteShowEditModal] = useState(false);
  const [executeShowDeleteConfirm, setExecuteShowDeleteConfirm] = useState(false);
  const [executeShowAddModal, setExecuteShowAddModal] = useState(false);
  const [executeSelectedRecord, setExecuteSelectedRecord] = useState<typeof materialExecuteDetails[0] | null>(null);
  const [executeDeletingId, setExecuteDeletingId] = useState<number | null>(null);
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());
  const [executeShowExportTypeModal, setExecuteShowExportTypeModal] = useState(false);
  const [executeExportFileType, setExecuteExportFileType] = useState('xlsx');
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState(false);
  const [executeShowBatchEditModal, setExecuteShowBatchEditModal] = useState(false);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
  const [executeShowEditWarning, setExecuteShowEditWarning] = useState(false);
  const [executeShowDeleteWarning, setExecuteShowDeleteWarning] = useState(false);
  const [executeBatchEditedRecords, setExecuteBatchEditedRecords] = useState<Record<number, typeof materialExecuteDetails[0]>>({});
  const [executeCurrentBatchEditIndex, setExecuteCurrentBatchEditIndex] = useState(0);
  const [executeSelectedApplicationCode, setExecuteSelectedApplicationCode] = useState('');
  const [executeSelectedMaterialIndices, setExecuteSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [executeMaterialActualQuantities, setExecuteMaterialActualQuantities] = useState<Record<number, number>>({});
  const [executeMaterialPool, setExecuteMaterialPool] = useState<ExecuteMaterialItem[]>([]);

  const [executeEditForm, setExecuteEditForm] = useState({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  const [executeAddForm, setExecuteAddForm] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    warehouseLocation: '仓库A区',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 领料出库页面过滤后的数据
  const executeFilteredData = materialExecuteDetails.filter(item => {
    if (executeSearchCode && !item.code.toLowerCase().includes(executeSearchCode.toLowerCase())) return false;
    if (executeSearchApplicant && !item.applicant.toLowerCase().includes(executeSearchApplicant.toLowerCase())) return false;
    if (executeSearchBatchCode && !item.productionBatchCode.toLowerCase().includes(executeSearchBatchCode.toLowerCase())) return false;
    if (executeSearchWarehouse && !item.warehouseLocation.toLowerCase().includes(executeSearchWarehouse.toLowerCase())) return false;
    if (executeStatusFilter !== 'all' && item.executeStatus !== executeStatusFilter) return false;
    return true;
  });

  const executeTotalPages = Math.ceil(executeFilteredData.length / executePageSize);

  // ============================================
  // 领料统计页面状态
  // ============================================
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

  // 领料物料统计过滤后的数据（需要在statDateRange之后）
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
  
  // 大棚筛选
  const [statGreenhouseTypeFilter, setStatGreenhouseTypeFilter] = useState<string>('all');
  const [statGreenhouseFilter, setStatGreenhouseFilter] = useState<string[]>([]);
  
  // 大田筛选
  const [statFieldFilter, setStatFieldFilter] = useState<string[]>([]);
  
  // 批次筛选
  const [statBatchFilter, setStatBatchFilter] = useState<string>('');
  
  // 对比周期
  const [statComparisonPeriod, setStatComparisonPeriod] = useState<string>('none');
  
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
  const [statShowOrderDetailModal, setStatShowOrderDetailModal] = useState(false);
  const [statShowMaterialDetailModal, setStatShowMaterialDetailModal] = useState(false);
  const [statSelectedRecord, setStatSelectedRecord] = useState<any>(null);
  const [statSelectedOrder, setStatSelectedOrder] = useState<any>(null);

  // 成本核算页面状态
  const [costActiveTab, setCostActiveTab] = useState<'overview' | 'comparison'>('overview');
  const [costDetailModalOpen, setCostDetailModalOpen] = useState(false);
  const [costDetailTitle, setCostDetailTitle] = useState('');
  const [costDetailData, setCostDetailData] = useState<any[]>([]);

  // 成本核算筛选状态
  const getInitialCostFilters = (): CostFilters => {
    const now = new Date();
    return {
      quickPeriod: 'year',
      dateRange: {
        start: `${now.getFullYear()}-01-01`,
        end: now.toISOString().split('T')[0],
      },
      departments: [],
      categories: [],
      batches: [],
      warehouses: [],
    };
  };
  const [costFilters, setCostFilters] = useState<CostFilters>(getInitialCostFilters);

  // 成本核算页面快捷筛选
  const handleStatQuickFilter = (period: string) => {
    setStatQuickFilterPeriod(period); // 更新选中状态
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'currentWeek':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        break;
      case 'currentMonth':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
      case 'currentQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
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
    setStatGreenhouseTypeFilter('all');
    setStatGreenhouseFilter([]);
    setStatFieldFilter([]);
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
      let csvContent = '\uFEFF';
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
      let csvContent = '\uFEFF';
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

  // 领料出库页面重置搜索
  const handleExecuteReset = () => {
    setExecuteSearchCode('');
    setExecuteSearchApplicant('');
    setExecuteSearchBatchCode('');
    setExecuteSearchWarehouse('');
    setExecuteStatusFilter('all');
    setExecuteCurrentPage(1);
  };

  // 领料出库页面展开/折叠行
  const toggleExecuteExpandRow = (id: number) => {
    const newExpandedRows = new Set(executeExpandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExecuteExpandedRows(newExpandedRows);
  };

  // 领料出库页面全选
  const handleExecuteSelectAll = () => {
    if (executeSelectedRows.length === executeFilteredData.length) {
      setExecuteSelectedRows([]);
    } else {
      setExecuteSelectedRows(executeFilteredData.map(item => item.id));
    }
  };

  // 领料出库页面选择单行
  const handleExecuteSelectRow = (id: number) => {
    if (executeSelectedRows.includes(id)) {
      setExecuteSelectedRows(executeSelectedRows.filter(rowId => rowId !== id));
    } else {
      setExecuteSelectedRows([...executeSelectedRows, id]);
    }
  };

  // 领料出库页面导出
  const handleExecuteExportClick = () => {
    setExecuteShowExportTypeModal(true);
  };

  const confirmExecuteExport = async () => {
    const exportData = materialExecuteDetails.filter(item => executeSelectedRows.includes(item.id));
    const headers = ['出库单号', '日期', '申领人', '仓库地点', '审核人', '操作人', '生产批次号', '执行状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'operator', 'productionBatchCode', 'executeStatus'];
    // 物料明细表头（与实际数据字段一致，不包括计算字段）
    const materialHeaders = ['来源领料单号', '物料编码', '物料名称', '规格', '单位', '申请数量', '实际库存', '本次实发', '单价(元)', '仓库货位', '备注'];
    const materialFields = ['applicationCode', 'materialCode', 'materialName', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'actualQuantity', 'unitPrice', 'warehousePosition', 'remark'];

    const escapeCSV = (str: string): string => {
      if (str === null || str === undefined) return '';
      const strValue = String(str);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return '"' + strValue.replace(/"/g, '""') + '"';
      }
      return strValue;
    };

    let content: string | Uint8Array = '';
    let mimeType = '';
    let extension = '';

    if (executeExportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.map(h => escapeCSV(h)).join(',') + ',' + materialHeaders.map(h => escapeCSV(h)).join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => escapeCSV((row as any)[f] || '')).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => escapeCSV(mat[f] || '')).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + materialFields.map(f => escapeCSV(mat[f] || '')).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (executeExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (executeExportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `领料出库_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: executeExportFileType.toUpperCase() + ' Files',
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

    setExecuteShowExportTypeModal(false);
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  };

  // 领料出库页面取消导出
  const handleExecuteCancelExport = () => {
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  };

  // 领料出库页面查看详情
  const handleExecuteView = (item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteShowDetailModal(true);
  };

  // 领料出库页面新增
  const handleExecuteAdd = () => {
    const newCode = 'CK' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(materialExecuteDetails.length + 1).padStart(3, '0');
    setExecuteAddForm({
      code: newCode,
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteShowAddModal(true);
  };

  // 添加选中物料到物料池
  const handleAddToMaterialPool = () => {
    if (!executeSelectedApplicationCode || executeSelectedMaterialIndices.size === 0) {
      alert('请先选择领料单并勾选要出库的物料');
      return;
    }
    const selectedApp = materialReceivingDetails.find(app => app.code === executeSelectedApplicationCode);
    if (!selectedApp) return;

    const newMaterials: ExecuteMaterialItem[] = Array.from(executeSelectedMaterialIndices).map(idx => {
      const material = selectedApp.materials[idx];
      const actualQty = executeMaterialActualQuantities[idx] ?? material.requestedQuantity;
      return {
        materialCode: material.materialCode,
        materialName: material.materialName,
        spec: material.spec,
        unit: material.unit,
        category: material.category,
        requestedQuantity: material.requestedQuantity,
        stockQuantity: actualQty,
        actualQuantity: actualQty,
        remark: actualQty === material.requestedQuantity ? '正常出库' : '部分出库',
        applicationCode: executeSelectedApplicationCode
      };
    });

    setExecuteMaterialPool([...executeMaterialPool, ...newMaterials]);
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteSelectedApplicationCode('');
  };

  // 从物料池移除物料
  const handleRemoveFromMaterialPool = (index: number) => {
    setExecuteMaterialPool(executeMaterialPool.filter((_, i) => i !== index));
  };

  // 更新物料池中物料的实发数量
  const handleUpdateMaterialPoolQuantity = (index: number, actualQuantity: number) => {
    const updatedPool = [...executeMaterialPool];
    updatedPool[index] = {
      ...updatedPool[index],
      actualQuantity: actualQuantity,
      remark: actualQuantity === updatedPool[index].requestedQuantity ? '正常出库' : '部分出库'
    };
    setExecuteMaterialPool(updatedPool);
  };

  // 领料出库页面编辑
  const handleExecuteEdit = (item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteEditForm({
      date: item.date,
      applicant: item.applicant,
      warehouseLocation: item.warehouseLocation,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      executeStatus: item.executeStatus,
      materials: item.materials
    });
    setExecuteShowEditModal(true);
  };

  // 领料出库页面删除
  const handleExecuteDeleteClick = (id: number) => {
    setExecuteDeletingId(id);
    setExecuteShowDeleteConfirm(true);
  };

  const confirmExecuteDelete = () => {
    setExecuteShowDeleteConfirm(false);
    setExecuteDeletingId(null);
  };

  const handleExecuteSaveEdit = () => {
    setExecuteShowEditModal(false);
    alert('保存成功');
  };

  const handleExecuteSaveAdd = () => {
    if (executeMaterialPool.length === 0) {
      alert('请先添加物料到物料池');
      return;
    }

    const sourceAppCodes = [...new Set(executeMaterialPool.map(m => m.applicationCode))];
    const firstMaterial = executeMaterialPool[0];
    const sourceApp = materialReceivingDetails.find(app => app.code === firstMaterial.applicationCode);

    const newRecord = {
      id: materialExecuteDetails.length + 1,
      code: executeAddForm.code || `CK${new Date().toISOString().split('T')[0].replace(/-/g, '')}${String(materialExecuteDetails.length + 1).padStart(3, '0')}`,
      date: executeAddForm.date,
      applicant: sourceApp?.applicant || '',
      warehouseLocation: executeAddForm.warehouseLocation,
      reviewer: sourceApp?.reviewer || '',
      operator: executeAddForm.reviewer,
      productionBatchCode: sourceApp?.productionBatchCode || '',
      sourceApplicationCodes: sourceAppCodes,
      executeStatus: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? '部分出库' : '已出库',
      executeStatusClass: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? 'partial' : 'completed',
      materials: executeMaterialPool
    };

    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
    alert('新增成功');
  };

  const handleExecuteCancelAdd = () => {
    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
  };

  const handleExecuteCancelEdit = () => {
    setExecuteShowEditModal(false);
  };

  const handleExecuteCancelDetail = () => {
    setExecuteShowDetailModal(false);
  };

  const handleExecuteEditAddMaterial = () => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: [
        ...executeEditForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
      ]
    });
  };

  const handleExecuteEditRemoveMaterial = (index: number) => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: executeEditForm.materials.filter((_, i) => i !== index)
    });
  };

  const handleExecuteEditMaterialChange = (index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeEditForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteEditForm({ ...executeEditForm, materials: newMaterials });
  };

  const handleExecuteAddAddMaterial = () => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: [
        ...executeAddForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '', applicationCode: '' }
      ]
    });
  };

  const handleExecuteAddRemoveMaterial = (index: number) => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: executeAddForm.materials.filter((_, i) => i !== index)
    });
  };

  const handleExecuteAddMaterialChange = (index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeAddForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteAddForm({ ...executeAddForm, materials: newMaterials });
  };

  const [editForm, setEditForm] = useState({
    date: '',
    applicant: '',
    department: '',
    warehouseLocation: '',
    plantArea: '',
    reviewer: '',
    productionBatchCode: '',
    status: '',
    materials: [] as MaterialItem[]
  });

  const [addForm, setAddForm] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    department: '',
    warehouseLocation: '仓库A区',
    plantArea: '',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as MaterialItem[]
  });

  // 过滤后的数据
  const filteredData = materialReceivingDetails.filter(item => {
    if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
    if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
    if (searchBatchCode && !item.productionBatchCode.toLowerCase().includes(searchBatchCode.toLowerCase())) return false;
    if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 重置搜索
  const handleReset = () => {
    setSearchCode('');
    setSearchApplicant('');
    setSearchBatchCode('');
    setSearchWarehouse('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // 展开/折叠行
  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  // 选择单行
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出
  const handleExportClick = () => {
    setShowExportTypeModal(true);
  };

  const confirmExport = async () => {
    // 获取选中的数据
    const exportData = materialReceivingDetails.filter(item => selectedRows.includes(item.id));

    // 主表表头和字段映射
    const headers = ['领料单号', '日期', '申领人', '仓库地点', '审核人', '生产批次号', '状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'productionBatchCode', 'status'];

    // 物料明细表头和字段映射（与表格列一致：物料编码, 物料名称, 规格, 单位, 申领数量, 当前库存, 单价, 小计, 仓库货位, 备注）
    const materialHeaders = ['物料编码', '物料名称', '规格', '单位', '申领数量', '当前库存', '单价(元)', '小计(元)', '仓库货位', '备注'];
    // 小计(元)是计算字段，使用warehousePosition占位
    const materialFields = ['materialCode', 'materialName', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'unitPrice', 'warehousePosition', 'warehousePosition', 'remark'];

    // 准备导出内容
    let content: string | Uint8Array = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => `"${(row as any)[f] || ''}"`).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFileType === 'xlsx') {
      // 使用xlsx库生成真正的Excel文件（中文表头）
      const aoa: any[][] = [];

      // 添加表头
      aoa.push([...headers, ...materialHeaders]);

      // 添加数据
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            const rowData: any[] = [];
            if (idx === 0) {
              fields.forEach(f => { rowData.push((row as any)[f]); });
            } else {
              fields.forEach(() => { rowData.push(''); });
            }
            materialFields.forEach(f => { rowData.push(mat[f]); });
            aoa.push(rowData);
          });
        } else {
          const rowData: any[] = [];
          fields.forEach(f => { rowData.push((row as any)[f]); });
          materialFields.forEach(() => { rowData.push(''); });
          aoa.push(rowData);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '领料单');

      // 生成二进制文件
      const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      content = new Uint8Array(xlsxBuffer);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    } else if (exportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `生产领料_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFileType.toUpperCase() + ' Files',
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

    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // 查看详情
  const handleView = (item: typeof materialReceivingDetails[0]) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  };

  // 编辑
  const handleEdit = (item: typeof materialReceivingDetails[0]) => {
    // 只有待审批状态的记录可以编辑
    if (item.status !== '待审批') {
      setEditAlertMessage(`该领料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      plantArea: item.plantArea,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      status: item.status,
      materials: [...item.materials],
    });
    setShowEditModal(true);
  };

  // 编辑弹窗 - 添加物料行
  const handleEditAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setEditForm({ ...editForm, materials: [...editForm.materials, newMaterial] });
  };

  // 编辑弹窗 - 删除物料行
  const handleEditRemoveMaterial = (index: number) => {
    const newMaterials = [...editForm.materials];
    newMaterials.splice(index, 1);
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // 编辑弹窗 - 更新物料行
  const handleEditMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...editForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // 删除确认
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  // 保存编辑（重新提交）
  const handleSaveEdit = () => {
    // 编辑后状态改为待审批（重新提交）
    setShowEditModal(false);
    // 可以这里添加更新本地数据的逻辑
    alert('编辑已保存，领料单已重新提交，等待审批');
  };

  // 作废申请按钮点击
  const handleVoidApply = () => {
    if (!selectedRecord) return;
    setVoidReason('');
    setShowVoidModal(true);
  };

  // 提交作废申请
  const submitVoidApply = () => {
    if (!voidReason.trim()) {
      alert('请填写作废原因');
      return;
    }
    // 更新本地数据状态为已作废
    const recordIndex = materialReceivingDetails.findIndex(r => r.id === selectedRecord?.id);
    if (recordIndex !== -1) {
      materialReceivingDetails[recordIndex].status = '已作废';
      materialReceivingDetails[recordIndex].statusClass = 'voided';
    }
    setShowVoidModal(false);
    setShowEditModal(false);
  };

  // 添加物料行
  const handleAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setAddForm({ ...addForm, materials: [...addForm.materials, newMaterial] });
  };

  // 删除物料行
  const handleRemoveMaterial = (index: number) => {
    const newMaterials = [...addForm.materials];
    newMaterials.splice(index, 1);
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 更新物料行
  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...addForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 保存新增
  const handleSaveAdd = () => {
    const newCode = `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(materialReceivingDetails.length + 1).padStart(3, '0')}`;
    const newRecord = {
      id: materialReceivingDetails.length + 1,
      code: newCode,
      date: addForm.date,
      applicant: addForm.applicant,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      plantArea: addForm.plantArea,
      reviewer: addForm.reviewer,
      productionBatchCode: addForm.productionBatchCode,
      status: '待审批',
      statusClass: 'pending',
      materials: addForm.materials.map(m => ({ ...m, actualQuantity: 0 }))
    };
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
  };

  // 取消新增
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产领料</h1>
            <p className="text-gray-500">生产领料记录管理</p>
          </div>
        </div>
      </div>

      {/* Tab切换区域 - 顶部标签页样式 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-6 pb-0 mb-4">
        <div className="flex gap-8 border-b border-gray-200">
          {[
            { key: 'application', label: '申请领料', icon: FileText },
            { key: 'execute', label: '领料出库', icon: ClipboardCheck },
            { key: 'statistics', label: '领料统计', icon: BarChart3 },
            { key: 'cost', label: '成本核算', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-base font-semibold transition-all relative ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

    {/* Tab内容区域 */}
    <div>
      {/* 领料申请 Tab内容 */}
      <div className={activeTab === 'application' ? '' : 'hidden'}>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索领料单号..."
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={searchApplicant}
                onChange={(e) => { setSearchApplicant(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={searchBatchCode}
                onChange={(e) => { setSearchBatchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={searchWarehouse}
              onChange={(e) => { setSearchWarehouse(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">审批状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待审批">待审批</option>
              <option value="已审批">已审批</option>
              <option value="已拒绝">已拒绝</option>
              <option value="已作废">已作废</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">领料申请单列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {/* 编辑删除按钮 - 默认显示 */}
              {!batchEditMode && (
                <>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}

              {/* 选择模式下显示确认/取消按钮 */}
              {batchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setBatchEditMode(false);
                      } else {
                        setShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}

              {!batchEditMode && (
                <button
                  onClick={() => setExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(exportMode || batchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">领料单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料种类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">种植区域/用途</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                    {(exportMode || batchEditMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => handleView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.materials.length > 0 ? `${item.materials.length}种` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.plantArea}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionBatchCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                          item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                          item.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                          item.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
                          item.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
                          item.statusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-blue-700'
                        }`}>
                          {item.status}
                        </span>
                        {item.statusClass === 'rejected' && item.rejectReason && (
                          <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.rejectReason}>
                            原因：{item.rejectReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {item.materials.length > 0 ? item.materials[0].remark : '-'}
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申领数量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">当前库存</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = material.requestedQuantity * material.unitPrice;
                                  const isStockWarning = material.requestedQuantity > material.stockQuantity;
                                  return (
                                    <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-800'}`}>{material.requestedQuantity}{isStockWarning && ' ⚠️'}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.stockQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unitPrice.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {exportMode && selectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === filteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredData.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      {showDetailModal && selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑领料单</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* 领料单号 - 只读 */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                  <div className="text-sm font-medium text-gray-900">{selectedRecord?.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={editForm.applicant}
                    onChange={(e) => setEditForm({ ...editForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">部门</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择部门</option>
                    <option value="生产部">生产部</option>
                    <option value="后勤部">后勤部</option>
                    <option value="设备部">设备部</option>
                    <option value="技术部">技术部</option>
                    <option value="采后处理部">采后处理部</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={editForm.warehouseLocation}
                    onChange={(e) => setEditForm({ ...editForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">种植区域/用途</label>
                  <input
                    type="text"
                    value={editForm.plantArea}
                    onChange={(e) => setEditForm({ ...editForm, plantArea: e.target.value })}
                    placeholder="如：1号棚-叶菜区"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">审核人</label>
                  <select
                    value={editForm.reviewer}
                    onChange={(e) => setEditForm({ ...editForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="王经理">王经理</option>
                    <option value="李经理">李经理</option>
                    <option value="张经理">张经理</option>
                    <option value="陈经理">陈经理</option>
                    <option value="赵经理">赵经理</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={editForm.productionBatchCode}
                    onChange={(e) => setEditForm({ ...editForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleEditAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {editForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">申领数量</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editForm.materials.map((material, idx) => {
                        const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                        const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleEditMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleEditMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleEditMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleEditMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleEditMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.remark || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => handleEditRemoveMaterial(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              {(selectedRecord?.status === '待审批' || selectedRecord?.status === '已审批') && (
                <button
                  onClick={handleVoidApply}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  作废申请
                </button>
              )}
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑警告弹窗 */}
      <EditWarningModal
        show={showEditWarning}
        onCancel={() => { setShowEditWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
        onConfirm={() => { setShowEditWarning(false); }}
      />

      {/* 删除警告弹窗 */}
      <DeleteWarningModal
        show={showDeleteWarning}
        onCancel={() => { setShowDeleteWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
        onConfirm={() => { setShowDeleteWarning(false); }}
      />

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <DeleteConfirm
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* 批量删除确认弹窗 */}
      <BatchDeleteConfirmModal
        show={showBatchDeleteConfirm}
        count={selectedRows.length}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        onConfirm={() => {
          setShowBatchDeleteConfirm(false);
          setSelectedRows([]);
          setBatchEditMode(false);
          alert(`已删除 ${selectedRows.length} 项领料记录`);
        }}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        show={showBatchEditModal}
        selectedRows={selectedRows}
        batchEditedRecords={batchEditedRecords}
        currentBatchEditIndex={currentBatchEditIndex}
        recordsList={materialReceivingDetails.filter(r => selectedRows.includes(r.id))}
        onClose={() => { setShowBatchEditModal(false); setBatchEditedRecords({}); setCurrentBatchEditIndex(0); }}
        onRecordChange={(idx) => setCurrentBatchEditIndex(idx)}
        onFieldChange={(recordId, field, value) => {
          const record = materialReceivingDetails.find(r => r.id === recordId);
          const currentData = batchEditedRecords[recordId] ?? record ?? { materials: [] };
          setBatchEditedRecords({
            ...batchEditedRecords,
            [recordId]: { ...currentData, [field]: value }
          });
        }}
        onMaterialChange={(recordId, materialIdx, field, value) => {
          const record = materialReceivingDetails.find(r => r.id === recordId);
          const currentData = batchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials[materialIdx] = { ...materials[materialIdx], [field]: value };
          setBatchEditedRecords({
            ...batchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onMaterialDelete={(recordId, materialIdx) => {
          const record = materialReceivingDetails.find(r => r.id === recordId);
          const currentData = batchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials.splice(materialIdx, 1);
          setBatchEditedRecords({
            ...batchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onNextRecord={() => {
          const nextIndex = currentBatchEditIndex + 1;
          setCurrentBatchEditIndex(nextIndex < selectedRows.length ? nextIndex : 0);
        }}
        onVoidApply={() => {
          const currentRecordId = selectedRows[currentBatchEditIndex];
          const currentRecord = materialReceivingDetails.find(r => r.id === currentRecordId);
          setSelectedRecord(currentRecord);
          setShowBatchEditModal(false);
          setShowVoidModal(true);
        }}
        onSaveAll={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
          setBatchEditedRecords({});
          setCurrentBatchEditIndex(0);
        }}
      />

      {/* 编辑提示弹窗 */}
      {showEditAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Edit className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">无法编辑</h3>
                  <p className="text-sm text-gray-500">领料单状态限制</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  {editAlertMessage}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditAlert(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  知道了
                </button>
                <button
                  onClick={() => {
                    setShowEditAlert(false);
                    handleVoidApply();
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  前往作废申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 作废申请弹窗 */}
      {showVoidModal && (
        <VoidModal
          voidReason={voidReason}
          onChange={setVoidReason}
          onSubmit={submitVoidApply}
          onCancel={() => setShowVoidModal(false)}
          recordCode={selectedRecord?.code}
        />
      )}

      {/* 新增领料单弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[66vw] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新增领料单</h3>
              <button onClick={handleCancelAdd} className="p-1 hover:bg-gray-100 rounded">
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
                  <input
                    type="text"
                    value={addForm.code}
                    readOnly
                    placeholder="系统自动生成"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">申请人</label>
                  <input
                    type="text"
                    value={addForm.applicant}
                    onChange={(e) => setAddForm({ ...addForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">部门</label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择部门</option>
                    <option value="生产部">生产部</option>
                    <option value="后勤部">后勤部</option>
                    <option value="设备部">设备部</option>
                    <option value="技术部">技术部</option>
                    <option value="采后处理部">采后处理部</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
                  <select
                    value={addForm.warehouseLocation}
                    onChange={(e) => setAddForm({ ...addForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">种植区域/用途</label>
                  <input
                    type="text"
                    value={addForm.plantArea}
                    onChange={(e) => setAddForm({ ...addForm, plantArea: e.target.value })}
                    placeholder="如：1号棚-叶菜区"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">审核人</label>
                  <select
                    value={addForm.reviewer}
                    onChange={(e) => setAddForm({ ...addForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="王经理">王经理</option>
                    <option value="李经理">李经理</option>
                    <option value="张经理">张经理</option>
                    <option value="陈经理">陈经理</option>
                    <option value="赵经理">赵经理</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={addForm.productionBatchCode}
                    onChange={(e) => setAddForm({ ...addForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {addForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">申领数量</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
                        <th className="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {addForm.materials.map((material, idx) => {
                        const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                        const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity || ''}
                                onChange={(e) => handleMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.remark}
                                onChange={(e) => handleMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => handleRemoveMaterial(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveAdd}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出文件类型选择弹窗 */}
      {showExportTypeModal && (
        <ExportTypeModal
          exportFileType={exportFileType}
          onChange={setExportFileType}
          onConfirm={confirmExport}
          onCancel={() => setShowExportTypeModal(false)}
        />
      )}
      </div>

      {/* 领料出库 Tab内容 */}
      <div className={activeTab === 'execute' ? '' : 'hidden'}>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">出库单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索出库单号..."
                value={executeSearchCode}
                onChange={(e) => { setExecuteSearchCode(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={executeSearchApplicant}
                onChange={(e) => { setExecuteSearchApplicant(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={executeSearchBatchCode}
                onChange={(e) => { setExecuteSearchBatchCode(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={executeSearchWarehouse}
              onChange={(e) => { setExecuteSearchWarehouse(e.target.value); setExecuteCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">执行状态</label>
            <select
              value={executeStatusFilter}
              onChange={(e) => { setExecuteStatusFilter(e.target.value); setExecuteCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待出库">待出库</option>
              <option value="部分出库">部分出库</option>
              <option value="已出库">已出库</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <button
            onClick={handleExecuteReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">出库单列表</h3>
          {executeExportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExecuteExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleExecuteCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleExecuteAdd}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {!executeBatchEditMode && (
                <>
                  <button
                    onClick={() => { setExecuteBatchEditMode(true); setExecuteShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setExecuteBatchEditMode(true); setExecuteShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}
              {executeBatchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (executeSelectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setExecuteBatchEditMode(false);
                      } else {
                        setExecuteShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setExecuteShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}
              {!executeBatchEditMode && (
                <button
                  onClick={() => setExecuteExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(executeExportMode || executeBatchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={executeSelectedRows.length === executeFilteredData.length && executeFilteredData.length > 0}
                      onChange={handleExecuteSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出库单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {executeFilteredData.slice((executeCurrentPage - 1) * executePageSize, executeCurrentPage * executePageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-blue-100 transition-colors">
                    {(executeExportMode || executeBatchEditMode) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={executeSelectedRows.includes(item.id)}
                          onChange={() => handleExecuteSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleExecuteExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {executeExpandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => handleExecuteView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.operator}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{item.productionBatchCode}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        item.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                        item.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                        item.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                        item.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.executeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExecuteView(item)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {executeExpandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(executeExportMode || executeBatchEditMode) ? 14 : 13} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">来源领料单号</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">申请数量</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">实际库存</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">本次实发</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">差异</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                                  const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                                  return (
                                    <tr key={idx} className={`hover:bg-[#F2F6FA]/50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                          {material.stockQuantity}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        {material.actualQuantity > 0 ? (
                                          <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                            {material.actualQuantity}
                                          </span>
                                        ) : (
                                          <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                            {material.actualQuantity}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{(material.unitPrice || 0).toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition || '-'}</td>
                                      <td className="px-3 py-2 text-sm">
                                        {material.requestedQuantity - material.actualQuantity > 0 ? (
                                          <span className="text-red-600 font-medium">-{material.requestedQuantity - material.actualQuantity}</span>
                                        ) : (
                                          <span className="text-green-600">0</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {executeExportMode && executeSelectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleExecuteSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {executeSelectedRows.length === executeFilteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {executeSelectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={executePageSize}
              onChange={(e) => { setExecutePageSize(Number(e.target.value)); setExecuteCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {executeFilteredData.length} 条</span>
            <button
              onClick={() => setExecuteCurrentPage(Math.max(1, executeCurrentPage - 1))}
              disabled={executeCurrentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{executeCurrentPage} / {executeTotalPages || 1}</span>
            <button
              onClick={() => setExecuteCurrentPage(Math.min(executeTotalPages, executeCurrentPage + 1))}
              disabled={executeCurrentPage >= executeTotalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      <ExecuteDetailModal
        show={executeShowDetailModal}
        record={executeSelectedRecord}
        onClose={() => setExecuteShowDetailModal(false)}
      />

      {/* 新增弹窗 */}
      {executeShowAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">新增领料出库单</h3>
              <button onClick={() => setExecuteShowAddModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">出库单号</label>
                  <div className="text-sm font-medium text-gray-900">{executeAddForm.code || '系统自动生成'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">关联领料单号</label>
                  <select
                    value={executeSelectedApplicationCode}
                    onChange={(e) => {
                      setExecuteSelectedApplicationCode(e.target.value);
                      setExecuteSelectedMaterialIndices(new Set());
                      setExecuteMaterialActualQuantities({});
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择领料单</option>
                    {materialReceivingDetails
                      .filter(app => app.status === '已审批' && app.materials.length > 0)
                      .map(app => (
                        <option key={app.id} value={app.code}>
                          {app.code} - {app.applicant}
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={executeAddForm.date}
                    onChange={(e) => setExecuteAddForm({ ...executeAddForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={executeAddForm.warehouseLocation}
                    onChange={(e) => setExecuteAddForm({ ...executeAddForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">操作人</label>
                  <input
                    type="text"
                    value={executeAddForm.reviewer}
                    onChange={(e) => setExecuteAddForm({ ...executeAddForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {executeSelectedApplicationCode && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">选择物料（勾选要出库的物料并填写实发数量）</label>
                    <button
                      onClick={handleAddToMaterialPool}
                      disabled={executeSelectedMaterialIndices.size === 0}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      添加到物料池 ({executeSelectedMaterialIndices.size})
                    </button>
                  </div>
                  {(() => {
                    const selectedApp = materialReceivingDetails.find(app => app.code === executeSelectedApplicationCode);
                    if (!selectedApp) return null;
                    return (
                      <table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 w-10">选择</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">当前库存</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实发数量</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedApp.materials.map((material, idx) => (
                            <tr key={idx} className={executeSelectedMaterialIndices.has(idx) ? 'bg-emerald-50' : ''}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={executeSelectedMaterialIndices.has(idx)}
                                  onChange={(e) => {
                                    const newSelected = new Set(executeSelectedMaterialIndices);
                                    if (e.target.checked) {
                                      newSelected.add(idx);
                                      setExecuteMaterialActualQuantities({
                                        ...executeMaterialActualQuantities,
                                        [idx]: material.requestedQuantity
                                      });
                                    } else {
                                      newSelected.delete(idx);
                                      const newQuantities = { ...executeMaterialActualQuantities };
                                      delete newQuantities[idx];
                                      setExecuteMaterialActualQuantities(newQuantities);
                                    }
                                    setExecuteSelectedMaterialIndices(newSelected);
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.materialName}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.spec}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.unit}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.stockQuantity}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={material.requestedQuantity}
                                  value={executeMaterialActualQuantities[idx] ?? material.requestedQuantity}
                                  onChange={(e) => {
                                    setExecuteMaterialActualQuantities({
                                      ...executeMaterialActualQuantities,
                                      [idx]: Number(e.target.value)
                                    });
                                  }}
                                  disabled={!executeSelectedMaterialIndices.has(idx)}
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {executeMaterialPool.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700 mb-2">物料池（可修改实发数量或移除）</label>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600 w-16">操作</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {executeMaterialPool.map((material, idx) => {
                        const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                        const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                        return (
                          <tr key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleRemoveFromMaterialPool(idx)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                移除
                              </button>
                            </td>
                            <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</td>
                            <td className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.materialName}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.spec}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.unit}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{subtotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max={material.requestedQuantity}
                                value={material.actualQuantity}
                                onChange={(e) => handleUpdateMaterialPoolQuantity(idx, Number(e.target.value))}
                                className={`w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleExecuteCancelAdd}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleExecuteSaveAdd}
                disabled={executeMaterialPool.length === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {executeShowEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑领料出库单</h3>
              <button onClick={() => setExecuteShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                  <div className="text-sm font-medium text-gray-900">{executeSelectedRecord?.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={executeEditForm.date}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={executeEditForm.applicant}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={executeEditForm.warehouseLocation}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">审核人</label>
                  <input
                    type="text"
                    value={executeEditForm.reviewer}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={executeEditForm.productionBatchCode}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">执行状态</label>
                  <select
                    value={executeEditForm.executeStatus}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, executeStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="待出库">待出库</option>
                    <option value="部分出库">部分出库</option>
                    <option value="已出库">已出库</option>
                    <option value="已取消">已取消</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleExecuteEditAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {executeEditForm.materials.length > 0 && (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">来源领料单号</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">申请数量</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">实际库存</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">本次实发</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">单价(元)</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">小计(元)</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">仓库货位</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">备注</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {executeEditForm.materials.map((material, idx) => {
                        const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                        const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                        return (
                          <tr key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.applicationCode || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'applicationCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono bg-gray-50"
                                readOnly
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.actualQuantity}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.remark}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleExecuteEditRemoveMaterial(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleExecuteCancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleExecuteSaveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {executeShowDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-500">确定要删除这条领料出库记录吗？此操作不可撤销。</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setExecuteShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出类型选择弹窗 */}
      {executeShowExportTypeModal && (
        <ExportTypeModal
          exportFileType={executeExportFileType}
          onChange={setExecuteExportFileType}
          onConfirm={confirmExecuteExport}
          onCancel={() => setExecuteShowExportTypeModal(false)}
        />
      )}

      {/* 编辑警告弹窗 */}
      <ExecuteEditWarningModal
        show={executeShowEditWarning}
        onCancel={() => { setExecuteShowEditWarning(false); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
        onConfirm={() => { setExecuteShowEditWarning(false); }}
      />

      {/* 删除警告弹窗 */}
      <ExecuteDeleteWarningModal
        show={executeShowDeleteWarning}
        onCancel={() => { setExecuteShowDeleteWarning(false); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
        onConfirm={() => { setExecuteShowDeleteWarning(false); }}
      />

      {/* 批量删除确认弹窗 */}
      <ExecuteBatchDeleteConfirmModal
        show={executeShowBatchDeleteConfirm}
        count={executeSelectedRows.length}
        onCancel={() => setExecuteShowBatchDeleteConfirm(false)}
        onConfirm={() => {
          setExecuteShowBatchDeleteConfirm(false);
          setExecuteSelectedRows([]);
          setExecuteBatchEditMode(false);
          alert(`已删除 ${executeSelectedRows.length} 项领料出库记录`);
        }}
      />

      {/* 批量编辑出库弹窗 */}
      <ExecuteBatchEditModal
        show={executeShowBatchEditModal}
        selectedRows={executeSelectedRows}
        batchEditedRecords={executeBatchEditedRecords}
        currentBatchEditIndex={executeCurrentBatchEditIndex}
        recordsList={materialExecuteDetails.filter(r => executeSelectedRows.includes(r.id))}
        onClose={() => { setExecuteShowBatchEditModal(false); setExecuteBatchEditedRecords({}); setExecuteCurrentBatchEditIndex(0); }}
        onRecordChange={(idx) => setExecuteCurrentBatchEditIndex(idx)}
        onFieldChange={(recordId, field, value) => {
          const record = materialExecuteDetails.find(r => r.id === recordId);
          const currentData = executeBatchEditedRecords[recordId] ?? record ?? { materials: [] };
          setExecuteBatchEditedRecords({
            ...executeBatchEditedRecords,
            [recordId]: { ...currentData, [field]: value }
          });
        }}
        onMaterialChange={(recordId, materialIdx, field, value) => {
          const record = materialExecuteDetails.find(r => r.id === recordId);
          const currentData = executeBatchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials[materialIdx] = { ...materials[materialIdx], [field]: value };
          setExecuteBatchEditedRecords({
            ...executeBatchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onMaterialDelete={(recordId, materialIdx) => {
          const record = materialExecuteDetails.find(r => r.id === recordId);
          const currentData = executeBatchEditedRecords[recordId] ?? record ?? { materials: [] };
          const materials = [...((currentData as { materials?: any[] }).materials || [])];
          materials.splice(materialIdx, 1);
          setExecuteBatchEditedRecords({
            ...executeBatchEditedRecords,
            [recordId]: { ...currentData, materials }
          });
        }}
        onSaveAll={() => {
          setExecuteShowBatchEditModal(false);
          setExecuteBatchEditedRecords({});
          setExecuteCurrentBatchEditIndex(0);
          setExecuteBatchEditMode(false);
          setExecuteSelectedRows([]);
          alert('批量编辑成功');
        }}
      />
      </div>

      {/* 领料统计 Tab内容 */}
      <div className={activeTab === 'statistics' ? '' : 'hidden'}>
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
                productionPlanOptions={['FQ2026-001', 'FQ2026-002', 'FQ2026-003', 'FQ2026-004', 'FQ2026-005', 'FQ2026-006', 'FQ2026-007', 'FQ2026-008', 'FQ2026-009', 'FQ2026-010', 'FQ2026-011', 'FQ2026-012']}
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
                          <>
                            {/* 月份汇总行（可点击展开） */}
                            <tr 
                              key={monthRow.month} 
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
                          </>
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
        {statShowExportTypeModal && (
          <ExportTypeModal
            exportFileType={statExportFileType}
            onChange={setStatExportFileType}
            onConfirm={statExportTarget === 'monthly' ? confirmStatExport : confirmMaterialStatExport}
            onCancel={() => setStatShowExportTypeModal(false)}
          />
        )}

        {/* 详情查看弹窗 */}
        <StatDetailModal
          show={statShowDetailModal}
          record={statSelectedRecord}
          onClose={() => setStatShowDetailModal(false)}
        />
      </div>

      {/* 成本核算 Tab内容 */}
      <div className={activeTab === 'cost' ? '' : 'hidden'}>
        <div className="space-y-4">
          {/* Tab切换 - 放在时间筛选上方 */}
          <CostTabSwitcher activeTab={costActiveTab} onTabChange={setCostActiveTab} />

          {/* 筛选表单 */}
          <CostFiltersForm filters={costFilters} onChange={setCostFilters} />

          {/* Tab 1: 成本概览 */}
          {costActiveTab === 'overview' && (
            <div className="space-y-4">
              {/* 动态计算KPI */}
              {(() => {
                const filteredRecords = filterCostRecords(costFilters);
                const totalCost = calcCostTotal(filteredRecords);
                const monthlyCost = calcMonthlyCost(filteredRecords);
                const batchData = aggregateByBatch(filteredRecords);
                const avgBatchCost = batchData.length > 0 ? totalCost / batchData.length : 0;
                const costDiffRate = -2.3; // 简化处理
                return (
                  <CostKPICards
                    totalCost={totalCost}
                    monthlyCost={monthlyCost}
                    avgBatchCost={avgBatchCost}
                    costDiffRate={costDiffRate}
                  />
                );
              })()}

              <div className="grid grid-cols-3 gap-4">
                {/* 成本构成饼图 */}
                <div className="col-span-1">
                  {(() => {
                    const filteredRecords = filterCostRecords(costFilters);
                    const categoryData = aggregateByCategory(filteredRecords);
                    const pieData = categoryData.map(cat => ({
                      name: cat.category,
                      value: cat.totalAmount,
                      percentage: cat.percentage,
                      solid: '#10B981',
                    }));
                    return <CostPieChart data={pieData} />;
                  })()}
                </div>

                {/* 成本趋势图 */}
                <div className="col-span-2">
                  {(() => {
                    const filteredRecords = filterCostRecords(costFilters);
                    const monthData = aggregateByMonth(filteredRecords);
                    const trendData = monthData.map(m => ({
                      month: m.month,
                      totalCost: m.totalAmount,
                    }));
                    return <CostTrendChart data={trendData} />;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: 分类对比 */}
          {costActiveTab === 'comparison' && (
            <div className="space-y-4">
              {(() => {
                const filteredRecords = filterCostRecords(costFilters);
                const categoryData = aggregateByCategory(filteredRecords);
                const deptData = aggregateByDepartment(filteredRecords);
                const batchData = aggregateByBatch(filteredRecords);
                const batchMaterialDetails = getBatchMaterialDetails(filteredRecords);
                return (
                  <CostComparisonTable
                    categoryData={categoryData}
                    departmentData={deptData}
                    batchData={batchData}
                    batchMaterialDetails={batchMaterialDetails}
                    onViewDetail={(dimension, value) => {
                      const details = getFilteredMaterialDetails(filteredRecords, dimension as 'category' | 'department' | 'batch', value);
                      setCostDetailTitle(`${value} 明细`);
                      setCostDetailData(details);
                      setCostDetailModalOpen(true);
                    }}
                  />
                );
              })()}
            </div>
          )}
        </div>

        {/* 成本明细弹窗 */}
        <CostDetailModal
          isOpen={costDetailModalOpen}
          onClose={() => setCostDetailModalOpen(false)}
          title={costDetailTitle}
          data={costDetailData}
        />
      </div>
      </div>
    </div>
  );
}
