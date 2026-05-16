/**
 * 经营分析页面 - 产量分析/成本分析/人工分析 三合一 TAB页
 * 架构：Component → Store → enhancedApiClient → Backend API
 */
import { useState } from 'react';
import { TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '../../components/summary';
import YieldAnalysis from './YieldAnalysis';
import CostAnalysis from './CostAnalysis';
import LaborAnalysis from './LaborAnalysis';

const TABS = [
  { key: 'yield', label: '产量分析', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'cost', label: '成本分析', icon: <DollarSign className="w-4 h-4" /> },
  { key: 'labor', label: '人工分析', icon: <Users className="w-4 h-4" /> },
];

export default function BusinessAnalysis() {
  const [activeTab, setActiveTab] = useState('yield');

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<BarChart3 className="w-6 h-6 text-white" />}
        title="经营分析"
        description="产量·成本·人工综合分析，三位一体把控种植经营"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="yield" className="mt-4">
          <YieldAnalysis hideHeader />
        </TabsContent>
        <TabsContent value="cost" className="mt-4">
          <CostAnalysis hideHeader />
        </TabsContent>
        <TabsContent value="labor" className="mt-4">
          <LaborAnalysis hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
