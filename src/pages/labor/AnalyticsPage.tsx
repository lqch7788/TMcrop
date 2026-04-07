/**
 * 运营分析聚合页面
 * 包含：人效分析、绩效考核、劳动风险预警、工作月报
 */

import { useState } from 'react';
import { TrendingUp, Award, AlertTriangle, FileText } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { EfficiencyPage } from '../../components/labor/efficiency/EfficiencyPage';
import { PerformancePage } from '../../components/labor/performance/PerformancePage';
import { RiskPage } from '../../components/labor/risk/RiskPage';
import { MonthlyReportPage } from '../../components/labor/monthly/MonthlyReportPage';

const TABS = [
  { key: 'efficiency', label: '人效分析', icon: TrendingUp },
  { key: 'performance', label: '绩效考核', icon: Award },
  { key: 'risk', label: '劳动风险预警', icon: AlertTriangle },
  { key: 'monthly-report', label: '工作月报', icon: FileText },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('efficiency');

  return (
    <div className="space-y-6">
      <TabHeader
        title="运营分析"
        subtitle="人效与绩效考核分析"
        icon={<TrendingUp className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'efficiency' && <EfficiencyPage />}
        {activeTab === 'performance' && <PerformancePage />}
        {activeTab === 'risk' && <RiskPage />}
        {activeTab === 'monthly-report' && <MonthlyReportPage />}
      </div>
    </div>
  );
}
