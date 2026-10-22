/**
 * 巡查计划列表面板（2026-10-21 P3）
 *
 * 与「巡查记录」并列展示在 InspectionTab 内，由父组件通过 CSS hidden 切换两个视图
 * （方案 §10.1：禁止条件渲染/卸载 —— 40+ Radix Select 同时卸载会触发渲染风暴，见既有事故）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import {
  useInspectionPlanStore,
  describePlanFrequency,
  type InspectionPlan,
} from '@/stores/useInspectionPlanStore';
import { INSPECTION_TYPES, getInspectionTypeLabel } from '@/types/farm/common';
import { InspectionPlanFormModal } from './InspectionPlanFormModal';
import { InspectionPlanDetailDrawer } from './InspectionPlanDetailDrawer';
import { showAlert } from '@/lib/dialogService';

interface Props {
  onViewTask?: (taskId: string) => void;
  onViewRecord?: (recordId: string) => void;
  onSubmitRecord?: (taskId: string) => void;
  /** 2026-10-21 P5：跳到排班调度并预选任务 */
  onScheduleTask?: (taskId: string, date: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-gray-200 text-gray-600',
};
const STATUS_TEXT: Record<string, string> = { active: '运行中', paused: '已暂停', archived: '已归档' };

export function InspectionPlanPanel({ onViewTask, onViewRecord, onSubmitRecord, onScheduleTask }: Props) {
  const { plans, isLoading, fetchPlans, archivePlan, updatePlan } = useInspectionPlanStore();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InspectionPlan | null>(null);
  const [detail, setDetail] = useState<InspectionPlan | null>(null);

  useEffect(() => {
    void fetchPlans({ status: statusFilter === 'all' ? undefined : statusFilter });
  }, [statusFilter]);

  // 客户端过滤（列表量级小，避免每次输入都打接口）
  const visible = useMemo(() => plans.filter((p) => {
    if (typeFilter !== 'all' && p.inspectionType !== typeFilter) return false;
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (
      p.title.toLowerCase().includes(kw) ||
      (p.planCode || '').toLowerCase().includes(kw) ||
      (p.assigneeName || '').toLowerCase().includes(kw)
    );
  }), [plans, typeFilter, keyword]);

  const handleArchive = async (plan: InspectionPlan) => {
    if (!window.confirm(`确认归档计划「${plan.title}」？\n归档后不再生成新的实例任务，已生成的历史实例保留。`)) return;
    const ok = await archivePlan(plan.id);
    showAlert(ok ? '计划已归档' : '归档失败');
  };

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          新建计划
        </Button>
        <Input
          className="w-56"
          placeholder="搜索计划名称/编号/执行人"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="巡查类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {INSPECTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value as string}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">运行中</SelectItem>
            <SelectItem value="paused">已暂停</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={() => { void fetchPlans({ status: statusFilter === 'all' ? undefined : statusFilter }); }}>
          刷新
        </Button>
        <span className="text-sm text-slate-500 ml-auto">
          共 {visible.length} 个计划
        </span>
      </div>

      {/* 列表 */}
      {visible.length === 0 && !isLoading ? (
        <div className="text-center text-sm text-slate-400 py-10 bg-white rounded-xl border border-gray-100">
          暂无巡查计划。点击「新建计划」设置巡查频率后，系统会自动生成对应的巡查任务。
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">编号</th>
                <th className="px-3 py-2 text-left font-medium">名称</th>
                <th className="px-3 py-2 text-left font-medium">类型</th>
                <th className="px-3 py-2 text-left font-medium">巡查对象</th>
                <th className="px-3 py-2 text-left font-medium">频率</th>
                <th className="px-3 py-2 text-left font-medium">执行人</th>
                <th className="px-3 py-2 text-left font-medium">实例数</th>
                <th className="px-3 py-2 text-left font-medium">状态</th>
                <th className="px-3 py-2 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{plan.planCode}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 font-medium text-left"
                      onClick={() => setDetail(plan)}
                    >
                      {plan.title}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{getInspectionTypeLabel(plan.inspectionType)}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">
                    {plan.equipmentName || plan.infrastructureName || plan.greenhouseName || plan.area || '全基地'}
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{describePlanFrequency(plan)}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{plan.assigneeName || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{plan.occurrenceCount ?? 0}</td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_STYLE[plan.status || 'active'] || 'bg-gray-100 text-gray-600'}>
                      {STATUS_TEXT[plan.status || 'active'] || plan.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(plan)}>详情</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(plan); setShowForm(true); }}>编辑</Button>
                      {plan.status === 'active' ? (
                        <Button
                          size="sm" variant="ghost"
                          onClick={async () => {
                            const res = await updatePlan(plan.id, { status: 'paused', pauseReason: '列表暂停' });
                            showAlert(res ? '计划已暂停' : '暂停失败');
                          }}
                        >
                          暂停
                        </Button>
                      ) : plan.status === 'paused' ? (
                        <Button
                          size="sm" variant="ghost"
                          onClick={async () => {
                            const res = await updatePlan(plan.id, { status: 'active' });
                            showAlert(res ? `已恢复，新增实例 ${res.generate?.created.length ?? 0} 条` : '恢复失败');
                          }}
                        >
                          恢复
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => handleArchive(plan)}>归档</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 弹窗 */}
      <InspectionPlanFormModal
        isOpen={showForm}
        plan={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { void fetchPlans({ status: statusFilter === 'all' ? undefined : statusFilter }); }}
      />
      <InspectionPlanDetailDrawer
        isOpen={!!detail}
        plan={detail}
        onClose={() => setDetail(null)}
        onEdit={(p) => { setDetail(null); setEditing(p); setShowForm(true); }}
        onViewTask={onViewTask}
        onViewRecord={onViewRecord}
        onSubmitRecord={onSubmitRecord}
        onScheduleTask={onScheduleTask}
      />
    </div>
  );
}