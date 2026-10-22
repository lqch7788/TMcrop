/**
 * 巡查计划详情抽屉（2026-10-21 P3）
 *
 * 内容：基本信息 + 检查项模板 + 统计卡 + 实例列表
 * 统计口径与后端 §8.3 一致（默认本月窗口，可切全周期）
 */
import React, { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '@/components/ui';
import {
  useInspectionPlanStore,
  parsePlanChecklist,
  describePlanFrequency,
  type InspectionPlan,
} from '@/stores/useInspectionPlanStore';
import { getInspectionTypeLabel } from '@/types/farm/common';
import { InspectionPlanOccurrenceTable } from './InspectionPlanOccurrenceTable';
import { showAlert } from '@/lib/dialogService';

interface Props {
  isOpen: boolean;
  plan: InspectionPlan | null;
  onClose: () => void;
  onEdit?: (plan: InspectionPlan) => void;
  onViewTask?: (taskId: string) => void;
  onViewRecord?: (recordId: string) => void;
  onSubmitRecord?: (taskId: string) => void;
  /** 2026-10-21 P5：跳到排班调度并预选任务 */
  onScheduleTask?: (taskId: string, date: string) => void;
}

export function InspectionPlanDetailDrawer({ isOpen, plan, onClose, onEdit, onViewTask, onViewRecord, onSubmitRecord, onScheduleTask }: Props) {
  const { fetchOccurrences, fetchStats, occurrences, stats, generateOccurrences, updatePlan, clearDetail } = useInspectionPlanStore();
  const [range, setRange] = useState<'month' | 'all'>('month');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !plan) return;
    void fetchOccurrences(plan.id);
    void fetchStats(plan.id, range === 'month' ? undefined : { from: plan.startDate, to: '2099-12-31' });
  }, [isOpen, plan?.id, range]);

  if (!isOpen || !plan) return null;

  const checklist = parsePlanChecklist(plan.checklist);
  const isPaused = plan.status === 'paused';

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await generateOccurrences(plan.id);
      if (!res) {
        showAlert('生成失败，请稍后重试');
        return;
      }
      const reasonCount = Object.keys(res.unscheduledReasons || {}).length;
      showAlert(
        `生成完成：新增 ${res.created.length} 条，跳过（已存在）${res.skipped.length} 条` +
        (res.scheduled ? `，已排班 ${res.scheduled} 条` : '') +
        (reasonCount ? `，${reasonCount} 条未排班` : '')
      );
      void fetchOccurrences(plan.id);
      void fetchStats(plan.id, range === 'month' ? undefined : { from: plan.startDate, to: '2099-12-31' });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePause = async () => {
    setBusy(true);
    try {
      const res = await updatePlan(plan.id, isPaused
        ? { status: 'active' }
        : { status: 'paused', pauseReason: '手工暂停' });
      if (!res) {
        showAlert('操作失败');
        return;
      }
      showAlert(isPaused
        ? `已恢复，新增实例 ${res.generate?.created.length ?? 0} 条`
        : `已暂停，取消未来实例 ${res.pause?.cancelledTasks.length ?? 0} 条`);
      void fetchOccurrences(plan.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { clearDetail(); onClose(); }} title={`巡查计划详情 - ${plan.planCode}`} size="xl" showFooter={false}>
      <div className="space-y-5 max-h-[68vh] overflow-y-auto px-1">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCell label="计划名称" value={plan.title} />
          <InfoCell label="巡查类型" value={getInspectionTypeLabel(plan.inspectionType)} />
          <InfoCell label="执行人" value={plan.assigneeName || '-'} />
          <InfoCell
            label="状态"
            value={
              <Badge className={isPaused ? 'bg-amber-100 text-amber-700' : plan.status === 'archived' ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}>
                {isPaused ? '已暂停' : plan.status === 'archived' ? '已归档' : '运行中'}
              </Badge>
            }
          />
          <InfoCell label="频率" value={describePlanFrequency(plan)} />
          <InfoCell label="周期" value={`${plan.startDate} ~ ${plan.endDate || '无限期'}`} />
          <InfoCell label="窗口/时长" value={`${plan.windowDays || 14} 天 / ${plan.durationHours || 1} 小时`} />
          <InfoCell label="巡查对象" value={plan.equipmentName || plan.infrastructureName || plan.greenhouseName || plan.area || '全基地'} />
        </div>

        {/* 检查项模板 */}
        {checklist.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">检查项模板（{checklist.length}）</h4>
            <div className="flex flex-wrap gap-2">
              {checklist.map((c, i) => (
                <span key={c.key || i} className="px-2 py-1 rounded bg-gray-100 text-xs text-slate-700">
                  {c.label || `检查项 ${i + 1}`}
                  {c.required && <span className="ml-1 text-red-500">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 统计卡 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700">执行统计</h4>
            <div className="flex gap-1">
              <Button size="sm" variant={range === 'month' ? 'default' : 'outline'} onClick={() => setRange('month')}>本月</Button>
              <Button size="sm" variant={range === 'all' ? 'default' : 'outline'} onClick={() => setRange('all')}>全周期</Button>
            </div>
          </div>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="应执行" value={stats.total} tone="text-slate-800" />
              <StatCard label="已提交记录" value={stats.submittedRecords} tone="text-emerald-600" />
              <StatCard label="缺记录" value={stats.missingRecords} tone={stats.missingRecords > 0 ? 'text-red-600' : 'text-slate-400'} />
              <StatCard label="执行率" value={`${stats.completionRate}%`} tone="text-blue-600" />
            </div>
          ) : (
            <p className="text-xs text-slate-400">统计加载中…</p>
          )}
        </div>

        {/* 实例列表 */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">实例任务（{occurrences.length}）</h4>
          <InspectionPlanOccurrenceTable
            occurrences={occurrences}
            onViewTask={onViewTask}
            onSubmitRecord={onSubmitRecord}
            onViewRecord={onViewRecord}
            onScheduleTask={onScheduleTask}
          />
        </div>
      </div>

      <div className="flex justify-between gap-2 mt-5 pt-3 border-t border-gray-100">
        <Button variant="outline" onClick={() => onEdit?.(plan)}>编辑</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTogglePause} disabled={busy || plan.status === 'archived'}>
            {isPaused ? '恢复计划' : '暂停计划'}
          </Button>
          <Button onClick={handleGenerate} disabled={busy || isPaused}>
            {busy ? '处理中…' : '生成排期'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-800 mt-0.5 break-words">{value}</div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-semibold mt-0.5 ${tone}`}>{value}</div>
    </div>
  );
}