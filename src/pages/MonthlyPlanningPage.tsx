/**
 * 月度规划页面
 * 显示月度任务规划、物资需求、人员需求和成本预估
 * 样式与农事任务中心统一
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  TeamOutlined,
  DollarOutlined,
  ReloadOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Badge } from '@/components/ui';
import { Space } from '@/components/ui';
// Table 使用 antd 的，因为 shadcn/ui 的 Table 不支持 dataSource columns 模式
import { Table } from 'antd';
// Typography 和 Progress 不再使用，Typography 使用 Tailwind CSS 替代
import { useMonthlyTaskPlanning, MonthlyPlan, WeeklySummary, MaterialRequirement, WorkerRequirement } from '../hooks/useMonthlyTaskPlanning';
import type { ColumnsType } from 'antd/es/table';
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
// 周汇总表格列定义
// ============================================
const getWeeklySummaryColumns = (): ColumnsType<WeeklySummary> => [
  {
    title: '周次',
    dataIndex: 'weekNumber',
    key: 'weekNumber',
    width: 80,
    render: (week: number) => <span className="font-semibold">第 {week} 周</span>,
  },
  {
    title: '开始日期',
    dataIndex: 'startDate',
    key: 'startDate',
    width: 120,
  },
  {
    title: '结束日期',
    dataIndex: 'endDate',
    key: 'endDate',
    width: 120,
  },
  {
    title: '任务数',
    dataIndex: 'taskCount',
    key: 'taskCount',
    width: 80,
    render: (count: number) => <Badge variant="info">{count}</Badge>,
  },
  {
    title: '总工时',
    dataIndex: 'totalHours',
    key: 'totalHours',
    width: 100,
    render: (hours: number) => `${hours}h`,
  },
  {
    title: '所需人数',
    dataIndex: 'requiredWorkers',
    key: 'requiredWorkers',
    width: 100,
    render: (count: number) => <span>{count} 人</span>,
  },
  {
    title: '重点作物',
    dataIndex: 'keyCrops',
    key: 'keyCrops',
    render: (crops: string[]) => (
      <Space wrap>
        {crops.map(crop => (
          <Badge key={crop} variant="success">{crop}</Badge>
        ))}
      </Space>
    ),
  },
  {
    title: '重点任务',
    dataIndex: 'keyTasks',
    key: 'keyTasks',
    render: (tasks: string[]) => (
      <Space wrap>
        {tasks.map(task => (
          <Badge key={task} variant="secondary">{task}</Badge>
        ))}
      </Space>
    ),
  },
];

// ============================================
// 物资需求表格列定义
// ============================================
const getMaterialColumns = (): ColumnsType<MaterialRequirement> => [
  {
    title: '物资名称',
    dataIndex: 'materialName',
    key: 'materialName',
    width: 120,
  },
  {
    title: '规格',
    dataIndex: 'specification',
    key: 'specification',
    width: 120,
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 100,
    render: (qty: number, record: MaterialRequirement) => (
      <span className="font-semibold">{qty} {record.unit}</span>
    ),
  },
  {
    title: '预估单价',
    dataIndex: 'estimatedUnitPrice',
    key: 'estimatedUnitPrice',
    width: 120,
    render: (price: number) => `¥${price.toFixed(2)}`,
  },
  {
    title: '预估总价',
    dataIndex: 'estimatedTotalPrice',
    key: 'estimatedTotalPrice',
    width: 120,
    render: (price: number) => <span className="font-semibold text-red-500">¥{price.toFixed(2)}</span>,
  },
];

// ============================================
// 人员需求表格列定义
// ============================================
const getWorkerColumns = (): ColumnsType<WorkerRequirement> => [
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    width: 100,
  },
  {
    title: '技能要求',
    dataIndex: 'skill',
    key: 'skill',
    width: 120,
  },
  {
    title: '需求人数',
    dataIndex: 'requiredCount',
    key: 'requiredCount',
    width: 100,
    render: (count: number) => <Badge variant="info">{count} 人</Badge>,
  },
  {
    title: '预估工时',
    dataIndex: 'estimatedHours',
    key: 'estimatedHours',
    width: 100,
    render: (hours: number) => `${hours}h`,
  },
];

// ============================================
// 主组件
// ============================================
export default function MonthlyPlanningPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'materials' | 'workers' | 'cost'>('overview');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  const { generateMonthlyPlan } = useMonthlyTaskPlanning();

  // 获取批次列表
  const batches = useMemo(() => {
    try {
      const stored = localStorage.getItem('yuanxingtu_batches');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : (parsed.data || []);
      }
    } catch (e) {
      console.warn('读取批次数据失败:', e);
    }
    return [];
  }, []);

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
            <ArrowLeftOutlined />
            <span>返回</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <CalendarOutlined className="w-5 h-5 text-white" />
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
              <ReloadOutlined />
              刷新数据
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
            >
              <ExportOutlined />
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
              <FileTextOutlined className="mr-1" />
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
              <CalendarOutlined className="mr-1" />
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
              <ShoppingOutlined className="mr-1" />
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
              <TeamOutlined className="mr-1" />
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
              <DollarOutlined className="mr-1" />
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
                <Table
                  columns={getWeeklySummaryColumns()}
                  dataSource={monthlyPlan.weeklySummaries}
                  rowKey="weekNumber"
                  size="small"
                  pagination={false}
                />
              </div>
            </div>
          )}

          {/* 物资需求 Tab */}
          {activeTab === 'materials' && monthlyPlan && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">物资需求计划</h3>
              <p className="text-sm text-gray-500 mb-4">基于月度任务规划，预测所需的物资消耗</p>
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <Table
                  columns={getMaterialColumns()}
                  dataSource={monthlyPlan.materialRequirements}
                  rowKey="materialName"
                  size="small"
                  pagination={false}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={4}>
                          <span className="font-semibold">合计</span>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <span className="font-semibold text-red-500">
                            ¥{monthlyPlan.materialRequirements.reduce((sum, m) => sum + m.estimatedTotalPrice, 0).toFixed(2)}
                          </span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </div>
            </div>
          )}

          {/* 人员需求 Tab */}
          {activeTab === 'workers' && monthlyPlan && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">人员需求计划</h3>
              <p className="text-sm text-gray-500 mb-4">基于月度任务规划，预测所需的人员配置</p>
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <Table
                  columns={getWorkerColumns()}
                  dataSource={monthlyPlan.workerRequirements}
                  rowKey="skill"
                  size="small"
                  pagination={false}
                />
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
