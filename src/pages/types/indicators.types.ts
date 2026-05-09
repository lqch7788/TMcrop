/**
 * 指标数据类型定义
 * 用于 Indicators.tsx 页面组件的类型声明
 */

// 指标项基础信息
export interface Indicator {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  target: number;
  actual: number;
  trend: 'up' | 'down' | 'stable';
  frequency: string;
  source: string;
  warning: number;
  weight: number;
}

// 评估数据项
export interface EvaluationItem {
  id: string;
  name: string;
  productionScore: number;
  qualityScore: number;
  costScore: number;
  efficiencyScore: number;
  totalScore: number;
  rank: number;
}

// 分析数据项
export interface AnalyzeItem {
  month: string;
  target: number;
  actual: number;
  达成率: number;
}

// 分类汇总项
export interface CategorySummary {
  name: string;
  count: number;
  avgAchievement: number;
  color: string;
}

// 指标类别选项
export type IndicatorCategory =
  | '全部'
  | '生产指标'
  | '资源指标'
  | '质量指标'
  | '成本指标'
  | '效率指标'
  | '效益指标'
  | '服务指标'
  | '设备指标'
  | '安全指标';

// 弹窗类型
export type ModalType = 'add' | 'edit' | 'view' | 'analyze' | 'evaluate';

// 标签页类型
export type ActiveTab = 'list' | 'category' | 'analyze' | 'evaluate';

// 指标筛选器Props
export interface IndicatorsFiltersProps {
  searchKeyword: string;
  categoryFilter: IndicatorCategory;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: IndicatorCategory) => void;
}

// 指标表格Props
export interface IndicatorsTableProps {
  indicators: Indicator[];
  selectedIds: string[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onView: (item: Indicator) => void;
  onAnalyze: (item: Indicator) => void;
  onEdit: (item: Indicator) => void;
  onDelete: (item: Indicator) => void;
}

// 指标弹窗通用Props
export interface IndicatorsModalCommonProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

// 详情弹窗Props
export interface IndicatorsDetailModalProps extends IndicatorsModalCommonProps {
  indicator: Indicator | null;
  type: 'view' | 'analyze' | 'evaluate';
}

// 创建/编辑弹窗Props
export interface IndicatorsFormModalProps extends IndicatorsModalCommonProps {
  indicator: Indicator | null;
  mode: 'add' | 'edit';
}

// 删除确认弹窗Props
export interface IndicatorsDeleteModalProps {
  isOpen: boolean;
  item: Indicator | null;
  onClose: () => void;
  onConfirm: () => void;
}

// 导出弹窗Props
export interface IndicatorsExportModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  totalCount: number;
  onClose: () => void;
  onFormatChange: (format: string) => void;
  onConfirm: () => void;
}

// 分类管理面板Props
export interface CategoryPanelProps {
  categorySummary: CategorySummary[];
  indicators: Indicator[];
}

// 达成分析面板Props
export interface AnalyzePanelProps {
  analyzeData: AnalyzeItem[];
}

// 考核评价面板Props
export interface EvaluatePanelProps {
  evaluationData: EvaluationItem[];
}
