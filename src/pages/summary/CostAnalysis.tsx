/**
 * 成本分析页面 - 种植成本明细、分类占比与亩均成本趋势
 * 数据源：useSummaryDataStore（Zustand Store）
 * 图表：recharts（PieChart环形图 + AreaChart堆叠面积图）
 */
import { useEffect, useState, useMemo } from 'react';
import {
  DollarSign,
  Users,
  Package,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader, KpiCard, KpiCardGrid, SummaryDateFilter } from '../../components/summary';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { useSummaryDataStore, type CostDetailItem, type CostSummary } from '../../stores/useSummaryDataStore';

// ========== 图表颜色常量 ==========
const COST_COLORS = {
  labor: '#3b82f6',    // 蓝色 - 人工
  material: '#f59e0b',  // 琥珀色 - 物料
  energy: '#64748b',    // 石板色 - 能源
};

const COST_LABELS: Record<string, string> = {
  labor: '人工成本',
  material: '物料成本',
  energy: '能源成本',
};

// ========== 工具函数 ==========

/** 将 costDetailItems 按 costCategory 聚合为饼图数据 */
function buildPieData(items: CostDetailItem[]) {
  const map: Record<string, number> = { labor: 0, material: 0, energy: 0 };
  for (const item of items) {
    map[item.costCategory] = (map[item.costCategory] || 0) + (Number(item.totalAmount) || 0);
  }
  return [
    { name: '人工成本', value: Math.round(map.labor * 100) / 100, category: 'labor' as const },
    { name: '物料成本', value: Math.round(map.material * 100) / 100, category: 'material' as const },
    { name: '能源成本', value: Math.round(map.energy * 100) / 100, category: 'energy' as const },
  ].filter((d) => d.value > 0);
}

/** 将 costDetailItems 按月份 + costCategory 聚合为堆叠面积图数据 */
function buildStackedData(items: CostDetailItem[]) {
  const monthMap: Record<string, { month: string; labor: number; material: number; energy: number }> = {};
  for (const item of items) {
    const m = item.month || '未知';
    if (!monthMap[m]) {
      monthMap[m] = { month: m, labor: 0, material: 0, energy: 0 };
    }
    monthMap[m][item.costCategory] += Number(item.totalAmount) || 0;
  }
  // 按月份排序
  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
}

/** 格式化金额 */
function formatMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ========== 子组件 ==========

/** 成本结构环形饼图 */
function CostPieChart({ items }: { items: CostDetailItem[] }) {
  const pieData = useMemo(() => buildPieData(items), [items]);
  const total = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData]);

  if (pieData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">成本结构分布</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">暂无成本数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">成本结构分布</h3>
      <p className="text-xs text-gray-400 mb-4">人工 / 物料 / 能源占比</p>
      <div className="h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry) => (
                <Cell key={entry.category} fill={COST_COLORS[entry.category]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatMoney(value), '金额']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-gray-400">总成本</p>
          <p className="text-xl font-bold text-gray-800">{formatMoney(total)}</p>
        </div>
      </div>
      {/* 图例 */}
      <div className="flex justify-center gap-6 mt-2">
        {pieData.map((entry) => (
          <div key={entry.category} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COST_COLORS[entry.category] }} />
            <span className="text-xs text-gray-600">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 成本趋势堆叠面积图 */
function CostTrendAreaChart({ items }: { items: CostDetailItem[] }) {
  const stackedData = useMemo(() => buildStackedData(items), [items]);

  if (stackedData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">成本趋势变化</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">暂无趋势数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">成本趋势变化</h3>
      <p className="text-xs text-gray-400 mb-4">按月统计，三类成本堆叠展示</p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stackedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLabor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COST_COLORS.labor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COST_COLORS.labor} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorMaterial" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COST_COLORS.material} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COST_COLORS.material} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COST_COLORS.energy} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COST_COLORS.energy} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => [formatMoney(value), COST_LABELS[name] || name]}
            />
            <Legend formatter={(value) => COST_LABELS[value] || value} />
            <Area type="monotone" dataKey="labor" stackId="1" stroke={COST_COLORS.labor} fill="url(#colorLabor)" strokeWidth={2} />
            <Area type="monotone" dataKey="material" stackId="1" stroke={COST_COLORS.material} fill="url(#colorMaterial)" strokeWidth={2} />
            <Area type="monotone" dataKey="energy" stackId="1" stroke={COST_COLORS.energy} fill="url(#colorEnergy)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 成本明细表 */
function CostDetailTable({ items, summary }: { items: CostDetailItem[]; summary: CostSummary | null }) {
  // 按 costCategory 分组
  const grouped = useMemo(() => {
    const map: Record<string, CostDetailItem[]> = { labor: [], material: [], energy: [] };
    for (const item of items) {
      if (map[item.costCategory]) {
        map[item.costCategory].push(item);
      }
    }
    return map;
  }, [items]);

  // 展开/收起状态
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    labor: true,
    material: true,
    energy: true,
  });

  const toggleExpand = (cat: string) => {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categoryMeta: { key: string; label: string; bgClass: string; borderClass: string; textClass: string }[] = [
    { key: 'labor', label: '人工成本', bgClass: 'bg-blue-50', borderClass: 'border-blue-200', textClass: 'text-blue-700' },
    { key: 'material', label: '物料成本', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', textClass: 'text-amber-700' },
    { key: 'energy', label: '能源成本', bgClass: 'bg-slate-50', borderClass: 'border-slate-200', textClass: 'text-slate-700' },
  ];

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">暂无成本明细数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">成本明细表</h3>
        <p className="text-xs text-gray-400 mt-1">按成本类型分组展示，点击展开/收起</p>
      </div>

      <div className="divide-y divide-gray-100">
        {categoryMeta.map((meta) => {
          const catItems = grouped[meta.key] || [];
          const catTotal = catItems.reduce((s, item) => s + (Number(item.totalAmount) || 0), 0);
          const isExpanded = expanded[meta.key];

          return (
            <div key={meta.key}>
              {/* 分组标题行 */}
              <button
                onClick={() => toggleExpand(meta.key)}
                className={`w-full flex items-center justify-between px-6 py-3 ${meta.bgClass} hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isExpanded ? 'rotate-90' : ''} transition-transform`}>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </span>
                  <span className={`font-medium text-sm ${meta.textClass}`}>{meta.label}</span>
                  <span className={`text-xs ${meta.textClass} opacity-60`}>
                    ({catItems.length} 条记录)
                  </span>
                </div>
                <span className={`font-semibold text-sm ${meta.textClass}`}>
                  {formatMoney(catTotal)}
                </span>
              </button>

              {/* 明细行 */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <TableHead className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">成本类型</TableHead>
                        <TableHead className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">月份</TableHead>
                        <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">金额</TableHead>
                        {meta.key === 'labor' && (
                          <>
                            <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">工时(h)</TableHead>
                            <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">人数</TableHead>
                          </>
                        )}
                        <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">记录数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catItems.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-2.5 text-sm text-gray-700">
                            {item.costType || item.costName || '-'}
                          </TableCell>
                          <TableCell className="px-6 py-2.5 text-sm text-gray-500">{item.month || '-'}</TableCell>
                          <TableCell className="px-6 py-2.5 text-sm text-gray-900 text-right font-medium">
                            {formatMoney(Number(item.totalAmount) || 0)}
                          </TableCell>
                          {meta.key === 'labor' && (
                            <>
                              <TableCell className="px-6 py-2.5 text-sm text-gray-500 text-right">
                                {item.workHours != null ? Number(item.workHours).toFixed(1) : '-'}
                              </TableCell>
                              <TableCell className="px-6 py-2.5 text-sm text-gray-500 text-right">
                                {item.workerCount ?? '-'}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="px-6 py-2.5 text-sm text-gray-400 text-right">
                            {item.recordCount ?? '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 汇总行 */}
      {summary && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-x-8 gap-y-1">
          <span className="text-sm text-gray-500">
            合计：<span className="font-bold text-gray-900">{formatMoney(summary.totalCost)}</span>
          </span>
          <span className="text-xs text-gray-400">
            人工{formatMoney(summary.totalLaborCost)} / 物料{formatMoney(summary.totalMaterialCost)} / 能源{formatMoney(summary.totalEnergyCost)}
          </span>
          <span className="text-xs text-gray-400">
            总工时 {summary.totalWorkHours.toFixed(1)}h / 均时薪 {formatMoney(summary.avgHourlyRate)}/h
          </span>
        </div>
      )}
    </div>
  );
}

// ========== 主页面组件 ==========

interface CostAnalysisProps { hideHeader?: boolean; }

export default function CostAnalysis({ hideHeader }: CostAnalysisProps) {
  // 从 Store 获取数据
  const costDetailItems = useSummaryDataStore((s) => s.costDetailItems);
  const costSummary = useSummaryDataStore((s) => s.costSummary);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const error = useSummaryDataStore((s) => s.error);
  const fetchCostStats = useSummaryDataStore((s) => s.fetchCostStats);

  // 日期筛选状态
  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 页面挂载时获取数据
  useEffect(() => {
    fetchCostStats();
  }, [fetchCostStats]);

  // 日期变化时重新获取
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchCostStats({ startDate: start || undefined, endDate: end || undefined });
  };

  const handleModeChange = (mode: 'month' | 'quarter' | 'year' | 'custom') => {
    setFilterMode(mode);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    switch (mode) {
      case 'month': {
        const firstDay = `${year}-${month}-01`;
        const lastDay = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
        fetchCostStats({ startDate: firstDay, endDate: lastDay });
        break;
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        const qStart = `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`;
        const qEndMonth = q * 3 + 3;
        const qEnd = `${year}-${String(qEndMonth).padStart(2, '0')}-${new Date(year, qEndMonth, 0).getDate()}`;
        setStartDate(qStart);
        setEndDate(qEnd);
        fetchCostStats({ startDate: qStart, endDate: qEnd });
        break;
      }
      case 'year': {
        setStartDate(`${year}-01-01`);
        setEndDate(`${year}-12-31`);
        fetchCostStats();
        break;
      }
      case 'custom':
        // 不自动请求，等用户选完日期
        break;
    }
  };

  // KPI 趋势（简单对比：无历史数据时隐藏）
  const showTrend = false;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      {!hideHeader && (
        <PageHeader
          icon={<DollarSign className="w-6 h-6 text-white" />}
          title="成本分析"
          description="种植成本明细、分类占比与亩均成本趋势"
        />
      )}

      {/* 日期筛选器 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <SummaryDateFilter
          mode={filterMode}
          onModeChange={handleModeChange}
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            加载中...
          </div>
        )}
      </div>

      {/* 错误状态 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">数据加载失败：{error}</span>
        </div>
      )}

      {/* KPI 指标卡片 */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-white" />}
          label="总成本"
          value={costSummary ? formatMoney(costSummary.totalCost) : '--'}
          colorScheme="amber"
          trend={showTrend ? -3.2 : undefined}
          compact
        />
        <KpiCard
          icon={<Users className="w-4 h-4 text-white" />}
          label="人工成本"
          value={costSummary ? formatMoney(costSummary.totalLaborCost) : '--'}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<Package className="w-4 h-4 text-white" />}
          label="物料成本"
          value={costSummary ? formatMoney(costSummary.totalMaterialCost) : '--'}
          colorScheme="amber"
          compact
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-white" />}
          label="总工时"
          value={costSummary ? `${costSummary.totalWorkHours.toFixed(1)}h` : '--'}
          colorScheme="amber"
          compact
        />
      </KpiCardGrid>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostPieChart items={costDetailItems} />
        <CostTrendAreaChart items={costDetailItems} />
      </div>

      {/* 成本明细表 */}
      <CostDetailTable items={costDetailItems} summary={costSummary} />
    </div>
  );
}
