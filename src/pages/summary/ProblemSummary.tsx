/**
 * 问题汇总页面 - 种植过程异常与问题统计
 * 数据源：useSummaryDataStore → problemItems (ProblemDailyItem[])
 * 路由：/summary/problems
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, AlertOctagon, CheckCircle,
  Clock, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { PageHeader, KpiCard, KpiCardGrid, AlertCard, SummaryDateFilter } from '../../components/summary';
import { useSummaryDataStore } from '../../stores';

// ========== 颜色常量 ==========
const COLORS = {
  red: '#ef4444',
  amber: '#f59e0b',
  emerald: '#10b981',
  slate: '#64748b',
  blue: '#3b82f6',
};

// ========== 加载状态组件 ==========
function LoadingView() {
  return (
    <div className="flex items-center justify-center h-64 bg-[#F2F6FA]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500">加载问题数据中...</span>
      </div>
    </div>
  );
}

// ========== 空状态组件 ==========
function EmptyView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-6 bg-[#F2F6FA] p-6">
      <PageHeader
        icon={<AlertTriangle className="w-6 h-6 text-white" />}
        title="问题汇总"
        description="种植过程异常记录、分类统计与处理跟踪"
      />
      <div className="bg-white rounded-xl p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-4">暂无问题数据</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}

// ========== 页面主组件 ==========
/** 计算日期范围（按月/季度/年） */
function getDateRange(mode: 'month' | 'quarter' | 'year'): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (mode) {
    case 'month': {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        start: `${year}-${String(month).padStart(2, '0')}-01`,
        end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    case 'quarter': {
      const q = Math.floor((month - 1) / 3);
      const qStartMonth = q * 3 + 1;
      const qEndMonth = q * 3 + 3;
      const lastDay = new Date(year, qEndMonth, 0).getDate();
      return {
        start: `${year}-${String(qStartMonth).padStart(2, '0')}-01`,
        end: `${year}-${String(qEndMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    case 'year':
    default:
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
  }
}

// ========== 页面主组件 ==========

export default function ProblemSummary() {
  // Store 数据
  const { problemItems, isLoading, error, fetchProblems } = useSummaryDataStore();

  // 日期筛选状态（初始化为本年度范围）
  const initRange = getDateRange('year');
  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const [startDate, setStartDate] = useState(initRange.start);
  const [endDate, setEndDate] = useState(initRange.end);

  // 挂载时 + 筛选模式/日期变更时获取数据
  useEffect(() => {
    if (filterMode === 'custom') return;
    const range = getDateRange(filterMode);
    setStartDate(range.start);
    setEndDate(range.end);
    fetchProblems({ startDate: range.start, endDate: range.end });
  }, [filterMode]);

  // 自定义日期变更时重新获取
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      fetchProblems({ startDate: start, endDate: end });
    }
  };

  // 筛选模式切换
  const handleModeChange = (mode: 'month' | 'quarter' | 'year' | 'custom') => {
    setFilterMode(mode);
    if (mode === 'custom') return;
    const range = getDateRange(mode);
    setStartDate(range.start);
    setEndDate(range.end);
    fetchProblems({ startDate: range.start, endDate: range.end });
  };

  // ========== 派生数据 ==========

  /** KPI 汇总指标 */
  const kpiData = useMemo(() => {
    if (!problemItems.length) {
      return { total: 0, pending: 0, inProgress: 0, resolved: 0, highPriority: 0 };
    }
    return {
      total: problemItems.reduce((s, i) => s + i.total, 0),
      pending: problemItems.reduce((s, i) => s + i.pending, 0),
      inProgress: problemItems.reduce((s, i) => s + i.inProgress, 0),
      resolved: problemItems.reduce((s, i) => s + i.resolved, 0),
      highPriority: problemItems.reduce((s, i) => s + i.highPriority, 0),
    };
  }, [problemItems]);

  /** 总体解决率 */
  const overallResolutionRate = kpiData.total > 0
    ? Math.round((kpiData.resolved / kpiData.total) * 100)
    : 0;

  /** 趋势图数据：按日期排列，含解决率折线 */
  const trendData = useMemo(() => {
    return problemItems
      .map((item) => ({
        date: item.date?.substring(5) || item.date, // 截取 MM-DD 便于显示
        fullDate: item.date,
        问题总数: item.total,
        已处理: item.resolved,
        解决率: item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0,
      }))
      .sort((a, b) => (a.fullDate || '').localeCompare(b.fullDate || ''));
  }, [problemItems]);

  /** 优先级分布饼图数据 */
  const priorityPieData = useMemo(() => {
    const highTotal = problemItems.reduce((s, i) => s + i.highPriority, 0);
    const mediumTotal = problemItems.reduce((s, i) => s + i.mediumPriority, 0);
    const lowTotal = problemItems.reduce((s, i) => s + i.lowPriority, 0);
    return [
      { name: '高优先级', value: highTotal, color: COLORS.red },
      { name: '中优先级', value: mediumTotal, color: COLORS.amber },
      { name: '低优先级', value: lowTotal, color: COLORS.slate },
    ].filter((d) => d.value > 0);
  }, [problemItems]);

  /** 月度问题分布（按月份分组汇总） */
  const monthlyData = useMemo(() => {
    const groups: Record<string, { month: string; 问题总数: number; 已处理: number }> = {};
    problemItems.forEach((item) => {
      const m = item.month || item.date?.substring(0, 7) || '未知';
      if (!groups[m]) {
        groups[m] = { month: m, 问题总数: 0, 已处理: 0 };
      }
      groups[m].问题总数 += item.total;
      groups[m].已处理 += item.resolved;
    });
    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
  }, [problemItems]);

  /** 高优先级问题预警（取前10条高优先级>0的日汇总） */
  const highPriorityAlerts = useMemo(() => {
    return problemItems
      .filter((item) => item.highPriority > 0)
      .sort((a, b) => b.highPriority - a.highPriority)
      .slice(0, 8)
      .map((item) => ({
        title: `${item.date} - ${item.highPriority}个高优先级问题`,
        description: `共${item.total}个问题，待处理${item.pending}，处理中${item.inProgress}，已处理${item.resolved}`,
        severity: (item.highPriority >= 3 ? 'critical' : 'warning') as 'critical' | 'warning',
      }));
  }, [problemItems]);

  // ========== 加载/空状态 ==========
  if (isLoading && !problemItems.length) {
    return <LoadingView />;
  }

  if (!isLoading && !problemItems.length) {
    return <EmptyView onRetry={() => fetchProblems()} />;
  }

  return (
    <div className="space-y-6 bg-[#F2F6FA]">
      {/* 页面标题 */}
      <PageHeader
        icon={<AlertTriangle className="w-6 h-6 text-white" />}
        title="问题汇总"
        description="种植过程异常记录、分类统计与处理跟踪"
      />

      {/* 日期筛选 + 统计概览 */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <SummaryDateFilter
          mode={filterMode}
          onModeChange={handleModeChange}
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
        <div className="text-sm text-gray-500">
          共 <span className="font-semibold text-gray-700">{problemItems.length}</span> 条日汇总记录
        </div>
      </div>

      {/* KPI 指标卡片（5列） */}
      <KpiCardGrid columns={5} compact>
        <KpiCard
          icon={<BarChart3 className="w-4 h-4 text-white" />}
          label="总问题数"
          value={kpiData.total}
          colorScheme="slate"
          compact
        />
        <KpiCard
          icon={<AlertOctagon className="w-4 h-4 text-white" />}
          label="待处理"
          value={kpiData.pending}
          colorScheme="red"
          compact
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-white" />}
          label="处理中"
          value={kpiData.inProgress}
          colorScheme="amber"
          compact
        />
        <KpiCard
          icon={<CheckCircle className="w-4 h-4 text-white" />}
          label="已处理"
          value={kpiData.resolved}
          colorScheme="emerald"
          trend={overallResolutionRate}
          compact
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-white" />}
          label="高优先级"
          value={kpiData.highPriority}
          colorScheme="red"
          compact
        />
      </KpiCardGrid>

      {/* 图表行：趋势图 + 优先级饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 问题趋势图（柱状 + 折线） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">问题趋势图</h3>
          {trendData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="问题总数"
                    fill={COLORS.red}
                    radius={[4, 4, 0, 0]}
                    name="问题总数"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="已处理"
                    fill={COLORS.emerald}
                    radius={[4, 4, 0, 0]}
                    name="已处理"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="解决率"
                    stroke={COLORS.blue}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS.blue }}
                    name="解决率(%)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">暂无趋势数据</div>
          )}
        </div>

        {/* 优先级分布饼图 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">优先级分布</h3>
          {priorityPieData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      `${name} ${value}个 (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  >
                    {priorityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value} 个`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">暂无分类数据</div>
          )}
        </div>
      </div>

      {/* 底部行：月度分布 + 高优先级预警 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 月度问题分布（横向柱状图） */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">月度问题分布</h3>
          {monthlyData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  layout="vertical"
                  margin={{ left: 60, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="问题总数" fill={COLORS.red} radius={[0, 4, 4, 0]} name="问题总数" barSize={20} />
                  <Bar dataKey="已处理" fill={COLORS.emerald} radius={[0, 4, 4, 0]} name="已处理" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">暂无月度数据</div>
          )}
        </div>

        {/* 高优先级问题预警 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            高优先级问题预警
            {highPriorityAlerts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({highPriorityAlerts.length})
              </span>
            )}
          </h3>
          {highPriorityAlerts.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {highPriorityAlerts.map((alert, index) => (
                <AlertCard
                  key={index}
                  title={alert.title}
                  description={alert.description}
                  severity={alert.severity}
                />
              ))}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              暂无高优先级问题预警
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          数据加载异常：{error}
        </div>
      )}
    </div>
  );
}
