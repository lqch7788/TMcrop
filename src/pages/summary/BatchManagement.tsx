/**
 * 批次管理页面 - 批次汇总/全链条追溯 二合一 TAB页
 * 架构：Component → Store → enhancedApiClient → Backend API
 */
import { useState } from 'react';
import { Layers, Link, ListTree } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '../../components/summary';
import BatchSummary from './BatchSummary';
import ChainTraceability from './ChainTraceability';

const TABS = [
  { key: 'batch', label: '批次汇总', icon: <Layers className="w-4 h-4" /> },
  { key: 'chain', label: '全链条追溯', icon: <Link className="w-4 h-4" /> },
];

export default function BatchManagement() {
  const [activeTab, setActiveTab] = useState('batch');

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<ListTree className="w-6 h-6 text-white" />}
        title="批次管理"
        description="种植批次全生命周期数据汇总与6环节全链条追溯"
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

        <TabsContent value="batch" className="mt-4">
          <BatchSummary hideHeader />
        </TabsContent>
        <TabsContent value="chain" className="mt-4">
          <ChainTraceability hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
