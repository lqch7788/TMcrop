/**
 * 汇总看板 —— 生产汇总表（管理者视角）v2（2026-10-01 重构）
 *
 * 布局（自上而下，"待办优先" + 顶部全息 Hero）：
 *   ① HeroPageHeader          深色玻璃条（标题 + 时间口径 + 最后更新时间）
 *   ① HERO 全息看板            深色玻璃，含 综合评分环 / 4 KPI / 4 待办风险塔
 *   ② 模块体检                 6 模块卡片（统一高度 + 健康灯）
 *   ③ 趋势与结构               产量趋势 + 成本构成（左右对称）
 *   ④ 关注清单                 AlertTicker + 批次进度 Top5（左右对称）
 *   Footer                    数据口径说明
 *
 * 数据源：useSummaryDataStore
 *   → /api/summary/overview | module-health | indicator-board
 *   → /api/summary/yield-stats | cost-stats | batch-stats | indicator-drilldown
 * 架构：组件 → Store → enhancedApiClient → API（V2.1 铁律，无缓存层）
 *
 * 时间口径：默认「本年度」。库里业务数据集中在年中，默认"本月"会显示成一屏 0。
 *           模块体检与批次是存量快照，不随时间筛选变化。
 *
 * 设计风格：浅色基底 + 顶部深色玻璃 Hero（Tech-Light）
 *   - 顶部 Hero 用 .tech-hero + 扫描线 + 角落发光
 *   - KPI 用 KpiCard variant="hero"（深色玻璃）
 *   - 待办用 TodoStrip 升级版（霓虹风险塔 + critical pulse）
 *   - 卡片统一高度 + 健康灯（绿/黄/红/灰）
 */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Sprout, TrendingUp, DollarSign,
  CheckCircle2, Layers, AlertTriangle,
  Loader2,
  BarChart3, PieChart, RefreshCw,
  FileCheck, ClipboardCheck, AlertCircle,
  ClipboardList, Boxes, Users, Flower2, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import {
  HeroPageHeader, HeroScoreGauge, DenseKpiGrid,
  TodoStrip, ModuleHealthGrid, AlertTicker, DrilldownModal,
} from '../../components/summary';
import type {
  TodoItem, ModuleCard,
  DenseKpiItem, AlertTickerItem,
} from '../../components/summary';
import { useSummaryDataStore } from '../../stores/useSummaryDataStore';
import { getTaskStatus } from '../../components/summary/constants';
import { currentYearRange, rangeByMode } from '../../lib/dateUtils';

// ========== 批次状态字典 ==========

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

// ========== 图表组件 ==========

/** 产量趋势柱状图 */
function YieldTrendChart({ data }: { data: { name: string; 产量: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无产量数据</p>
        </div>
      </div>
    );
  }
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

/** 成本构成饼图（中心显示总成本） */
function CostBreakdownPie({ data }: { data: { name: string; value: number; fill: string }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <PieChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无成本数据</p>
        </div>
      </div>
    );
  }
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
      {/* 中心总计 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800 tabular-nums">
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
  if (batches.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">暂无批次数据</p>
        </div>
      </div>
    );
  }
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
            <span className="text-xs font-semibold text-gray-700 flex-shrink-0 ml-2 tabular-nums">
              {batch.completionRate}%
            </span>
          </div>
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

// ========== 通用容器 ==========

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}

function CardWrapper({ title, icon, children, className = '', rightSlot }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-800 flex-1">{title}</h3>
        {rightSlot}
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
  const moduleHealth = useSummaryDataStore((s) => s.moduleHealth);
  const indicatorBoard = useSummaryDataStore((s) => s.indicatorBoard);
  const yieldItems = useSummaryDataStore((s) => s.yieldItems);
  const costSummary = useSummaryDataStore((s) => s.costSummary);
  const batchItems = useSummaryDataStore((s) => s.batchItems);
  const isLoading = useSummaryDataStore((s) => s.isLoading);
  const fetchOverview = useSummaryDataStore((s) => s.fetchOverview);
  const fetchModuleHealth = useSummaryDataStore((s) => s.fetchModuleHealth);
  const fetchIndicatorBoard = useSummaryDataStore((s) => s.fetchIndicatorBoard);
  const drilldown = useSummaryDataStore((s) => s.drilldown);
  const fetchDrilldown = useSummaryDataStore((s) => s.fetchDrilldown);
  const fetchYieldStats = useSummaryDataStore((s) => s.fetchYieldStats);
  const fetchCostStats = useSummaryDataStore((s) => s.fetchCostStats);
  const fetchBatchStats = useSummaryDataStore((s) => s.fetchBatchStats);

  // 时间范围：默认本年度
  const [filterMode, setFilterMode] = useState<'month' | 'quarter' | 'year' | 'custom'>('year');
  const [range, setRange] = useState(currentYearRange);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 下钻明细弹窗（点击待办项查看具体是哪些记录）
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<string | null>(null);

  // 时间范围变化 → 刷新受时间影响的统计
  useEffect(() => {
    const stamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(stamp);

    fetchOverview({ startDate: range.startDate, endDate: range.endDate });
    fetchYieldStats({ startDate: range.startDate, endDate: range.endDate });
    fetchCostStats({ startDate: range.startDate, endDate: range.endDate });
    fetchIndicatorBoard({ startDate: range.startDate, endDate: range.endDate });
  }, [range]);

  // 存量快照（模块体检、批次）与时间无关，挂载时取一次
  useEffect(() => {
    fetchModuleHealth();
    fetchBatchStats({});
  }, []);

  // 打开下钻弹窗时加载对应明细
  useEffect(() => {
    if (drilldownOpen && drilldownType) {
      fetchDrilldown(drilldownType);
    }
  }, [drilldownOpen, drilldownType]);

  // ========== ① 待办与风险 ==========

  const todoItems: TodoItem[] = useMemo(() => [
    {
      key: 'approval',
      icon: <FileCheck className="w-5 h-5 text-white" />,
      label: '待审批单据',
      value: moduleHealth?.approval.pending ?? 0,
      path: '/pending-approval',
      tone: 'amber',
      drilldownType: 'pendingApprovals',
    },
    {
      key: 'overdue',
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      label: '逾期任务',
      value: moduleHealth?.farm.tasksOverdue ?? 0,
      path: '/farm-hub',
      tone: 'red',
      drilldownType: 'overdueTasks',
    },
    {
      key: 'acceptance',
      icon: <ClipboardCheck className="w-5 h-5 text-white" />,
      label: '待验收任务',
      value: moduleHealth?.farm.tasksWaitingAcceptance ?? 0,
      path: '/farm-hub',
      tone: 'blue',
      drilldownType: 'pendingAcceptance',
    },
    {
      key: 'problems',
      icon: <AlertCircle className="w-5 h-5 text-white" />,
      label: '未解决问题',
      value: moduleHealth?.farm.problemsOpen ?? 0,
      path: '/summary/problems',
      tone: 'purple',
      drilldownType: 'problems',
    },
  ], [moduleHealth]);

  // ========== ① HERO 4 项 KPI ==========

  const heroKpis: DenseKpiItem[] = useMemo(() => [
    {
      key: 'yield',
      icon: <TrendingUp className="w-4 h-4 text-white" />,
      label: '产量 (kg)',
      value: (overview?.yield.monthTotalYield ?? 0).toLocaleString(),
      colorScheme: 'emerald',
      onClick: () => navigate('/summary/business-analysis'),
    },
    {
      key: 'amount',
      icon: <DollarSign className="w-4 h-4 text-white" />,
      label: '产值 (元)',
      value: `¥${(overview?.yield.monthTotalAmount ?? 0).toLocaleString()}`,
      colorScheme: 'emerald',
      onClick: () => navigate('/summary/business-analysis'),
    },
    {
      key: 'cost',
      icon: <Wallet className="w-4 h-4 text-white" />,
      label: '总成本 (元)',
      value: `¥${(overview?.totalCost ?? 0).toLocaleString()}`,
      colorScheme: 'amber',
      onClick: () => navigate('/summary/business-analysis'),
    },
    {
      key: 'taskRate',
      icon: <CheckCircle2 className="w-4 h-4 text-white" />,
      label: '任务完成率',
      value: `${overview?.task.completionRate ?? 0}%`,
      colorScheme: 'blue',
      onClick: () => navigate('/summary/indicators'),
    },
  ], [overview]);

  // ========== ① HERO 综合评分环 ==========

  const heroScore = indicatorBoard?.score ?? 0;
  const heroScoreStatus: 'good' | 'warning' | 'critical' =
    heroScore >= 80 ? 'good' : heroScore >= 60 ? 'warning' : 'critical';

  // ========== ② 六大模块体检 ==========

  const moduleCards: ModuleCard[] = useMemo(() => {
    const h = moduleHealth;
    const tasksTotal = h?.farm.tasksTotal ?? 0;
    const taskRate = tasksTotal > 0 ? Math.round(((h?.farm.tasksCompleted ?? 0) / tasksTotal) * 100) : 0;

    // 健康灯规则
    const planHealth: ModuleCard['healthStatus'] =
      (h?.plan.purchasePlansPending ?? 0) > 0 ? 'yellow' : 'green';
    const cropHealth: ModuleCard['healthStatus'] =
      (h?.crop.seedSources ?? 0) > 0 ? 'green' : 'gray';
    const farmHealth: ModuleCard['healthStatus'] =
      (h?.farm.tasksOverdue ?? 0) > 0 ? 'red' :
      (h?.farm.tasksWaitingAcceptance ?? 0) > 0 ? 'yellow' : 'green';
    const materialHealth: ModuleCard['healthStatus'] =
      (h?.material.materialsLowStock ?? 0) > 0 ? 'yellow' : 'green';
    const approvalHealth: ModuleCard['healthStatus'] =
      (h?.approval.pending ?? 0) >= 10 ? 'red' :
      (h?.approval.pending ?? 0) >= 1 ? 'yellow' : 'green';
    const laborHealth: ModuleCard['healthStatus'] =
      (h?.labor.employees ?? 0) > 0 ? 'green' : 'gray';

    return [
      {
        key: 'plan',
        title: '计划管理',
        icon: <ClipboardList className="w-4 h-4 text-white" />,
        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        path: '/production',
        healthStatus: planHealth,
        metrics: [
          { label: '订单（进行中）', value: `${h?.plan.orders ?? 0}（${h?.plan.ordersInProgress ?? 0}）` },
          { label: '生产计划', value: h?.plan.productionPlans ?? 0 },
          { label: '技术方案', value: h?.plan.techSolutions ?? 0 },
          { label: '采购计划', value: h?.plan.purchasePlans ?? 0, highlight: (h?.plan.purchasePlansPending ?? 0) > 0 },
        ],
      },
      {
        key: 'crop',
        title: '作物管理',
        icon: <Flower2 className="w-4 h-4 text-white" />,
        iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
        path: '/crop/seed-source',
        healthStatus: cropHealth,
        metrics: [
          { label: '可用种源', value: h?.crop.seedSources ?? 0 },
          { label: '育苗（在育）', value: `${h?.crop.seedlings ?? 0}（${h?.crop.seedlingsInProgress ?? 0}）` },
          { label: '种植（采收中）', value: `${h?.crop.plantings ?? 0}（${h?.crop.plantingsHarvesting ?? 0}）` },
          { label: '作物库存（项）', value: h?.crop.inventoryInstances ?? 0 },
        ],
      },
      {
        key: 'farm',
        title: '农事管理',
        icon: <Sprout className="w-4 h-4 text-white" />,
        iconBg: 'bg-gradient-to-br from-lime-500 to-green-600',
        path: '/farm-hub',
        healthStatus: farmHealth,
        metrics: [
          { label: '任务（已完成）', value: `${h?.farm.tasksTotal ?? 0}（${h?.farm.tasksCompleted ?? 0}）` },
          { label: '任务完成率', value: `${taskRate}%` },
          { label: '待验收', value: h?.farm.tasksWaitingAcceptance ?? 0, highlight: (h?.farm.tasksWaitingAcceptance ?? 0) > 0 },
          { label: '问题（待处理）', value: `${h?.farm.problemsTotal ?? 0}（${h?.farm.problemsOpen ?? 0}）` },
        ],
      },
      {
        key: 'material',
        title: '物资管理',
        icon: <Boxes className="w-4 h-4 text-white" />,
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
        path: '/warehouse-overview',
        healthStatus: materialHealth,
        metrics: [
          { label: '物料（低于安全库存）', value: `${h?.material.materials ?? 0}（${h?.material.materialsLowStock ?? 0}）`, highlight: (h?.material.materialsLowStock ?? 0) > 0 },
          { label: '供应商（启用）', value: `${h?.material.suppliers ?? 0}（${h?.material.suppliersActive ?? 0}）` },
          { label: '入库单', value: h?.material.inboundRecords ?? 0 },
          { label: '领料单（待审）', value: `${h?.material.materialRequests ?? 0}（${h?.material.materialRequestsPending ?? 0}）`, highlight: (h?.material.materialRequestsPending ?? 0) > 0 },
        ],
      },
      {
        key: 'approval',
        title: '审批管理',
        icon: <FileCheck className="w-4 h-4 text-white" />,
        iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
        path: '/pending-approval',
        healthStatus: approvalHealth,
        metrics: [
          { label: '审批总量', value: h?.approval.total ?? 0 },
          { label: '待审批', value: h?.approval.pending ?? 0, highlight: (h?.approval.pending ?? 0) > 0 },
          { label: '已通过', value: h?.approval.approved ?? 0 },
          { label: '已驳回', value: h?.approval.rejected ?? 0 },
        ],
      },
      {
        key: 'labor',
        title: '人工管理',
        icon: <Users className="w-4 h-4 text-white" />,
        iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
        path: '/labor/attendance',
        healthStatus: laborHealth,
        metrics: [
          { label: '在岗人员', value: h?.labor.employees ?? 0 },
          { label: '考勤记录', value: h?.labor.attendanceRecords ?? 0 },
          { label: '累计工时 (h)', value: h?.labor.workHours ?? 0 },
          { label: '工单记录', value: h?.labor.workLogs ?? 0 },
        ],
      },
    ];
  }, [moduleHealth]);

  // ========== ④ 生产预警（跨模块聚合）==========

  const alerts: AlertTickerItem[] = useMemo(() => {
    const result: AlertTickerItem[] = [];
    const h = moduleHealth;

    if ((h?.farm.tasksOverdue ?? 0) > 0) {
      result.push({
        key: 'overdue',
        severity: 'critical',
        title: '存在逾期任务',
        description: `当前有 ${h?.farm.tasksOverdue} 个任务已过计划日期仍未完成，请安排跟进`,
        path: '/farm-hub',
      });
    }

    if (overview && overview.problem.totalProblems > 0 && overview.problem.resolutionRate < 60) {
      result.push({
        key: 'problemLow',
        severity: 'critical',
        title: '问题堆积：解决率不足',
        description: `当前解决率 ${overview.problem.resolutionRate}%，仍有 ${overview.problem.totalProblems - overview.problem.resolvedProblems} 个问题待解决`,
        path: '/summary/problems',
      });
    } else if (overview && overview.problem.totalProblems > 0 && overview.problem.resolutionRate < 80) {
      result.push({
        key: 'problemMid',
        severity: 'warning',
        title: '问题解决进度偏慢',
        description: `当前解决率 ${overview.problem.resolutionRate}%，建议加强跟踪处理`,
        path: '/summary/problems',
      });
    }

    if ((h?.approval.pending ?? 0) >= 5) {
      result.push({
        key: 'approvalPending',
        severity: (h?.approval.pending ?? 0) >= 10 ? 'critical' : 'warning',
        title: '审批积压',
        description: `有 ${h?.approval.pending} 张单据待审批，可能阻塞下游领料/生产环节`,
        path: '/pending-approval',
      });
    }

    const lowStock = (h?.material.materialsLowStock ?? 0);
    if (lowStock > 0) {
      result.push({
        key: 'lowStock',
        severity: 'warning',
        title: '物料低于安全库存',
        description: `${lowStock} 种物料的当前库存已低于设定的安全库存线，请及时补货`,
        path: '/warehouse-overview',
      });
    }

    if (overview && overview.task.totalTasks > 0) {
      const status = getTaskStatus(overview.task.completionRate);
      if (status === 'critical') {
        result.push({
          key: 'taskRateLow',
          severity: 'critical',
          title: '任务完成率严重偏低',
          description: `当前完成率 ${overview.task.completionRate}%，未完成任务 ${overview.task.totalTasks - overview.task.completedTasks} 个`,
          path: '/farm-hub',
        });
      }
    }

    if ((h?.farm.tasksWaitingAcceptance ?? 0) >= 3) {
      result.push({
        key: 'acceptance',
        severity: 'warning',
        title: '待验收任务积压',
        description: `有 ${h?.farm.tasksWaitingAcceptance} 个任务等待验收确认`,
        path: '/farm-hub',
      });
    }

    return result;
  }, [overview, moduleHealth]);

  // ========== 榜单与图表数据 ==========

  /** Top5 批次（按完成率） */
  const topBatches = useMemo(
    () => [...batchItems].sort((a, b) => b.completionRate - a.completionRate).slice(0, 5),
    [batchItems]
  );

  /** 产量趋势数据 */
  const yieldChartData = useMemo(
    () => yieldItems.map((item) => ({ name: item.name, 产量: item.value })),
    [yieldItems]
  );

  /** 成本构成数据 */
  const costPieData = useMemo(() => {
    if (!costSummary) return [];
    return [
      { name: '人工成本', value: costSummary.totalLaborCost, fill: '#10b981' },
      { name: '物料成本', value: costSummary.totalMaterialCost, fill: '#3b82f6' },
      { name: '能源成本', value: costSummary.totalEnergyCost, fill: '#f59e0b' },
    ].filter((d) => d.value > 0);
  }, [costSummary]);

  // ========== 事件处理 ==========

  const handleModeChange = (mode: 'month' | 'quarter' | 'year' | 'custom') => {
    setFilterMode(mode);
    if (mode !== 'custom') {
      setRange(rangeByMode(mode));
    }
  };

  const handleDateChange = (startDate: string, endDate: string) => {
    setRange({ startDate, endDate });
  };

  const handleRefresh = () => {
    fetchOverview({ startDate: range.startDate, endDate: range.endDate });
    fetchYieldStats({ startDate: range.startDate, endDate: range.endDate });
    fetchCostStats({ startDate: range.startDate, endDate: range.endDate });
    fetchIndicatorBoard({ startDate: range.startDate, endDate: range.endDate });
    fetchModuleHealth();
    fetchBatchStats({});
  };

  // ========== 时间胶囊内容 ==========

  const periodText = `${range.startDate} ~ ${range.endDate}`;
  const modeText = filterMode === 'month' ? '本月'
    : filterMode === 'quarter' ? '本季度'
    : filterMode === 'year' ? '本年度' : '自定义';

  // ========== 加载态 ==========

  if (isLoading && !overview && !moduleHealth) {
    return (
      <div className="space-y-5">
        <HeroPageHeader
          icon={<LayoutDashboard className="w-5 h-5 text-white" />}
          title="汇总看板"
          description="基地各模块运营总览，面向管理者的经营视图"
          period={`${modeText} · ${periodText}`}
        />
        <LoadingSpinner />
      </div>
    );
  }

  // ========== 渲染 ==========

  return (
    <div className="space-y-5">
      {/* HeroPageHeader — 深色玻璃条 */}
      <HeroPageHeader
        icon={<LayoutDashboard className="w-5 h-5 text-white" />}
        title="汇总看板"
        description="基地各模块运营总览，面向管理者的经营视图"
        period={`${modeText} · ${periodText}`}
        lastUpdated={lastUpdated}
        actions={
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-xs transition-colors"
            title="刷新数据"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>刷新</span>
          </button>
        }
      />

      {/* 日期筛选（保持浅色原版，避免与深色 Hero 重复） */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(['month', 'quarter', 'year', 'custom'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${filterMode === m
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                {m === 'month' ? '本月' : m === 'quarter' ? '本季度' : m === 'year' ? '本年度' : '自定义'}
              </button>
            ))}
          </div>
          {filterMode === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={range.startDate}
                onChange={(e) => handleDateChange(e.target.value, range.endDate)}
                className="border border-slate-200 rounded-md px-2 py-1 text-xs"
              />
              <span className="text-slate-400">至</span>
              <input
                type="date"
                value={range.endDate}
                onChange={(e) => handleDateChange(range.startDate, e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ① HERO 全息看板（浅色基底 — 与系统其他汇总页面统一） */}
      <div className="stagger-in stagger-in-2 bg-white rounded-xl border border-slate-200/70 shadow-sm p-5">
        <div className="grid grid-cols-12 gap-4">
          {/* 左：综合经营评分环 */}
          <div className="col-span-12 md:col-span-4 flex flex-col items-center justify-center border-r border-slate-200/60 pr-4">
            <HeroScoreGauge
              score={heroScore}
              status={heroScoreStatus}
              label="综合经营评分"
            />
          </div>

          {/* 中：4 项核心 KPI 紧凑网格 */}
          <div className="col-span-12 md:col-span-5 flex flex-col justify-center">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">核心 KPI</div>
            <DenseKpiGrid items={heroKpis} columns={2} />
          </div>

          {/* 右：4 待办风险塔 */}
          <div className="col-span-12 md:col-span-3 flex flex-col justify-center border-l border-slate-200/60 pl-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">待办风险</div>
            <TodoStrip
              items={todoItems}
              onNavigate={(item) => {
                if (item.drilldownType) {
                  setDrilldownType(item.drilldownType);
                  setDrilldownOpen(true);
                } else {
                  navigate(item.path);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 下钻明细弹窗 */}
      <DrilldownModal
        isOpen={drilldownOpen}
        onClose={() => { setDrilldownOpen(false); setDrilldownType(null); }}
        data={drilldown}
        loading={isLoading && !drilldown}
      />

      {/* ② 六大模块体检 */}
      <div className="stagger-in stagger-in-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">模块体检</h2>
          <span className="text-[11px] text-slate-400">6 模块 · 健康灯实时</span>
        </div>
        <ModuleHealthGrid cards={moduleCards} onNavigate={navigate} />
      </div>

      {/* ③ 趋势与结构 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-in stagger-in-4">
        <CardWrapper title="产量趋势" icon={<BarChart3 className="w-3.5 h-3.5 text-blue-600" />}>
          <div className="h-56">
            <YieldTrendChart data={yieldChartData} />
          </div>
        </CardWrapper>

        <CardWrapper title="成本构成" icon={<PieChart className="w-3.5 h-3.5 text-amber-600" />}>
          <div className="h-56">
            <CostBreakdownPie data={costPieData} />
          </div>
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
      </div>

      {/* ④ 关注清单 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-in stagger-in-5">
        <CardWrapper title="生产预警" icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />}>
          <AlertTicker
            items={alerts}
            maxItems={5}
            onItemClick={(item) => {
              if (item.path) navigate(item.path);
            }}
          />
        </CardWrapper>

        <CardWrapper title="批次进度 Top5" icon={<Layers className="w-3.5 h-3.5 text-purple-600" />}>
          <BatchProgressBars batches={topBatches} />
        </CardWrapper>
      </div>

      {/* Footer — 数据口径说明 */}
      <div className="text-[11px] text-slate-400 text-center pt-2 pb-1">
        数据口径：{periodText}（区间统计）+ 实时存量快照（模块/批次）· 演示数据可能与真实统计不同
      </div>
    </div>
  );
}