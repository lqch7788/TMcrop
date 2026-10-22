/**
 * 巡查计划详情弹窗（2026-10-21 P3 / 2026-10-22 审核返修）
 *
 * 内容：基本信息 + 检查项模板 + 统计卡 + 实例列表
 * 统计口径与后端 §8.3 完全一致（8 项指标，默认本月窗口，可切全周期）。
 *
 * 审核返修（2026-10-22）：
 *   · 文件名由 *DetailDrawer 改为 *DetailModal —— 实现是 Modal，原名误导后来者以为有侧滑抽屉
 *     （系统里真正的抽屉是 components/ui/Drawer.tsx，业务侧没有详情抽屉先例）
 *   · 统计卡补全 §8.3 的 8 项（原实现只有 total/已提交/缺记录/执行率 4 项，
 *     且 total 把 cancelled 也算进去，导致「应执行」虚高）
 *   · footer 对齐系统（size="sm" + variant="secondary" + 无内层双滚动）
 *   · 状态徽章改模块 span 写法并复用 PLAN_STATUS_MAP
 */
import React, { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import {
  useInspectionPlanStore,
  parsePlanChecklist,
  describePlanFrequency,
  type InspectionPlan,
  type PlanStats,
} from '@/stores/useInspectionPlanStore';
import { getInspectionTypeLabel } from '@/types/farm/common';
import { InspectionPlanOccurrenceTable } from './InspectionPlanOccurrenceTable';
import { PLAN_STATUS_MAP } from './InspectionPlanPanel';
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

export function InspectionPlanDetailModal({
  isOpen, plan, onClose, onEdit, onViewTask, onViewRecord, onSubmitRecord, onScheduleTask,
}: Props) {
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
  const st = PLAN_STATUS_MAP[plan.status || 'active'] || PLAN_STATUS_MAP.active;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await generateOccurrences(plan.id);
      if (!res) {
        showAlert(`生成失败：${useInspectionPlanStore.getState().error || '请稍后重试'}`);
        return;
      }
      // 2026-10-22（审核 P2-7）：blockedReason 必须显示，
      //   否则归档/暂停的计划点「生成排期」只提示「新增 0 条」，用户不知道原因
      if (res.blockedReason) {
        showAlert(`未生成实例：${res.blockedReason}`);
        return;
      }
      const reasonCount = Object.keys(res.unscheduledReasons || {}).length;
      showAlert(
        `生成完成：新增 ${res.created.length} 条，跳过（已存在）${res.skipped.length} 条` +
        (res.scheduled ? `，已排班 ${res.scheduled} 条` : '') +
        (reasonCount ? `，${reasonCount} 条未排班` : '') +
        // 2026-10-22（审核 P2-6）：一次性计划 + 起始日已过会静默 0 条，这里明确说原因
        (res.created.length === 0 && res.skipped.length === 0
          ? '（当前窗口内没有命中频率的日期：检查开始日期是否早于今天，或频率设置）'
          : '')
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
        showAlert(`操作失败：${useInspectionPlanStore.getState().error || '请稍后重试'}`);
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
    <Modal
      isOpen={isOpen}
      onClose={() => { clearDetail(); onClose(); }}
      title={`巡查计划详情 - ${plan.planCode}`}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCell label="计划名称" value={plan.title} />
          <InfoCell label="巡查类型" value={getInspectionTypeLabel(plan.inspectionType)} />
          <InfoCell label="执行人" value={plan.assigneeName || '-'} />
          <InfoCell
            label="状态"
            value={
              <span className={`inline-flex px-2 py-1 rounded-full text-xs ${st.bg} ${st.color}`}>{st.label}</span>
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
            <h4 className="text-sm font-semibold text-gray-700 mb-2">检查项模板（{checklist.length}）</h4>
            <div className="flex flex-wrap gap-2">
              {checklist.map((c, i) => (
                <span key={c.key || i} className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                  {c.label || `检查项 ${i + 1}`}
                  {c.required && <span className="ml-1 text-red-500">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 统计卡：方案 §8.3 的 8 项指标 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">执行统计</h4>
            <div className="flex gap-1">
              <Button size="sm" variant={range === 'month' ? 'default' : 'outline'} onClick={() => setRange('month')}>本月</Button>
              <Button size="sm" variant={range === 'all' ? 'default' : 'outline'} onClick={() => setRange('all')}>全周期</Button>
            </div>
          </div>
          {stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="应执行" value={stats.expected} tone="text-gray-800" hint="按当前频率算出的日期数（已扣暂停区间）" />
                <StatCard label="已生成" value={stats.generated} tone="text-gray-800" hint="已创建的任务数（不含已取消）" />
                <StatCard label="已排班" value={stats.scheduled} tone="text-blue-600" hint="至少有一条有效排班的任务数" />
                <StatCard label="已记录" value={stats.recorded} tone="text-emerald-600" hint="已提交巡查记录的任务数" />
                <StatCard label="已验收" value={stats.verified} tone="text-green-700" hint="任务已完成且存在记录" />
                <StatCard
                  label="逾期未执行"
                  value={stats.overdue}
                  tone={stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}
                  hint="执行日已过、无记录、未取消未完成"
                />
                <StatCard label="已取消" value={stats.cancelled} tone="text-gray-400" hint="暂停或编辑后取消的实例" />
                <StatCard
                  label="未闭环问题"
                  value={stats.openProblems}
                  tone={stats.openProblems > 0 ? 'text-amber-600' : 'text-gray-400'}
                  hint="该计划记录产生、尚未处理完成的问题"
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                执行率 <span className="font-medium text-blue-600">{stats.completionRate}%</span>
                （已记录 / 应执行）；统计区间 {stats.range.from} ~ {stats.range.to}
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">统计加载中…</p>
          )}
        </div>

        {/* 实例列表 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">实例任务（{occurrences.length}）</h4>
          <InspectionPlanOccurrenceTable
            occurrences={occurrences}
            onViewTask={onViewTask}
            onSubmitRecord={onSubmitRecord}
            onViewRecord={onViewRecord}
            onScheduleTask={onScheduleTask}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-5 pt-3 border-t border-gray-200">
        <Button size="sm" variant="secondary" onClick={() => onEdit?.(plan)}>编辑</Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleTogglePause}
            disabled={busy || plan.status === 'archived'}
          >
            {isPaused ? '恢复计划' : '暂停计划'}
          </Button>
          {/* 2026-10-22（审核 P2-7）：归档计划不能生成（后端会 blockedReason 返回 0 条） */}
          <Button size="sm" onClick={handleGenerate} disabled={busy || isPaused || plan.status === 'archived'}>
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
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-800 mt-0.5 break-words">{value}</div>
    </div>
  );
}

function StatCard({
  label, value, tone, hint,
}: { label: string; value: React.ReactNode; tone: string; hint?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3" title={hint}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-semibold mt-0.5 ${tone}`}>{value}</div>
    </div>
  );
}

export type { PlanStats };