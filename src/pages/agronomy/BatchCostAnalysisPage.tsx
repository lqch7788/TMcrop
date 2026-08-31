/**
 * v0.3 P1-4：批次成本分析页面
 *
 * 路由：/agronomy/batch-cost
 *
 * 功能：
 *   - 批次成本列表（按总成本排序）
 *   - 按作物汇总
 *   - 单批次详情
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import { DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listBatchCosts,
  getCropCostSummary,
  type BatchCost,
  type CropCostSummary,
} from '@/services/apiBatchCostService';

export default function BatchCostAnalysisPage() {
  const [costs, setCosts] = useState<BatchCost[]>([]);
  const [summary, setSummary] = useState<CropCostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([listBatchCosts({ limit: 100 }), getCropCostSummary()]);
      setCosts(list);
      setSummary(sum);
    } catch (err: unknown) {
      messageApi.error('加载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 统计
  const totalCost = costs.reduce((sum, c) => sum + (Number(c.totalCost) || 0), 0);
  const totalBatches = costs.length;
  const avgCost = totalBatches > 0 ? totalCost / totalBatches : 0;

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
        <h2 style={{ margin: 0 }}>批次成本分析</h2>
        <a onClick={load} style={{ marginLeft: 'auto', cursor: 'pointer' }}>
          <ReloadOutlined /> 刷新
        </a>
      </div>

      {/* 汇总 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="批次总数" value={totalBatches} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成本总计"
              value={totalCost.toFixed(2)}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均批次成本"
              value={avgCost.toFixed(2)}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="作物种类"
              value={summary.length}
              suffix="种"
            />
          </Card>
        </Col>
      </Row>

      {/* 按作物汇总 */}
      <Card title="按作物汇总" style={{ marginBottom: 16 }}>
        <Table
          rowKey="cropName"
          dataSource={summary}
          pagination={false}
          loading={loading}
          columns={[
            { title: '作物', dataIndex: 'cropName', render: (v: string) => <Tag color="green">{v ?? '-'}</Tag> },
            { title: '批次数', dataIndex: 'batchCount', render: (v: number) => v ?? 0 },
            {
              title: '总成本',
              dataIndex: 'totalCost',
              render: (v: number) => `¥${(v ?? 0).toFixed(2)}`,
            },
            {
              title: '平均单株',
              dataIndex: 'avgCostPerUnit',
              render: (v: number) => `¥${(v ?? 0).toFixed(4)}`,
            },
            { title: '操作总数', dataIndex: 'totalOperations', render: (v: number) => v ?? 0 },
            { title: '任务总数', dataIndex: 'totalTasks', render: (v: number) => v ?? 0 },
          ]}
        />
      </Card>

      {/* 批次列表 */}
      <Card title={`批次成本明细（Top ${costs.length}）`}>
        <Table
          rowKey="batchCode"
          dataSource={costs}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '批次', dataIndex: 'batchCode', render: (v: string) => <Tag color="blue">{v ?? '-'}</Tag> },
            { title: '作物', dataIndex: 'cropName', render: (v: string) => v ?? '-' },
            { title: '品种', dataIndex: 'cropVariety', render: (v: string) => v ?? '-' },
            { title: '棚区', dataIndex: 'greenhouseName', render: (v: string) => v ?? '-' },
            { title: '种植量', dataIndex: 'plantingQuantity', render: (v: number) => v ?? 0 },
            {
              title: '人工',
              dataIndex: 'laborCost',
              render: (v: number) => `¥${(v ?? 0).toFixed(2)}`,
            },
            {
              title: '外包',
              dataIndex: 'outsourceCost',
              render: (v: number) => `¥${(v ?? 0).toFixed(2)}`,
            },
            {
              title: '总成本',
              dataIndex: 'totalCost',
              render: (v: number) => (
                <span style={{ color: '#cf1322', fontWeight: 500 }}>¥{(v ?? 0).toFixed(2)}</span>
              ),
            },
            {
              title: '单株',
              dataIndex: 'costPerUnit',
              render: (v: number) => `¥${(v ?? 0).toFixed(4)}`,
            },
            { title: '操作数', dataIndex: 'operationCount', render: (v: number) => v ?? 0 },
            { title: '任务数', dataIndex: 'taskCount', render: (v: number) => v ?? 0 },
          ]}
        />
      </Card>
    </div>
  );
}
