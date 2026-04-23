/**
 * 月度规划页面
 * 显示月度任务规划、物资需求、人员需求和成本预估
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Select,
  DatePicker,
  Statistic,
  Row,
  Col,
  Alert,
  List,
  Space,
  Typography,
  Tabs,
  Divider,
  Progress,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  ToolOutlined,
  TeamOutlined,
  DollarOutlined,
  ReloadOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useMonthlyTaskPlanning, MonthlyPlan, WeeklySummary, MaterialRequirement, WorkerRequirement, CostBreakdown } from '../hooks/useMonthlyTaskPlanning';
import type { ColumnsType } from 'antd/es/table';

// 导入中文语言包
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');

const { Text, Title, Paragraph } = Typography;
const { MonthPicker } = DatePicker;

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
    render: (count: number) => <Tag color="blue">{count}</Tag>,
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
// 主组件
// ============================================

export default function MonthlyPlanningPage() {
  // 状态
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [monthlyPlan, setMonthlyPlan] = useState<MonthlyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'weekly' | 'materials' | 'workers' | 'cost'>('overview');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  // Hooks
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

  // 处理月份变化
  const handleMonthChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedMonth(date.format('YYYY-MM'));
    }
  };

  // 处理批次变化
  const handleBatchChange = (values: string[]) => {
    setSelectedBatches(values);
  };

  // 刷新数据
  const handleRefresh = () => {
    const plan = generateMonthlyPlan(selectedMonth, selectedBatches);
    setMonthlyPlan(plan);
  };

  // 导出规划（模拟）
  const handleExport = () => {
    alert('导出功能开发中...');
  };

  // 统计卡片数据
  const statsData = monthlyPlan
    ? [
        { title: '总任务数', value: monthlyPlan.totalTasks, icon: <FileTextOutlined />, color: '#1890ff' },
        { title: '预估工时', value: `${monthlyPlan.totalHours}h`, icon: <ThunderboltOutlined />, color: '#722ed1' },
        { title: '所需人员', value: Math.round(monthlyPlan.totalHours / 8), icon: <TeamOutlined />, color: '#13c2c2' },
        { title: '预估成本', value: `¥${monthlyPlan.totalCost.toFixed(0)}`, icon: <DollarOutlined />, color: '#fa8c16' },
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

  // 获取任务类型中文名
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

  return (
    <div className="monthly-planning-page" style={{ padding: 24 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>
          <CalendarOutlined /> 月度任务规划
        </Title>
        <Paragraph type="secondary">
          基于作物生长周期和生产批次，生成未来一个月的任务规划、物资需求和成本预估
        </Paragraph>
      </div>

      {/* 日期选择、批次筛选和操作按钮 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <MonthPicker
            value={dayjs(selectedMonth)}
            onChange={handleMonthChange}
            format="YYYY-MM"
            placeholder="选择月份"
          />
          <Select
            mode="multiple"
            placeholder="筛选生产批次（不选则全部）"
            value={selectedBatches}
            onChange={handleBatchChange}
            options={batchOptions}
            style={{ minWidth: 300 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新数据
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出规划
          </Button>
        </Space>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {statsData.map((stat, index) => (
          <Col span={6} key={index}>
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

      {/* Tab 切换 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <FileTextOutlined /> 规划概览
                </span>
              ),
            },
            {
              key: 'weekly',
              label: (
                <span>
                  <CalendarOutlined /> 按周汇总
                </span>
              ),
            },
            {
              key: 'materials',
              label: (
                <span>
                  <ShoppingOutlined /> 物资需求
                </span>
              ),
            },
            {
              key: 'workers',
              label: (
                <span>
                  <TeamOutlined /> 人员需求
                </span>
              ),
            },
            {
              key: 'cost',
              label: (
                <span>
                  <DollarOutlined /> 成本预估
                </span>
              ),
            },
          ]}
        />

        {/* 规划概览 Tab */}
        {activeTab === 'overview' && monthlyPlan && (
          <div>
            <Title level={5}>任务类型分布</Title>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              {taskTypeSummary.slice(0, 4).map((item, index) => (
                <Col span={6} key={index}>
                  <Card size="small">
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
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />

            <Title level={5}>本周重点任务</Title>
            {monthlyPlan.weeklySummaries.length > 0 && (
              <List
                size="small"
                bordered
                header={<Text strong>第 {monthlyPlan.weeklySummaries[0].weekNumber} 周</Text>}
                dataSource={monthlyPlan.weeklySummaries[0].keyTasks}
                renderItem={(task) => (
                  <List.Item>
                    <Tag color="blue">{task}</Tag>
                  </List.Item>
                )}
              />
            )}

            <Divider />

            <Title level={5}>生成信息</Title>
            <Text type="secondary">
              生成时间：{dayjs(monthlyPlan.generatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
            <br />
            <Text type="secondary">
              生成方式：{monthlyPlan.generatedBy}
            </Text>
          </div>
        )}

        {/* 按周汇总 Tab */}
        {activeTab === 'weekly' && monthlyPlan && (
          <div>
            <Title level={5}>按周汇总</Title>
            <Table
              columns={getWeeklySummaryColumns()}
              dataSource={monthlyPlan.weeklySummaries}
              rowKey="weekNumber"
              size="small"
              pagination={false}
            />
          </div>
        )}

        {/* 物资需求 Tab */}
        {activeTab === 'materials' && monthlyPlan && (
          <div>
            <Title level={5}>物资需求计划</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              基于月度任务规划，预测所需的物资消耗
            </Text>
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
                      <Text strong>合计</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong type="danger">
                        ¥{monthlyPlan.materialRequirements.reduce((sum, m) => sum + m.estimatedTotalPrice, 0).toFixed(2)}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        )}

        {/* 人员需求 Tab */}
        {activeTab === 'workers' && monthlyPlan && (
          <div>
            <Title level={5}>人员需求计划</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              基于月度任务规划，预测所需的人员配置
            </Text>
            <Table
              columns={getWorkerColumns()}
              dataSource={monthlyPlan.workerRequirements}
              rowKey="skill"
              size="small"
              pagination={false}
            />
          </div>
        )}

        {/* 成本预估 Tab */}
        {activeTab === 'cost' && monthlyPlan && (
          <div>
            <Title level={5}>成本预估</Title>
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" title="物资成本">
                  <Statistic
                    value={monthlyPlan.costBreakdown.materialCost}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="工具成本">
                  <Statistic
                    value={monthlyPlan.costBreakdown.toolCost}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="人工成本">
                  <Statistic
                    value={monthlyPlan.costBreakdown.laborCost}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#13c2c2' }}
                  />
                </Card>
              </Col>
            </Row>
            <Card size="small" style={{ marginTop: 16 }} type="inner">
              <Statistic
                title="总成本"
                value={monthlyPlan.costBreakdown.total}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
              />
            </Card>

            <Divider />

            <Title level={5}>成本构成</Title>
            <Progress
              percent={monthlyPlan.costBreakdown.total > 0 ? Math.round((monthlyPlan.costBreakdown.materialCost / monthlyPlan.costBreakdown.total) * 100) : 0}
              strokeColor="#fa8c16"
              format={(percent) => `物资 ${percent}%`}
            />
            <Progress
              percent={monthlyPlan.costBreakdown.total > 0 ? Math.round((monthlyPlan.costBreakdown.toolCost / monthlyPlan.costBreakdown.total) * 100) : 0}
              strokeColor="#722ed1"
              format={(percent) => `工具 ${percent}%`}
            />
            <Progress
              percent={monthlyPlan.costBreakdown.total > 0 ? Math.round((monthlyPlan.costBreakdown.laborCost / monthlyPlan.costBreakdown.total) * 100) : 0}
              strokeColor="#13c2c2"
              format={(percent) => `人工 ${percent}%`}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// 获取进度条颜色
function getProgressColor(index: number): string {
  const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1'];
  return colors[index % colors.length];
}
