/**
 * v0.3 P0-1：批次统一时间线页面
 *
 * 路由：/agronomy/batch-timeline/:batchCode
 *
 * 功能：
 *   - 顶部：批次摘要卡片（事件类型分布）
 *   - 过滤：事件类型多选 + 日期范围
 *   - 时间线：按事件类型分组的列表（任务/作业/采收/移栽/每日记录）
 *   - 分页：默认 50/页
 *
 * 设计原则：
 *   - 不破坏任何现有页面
 *   - 复用现有 UI 组件
 *   - 中文显示（暂不强制 i18n）
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Tag,
  Empty,
  Spin,
  Button,
  Select,
  DatePicker,
  Space,
  Statistic,
  Badge,
  Tooltip,
  Progress,
} from 'antd';
import {
  ClockCircleOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ScissorOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useBatchTimelineStore } from '@/stores/useBatchTimelineStore';
import type { TimelineEvent } from '@/services/apiBatchTimelineService';

const { RangePicker } = DatePicker;

// 注意：summary key 经过后端 camelCase 中间件转换（farm_task → farmTask）
// eventType 是后端 SQL 值（farm_task），不被转换
const EVENT_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  farm_task: { label: '农事任务', color: 'blue', icon: '📋' },
  operation: { label: '作业流水', color: 'green', icon: '🌱' },
  harvest: { label: '采收', color: 'gold', icon: '🌾' },
  daily_record: { label: '每日记录', color: 'cyan', icon: '📅' },
  move: { label: '移栽', color: 'purple', icon: '🔄' },
  // camelCase 兼容（summary 对象 key 被中间件转换）
  farmTask: { label: '农事任务', color: 'blue', icon: '📋' },
  dailyRecord: { label: '每日记录', color: 'cyan', icon: '📅' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <ClockCircleOutlined />,
  in_progress: <PlayCircleOutlined />,
  paused: <PauseCircleOutlined />,
  completed: <CheckCircleOutlined />,
  cancelled: <PauseCircleOutlined />,
};

export default function BatchTimelinePage() {
  const { batchCode } = useParams<{ batchCode: string }>();
  const navigate = useNavigate();

  const {
    events,
    summary,
    loading,
    error,
    pagination,
    filter,
    fetchTimeline,
    fetchSummary,
    setFilter,
  } = useBatchTimelineStore();

  const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    if (!batchCode) return;
    fetchSummary(batchCode);
  }, [batchCode, fetchSummary]);

  useEffect(() => {
    if (!batchCode) return;
    const query: Record<string, unknown> = {};
    if (eventTypeFilter.length > 0) query.eventTypes = eventTypeFilter.join(',');
    if (dateRange) {
      query.startDate = dateRange[0].format('YYYY-MM-DD');
      query.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    fetchTimeline(batchCode, query);
  }, [batchCode, eventTypeFilter, dateRange, fetchTimeline]);

  if (!batchCode) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="缺少 batchCode 参数" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
        <h2 style={{ margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          批次时间线：<span style={{ color: '#1677ff' }}>{batchCode}</span>
        </h2>
      </div>

      {/* 批次摘要卡片 */}
      <Card title="事件摘要" style={{ marginBottom: 16 }}>
        {summary ? (
          <Row gutter={16}>
            {Object.entries(summary).map(([type, count]) => {
              const meta = EVENT_TYPE_LABELS[type];
              if (!meta) return null;
              return (
                <Col span={4} key={type}>
                  <Statistic
                    title={
                      <span>
                        {meta.icon} {meta.label}
                      </span>
                    }
                    value={count}
                    valueStyle={{ color: meta.color === 'gold' ? '#d48806' : undefined }}
                  />
                </Col>
              );
            })}
            <Col span={4}>
              <Statistic title="事件总数" value={pagination.total} />
            </Col>
          </Row>
        ) : (
          <Spin />
        )}
      </Card>

      {/* 过滤区 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <span>事件类型：</span>
          <Select
            mode="multiple"
            placeholder="选择事件类型（不选则全部）"
            value={eventTypeFilter}
            onChange={setEventTypeFilter}
            style={{ minWidth: 280 }}
            allowClear
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([type, meta]) => (
              <Select.Option key={type} value={type}>
                {meta.icon} {meta.label}
              </Select.Option>
            ))}
          </Select>
          <span>日期范围：</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setEventTypeFilter([]);
              setDateRange(null);
            }}
          >
            重置
          </Button>
        </Space>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card style={{ marginBottom: 16, background: '#fff2f0' }}>
          <span style={{ color: '#ff4d4f' }}>⚠ 加载失败：{error}</span>
        </Card>
      )}

      {/* 时间线列表 */}
      <Card title={`事件列表（${pagination.total} 条）`}>
        <Spin spinning={loading}>
          {events.length === 0 && !loading ? (
            <Empty description="该批次暂无事件" />
          ) : (
            <div>
              {events.map((event) => (
                <TimelineEventCard key={`${event.eventType}-${event.id}`} event={event} />
              ))}
            </div>
          )}
        </Spin>
      </Card>

      {/* 分页 */}
      {pagination.total > pagination.pageSize && (
        <Card style={{ marginTop: 16, textAlign: 'center' }}>
          <Space>
            <Button
              disabled={pagination.page <= 1}
              onClick={() =>
                fetchTimeline(batchCode, { ...filter, page: pagination.page - 1 })
              }
            >
              上一页
            </Button>
            <span>
              第 {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)} 页
            </span>
            <Button
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() =>
                fetchTimeline(batchCode, { ...filter, page: pagination.page + 1 })
              }
            >
              下一页
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
}

/**
 * 单个事件卡片
 */
function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const meta = EVENT_TYPE_LABELS[event.eventType] ?? {
    label: event.eventType,
    color: 'default',
    icon: '•',
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: 8,
        background: '#fafafa',
        borderRadius: 6,
        borderLeft: `4px solid var(--ant-color-${meta.color})`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      {/* 图标 */}
      <div style={{ fontSize: 24, lineHeight: 1 }}>{meta.icon}</div>

      {/* 内容 */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Tag color={meta.color}>{meta.label}</Tag>
          <strong>{event.title || '未命名事件'}</strong>
          {event.subtype && (
            <Tooltip title="事件子类型">
              <Tag>{event.subtype}</Tag>
            </Tooltip>
          )}
          {event.status && (
            <Tag icon={STATUS_ICONS[event.status]} color={event.status === 'completed' ? 'success' : 'processing'}>
              {event.status}
            </Tag>
          )}
          {event.progress !== null && event.progress !== undefined && (
            <Badge
              count={
                <Progress
                  percent={event.progress}
                  size="small"
                  style={{ width: 80 }}
                  status={event.progress === 100 ? 'success' : 'active'}
                />
              }
            />
          )}
        </div>

        <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>
          📅 {event.eventDate}
          {event.operator && <span style={{ marginLeft: 16 }}>👤 {event.operator}</span>}
          {event.quantity !== null && (
            <span style={{ marginLeft: 16 }}>
              📦 {event.quantity} {event.unit ?? ''}
            </span>
          )}
        </div>

        {event.detail && typeof event.detail === 'object' && (
          <details style={{ fontSize: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#1677ff' }}>
              <ScissorOutlined /> 详细信息
            </summary>
            <pre
              style={{
                background: '#fff',
                padding: 8,
                marginTop: 4,
                borderRadius: 4,
                fontSize: 11,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(event.detail, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
