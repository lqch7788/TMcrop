/**
 * 指标数据管理 Hook
 * 封装 Indicators.tsx 的状态管理和业务逻辑
 * 支持 API 调用和 localStorage 降级
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
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
import * as apiService from '../../services/apiIndicatorsService';

// 指标类别选项
export const CATEGORIES: IndicatorCategory[] = [
  '全部', '生产指标', '资源指标', '质量指标', '成本指标',
  '效率指标', '效益指标', '服务指标', '设备指标', '安全指标'
];

// 初始评估数据
const INITIAL_EVALUATION_DATA: EvaluationItem[] = [
  { id: '1', name: '上海松江基地', productionScore: 92, qualityScore: 95, costScore: 88, efficiencyScore: 90, totalScore: 91.25, rank: 1 },
  { id: '2', name: '上海崇明基地', productionScore: 88, qualityScore: 92, costScore: 85, efficiencyScore: 87, totalScore: 88.0, rank: 2 },
  { id: '3', name: '上海嘉定基地', productionScore: 85, qualityScore: 90, costScore: 90, efficiencyScore: 85, totalScore: 87.5, rank: 3 },
  { id: '4', name: '上海奉贤基地', productionScore: 90, qualityScore: 88, costScore: 82, efficiencyScore: 88, totalScore: 87.0, rank: 4 },
  { id: '5', name: '西安雁塔基地', productionScore: 82, qualityScore: 85, costScore: 88, efficiencyScore: 86, totalScore: 85.25, rank: 5 },
  { id: '6', name: '西安高新基地', productionScore: 80, qualityScore: 88, costScore: 85, efficiencyScore: 84, totalScore: 84.25, rank: 6 },
  { id: '7', name: '宁波北仑基地', productionScore: 78, qualityScore: 82, costScore: 86, efficiencyScore: 82, totalScore: 82.0, rank: 7 },
  { id: '8', name: '宁波镇海基地', productionScore: 75, qualityScore: 80, costScore: 84, efficiencyScore: 80, totalScore: 79.75, rank: 8 },
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

  // 指标数据状态
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [exportMode, setExportMode] = useState(false);

  // 选择状态
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 静态数据（保持不变）
  const evaluationData = INITIAL_EVALUATION_DATA;
  const analyzeData = INITIAL_ANALYZE_DATA;
  const categorySummary = CATEGORY_SUMMARY;

  // 初始化加载数据
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        setLoading(true);
        const data = await apiService.getIndicators();
        setIndicators(data);
      } catch (error) {
        console.error('加载指标数据失败:', error);
        toast.error('加载指标数据失败');
      } finally {
        setLoading(false);
      }
    };
    loadIndicators();
  }, [toast]);

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

  // 刷新数据
  const refreshIndicators = useCallback(async () => {
    try {
      const data = await apiService.getIndicators();
      setIndicators(data);
    } catch (error) {
      console.error('刷新指标数据失败:', error);
    }
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

  // 保存操作（新增/编辑）
  const handleSave = useCallback(async (indicatorData: Partial<Indicator>) => {
    try {
      if (modalType === 'add') {
        const newIndicator = await apiService.createIndicator(indicatorData as Omit<Indicator, 'id' | 'code'>);
        setIndicators(prev => [newIndicator, ...prev]);
        toast.success('创建成功');
      } else if (modalType === 'edit' && selectedIndicator) {
        const updated = await apiService.updateIndicator(selectedIndicator.id, indicatorData);
        if (updated) {
          setIndicators(prev => prev.map(ind => ind.id === selectedIndicator.id ? { ...ind, ...indicatorData } : ind));
          toast.success('保存成功');
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('保存指标失败:', error);
      toast.error('保存失败');
    }
  }, [modalType, selectedIndicator, handleCloseModal, toast]);

  // 删除操作
  const handleDelete = useCallback((item: Indicator) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem) return;
    try {
      await apiService.deleteIndicator(deleteItem.id);
      setIndicators(prev => prev.filter(ind => ind.id !== deleteItem.id));
      toast.success('删除成功');
    } catch (error) {
      console.error('删除指标失败:', error);
      toast.error('删除失败');
    } finally {
      setShowDeleteModal(false);
      setDeleteItem(null);
    }
  }, [deleteItem, toast]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  }, []);

  // 导出操作
  const handleExport = useCallback(() => {
    setExportMode(true);
    setSelectedIds([]);
  }, []);

  const handleExportConfirm = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleDoExport = useCallback(async () => {
    const dataToExport = selectedIds.length > 0
      ? indicators.filter(ind => selectedIds.includes(ind.id))
      : indicators;

    // 生成Excel HTML内容
    const headers = ['指标编码', '指标名称', '类别', '单位', '目标值', '实际值', '达成率', '趋势', '采集方式', '权重'];
    const rows = dataToExport.map(ind => [
      ind.code,
      ind.name,
      ind.category,
      ind.unit,
      ind.target,
      ind.actual,
      ((ind.actual / ind.target) * 100).toFixed(1) + '%',
      ind.trend === 'up' ? '上升' : ind.trend === 'down' ? '下降' : '持平',
      ind.source,
      ind.weight
    ]);

    let content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.forEach(row => {
      content += `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`;
    });
    content += '</table></body></html>';

    const mimeType = 'application/vnd.ms-excel;charset=utf-8';
    const extension = exportFormat === 'csv' ? 'csv' : exportFormat === 'word' ? 'doc' : 'xls';
    const fileName = `指标数据汇总_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Excel Files',
              accept: { [mimeType]: ['.' + extension] },
            },
          ],
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
      if ((err as Error).name !== 'AbortError') {
        console.error('Export failed:', err);
      }
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedIds([]);
    toast.success('导出成功');
  }, [selectedIds, indicators, exportFormat, toast]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedIds([]);
  }, []);

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
    loading,

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
    handleSave,

    // 删除弹窗状态
    showDeleteModal,
    deleteItem,
    handleDelete,
    handleDeleteConfirm,
    handleCloseDeleteModal,

    // 导出弹窗状态
    exportMode,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
    handleDoExport,
    handleCancelExport,
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

    // 刷新数据
    refreshIndicators,
  };
}
