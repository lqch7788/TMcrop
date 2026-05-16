/**
 * 产量分析页面 - 产量趋势、同比环比、品种排名与批次对比
 * 数据源：useSummaryDataStore（Zustand Store），通过 groupBy 切换维度
 * 架构：Component → Store → enhancedApiClient → Backend API（单向不可逆）
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Package,
  Calendar,
  Hash,
  DollarSign,
  AlertCircle,
  Loader2,
  Sprout,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { PageHeader, KpiCard, KpiCardGrid, SummaryDateFilter } from '../../components/summary';
import { useSummaryDataStore, type YieldStatItem } from '../../stores/useSummaryDataStore';

// ========== 常量 ==========

/** 分组维度选项 */
const GROUP_BY_OPTIONS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'month', label: '月份', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'crop', label: '作物', icon: <Sprout className="w-3.5 h-3.5" /> },
  { value: 'greenhouse', label: '温室', icon: <Hash className="w-3.5 h-3.5" /> },
  { value: 'quality', label: '质量', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

/** 翠绿渐变色阶 */
const EMERALD_GRADIENT = ['#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'];

/** 质量等级颜色 */
const QUALITY_COLORS: Record<string, string> = {
  'A': '#10b981',
  'B': '#3b82f6',
  'C': '#f59e0b',
  '次品': '#ef4444',
  'A级': '#10b981',
  'B级': '#3b82f6',
  'C级': '#f59e0b',
};

/** 格式化重量 */
function formatWeight(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万 kg`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k kg`;
  return `${v.toFixed(0)} kg`;
}

/** 格式化金额 */
function formatMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ========== 子组件 ==========

/** 产量与产值趋势图（柱状+面积双Y轴） */
function YieldTrendChart({ items }: { items: YieldStatItem[] }) {
  const chartData = useMemo(() => {
    return [...items]
      .filter((item) => item.value > 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((item) => ({
        name: item.name,
        产量: Number(item.value) || 0,
        产值: Number(item.totalAmount) || 0,
      }));
  }, [items]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">产量与产值趋势</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无产量数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">产量与产值趋势</h3>
      <p className="text-xs text-gray-400 mb-4">产量柱状图 + 产值折线，双轴展示</p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => {
                if (name === '产量') return [formatWeight(value), '产量'];
                if (name === '产值') return [formatMoney(value), '产值'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="产量" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
            <Bar yAxisId="right" dataKey="产值" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 排名柱状图（横向，按 groupBy 维度） */
function YieldRankingChart({ items, groupBy }: { items: YieldStatItem[]; groupBy: string }) {
  const label = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy;

  const chartData = useMemo(() => {
    return [...items]
      .filter((item) => item.value > 0)
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
      .slice(0, 12);
  }, [items]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">产量排名</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无排名数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">产量排名（Top12）</h3>
      <p className="text-xs text-gray-400 mb-4">按{label}维度排序，展示产量排名</p>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" width={80} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [formatWeight(value), '产量']}
            />
            <Bar dataKey="value" name="产量" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={EMERALD_GRADIENT[index % EMERALD_GRADIENT.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 质量分布饼图 */
function QualityPieChart({ items }: { items: YieldStatItem[] }) {
  const pieData = useMemo(() => {
    return [...items]
      .filter((item) => item.value > 0)
      .map((item) => ({
        name: item.name,
        value: Number(item.value),
        fill: QUALITY_COLORS[item.name] || "#94a3b8",
      }));
  }, [items]);

  if (pieData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">质量等级分布</h3>
        <div className="h-[280px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无质量数据（请切换分组为"质量"）</p>
          </div>
        </div>
      </div>
    );
  }

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  /** 自定义饼图标签（折弯线 + 始终显示） */
  const renderCustomLabel = ({
    cx, cy, midAngle, outerRadius, percent, name,
  }: {
    cx: number; cy: number; midAngle: number; outerRadius: number; percent: number; name: string;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const edgeX = cx + (outerRadius + 8) * Math.cos(-midAngle * RADIAN);
    const edgeY = cy + (outerRadius + 8) * Math.sin(-midAngle * RADIAN);
    const textAnchor = x > cx ? "start" : "end";
    const lineEndX = x > cx ? x + 40 : x - 40;
    const entry = pieData.find((d) => d.name === name);
    const displayValue = entry ? formatWeight(entry.value) : "";
    const displayPct = `${(percent * 100).toFixed(1)}%`;

    return (
      <g>
        <polyline
          points={`${edgeX},${edgeY} ${x},${y} ${lineEndX},${y}`}
          stroke="#94a3b8"
          strokeWidth={1}
          fill="none"
        />
        <text
          x={lineEndX + (x > cx ? 4 : -4)}
          y={y - 6}
          textAnchor={textAnchor}
          fill="#334155"
          fontSize={12}
          fontWeight={600}
        >
          {name || "未知"}
        </text>
        <text
          x={lineEndX + (x > cx ? 4 : -4)}
          y={y + 10}
          textAnchor={textAnchor}
          fill="#64748b"
          fontSize={11}
        >
          {displayValue} ({displayPct})
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">质量等级分布</h3>
      <p className="text-xs text-gray-400 mb-4">A/B/C/次品 占比</p>
      <div className="h-[280px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              label={renderCustomLabel}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[11px] text-gray-400">总产量</p>
          <p className="text-base font-bold text-gray-800">{formatWeight(total)}</p>
        </div>
      </div>
    </div>
  );
}

/** 产量明细表 */
function YieldDetailTable({ items }: { items: YieldStatItem[] }) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  }, [items]);

  if (sortedItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">暂无产量明细</p>
      </div>
    );
  }

  const totalYield = sortedItems.reduce((s, item) => s + (Number(item.value) || 0), 0);
  const totalAmount = sortedItems.reduce((s, item) => s + (Number(item.totalAmount) || 0), 0);
  const totalCount = sortedItems.reduce((s, item) => s + (Number(item.count) || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">产量明细表</h3>
        <p className="text-xs text-gray-400 mt-1">
          共 {sortedItems.length} 条记录，总产量 {formatWeight(totalYield)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">名称</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">产量(kg)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">采收次数</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">平均单价</th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">产值</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {sortedItems.map((item, idx) => (
              <tr key={`${item.name}-${idx}`} className="hover:bg-emerald-50/50 transition-colors">
                <td className="px-4 py-2.5 text-sm text-gray-800 font-medium">{item.name || '-'}</td>
                <td className="px-4 py-2.5 text-sm text-gray-900 text-right tabular-nums">
                  {formatWeight(Number(item.value) || 0)}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 text-right">
                  {item.count ?? '-'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-900 text-right">
                  {item.avgPrice ? formatMoney(item.avgPrice) : '-'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-900 text-right font-medium">
                  {formatMoney(Number(item.totalAmount) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 bg-emerald-50/50 border-t border-emerald-100 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-sm text-gray-600">
          总产量：<span className="font-bold text-emerald-700">{formatWeight(totalYield)}</span>
        </span>
        <span className="text-sm text-gray-600">
          总产值：<span className="font-bold text-emerald-700">{formatMoney(totalAmount)}</span>
        </span>
        <span className="text-xs text-gray-400">
          采收 {totalCount} 次 · 均价 {formatMoney(totalYield > 0 ? totalAmount / totalYield : 0)}/kg
        </span>
      </div>
    </div>
  );
}

// ========== 主页面组件 ==========

interface YieldAnalysisProps { hideHeader?: boolean; }

export default function YieldAnalysis({ hideHeader }: YieldAnalysisProps) {
  const yieldItems = useSummaryDataStore((s) => s.yieldItems);
  const yieldGroupBy = useSummaryDataStore((s) => s.yieldGroupBy);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const error = useSummaryDataStore((s) => s.error);
  const fetchYieldStats = useSummaryDataStore((s) => s.fetchYieldStats);

  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>(yieldGroupBy || 'month');

  // 初始加载
  useEffect(() => {
    fetchYieldStats({ groupBy });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // groupBy 变化
  const handleGroupByChange = useCallback(
    (newGroupBy: string) => {
      setGroupBy(newGroupBy);
      fetchYieldStats({
        groupBy: newGroupBy,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    },
    [fetchYieldStats, startDate, endDate]
  );

  // 日期变化
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchYieldStats({ groupBy, startDate: start || undefined, endDate: end || undefined });
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
        fetchYieldStats({ groupBy, startDate: firstDay, endDate: lastDay });
        break;
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        const qStart = `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`;
        const qEndMonth = q * 3 + 3;
        const qEnd = `${year}-${String(qEndMonth).padStart(2, '0')}-${new Date(year, qEndMonth, 0).getDate()}`;
        setStartDate(qStart);
        setEndDate(qEnd);
        fetchYieldStats({ groupBy, startDate: qStart, endDate: qEnd });
        break;
      }
      case 'year': {
        setStartDate(`${year}-01-01`);
        setEndDate(`${year}-12-31`);
        fetchYieldStats({ groupBy });
        break;
      }
      case 'custom':
        break;
    }
  };

  // KPI 计算
  const totalYield = useMemo(
    () => yieldItems.reduce((s, item) => s + (Number(item.value) || 0), 0),
    [yieldItems]
  );
  const totalAmount = useMemo(
    () => yieldItems.reduce((s, item) => s + (Number(item.totalAmount) || 0), 0),
    [yieldItems]
  );
  const totalCount = useMemo(
    () => yieldItems.reduce((s, item) => s + (Number(item.count) || 0), 0),
    [yieldItems]
  );
  const avgPrice = totalYield > 0 ? totalAmount / totalYield : 0;

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <PageHeader
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          title="产量分析"
          description="产量趋势、同比环比、品种排名与批次对比"
        />
      )}

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <SummaryDateFilter
            mode={filterMode}
            onModeChange={handleModeChange}
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 mr-1">分组：</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              {GROUP_BY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleGroupByChange(opt.value)}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${groupBy === opt.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            加载中...
          </div>
        )}
      </div>

      {/* 错误 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">数据加载失败：{error}</span>
        </div>
      )}

      {/* KPI 卡片（紧凑模式） */}
      <KpiCardGrid columns={4} compact>
        <KpiCard
          icon={<Package className="w-4 h-4 text-white" />}
          label="总产量"
          value={formatWeight(totalYield)}
          colorScheme="emerald"
          compact
        />
        <KpiCard
          icon={<BarChart3 className="w-4 h-4 text-white" />}
          label="采收次数"
          value={totalCount.toLocaleString()}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-white" />}
          label="平均单价"
          value={avgPrice > 0 ? `${formatMoney(avgPrice)}/kg` : '--'}
          colorScheme="amber"
          compact
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-white" />}
          label="总产值"
          value={formatMoney(totalAmount)}
          colorScheme="emerald"
          compact
        />
      </KpiCardGrid>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <YieldTrendChart items={yieldItems} />
        <YieldRankingChart items={yieldItems} groupBy={groupBy} />
      </div>

      {/* 质量分布饼图 + 产量明细表（质量模式并排） */}
      {groupBy === 'quality' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QualityPieChart items={yieldItems} />
          <YieldDetailTable items={yieldItems} />
        </div>
      ) : (
        <YieldDetailTable items={yieldItems} />
      )}
    </div>
  );
}
