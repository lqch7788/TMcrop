/**
 * 经营分析页面 - 产量分析/成本分析/人工分析/多维度对比 四合一 TAB页
 * 架构：Component → Store → enhancedApiClient → Backend API
 * V10.0: 新增第4个TAB「多维度对比」
 */
import { useState, lazy, Suspense } from 'react';
import { TrendingUp, DollarSign, Users, BarChart3, GitCompare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { PageHeader } from '../../components/summary';
import { useAuthStore } from '../../stores';
import { useSummaryDataStore } from '../../stores/useSummaryDataStore';
import YieldAnalysis from './YieldAnalysis';
import CostAnalysis from './CostAnalysis';
import LaborAnalysis from './LaborAnalysis';

const ComparisonPanel = lazy(() => import('../../components/summary/ComparisonPanel'));

const TABS = [
  { key: 'yield', label: '产量分析', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'cost', label: '成本分析', icon: <DollarSign className="w-4 h-4" /> },
  { key: 'labor', label: '人工分析', icon: <Users className="w-4 h-4" /> },
  { key: 'comparison', label: '多维度对比', icon: <GitCompare className="w-4 h-4" /> },
];

export default function BusinessAnalysis() {
  const [activeTab, setActiveTab] = useState('yield');

  // 2026-10-25：统计口径 —— 当前基地（默认）/ 全局（仅 admin 可见可选）
  //   与汇总看板共用同一个 Store 字段，切换后两边口径一致。
  const userRoles = useAuthStore((s) => s.roles);
  const isAdmin = userRoles.some((r) =>
    ['admin', 'administrators', 'super_admin'].includes((r.code || '').toLowerCase())
  );
  const statsScope = useSummaryDataStore((s) => s.statsScope);
  const setStatsScope = useSummaryDataStore((s) => s.setStatsScope);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<BarChart3 className="w-6 h-6 text-white" />}
        title="经营分析"
        description="产量·成本·人工·多维度对比，四位一体把控种植经营"
      />

      {isAdmin && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>统计范围</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {([
              ['base', '当前基地'],
              ['global', '全部基地（全局）'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatsScope(value)}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${statsScope === value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* key={statsScope}：切换统计口径后强制子组件重新挂载并重新取数 */}
      <Tabs key={statsScope} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 flex-wrap">
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
        <TabsContent value="comparison" className="mt-4">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ComparisonPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
