/**
 * 月度规划页面
 * 显示月度任务规划、物资需求、人员需求和成本预估
 * 样式与农事任务中心统一
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  FileText,
  ShoppingCart,
  Users,
  DollarSign,
  RotateCw,
  Download,
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Space } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { useMonthlyTaskPlanning, MonthlyPlan, WeeklySummary, MaterialRequirement, WorkerRequirement } from '../hooks/useMonthlyTaskPlanning';
import { useProductionPlanStore } from '@/stores';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

// ============================================
// 类型定义
// ============================================
interface TaskTypeSummary {
  taskType: string;
  taskTypeName: string;
  count: number;
  percentage: number;
}

// ============================================
// 周汇总表格组件
// ============================================
function WeeklySummaryTable({ data }: { data: WeeklySummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">周次</TableHead>
          <TableHead className="w-[120px]">开始日期</TableHead>
          <TableHead className="w-[120px]">结束日期</TableHead>
          <TableHead className="w-[80px]">任务数</TableHead>
          <TableHead className="w-[100px]">总工时</TableHead>
          <TableHead className="w-[100px]">所需人数</TableHead>
          <TableHead>重点作物</TableHead>
          <TableHead>重点任务</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.weekNumber}>
            <TableCell className="font-semibold">第 {item.weekNumber} 周</TableCell>
            <TableCell>{item.startDate}</TableCell>
            <TableCell>{item.endDate}</TableCell>
            <TableCell><Badge variant="info">{item.taskCount}</Badge></TableCell>
            <TableCell>{item.totalHours}h</TableCell>
            <TableCell>{item.requiredWorkers} 人</TableCell>
            <TableCell>
              <Space wrap>
                {item.keyCrops.map(crop => (
                  <Badge key={crop} variant="success">{crop}</Badge>
                ))}
              </Space>
            </TableCell>
            <TableCell>
              <Space wrap>
                {item.keyTasks.map(task => (
                  <Badge key={task} variant="secondary">{task}</Badge>
                ))}
              </Space>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================
// 物资需求表格组件（带合计行）
// ============================================
function MaterialTableWithSummary({ data }: { data: MaterialRequirement[] }) {
  const totalPrice = useMemo(() => {
    return data.reduce((sum, m) => sum + m.estimatedTotalPrice, 0);
  }, [data]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">物资名称</TableHead>
          <TableHead className="w-[120px]">规格</TableHead>
          <TableHead className="w-[100px]">数量</TableHead>
          <TableHead className="w-[120px]">预估单价</TableHead>
          <TableHead className="w-[120px]">预估总价</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.materialName}</TableCell>
            <TableCell>{item.specification}</TableCell>
            <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
            <TableCell>¥{item.estimatedUnitPrice.toFixed(2)}</TableCell>
            <TableCell className="font-semibold text-red-500">¥{item.estimatedTotalPrice.toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {/* 合计行 */}
      <div className="flex justify-between items-center p-3 bg-gray-50 border-t border-gray-100">
        <span className="font-semibold">合计</span>
        <span className="font-semibold text-red-500">¥{totalPrice.toFixed(2)}</span>
      </div>
    </Table>
  );
}

// ============================================
// 人员需求表格组件
// ============================================
function WorkerTable({ data }: { data: WorkerRequirement[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">角色</TableHead>
          <TableHead className="w-[120px]">技能要求</TableHead>
          <TableHead className="w-[100px]">需求人数</TableHead>
          <TableHead className="w-[100px]">预估工时</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.role}</TableCell>
            <TableCell>{item.skill}</TableCell>
            <TableCell><Badge variant="info">{item.requiredCount} 人</Badge></TableCell>
            <TableCell>{item.estimatedHours}h</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================
// 主组件
// ============================================
export default function MonthlyPlanningPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'materials' | 'workers' | 'cost'>('overview');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  const { generateMonthlyPlan } = useMonthlyTaskPlanning();
  const { plans: storeBatches, fetchPlans } = useProductionPlanStore();

  // 挂载时从API加载批次数据
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 从 Zustand Store 获取批次列表
  const batches = storeBatches;

  // 批次选项
  const batchOptions = useMemo(() => {
    return batches
      .filter((b: any) => b.batchStatus === 'in_progress' || b.batchStatus === 'published')
      .map((b: any) => ({
        value: b.id,
        label: `${b.batchCode} - ${b.cropName}`,
      }));
  }, [batches]);

  // 生成月度计划
  useEffect(() => {
    const plan = generateMonthlyPlan(selectedMonth, selectedBatches);
    setMonthlyPlan(plan);
  }, [selectedMonth, selectedBatches, generateMonthlyPlan]);

  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedMonth(date.format('YYYY-MM'));
    }
  };

  const handleBatchChange = (values: string[]) => {
    setSelectedBatches(values);
  };

  const handleRefresh = () => {
    const plan = generateMonthlyPlan(selectedMonth, selectedBatches);
    setMonthlyPlan(plan);
  };

  const handleExport = () => {
    alert('导出功能开发中...');
  };

  const statsData = monthlyPlan
    ? [
        { label: '总任务数', value: monthlyPlan.totalTasks, icon: '📋', bgColor: 'bg-blue-500' },
        { label: '预估工时', value: `${monthlyPlan.totalHours}h`, icon: '⏱️', bgColor: 'bg-purple-500' },
        { label: '所需人员', value: Math.round(monthlyPlan.totalHours / 8), icon: '👥', bgColor: 'bg-cyan-500' },
        { label: '预估成本', value: `¥${monthlyPlan.totalCost.toFixed(0)}`, icon: '💰', bgColor: 'bg-orange-500' },
      ]
    : [];

  // 任务类型分布
  const taskTypeSummary: TaskTypeSummary[] = useMemo(() => {
    if (!monthlyPlan) return [];
    return Object.entries(monthlyPlan.taskTypeBreakdown)
      .map(([taskType, count]) => ({
        taskType,
        taskTypeName: getTaskTypeName(taskType),
        count,
        percentage: monthlyPlan.totalTasks > 0 ? Math.round((count / monthlyPlan.totalTasks) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [monthlyPlan]);

  function getTaskTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      irrigation: '灌溉',
      fertilization: '施肥',
      plant_protection: '植保',
      pruning: '修剪',
      harvest: '采收',
      weeding: '除草',
    };
    return typeMap[type] || type;
  }

  function getProgressColor(index: number): string {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];
    return colors[index % colors.length];
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => window.location.href = '/farm-hub'}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft />
            <span>返回</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">月度任务规划</h1>
            <p className="text-xs text-gray-500">基于作物生长周期和生产批次，生成未来一个月的任务规划、物资需求和成本预估</p>
          </div>
        </div>
      </div>

      {/* 日期选择、批次筛选和操作按钮 */}
      <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">选择月份:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(dayjs(e.target.value + '-01'))}
                className="px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">生产批次:</span>
              <select
                multiple
                value={selectedBatches}
                onChange={(e) => {
                  const options = e.target.selectedOptions;
                  const values = Array.from(options).map(opt => opt.value);
                  handleBatchChange(values);
                }}
                className="px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
              >
                {batchOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
            >
              <RotateCw />
              刷新数据
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
            >
              <Download />
              导出规划
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab 切换 - 样式与农事任务中心统一 */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tab 头部 */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="mr-1" />
              规划概览
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekly'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="mr-1" />
              按周汇总
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'materials'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShoppingCart className="mr-1" />
              物资需求
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'workers'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="mr-1" />
              人员需求
            </button>
            <button
              onClick={() => setActiveTab('cost')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cost'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="mr-1" />
              成本预估
            </button>
          </nav>
        </div>

        {/* Tab 内容 */}
        <div className="p-4">
          {/* 规划概览 Tab */}
          {activeTab === 'overview' && monthlyPlan && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">任务类型分布</h3>
              <div className="grid grid-cols-4 gap-4">
                {taskTypeSummary.slice(0, 4).map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.taskTypeName}</span>
                      <span className="text-lg font-bold text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(index)} rounded-full`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.percentage}%</div>
                  </div>
                ))}
              </div>

              {/* 本周重点任务 */}
              {monthlyPlan.weeklySummaries.length > 0 && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    第 {monthlyPlan.weeklySummaries[0].weekNumber} 周重点任务
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {monthlyPlan.weeklySummaries[0].keyTasks.map((task, index) => (
                      <Badge key={index} variant="info">{task}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 生成信息 */}
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">生成信息</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>生成时间：{dayjs(monthlyPlan.generatedAt).format('YYYY-MM-DD HH:mm:ss')}</p>
                  <p>生成方式：{monthlyPlan.generatedBy}</p>
                </div>
              </div>
            </div>
          )}

          {/* 按周汇总 Tab */}
          {activeTab === 'weekly' && monthlyPlan && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">按周汇总</h3>
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <WeeklySummaryTable data={monthlyPlan.weeklySummaries} />
              </div>
            </div>
          )}

          {/* 物资需求 Tab */}
          {activeTab === 'materials' && monthlyPlan && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">物资需求计划</h3>
              <p className="text-sm text-gray-500 mb-4">基于月度任务规划，预测所需的物资消耗</p>
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <MaterialTableWithSummary data={monthlyPlan.materialRequirements} />
              </div>
            </div>
          )}

          {/* 人员需求 Tab */}
          {activeTab === 'workers' && monthlyPlan && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">人员需求计划</h3>
              <p className="text-sm text-gray-500 mb-4">基于月度任务规划，预测所需的人员配置</p>
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <WorkerTable data={monthlyPlan.workerRequirements} />
              </div>
            </div>
          )}

          {/* 成本预估 Tab */}
          {activeTab === 'cost' && monthlyPlan && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">成本预估</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">物资成本</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ¥{monthlyPlan.costBreakdown.materialCost.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">工具成本</div>
                  <div className="text-2xl font-bold text-purple-600">
                    ¥{monthlyPlan.costBreakdown.toolCost.toFixed(2)}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500 mb-1">人工成本</div>
                  <div className="text-2xl font-bold text-cyan-600">
                    ¥{monthlyPlan.costBreakdown.laborCost.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* 总成本 */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100 p-4">
                <div className="text-sm text-red-600 mb-1">总成本</div>
                <div className="text-3xl font-bold text-red-600">
                  ¥{monthlyPlan.costBreakdown.total.toFixed(2)}
                </div>
              </div>

              {/* 成本构成 */}
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">成本构成</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-600">物资成本</div>
                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${monthlyPlan.costBreakdown.total > 0
                            ? Math.round((monthlyPlan.costBreakdown.materialCost / monthlyPlan.costBreakdown.total) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                    <div className="w-16 text-sm text-gray-600">
                      {monthlyPlan.costBreakdown.total > 0
                        ? Math.round((monthlyPlan.costBreakdown.materialCost / monthlyPlan.costBreakdown.total) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-600">工具成本</div>
                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${monthlyPlan.costBreakdown.total > 0
                            ? Math.round((monthlyPlan.costBreakdown.toolCost / monthlyPlan.costBreakdown.total) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                    <div className="w-16 text-sm text-gray-600">
                      {monthlyPlan.costBreakdown.total > 0
                        ? Math.round((monthlyPlan.costBreakdown.toolCost / monthlyPlan.costBreakdown.total) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-600">人工成本</div>
                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${monthlyPlan.costBreakdown.total > 0
                            ? Math.round((monthlyPlan.costBreakdown.laborCost / monthlyPlan.costBreakdown.total) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                    <div className="w-16 text-sm text-gray-600">
                      {monthlyPlan.costBreakdown.total > 0
                        ? Math.round((monthlyPlan.costBreakdown.laborCost / monthlyPlan.costBreakdown.total) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
