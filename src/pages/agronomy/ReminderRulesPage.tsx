/**
 * v0.3 P1-2：提醒规则管理页面
 *
 * 路由：/agronomy/reminders
 *
 * 功能：
 *   - 列出所有提醒规则
 *   - 显示规则状态（启用/禁用）
 *   - 手动触发扫描（测试用）
 *   - 创建新规则（v0.3 仅支持 1 条内置 RULE_TASK_OVERDUE）
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Statistic,
  Row,
  Col,
  message,
} from 'antd';
import {
  BellOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  listRules,
  runReminders,
  createRule,
  type ReminderRule,
  type RunResult,
} from '@/services/apiReminderRulesService';

const RULE_TYPE_LABELS: Record<string, string> = {
  overdue: '⏰ 超期',
  deadline: '📅 截止',
  low_stock: '📉 低库存',
  issue_pending: '⚠️ 问题积压',
  approval_timeout: '📋 审批超时',
  no_op_record: '🚫 无作业',
  weather: '🌦️ 气象',
};

export default function ReminderRulesPage() {
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRules();
      setRules(data);
    } catch (err: unknown) {
      messageApi.error('加载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRun = async (dryRun: boolean) => {
    try {
      const result = await runReminders(dryRun);
      setRunResult(result);
      messageApi.success(
        `扫描完成：触发 ${result.stats.triggered} 条，跳过冷却 ${result.stats.skipped_cooldown} 条`
      );
    } catch (err: unknown) {
      messageApi.error('扫描失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createRule({
        rule_code: values.rule_code,
        rule_name: values.rule_name,
        rule_type: values.rule_type,
        priority: values.priority,
        cooldown_minutes: values.cooldown_minutes,
        is_active: 1,
        notification_channels: JSON.stringify(['inbox']),
      });
      messageApi.success('规则已创建');
      setCreateOpen(false);
      form.resetFields();
      load();
    } catch (err: unknown) {
      messageApi.error('创建失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <BellOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
        <h2 style={{ margin: 0 }}>智能提醒引擎</h2>
      </div>

      {/* 统计 + 操作 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="规则总数" value={rules.length} prefix={<BellOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用规则"
              value={rules.filter((r) => r.isActive === 1).length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Space wrap>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleRun(true)}
              >
                试运行扫描（不写入）
              </Button>
              <Button
                type="primary"
                danger
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: '确认实际扫描',
                    content: '将真实写入提醒记录',
                    onOk: () => handleRun(false),
                  });
                }}
              >
                实际扫描
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                新建规则
              </Button>
              <Button icon={<ReloadOutlined />} onClick={load}>
                刷新
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 最近扫描结果 */}
      {runResult && (
        <Card style={{ marginBottom: 16, background: '#f0f5ff' }}>
          <Space>
            <span>最近扫描：</span>
            <Tag color="blue">扫描 {runResult.stats.scanned}</Tag>
            <Tag color="green">触发 {runResult.stats.triggered}</Tag>
            <Tag color="orange">跳过冷却 {runResult.stats.skipped_cooldown}</Tag>
            {runResult.dryRun && <Tag color="purple">试运行（未写入）</Tag>}
          </Space>
          {runResult.sampleReminders.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              示例：
              {runResult.sampleReminders.map((r) => (
                <div key={r.id}>• {r.title} → {r.targetType}#{r.targetId}</div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 规则列表 */}
      <Card title={`规则列表（共 ${rules.length} 条）`}>
        <Table
          rowKey="id"
          dataSource={rules}
          loading={loading}
          pagination={false}
          columns={[
            {
              title: '规则编号',
              dataIndex: 'ruleCode',
              render: (v: string) => <Tag color="blue">{v}</Tag>,
            },
            {
              title: '规则名称',
              dataIndex: 'ruleName',
            },
            {
              title: '类型',
              dataIndex: 'ruleType',
              render: (v: string) => RULE_TYPE_LABELS[v] ?? v,
            },
            {
              title: '优先级',
              dataIndex: 'priority',
              render: (v: string) => (
                <Tag
                  color={
                    v === 'urgent' ? 'red' : v === 'high' ? 'orange' : v === 'medium' ? 'blue' : 'default'
                  }
                >
                  {v ?? 'medium'}
                </Tag>
              ),
            },
            {
              title: '冷却（分钟）',
              dataIndex: 'cooldownMinutes',
            },
            {
              title: '状态',
              dataIndex: 'isActive',
              render: (v: number) => (
                <Switch checked={v === 1} disabled checkedChildren="启用" unCheckedChildren="禁用" />
              ),
            },
          ]}
        />
      </Card>

      {/* 创建规则弹窗 */}
      <Modal
        title="新建提醒规则"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="创建"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="规则编号（唯一）" name="rule_code" rules={[{ required: true }]}>
            <Input placeholder="如：RULE_MY_CUSTOM" />
          </Form.Item>
          <Form.Item label="规则名称" name="rule_name" rules={[{ required: true }]}>
            <Input placeholder="如：物料低库存提醒" />
          </Form.Item>
          <Form.Item label="规则类型" name="rule_type" rules={[{ required: true }]}>
            <Select
              options={Object.entries(RULE_TYPE_LABELS).map(([k, v]) => ({
                value: k,
                label: v,
              }))}
            />
          </Form.Item>
          <Form.Item label="优先级" name="priority" initialValue="medium">
            <Select
              options={[
                { value: 'urgent', label: '紧急' },
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
              ]}
            />
          </Form.Item>
          <Form.Item label="冷却时间（分钟）" name="cooldown_minutes" initialValue={60}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
