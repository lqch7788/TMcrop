/**
 * 智能任务中心聚合页面
 * 包含：月度规划、每日规划、智能派工
 * 路径：/task-center（属于农事管理模块）
 * 工作流程：月度规划 → 每日规划 → 智能派工
 */

import { useState } from 'react';
import { ClipboardList, Sparkles, Calendar, Clock } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import SmartDispatchPage from '../../pages/SmartDispatch';
import MonthlyPlanningPage from '../../pages/MonthlyPlanningPage';
import DailyPlanningPage from '../../pages/DailyPlanningPage';

const TABS = [
  { key: 'monthly-planning', label: '月度规划', icon: Calendar },
  { key: 'daily-planning', label: '每日规划', icon: Clock },
  { key: 'smart-dispatch', label: '智能派工', icon: Sparkles },
];

export default function TaskCenterPage() {
  const [activeTab, setActiveTab] = useState('monthly-planning');

  return (
    <div className="space-y-6">
      <TabHeader
        title="智能任务中心"
        subtitle="AI智能规划与调度管理"
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'monthly-planning' && <MonthlyPlanningPage />}
        {activeTab === 'daily-planning' && <DailyPlanningPage />}
        {activeTab === 'smart-dispatch' && <SmartDispatchPage />}
      </div>
    </div>
  );
}
