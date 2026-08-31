/**
 * v0.3 其他管理聚合页面
 *
 * 路由：/agronomy/other-management
 *
 * 功能：把 8 个 v0.3 工具页合并为 8 个 Tab，统一入口
 *
 * Tab 列表：
 *   1. SOP 标准库     - SopLibraryPage
 *   2. 问题整改       - IssueTrackingBoard
 *   3. 提醒规则       - ReminderRulesPage
 *   4. 批次成本       - BatchCostAnalysisPage
 *   5. 合规报告       - ComplianceReportPage
 *   6. 数据备份       - BackupCenterPage
 *   7. 快速完成       - QuickTaskCompletePage
 *   8. 纸单录入       - PaperReportPage
 */

import { Tabs } from 'antd';
import {
  BookOutlined,
  AlertOutlined,
  BellOutlined,
  DollarOutlined,
  FileProtectOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import SopLibraryPage from './SopLibraryPage';
import IssueTrackingBoard from './IssueTrackingBoard';
import ReminderRulesPage from './ReminderRulesPage';
import BatchCostAnalysisPage from './BatchCostAnalysisPage';
import ComplianceReportPage from './ComplianceReportPage';
import BackupCenterPage from './BackupCenterPage';
import QuickTaskCompletePage from './QuickTaskCompletePage';
import PaperReportPage from './PaperReportPage';

export default function OtherManagementPage() {
  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>其他管理</h2>
        <span style={{ color: '#888', fontSize: 13 }}>v0.3 农事管理扩展工具</span>
      </div>

      <Tabs
        defaultActiveKey="sop"
        destroyInactiveTabPane={false}
        items={[
          {
            key: 'sop',
            label: (
              <span>
                <BookOutlined style={{ marginRight: 6 }} />
                SOP 标准库
              </span>
            ),
            children: <SopLibraryPage />,
          },
          {
            key: 'issue',
            label: (
              <span>
                <AlertOutlined style={{ marginRight: 6 }} />
                问题整改
              </span>
            ),
            children: <IssueTrackingBoard />,
          },
          {
            key: 'reminders',
            label: (
              <span>
                <BellOutlined style={{ marginRight: 6 }} />
                提醒规则
              </span>
            ),
            children: <ReminderRulesPage />,
          },
          {
            key: 'cost',
            label: (
              <span>
                <DollarOutlined style={{ marginRight: 6 }} />
                批次成本
              </span>
            ),
            children: <BatchCostAnalysisPage />,
          },
          {
            key: 'compliance',
            label: (
              <span>
                <FileProtectOutlined style={{ marginRight: 6 }} />
                合规报告
              </span>
            ),
            children: <ComplianceReportPage />,
          },
          {
            key: 'backup',
            label: (
              <span>
                <DatabaseOutlined style={{ marginRight: 6 }} />
                数据备份
              </span>
            ),
            children: <BackupCenterPage />,
          },
          {
            key: 'quick-complete',
            label: (
              <span>
                <CheckCircleOutlined style={{ marginRight: 6 }} />
                快速完成
              </span>
            ),
            children: <QuickTaskCompletePage />,
          },
          {
            key: 'paper',
            label: (
              <span>
                <FileTextOutlined style={{ marginRight: 6 }} />
                纸单录入
              </span>
            ),
            children: <PaperReportPage />,
          },
        ]}
      />
    </div>
  );
}
