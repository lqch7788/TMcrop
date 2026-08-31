/**
 * v0.3 P1-1：SOP 库浏览页面
 *
 * 路由：/agronomy/sop-library
 *
 * 功能：
 *   - 按作物 + 任务类型过滤
 *   - 卡片式展示 SOP（带步骤预览）
 *   - 点击展开步骤详情
 *   - 显示 60 个预置 SOP
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Tag,
  Empty,
  Spin,
  Space,
  Button,
  Collapse,
  message,
} from 'antd';
import { BookOutlined, ReloadOutlined } from '@ant-design/icons';
import { listSop, type Sop } from '@/services/apiSopLibraryService';

const CROP_OPTIONS = [
  { value: 'GRAPE', label: '🍇 葡萄', color: 'purple' },
  { value: 'LEAF', label: '🥬 叶菜', color: 'green' },
  { value: 'SOLANACEOUS', label: '🍅 茄果', color: 'red' },
];

const TASK_TYPE_LABELS: Record<string, string> = {
  planting: '🌱 种植',
  irrigation: '💧 灌溉',
  fertilization: '🧪 施肥',
  pest_control: '🛡️ 病虫害',
  pruning: '✂️ 修剪',
  harvest: '🌾 采收',
  weeding: '🌱 除草',
  farm_repair: '🔧 农场维护',
  other: '📌 其他',
};

export default function SopLibraryPage() {
  const [sops, setSops] = useState<Sop[]>([]);
  const [loading, setLoading] = useState(false);
  const [cropFilter, setCropFilter] = useState<string | undefined>();
  const [taskTypeFilter, setTaskTypeFilter] = useState<string | undefined>();
  const [messageApi, contextHolder] = message.useMessage();

  const loadSops = async () => {
    setLoading(true);
    try {
      const data = await listSop({
        crop_code: cropFilter,
        task_type: taskTypeFilter,
      });
      setSops(data);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.error(`加载失败：${m}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSops();
  }, [cropFilter, taskTypeFilter]);

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <BookOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <h2 style={{ margin: 0 }}>SOP 标准作业程序库</h2>
        <Tag color="blue">{sops.length} 个 SOP</Tag>
      </div>

      {/* 过滤 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>作物：</span>
          <Select
            value={cropFilter}
            onChange={(v) => setCropFilter(v)}
            placeholder="全部"
            allowClear
            style={{ minWidth: 180 }}
          >
            {CROP_OPTIONS.map((c) => (
              <Select.Option key={c.value} value={c.value}>
                {c.label}
              </Select.Option>
            ))}
          </Select>
          <span>任务类型：</span>
          <Select
            value={taskTypeFilter}
            onChange={(v) => setTaskTypeFilter(v)}
            placeholder="全部"
            allowClear
            style={{ minWidth: 160 }}
          >
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadSops}>
            刷新
          </Button>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {sops.length === 0 && !loading ? (
          <Card>
            <Empty description="暂无 SOP" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {sops.map((sop) => {
              const cropMeta = CROP_OPTIONS.find((c) => c.value === sop.cropCode);
              const taskLabel = TASK_TYPE_LABELS[sop.taskType ?? ''] ?? sop.taskType;
              return (
                <Col span={8} key={sop.id}>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    styles={{
                      body: { padding: 16 },
                    }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Space wrap>
                        {cropMeta && <Tag color={cropMeta.color}>{cropMeta.label}</Tag>}
                        <Tag color="blue">{taskLabel}</Tag>
                        {sop.growthStage && <Tag>{sop.growthStage}</Tag>}
                        <Tag>v{sop.version ?? 1}</Tag>
                      </Space>
                      <h3 style={{ margin: '8px 0 4px 0' }}>{sop.sopName}</h3>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        编号：{sop.sopCode}
                      </div>
                      {sop.description && (
                        <div style={{ fontSize: 13, color: '#333' }}>{sop.description}</div>
                      )}
                      {sop.steps && sop.steps.length > 0 && (
                        <Collapse
                          ghost
                          size="small"
                          items={[
                            {
                              key: 'steps',
                              label: `📋 查看 ${sop.steps.length} 个步骤`,
                              children: (
                                <ol style={{ paddingLeft: 20, margin: 0 }}>
                                  {sop.steps.map((step) => (
                                    <li key={step.id} style={{ marginBottom: 4 }}>
                                      <strong>{step.stepTitle}</strong>
                                      {step.estimatedMinutes && (
                                        <Tag color="cyan" style={{ marginLeft: 8 }}>
                                          {step.estimatedMinutes} 分钟
                                        </Tag>
                                      )}
                                      {step.pesticideCode && (
                                        <Tag color="orange" style={{ marginLeft: 8 }}>
                                          药剂：{step.pesticideCode}
                                        </Tag>
                                      )}
                                      {step.stepContent && (
                                        <div style={{ color: '#666', fontSize: 12 }}>
                                          {step.stepContent}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              ),
                            },
                          ]}
                        />
                      )}
                      {sop.warningNotes && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 8,
                            background: '#fff7e6',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#d48806',
                          }}
                        >
                          ⚠️ {sop.warningNotes}
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>
    </div>
  );
}
