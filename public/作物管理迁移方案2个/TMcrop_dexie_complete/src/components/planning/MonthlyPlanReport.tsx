/**
 * 月度规划报告组件
 * 展示月度任务规划、资源需求和成本预估
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
  Divider,
  Alert,
} from 'antd';
import {
  CalendarOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  TeamOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type {
  MonthlyPlan,
  WeeklySummary,
  MaterialRequirement,
  WorkerRequirement,
  CostBreakdown,
} from '../../types/planning';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title, Paragraph } = Typography;

// ============================================
// 类型定义
// ============================================
interface MonthlyPlanReportProps {
  plan: MonthlyPlan;
  showActions?: boolean;
  onWeekClick?: (week: WeeklySummary) => void;
  onMaterialClick?: (material: MaterialRequirement) => void;
  onWorkerClick?: (worker: WorkerRequirement) => void;
}

// ============================================
// 周汇总表格列定义
// ============================================
const getWeeklySummaryColumns = (
  onWeekClick?: (week: WeeklySummary) => void
): ColumnsType<WeeklySummary> => [
  {
    title: '周次',
    dataIndex: 'weekNumber',
    key: 'weekNumber',
    width: 80,
    render: (week: number) => <Text strong>第 {week} 周</Text>,
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
    render: (count: number, record: WeeklySummary) => (
      <Tag
        color="blue"
        style={{ cursor: onWeekClick ? 'pointer' : 'default' }}
        onClick={() => onWeekClick?.(record)}
      >
        {count}
      </Tag>
    ),
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
    render: (count: number) => <Text>{count} 人</Text>,
  },
  {
    title: '重点作物',
    dataIndex: 'keyCrops',
    key: 'keyCrops',
    render: (crops: string[]) => (
      <Space wrap>
        {crops.map(crop => (
          <Tag key={crop} color="green">{crop}</Tag>
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
          <Tag key={task}>{task}</Tag>
        ))}
      </Space>
    ),
  },
];

// ============================================
// 物资需求表格列定义
// ============================================
const getMaterialColumns = (
  onMaterialClick?: (material: MaterialRequirement) => void
): ColumnsType<MaterialRequirement> => [
  {
    title: '物资名称',
    dataIndex: 'materialName',
    key: 'materialName',
    width: 120,
    render: (name: string, record: MaterialRequirement) => (
      <Text
        style={{ cursor: onMaterialClick ? 'pointer' : 'default' }}
        onClick={() => onMaterialClick?.(record)}
      >
        {name}
      </Text>
    ),
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
      <Text strong>{qty} {record.unit}</Text>
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
    render: (price: number) => <Text strong type="danger">¥{price.toFixed(2)}</Text>,
  },
];

// ============================================
// 人员需求表格列定义
// ============================================
const getWorkerColumns = (
  onWorkerClick?: (worker: WorkerRequirement) => void
): ColumnsType<WorkerRequirement> => [
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    width: 100,
    render: (role: string, record: WorkerRequirement) => (
      <Text
        style={{ cursor: onWorkerClick ? 'pointer' : 'default' }}
        onClick={() => onWorkerClick?.(record)}
      >
        {role}
      </Text>
    ),
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
    render: (count: number) => <Tag color="blue">{count} 人</Tag>,
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
// 辅助函数
// ============================================

/**
 * 获取任务类型中文名
 */
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

/**
 * 获取进度条颜色
 */
function getProgressColor(index: number): string {
  const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2'];
  return colors[index % colors.length];
}

// ============================================
// 主组件
// ============================================

export default function MonthlyPlanReportComponent({
  plan,
  showActions,
  onWeekClick,
  onMaterialClick,
  onWorkerClick,
}: MonthlyPlanReportProps) {
  // 任务类型分布
  const taskTypeSummary = Object.entries(plan.taskTypeBreakdown)
    .map(([taskType, count]) => ({
      taskType,
      taskTypeName: getTaskTypeName(taskType),
      count,
      percentage: plan.totalTasks > 0 ? Math.round((count / plan.totalTasks) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="monthly-plan-report">
      {/* 报告标题 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4}>
          <CalendarOutlined /> 月度任务规划报告 - {plan.month}
        </Title>
        <Paragraph type="secondary">
          生成时间：{new Date(plan.generatedAt).toLocaleString()} | 生成方式：{plan.generatedBy}
        </Paragraph>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总任务数"
              value={plan.totalTasks}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="预估工时"
              value={plan.totalHours}
              suffix="h"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="所需人员"
              value={Math.round(plan.totalHours / 8)}
              suffix="人"
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="预估成本"
              value={plan.totalCost}
              prefix="¥"
              precision={0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 任务类型分布 */}
      <Card size="small" title="任务类型分布" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          {taskTypeSummary.slice(0, 4).map((item, index) => (
            <Col span={6} key={index}>
              <Statistic
                title={item.taskTypeName}
                value={item.count}
                suffix={`(${item.percentage}%)`}
              />
              <Progress
                percent={item.percentage}
                showInfo={false}
                strokeColor={getProgressColor(index)}
              />
            </Col>
          ))}
        </Row>
      </Card>

      {/* 按周汇总 */}
      <Card
        size="small"
        title="按周汇总"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <Text type="secondary">共 {plan.weeklySummaries.length} 周</Text>
          )
        }
      >
        <Table
          columns={getWeeklySummaryColumns(onWeekClick)}
          dataSource={plan.weeklySummaries}
          rowKey="weekNumber"
          size="small"
          pagination={false}
        />
      </Card>

      {/* 物资需求 */}
      <Card
        size="small"
        title="物资需求计划"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <Text type="secondary">
              共 {plan.materialRequirements.length} 项 | 预估 ¥{plan.materialRequirements.reduce((sum, m) => sum + m.estimatedTotalPrice, 0).toFixed(2)}
            </Text>
          )
        }
      >
        <Table
          columns={getMaterialColumns(onMaterialClick)}
          dataSource={plan.materialRequirements}
          rowKey="materialName"
          size="small"
          pagination={{ pageSize: 5 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong type="danger">
                    ¥{plan.materialRequirements.reduce((sum, m) => sum + m.estimatedTotalPrice, 0).toFixed(2)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* 人员需求 */}
      <Card
        size="small"
        title="人员需求计划"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <Text type="secondary">共 {plan.workerRequirements.length} 项</Text>
          )
        }
      >
        <Table
          columns={getWorkerColumns(onWorkerClick)}
          dataSource={plan.workerRequirements}
          rowKey="skill"
          size="small"
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {/* 成本预估 */}
      <Card size="small" title="成本预估">
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small" type="inner">
              <Statistic
                title="物资成本"
                value={plan.costBreakdown.materialCost}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" type="inner">
              <Statistic
                title="工具成本"
                value={plan.costBreakdown.toolCost}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" type="inner">
              <Statistic
                title="人工成本"
                value={plan.costBreakdown.laborCost}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card size="small" type="inner">
          <Statistic
            title="总成本"
            value={plan.costBreakdown.total}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
          />
        </Card>

        <Divider />

        <Title level={5}>成本构成</Title>
        <Progress
          percent={plan.costBreakdown.total > 0 ? Math.round((plan.costBreakdown.materialCost / plan.costBreakdown.total) * 100) : 0}
          strokeColor="#fa8c16"
          format={(percent) => `物资 ${percent}%`}
        />
        <Progress
          percent={plan.costBreakdown.total > 0 ? Math.round((plan.costBreakdown.toolCost / plan.costBreakdown.total) * 100) : 0}
          strokeColor="#722ed1"
          format={(percent) => `工具 ${percent}%`}
        />
        <Progress
          percent={plan.costBreakdown.total > 0 ? Math.round((plan.costBreakdown.laborCost / plan.costBreakdown.total) * 100) : 0}
          strokeColor="#13c2c2"
          format={(percent) => `人工 ${percent}%`}
        />
      </Card>
    </div>
  );
}
