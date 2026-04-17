/**
 * 任务中心聚合页面
 * 包含：工作日志、智能派工、我的任务
 * 路径变更：从 /labor/task-center 移至 /task-center（属于农事管理模块）
 */

import { useState } from 'react';
import { ClipboardList, BookMarked, Sparkles, User } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { WorkLogPage } from '../../components/labor/worklog/WorkLogPage';
import { SmartDispatchPage } from '../../components/labor/dispatch/SmartDispatchPage';
import { MyTasksPage } from '../../components/labor/myTasks/MyTasksPage';

const TABS = [
  { key: 'my-tasks', label: '我的任务', icon: User },
  { key: 'work-log', label: '工作日志', icon: BookMarked },
  { key: 'smart-dispatch', label: '智能派工', icon: Sparkles },
];

export default function TaskCenterPage() {
  const [activeTab, setActiveTab] = useState('my-tasks');

  return (
    <div className="space-y-6">
      <TabHeader
        title="任务中心"
        subtitle="任务调度与工作日志管理"
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'work-log' && <WorkLogPage />}
        {activeTab === 'smart-dispatch' && <SmartDispatchPage />}
        {activeTab === 'my-tasks' && <MyTasksPage />}
      </div>
    </div>
  );
}
