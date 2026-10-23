/**
 * 巡查计划列表面板（2026-10-21 P3 / 2026-10-22 审核返修）
 *
 * 与「巡查记录」并列展示在 InspectionTab 内，由父组件通过 CSS hidden 切换两个视图
 * （方案 §10.1：禁止条件渲染/卸载 —— 40+ Radix Select 同时卸载会触发渲染风暴，见既有事故）。
 *
 * 审核返修（2026-10-22）：
 *   · window.confirm → showConfirm（系统唯一确认弹窗入口，Electron 兼容）
 *   · 表头/行高/hover/工具栏对齐 InspectionTable + InspectionToolbar
 *   · 状态徽章改模块 span 写法并复用全局文案（STATUS_MAP 体系）
 *   · 操作按钮分主次（详情=link、编辑=ghost、暂停/恢复=outline、归档=danger 语义色），带图标
 *   · 补加载态与错误态（store.error 此前从未展示，失败时用户只看到「暂无计划」）
 *   · 截断单元格补 title
 *
 * 2026-10-23：操作列由文字按钮改为图标模式 ——
 *   复用种植管理页（种植作物列表）同一套 ActionIconButton + 语义色 token
 *   （详情=view / 编辑=edit / 暂停=pause / 恢复=resume / 归档=archive），悬停 title 提示。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActionIconButton, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Archive, Edit2, Eye, Pause, Play, RefreshCw } from 'lucide-react';
import {
  useInspectionPlanStore,
  describePlanFrequency,
  type InspectionPlan,
} from '@/stores/useInspectionPlanStore';
import { INSPECTION_TYPES, getInspectionTypeLabel } from '@/types/farm/common';
import { InspectionPlanFormModal } from './InspectionPlanFormModal';
import { InspectionPlanDetailModal } from './InspectionPlanDetailModal';
import { showAlert, showConfirm } from '@/lib/dialogService';

interface Props {
  onViewTask?: (taskId: string) => void;
  onViewRecord?: (recordId: string) => void;
  onSubmitRecord?: (taskId: string) => void;
  /** 2026-10-21 P5：跳到排班调度并预选任务 */
  onScheduleTask?: (taskId: string, date: string) => void;
  /**
   * 2026-10-22：「新建计划」按钮已上移到父组件的视图切换行（靠右），
   * 父组件每次递增该值即请求打开新建表单（本地 state 不能跨组件直接控制）。
   */
  createRequest?: number;
}

/** 计划状态 → 文案与配色（复用系统语义色，与任务状态同一套 token） */
export const PLAN_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '运行中', color: 'text-green-600', bg: 'bg-green-100' },
  paused: { label: '已暂停', color: 'text-amber-600', bg: 'bg-amber-100' },
  archived: { label: '已归档', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export function InspectionPlanPanel({ onViewTask, onViewRecord, onSubmitRecord, onScheduleTask, createRequest }: Props) {
  const { plans, isLoading, error, fetchPlans, archivePlan, updatePlan } = useInspectionPlanStore();
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InspectionPlan | null>(null);
  const [detail, setDetail] = useState<InspectionPlan | null>(null);

  // 2026-10-22：一次拉全量，状态筛选改为客户端过滤。
  //   视图切换行的「巡查计划（N）」需要**总数**；状态筛选若走服务端，
  //   store 里的列表会被裁掉，标题计数跟着变小，与「巡查记录（N）」的口径不一致。
  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  // 新建计划请求：按钮已上移到视图切换行，父组件递增 createRequest 触发
  useEffect(() => {
    if (!createRequest) return;
    setEditing(null);
    setShowForm(true);
  }, [createRequest]);

  // 客户端过滤（列表量级小，避免每次输入/切状态都打接口）
  const visible = useMemo(() => plans.filter((p) => {
    if (statusFilter !== 'all' && (p.status || 'active') !== statusFilter) return false;
    if (typeFilter !== 'all' && p.inspectionType !== typeFilter) return false;
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (
      p.title.toLowerCase().includes(kw) ||
      (p.planCode || '').toLowerCase().includes(kw) ||
      (p.assigneeName || '').toLowerCase().includes(kw)
    );
  }), [plans, statusFilter, typeFilter, keyword]);

  const reload = () => {
    void fetchPlans();
  };

  const handleArchive = async (plan: InspectionPlan) => {
    const ok = await showConfirm(
      `确认归档计划「${plan.title}」？\n归档后不再生成新的实例任务，已生成的历史实例保留为台账。`
    );
    if (!ok) return;
    const done = await archivePlan(plan.id);
    showAlert(done ? '计划已归档' : `归档失败：${useInspectionPlanStore.getState().error || '请稍后重试'}`);
  };

  const handleTogglePause = async (plan: InspectionPlan) => {
    const isPaused = plan.status === 'paused';
    const res = await updatePlan(plan.id, isPaused
      ? { status: 'active' }
      : { status: 'paused', pauseReason: '列表暂停' });
    if (!res) {
      showAlert(`操作失败：${useInspectionPlanStore.getState().error || '请稍后重试'}`);
      return;
    }
    showAlert(isPaused
      ? `已恢复，新增实例 ${res.generate?.created.length ?? 0} 条`
      : `已暂停，取消未来实例 ${res.pause?.cancelledTasks.length ?? 0} 条`);
  };

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
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
        <Button size="sm" variant="ghost" onClick={reload} title="刷新">
          <RefreshCw className="w-4 h-4" />
          刷新
        </Button>
      </div>

      {/* 错误态：store 的 error 此前从未展示，请求失败时只看到「暂无数据」 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          加载巡查计划失败：{error}
          <Button size="sm" variant="ghost" className="ml-2 text-red-700" onClick={reload}>重试</Button>
        </div>
      )}

      {/* 列表 */}
      {isLoading && visible.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          加载中…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-10 bg-white rounded-xl shadow-sm border border-gray-100">
          暂无巡查计划。点击「新建计划」设置巡查频率后，系统会自动生成对应的巡查任务。
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">编号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">巡查对象</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">频率</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">实例数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {visible.map((plan) => {
                const st = PLAN_STATUS_MAP[plan.status || 'active'] || PLAN_STATUS_MAP.active;
                const target = plan.equipmentName || plan.infrastructureName || plan.greenhouseName || plan.area || '全基地';
                return (
                  <tr key={plan.id} className="hover:bg-blue-100 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{plan.planCode}</td>
                    <td className="px-4 py-3">
                      {/* 2026-10-23：名称列改为蓝色高亮（原绿色 link），加粗 + hover 下划线，便于快速定位 */}
                      <Button
                        variant="link"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800 font-semibold px-0 text-left"
                        onClick={() => setDetail(plan)}
                      >
                        {plan.title}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{getInspectionTypeLabel(plan.inspectionType)}</td>
                    <td className="px-4 py-3 text-gray-600 min-w-[8em] max-w-[15em] truncate" title={target}>
                      {target}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{describePlanFrequency(plan)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{plan.assigneeName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{plan.occurrenceCount ?? 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs ${st.bg} ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {/* 2026-10-23：操作列统一改图标模式，样式对齐种植管理页
                          （ActionIconButton + 语义色 token，悬停显示 title 提示） */}
                      <div className="flex items-center gap-1">
                        <ActionIconButton
                          variant="view"
                          icon={<Eye className="w-4 h-4" />}
                          onClick={() => setDetail(plan)}
                          title="查看计划详情"
                        />
                        <ActionIconButton
                          variant="edit"
                          icon={<Edit2 className="w-4 h-4" />}
                          onClick={() => { setEditing(plan); setShowForm(true); }}
                          title="编辑计划"
                        />
                        {plan.status === 'active' && (
                          <ActionIconButton
                            variant="pause"
                            icon={<Pause className="w-4 h-4" />}
                            onClick={() => handleTogglePause(plan)}
                            title="暂停计划"
                          />
                        )}
                        {plan.status === 'paused' && (
                          <ActionIconButton
                            variant="resume"
                            icon={<Play className="w-4 h-4" />}
                            onClick={() => handleTogglePause(plan)}
                            title="恢复计划"
                          />
                        )}
                        {plan.status !== 'archived' && (
                          <ActionIconButton
                            variant="archive"
                            icon={<Archive className="w-4 h-4" />}
                            onClick={() => handleArchive(plan)}
                            title="归档计划"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 弹窗 */}
      <InspectionPlanFormModal
        isOpen={showForm}
        plan={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={reload}
      />
      <InspectionPlanDetailModal
        isOpen={!!detail}
        plan={detail}
        onClose={() => { setDetail(null); reload(); }}
        onEdit={(p) => { setDetail(null); setEditing(p); setShowForm(true); }}
        onViewTask={onViewTask}
        onViewRecord={onViewRecord}
        onSubmitRecord={onSubmitRecord}
        onScheduleTask={onScheduleTask}
      />
    </div>
  );
}