/**
 * 每日工单汇总报告组件
 * 展示每日任务进度分析、人员负荷分析和AI建议
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  List,
  Typography,
  Space,
  Progress,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type {
  DailyWorkOrderReport as DailyWorkOrderReportType,
  TaskProgressAnalysis,
  WorkerLoadAnalysis,
} from '../../types/planning';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title, Paragraph } = Typography;

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
// 任务进度分析表格列定义
// ============================================
const getTaskProgressColumns = (
  onTaskClick?: (task: TaskProgressAnalysis) => void
): ColumnsType<TaskProgressAnalysis> => [
  {
    title: '任务名称',
    dataIndex: 'taskName',
    key: 'taskName',
    width: 200,
    ellipsis: true,
    render: (name: string, record: TaskProgressAnalysis) => (
      <Text
        style={{ cursor: onTaskClick ? 'pointer' : 'default' }}
        onClick={() => onTaskClick?.(record)}
      >
        {name}
      </Text>
    ),
  },
  {
    title: '计划日期',
    dataIndex: 'plannedDate',
    key: 'plannedDate',
    width: 120,
  },
  {
    title: '实际完成',
    dataIndex: 'actualCompletionDate',
    key: 'actualCompletionDate',
    width: 120,
    render: (date: string) => date || '-',
  },
  {
    title: '状态',
    dataIndex: 'progressStatus',
    key: 'progressStatus',
    width: 100,
    render: (status: string) => {
      const statusMap: Record<string, { color: string; text: string }> = {
        ahead: { color: 'success', text: '提前完成' },
        on_track: { color: 'processing', text: '正常' },
        delayed: { color: 'warning', text: '已推迟' },
        cancelled: { color: 'default', text: '已取消' },
      };
      const config = statusMap[status] || { color: 'default', text: status };
      return <Tag color={config.color}>{config.text}</Tag>;
    },
  },
  {
    title: '延迟天数',
    dataIndex: 'delayDays',
    key: 'delayDays',
    width: 100,
    render: (days: number) => (days ? <Text type="danger">{days}天</Text> : '-'),
  },
  {
    title: '执行人',
    dataIndex: 'actualAssignee',
    key: 'actualAssignee',
    width: 100,
  },
];

// ============================================
// 人员负荷分析表格列定义
// ============================================
const getWorkerLoadColumns = (
  onWorkerClick?: (worker: WorkerLoadAnalysis) => void
): ColumnsType<WorkerLoadAnalysis> => [
  {
    title: '员工姓名',
    dataIndex: 'workerName',
    key: 'workerName',
    width: 120,
    render: (name: string, record: WorkerLoadAnalysis) => (
      <Text
        style={{ cursor: onWorkerClick ? 'pointer' : 'default' }}
        onClick={() => onWorkerClick?.(record)}
      >
        {name}
      </Text>
    ),
  },
  {
    title: '今日任务数',
    dataIndex: 'todayTasks',
    key: 'todayTasks',
    width: 100,
    render: (count: number) => <Text strong>{count}</Text>,
  },
  {
    title: '已完成',
    dataIndex: 'completedTasks',
    key: 'completedTasks',
    width: 80,
    render: (count: number, record: WorkerLoadAnalysis) => (
      <span>
        {count} / {record.todayTasks}
      </span>
    ),
  },
  {
    title: '完成率',
    dataIndex: 'completionRate',
    key: 'completionRate',
    width: 120,
    render: (rate: number) => <Progress percent={rate} size="small" />,
  },
  {
    title: '负荷状态',
    dataIndex: 'loadStatus',
    key: 'loadStatus',
    width: 100,
    render: (status: string) => {
      const statusMap: Record<string, { color: string; text: string }> = {
        normal: { color: 'success', text: '正常' },
        busy: { color: 'warning', text: '较忙' },
        overloaded: { color: 'danger', text: '过载' },
      };
      const config = statusMap[status] || { color: 'default', text: status };
      return <Tag color={config.color}>{config.text}</Tag>;
    },
  },
  {
    title: '可用性',
    dataIndex: 'availability',
    key: 'availability',
    width: 100,
    render: (avail: string) => {
      const availMap: Record<string, { color: string; text: string }> = {
        available: { color: 'success', text: '空闲' },
        busy: { color: 'warning', text: '工作中' },
      };
      const config = availMap[avail] || { color: 'default', text: avail };
      return <Tag color={config.color}>{config.text}</Tag>;
    },
  },
];

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
      icon: <ClockCircleOutlined />,
      color: '#1890ff',
    },
    {
      title: '待处理',
      value: report.pendingTasks,
      icon: <ClockCircleOutlined />,
      color: '#fa8c16',
    },
    {
      title: '进行中',
      value: report.inProgressTasks,
      icon: <ClockCircleOutlined />,
      color: '#1890ff',
    },
    {
      title: '已完成',
      value: report.completedTasks,
      icon: <CheckCircleOutlined />,
      color: '#52c41a',
    },
    {
      title: '已超期',
      value: report.overdueTasks,
      icon: <ExclamationCircleOutlined />,
      color: '#ff4d4f',
    },
  ];

  return (
    <div className="daily-work-order-report">
      {/* 报告标题 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4}>
          <ClockCircleOutlined /> 每日工单汇总报告 - {report.date}
        </Title>
        <Paragraph type="secondary">
          统计日期：{report.date}，共 {report.totalTasks} 项任务
        </Paragraph>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {statsData.map((stat, index) => (
          <Col span={4} key={index}>
            <Card size="small">
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* AI 建议 */}
      {report.aiRecommendations.length > 0 && (
        <Alert
          message="AI 智能分析建议"
          description={
            <List
              size="small"
              dataSource={report.aiRecommendations}
              renderItem={(item, index) => (
                <List.Item key={index}>
                  <Text>{item}</Text>
                </List.Item>
              )}
            />
          }
          type="info"
          showIcon
          icon={<RobotOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 进度概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small" title="完成进度">
            <Progress
              percent={
                report.totalTasks > 0
                  ? Math.round((report.completedTasks / report.totalTasks) * 100)
                  : 0
              }
              strokeColor="#52c41a"
            />
            <Text type="secondary">
              {report.completedTasks} / {report.totalTasks} 项任务已完成
            </Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="超期情况">
            {report.overdueTasks > 0 ? (
              <Alert
                message={`${report.overdueTasks} 项任务已超期，需要及时处理`}
                type="warning"
                showIcon
              />
            ) : (
              <Text type="success">暂无超期任务</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* 任务进度分析 */}
      <Card
        size="small"
        title="任务进度分析"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <Space>
              <Text type="secondary">提前 {report.aheadTasks.length} 项</Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">正常 {report.onTrackTasks.length} 项</Text>
              <Text type="secondary">|</Text>
              <Text type="danger">推迟 {report.delayedTasks.length} 项</Text>
            </Space>
          )
        }
      >
        <Table
          columns={getTaskProgressColumns(onTaskClick)}
          dataSource={report.onTrackTasks.concat(report.delayedTasks)}
          rowKey="taskId"
          size="small"
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {/* 人员负荷分析 */}
      <Card size="small" title="人员负荷分析">
        <Table
          columns={getWorkerLoadColumns(onWorkerClick)}
          dataSource={report.workerLoadAnalysis}
          rowKey="workerId"
          size="small"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
}
