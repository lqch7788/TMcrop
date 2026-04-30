/**
 * 薪酬管理聚合页面
 * 包含：工资管理、计件工资、工资预算
 */

import { useState } from 'react';
import { Banknote, Package, Calculator } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { SalaryPage } from '../../components/labor/salary/SalaryPage';
import { PieceworkPage } from '../../components/labor/piecework/PieceworkPage';
import { BudgetPage } from '../../components/labor/budget/BudgetPage';

const TABS = [
  { key: 'salary', label: '工资管理', icon: Banknote },
  { key: 'piecework', label: '计件工资', icon: Package },
  { key: 'budget', label: '工资预算', icon: Calculator },
];

export default function CompensationPage() {
  const [activeTab, setActiveTab] = useState('salary');

  return (
    <div className="space-y-6">
      <TabHeader
        title="薪酬管理"
        subtitle="工资与计件薪酬管理"
        icon={<Banknote className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'salary' && <SalaryPage />}
        {activeTab === 'piecework' && <PieceworkPage />}
        {activeTab === 'budget' && <BudgetPage />}
      </div>
    </div>
  );
}
