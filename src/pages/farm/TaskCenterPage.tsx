/**
 * 智能任务中心聚合页面
 * 包含：月度规划、每日规划、智能派工
 * 路径：/task-center（属于农事管理模块）
 * 工作流程：月度规划 → 每日规划 → 智能派工
 *
 * 2026-08-24 PR7：顶部加 AIPanel 共享入口（覆盖 AI-04 生长预测 + AI-13 报告生成 + AI-12 问答）
 * 智能派工 tab 已内嵌 SmartDispatchPage，自带 AIPanel（覆盖 AI-01/06 等）
 */

import { useState } from 'react';
import { ClipboardList, Sparkles, Calendar, Clock } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { AIPanel } from '../../components/farm/ai/AIPanel';
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

      {/* ★ 2026-08-24 PR7：AIPanel 共享入口（覆盖月度/每日规划 tab 的 AI-04/05/10/13/14） */}
      {/*   智能派工 tab 自带 AIPanel（SmartDispatchPage 内部），此处省略避免重复 */}
      {activeTab !== 'smart-dispatch' && (
        <AIPanel context="智能任务中心" />
      )}

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'monthly-planning' && <MonthlyPlanningPage />}
        {activeTab === 'daily-planning' && <DailyPlanningPage />}
        {activeTab === 'smart-dispatch' && <SmartDispatchPage />}
      </div>
    </div>
  );
}
