/**
 * 指标看板 —— 指标体系总览 + 指标库管理
 *
 * 2026-09-29 合并「指标数据」页（原 /indicators）后的统一页面，四个 TAB：
 *   ① 总览     综合得分 / 分类雷达 / 自动指标卡 / 重点关注
 *   ② 指标列表 自动指标(9) + 手工指标(19) 合一的清单，支持筛选、分页、编辑、删除、导出
 *   ③ 分类管理 分类汇总 + 分布饼图 + 定义配置（复用原指标数据页组件）
 *   ④ 考核评价 基地考核排名（复用原指标数据页组件）
 *
 * 数据源：
 *   - useSummaryDataStore.indicatorBoard → /api/summary/indicator-board
 *     自动指标实际值实时聚合；手工指标来自 indicators 表；带 direction / status / dataSource
 *   - useIndicatorDataStore → /api/indicators、/api/indicator-evaluations
 *     提供分类汇总、考核评价，以及指标的增删改
 *
 * 合并要点：
 *   - 达成率一律走 board 的方向判断（旧页面用 actual/target 硬算，对"越低越好"的成本类指标会算反）
 *   - 自动指标的实际值是实时算的，**不可编辑**；只能改其目标值（存在指标库里）
 *   - 手工指标可完整增删改
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Gauge, Loader2, AlertCircle, Target, TrendingUp, TrendingDown, CheckCircle2,
  Plus, Download, Search, Eye, Edit, Trash2, Layers,
} from 'lucide-react';
import {
  // recharts 的图表 Tooltip 与 UI 库的同名，此处起别名避免冲突
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { PageHeader, SummaryDateFilter, OperationsPerspective } from '../../components/summary';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Input, Pagination, Tooltip } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { useSummaryDataStore, type IndicatorBoardItem } from '../../stores/useSummaryDataStore';
import { useIndicatorDataStore } from '../../stores/useIndicatorDataStore';
import { currentYearRange, rangeByMode, todayLocal } from '../../lib/dateUtils';
import type { Indicator, CategorySummary } from '../types/indicators.types';
import CategoryPanel from '../components/Indicators/IndicatorsPanels';
import CreateModal from '../components/Indicators/IndicatorsModals/CreateModal';
import DetailModal from '../components/Indicators/IndicatorsModals/DetailModal';
import DeleteModal from '../components/Indicators/IndicatorsModals/DeleteModal';

// ========== 状态样式字典 ==========

const STATUS_STYLE: Record<IndicatorBoardItem['status'], {
  dot: string; text: string; bg: string; label: string;
}> = {
  good: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: '达标' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: '注意' },
  bad: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', label: '未达标' },
};

/** 达成率 → 颜色 */
function achievementColor(v: number): string {
  if (v >= 100) return 'text-emerald-600';
  if (v >= 80) return 'text-amber-600';
  return 'text-red-600';
}

/** 看板指标项 → 指标库记录（供编辑/详情弹窗复用原有组件） */
function toIndicator(item: IndicatorBoardItem): Indicator {
  return {
    id: item.id || item.code || item.key || '',
    code: item.code || item.key || '',
    name: item.name,
    category: item.category,
    unit: item.unit || '',
    target: item.target,
    actual: item.actual,
    trend: (item.trend as Indicator['trend']) || 'stable',
    frequency: item.frequency || '月度',
    source: item.source || '自动采集',
    warning: item.warning,
    weight: item.weight,
  };
}

/**
 * 指标分类归一化
 *
 * 指标库里存在两套命名：前 8 条写「生产 / 质量 / 成本 / 效率 / 安全」，
 * 后 15 条写「生产指标 / 质量指标 / 成本指标 / …」（带「指标」后缀）。
 * 不归一化的话，分类汇总里会裂出「生产」与「生产指标」这类语义重复的条目（共 13 个）。
 * 展示时统一去掉后缀，让两批合并成同一分类。不改数据库，随时可逆。
 */
function normalizeCategory(cat: string): string {
  if (!cat) return '未分类';
  return cat.replace(/指标$/, '') || cat;
}

// ========== 加载态 ==========

function LoadingView() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <span className="text-gray-500">加载指标数据中...</span>
      </div>
    </div>
  );
}

// ========== 自动指标卡片 ==========

function IndicatorCard({ item }: { item: IndicatorBoardItem }) {
  const style = STATUS_STYLE[item.status];
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow overflow-hidden min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 truncate" title={item.name}>{item.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400">{item.category}</span>
            {item.fromLibrary ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500" title={`目标值取自指标库 ${item.linkCode}`}>
                指标库
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400" title="指标库中未登记，使用内置默认目标值">
                默认目标
              </span>
            )}
            {item.dataSource === 'demo' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-600" title="底层数据含系统演示/模拟数据，请勿直接用于对外汇报">
                演示数据
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600" title="实际值由真实业务数据实时聚合">
                实时
              </span>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-2xl font-bold flex-shrink-0 ${style.text}`}>
          {item.actual}
          <span className="text-sm font-medium ml-0.5">{item.unit}</span>
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">目标 {item.target}{item.unit}</span>
        <span
          className="ml-auto flex items-center gap-0.5 text-xs text-slate-400 flex-shrink-0"
          title={item.direction === 'lower' ? '越低越好' : '越高越好'}
        >
          {item.direction === 'lower' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {item.direction === 'lower' ? '越低越好' : '越高越好'}
        </span>
      </div>

      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${style.dot}`}
          style={{ width: `${Math.min(Math.max(item.achievement, 0), 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className={`font-medium flex-shrink-0 ${achievementColor(item.achievement)}`}>
          达成率 {item.achievement}%
        </span>
        {/* 环比：上升对"越高越好"是好事、对"越低越好"是坏事，故颜色随 direction 翻转 */}
        {item.changeRate !== null && item.changeRate !== undefined ? (
          <span
            className={`flex items-center gap-0.5 flex-shrink-0 ${
              (item.direction === 'lower' ? item.changeRate < 0 : item.changeRate > 0)
                ? 'text-emerald-600'
                : 'text-red-500'
            }`}
            title="较上一等长区间的变化率"
          >
            {item.changeRate > 0 ? <TrendingUp className="w-3 h-3" /> : item.changeRate < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {Math.abs(item.changeRate)}%
          </span>
        ) : (
          <span className="text-gray-300 flex-shrink-0" title="上一等长区间内没有该指标的数据，无法计算环比">
            上期无数据
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400 truncate" title={item.detail}>{item.detail}</div>
    </div>
  );
}

// ========== 主页面组件 ==========

type TabKey = 'overview' | 'list' | 'category' | 'operations';

export default function SummaryIndicators() {
  // ── 看板数据（自动指标实时计算 + 指标库手工指标）──
  const board = useSummaryDataStore((s) => s.indicatorBoard);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const error = useSummaryDataStore((s) => s.error);
  const fetchIndicatorBoard = useSummaryDataStore((s) => s.fetchIndicatorBoard);

  // ── 指标库数据与 CRUD（分类汇总、考核评价、增删改）──
  const indicators = useIndicatorDataStore((s) => s.indicators);
  const fetchIndicators = useIndicatorDataStore((s) => s.fetchIndicators);
  const createIndicator = useIndicatorDataStore((s) => s.createIndicator);
  const updateIndicator = useIndicatorDataStore((s) => s.updateIndicator);
  const deleteIndicator = useIndicatorDataStore((s) => s.deleteIndicator);

  // ── 页面状态 ──
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const [range, setRange] = useState(currentYearRange);

  // 列表筛选
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'auto' | 'manual'>('all');

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 弹窗状态
  const [formOpen, setFormOpen] = useState(false);
  const [formItem, setFormItem] = useState<Indicator | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Indicator | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Indicator | null>(null);
  const [saving, setSaving] = useState(false);

  // 时间范围变化 → 刷新看板（指标库与考核评价是全量数据，只取一次）
  useEffect(() => {
    fetchIndicatorBoard({ startDate: range.startDate, endDate: range.endDate });
  }, [range]);

  useEffect(() => {
    fetchIndicators();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== 派生数据 ==========

  const autoItems = board?.autoIndicators ?? [];
  const manualItems = board?.manualIndicators ?? [];

  /** 统一的指标清单：自动指标在前（实时、重要），手工指标在后 */
  const allItems = useMemo<IndicatorBoardItem[]>(
    () => [...autoItems, ...manualItems],
    [autoItems, manualItems]
  );

  /** 分类选项（从数据里取，避免依赖字典加载时机） */
  const categoryOptions = useMemo(
    () => ['全部', ...new Set(allItems.map((i) => i.category).filter(Boolean))],
    [allItems]
  );

  /** 筛选后的列表 */
  const filteredItems = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return allItems.filter((i) => {
      if (categoryFilter !== '全部' && i.category !== categoryFilter) return false;
      if (sourceFilter === 'auto' && i.dataSource === 'demo' && i.id) return false;
      if (sourceFilter === 'manual' && !i.id) return false;
      if (kw && !i.name.toLowerCase().includes(kw) && !(i.code || i.key || '').toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [allItems, categoryFilter, sourceFilter, searchKeyword]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / pageSize), 1);
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage]
  );

  // 筛选变化时回到第一页
  useEffect(() => { setCurrentPage(1); }, [searchKeyword, categoryFilter, sourceFilter]);

  /** 达标统计 */
  const goodCount = useMemo(() => autoItems.filter((i) => i.status === 'good').length, [autoItems]);
  const badCount = useMemo(() => autoItems.filter((i) => i.status === 'bad').length, [autoItems]);

  /** 重点关注（未达标项，达成率升序） */
  const unachieved = useMemo(
    () => [...autoItems, ...manualItems]
      .filter((i) => i.status !== 'good')
      .sort((a, b) => a.achievement - b.achievement)
      .slice(0, 8),
    [autoItems, manualItems]
  );

  /**
   * 分类汇总（供「分类管理」TAB 使用）
   *
   * 2026-09-29 统一口径：原先直接用 useIndicatorDataStore.categorySummary，
   * 那是基于指标库 23 条记录的 actual/target 现算的（前 8 条 actual 全为 0），
   * 导致同一个页面里「总览」说生产类达成 82%、「分类管理」却说 0%。
   * 现改用与总览同源的 28 条指标（自动 + 手工），并把分类命名归一化。
   */
  const boardCategorySummary = useMemo<CategorySummary[]>(() => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];
    const map = new Map<string, { count: number; sum: number }>();
    allItems.forEach((i) => {
      const cat = normalizeCategory(i.category);
      const cur = map.get(cat) || { count: 0, sum: 0 };
      cur.count += 1;
      // 封顶 100：超额完成的指标（如达成率 120%）不应把该分类的平均值拉高到失真
      cur.sum += Math.min(Math.max(i.achievement, 0), 100);
      map.set(cat, cur);
    });
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, v], idx) => ({
        name,
        count: v.count,
        avgAchievement: Math.round((v.sum / v.count) * 10) / 10,
        color: COLORS[idx % COLORS.length],
      }));
  }, [allItems]);

  /** 雷达图数据 */
  const radarData = useMemo(
    () => (board?.byCategory ?? []).map((c) => ({ subject: c.category, 达成率: c.achievement })),
    [board]
  );

  const score = board?.score ?? 0;

  // ========== 事件处理 ==========

  const handleModeChange = (mode: 'month' | 'quarter' | 'year' | 'custom') => {
    setFilterMode(mode);
    if (mode !== 'custom') setRange(rangeByMode(mode));
  };

  /** 新增：自动指标由代码定义，只能手工新增指标库条目 */
  const handleAdd = () => {
    setFormItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: IndicatorBoardItem) => {
    if (!item.id) return; // 自动指标无 id，不可编辑
    setFormItem(toIndicator(item));
    setFormOpen(true);
  };

  /** 从「指标定义配置」表打开编辑（数据直接来自 indicators 表，一定可编辑） */
  const handleEditFromLibrary = (indicator: Indicator) => {
    setFormItem(indicator);
    setFormOpen(true);
  };

  const handleView = (item: IndicatorBoardItem) => {
    setDetailItem(toIndicator(item));
    setDetailOpen(true);
  };

  const handleDelete = (item: IndicatorBoardItem) => {
    if (!item.id) return;
    setDeleteItem(toIndicator(item));
    setDeleteOpen(true);
  };

  /** 保存（新增/编辑）—— 成功后刷新看板，让新目标值/实际值立即生效 */
  const handleSave = async (data: Partial<Indicator>) => {
    setSaving(true);
    try {
      if (formItem?.id) {
        await updateIndicator(formItem.id, data);
      } else {
        await createIndicator(data);
      }
      await Promise.all([fetchIndicatorBoard(), fetchIndicators()]);
      setFormOpen(false);
      setFormItem(null);
    } catch (e) {
      // 失败时保持弹窗打开，便于用户修正后重试
      console.error('[指标看板] 保存失败:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem?.id) return;
    setSaving(true);
    try {
      await deleteIndicator(deleteItem.id);
      await Promise.all([fetchIndicatorBoard(), fetchIndicators()]);
      setDeleteOpen(false);
      setDeleteItem(null);
    } catch (e) {
      console.error('[指标看板] 删除失败:', e);
    } finally {
      setSaving(false);
    }
  };

  /** 导出当前筛选后的指标清单（Excel HTML，与项目其他导出保持一致） */
  const handleExport = () => {
    const headers = ['指标名称', '编码', '分类', '目标值', '实际值', '达成率', '状态', '方向', '数据来源'];
    const rows = filteredItems.map((i) => [
      i.name,
      i.code || i.key || '-',
      i.category,
      `${i.target}${i.unit}`,
      `${i.actual}${i.unit}`,
      `${i.achievement}%`,
      STATUS_STYLE[i.status].label,
      i.direction === 'lower' ? '越低越好' : '越高越好',
      i.dataSource === 'demo' ? '演示数据' : '实时',
    ]);
    const html = `<table border="1"><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${
      rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
    }</table>`;
    // 前缀 BOM 让 Excel 正确识别 UTF-8 中文
    const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `指标看板_${todayLocal()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========== 加载态 ==========

  if (isLoading && !board) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<Gauge className="w-6 h-6 text-white" />}
          title="指标看板"
          description="关键指标达成情况总览与指标库管理"
        />
        <LoadingView />
      </div>
    );
  }

  // ========== 渲染 ==========

  return (
    <div className="space-y-6">
      {/* 页头 + 操作按钮 */}
      <PageHeader
        icon={<Gauge className="w-6 h-6 text-white" />}
        title="指标看板"
        description="关键指标达成情况总览与指标库管理"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SummaryDateFilter
          mode={filterMode}
          onModeChange={handleModeChange}
          startDate={range.startDate}
          endDate={range.endDate}
          onDateChange={(s, e) => setRange({ startDate: s, endDate: e })}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> 导出
          </Button>
          <Button size="sm" variant="default" onClick={handleAdd}>
            <Plus className="w-4 h-4" /> 新增指标
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">数据加载失败：{error}</span>
        </div>
      )}

      {!board ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Gauge className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无指标数据</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="bg-white rounded-xl p-1 shadow-sm">
          <TabsList className="grid w-full grid-cols-4 gap-1 p-1 bg-gray-100/80 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Target className="w-4 h-4" />总览
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />指标列表
            </TabsTrigger>
            <TabsTrigger value="category" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />分类管理
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />运营透视
            </TabsTrigger>
          </TabsList>

          {/* ① 总览 */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col items-center justify-center">
                <span className="text-sm text-gray-500 mb-3">综合指标得分</span>
                <div className={`text-6xl font-bold ${achievementColor(score)}`}>{score}</div>
                <span className="text-sm text-gray-400 mt-1">/ 100 分</span>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-4">
                  <div
                    className={`h-full rounded-full ${score >= 100 ? 'bg-emerald-500' : score >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-5 text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />达标 {goodCount}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1.5 text-red-600">
                    <AlertCircle className="w-4 h-4" />未达标 {badCount}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">共 {autoItems.length} 项</span>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">综合得分按指标权重加权，仅统计自动计算指标</p>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-500" />分类达成率
                </h3>
                <p className="text-xs text-gray-400 mb-2">按指标分类聚合的加权达成情况</p>
                {radarData.length >= 3 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#374151' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                          formatter={(value: number) => [`${value}%`, '达成率']}
                        />
                        <Radar name="达成率" dataKey="达成率" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    {radarData.map((c) => (
                      <div key={c.subject} className="flex items-center gap-3 w-48">
                        <span className="text-sm text-gray-600 w-16">{c.subject}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(c.达成率, 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-right">{c.达成率}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">自动计算指标</h2>
                <span className="text-xs text-gray-400">
                  实际值由业务数据实时聚合；标「演示数据」的指标底层为系统模拟数据，请勿直接用于对外汇报
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {autoItems.map((item) => (
                  <IndicatorCard key={item.key || item.name} item={item} />
                ))}
              </div>
            </div>

            {unachieved.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />重点关注
                </h3>
                <p className="text-xs text-gray-400 mb-4">未达标指标，按达成率由低到高排序</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {unachieved.map((item) => (
                    <div key={item.key || item.code} className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_STYLE[item.status].dot}`} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {item.actual}{item.unit} / 目标 {item.target}{item.unit}
                      </span>
                      <span className={`text-sm font-medium flex-shrink-0 w-14 text-right ${achievementColor(item.achievement)}`}>
                        {item.achievement}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ② 指标列表 */}
          <TabsContent value="list" className="mt-4 space-y-4">
            {/* 筛选栏 */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索指标名称或编码"
                  className="pl-9 border-gray-300"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                {([
                  { key: 'all', label: '全部来源' },
                  { key: 'auto', label: '自动计算' },
                  { key: 'manual', label: '手工维护' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSourceFilter(opt.key)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      sourceFilter === opt.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-400 ml-auto">共 {filteredItems.length} 项</span>
            </div>

            {/* 指标表格 */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <TableHead className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">指标名称</TableHead>
                    <TableHead className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">分类</TableHead>
                    <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">目标值</TableHead>
                    <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">实际值</TableHead>
                    <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">达成率</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold whitespace-nowrap">状态</TableHead>
                    <TableHead className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">数据来源</TableHead>
                    <TableHead className="text-center px-4 py-3 text-sm font-semibold whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        没有符合条件的指标
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => {
                      const style = STATUS_STYLE[item.status];
                      const isManual = !!item.id;
                      return (
                        <TableRow key={item.id || item.key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-4 py-2.5 text-sm text-gray-800 font-medium">
                            <div className="flex items-center gap-2">
                              {item.name}
                              <span className="text-[10px] text-gray-400" title={item.direction === 'lower' ? '越低越好' : '越高越好'}>
                                {item.direction === 'lower' ? '↓' : '↑'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-sm text-gray-500">{item.category}</TableCell>
                          <TableCell className="px-4 py-2.5 text-sm text-gray-500 text-right">{item.target}{item.unit}</TableCell>
                          <TableCell className="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">
                            {/* 悬停展示该实际值是怎么算出来的：口径 / 数据来源 / 当前数据 / 统计区间 */}
                            <Tooltip
                              multiline
                              maxWidth={340}
                              position="bottom"
                              content={
                                <div className="space-y-1 text-left">
                                  <div className="font-medium text-white">{item.name}</div>
                                  <div className="text-xs text-gray-300">
                                    计算口径：{item.formula || '—'}
                                  </div>
                                  <div className="text-xs text-gray-300">
                                    数据来源：{item.sourceLabel || '—'}
                                  </div>
                                  {item.detail && (
                                    <div className="text-xs text-gray-300 pt-1 mt-1 border-t border-gray-700">
                                      当前数据：{item.detail}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 pt-1">
                                    统计区间：{board?.period?.start} ~ {board?.period?.end}
                                  </div>
                                </div>
                              }
                            >
                              <span className="cursor-help border-b border-dashed border-gray-300">
                                {item.actual}{item.unit}
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell className={`px-4 py-2.5 text-sm text-right font-medium ${achievementColor(item.achievement)}`}>
                            {item.achievement}%
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-xs">
                            {item.dataSource === 'demo' ? (
                              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">演示数据</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">实时</span>
                            )}
                            <span className="text-gray-400 ml-1.5">{isManual ? '手工维护' : '自动计算'}</span>
                          </TableCell>
                          <TableCell className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleView(item)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                                title="查看详情"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {isManual ? (
                                <>
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 rounded hover:bg-gray-100 text-blue-600"
                                    title="编辑"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item)}
                                    className="p-1.5 rounded hover:bg-gray-100 text-red-600"
                                    title="删除"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <span
                                  className="px-2 text-xs text-gray-300"
                                  title="自动指标的实际值由业务数据实时计算，不可编辑；如需调整目标值请先在指标库登记同名指标"
                                >
                                  —
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            <p className="text-xs text-gray-400">
              自动计算指标（{autoItems.length} 项）的实际值来自业务数据实时聚合，不可手工修改；
              手工维护指标（{manualItems.length} 项）的实际值需在指标库中录入。
            </p>
          </TabsContent>

          {/* ③ 分类管理 */}
          <TabsContent value="category" className="mt-4 space-y-4">
            <p className="text-xs text-gray-400">
              分类汇总统计全部 {allItems.length} 项指标（含手工维护项）；
              「总览」的综合得分与分类雷达仅统计 {autoItems.length} 项自动计算指标，两者范围不同属预期。
            </p>
            <CategoryPanel
              categorySummary={boardCategorySummary}
              indicators={indicators}
              onEdit={handleEditFromLibrary}
            />
          </TabsContent>

          {/* ④ 运营透视：物料去向 / 审批瓶颈 / 人员负荷 */}
          <TabsContent value="operations" className="mt-4">
            <OperationsPerspective structure={board.structure ?? null} />
          </TabsContent>
        </Tabs>
      )}

      {/* 弹窗：新增/编辑 */}
      <CreateModal
        isOpen={formOpen}
        indicator={formItem}
        onClose={() => { setFormOpen(false); setFormItem(null); }}
        onSave={saving ? () => undefined : handleSave}
      />

      {/* 弹窗：详情 */}
      <DetailModal
        isOpen={detailOpen}
        indicator={detailItem}
        modalType="view"
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
      />

      {/* 弹窗：删除确认 */}
      <DeleteModal
        isOpen={deleteOpen}
        item={deleteItem}
        onClose={() => { setDeleteOpen(false); setDeleteItem(null); }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
