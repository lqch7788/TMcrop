/**
 * 每日规划页面
 * 显示每日工单汇总报告和当日派工计划
 * 样式与农事任务中心统一
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle, Clock, AlertTriangle,
  Bot, AlertCircle, RotateCw, Send, ArrowLeft,
  ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
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

  // 计算当前页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  // 状态映射
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
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="rounded-lg overflow-hidden border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">任务名称</TableHead>
              <TableHead className="w-[120px]">计划日期</TableHead>
              <TableHead className="w-[120px]">实际完成</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[100px]">延迟天数</TableHead>
              <TableHead className="w-[100px]">执行人</TableHead>
              <TableHead>延迟原因</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => {
              const statusConfig = getStatusConfig(item.progressStatus);
              return (
                <TableRow key={item.taskId}>
                  <TableCell className="font-medium truncate">{item.taskName}</TableCell>
                  <TableCell>{item.plannedDate}</TableCell>
                  <TableCell>{item.actualCompletionDate || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.variant}>{statusConfig.text}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.delayDays ? (
                      <span className="text-red-500 font-medium">{item.delayDays}天</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{item.actualAssignee}</TableCell>
                  <TableCell className="truncate">{item.delayReason || '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
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

  // 状态映射
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
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">人员负荷分析</h3>
      <p className="text-sm text-gray-500 mb-4">各执行人员当前的工作负荷情况</p>
      <div className="rounded-lg overflow-hidden border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">员工姓名</TableHead>
              <TableHead className="w-[100px]">今日任务数</TableHead>
              <TableHead className="w-[80px]">已完成</TableHead>
              <TableHead className="w-[120px]">完成率</TableHead>
              <TableHead className="w-[100px]">负荷状态</TableHead>
              <TableHead className="w-[100px]">可用性</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => {
              const loadStatusConfig = getLoadStatusConfig(item.loadStatus);
              const availConfig = getAvailabilityConfig(item.availability);
              return (
                <TableRow key={item.workerId}>
                  <TableCell className="font-medium">{item.workerName}</TableCell>
                  <TableCell className="font-semibold">{item.todayTasks}</TableCell>
                  <TableCell>{item.completedTasks} / {item.todayTasks}</TableCell>
                  <TableCell>
                    <Progress value={item.completionRate} size="sm" />
                  </TableCell>
                  <TableCell>
                    <Badge variant={loadStatusConfig.variant}>{loadStatusConfig.text}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={availConfig.variant}>{availConfig.text}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
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
              任务概览
            </button>
            <button
              onClick={() => setActiveTab('ahead')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'ahead'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckCircle className="mr-1" />
              提前完成 ({report?.aheadTasks.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('delayed')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'delayed'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertTriangle className="mr-1" />
              已推迟 ({report?.delayedTasks.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('unfinished')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unfinished'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <AlertCircle className="mr-1" />
              未完成 ({report?.unfinishedTasks.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'workers'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="mr-1" />
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
