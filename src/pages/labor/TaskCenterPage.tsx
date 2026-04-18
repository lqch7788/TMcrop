/**
 * 任务中心聚合页面
 * 包含：临时任务、任务执行、工作日志、智能派工、我的任务
 */

import { useState } from 'react';
import { ClipboardList, Play, BookMarked, Sparkles, User } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { TempTaskPage } from '../../components/labor/tempTask/TempTaskPage';
import { TasksPage } from '../../components/labor/tasks/TasksPage';
import { WorkLogPage } from '../../components/labor/worklog/WorkLogPage';
import { SmartDispatchPage } from '../../components/labor/dispatch/SmartDispatchPage';
import { MyTasksPage } from '../../components/labor/myTasks/MyTasksPage';

const TABS = [
  { key: 'temp-task', label: '临时任务处理', icon: ClipboardList },
  { key: 'task-execute', label: '任务执行', icon: Play },
  { key: 'work-log', label: '工作日志', icon: BookMarked },
  { key: 'smart-dispatch', label: '智能派工', icon: Sparkles },
  { key: 'my-tasks', label: '我的任务', icon: User },
];

export default function TaskCenterPage() {
  const [activeTab, setActiveTab] = useState('task-execute');

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
        {activeTab === 'temp-task' && <TempTaskPage />}
        {activeTab === 'task-execute' && <TasksPage />}
        {activeTab === 'work-log' && <WorkLogPage />}
        {activeTab === 'smart-dispatch' && <SmartDispatchPage />}
        {activeTab === 'my-tasks' && <MyTasksPage />}
      </div>
    </div>
  );
}
