/**
 * 考勤管理聚合页面
 * 包含：工人考勤、排班调度、请假管理、加班管理
 */

import { useState } from 'react';
import { Users, CalendarDays, Calendar, Clock } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { WorkerAttendancePage } from '../../components/labor/attendance/WorkerAttendancePage';
import { SchedulePage } from '../../components/labor/schedule/SchedulePage';
import { LeavePage } from '../../components/labor/leave/LeavePage';
import { OvertimePage } from '../../components/labor/overtime/OvertimePage';

const TABS = [
  { key: 'worker-attendance', label: '工人考勤', icon: Users },
  { key: 'schedule', label: '排班调度', icon: CalendarDays },
  { key: 'leave', label: '请假管理', icon: Calendar },
  { key: 'overtime', label: '加班管理', icon: Clock },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('worker-attendance');

  return (
    <div className="space-y-6">
      <TabHeader
        title="考勤管理"
        subtitle="工人考勤与排班调度"
        icon={<Users className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'worker-attendance' && <WorkerAttendancePage />}
        {activeTab === 'schedule' && <SchedulePage />}
        {activeTab === 'leave' && <LeavePage />}
        {activeTab === 'overtime' && <OvertimePage />}
      </div>
    </div>
  );
}
