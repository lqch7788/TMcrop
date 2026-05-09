/**
 * 指标数据管理 Hook
 * 封装 Indicators.tsx 的状态管理和业务逻辑
 */
import { useState, useMemo, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import type {
  Indicator,
  EvaluationItem,
  AnalyzeItem,
  CategorySummary,
  IndicatorCategory,
  ModalType,
  ActiveTab
} from '../types/indicators.types';

// 指标类别选项
export const CATEGORIES: IndicatorCategory[] = [
  '全部', '生产指标', '资源指标', '质量指标', '成本指标',
  '效率指标', '效益指标', '服务指标', '设备指标', '安全指标'
];

// 初始指标数据
const INITIAL_INDICATORS: Indicator[] = [
  { id: '1', code: 'KPI001', name: '月产量完成率', category: '生产指标', unit: '%', target: 95, actual: 92.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 90, weight: 15 },
  { id: '2', code: 'KPI002', name: '温室利用率', category: '资源指标', unit: '%', target: 90, actual: 88.3, trend: 'down', frequency: '月度', source: '自动采集', warning: 85, weight: 10 },
  { id: '3', code: 'KPI003', name: '种苗成活率', category: '质量指标', unit: '%', target: 98, actual: 97.2, trend: 'up', frequency: '季度', source: '自动采集', warning: 95, weight: 12 },
  { id: '4', code: 'KPI004', name: '病虫害发生率', category: '质量指标', unit: '%', target: 5, actual: 3.8, trend: 'down', frequency: '月度', source: '自动采集', warning: 8, weight: 10 },
  { id: '5', code: 'KPI005', name: '采收损耗率', category: '质量指标', unit: '%', target: 3, actual: 2.5, trend: 'down', frequency: '月度', source: '人工录入', warning: 5, weight: 8 },
  { id: '6', code: 'KPI006', name: '人工成本占比', category: '成本指标', unit: '%', target: 25, actual: 26.2, trend: 'up', frequency: '月度', source: '自动采集', warning: 28, weight: 10 },
  { id: '7', code: 'KPI007', name: '肥料利用率', category: '效率指标', unit: '%', target: 85, actual: 82.1, trend: 'up', frequency: '季度', source: '人工录入', warning: 80, weight: 8 },
  { id: '8', code: 'KPI008', name: '亩均产值', category: '效益指标', unit: '万元/亩', target: 3.5, actual: 3.2, trend: 'up', frequency: '年度', source: '人工录入', warning: 3.0, weight: 15 },
  { id: '9', code: 'KPI009', name: '客户满意度', category: '服务指标', unit: '分', target: 90, actual: 92, trend: 'up', frequency: '季度', source: '人工录入', warning: 85, weight: 10 },
  { id: '10', code: 'KPI010', name: '设备完好率', category: '设备指标', unit: '%', target: 95, actual: 94.5, trend: 'down', frequency: '月度', source: '自动采集', warning: 90, weight: 8 },
  { id: '11', code: 'KPI011', name: '水资源利用率', category: '效率指标', unit: '%', target: 80, actual: 78.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 75, weight: 8 },
  { id: '12', code: 'KPI012', name: '农残检测合格率', category: '质量指标', unit: '%', target: 100, actual: 99.8, trend: 'stable', frequency: '批次', source: '人工录入', warning: 98, weight: 12 },
  { id: '13', code: 'KPI013', name: '新品研发周期', category: '效率指标', unit: '天', target: 60, actual: 55, trend: 'down', frequency: '年度', source: '人工录入', warning: 70, weight: 6 },
  { id: '14', code: 'KPI014', name: '能源消耗强度', category: '成本指标', unit: 'kWh/亩', target: 800, actual: 850, trend: 'up', frequency: '月度', source: '自动采集', warning: 900, weight: 8 },
  { id: '15', code: 'KPI015', name: '员工培训完成率', category: '服务指标', unit: '%', target: 95, actual: 93, trend: 'up', frequency: '季度', source: '人工录入', warning: 90, weight: 5 },
  { id: '16', code: 'KPI016', name: '安全事故发生率', category: '安全指标', unit: '次', target: 0, actual: 1, trend: 'up', frequency: '月度', source: '人工录入', warning: 2, weight: 15 },
];

// 初始评估数据
const INITIAL_EVALUATION_DATA: EvaluationItem[] = [
  { id: '1', name: '基地一', productionScore: 92, qualityScore: 95, costScore: 88, efficiencyScore: 90, totalScore: 91.25, rank: 1 },
  { id: '2', name: '基地二', productionScore: 88, qualityScore: 92, costScore: 85, efficiencyScore: 87, totalScore: 88.0, rank: 2 },
  { id: '3', name: '基地三', productionScore: 85, qualityScore: 90, costScore: 90, efficiencyScore: 85, totalScore: 87.5, rank: 3 },
  { id: '4', name: '基地四', productionScore: 90, qualityScore: 88, costScore: 82, efficiencyScore: 88, totalScore: 87.0, rank: 4 },
  { id: '5', name: '基地五', productionScore: 82, qualityScore: 85, costScore: 88, efficiencyScore: 86, totalScore: 85.25, rank: 5 },
  { id: '6', name: '基地六', productionScore: 80, qualityScore: 88, costScore: 85, efficiencyScore: 84, totalScore: 84.25, rank: 6 },
  { id: '7', name: '基地七', productionScore: 78, qualityScore: 82, costScore: 86, efficiencyScore: 82, totalScore: 82.0, rank: 7 },
  { id: '8', name: '基地八', productionScore: 75, qualityScore: 80, costScore: 84, efficiencyScore: 80, totalScore: 79.75, rank: 8 },
];

// 初始分析数据
const INITIAL_ANALYZE_DATA: AnalyzeItem[] = [
  { month: '1月', target: 100, actual: 95, 达成率: 95 },
  { month: '2月', target: 105, actual: 102, 达成率: 97.1 },
  { month: '3月', target: 110, actual: 108, 达成率: 98.2 },
  { month: '4月', target: 115, actual: 112, 达成率: 97.4 },
  { month: '5月', target: 120, actual: 118, 达成率: 98.3 },
  { month: '6月', target: 125, actual: 122, 达成率: 97.6 },
];

// 分类汇总数据
const CATEGORY_SUMMARY: CategorySummary[] = [
  { name: '生产指标', count: 3, avgAchievement: 95.2, color: '#06b6d4' },
  { name: '质量指标', count: 4, avgAchievement: 96.5, color: '#7C3AED' },
  { name: '成本指标', count: 2, avgAchievement: 92.0, color: '#22c55e' },
  { name: '效率指标', count: 3, avgAchievement: 93.8, color: '#f59e0b' },
  { name: '服务指标', count: 2, avgAchievement: 94.5, color: '#ec4899' },
  { name: '设备指标', count: 1, avgAchievement: 99.5, color: '#0891b2' },
];

// 工具函数：获取趋势图标类型
export const getTrendIcon = (trend: string): 'up' | 'down' | 'stable' => {
  return trend as 'up' | 'down' | 'stable';
};

// 工具函数：获取进度条颜色
export const getProgressColor = (actual: number, target: number): string => {
  const ratio = actual / target;
  if (ratio >= 1) return 'bg-emerald-500';
  if (ratio >= 0.95) return 'bg-amber-500';
  return 'bg-red-500';
};

// 工具函数：获取达成率颜色
export const getAchievementColor = (actual: number, target: number): string => {
  const ratio = (actual / target) * 100;
  if (ratio >= 100) return 'text-emerald-600';
  if (ratio >= 95) return 'text-amber-600';
  return 'text-red-600';
};

// 计算达成率
export const calcAchievementRate = (actual: number, target: number): string => {
  return ((actual / target) * 100).toFixed(1) + '%';
};

/**
 * 指标数据管理 Hook
 */
export function useIndicators() {
  const { toast } = useToast();

  // 筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IndicatorCategory>('全部');

  // 标签页状态
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('view');
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  // 删除弹窗状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Indicator | null>(null);

  // 导出弹窗状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 静态数据（保持不变）
  const indicators = INITIAL_INDICATORS;
  const evaluationData = INITIAL_EVALUATION_DATA;
  const analyzeData = INITIAL_ANALYZE_DATA;
  const categorySummary = CATEGORY_SUMMARY;

  // 筛选后的指标数据
  const filteredIndicators = useMemo(() => {
    return indicators.filter(ind => {
      const matchesCategory = categoryFilter === '全部' || ind.category === categoryFilter;
      const matchesSearch = !searchKeyword ||
        ind.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [indicators, categoryFilter, searchKeyword]);

  // 分页数据
  const totalPages = useMemo(() => Math.ceil(filteredIndicators.length / pageSize), [filteredIndicators.length, pageSize]);
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const paginatedIndicators = useMemo(() =>
    filteredIndicators.slice(startIndex, startIndex + pageSize),
    [filteredIndicators, startIndex, pageSize]
  );

  // 重置分页
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // 弹窗操作
  const handleView = useCallback((item: Indicator) => {
    setSelectedIndicator(item);
    setModalType('view');
    setShowModal(true);
  }, []);

  const handleAnalyze = useCallback((item: Indicator) => {
    setSelectedIndicator(item);
    setModalType('analyze');
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((item: Indicator) => {
    setSelectedIndicator(item);
    setModalType('edit');
    setShowModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedIndicator(null);
    setModalType('add');
    setShowModal(true);
  }, []);

  const handleEvaluate = useCallback(() => {
    setModalType('evaluate');
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedIndicator(null);
  }, []);

  // 删除操作
  const handleDelete = useCallback((item: Indicator) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
    toast.success('删除成功');
  }, [toast]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  }, []);

  // 导出操作
  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleExportConfirm = useCallback(() => {
    setShowExportModal(false);
    setSelectedIds([]);
    toast.success('导出成功');
  }, [toast]);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  // 选择操作
  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === paginatedIndicators.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedIndicators.map(ind => ind.id));
    }
  }, [selectedIds.length, paginatedIndicators]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  // 分页操作
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    resetPagination();
  }, [resetPagination]);

  return {
    // 数据
    indicators,
    evaluationData,
    analyzeData,
    categorySummary,

    // 筛选状态
    searchKeyword,
    categoryFilter,
    setSearchKeyword,
    setCategoryFilter,

    // 标签页状态
    activeTab,
    setActiveTab,

    // 弹窗状态
    showModal,
    modalType,
    selectedIndicator,
    handleView,
    handleAnalyze,
    handleEdit,
    handleAdd,
    handleEvaluate,
    handleCloseModal,

    // 删除弹窗状态
    showDeleteModal,
    deleteItem,
    handleDelete,
    handleDeleteConfirm,
    handleCloseDeleteModal,

    // 导出弹窗状态
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
    handleCloseExportModal,

    // 选择状态
    selectedIds,
    handleSelectAll,
    handleToggleSelect,

    // 分页状态
    currentPage,
    pageSize,
    totalPages,
    paginatedIndicators,
    filteredIndicators,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
  };
}
