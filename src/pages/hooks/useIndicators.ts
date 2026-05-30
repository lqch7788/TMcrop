/**
 * 指标数据管理 Hook (V2.1 架构 — 薄包装层)
 *
 * 数据流：组件 → useIndicators → useIndicatorDataStore → enhancedApiClient → API
 * UI 状态（筛选/分页/弹窗/选择）保留在 Hook 中
 * 业务数据全部委托给 useIndicatorDataStore
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useIndicatorDataStore } from '../../stores/useIndicatorDataStore';
import { getDictItems } from '../../stores/useDictionaryStore';
import type {
  Indicator,
  EvaluationItem,
  AnalyzeItem,
  CategorySummary,
  IndicatorCategory,
  ModalType,
  ActiveTab
} from '../types/indicators.types';

// ========== 静态配置 ==========

/** 从数据字典动态获取指标类别选项（含"全部"） */
export function getIndicatorCategories(): IndicatorCategory[] {
  const dictItems = getDictItems('indicator_category');
  const categories = dictItems.map(d => d.dictLabel as IndicatorCategory);
  return ['全部', ...categories];
}

// ========== 工具函数 ==========

/** 获取趋势图标类型 */
export const getTrendIcon = (trend: string): 'up' | 'down' | 'stable' => {
  return trend as 'up' | 'down' | 'stable';
};

/** 获取进度条颜色 */
export const getProgressColor = (actual: number, target: number): string => {
  const ratio = actual / target;
  if (ratio >= 1) return 'bg-emerald-500';
  if (ratio >= 0.95) return 'bg-amber-500';
  return 'bg-red-500';
};

/** 获取达成率颜色 */
export const getAchievementColor = (actual: number, target: number): string => {
  const ratio = (actual / target) * 100;
  if (ratio >= 100) return 'text-emerald-600';
  if (ratio >= 95) return 'text-amber-600';
  return 'text-red-600';
};

/** 计算达成率 */
export const calcAchievementRate = (actual: number, target: number): string => {
  return ((actual / target) * 100).toFixed(1) + '%';
};

/**
 * 指标数据管理 Hook
 * UI 状态保留在 Hook，数据操作委托给 Store
 */
export function useIndicators() {
  const { toast } = useToast();

  // ========== 从 Store 获取数据（选择器订阅，避免全量重渲染）==========
  const indicators = useIndicatorDataStore(s => s.indicators);
  const evaluationData = useIndicatorDataStore(s => s.evaluationData);
  const analyzeData = useIndicatorDataStore(s => s.analyzeData);
  const categorySummary = useIndicatorDataStore(s => s.categorySummary);
  const loading = useIndicatorDataStore(s => s.isLoading);
  const fetchIndicators = useIndicatorDataStore(s => s.fetchIndicators);
  const fetchEvaluations = useIndicatorDataStore(s => s.fetchEvaluations);
  const createIndicator = useIndicatorDataStore(s => s.createIndicator);
  const updateIndicator = useIndicatorDataStore(s => s.updateIndicator);
  const deleteIndicator = useIndicatorDataStore(s => s.deleteIndicator);

  // ========== UI 状态（保留在 Hook 中）==========

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

  // ========== 初始化加载数据 ==========
  useEffect(() => {
    fetchIndicators();
    fetchEvaluations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== 筛选后的指标数据 ==========
  const filteredIndicators = useMemo(() => {
    return indicators.filter(ind => {
      const matchesCategory = categoryFilter === '全部' || ind.category === categoryFilter;
      const matchesSearch = !searchKeyword ||
        ind.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [indicators, categoryFilter, searchKeyword]);

  // ========== 分页数据 ==========
  const totalPages = useMemo(() => Math.ceil(filteredIndicators.length / pageSize), [filteredIndicators.length, pageSize]);
  const startIndex = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const paginatedIndicators = useMemo(() =>
    filteredIndicators.slice(startIndex, startIndex + pageSize),
    [filteredIndicators, startIndex, pageSize]
  );

  // ========== 重置分页 ==========
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // ========== 刷新数据 ==========
  const refreshIndicators = useCallback(async () => {
    await fetchIndicators();
  }, [fetchIndicators]);

  // ========== 弹窗操作 ==========
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

  // ========== 保存操作（新增/编辑）— 委托给 Store ==========
  const handleSave = useCallback(async (indicatorData: Partial<Indicator>) => {
    try {
      if (modalType === 'add') {
        await createIndicator(indicatorData);
        toast.success('创建成功');
      } else if (modalType === 'edit' && selectedIndicator) {
        await updateIndicator(selectedIndicator.id, indicatorData);
        toast.success('保存成功');
      }
      handleCloseModal();
    } catch (error) {
      // logger.error('保存指标失败:', error);
      toast.error((error as Error)?.message || '保存失败');
    }
  }, [modalType, selectedIndicator, handleCloseModal, toast, createIndicator, updateIndicator]);

  // ========== 删除操作 — 委托给 Store ==========
  const handleDelete = useCallback((item: Indicator) => {
    setDeleteItem(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem) return;
    try {
      await deleteIndicator(deleteItem.id);
      toast.success('删除成功');
    } catch (error) {
      // logger.error('删除指标失败:', error);
      toast.error('删除失败');
    } finally {
      setShowDeleteModal(false);
      setDeleteItem(null);
    }
  }, [deleteItem, toast, deleteIndicator]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteItem(null);
  }, []);

  // ========== 导出操作 ==========
  const handleExport = useCallback(() => {
    setExportMode(true);
    setSelectedIds([]);
  }, []);

  const handleExportConfirm = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleDoExport = useCallback(async () => {
    const currentIndicators = useIndicatorDataStore.getState().indicators;
    const dataToExport = selectedIds.length > 0
      ? currentIndicators.filter(ind => selectedIds.includes(ind.id))
      : currentIndicators;

    // 生成 Excel HTML 内容
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
        // logger.error('Export failed:', err);
      }
    }

    setShowExportModal(false);
    setExportMode(false);
    setSelectedIds([]);
    toast.success('导出成功');
  }, [selectedIds, exportFormat, toast]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedIds([]);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  // ========== 选择操作 ==========
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

  // ========== 分页操作 ==========
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
