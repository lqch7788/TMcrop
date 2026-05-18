/**
 * 每日规划页面
 * 显示每日工单汇总报告和当日派工计划
 * 样式与农事任务中心统一
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle, Clock, AlertTriangle,
  Bot, AlertCircle, RotateCw, Send, ArrowLeft,
  ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Progress } from '@/components/ui';
import { useDailyWorkOrderAnalysis, DailyWorkOrderReport, TaskProgressAnalysis, WorkerLoadAnalysis } from '../hooks/useDailyWorkOrderAnalysis';
import { useDailyTaskPlanning } from '../hooks/useDailyTaskPlanning';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

// ============================================
// 任务进度表格组件
// ============================================
interface TaskProgressTableProps {
  title: string;
  description: string;
  data: TaskProgressAnalysis[];
}

function TaskProgressTable({ title, description, data }: TaskProgressTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'info' | 'warning' | 'secondary'; text: string }> = {
      ahead: { variant: 'success', text: '提前完成' },
      on_track: { variant: 'info', text: '正常' },
      delayed: { variant: 'warning', text: '已推迟' },
      cancelled: { variant: 'secondary', text: '已取消' },
    };
    return statusMap[status] || { variant: 'secondary' as const, text: status };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务名称</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">计划日期</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">实际完成</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">延迟天数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">执行人</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">延迟原因</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((item) => {
              const statusConfig = getStatusConfig(item.progressStatus);
              return (
                <tr key={item.taskId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.taskName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.plannedDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.actualCompletionDate || '-'}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Badge variant={statusConfig.variant}>{statusConfig.text}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {item.delayDays ? (
                      <span className="text-red-500 font-medium">{item.delayDays}天</span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.actualAssignee}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[150px]">{item.delayReason || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <span className="text-sm text-gray-500">共 {data.length} 条</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 人员负荷表格组件
// ============================================
interface WorkerLoadTableProps {
  data: WorkerLoadAnalysis[];
}

function WorkerLoadTable({ data }: WorkerLoadTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  const getLoadStatusConfig = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; text: string }> = {
      normal: { variant: 'success', text: '正常' },
      busy: { variant: 'warning', text: '较忙' },
      overloaded: { variant: 'destructive', text: '过载' },
    };
    return statusMap[status] || { variant: 'secondary' as const, text: status };
  };

  const getAvailabilityConfig = (avail: string) => {
    const availMap: Record<string, { variant: 'success' | 'warning' | 'secondary'; text: string }> = {
      available: { variant: 'success', text: '空闲' },
      busy: { variant: 'warning', text: '工作中' },
    };
    return availMap[avail] || { variant: 'secondary' as const, text: avail };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">人员负荷分析</h3>
        <p className="text-sm text-gray-500 mt-0.5">各执行人员当前的工作负荷情况</p>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">员工姓名</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">今日任务数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">已完成</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">完成率</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">负荷状态</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">可用性</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((item) => {
              const loadStatusConfig = getLoadStatusConfig(item.loadStatus);
              const availConfig = getAvailabilityConfig(item.availability);
              return (
                <tr key={item.workerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center whitespace-nowrap">{item.workerName}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center whitespace-nowrap">{item.todayTasks}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-center whitespace-nowrap">{item.completedTasks} / {item.todayTasks}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Progress value={item.completionRate} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Badge variant={loadStatusConfig.variant}>{loadStatusConfig.text}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Badge variant={availConfig.variant}>{availConfig.text}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <span className="text-sm text-gray-500">共 {data.length} 条</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主组件
// ============================================
export default function DailyPlanningPage() {
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [report, setReport] = useState<DailyWorkOrderReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ahead' | 'delayed' | 'unfinished' | 'workers'>('overview');

  const { generateDailyReport } = useDailyWorkOrderAnalysis();
  const { getTodayPlan, confirmAndDispatch } = useDailyTaskPlanning();

  useEffect(() => {
    const dailyReport = generateDailyReport(selectedDate);
    setReport(dailyReport);
  }, [selectedDate, generateDailyReport]);

  const todayPlan = useMemo(() => getTodayPlan(), [getTodayPlan]);

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date.format('YYYY-MM-DD'));
    }
  };

  const handleConfirmDispatch = async () => {
    const result = await confirmAndDispatch(todayPlan);
    if (result.success) {
      alert(`成功派发 ${result.dispatchedTasks} 个任务！`);
    }
  };

  const handleRefresh = () => {
    const dailyReport = generateDailyReport(selectedDate);
    setReport(dailyReport);
  };

  const statsData = report
    ? [
        { label: '总任务数', value: report.totalTasks, icon: '📋', bgColor: 'bg-blue-500' },
        { label: '待处理', value: report.pendingTasks, icon: '⏳', bgColor: 'bg-orange-500' },
        { label: '进行中', value: report.inProgressTasks, icon: '🔄', bgColor: 'bg-blue-500' },
        { label: '已完成', value: report.completedTasks, icon: '✅', bgColor: 'bg-green-500' },
        { label: '已超期', value: report.overdueTasks, icon: '⚠️', bgColor: 'bg-red-500' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3">
          <a
            href="/farm-hub"
            className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors"
            title="返回农事任务中心"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </a>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">每日工单汇总与规划</h1>
            <p className="text-xs text-gray-500">每日任务进度分析、人员负荷情况以及AI派工建议</p>
          </div>
        </div>
      </div>

      {/* 日期选择和操作按钮 */}
      <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">选择日期:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(dayjs(e.target.value))}
                className="px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
            >
              <RotateCw />
              刷新数据
            </button>
          </div>
          <button
            onClick={handleConfirmDispatch}
            disabled={!todayPlan.tasks.length}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send />
            一键确认派发 ({todayPlan.totalTasks} 项)
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-5 gap-4">
        {statsData.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center text-white text-lg`}>
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

      {/* AI 建议 */}
      {report && report.aiRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900">AI 智能分析建议</span>
          </div>
          <div className="space-y-2">
            {report.aiRecommendations.map((item, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-purple-500">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tab 头部 */}
        <div className="border-b border-gray-200 px-4 py-3">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              任务概览
            </button>
            <button
              onClick={() => setActiveTab('ahead')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'ahead'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              提前完成 ({report?.aheadTasks.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('delayed')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'delayed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              已推迟 ({report?.delayedTasks.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('unfinished')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'unfinished'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              未完成 ({report?.unfinishedTasks.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'workers'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              人员负荷 ({report?.workerLoadAnalysis.length || 0})
            </button>
          </nav>
        </div>

        {/* Tab 内容 */}
        <div className="p-4">
          {/* 任务概览 Tab */}
          {activeTab === 'overview' && report && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">今日任务进度概览</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-emerald-700 font-medium">完成任务</span>
                    <span className="text-2xl font-bold text-emerald-600">{report.completedTasks}</span>
                  </div>
                  <Progress
                    value={report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0}
                    strokeColor="#10b981"
                  />
                  <div className="text-xs text-emerald-600 mt-1">共 {report.totalTasks} 个任务</div>
                </div>
                <div className={`rounded-lg p-4 border ${report.overdueTasks > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${report.overdueTasks > 0 ? 'text-red-700' : 'text-gray-700'}`}>超期任务</span>
                    <span className={`text-2xl font-bold ${report.overdueTasks > 0 ? 'text-red-600' : 'text-gray-600'}`}>{report.overdueTasks}</span>
                  </div>
                  {report.overdueTasks > 0 && (
                    <div className="text-xs text-red-600">需要及时处理</div>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900">AI 派工建议</h3>
              {todayPlan.tasks.length > 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-100">
                  {todayPlan.tasks.slice(0, 5).map((task, index) => {
                    const suggestion = todayPlan.workerSuggestions?.find(s => s.taskId === task.id);
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'success'}>
                          {task.priority === 'high' ? '紧急' : task.priority === 'medium' ? '重要' : '普通'}
                        </Badge>
                        <span className="font-medium text-gray-900">{task.taskTypeName}</span>
                        <span className="text-sm text-gray-500">- {task.greenhouseName}</span>
                        {suggestion && (
                          <>
                            <Badge variant="info">推荐: {suggestion.workerName}</Badge>
                            <span className="text-xs text-gray-400">置信度 {suggestion.confidenceScore}%</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">今日暂无待派发任务</div>
              )}
            </div>
          )}

          {/* 提前完成 Tab */}
          {activeTab === 'ahead' && (
            <TaskProgressTable
              title="提前完成任务"
              description="以下任务在实际完成时间之前完成"
              data={report?.aheadTasks || []}
            />
          )}

          {/* 已推迟 Tab */}
          {activeTab === 'delayed' && (
            <TaskProgressTable
              title="已推迟任务"
              description="以下任务未能按计划时间完成"
              data={report?.delayedTasks || []}
            />
          )}

          {/* 未完成 Tab */}
          {activeTab === 'unfinished' && (
            <TaskProgressTable
              title="未完成任务"
              description="截止日期已到但尚未完成的任务"
              data={report?.unfinishedTasks || []}
            />
          )}

          {/* 人员负荷 Tab */}
          {activeTab === 'workers' && (
            <WorkerLoadTable data={report?.workerLoadAnalysis || []} />
          )}
        </div>
      </div>
    </div>
  );
}
