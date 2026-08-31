/**
 * v0.3 P0-B：纸单兜底录入工具
 *
 * 用途：班组长代填纸单内容（工人不会用手机时的 Plan B）
 * 路由：/agronomy/paper-report
 *
 * 设计原则：
 *   - 完全独立页面，不修改任何现有组件
 *   - 复用 P0-B 后端 API（POST /api/paper-report）
 *   - 支持 4 种常用纸单模板：pest_control / irrigation / fertilization / harvest
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Select,
  DatePicker,
  Space,
  message,
  Alert,
  Tag,
  Divider,
} from 'antd';
import { CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  submitPaperReport,
  getPaperTemplates,
  type PaperTemplate,
} from '@/services/apiPaperReportService';

const { TextArea } = Input;

export default function PaperReportPage() {
  const [templates, setTemplates] = useState<PaperTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('pest_control');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getPaperTemplates();
      setTemplates(data);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.warning(`模板加载失败：${m}`);
    }
  };

  const currentTemplate = templates.find((t) => t.operationType === selectedType);

  /**
   * 提交纸单
   */
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!values.paperBatchNo || !values.paperReporterId) {
      messageApi.warning('纸单批次号和代填人必填');
      return;
    }

    setLoading(true);
    try {
      const item = {
        operationType: selectedType,
        operationDate: (values.operationDate as dayjs.Dayjs).format('YYYY-MM-DD'),
        operatorName: String(values.operatorName),
        greenhouseName: values.greenhouseName as string | undefined,
        batchCode: values.batchCode as string | undefined,
        duration: values.duration as number | undefined,
        workload: values.workload as number | undefined,
        unit: values.unit as string | undefined,
        workers: values.workers as number | undefined,
        pesticideCode: values.pesticideCode as string | undefined,
        pesticideName: values.pesticideName as string | undefined,
        dosage: values.dosage as string | undefined,
        remarks: values.remarks as string | undefined,
        paperBatchNo: String(values.paperBatchNo),
        paperReporterId: String(values.paperReporterId),
      };

      const result = await submitPaperReport(item);
      messageApi.success(
        `✅ ${result.message}（记录号：${result.recordCode}）`
      );
      form.resetFields();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      messageApi.error(`提交失败：${m}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2>
          <FileTextOutlined style={{ marginRight: 8 }} />
          纸单兜底录入工具
        </h2>
        <Alert
          message="v0.3 P0-B 工具"
          description="工人不会用手机时，班组长可代填纸单内容。此工具独立运行，不影响现有功能。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 模板选择 */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <div>
            <span style={{ marginRight: 8 }}>作业类型：</span>
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ minWidth: 200 }}
            >
              {templates.map((t) => (
                <Select.Option key={t.operationType} value={t.operationType}>
                  {t.operationTypeName}
                </Select.Option>
              ))}
            </Select>
            {currentTemplate && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                模板：{currentTemplate.operationTypeName}
              </Tag>
            )}
          </div>
        </Space>

        <Divider />

        {/* 表单 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            operationDate: dayjs(),
          }}
        >
          {/* 纸单特有字段（始终显示） */}
          <Alert
            message="纸单信息"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item
            label="纸单批次号（手填编号）"
            name="paperBatchNo"
            rules={[{ required: true, message: '必填' }]}
          >
            <Input placeholder="如：P20260831-001" />
          </Form.Item>
          <Form.Item
            label="代填人（班组长 ID）"
            name="paperReporterId"
            rules={[{ required: true, message: '必填' }]}
          >
            <Input placeholder="如：leader_zhang" />
          </Form.Item>

          <Divider />

          {/* 动态渲染模板字段 */}
          <Alert
            message="作业信息"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          {currentTemplate ? (
            currentTemplate.fields.map((field) => {
              const isRequired = field.required;
              if (field.type === 'date') {
                return (
                  <Form.Item
                    key={field.key}
                    label={field.label + (isRequired ? ' *' : '')}
                    name={field.key}
                    rules={isRequired ? [{ required: true, message: '必填' }] : []}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                );
              }
              if (field.type === 'number') {
                return (
                  <Form.Item
                    key={field.key}
                    label={field.label + (isRequired ? ' *' : '')}
                    name={field.key}
                    rules={isRequired ? [{ required: true, message: '必填' }] : []}
                  >
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                );
              }
              if (field.type === 'textarea') {
                return (
                  <Form.Item
                    key={field.key}
                    label={field.label + (isRequired ? ' *' : '')}
                    name={field.key}
                    rules={isRequired ? [{ required: true, message: '必填' }] : []}
                  >
                    <TextArea rows={3} />
                  </Form.Item>
                );
              }
              return (
                <Form.Item
                  key={field.key}
                  label={field.label + (isRequired ? ' *' : '')}
                  name={field.key}
                  rules={isRequired ? [{ required: true, message: '必填' }] : []}
                >
                  <Input />
                </Form.Item>
              );
            })
          ) : (
            <Alert message="暂无模板" type="warning" showIcon />
          )}

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                icon={<CheckCircleOutlined />}
                loading={loading}
              >
                提交纸单
              </Button>
              <Button onClick={() => form.resetFields()}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
