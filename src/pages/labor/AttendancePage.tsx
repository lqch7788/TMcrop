/**
 * 考勤管理聚合页面
 * 包含：工人考勤、请假管理、加班管理（排班调度已移入农事管理模块）
 */

import { useState } from 'react';
import { Users, Calendar, Clock } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { WorkerAttendancePage } from '../../components/labor/attendance/WorkerAttendancePage';
import { LeavePage } from '../../components/labor/leave/LeavePage';
import { OvertimePage } from '../../components/labor/overtime/OvertimePage';

const TABS = [
  { key: 'worker-attendance', label: '工人考勤', icon: Users },
  { key: 'leave', label: '请假管理', icon: Calendar },
  { key: 'overtime', label: '加班管理', icon: Clock },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('worker-attendance');

  return (
    <div className="space-y-6">
      <TabHeader
        title="考勤管理"
        subtitle="工人考勤、请假与加班管理"
        icon={<Users className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'worker-attendance' && <WorkerAttendancePage />}
        {activeTab === 'leave' && <LeavePage />}
        {activeTab === 'overtime' && <OvertimePage />}
      </div>
    </div>
  );
}
