/**
 * v0.3 P0-2 快速完成任务工具页面
 *
 * 用途：工人/班组长快速标记任务完成（不进入任务详情）
 * 路由：/agronomy/quick-complete
 *
 * 设计原则：
 *   - 完全独立页面
 *   - 0 修改任何现有组件
 *   - 复用 P0-2 后端 API（POST /api/farm-tasks/:id/complete）
 */

import { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  message,
  Alert,
  Tag,
  Statistic,
  Progress,
} from 'antd';
import { CheckCircleOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { enhancedApiClient } from '@/lib/apiClient';
import { completeTask, updateTaskProgress } from '@/services/apiTaskProgressService';

interface TaskInfo {
  id: string;
  taskCode: string;
  taskTitle: string;
  status: string;
  progress?: number;
  assigneeName: string;
  planDate: string;
}

export default function QuickTaskCompletePage() {
  const [taskId, setTaskId] = useState('');
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPct, setCustomPct] = useState<number>(100);
  const [messageApi, contextHolder] = message.useMessage();

  /**
   * 查询任务信息
   */
  const fetchTask = async () => {
    if (!taskId.trim()) {
      messageApi.warning('请输入任务 ID 或任务编号');
      return;
    }
    setLoading(true);
    try {
      const result = await enhancedApiClient.get<TaskInfo>(
        `/farm-tasks/${encodeURIComponent(taskId.trim())}`
      );
      setTaskInfo(result);
      setCustomPct(result.progress ?? 0);
      messageApi.success(`已加载任务：${result.taskTitle}`);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.error(`查询失败：${m}`);
      setTaskInfo(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 一键标记完成（100%）
   */
  const handleComplete = async () => {
    if (!taskInfo) return;
    setLoading(true);
    try {
      const result = await completeTask(taskInfo.id);
      messageApi.success(
        `✅ 已完成！进度 ${result.progressPct}%${result.autoCompleted ? '（自动完成）' : ''}`
      );
      // 刷新任务信息
      await fetchTask();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.error(`完成失败：${m}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 增量更新进度
   */
  const handleUpdateProgress = async () => {
    if (!taskInfo) return;
    if (customPct < 0 || customPct > 100) {
      messageApi.warning('进度必须在 0-100');
      return;
    }
    setLoading(true);
    try {
      const result = await updateTaskProgress(taskInfo.id, customPct);
      messageApi.success(
        `✅ 进度已更新为 ${result.progressPct}%${result.autoCompleted ? '（已自动完成）' : ''}`
      );
      await fetchTask();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.error(`更新失败：${m}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2>
          <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          快速完成任务工具
        </h2>
        <Alert
          message="v0.3 P0-2 工具"
          description="输入任务 ID 或任务编号，快速查询并标记完成。此工具独立于任务详情页，不影响任何现有 UI。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 查询区 */}
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="任务 ID 或任务编号（如 T-20260831-001）"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            onPressEnter={fetchTask}
            style={{ width: 'calc(100% - 160px)' }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={fetchTask}
            loading={loading}
          >
            查询
          </Button>
        </Space.Compact>

        {/* 任务信息 */}
        {taskInfo && (
          <Card type="inner" title="任务信息" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <strong>任务标题：</strong>
                {taskInfo.taskTitle}
              </div>
              <Space wrap>
                <Tag color="blue">{taskInfo.taskCode}</Tag>
                <Tag
                  color={
                    taskInfo.status === 'completed'
                      ? 'success'
                      : taskInfo.status === 'in_progress'
                      ? 'processing'
                      : 'default'
                  }
                >
                  {taskInfo.status}
                </Tag>
                {taskInfo.assigneeName && <Tag>{taskInfo.assigneeName}</Tag>}
                {taskInfo.planDate && <Tag>{taskInfo.planDate}</Tag>}
              </Space>

              {/* 进度展示 */}
              <div>
                <Statistic
                  title="当前进度"
                  value={taskInfo.progress ?? 0}
                  suffix="%"
                />
                <Progress
                  percent={taskInfo.progress ?? 0}
                  status={
                    taskInfo.progress === 100
                      ? 'success'
                      : taskInfo.progress > 50
                      ? 'active'
                      : 'normal'
                  }
                />
              </div>

              {/* 操作区 */}
              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleComplete}
                  loading={loading}
                  disabled={taskInfo.status === 'completed'}
                >
                  {taskInfo.status === 'completed' ? '已完成' : '一键完成（100%）'}
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchTask()}
                  disabled={loading}
                >
                  刷新
                </Button>
              </Space>

              {/* 自定义进度（高级） */}
              <Alert
                message="高级：自定义进度"
                description={
                  <Space>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={customPct}
                      onChange={(e) => setCustomPct(Number(e.target.value))}
                      style={{ width: 100 }}
                      addonAfter="%"
                    />
                    <Button onClick={handleUpdateProgress} loading={loading}>
                      更新进度（只增不减）
                    </Button>
                  </Space>
                }
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
              />
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
}
