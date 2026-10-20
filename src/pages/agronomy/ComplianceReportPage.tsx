/**
 * v0.3 P0-R + P0-S：合规报告查看页面
 *
 * 路由：/agronomy/compliance-report
 *
 * 功能：
 *   - 输入批次编号 → 生成合规报告
 *   - 显示 6 个 sections（批次信息、任务、作业、采收、巡查、问题、每日记录、合规摘要）
 *   - 合规摘要高亮显示警告
 *   - 下载 JSON / CSV
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Empty,
  Spin,
  Tabs,
  Tag,
  Statistic,
  Row,
  Col,
  Alert,
  message,
} from 'antd';
import { FileProtectOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  getComplianceReport,
  getComplianceDownloadUrl,
  type ComplianceReport,
  type ComplianceSummary,
} from '@/services/apiComplianceReportService';
// P1-1：Excel 导出（真 xlsx）
import { exportXlsx } from '@/services/exporters/xlsx';

export default function ComplianceReportPage() {
  const [batchCode, setBatchCode] = useState('');
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleGenerate = async () => {
    if (!batchCode.trim()) {
      messageApi.warning('请输入批次编号');
      return;
    }
    setLoading(true);
    try {
      const data = await getComplianceReport(batchCode.trim());
      setReport(data);
      messageApi.success('报告生成成功');
    } catch (err: unknown) {
      messageApi.error('生成失败：' + (err instanceof Error ? err.message : String(err)));
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const summary: ComplianceSummary | undefined = useMemo(
    () => report?.sections.complianceSummary as ComplianceSummary | undefined,
    [report]
  );

  const sectionKeys = report
    ? Object.keys(report.sections).filter((k) => k !== 'complianceSummary')
    : [];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <FileProtectOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
        <h2 style={{ margin: 0 }}>批次合规报告（P0-R + P0-S）</h2>
      </div>

      {/* 输入区 */}
      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="批次编号（如 ZZ20260619-003）"
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            onPressEnter={handleGenerate}
            style={{ width: 'calc(100% - 220px)' }}
            size="large"
          />
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={handleGenerate}
            loading={loading}
          >
            生成报告
          </Button>
        </Space.Compact>
      </Card>

      {/* 合规摘要（顶部） */}
      {summary && (
        <Card style={{ marginBottom: 16, background: '#fffbe6' }}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic title="检查项" value={summary.checksPerformed} suffix="项" />
            </Col>
            <Col span={4}>
              <Statistic
                title="通过"
                value={summary.checksPassed - summary.checksFailed}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="警告"
                value={summary.warnings.filter((w) => w.severity === 'warning').length}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="严重"
                value={summary.warnings.filter((w) => w.severity === 'critical').length}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={8}>
              <Alert
                message={summary.summary || '加载中'}
                type={
                  summary.warnings.some((w) => w.severity === 'critical')
                    ? 'error'
                    : summary.warnings.length > 0
                    ? 'warning'
                    : 'success'
                }
                showIcon
              />
            </Col>
          </Row>

          {/* 警告详情 */}
          {summary.warnings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4>⚠️ 警告详情（{summary.warnings.length}）</h4>
              {summary.warnings.map((w, i) => (
                <Alert
                  key={i}
                  message={`[${w.pesticideName}] ${w.checkType}`}
                  description={
                    <span>
                      <Tag
                        color={w.severity === 'critical' ? 'red' : 'orange'}
                        style={{ marginRight: 8 }}
                      >
                        {w.severity === 'critical' ? '严重' : '警告'}
                      </Tag>
                      {w.message}
                      {w.applicationDate && (
                        <span style={{ marginLeft: 8, color: '#888' }}>
                          发生于 {w.applicationDate}
                        </span>
                      )}
                    </span>
                  }
                  type={w.severity === 'critical' ? 'error' : 'warning'}
                  showIcon
                  style={{ marginBottom: 8 }}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 报告内容 */}
      <Spin spinning={loading}>
        {!report ? (
          <Card>
            <Empty description="请输入批次编号生成报告" />
          </Card>
        ) : (
          <Card
            title={
              <Space>
                <span>批次：{report.batchCode}</span>
                <span style={{ fontSize: 12, color: '#888' }}>
                  生成于 {new Date(report.generatedAt).toLocaleString()}
                </span>
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const url = getComplianceDownloadUrl(report.batchCode, 'json');
                    window.open(url, '_blank');
                  }}
                >
                  下载 JSON
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const url = getComplianceDownloadUrl(report.batchCode, 'csv');
                    window.open(url, '_blank');
                  }}
                >
                  下载 CSV
                </Button>
                {/* P1-1：Excel 导出（真 xlsx，多 sheet：投入品 / 病虫害 / 采收） */}
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    void exportReportExcel(report);
                  }}
                >
                  导出 Excel
                </Button>
              </Space>
            }
          >
            {/* P0-10：如实展示哪些段缺失，而不是让报告"看起来正常但空白" */}
            {(report.sectionsErrors?.length ?? 0) > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message={`本报告有 ${report.sectionsErrors!.length} 个数据段查询失败`}
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {report.sectionsErrors!.map((e, i) => (
                      <li key={i}>
                        <b>{SECTION_LABELS[e.section] ?? e.section}</b>：{e.message}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}

            <Tabs
              items={sectionKeys.map((k) => ({
                key: k,
                label: SECTION_LABELS[k] ?? k,
                children: <SectionView data={report.sections[k as keyof typeof report.sections]} />,
              }))}
            />
          </Card>
        )}
      </Spin>
    </div>
  );
}

/**
 * P1-1：导出合规生产档案为真 .xlsx（多 sheet）
 * - 投入品使用（肥料 + 农药）
 * - 病虫害发生与防治
 * - 收获记录
 */
async function exportReportExcel(report: ComplianceReport): Promise<void> {
  const pr = report.sections.productionRecord;
  if (!pr) {
    message.warning('该报告不含合规生产档案段');
    return;
  }

  const fertilizerRows = (pr.fertilizerUsage || []).map((r: Record<string, unknown>, i: number) => ({
    序号: i + 1,
    投入品名称: String(r.fertilizerName ?? r.fertilizer_name ?? ''),
    类型: String(r.fertilizerType ?? r.fertilizer_type ?? ''),
    来源: String(r.source ?? ''),
    用法: String(r.dilutionRatio ?? r.dilution_ratio ?? ''),
    用量: `${r.quantity ?? ''}${r.unit ?? ''}`,
    使用日期: String(r.useDate ?? r.use_date ?? r.fertilizeTime ?? ''),
    停用日期: String(r.stopUseDate ?? r.stop_use_date ?? ''),
    区域: String(r.areaName ?? r.area_name ?? r.greenhouseName ?? ''),
    操作人: String(r.operatorName ?? r.operator_name ?? ''),
  }));

  const pesticideRows = (pr.pesticideUsage || []).map((r: Record<string, unknown>, i: number) => ({
    序号: i + 1,
    投入品名称: String(r.pesticideName ?? r.pesticide_name ?? ''),
    类型: String(r.pesticideType ?? r.pesticide_type ?? ''),
    来源: String(r.source ?? ''),
    用法: String(r.applicationMethod ?? r.application_method ?? ''),
    用量: `${r.dosage ?? ''}${r.dosageUnit ?? r.dosage_unit ?? ''}`,
    防治对象: String(r.targetPest ?? r.target_pest ?? ''),
    使用日期: String(r.useDate ?? r.use_date ?? r.sprayTime ?? ''),
    停用日期: String(r.stopUseDate ?? r.stop_use_date ?? ''),
    区域: String(r.greenhouseName ?? r.greenhouse_name ?? ''),
    操作人: String(r.operatorName ?? r.operator_name ?? ''),
  }));

  const pestRows = (pr.pestOccurrences || []).map((r: Record<string, unknown>, i: number) => ({
    序号: i + 1,
    问题编号: String(r.problemCode ?? r.problem_code ?? ''),
    类型: String(r.problemType ?? r.problem_type ?? ''),
    发生情况: String(r.issueText ?? r.issue_text ?? r.description ?? ''),
    严重程度: String(r.issueSeverity ?? r.issue_severity ?? ''),
    发现日期: String(r.checkDate ?? r.check_date ?? ''),
    状态: String(r.status ?? ''),
    处理结果: String(r.handleResult ?? r.handle_result ?? ''),
    处理日期: String(r.handleDate ?? r.handle_date ?? ''),
  }));

  const harvestRows = (pr.harvests || []).map((r: Record<string, unknown>, i: number) => ({
    序号: i + 1,
    收获日期: String(r.harvestDate ?? r.harvest_date ?? ''),
    数量: `${r.harvestQuantity ?? r.harvest_quantity ?? ''}${r.unit ?? ''}`,
    等级: String(r.qualityGrade ?? r.quality_grade ?? ''),
    采收人: String(r.harvesterNames ?? r.harvester_names ?? ''),
    收购方: String(r.buyerName ?? r.buyer_name ?? ''),
  }));

  await exportXlsx({
    filename: `合规生产档案_${report.batchCode}.xlsx`,
    sheetName: '投入品使用',
    headers: ['序号', '投入品名称', '类型', '来源', '用法', '用量', '使用日期', '停用日期', '区域', '操作人'],
    rows: [...fertilizerRows, ...pesticideRows],
    sheets: [
      {
        name: '投入品使用',
        headers: ['序号', '投入品名称', '类型', '来源', '用法', '用量', '使用日期', '停用日期', '区域', '操作人'],
        rows: [...fertilizerRows, ...pesticideRows],
      },
      {
        name: '病虫害防治',
        headers: ['序号', '问题编号', '类型', '发生情况', '严重程度', '发现日期', '状态', '处理结果', '处理日期'],
        rows: pestRows,
      },
      {
        name: '收获记录',
        headers: ['序号', '收获日期', '数量', '等级', '采收人', '收购方'],
        rows: harvestRows,
      },
      {
        name: '留存说明',
        headers: ['项目', '内容'],
        rows: [
          { 项目: '批次', 内容: report.batchCode },
          { 项目: '留存至', 内容: pr.retentionUntil ?? '—' },
          { 项目: '依据', 内容: pr.retentionNote },
          { 项目: '生成时间', 内容: new Date(report.generatedAt).toLocaleString() },
        ],
      },
    ],
  });
}

const SECTION_LABELS: Record<string, string> = {
  batchInfo: '📦 批次信息',
  tasks: '📋 农事任务',
  operations: '🌱 作业流水',
  harvests: '🌾 采收',
  inspections: '🔍 巡查',
  problems: '⚠️ 问题',
  dailyRecords: '📅 每日记录',
  productionRecord: '📜 合规生产档案',
  sectionsErrors: '⛔ 数据缺失',
};

function SectionView({ data }: { data: unknown }) {
  if (!data) return <Empty description="无数据" />;
  const items = Array.isArray(data) ? data : [data];
  if (items.length === 0) return <Empty description="无数据" />;
  return (
    <pre
      style={{
        background: '#f5f5f5',
        padding: 12,
        borderRadius: 4,
        maxHeight: 400,
        overflow: 'auto',
        fontSize: 12,
      }}
    >
      {JSON.stringify(items, null, 2)}
    </pre>
  );
}
