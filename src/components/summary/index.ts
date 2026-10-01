/**
 * 生产汇总表模块公共组件导出
 */

// 类型
export * from './types';

// 组件
export { PageHeader } from './PageHeader';
export { StatCards } from './StatCards';
export { Filters } from './Filters';
export { SummaryTable } from './SummaryTable';
export { ExportModal } from './ExportModal';
export { ReportTabs } from './ReportTabs';
export { ReportCharts } from './ReportCharts';
export { DataResetButton } from './DataResetButton';

// V1.0 新版组件
export { KpiCard } from './KpiCard';
export type { KpiCardProps } from './KpiCard';
export { KpiCardGrid } from './KpiCardGrid';
export type { KpiCardGridProps } from './KpiCardGrid';
export { DetailDrawer } from './DetailDrawer';
export type { DetailDrawerProps } from './DetailDrawer';
export { AlertCard } from './AlertCard';
export type { AlertCardProps } from './AlertCard';
export { SummaryDateFilter } from './SummaryDateFilter';
export type { SummaryDateFilterProps } from './SummaryDateFilter';

// 看板专用组件（2026-09-29）
export { TodoStrip } from './TodoStrip';
export type { TodoStripProps, TodoItem } from './TodoStrip';
export { ModuleHealthGrid } from './ModuleHealthGrid';
export type { ModuleHealthGridProps, ModuleCard, ModuleMetric } from './ModuleHealthGrid';
export { OperationsPerspective } from './OperationsPerspective';
export type { OperationsPerspectiveProps } from './OperationsPerspective';
export { DrilldownModal } from './DrilldownModal';
export type { DrilldownModalProps } from './DrilldownModal';

// 汇总看板 v2 新增组件（2026-10-01 浅色基底 + 顶部深色玻璃 Hero）
export { HeroPageHeader } from './HeroPageHeader';
export type { HeroPageHeaderProps } from './HeroPageHeader';
export { HeroScoreGauge } from './HeroScoreGauge';
export type { HeroScoreGaugeProps } from './HeroScoreGauge';
export { DenseKpiGrid } from './DenseKpiGrid';
export type { DenseKpiGridProps, DenseKpiItem } from './DenseKpiGrid';
export { AlertTicker } from './AlertTicker';
export type { AlertTickerProps, AlertTickerItem } from './AlertTicker';
export { CornerGlow } from './CornerGlow';
export type { CornerGlowProps, GlowColor } from './CornerGlow';

// Hooks
export { useExport } from './useExport';

// 共享图表组件（V1.0）
export { GaugeChart } from './GaugeChart';
export type { GaugeChartProps } from './GaugeChart';
export { TrendChart } from './TrendChart';
export type { TrendChartProps, BarSeriesConfig, LineSeriesConfig } from './TrendChart';
export { DistributionPie } from './DistributionPie';
export type { DistributionPieProps, PieDataItem } from './DistributionPie';
