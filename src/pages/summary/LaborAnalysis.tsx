/**
 * 人工分析页面 - 人工工时统计、效率分析与工种占比
 * 数据源：useSummaryDataStore（Zustand Store）
 * 图表：recharts（LineChart折线图 + BarChart柱状图）
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  BarChart3,
  Calendar,
  UserCheck,
  Hash,
  DollarSign,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';
import { PageHeader, KpiCard, KpiCardGrid, SummaryDateFilter } from '../../components/summary';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { useSummaryDataStore, type LaborStatItem } from '../../stores/useSummaryDataStore';

// ========== 常量 ==========

/** groupBy 选项配置 */
const GROUP_BY_OPTIONS: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'month', label: '月', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'worker', label: '工人', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'greenhouse', label: '温室', icon: <Hash className="w-3.5 h-3.5" /> },
  { value: 'task', label: '任务', icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

/** 蓝色渐变色阶（用于柱状图） */
const BLUE_GRADIENT = ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];

/** 格式化金额 */
function formatMoney(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 格式化工时 */
function formatHours(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万h`;
  return `${v.toFixed(1)}h`;
}

// ========== 子组件 ==========

/** 工时趋势折线图 */
function LaborTrendLineChart({ items }: { items: LaborStatItem[] }) {
  // 按 name（月份）排序的折线图数据
  const chartData = useMemo(() => {
    return [...items]
      .filter((item) => item.hours > 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((item) => ({
        name: item.name,
        hours: Number(item.hours) || 0,
        amount: Number(item.amount) || 0,
      }));
  }, [items]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">工时趋势</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">暂无工时数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">工时趋势</h3>
      <p className="text-xs text-gray-400 mb-4">按时序展示工时变化与金额趋势</p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" angle={-20} textAnchor="end" height={50} />
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
                if (name === 'hours') return [formatHours(value), '工时'];
                if (name === 'amount') return [formatMoney(value), '金额'];
                return [value, name];
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="hours"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
              name="工时"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="amount"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
              activeDot={{ r: 5 }}
              name="金额"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 分组对比柱状图 */
function LaborBarChart({ items, groupBy }: { items: LaborStatItem[]; groupBy: string }) {
  const chartData = useMemo(() => {
    return [...items]
      .filter((item) => item.hours > 0)
      .sort((a, b) => (Number(b.hours) || 0) - (Number(a.hours) || 0))
      .slice(0, 15) // 最多显示前15条
      .map((item) => ({
        name: item.name,
        hours: Number(item.hours) || 0,
        amount: Number(item.amount) || 0,
        workerCount: item.workerCount || 0,
      }));
  }, [items]);

  const groupByLabel = GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label || groupBy;

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">分组对比</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">暂无分组数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-1">分组对比</h3>
      <p className="text-xs text-gray-400 mb-4">按{groupByLabel}维度对比工时（前15条）</p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${v.toFixed(0)}h`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'hours') return [formatHours(value), '工时'];
                if (name === 'amount') return [formatMoney(value), '金额'];
                return [value, name];
              }}
            />
            <Legend />
            <Bar dataKey="hours" name="工时" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BLUE_GRADIENT[index % BLUE_GRADIENT.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** 用工明细表 */
function LaborDetailTable({ items }: { items: LaborStatItem[] }) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (Number(b.hours) || 0) - (Number(a.hours) || 0));
  }, [items]);

  if (sortedItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">暂无用工明细数据</p>
      </div>
    );
  }

  // 计算汇总
  const totalHours = sortedItems.reduce((s, item) => s + (Number(item.hours) || 0), 0);
  const totalAmount = sortedItems.reduce((s, item) => s + (Number(item.amount) || 0), 0);
  const totalWorkers = sortedItems.reduce((s, item) => s + (Number(item.workerCount) || 0), 0);
  const totalTasks = sortedItems.reduce((s, item) => s + (Number(item.taskCount) || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头 */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">用工明细表</h3>
        <p className="text-xs text-gray-400 mt-1">
          共 {sortedItems.length} 条记录，总工时 {formatHours(totalHours)}，总金额 {formatMoney(totalAmount)}
        </p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <TableHead className="text-left px-4 py-3 text-sm font-semibold whitespace-nowrap">名称</TableHead>
              <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">工时(h)</TableHead>
              <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">金额</TableHead>
              <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">工人数</TableHead>
              <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">出勤次数</TableHead>
              <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">任务数</TableHead>
              <TableHead className="text-right px-4 py-3 text-sm font-semibold whitespace-nowrap">日均工时</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item, idx) => (
              <TableRow key={idx} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                <TableCell className="px-6 py-2.5 text-sm text-gray-800 font-medium">{item.name || '-'}</TableCell>
                <TableCell className="px-6 py-2.5 text-sm text-gray-900 text-right tabular-nums">
                  {Number(item.hours).toFixed(1)}
                </TableCell>
                <TableCell className="px-6 py-2.5 text-sm text-gray-900 text-right tabular-nums">
                  {formatMoney(Number(item.amount) || 0)}
                </TableCell>
                <TableCell className="px-6 py-2.5 text-sm text-gray-500 text-right">
                  {item.workerCount ?? '-'}
                </TableCell>
                <TableCell className="px-6 py-2.5 text-sm text-gray-500 text-right">
                  {item.workCount ?? '-'}
                </TableCell>
                <TableCell className="px-6 py-2.5 text-sm text-gray-500 text-right">
                  {item.taskCount ?? '-'}
                </TableCell>
                <TableCell className="px-6 py-2.5 text-sm text-gray-500 text-right">
                  {item.avgDailyHours != null ? `${Number(item.avgDailyHours).toFixed(1)}h` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 汇总行 */}
      <div className="px-6 py-3 bg-blue-50/50 border-t border-blue-100 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span className="text-sm text-gray-600">
          总工时：<span className="font-bold text-blue-700">{formatHours(totalHours)}</span>
        </span>
        <span className="text-sm text-gray-600">
          总金额：<span className="font-bold text-blue-700">{formatMoney(totalAmount)}</span>
        </span>
        <span className="text-xs text-gray-400">
          总工人 {totalWorkers} / 总出勤 {sortedItems.reduce((s, item) => s + (Number(item.workCount) || 0), 0)} / 总任务 {totalTasks}
        </span>
        <span className="text-xs text-gray-400">
          均时薪 {totalHours > 0 ? formatMoney(totalAmount / totalHours) : '--'}/h
        </span>
      </div>
    </div>
  );
}

// ========== 主页面组件 ==========

interface LaborAnalysisProps { hideHeader?: boolean; }

export default function LaborAnalysis({ hideHeader }: LaborAnalysisProps) {
  // 从 Store 获取数据
  const laborItems = useSummaryDataStore((s) => s.laborItems);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const error = useSummaryDataStore((s) => s.error);
  const fetchLaborStats = useSummaryDataStore((s) => s.fetchLaborStats);
  const laborGroupBy = useSummaryDataStore((s) => s.laborGroupBy);

  // 日期筛选状态
  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 分组维度切换
  const [groupBy, setGroupBy] = useState<string>(laborGroupBy || 'month');

  // 页面挂载时获取数据
  useEffect(() => {
    fetchLaborStats({ groupBy });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // groupBy 变化时重新获取
  const handleGroupByChange = useCallback(
    (newGroupBy: string) => {
      setGroupBy(newGroupBy);
      fetchLaborStats({
        groupBy: newGroupBy,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    },
    [fetchLaborStats, startDate, endDate]
  );

  // 日期变化时重新获取
  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchLaborStats({
      groupBy,
      startDate: start || undefined,
      endDate: end || undefined,
    });
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
        fetchLaborStats({ groupBy, startDate: firstDay, endDate: lastDay });
        break;
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        const qStart = `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`;
        const qEndMonth = q * 3 + 3;
        const qEnd = `${year}-${String(qEndMonth).padStart(2, '0')}-${new Date(year, qEndMonth, 0).getDate()}`;
        setStartDate(qStart);
        setEndDate(qEnd);
        fetchLaborStats({ groupBy, startDate: qStart, endDate: qEnd });
        break;
      }
      case 'year': {
        setStartDate(`${year}-01-01`);
        setEndDate(`${year}-12-31`);
        fetchLaborStats({ groupBy });
        break;
      }
      case 'custom':
        break;
    }
  };

  // ====== KPI 派生指标 ======
  const totalHours = useMemo(
    () => laborItems.reduce((s, item) => s + (Number(item.hours) || 0), 0),
    [laborItems]
  );
  const totalAmount = useMemo(
    () => laborItems.reduce((s, item) => s + (Number(item.amount) || 0), 0),
    [laborItems]
  );
  const totalWorkers = useMemo(
    () => laborItems.reduce((s, item) => s + (Number(item.workerCount) || 0), 0),
    [laborItems]
  );
  const totalWorkCounts = useMemo(
    () => laborItems.reduce((s, item) => s + (Number(item.workCount) || 0), 0),
    [laborItems]
  );

  // 日均工时 = 总工时 / 工作天数（按月则按实际月天数，否则按平均30天算）
  const avgDailyHours = useMemo(() => {
    const distinctNames = new Set(laborItems.map((item) => item.name)).size;
    if (distinctNames === 0) return 0;
    // 按 name 数量作为天数近似
    return totalHours / distinctNames;
  }, [laborItems, totalHours]);

  // 人均工时
  const avgHoursPerWorker = totalWorkers > 0 ? totalHours / totalWorkers : 0;

  // 平均时薪 = 总额 / 总工时
  const avgHourlyRate = totalHours > 0 ? totalAmount / totalHours : 0;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      {!hideHeader && (
        <PageHeader
          icon={<Users className="w-6 h-6 text-white" />}
          title="人工分析"
          description="人工工时统计、效率分析与工种占比"
        />
      )}

      {/* 筛选栏：日期筛选 + 分组切换 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <SummaryDateFilter
            mode={filterMode}
            onModeChange={handleModeChange}
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />

          {/* 分隔线 */}
          <div className="w-px h-6 bg-gray-200 hidden sm:block" />

          {/* groupBy 维度切换 */}
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
                      ? 'bg-blue-600 text-white shadow-sm'
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
          icon={<Clock className="w-4 h-4 text-white" />}
          label="总工时"
          value={formatHours(totalHours)}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-white" />}
          label="日均工时"
          value={`${avgDailyHours.toFixed(1)}h`}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<UserCheck className="w-4 h-4 text-white" />}
          label="人均工时"
          value={avgHoursPerWorker > 0 ? `${avgHoursPerWorker.toFixed(1)}h` : '--'}
          colorScheme="blue"
          compact
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-white" />}
          label="平均时薪"
          value={avgHourlyRate > 0 ? formatMoney(avgHourlyRate) + '/h' : '--'}
          colorScheme="amber"
          compact
        />
      </KpiCardGrid>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LaborTrendLineChart items={laborItems} />
        <LaborBarChart items={laborItems} groupBy={groupBy} />
      </div>

      {/* 用工明细表 */}
      <LaborDetailTable items={laborItems} />
    </div>
  );
}
