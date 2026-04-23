/**
 * 农事任务中心 - FarmTaskHub
 * 农事管理的统一入口页面
 * 样式与 TaskDispatchPage 统一
 */

import React, { useState } from 'react';
import { useFarmHub, HubTab } from '../../hooks/useFarmHub';
import { FarmHubHeader } from '../../components/farm/hub/FarmHubHeader';
import { TaskTab } from '../../components/farm/hub/TaskTab';
import { ProblemTab } from '../../components/farm/hub/ProblemTab';
import { InspectionTab } from '../../components/farm/hub/InspectionTab';
import { OperationRecordPanel } from '../../components/farm/hub/OperationRecordPanel';
import { TaskDetailModal } from '../../components/farm/hub/TaskDetailModal';
import { VerifyTaskModal } from '../../components/farm/hub/VerifyTaskModal';
import { ProblemDispatchModal } from '../../components/farm/hub/ProblemDispatchModal';
import { InspectionDetailModal } from '../../components/farm/hub/InspectionDetailModal';
import { CreateTaskModal } from '../../components/farm/hub/CreateTaskModal';
import { Plus, Search, ClipboardList } from 'lucide-react';

// Tab配置
const TAB_CONFIG: { key: HubTab; label: string }[] = [
  { key: 'task', label: '任务管理' },
  { key: 'problem', label: '问题管理' },
  { key: 'inspection', label: '巡查记录' },
];

/**
 * 农事任务中心主组件
 */
export function FarmTaskHub() {
  const hub = useFarmHub();
  const [showRecordPanel, setShowRecordPanel] = useState(false);

  // 弹窗状态
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [dispatchProblemId, setDispatchProblemId] = useState<number | null>(null);
  const [detailInspectionId, setDetailInspectionId] = useState<string | null>(null);

  // 任务详情回调
  const handleTaskVerify = (taskId: string) => {
    setDetailTaskId(null);
    setVerifyTaskId(taskId);
  };

  // 问题分派回调
  const handleProblemDispatched = () => {
    setDispatchProblemId(null);
    hub.refresh();
  };

  // 巡查问题上报回调
  const handleInspectionReportProblem = (inspectionId: string) => {
    setDetailInspectionId(null);
    window.location.href = `/inspection?recordId=${inspectionId}&action=reportProblem`;
  };

  // 任务创建成功回调
  const handleTaskCreated = () => {
    setShowCreateTask(false);
    hub.refresh();
  };

  // 验收成功回调
  const handleVerified = () => {
    setVerifyTaskId(null);
    hub.refresh();
  };

  return (
    <div className="space-y-6">
      {/* 顶部统计看板 */}
        <FarmHubHeader
          stats={hub.state.stats}
          onOpenSmartDispatch={() => window.location.href = '/smart-dispatch'}
          onOpenDailyPlan={() => window.location.href = '/daily-planning'}
          onOpenMonthlyPlan={() => window.location.href = '/monthly-planning'}
        />

        {/* 搜索和快捷操作栏 */}
        <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* 搜索框 */}
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索任务/问题/巡查..."
                  value={hub.state.filters.search}
                  onChange={(e) => hub.setFilter('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* 快捷操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建任务
              </button>
              <button
                onClick={() => window.location.href = '/inspection'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建巡查
              </button>
            </div>
          </div>
        </div>

        {/* Tab切换 */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          {/* Tab 头部 */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => hub.setActiveTab(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    hub.state.activeTab === tab.key
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    hub.state.activeTab === tab.key
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.key === 'task' ? hub.tasks.length : tab.key === 'problem' ? hub.problems.length : hub.inspections.length}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab内容 */}
          <div className="p-4">
            {hub.state.activeTab === 'task' && (
              <TaskTab
                tasks={hub.getFilteredTasks()}
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters}
                onFilterChange={hub.setFilter}
                onResetFilters={hub.resetFilters}
                onViewTask={(taskId) => setDetailTaskId(taskId)}
                onCreateTask={() => setShowCreateTask(true)}
              />
            )}
            {hub.state.activeTab === 'problem' && (
              <ProblemTab
                problems={hub.getFilteredProblems()}
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters}
                onFilterChange={hub.setFilter}
                onResetFilters={hub.resetFilters}
                onDispatchProblem={(problemId) => setDispatchProblemId(problemId)}
              />
            )}
            {hub.state.activeTab === 'inspection' && (
              <InspectionTab
                inspections={hub.getFilteredInspections()}
                selectedIds={hub.state.selectedIds}
                onToggleSelect={hub.toggleSelect}
                onSelectAll={hub.selectAll}
                onClearSelection={hub.clearSelection}
                filters={hub.state.filters}
                onFilterChange={hub.setFilter}
                onResetFilters={hub.resetFilters}
                onViewInspection={(recordId) => setDetailInspectionId(recordId)}
              />
            )}
          </div>
        </div>

        {/* 今日操作记录 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-gray-400" />
              今日操作记录
            </h2>
            <button
              onClick={() => setShowRecordPanel(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              查看全部
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            {hub.state.recentRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无操作记录</p>
            ) : (
              <div className="space-y-3">
                {hub.state.recentRecords.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-start gap-3 text-sm">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      record.operatorType === 'system'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {record.operatorType === 'system' ? '系统' : record.operatorName}
                    </span>
                    <span className="text-gray-600 flex-1">{record.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* 操作记录面板 */}
      {showRecordPanel && (
        <OperationRecordPanel
          records={hub.state.recentRecords}
          onClose={() => setShowRecordPanel(false)}
        />
      )}

      {/* 新建任务弹窗 */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onCreated={handleTaskCreated}
        />
      )}

      {/* 任务详情弹窗 */}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onVerify={handleTaskVerify}
        />
      )}

      {/* 验收弹窗 */}
      {verifyTaskId && (
        <VerifyTaskModal
          taskId={verifyTaskId}
          onClose={() => setVerifyTaskId(null)}
          onVerified={handleVerified}
        />
      )}

      {/* 问题分派弹窗 */}
      {dispatchProblemId && (
        <ProblemDispatchModal
          problemId={dispatchProblemId}
          onClose={() => setDispatchProblemId(null)}
          onDispatched={handleProblemDispatched}
        />
      )}

      {/* 巡查详情弹窗 */}
      {detailInspectionId && (
        <InspectionDetailModal
          recordId={detailInspectionId}
          onClose={() => setDetailInspectionId(null)}
          onReportProblem={handleInspectionReportProblem}
        />
      )}
    </div>
  );
}

export default FarmTaskHub;
