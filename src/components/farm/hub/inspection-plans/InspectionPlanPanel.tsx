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
import { ActionIconButton, Button, Input, Pagination, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Archive, Edit2, Pause, Play, Plus, RotateCcw } from 'lucide-react';
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
}

/** 计划状态 → 文案与配色（复用系统语义色，与任务状态同一套 token） */
export const PLAN_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '运行中', color: 'text-green-600', bg: 'bg-green-100' },
  paused: { label: '已暂停', color: 'text-amber-600', bg: 'bg-amber-100' },
  archived: { label: '已归档', color: 'text-gray-500', bg: 'bg-gray-100' },
};

export function InspectionPlanPanel({ onViewTask, onViewRecord, onSubmitRecord, onScheduleTask }: Props) {
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

  // 2026-10-23：分页（与「巡查记录」表格底部同一套 Pagination 组件：页码 + 每页条数）
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(visible.length / pageSize) || 1;
  const pagedVisible = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize],
  );

  // 筛选条件变化时回到第 1 页（否则可能停在已被过滤掉的空页上）
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, typeFilter, statusFilter]);

  // 列表变短导致当前页越界时（如刚归档了几条），回落到最后一页
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const reload = () => {
    void fetchPlans();
  };

  /**
   * 2026-10-23：重置筛选条件（关键词 / 巡查类型 / 状态）并重新拉取列表
   * 工具栏原「刷新」改为「重置」，与巡查记录视图的橙色重置按钮同一套 variant="warning"
   */
  const handleResetFilters = () => {
    setKeyword('');
    setTypeFilter('all');
    setStatusFilter('all');
    reload();
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
        {/* 2026-10-23：原「刷新」改为「重置」——清空关键词/类型/状态筛选并重拉列表，
            配色沿用其他页面重置按钮的 variant="warning"（橙色） */}
        <Button size="sm" variant="warning" onClick={handleResetFilters}>
          <RotateCcw className="w-4 h-4" />
          重置
        </Button>
        {/* 2026-10-23：「新建计划」从父层视图切换行移入本面板工具栏（搜索栏之后、靠右）——
            本面板只在「巡查计划」视图显示，切到「巡查记录」时按钮随面板一起隐藏 */}
        <Button size="sm" className="ml-auto" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          新建计划
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
              {pagedVisible.map((plan) => {
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
                        {/* 2026-10-23：移除「查看详情」图标 —— 名称列点击即打开同一详情弹窗，功能重复 */}
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

      {/* 分页器 —— 与「巡查记录」表格底部同一套组件与位置（页码 + 每页条数选择） */}
      {visible.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          showPageSize={true}
        />
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