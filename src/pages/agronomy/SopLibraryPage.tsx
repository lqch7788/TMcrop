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
  Modal,
  Input,
  InputNumber,
  message,
} from 'antd';
import { BookOutlined, ReloadOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons';
import {
  listSop,
  addSopStep,
  deleteSopStep,
  bindSopToTask,
  type Sop,
  type SopStep,
} from '@/services/apiSopLibraryService';
import { useFarmTaskStore } from '@/stores';

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

  // P0-7：SOP 步骤编辑 + 任务绑定
  const [stepTarget, setStepTarget] = useState<Sop | null>(null);
  const [stepForm, setStepForm] = useState({
    stepOrder: 1,
    stepTitle: '',
    stepContent: '',
    estimatedMinutes: 0,
    pesticideCode: '',
    dosage: '',
    dilutionRatio: '',
    safetyNotes: '',
  });
  const [savingStep, setSavingStep] = useState(false);

  const [bindTarget, setBindTarget] = useState<Sop | null>(null);
  const [bindTaskId, setBindTaskId] = useState<string | undefined>();
  const [bindType, setBindType] = useState<'recommended' | 'mandatory'>('recommended');
  const [savingBind, setSavingBind] = useState(false);

  const farmTasks = useFarmTaskStore((s) => s.tasks);
  const fetchFarmTasks = useFarmTaskStore((s) => s.fetchTasks);
  useEffect(() => {
    if (farmTasks.length === 0) void fetchFarmTasks();
  }, [farmTasks.length, fetchFarmTasks]);

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteSopStep(stepId);
      messageApi.success('步骤已删除');
      void loadSops();
    } catch (err: unknown) {
      messageApi.error(`删除失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const openStepModal = (sop: Sop) => {
    setStepTarget(sop);
    setStepForm({
      stepOrder: (sop.steps?.length ?? 0) + 1,
      stepTitle: '',
      stepContent: '',
      estimatedMinutes: 0,
      pesticideCode: '',
      dosage: '',
      dilutionRatio: '',
      safetyNotes: '',
    });
  };

  const handleSaveStep = async () => {
    if (!stepTarget) return;
    if (!stepForm.stepTitle.trim()) {
      messageApi.error('步骤标题必填');
      return;
    }
    setSavingStep(true);
    try {
      await addSopStep(stepTarget.id, {
        stepOrder: stepForm.stepOrder,
        stepTitle: stepForm.stepTitle.trim(),
        stepContent: stepForm.stepContent || undefined,
        estimatedMinutes: stepForm.estimatedMinutes || undefined,
        pesticideCode: stepForm.pesticideCode || undefined,
        dosage: stepForm.dosage || undefined,
        dilutionRatio: stepForm.dilutionRatio || undefined,
        safetyNotes: stepForm.safetyNotes || undefined,
      });
      messageApi.success('步骤已添加');
      setStepTarget(null);
      void loadSops();
    } catch (err: unknown) {
      messageApi.error(`添加失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingStep(false);
    }
  };

  const handleBind = async () => {
    if (!bindTarget) return;
    if (!bindTaskId) {
      messageApi.error('请选择任务');
      return;
    }
    setSavingBind(true);
    try {
      await bindSopToTask(bindTarget.id, bindTaskId, bindType);
      messageApi.success('已绑定到任务');
      setBindTarget(null);
      setBindTaskId(undefined);
    } catch (err: unknown) {
      messageApi.error(`绑定失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingBind(false);
    }
  };

  const loadSops = async () => {
    setLoading(true);
    try {
      const data = await listSop({
        cropCode: cropFilter,
        taskType: taskTypeFilter,
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
    // P0：useEffect 加 cancellation flag，防止路由切换时 await 完成 setState 触发 React 死循环
    // （修复：其他页面切到农事任务中心导致浏览器卡死）
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await listSop({
          cropCode: cropFilter,
          taskType: taskTypeFilter,
        });
        if (cancelled) return;
        setSops(data);
      } catch (err: unknown) {
        if (cancelled) return;
        const m = err instanceof Error ? err.message : String(err);
        messageApi.error(`加载失败：${m}`);
      } finally {
        // 组件已卸载时跳过 setState；不能在 finally 里 return，会吞掉 try/catch 的异常
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
                                      {step.id && (
                                        <Button
                                          size="small"
                                          type="text"
                                          danger
                                          onClick={() => handleDeleteStep(step.id!)}
                                          style={{ marginLeft: 8, fontSize: 12 }}
                                        >
                                          删除
                                        </Button>
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
                      {/* P0-7：步骤编辑 + 任务绑定 */}
                      <Space size={4} style={{ marginTop: 8 }}>
                        <Button size="small" icon={<PlusOutlined />} onClick={() => openStepModal(sop)}>
                          添加步骤
                        </Button>
                        <Button size="small" icon={<LinkOutlined />} onClick={() => setBindTarget(sop)}>
                          绑定任务
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* P0-7：添加步骤弹窗 */}
      <Modal
        title={`添加步骤 — ${stepTarget?.sopName ?? ''}`}
        open={!!stepTarget}
        onCancel={() => setStepTarget(null)}
        onOk={handleSaveStep}
        confirmLoading={savingStep}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space size={8}>
            <span>序号</span>
            <InputNumber
              min={1}
              value={stepForm.stepOrder}
              onChange={(v) => setStepForm((f) => ({ ...f, stepOrder: Number(v) || 1 }))}
              style={{ width: 80 }}
            />
            <span>预估分钟</span>
            <InputNumber
              min={0}
              value={stepForm.estimatedMinutes}
              onChange={(v) => setStepForm((f) => ({ ...f, estimatedMinutes: Number(v) || 0 }))}
              style={{ width: 100 }}
            />
          </Space>
          <Input
            placeholder="步骤标题（必填）"
            value={stepForm.stepTitle}
            onChange={(e) => setStepForm((f) => ({ ...f, stepTitle: e.target.value }))}
          />
          <Input.TextArea
            rows={3}
            placeholder="步骤内容"
            value={stepForm.stepContent}
            onChange={(e) => setStepForm((f) => ({ ...f, stepContent: e.target.value }))}
          />
          <Space size={8}>
            <Input
              placeholder="药剂编码"
              value={stepForm.pesticideCode}
              onChange={(e) => setStepForm((f) => ({ ...f, pesticideCode: e.target.value }))}
              style={{ width: 160 }}
            />
            <Input
              placeholder="用量"
              value={stepForm.dosage}
              onChange={(e) => setStepForm((f) => ({ ...f, dosage: e.target.value }))}
              style={{ width: 120 }}
            />
            <Input
              placeholder="稀释比"
              value={stepForm.dilutionRatio}
              onChange={(e) => setStepForm((f) => ({ ...f, dilutionRatio: e.target.value }))}
              style={{ width: 120 }}
            />
          </Space>
          <Input.TextArea
            rows={2}
            placeholder="安全提示"
            value={stepForm.safetyNotes}
            onChange={(e) => setStepForm((f) => ({ ...f, safetyNotes: e.target.value }))}
          />
        </Space>
      </Modal>

      {/* P0-7：绑定任务弹窗 */}
      <Modal
        title={`绑定到任务 — ${bindTarget?.sopName ?? ''}`}
        open={!!bindTarget}
        onCancel={() => setBindTarget(null)}
        onOk={handleBind}
        confirmLoading={savingBind}
        okText="绑定"
        cancelText="取消"
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 4 }}>选择任务</div>
            <Select
              showSearch
              optionFilterProp="label"
              value={bindTaskId}
              onChange={setBindTaskId}
              placeholder="选择要绑定的农事任务"
              style={{ width: '100%' }}
              options={farmTasks.slice(0, 300).map((t) => ({
                label: `${t.taskCode} · ${t.title}`,
                value: t.id,
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>绑定类型</div>
            <Select
              value={bindType}
              onChange={setBindType}
              style={{ width: '100%' }}
              options={[
                { label: '推荐', value: 'recommended' },
                { label: '强制', value: 'mandatory' },
              ]}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
