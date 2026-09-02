/**
 * v0.3 农事工具快捷入口卡片
 * Dashboard 集成：在 Dashboard 显示 8 个 v0.3 工具的快捷入口
 *
 * 设计原则：
 *   - 完全独立新组件（不修改任何现有卡片）
 *   - 仅追加到 Dashboard
 *   - 用户点击直达 v0.3 工具页
 */

import { Card, Space, Tag, Tooltip } from 'antd';
import {
  BookOutlined,
  AlertOutlined,
  BellOutlined,
  DollarOutlined,
  FileProtectOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const TOOLS = [
  {
    key: 'sop',
    label: 'SOP 标准库',
    desc: '60 个多作物作业程序',
    icon: <BookOutlined style={{ color: '#1677ff' }} />,
    path: '/agronomy/sop-library',
    tag: 'P1-1',
  },
  {
    key: 'issue',
    label: '问题整改看板',
    desc: '5 列整改追踪',
    icon: <AlertOutlined style={{ color: '#fa8c16' }} />,
    path: '/agronomy/issue-board',
    tag: 'P1-5',
  },
  {
    key: 'reminder',
    label: '智能提醒',
    desc: '规则引擎 + 任务超期',
    icon: <BellOutlined style={{ color: '#52c41a' }} />,
    path: '/agronomy/reminders',
    tag: 'P1-2',
  },
  {
    key: 'cost',
    label: '批次成本',
    desc: '物料/人工/外包分析',
    icon: <DollarOutlined style={{ color: '#eb2f96' }} />,
    path: '/agronomy/batch-cost',
    tag: 'P1-4',
  },
  {
    key: 'compliance',
    label: '合规报告',
    desc: '监管导出 + 数据血缘',
    icon: <FileProtectOutlined style={{ color: '#722ed1' }} />,
    path: '/agronomy/compliance-report',
    tag: 'P0-R',
  },
  {
    key: 'backup',
    label: '数据备份',
    desc: '每日/每月自动备份',
    icon: <DatabaseOutlined style={{ color: '#13c2c2' }} />,
    path: '/agronomy/backup-center',
    tag: 'P2-X',
  },
  {
    key: 'quick',
    label: '快速完成任务',
    desc: '工人任务完成工具',
    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    path: '/agronomy/quick-complete',
    tag: 'P0-2',
  },
  {
    key: 'paper',
    label: '纸单录入',
    desc: '纸单兜底代填',
    icon: <FileTextOutlined style={{ color: '#fa541c' }} />,
    path: '/agronomy/paper-report',
    tag: 'P0-B',
  },
];

export function V3QuickAccessCard() {
  const navigate = useNavigate();

  return (
    <Card
      title={
        <Space>
          <span>v0.3 农事管理工具集</span>
          <Tag color="blue">{TOOLS.length} 个</Tag>
        </Space>
      }
      extra={
        <a
          onClick={(e) => {
            e.preventDefault();
            navigate('/agronomy/other-management');
          }}
        >
          进入「其他管理」 <RightOutlined />
        </a>
      }
      size="small"
      styles={{ body: { padding: 16 } }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {TOOLS.map((tool) => (
          <Tooltip key={tool.key} title={tool.desc} placement="top">
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(tool.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(tool.path);
                }
              }}
              style={{
                padding: '12px 8px',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'center',
                background: '#fafafa',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e6f4ff';
                e.currentTarget.style.borderColor = '#91caff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fafafa';
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{tool.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{tool.label}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                <Tag color="geekblue" style={{ fontSize: 10, margin: 0 }}>
                  {tool.tag}
                </Tag>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>
    </Card>
  );
}

export default V3QuickAccessCard;
