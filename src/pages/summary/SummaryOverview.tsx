/**
 * 汇总看板页面 - 生产汇总表总览
 * 展示核心 KPI 指标、趋势图表和预警信息
 *
 * 数据源：useSummaryDataStore（Zustand Store）
 * 架构：Store → API（无缓存层，V2.1 铁律）
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sprout, TrendingUp, DollarSign,
  Clock, CheckCircle2, Layers, AlertTriangle,
  Loader2, MapPin, ChevronRight, Package,
  BarChart3, PieChart,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import {
  PageHeader, KpiCard, KpiCardGrid, AlertCard, SummaryDateFilter
} from '../../components/summary';
import { useSummaryDataStore } from '../../stores/useSummaryDataStore';
import { getTaskStatus } from '../../components/summary/constants';

// ========== 批次状态中文映射 ==========

/** 批次状态 → 中文标签 */
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  planning: '规划中',
  published: '已发布',
  in_progress: '进行中',
  completed: '已完成',
  overdue: '已逾期',
};

/** 批次状态 → Tailwind 颜色 */
const STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-400',
  planning: 'text-gray-500',
  published: 'text-blue-400',
  in_progress: 'text-blue-500',
  completed: 'text-emerald-500',
  overdue: 'text-red-500',
};

/** 批次状态 → Badge 样式 */
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  planning: 'bg-gray-100 text-gray-600',
  published: 'bg-blue-50 text-blue-500',
  in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-50 text-red-600',
};

// ========== 产量趋势柱状图 ==========

/** 产量趋势简易柱状图 - 使用 yieldItems 按月展示 */
function YieldTrendChart({ data }: { data: { name: string; 产量: number }[] }) {
  if (data.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
          formatter={(value: number) => [`${value} kg`, '产量']}
        />
        <Bar dataKey="产量" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ========== 成本构成饼图 ==========

/** 成本构成简易饼图 */
function CostBreakdownPie({ data }: { data: { name: string; value: number; fill: string }[] }) {
  if (data.length === 0) return <EmptyChart />;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              `${((value / total) * 100).toFixed(1)}% (¥${value.toLocaleString()})`,
              name,
            ]}
          />
        </RePieChart>
      </ResponsiveContainer>
      {/* 中心总计文字 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800">
            ¥{(total / 10000).toFixed(1)}万
          </div>
          <div className="text-xs text-gray-400">总成本</div>
        </div>
      </div>
    </div>
  );
}

// ========== 批次进度条 ==========

/** Top5 批次进度条 */
function BatchProgressBars({ batches }: { batches: import('../../stores/useSummaryDataStore').BatchStatItem[] }) {
  if (batches.length === 0) return <EmptyState text="暂无批次数据" />;
  return (
    <div className="space-y-3">
      {batches.map((batch) => (
        <div key={batch.id} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-gray-600 truncate max-w-[120px]" title={batch.batchName || batch.batchCode}>
                {batch.batchName || batch.batchCode}
              </span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500 truncate">{batch.cropName}</span>
            </div>
            <span className="text-xs font-semibold text-gray-700 flex-shrink-0 ml-2">
              {batch.completionRate}%
            </span>
          </div>
          {/* 进度条 */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                batch.completionRate >= 100
                  ? 'bg-emerald-500'
                  : batch.completionRate >= 60
                  ? 'bg-blue-500'
                  : batch.completionRate >= 30
                  ? 'bg-amber-500'
                  : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(batch.completionRate, 100)}%` }}
            />
          </div>
          {/* 状态标签 */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{batch.greenhouse || '-'}</span>
            <span>|</span>
            <span className={STATUS_COLOR[batch.status] || 'text-gray-400'}>
              {STATUS_LABEL[batch.status] || batch.status || '-'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== 温室快照横向滚动卡片 ==========

/** 单个温室快照卡片 */
function GreenhouseSnapshotCard({ batch }: { batch: import('../../stores/useSummaryDataStore').BatchStatItem }) {
  const navigate = useNavigate();
  return (
    <div
      className="flex-shrink-0 w-56 bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => navigate('/summary/batch')}
    >
      {/* 顶部：温室名 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate" title={batch.greenhouse || batch.batchName}>
          {batch.greenhouse || batch.batchName || batch.batchCode}
        </span>
      </div>
      {/* 作物信息 */}
      <div className="text-xs text-gray-500 mb-3">
        <span>{batch.cropName}</span>
        {batch.variety && <span className="text-gray-300 ml-1">·{batch.variety}</span>}
      </div>
      {/* 进度条 */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full ${
            batch.completionRate >= 100 ? 'bg-emerald-500' :
            batch.completionRate >= 60 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.min(batch.completionRate, 100)}%` }}
        />
      </div>
      {/* 底部指标 */}
      <div className="flex items-center justify-between text-xs">
        <span className={STATUS_COLOR[batch.status] || 'text-gray-400'}>
          {STATUS_LABEL[batch.status] || batch.status || '-'}
        </span>
        <span className="text-gray-400">{batch.completionRate}%</span>
      </div>
    </div>
  );
}

// ========== 空状态组件 ==========

function EmptyState({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
      <Package className="w-10 h-10 mb-2 opacity-30" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
      <span className="text-sm">暂无图表数据</span>
    </div>
  );
}

// ========== 加载状态 ==========

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}

// ========== 卡片容器 ==========

function CardWrapper({ title, icon, children, className = '' }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-md bg-gray-50 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ========== 主页面组件 ==========

export default function SummaryOverview() {
  const navigate = useNavigate();

  // Store 数据
  const overview = useSummaryDataStore((s) => s.overview);
  const yieldItems = useSummaryDataStore((s) => s.yieldItems);
  const costSummary = useSummaryDataStore((s) => s.costSummary);
  const batchItems = useSummaryDataStore((s) => s.batchItems);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const fetchAll = useSummaryDataStore((s) => s.fetchAll);
  const fetchYieldStats = useSummaryDataStore((s) => s.fetchYieldStats);
  const fetchCostStats = useSummaryDataStore((s) => s.fetchCostStats);
  const fetchBatchStats = useSummaryDataStore((s) => s.fetchBatchStats);
  const isCacheStale = useSummaryDataStore((s) => s.isCacheStale);

  // 日期筛选状态
  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 初始化加载数据
  useEffect(() => {
    if (isCacheStale('overview', 5 * 60 * 1000)) {
      fetchAll();
    }
  }, []);

  // 日期变更时重新获取数据
  useEffect(() => {
    if (startDate && endDate) {
      fetchYieldStats({ startDate, endDate });
      fetchCostStats({ startDate, endDate });
      fetchBatchStats({});
    }
  }, [startDate, endDate]);

  // ========== KPI 值计算 ==========

  const activeBatches = overview?.batch?.activeCount ?? 0;
  const monthYield = overview?.yield?.monthTotalYield ?? 0;
  const monthAmount = overview?.yield?.monthTotalAmount ?? 0;
  const completionRate = overview?.task?.completionRate ?? 0;
  const totalHours = overview?.labor?.totalHours ?? 0;
  const totalCost = overview?.totalCost ?? 0;

  // ========== 预警列表（从数据阈值推导） ==========

  const alerts = useMemo(() => {
    const result: { title: string; description: string; severity: 'warning' | 'critical' }[] = [];
    if (!overview) return result;

    // 任务完成率预警
    const taskStatus = getTaskStatus(overview.task.completionRate);
    if (taskStatus === 'critical') {
      result.push({
        title: '任务完成率严重偏低',
        description: `当前完成率 ${overview.task.completionRate}%，未完成任务 ${overview.task.totalTasks - overview.task.completedTasks} 个`,
        severity: 'critical',
      });
    } else if (taskStatus === 'warning') {
      result.push({
        title: '任务完成率偏低',
        description: `当前完成率 ${overview.task.completionRate}%，建议加快任务执行进度`,
        severity: 'warning',
      });
    }

    // 问题解决率预警
    if (overview.problem.totalProblems > 0 && overview.problem.resolutionRate < 60) {
      result.push({
        title: '问题堆积：解决率不足',
        description: `当前解决率 ${overview.problem.resolutionRate}%，仍有 ${overview.problem.totalProblems - overview.problem.resolvedProblems} 个问题待解决`,
        severity: 'critical',
      });
    } else if (overview.problem.totalProblems > 0 && overview.problem.resolutionRate < 80) {
      result.push({
        title: '问题解决进度偏慢',
        description: `当前解决率 ${overview.problem.resolutionRate}%，建议加强问题跟踪处理`,
        severity: 'warning',
      });
    }

    return result;
  }, [overview]);

  // ========== Top5 批次（按完成率排序） ==========

  const topBatches = useMemo(() => {
    return [...batchItems]
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);
  }, [batchItems]);

  // ========== 产量图表数据 ==========

  const yieldChartData = useMemo(() => {
    return yieldItems.map((item) => ({
      name: item.name,
      产量: item.value,
    }));
  }, [yieldItems]);

  // ========== 成本饼图数据 ==========

  const costPieData = useMemo(() => {
    if (!costSummary) return [];
    return [
      { name: '人工成本', value: costSummary.totalLaborCost, fill: '#10b981' },
      { name: '物料成本', value: costSummary.totalMaterialCost, fill: '#3b82f6' },
      { name: '能源成本', value: costSummary.totalEnergyCost, fill: '#f59e0b' },
    ].filter((d) => d.value > 0);
  }, [costSummary]);

  // ========== 日期筛选器回调 ==========

  const handleModeChange = (mode: 'month' | 'quarter' | 'year' | 'custom') => {
    setFilterMode(mode);
    if (mode !== 'custom') {
      // 非自定义模式使用预设日期范围
      const now = new Date();
      let start = '';
      let end = now.toISOString().slice(0, 10);

      if (mode === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      } else if (mode === 'quarter') {
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterStart, 1).toISOString().slice(0, 10);
      } else if (mode === 'year') {
        start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      }

      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // ========== 加载状态 ==========

  if (isLoading && !overview) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<LayoutDashboard className="w-6 h-6 text-white" />}
          title="汇总看板"
          description="生产汇总表总览，展示所有核心 KPI 指标和趋势"
        />
        <LoadingSpinner />
      </div>
    );
  }

  // ========== 页面渲染 ==========

  return (
    <div className="space-y-6">
      {/* 页面头部 + 日期筛选 */}
      <PageHeader
        icon={<LayoutDashboard className="w-6 h-6 text-white" />}
        title="汇总看板"
        description="生产汇总表总览，展示所有核心 KPI 指标和趋势"
      />
      <div className="flex justify-start">
        <SummaryDateFilter
          mode={filterMode}
          onModeChange={handleModeChange}
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
      </div>

      {/* 6 个核心 KPI 卡片 */}
      <KpiCardGrid columns={6} compact>
        <KpiCard
          icon={<Sprout className="w-4 h-4 text-white" />}
          label="活跃批次"
          value={activeBatches}
          colorScheme="purple"
          onClick={() => navigate('/summary/batch')}
          compact
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-white" />}
          label="月产量 (kg)"
          value={monthYield.toLocaleString()}
          colorScheme="emerald"
          onClick={() => navigate('/summary/yield')}
          compact
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-white" />}
          label={`月产值 (元)`}
          value={`¥${monthAmount.toLocaleString()}`}
          colorScheme="emerald"
          onClick={() => navigate('/summary/yield')}
          compact
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          label="任务完成率"
          value={`${completionRate}%`}
          trend={completionRate >= 50 ? completionRate - 50 : completionRate - 50}
          colorScheme="blue"
          onClick={() => navigate('/summary/indicators')}
          compact
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-white" />}
          label="总工时 (h)"
          value={totalHours.toLocaleString()}
          colorScheme="blue"
          onClick={() => navigate('/summary/labor')}
          compact
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-white" />}
          label={`总成本 (元)`}
          value={`¥${totalCost.toLocaleString()}`}
          colorScheme="amber"
          onClick={() => navigate('/summary/cost')}
          compact
        />
      </KpiCardGrid>

      {/* 中间双列布局：温室快照 + 产量趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 温室快照 - 横向滚动卡片 */}
        <CardWrapper title="温室快照" icon={<MapPin className="w-3.5 h-3.5 text-emerald-600" />}>
          {batchItems.length === 0 ? (
            <EmptyState text="暂无温室数据" />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
              {batchItems.slice(0, 10).map((batch) => (
                <GreenhouseSnapshotCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </CardWrapper>

        {/* 产量趋势柱状图 */}
        <CardWrapper title="产量趋势" icon={<BarChart3 className="w-3.5 h-3.5 text-blue-600" />}>
          <div className="h-56">
            {yieldChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <YieldTrendChart data={yieldChartData} />
            )}
          </div>
        </CardWrapper>
      </div>

      {/* 下半部分双列：成本构成 + 批次进度 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 成本构成饼图 */}
        <CardWrapper title="成本构成" icon={<PieChart className="w-3.5 h-3.5 text-amber-600" />}>
          <div className="h-56">
            {costPieData.length === 0 ? (
              <EmptyChart />
            ) : (
              <CostBreakdownPie data={costPieData} />
            )}
          </div>
          {/* 图例 */}
          {costPieData.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-3">
              {costPieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-gray-500">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardWrapper>

        {/* 批次进度 Top5 */}
        <CardWrapper title="批次进度" icon={<Layers className="w-3.5 h-3.5 text-purple-600" />}>
          <BatchProgressBars batches={topBatches} />
        </CardWrapper>
      </div>

      {/* 生产预警 + 最近批次状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 生产预警列表 */}
        <CardWrapper title="生产预警" icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />}>
          {alerts.length === 0 ? (
            <EmptyState text="暂无预警信息" />
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <AlertCard
                  key={i}
                  title={alert.title}
                  description={alert.description}
                  severity={alert.severity}
                />
              ))}
            </div>
          )}
        </CardWrapper>

        {/* 最近批次 - 列表视图 */}
        <CardWrapper title="最近批次" icon={<Package className="w-3.5 h-3.5 text-slate-600" />}>
          {batchItems.length === 0 ? (
            <EmptyState text="暂无批次数据" />
          ) : (
            <div className="space-y-2">
              {batchItems.slice(0, 6).map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                  onClick={() => navigate('/summary/batch')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">
                      {batch.batchName || batch.batchCode}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{batch.cropName}</span>
                      <span>|</span>
                      <span>{batch.greenhouse}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      STATUS_BADGE[batch.status] || 'bg-gray-100 text-gray-500'
                    }`}>
                      {STATUS_LABEL[batch.status] || batch.status || '-'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardWrapper>
      </div>
    </div>
  );
}
