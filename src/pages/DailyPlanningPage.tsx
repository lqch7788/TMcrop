/**
 * 每日规划页面
 * 显示每日工单汇总报告和当日派工计划
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Button, Select, DatePicker, Statistic, Row, Col, Alert, List, Progress, Space, Typography } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useDailyWorkOrderAnalysis, DailyWorkOrderReport, TaskProgressAnalysis, WorkerLoadAnalysis } from '../hooks/useDailyWorkOrderAnalysis';
import { useDailyTaskPlanning } from '../hooks/useDailyTaskPlanning';
import type { ColumnsType } from 'antd/es/table';

// 导入中文语言包
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// ============================================
// 任务进度分析表格列定义
// ============================================
const getTaskProgressColumns = (): ColumnsType<TaskProgressAnalysis> => [
  {
    title: '任务名称',
    dataIndex: 'taskName',
    key: 'taskName',
    width: 200,
    ellipsis: true,
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
  {
    title: '延迟原因',
    dataIndex: 'delayReason',
    key: 'delayReason',
    ellipsis: true,
  },
];

// ============================================
// 人员负荷分析表格列定义
// ============================================
const getWorkerLoadColumns = (): ColumnsType<WorkerLoadAnalysis> => [
  {
    title: '员工姓名',
    dataIndex: 'workerName',
    key: 'workerName',
    width: 120,
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

export default function DailyPlanningPage() {
  // 状态
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [report, setReport] = useState<DailyWorkOrderReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ahead' | 'delayed' | 'unfinished' | 'workers'>('overview');

  // Hooks
  const { generateDailyReport } = useDailyWorkOrderAnalysis();
  const { getTodayPlan, getWorkerLoadAnalysis, confirmAndDispatch } = useDailyTaskPlanning();

  // 生成报告
  useEffect(() => {
    const dailyReport = generateDailyReport(selectedDate);
    setReport(dailyReport);
  }, [selectedDate, generateDailyReport]);

  // 获取今日计划
  const todayPlan = useMemo(() => getTodayPlan(), [getTodayPlan]);

  // 处理日期变化
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date.format('YYYY-MM-DD'));
    }
  };

  // 处理确认派发
  const handleConfirmDispatch = async () => {
    const result = await confirmAndDispatch(todayPlan);
    if (result.success) {
      alert(`成功派发 ${result.dispatchedTasks} 个任务！`);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    const dailyReport = generateDailyReport(selectedDate);
    setReport(dailyReport);
  };

  // 统计卡片数据
  const statsData = report
    ? [
        { title: '总任务数', value: report.totalTasks, color: 'blue' },
        { title: '待处理', value: report.pendingTasks, color: 'orange' },
        { title: '进行中', value: report.inProgressTasks, color: 'processing' },
        { title: '已完成', value: report.completedTasks, color: 'success' },
        { title: '已超期', value: report.overdueTasks, color: 'error' },
      ]
    : [];

  return (
    <div className="daily-planning-page" style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>
          <CalendarOutlined /> 每日工单汇总与规划
        </Title>
        <Paragraph type="secondary">
          查看每日任务进度分析、人员负荷情况以及AI派工建议
        </Paragraph>
      </div>

      {/* 日期选择和操作按钮 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={handleDateChange}
            format="YYYY-MM-DD"
            placeholder="选择日期"
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新数据
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleConfirmDispatch}
            disabled={!todayPlan.tasks.length}
          >
            一键确认派发 ({todayPlan.totalTasks} 项)
          </Button>
        </Space>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {statsData.map((stat, index) => (
          <Col span={4} key={index}>
            <Card size="small">
              <Statistic
                title={stat.title}
                value={stat.value}
                valueStyle={{ color: `var(--ant-color-${stat.color})` }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* AI 建议 */}
      {report && report.aiRecommendations.length > 0 && (
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

      {/* Tab 切换 */}
      <Card>
        {/* Tab 切换按钮 */}
        <Space size="middle" style={{ marginBottom: 16 }}>
          <Button
            type={activeTab === 'overview' ? 'primary' : 'default'}
            onClick={() => setActiveTab('overview')}
          >
            任务概览
          </Button>
          <Button
            type={activeTab === 'ahead' ? 'primary' : 'default'}
            onClick={() => setActiveTab('ahead')}
          >
            <CheckCircleOutlined /> 提前完成 ({report?.aheadTasks.length || 0})
          </Button>
          <Button
            type={activeTab === 'delayed' ? 'primary' : 'default'}
            onClick={() => setActiveTab('delayed')}
          >
            <WarningOutlined /> 已推迟 ({report?.delayedTasks.length || 0})
          </Button>
          <Button
            type={activeTab === 'unfinished' ? 'primary' : 'default'}
            onClick={() => setActiveTab('unfinished')}
          >
            <ExclamationCircleOutlined /> 未完成 ({report?.unfinishedTasks.length || 0})
          </Button>
          <Button
            type={activeTab === 'workers' ? 'primary' : 'default'}
            onClick={() => setActiveTab('workers')}
          >
            <ClockCircleOutlined /> 人员负荷 ({report?.workerLoadAnalysis.length || 0})
          </Button>
        </Space>

        {/* 任务概览 Tab */}
        {activeTab === 'overview' && report && (
          <div>
            <Title level={5}>今日任务进度概览</Title>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small" title="完成任务">
                  <Statistic
                    value={report.completedTasks}
                    valueStyle={{ color: '#52c41a' }}
                    suffix={`/ ${report.totalTasks}`}
                  />
                  <Progress
                    percent={report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0}
                    showInfo={false}
                    strokeColor="#52c41a"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="超期任务">
                  <Statistic
                    value={report.overdueTasks}
                    valueStyle={{ color: report.overdueTasks > 0 ? '#ff4d4f' : '#52c41a' }}
                  />
                  {report.overdueTasks > 0 && (
                    <Text type="warning">需要及时处理</Text>
                  )}
                </Card>
              </Col>
            </Row>

            <Title level={5}>AI 派工建议</Title>
            {todayPlan.tasks.length > 0 ? (
              <List
                size="small"
                bordered
                dataSource={todayPlan.tasks.slice(0, 5)}
                renderItem={(task) => {
                  const suggestion = todayPlan.workerSuggestions?.find(s => s.taskId === task.id);
                  return (
                    <List.Item>
                      <Space>
                        <Tag color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'green'}>
                          {task.priority === 'high' ? '紧急' : task.priority === 'medium' ? '重要' : '普通'}
                        </Tag>
                        <Text strong>{task.taskTypeName}</Text>
                        <Text type="secondary">- {task.greenhouseName}</Text>
                        {suggestion && (
                          <>
                            <Tag icon={<RobotOutlined />}>推荐: {suggestion.workerName}</Tag>
                            <Text type="secondary">置信度 {suggestion.confidenceScore}%</Text>
                          </>
                        )}
                      </Space>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Text type="secondary">今日暂无待派发任务</Text>
            )}
          </div>
        )}

        {/* 提前完成 Tab */}
        {activeTab === 'ahead' && (
          <div>
            <Title level={5}>提前完成任务</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              以下任务在实际完成时间之前完成
            </Text>
            <Table
              columns={getTaskProgressColumns()}
              dataSource={report?.aheadTasks || []}
              rowKey="taskId"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {/* 已推迟 Tab */}
        {activeTab === 'delayed' && (
          <div>
            <Title level={5}>已推迟任务</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              以下任务未能按计划时间完成
            </Text>
            <Table
              columns={getTaskProgressColumns()}
              dataSource={report?.delayedTasks || []}
              rowKey="taskId"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {/* 未完成 Tab */}
        {activeTab === 'unfinished' && (
          <div>
            <Title level={5}>未完成任务</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              截止日期已到但尚未完成的任务
            </Text>
            <Table
              columns={getTaskProgressColumns()}
              dataSource={report?.unfinishedTasks || []}
              rowKey="taskId"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {/* 人员负荷 Tab */}
        {activeTab === 'workers' && (
          <div>
            <Title level={5}>人员负荷分析</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              各执行人员当前的工作负荷情况
            </Text>
            <Table
              columns={getWorkerLoadColumns()}
              dataSource={report?.workerLoadAnalysis || []}
              rowKey="workerId"
              size="small"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
