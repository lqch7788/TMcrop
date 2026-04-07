/**
 * 人事管理聚合页面
 * 包含：员工信息、临时工入职、招聘管理、入职办理、班组分配、合同管理、技能档案
 */

import { useState } from 'react';
import { Users, UserPlus, Briefcase, GraduationCap, Folder, FileSignature, Award } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { PersonnelManagementPage } from '../../components/labor/personnel/PersonnelManagementPage';
import { TempWorkerPage } from '../../components/labor/tempWorker/TempWorkerPage';
import { RecruitmentPage } from '../../components/labor/recruitment/RecruitmentPage';
import { OnboardingPage } from '../../components/labor/onboarding/OnboardingPage';
import { TeamTable } from '../../components/labor/team/TeamTable';
import { ContractTable } from '../../components/labor/contract/ContractTable';
import { SkillPage } from '../../components/labor/skill/SkillPage';

const TABS = [
  { key: 'staff', label: '员工信息', icon: Users },
  { key: 'temp-worker', label: '临时工入职', icon: UserPlus },
  { key: 'recruitment', label: '招聘管理', icon: Briefcase },
  { key: 'onboarding', label: '入职办理', icon: GraduationCap },
  { key: 'team', label: '班组分配', icon: Folder },
  { key: 'contract', label: '合同管理', icon: FileSignature },
  { key: 'skill', label: '技能档案', icon: Award },
];

export default function PersonnelPage() {
  const [activeTab, setActiveTab] = useState('staff');

  return (
    <div className="space-y-6">
      <TabHeader
        title="人事管理"
        subtitle="员工信息与入职流程管理"
        icon={<Users className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'staff' && <PersonnelManagementPage />}
        {activeTab === 'temp-worker' && <TempWorkerPage />}
        {activeTab === 'recruitment' && <RecruitmentPage />}
        {activeTab === 'onboarding' && <OnboardingPage />}
        {activeTab === 'team' && <TeamTable />}
        {activeTab === 'contract' && <ContractTable />}
        {activeTab === 'skill' && <SkillPage />}
      </div>
    </div>
  );
}
