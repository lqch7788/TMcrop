/**
 * 薪酬管理聚合页面
 * 包含：工资管理、计件工资、成本预测、预算申请
 */

import { useState } from 'react';
import { Banknote, Package, Calculator, FileSpreadsheet } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { SalaryPage } from '../../components/labor/salary/SalaryPage';
import { PieceworkPage } from '../../components/labor/piecework/PieceworkPage';
import { BudgetPage } from '../../components/labor/budget/BudgetPage';
import SalaryBudgetPage from '../../pages/labor/SalaryBudgetPage';

const TABS = [
  { key: 'salary', label: '工资管理', icon: Banknote },
  { key: 'piecework', label: '计件工资', icon: Package },
  { key: 'cost-forecast', label: '成本预测', icon: Calculator },
  { key: 'budget-apply', label: '预算申请', icon: FileSpreadsheet },
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
        {activeTab === 'cost-forecast' && <BudgetPage />}
        {activeTab === 'budget-apply' && <SalaryBudgetPage />}
      </div>
    </div>
  );
}
