/**
 * 智能任务中心聚合页面
 * 包含：月度规划、每日规划、智能派工、AI 智能助手（4 个 Tab）
 * 路径：/task-center（属于农事管理模块）
 * 工作流程：月度规划 → 每日规划 → 智能派工
 *
 * 2026-09-02 拆分：把 AI 智能助手从原 3 tab 中抽出，独立成第 4 个 tab
 *   - 月度规划 tab：仅显示 MonthlyPlanningPage
 *   - 每日规划 tab：仅显示 DailyPlanningPage
 *   - 智能派工 tab：仅显示 SmartDispatchPage
 *   - AI 智能助手 tab：任务下拉框 + AIPanel
 */

import { useState, useMemo } from 'react';
import { ClipboardList, Sparkles, Calendar, Clock, Bot } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { AIPanel } from '../../components/farm/ai/AIPanel';
import { useTasks } from '../../hooks/useTasks';
import SmartDispatchPage from '../../pages/SmartDispatch';
import MonthlyPlanningPage from '../../pages/MonthlyPlanningPage';
import DailyPlanningPage from '../../pages/DailyPlanningPage';

const TABS = [
  { key: 'monthly-planning', label: '月度规划', icon: Calendar },
  { key: 'daily-planning', label: '每日规划', icon: Clock },
  { key: 'smart-dispatch', label: '智能派工', icon: Sparkles },
  { key: 'ai-assistant', label: 'AI 智能助手', icon: Bot },
];

export default function TaskCenterPage() {
  const [activeTab, setActiveTab] = useState('monthly-planning');

  // AI 智能助手 tab 需要任务上下文，从 useTasks 拉取
  const { tasks: allTasks } = useTasks();
  const pendingTasks = useMemo(
    () => allTasks.filter(t => t.status === 'pending' || t.status === 'waiting_acceptance'),
    [allTasks],
  );
  const [quickSelectedTaskId, setQuickSelectedTaskId] = useState<string>('');
  const quickSelectedTask = useMemo(
    () => pendingTasks.find(t => t.id === quickSelectedTaskId),
    [pendingTasks, quickSelectedTaskId],
  );

  return (
    <div className="space-y-6">
      <TabHeader
        title="智能任务中心"
        subtitle="AI智能规划与调度管理"
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab内容区域 */}
      <div>
        {activeTab === 'monthly-planning' && <MonthlyPlanningPage />}
        {activeTab === 'daily-planning' && <DailyPlanningPage />}
        {activeTab === 'smart-dispatch' && <SmartDispatchPage />}
        {activeTab === 'ai-assistant' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-gray-700 shrink-0">
                  🎯 选择任务（AI 模块需要任务上下文）：
                </label>
                <select
                  value={quickSelectedTaskId}
                  onChange={(e) => setQuickSelectedTaskId(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">-- 请选择待派工任务（{pendingTasks.length} 条可选）--</option>
                  {pendingTasks.slice(0, 100).map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.status === 'waiting_acceptance' ? '待接受' : '待派工'}] {t.taskCode || t.id} | {t.title || t.typeName || t.type} | 温室:{t.greenhouseName || '-'}
                    </option>
                  ))}
                </select>
                {quickSelectedTask && (
                  <span className="text-xs text-emerald-600 font-medium">
                    ✅ 已选任务（type={quickSelectedTask.type}，greenhouse={quickSelectedTask.greenhouseId || '未关联'}）
                  </span>
                )}
              </div>
            </div>
            <AIPanel
              context="智能任务中心"
              taskId={quickSelectedTask?.id}
              taskType={quickSelectedTask?.type}
              greenhouseId={quickSelectedTask?.greenhouseId}
              priority={quickSelectedTask?.priority}
              batchId={quickSelectedTask?.batchId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
