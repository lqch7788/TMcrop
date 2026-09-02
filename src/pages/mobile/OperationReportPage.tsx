/**
 * v0.3 P0-3 移动端田间作业上报页（PWA H5）
 *
 * 路由：/m/operation-report
 *
 * 功能：
 *   1. 扫码（html5-qrcode）：识别 batch_code / 棚号
 *   2. 拉取该批次当日任务（farm-tasks）
 *   3. 选择作业类型 + 拍照 + 填物料
 *   4. 提交 → 后端 offline-sync API（联网直接提交）
 *
 * 设计原则：
 *   - 手机优先（大按钮 + 大字体，适合田间工人）
 *   - 独立页面，不修改任何现有功能
 *   - 离线时数据暂存 IndexedDB（v0.4+ 完整 PWA）
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Select,
  Input,
  Tag,
  Space,
  message,
  Card,
  Alert,
  Spin,
} from 'antd';
import { ScanOutlined, CameraOutlined, SendOutlined } from '@ant-design/icons';
import { syncOfflineQueue } from '@/services/apiOfflineSyncService';
import { enhancedApiClient } from '@/lib/apiClient';

const OPERATION_TYPES = [
  { value: 'planting', label: '🌱 种植' },
  { value: 'irrigation', label: '💧 灌溉' },
  { value: 'fertilization', label: '🧪 施肥' },
  { value: 'pest_control', label: '🛡️ 病虫害防治' },
  { value: 'pruning', label: '✂️ 修剪' },
  { value: 'harvest', label: '🌾 采收' },
  { value: 'weeding', label: '🌿 除草' },
  { value: 'farm_repair', label: '🔧 农场维护' },
  { value: 'other', label: '📌 其他' },
];

export default function OperationReportPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [batchCode, setBatchCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [opType, setOpType] = useState<string>('other');
  const [operatorName, setOperatorName] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 简易扫码：先支持手动输入 + 相机拍照（html5-qrcode 完整扫码后续增强）
  const loadTasks = async () => {
    if (!batchCode.trim()) {
      messageApi.warning('请先输入批次号或扫码');
      return;
    }
    setTasksLoading(true);
    try {
      const result = await enhancedApiClient.get<Array<Record<string, unknown>>>(
        `/farm-tasks?batchCode=${encodeURIComponent(batchCode.trim())}`
      );
      const list = Array.isArray(result) ? result : [];
      setTasks(list);
      messageApi.success(`找到 ${list.length} 个任务`);
    } catch (err: unknown) {
      messageApi.error('加载任务失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTasksLoading(false);
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submitReport = async () => {
    if (!operatorName.trim()) {
      messageApi.warning('请填写作业人姓名');
      return;
    }
    if (!batchCode.trim()) {
      messageApi.warning('请填写批次号');
      return;
    }
    setSubmitting(true);
    try {
      const item = {
        clientId: `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        clientCreatedAt: new Date().toISOString(),
        payload: {
          operationType: opType,
          operationTypeName: OPERATION_TYPES.find((o) => o.value === opType)?.label?.replace(/^[^\s]+\s/, '') ?? opType,
          status: 'completed',
          batchCode: batchCode.trim(),
          operatorName: operatorName.trim(),
          operationDate: new Date().toISOString().slice(0, 10),
          sourceType: selectedTask ? 'task' : 'manual',
          sourceId: selectedTask || undefined,
          photosAfter: photo ? [photo] : undefined,
          remarks: note || undefined,
          workers: 1,
          progress: 100,
        },
      };

      const result = await syncOfflineQueue([item]);
      if (result.totalCreated > 0) {
        messageApi.success('✅ 作业已上报');
        setBatchCode('');
        setOperatorName('');
        setNote('');
        setPhoto(null);
        setSelectedTask('');
        setTasks([]);
      } else if (result.totalDuplicate > 0) {
        messageApi.warning('该记录已上报过（去重）');
      } else {
        messageApi.error('上报失败：' + (result.results?.[0]?.error || '未知错误'));
      }
    } catch (err: unknown) {
      messageApi.error('上报失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, minHeight: '100vh', background: '#f7f8fa' }}>
      {contextHolder}

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>📱 田间作业上报</h2>
        <div style={{ color: '#888', fontSize: 12 }}>v0.3 移动端 · 扫码即可上报</div>
      </div>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 批次号 */}
        <Card size="small">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>1️⃣ 批次 / 棚号</div>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入批次号或棚号（如 ZZ20260619-003）"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              onPressEnter={loadTasks}
              size="large"
            />
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={loadTasks}
              size="large"
              loading={tasksLoading}
            >
              加载
            </Button>
          </Space.Compact>
        </Card>

        {/* 任务选择 */}
        {tasks.length > 0 && (
          <Card size="small">
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              2️⃣ 选择任务（可选）
            </div>
            <Select
              value={selectedTask}
              onChange={setSelectedTask}
              placeholder="选择关联任务（可选）"
              style={{ width: '100%' }}
              allowClear
            >
              {tasks.map((t) => (
                <Select.Option key={String(t.id)} value={String(t.id)}>
                  [{String(t.taskCode ?? '')}] {String(t.title ?? t.taskTitle ?? '')}
                </Select.Option>
              ))}
            </Select>
          </Card>
        )}

        {/* 作业信息 */}
        <Card size="small">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>3️⃣ 作业信息</div>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ fontSize: 13 }}>作业类型 *</div>
            <Select
              value={opType}
              onChange={setOpType}
              style={{ width: '100%' }}
            >
              {OPERATION_TYPES.map((o) => (
                <Select.Option key={o.value} value={o.value}>
                  {o.label}
                </Select.Option>
              ))}
            </Select>

            <div style={{ fontSize: 13, marginTop: 4 }}>作业人 *</div>
            <Input
              placeholder="填写作业人姓名"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              size="large"
            />

            <div style={{ fontSize: 13, marginTop: 4 }}>备注</div>
            <Input.TextArea
              rows={2}
              placeholder="如：3号棚浇了2小时"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Space>
        </Card>

        {/* 拍照 */}
        <Card size="small">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>4️⃣ 现场拍照（可选）</div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          <Button
            block
            size="large"
            icon={<CameraOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            {photo ? '重新拍照' : '拍照'}
          </Button>
          {photo && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <img src={photo} alt="作业现场" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
            </div>
          )}
        </Card>

        {/* 提交 */}
        <Button
          type="primary"
          size="large"
          block
          icon={<SendOutlined />}
          onClick={submitReport}
          loading={submitting}
          style={{ height: 48, fontSize: 16 }}
        >
          提交作业记录
        </Button>

        <Alert
          message="离线说明"
          description="当前为在线直报模式。弱网/离线时请使用「纸单录入」或在网络恢复后重试。"
          type="info"
          showIcon
        />

        <Button block onClick={() => navigate(-1)}>返回</Button>
      </Space>
    </div>
  );
}
