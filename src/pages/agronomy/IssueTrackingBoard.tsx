/**
 * v0.3 P1-5：问题整改追踪看板
 *
 * 路由：/agronomy/issue-board
 *
 * 功能：
 *   - 5 列看板（待派/整改中/待复核/已闭环/已复发）
 *   - 拖拽暂未实现（v0.4+）
 *   - 整改进度条
 *   - 复检通过/不通过
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Empty,
  Spin,
  Tag,
  Space,
  Button,
  Modal,
  InputNumber,
  Input,
  Select,
  Progress,
  message,
} from 'antd';
import {
  AlertOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  getIssueBoard,
  rectifyIssue,
  recheckIssue,
  type Issue,
} from '@/services/apiIssueTrackingService';

const COLUMNS = [
  { key: 'pending', title: '待派', color: '#ffccc7', icon: <AlertOutlined /> },
  { key: 'inProgress', title: '整改中', color: '#ffe7ba', icon: <PlayCircleOutlined /> },
  { key: 'recheckPending', title: '待复核', color: '#b5e3ff', icon: <WarningOutlined /> },
  { key: 'closed', title: '已闭环', color: '#d9f7be', icon: <CheckCircleOutlined /> },
  { key: 'recurrence', title: '已复发', color: '#ffbb96', icon: <WarningOutlined /> },
];

export default function IssueTrackingBoard() {
  const [board, setBoard] = useState<Record<string, Issue[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [rectifyModal, setRectifyModal] = useState<{ open: boolean; issue?: Issue }>({
    open: false,
  });
  const [recheckModal, setRecheckModal] = useState<{ open: boolean; issue?: Issue }>({
    open: false,
  });
  const [progressValue, setProgressValue] = useState<number>(50);
  const [rectifyRemark, setRectifyRemark] = useState('');
  const [recheckResult, setRecheckResult] = useState<'pass' | 'fail'>('pass');
  const [recheckComment, setRecheckComment] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  const loadBoard = async () => {
    setLoading(true);
    try {
      const result = await getIssueBoard();
      setBoard(result.board);
      setCounts(result.counts);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.error(`加载失败：${m}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

  const handleRectify = async () => {
    if (!rectifyModal.issue) return;
    try {
      await rectifyIssue(rectifyModal.issue.id, {
        progress: progressValue,
        remark: rectifyRemark,
      });
      messageApi.success('✅ 整改已提交');
      setRectifyModal({ open: false });
      setRectifyRemark('');
      loadBoard();
    } catch (err: unknown) {
      messageApi.error('提交失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRecheck = async () => {
    if (!recheckModal.issue) return;
    try {
      await recheckIssue(recheckModal.issue.id, {
        result: recheckResult,
        comment: recheckComment,
      });
      messageApi.success(`✅ 复检${recheckResult === 'pass' ? '通过' : '未通过'}`);
      setRecheckModal({ open: false });
      setRecheckComment('');
      loadBoard();
    } catch (err: unknown) {
      messageApi.error('提交失败：' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <WarningOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
        <h2 style={{ margin: 0 }}>问题整改追踪看板</h2>
        <Space>
          <Tag color="orange">待派 {counts.pending ?? 0}</Tag>
          <Tag color="gold">整改中 {counts.inProgress ?? 0}</Tag>
          <Tag color="blue">待复核 {counts.recheckPending ?? 0}</Tag>
          <Tag color="green">已闭环 {counts.closed ?? 0}</Tag>
          <Tag color="red">已复发 {counts.recurrence ?? 0}</Tag>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadBoard}>
          刷新
        </Button>
      </div>

      <Spin spinning={loading}>
        <Row gutter={16}>
          {COLUMNS.map((col) => (
            <Col span={4} key={col.key}>
              <Card
                size="small"
                title={
                  <Space>
                    {col.icon}
                    {col.title}
                    <Tag color={col.color === '#ffccc7' ? 'red' : col.color === '#ffe7ba' ? 'orange' : col.color === '#b5e3ff' ? 'blue' : 'green'}>
                      {(board[col.key] ?? []).length}
                    </Tag>
                  </Space>
                }
                style={{ minHeight: 500, background: col.color }}
                styles={{ body: { padding: 8, maxHeight: '70vh', overflowY: 'auto' } }}
              >
                {(board[col.key] ?? []).length === 0 ? (
                  <Empty description="无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {(board[col.key] ?? []).map((issue) => (
                      <Card
                        key={issue.id}
                        size="small"
                        style={{ background: '#fff' }}
                        styles={{ body: { padding: 8 } }}
                      >
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag color="red">{issue.severity ?? '未分级'}</Tag>
                            <Tag>{issue.problemType ?? '其他'}</Tag>
                          </Space>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {issue.description?.slice(0, 50) ?? issue.id}
                          </div>
                          {issue.relatedBatchCode && (
                            <div style={{ fontSize: 11, color: '#888' }}>
                              批次：{issue.relatedBatchCode}
                            </div>
                          )}
                          {(issue.rectificationProgress ?? 0) > 0 && (
                            <Progress
                              percent={issue.rectificationProgress ?? 0}
                              size="small"
                              status={issue.rectificationProgress === 100 ? 'success' : 'active'}
                            />
                          )}
                          <Space size={4}>
                            {(issue.rectificationProgress ?? 0) < 100 && col.key !== 'recheckPending' && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => {
                                  setRectifyModal({ open: true, issue });
                                  setProgressValue(issue.rectificationProgress ?? 50);
                                }}
                              >
                                整改
                              </Button>
                            )}
                            {col.key === 'recheckPending' && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => {
                                  setRecheckModal({ open: true, issue });
                                }}
                              >
                                复检
                              </Button>
                            )}
                          </Space>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      {/* 整改弹窗 */}
      <Modal
        title={`整改：${rectifyModal.issue?.description?.slice(0, 30) ?? ''}`}
        open={rectifyModal.open}
        onOk={handleRectify}
        onCancel={() => setRectifyModal({ open: false })}
        okText="提交"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>整改进度：</div>
          <InputNumber
            min={0}
            max={100}
            value={progressValue}
            onChange={(v) => setProgressValue(v ?? 0)}
            style={{ width: '100%' }}
            addonAfter="%"
          />
          <div>备注：</div>
          <Input.TextArea
            value={rectifyRemark}
            onChange={(e) => setRectifyRemark(e.target.value)}
            rows={3}
          />
        </Space>
      </Modal>

      {/* 复检弹窗 */}
      <Modal
        title={`复检：${recheckModal.issue?.description?.slice(0, 30) ?? ''}`}
        open={recheckModal.open}
        onOk={handleRecheck}
        onCancel={() => setRecheckModal({ open: false })}
        okText="提交"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>复检结果：</div>
          <Select
            value={recheckResult}
            onChange={setRecheckResult}
            style={{ width: '100%' }}
          >
            <Select.Option value="pass">✅ 通过</Select.Option>
            <Select.Option value="fail">❌ 未通过</Select.Option>
          </Select>
          <div>意见：</div>
          <Input.TextArea
            value={recheckComment}
            onChange={(e) => setRecheckComment(e.target.value)}
            rows={3}
          />
        </Space>
      </Modal>
    </div>
  );
}
