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
  ChevronLeft,
  Timer,
  Banknote,
  ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { Pagination } from '@/components/ui/Pagination';
import { useMonthlyTaskPlanning, MonthlyPlan, WeeklySummary, MaterialRequirement, WorkerRequirement } from '../hooks/useMonthlyTaskPlanning';
import { useProductionPlanStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">按周汇总</h3>
        <p className="text-sm text-gray-500 mt-0.5">共 {data.length} 周数据</p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">周次</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">开始日期</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">结束日期</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">总工时</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">所需人数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">重点作物</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">重点任务</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((item) => (
              <tr key={item.weekNumber} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center whitespace-nowrap">第 {item.weekNumber} 周</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.startDate}</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.endDate}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap"><Badge variant="info">{item.taskCount}</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.totalHours}h</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.requiredWorkers} 人</td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {item.keyCrops.map(crop => (
                      <Badge key={crop} variant="success">{crop}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {item.keyTasks.map(task => (
                      <Badge key={task} variant="secondary">{task}</Badge>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// 物资需求表格组件（带合计行）
// ============================================
function MaterialTableWithSummary({ data }: { data: MaterialRequirement[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  const totalPrice = useMemo(() => {
    return data.reduce((sum, m) => sum + m.estimatedTotalPrice, 0);
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">物资需求计划</h3>
        <p className="text-sm text-gray-500 mt-0.5">基于月度任务规划，预测所需的物资消耗</p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">物资名称</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">规格</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">数量</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">预估单价</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">预估总价</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{item.materialName}</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.specification}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center whitespace-nowrap">{item.quantity} {item.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">¥{item.estimatedUnitPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-red-500 text-center whitespace-nowrap">¥{item.estimatedTotalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          {/* 合计行 */}
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-400">
              <td className="px-4 py-3 text-center"></td>
              <td className="px-4 py-3 text-center"></td>
              <td className="px-4 py-3 text-center"></td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center whitespace-nowrap">合计</td>
              <td className="px-4 py-3 text-sm font-bold text-red-500 text-center whitespace-nowrap">¥{totalPrice.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 分页 */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// 人员需求表格组件
// ============================================
function WorkerTable({ data }: { data: WorkerRequirement[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">人员需求计划</h3>
        <p className="text-sm text-gray-500 mt-0.5">基于月度任务规划，预测所需的人员配置</p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">角色</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">技能要求</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">需求人数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">预估工时</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center whitespace-nowrap">{item.role}</td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.skill}</td>
                <td className="px-4 py-3 text-center whitespace-nowrap"><Badge variant="info">{item.requiredCount} 人</Badge></td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.estimatedHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            pageSizeOptions={[10, 20, 50]}
            showPageSize
          />
        </div>
      )}
    </div>
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
  const { batches: storeBatches, fetchPlans } = useProductionPlanStore();

  // 挂载时从API加载批次数据
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 从 Zustand Store 获取批次列表
  const batches = storeBatches;

  // 可选批次列表（仅进行中和已发布）
  const availableBatches = useMemo(() => {
    return batches.filter(
      (b: any) => b.batchStatus === 'in_progress' || b.batchStatus === 'published'
    );
  }, [batches]);

  // 批次选择表格分页
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(5);
  const batchTotalPages = Math.ceil(availableBatches.length / batchPageSize) || 1;
  const paginatedBatches = availableBatches.slice(
    (batchPage - 1) * batchPageSize,
    batchPage * batchPageSize
  );

  // 批次状态中文映射
  const batchStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: '草稿', pending: '待审核', published: '已发布',
      in_progress: '进行中', completed: '已完成', cancelled: '已取消',
    };
    return map[status] || status;
  };

  // 生成月度计划（带错误边界）
  useEffect(() => {
    try {
      const plan = generateMonthlyPlan(selectedMonth, selectedBatches);
      setMonthlyPlan(plan);
    } catch (error) {
      // logger.error('生成月度计划失败:', error);
      showAlert('生成月度计划失败，请重试');
      setMonthlyPlan(null);
    }
  }, [selectedMonth, selectedBatches, generateMonthlyPlan]);

  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedMonth(date.format('YYYY-MM'));
    }
  };

  const handleBatchChange = (values: string[]): void => {
    setSelectedBatches(values);
  };

  const handleRefresh = () => {
    const plan = generateMonthlyPlan(selectedMonth, selectedBatches);
    setMonthlyPlan(plan);
  };

  const handleExport = () => {
    showAlert('导出功能开发中...');
  };

  const statsData = monthlyPlan
    ? [
        { label: '总任务数', value: monthlyPlan.totalTasks, icon: ClipboardList, bgColor: 'bg-blue-50 border border-blue-200', iconColor: 'text-blue-500' },
        { label: '预估工时', value: `${monthlyPlan.totalHours}h`, icon: Timer, bgColor: 'bg-purple-50 border border-purple-200', iconColor: 'text-purple-500' },
        { label: '所需人员', value: Math.round(monthlyPlan.totalHours / 8), icon: Users, bgColor: 'bg-cyan-50 border border-cyan-200', iconColor: 'text-cyan-500' },
        { label: '预估成本', value: `¥${monthlyPlan.totalCost.toFixed(0)}`, icon: Banknote, bgColor: 'bg-orange-50 border border-orange-200', iconColor: 'text-orange-500' },
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
    <div className="space-y-4">
      {/* Page Header - 紧凑型标题卡片 */}
      <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">月度任务规划</h1>
            <p className="text-sm text-gray-500">未来一个月任务规划与物资需求</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 淡彩底 */}
      <div className="grid grid-cols-4 gap-4">
        {statsData.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg px-3 py-2.5`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                  <IconComponent className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 日期选择和操作按钮 */}
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

      {/* 生产批次选择表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">生产批次选择</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              勾选要纳入月度规划的批次（仅显示进行中/已发布），已选 {selectedBatches.length} / {availableBatches.length} 个批次
            </p>
          </div>
          {selectedBatches.length > 0 && (
            <button
              onClick={() => setSelectedBatches([])}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              清除选择
            </button>
          )}
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <th className="px-3 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={paginatedBatches.length > 0 && paginatedBatches.every((b: any) => selectedBatches.includes(b.id))}
                    onChange={() => {
                      const pageIds = paginatedBatches.map((b: any) => b.id);
                      const allPageSelected = paginatedBatches.every((b: any) => selectedBatches.includes(b.id));
                      if (allPageSelected) {
                        setSelectedBatches(prev => prev.filter(id => !pageIds.includes(id)));
                      } else {
                        setSelectedBatches(prev => [...new Set([...prev, ...pageIds])]);
                      }
                    }}
                    className="w-4 h-4 rounded border-white/30 bg-white/20"
                  />
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">批次编号</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">作物名称</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">品种</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">位置</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">面积(亩)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">生长阶段</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">开始日期</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">预计采收</th>
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">暂无进行中或已发布的生产批次</td>
                </tr>
              ) : (
                paginatedBatches.map((batch: any) => {
                  const isSelected = selectedBatches.includes(batch.id);
                  return (
                    <tr
                      key={batch.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedBatches(prev => prev.filter(id => id !== batch.id));
                        } else {
                          setSelectedBatches(prev => [...prev, batch.id]);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedBatches(prev => prev.filter(id => id !== batch.id));
                            } else {
                              setSelectedBatches(prev => [...prev, batch.id]);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-400 text-emerald-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center whitespace-nowrap">
                        {batch.batchCode || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap">
                        {batch.cropName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                        {batch.variety || batch.cropType || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                        {batch.greenhouseName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                        {batch.plantingArea ? `${batch.plantingArea} 亩` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {batch.stageName || batch.stage || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                        {batch.startDate || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">
                        {batch.expectedHarvestDate || '-'}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          batch.batchStatus === 'in_progress'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {batchStatusLabel(batch.batchStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">共 {availableBatches.length} 条</span>
          <Pagination
            currentPage={batchPage}
            totalPages={batchTotalPages}
            onPageChange={setBatchPage}
            pageSize={batchPageSize}
            onPageSizeChange={(size) => { setBatchPageSize(size); setBatchPage(1); }}
            pageSizeOptions={[5, 10, 20]}
            showPageSize
          />
        </div>
      </div>

      {/* Tab 切换 - 样式与农事任务中心统一 */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tab 头部 - 绿色药丸按钮 */}
        <div className="border-b border-gray-200 px-4 py-3">
          <nav className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              规划概览
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              按周汇总
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'materials'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              物资需求
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'workers'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              人员需求
            </button>
            <button
              onClick={() => setActiveTab('cost')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'cost'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="w-4 h-4" />
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
            <WeeklySummaryTable data={monthlyPlan.weeklySummaries} />
          )}

          {/* 物资需求 Tab */}
          {activeTab === 'materials' && monthlyPlan && (
            <MaterialTableWithSummary data={monthlyPlan.materialRequirements} />
          )}

          {/* 人员需求 Tab */}
          {activeTab === 'workers' && monthlyPlan && (
            <WorkerTable data={monthlyPlan.workerRequirements} />
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
