/**
 * 每日工单汇总报告组件
 * 展示每日任务进度分析、人员负荷分析和AI建议
 */

import React, { useState, useMemo } from 'react';
import { Card, Statistic, Alert, Progress } from '@/components/ui';
import { Space } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Bot,
  Users,
} from 'lucide-react';
import type {
  DailyWorkOrderReport as DailyWorkOrderReportType,
  TaskProgressAnalysis,
  WorkerLoadAnalysis,
} from '../../types/planning';


// ============================================
// 类型定义
// ============================================
interface DailyWorkOrderReportProps {
  report: DailyWorkOrderReportType;
  showActions?: boolean;
  onTaskClick?: (task: TaskProgressAnalysis) => void;
  onWorkerClick?: (worker: WorkerLoadAnalysis) => void;
}

// ============================================
// 任务进度表格组件
// ============================================
interface TaskProgressReportTableProps {
  data: TaskProgressAnalysis[];
  onTaskClick?: (task: TaskProgressAnalysis) => void;
}

function TaskProgressReportTable({ data, onTaskClick }: TaskProgressReportTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(data.length / pageSize);

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">任务名称</TableHead>
            <TableHead className="w-[120px]">计划日期</TableHead>
            <TableHead className="w-[120px]">实际完成</TableHead>
            <TableHead className="w-[100px]">状态</TableHead>
            <TableHead className="w-[100px]">延迟天数</TableHead>
            <TableHead className="w-[100px]">执行人</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((item) => {
            const statusConfig = getStatusConfig(item.progressStatus);
            return (
              <TableRow key={item.taskId}>
                <TableCell
                  className={onTaskClick ? 'cursor-pointer hover:text-emerald-600' : ''}
                  onClick={() => onTaskClick?.(item)}
                >
                  {item.taskName}
                </TableCell>
                <TableCell>{item.plannedDate}</TableCell>
                <TableCell>{item.actualCompletionDate || '-'}</TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant}>{statusConfig.text}</Badge>
                </TableCell>
                <TableCell>
                  {item.delayDays ? (
                    <span className="text-red-500">{item.delayDays}天</span>
                  ) : '-'}
                </TableCell>
                <TableCell>{item.actualAssignee}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex justify-end mt-2">
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
interface WorkerLoadReportTableProps {
  data: WorkerLoadAnalysis[];
  onWorkerClick?: (worker: WorkerLoadAnalysis) => void;
}

function WorkerLoadReportTable({ data, onWorkerClick }: WorkerLoadReportTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
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
                <TableCell
                  className={onWorkerClick ? 'cursor-pointer hover:text-emerald-600' : ''}
                  onClick={() => onWorkerClick?.(item)}
                >
                  {item.workerName}
                </TableCell>
                <TableCell className="font-semibold">{item.todayTasks}</TableCell>
                <TableCell>{item.completedTasks} / {item.todayTasks}</TableCell>
                <TableCell>
                  <Progress percent={item.completionRate} size="sm" />
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
      {totalPages > 1 && (
        <div className="flex justify-end mt-2">
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

export default function DailyWorkOrderReportComponent({
  report,
  showActions,
  onTaskClick,
  onWorkerClick,
}: DailyWorkOrderReportProps) {
  // 统计卡片数据
  const statsData = [
    {
      title: '总任务数',
      value: report.totalTasks,
      icon: <Clock />,
      color: '#1890ff',
    },
    {
      title: '待处理',
      value: report.pendingTasks,
      icon: <Clock />,
      color: '#fa8c16',
    },
    {
      title: '进行中',
      value: report.inProgressTasks,
      icon: <Clock />,
      color: '#1890ff',
    },
    {
      title: '已完成',
      value: report.completedTasks,
      icon: <CheckCircle />,
      color: '#52c41a',
    },
    {
      title: '已超期',
      value: report.overdueTasks,
      icon: <AlertCircle />,
      color: '#ff4d4f',
    },
  ];

  return (
    <div className="daily-work-order-report">
      {/* 报告标题 */}
      <div style={{ marginBottom: 16 }}>
        <h4 className="text-lg font-semibold">
          <Clock /> 每日工单汇总报告 - {report.date}
        </h4>
        <p className="text-gray-500">
          统计日期：{report.date}，共 {report.totalTasks} 项任务
        </p>
      </div>

      {/* 统计卡片 - 使用 Tailwind CSS grid 替代 antd Row/Col */}
      <div className="grid grid-cols-5 gap-4" style={{ marginBottom: 16 }}>
        {statsData.map((stat, index) => (
          <Card key={index} size="small">
            <Statistic
              title={stat.title}
              value={stat.value}
              prefix={stat.icon}
              valueStyle={{ color: stat.color }}
            />
          </Card>
        ))}
      </div>

      {/* AI 建议 */}
      {report.aiRecommendations.length > 0 && (
        <Alert
          message="AI 智能分析建议"
          description={
            <div className="space-y-1">
              {report.aiRecommendations.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          }
          type="info"
          showIcon
          icon={<Bot />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 进度概览 */}
      <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
        <Card size="small" title="完成进度">
          <Progress
            percent={
              report.totalTasks > 0
                ? Math.round((report.completedTasks / report.totalTasks) * 100)
                : 0
            }
            strokeColor="#52c41a"
          />
          <span className="text-gray-500">
            {report.completedTasks} / {report.totalTasks} 项任务已完成
          </span>
        </Card>
        <Card size="small" title="超期情况">
          {report.overdueTasks > 0 ? (
            <Alert
              message={`${report.overdueTasks} 项任务已超期，需要及时处理`}
              type="warning"
              showIcon
            />
          ) : (
            <span className="text-green-500">暂无超期任务</span>
          )}
        </Card>
      </div>

      {/* 任务进度分析 */}
      <Card
        size="small"
        title="任务进度分析"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <Space>
              <span className="text-gray-500">提前 {report.aheadTasks.length} 项</span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-500">正常 {report.onTrackTasks.length} 项</span>
              <span className="text-gray-500">|</span>
              <span className="text-red-500">推迟 {report.delayedTasks.length} 项</span>
            </Space>
          )
        }
      >
        <TaskProgressReportTable
          data={report.onTrackTasks.concat(report.delayedTasks)}
          onTaskClick={onTaskClick}
        />
      </Card>

      {/* 人员负荷分析 */}
      <Card size="small" title="人员负荷分析">
        <WorkerLoadReportTable
          data={report.workerLoadAnalysis}
          onWorkerClick={onWorkerClick}
        />
      </Card>
    </div>
  );
}
