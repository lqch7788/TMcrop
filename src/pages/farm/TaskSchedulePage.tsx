/**
 * 任务排班页（原「任务派工排班」，P0-6）
 *
 * 2026-10-20：并入「排班调度」(/schedule) 的「任务排班」Tab，旧路由 /farm-task-schedule 重定向过来。
 *
 * 左侧：待排班任务（已派工但未排班的农事任务）
 * 右侧：按日期的排班列表
 *
 * 与同页「考勤排班」Tab 区分：这里排的是"哪条农事任务在什么时候由谁做"；
 * 考勤排班排的是"某个人哪天上什么班、几点打卡"。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useFarmTaskSchedule, type FarmTaskSchedule } from '../../hooks/useFarmTaskSchedule';
import { useWorkerStore } from '../../stores';
import { useTeamManageStore } from '../../stores/useTeamManageStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import TaskScheduleEditModal, { type TaskScheduleEditTarget } from './TaskScheduleEditModal';

export default function TaskSchedulePage() {
  // URL 参数：date（初始日期）/ teamId（预选班组）/ taskId（预选待排班任务），由班组分配页、巡查计划面板跳转带进来
  const [searchParams] = useSearchParams();
  const urlDate = searchParams.get('date');
  const urlTeamId = searchParams.get('teamId');
  // 2026-10-21 P5：巡查计划实例「去排班」深链 —— /schedule?date=...&taskId=...
  //   未排班的巡查任务本来就在「待排班任务」列表里（status='pending' 且无排班行），
  //   这里把选中的那条预选上，用户落地即可直接排班，不必在列表里再找一遍。
  const urlTaskId = searchParams.get('taskId');

  const [date, setDate] = useState(urlDate || todayLocal());
  const { schedules, unscheduledTasks, shifts, loading, error, createSchedule, updateSchedule, deleteSchedule, refresh } =
    useFarmTaskSchedule({ date });

  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) void loadWorkers();
  }, [workers.length, loadWorkers]);

  // 班组列表（与「班组分配」页同一 Store）
  const teams = useTeamManageStore((s) => s.teams);
  const fetchTeamData = useTeamManageStore((s) => s.fetchData);

  useEffect(() => {
    if (teams.length === 0) void fetchTeamData();
  }, [teams.length, fetchTeamData]);

  // 选中待排班任务
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // 2026-10-21 P5：深链预选 —— 待排班列表到位后再选，否则那一刻它还是空数组
  useEffect(() => {
    if (!urlTaskId) return;
    if (unscheduledTasks.some((t) => t.id === urlTaskId)) {
      setSelectedTaskId(urlTaskId);
    }
  }, [urlTaskId, unscheduledTasks]);
  // 排班表单
  const [form, setForm] = useState({
    workerId: '',
    teamId: '',
    teamName: '',
    planStart: '08:00',
    planEnd: '12:00',
    shiftType: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const selectedTask = useMemo(
    () => unscheduledTasks.find((t) => t.id === selectedTaskId),
    [unscheduledTasks, selectedTaskId],
  );

  // 选了班组就只列该班组成员；没选班组列全部
  const workerOptions = useMemo(() => {
    if (!form.teamId) return workers;
    const team = teams.find((t) => t.id === form.teamId);
    if (!team) return workers;
    const memberIds = new Set(team.memberIds || []);
    return workers.filter((w) => memberIds.has(w.id));
  }, [workers, teams, form.teamId]);

  // URL 日期变化时同步（本组件常驻挂载，useState 初始值只读一次）
  useEffect(() => {
    if (urlDate) setDate(urlDate);
  }, [urlDate]);

  // 从 URL 预选班组（班组分配页跳转过来）
  useEffect(() => {
    if (!urlTeamId) return;
    const t = teams.find((x) => x.id === urlTeamId);
    if (!t) return;
    setForm((f) => (f.teamId === t.id ? f : { ...f, teamId: t.id, teamName: t.name }));
  }, [urlTeamId, teams]);

  // 日期加减
  const shiftDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    setDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  const handleCreate = async () => {
    if (!selectedTask) {
      await showAlert('请先在左侧选择一条待排班任务');
      return;
    }
    if (!form.workerId) {
      await showAlert('请选择执行人');
      return;
    }
    if (!form.shiftType) {
      await showAlert('请选择班次');
      return;
    }
    if (form.planStart >= form.planEnd) {
      await showAlert('开始时间必须早于结束时间');
      return;
    }

    setSaving(true);
    try {
      const worker = workers.find((w) => w.id === form.workerId);
      await createSchedule({
        taskId: selectedTask.id,
        workerId: form.workerId,
        workerName: worker?.name || '',
        teamId: form.teamId || null,
        teamName: form.teamName || null,
        planDate: date,
        planStart: form.planStart,
        planEnd: form.planEnd,
        shiftType: form.shiftType,
        remarks: form.remarks,
      });
      await showAlert('排班已保存');
      setSelectedTaskId('');
      setForm((f) => ({ ...f, remarks: '' }));
    } catch (e) {
      await showAlert(`排班失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
    } catch (e) {
      await showAlert(`删除失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ===== 编辑排班 =====
  // 派工后自动生成的排班落在任务计划日期上，现场常需改期 / 换班次 / 换执行人。
  // 没有编辑能力只能"删了重排"，而删除是物理删除（不可撤销），容易误删。
  const [editing, setEditing] = useState<TaskScheduleEditTarget | null>(null);

  const openEditModal = (s: FarmTaskSchedule) => {
    setEditing({
      id: s.id,
      taskId: s.taskId,
      taskCode: s.taskCode,
      taskTitle: s.taskTitle,
      workerId: s.workerId,
      workerName: s.workerName,
      teamId: s.teamId,
      teamName: s.teamName,
      planDate: s.planDate,
      planStart: s.planStart,
      planEnd: s.planEnd,
      shiftType: s.shiftType,
      remarks: s.remarks,
    });
  };

  const handleSaveEdit = async (
    id: string,
    updates: {
      planDate: string;
      workerId: string;
      workerName: string;
      teamId: string | null;
      teamName: string | null;
      shiftType: string;
      planStart: string;
      planEnd: string;
      remarks: string;
    },
  ) => {
    setSaving(true);
    try {
      await updateSchedule(id, updates as Partial<FarmTaskSchedule>);
      await showAlert('排班已更新');
      setEditing(null);
    } catch (e) {
      await showAlert(`更新失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">任务排班</h2>
            <span className="text-xs text-gray-500">把已派工的农事任务安排到具体的日期、班次与执行人</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => shiftDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayLocal())}
              className="h-9 w-40"
            />
            <Button variant="secondary" size="sm" onClick={() => shiftDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={refresh}>刷新</Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          排班数据加载失败：{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 待排班任务 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            待排班任务（{unscheduledTasks.length}）
          </h3>
          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {unscheduledTasks.length === 0 && !loading && (
              <p className="text-sm text-gray-400 py-6 text-center">暂无待排班任务</p>
            )}
            {unscheduledTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTaskId(t.id)}
                className={`w-full text-left border rounded-lg px-3 py-2 transition-colors ${
                  selectedTaskId === t.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-600">{t.taskCode}</span>
                  <span className="text-xs text-gray-500">{t.planDate}</span>
                </div>
                <div className="text-sm text-gray-900 mt-0.5">{t.taskTitle || t.title || '农事任务'}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t.typeName || t.type || '-'} · {t.greenhouseName || t.areaName || '-'} · 执行人 {t.assigneeName || '-'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 排班表单 + 当日排班 */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              新增排班
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">已选任务</Label>
                <p className="text-sm text-gray-900">
                  {selectedTask
                    ? `${selectedTask.taskCode} · ${selectedTask.taskTitle || selectedTask.title || ''}`
                    : <span className="text-gray-400">请在左侧选择</span>}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">班组</Label>
                  <Select
                    value={form.teamId || '__none__'}
                    onValueChange={(v) => {
                      const id = v === '__none__' ? '' : v;
                      const t = teams.find((x) => x.id === id);
                      setForm((f) => ({
                        ...f,
                        teamId: id,
                        teamName: t?.name || '',
                        // 换班组时清掉执行人（人可能不属于新班组）
                        workerId: '',
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择班组（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">不指定班组</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">执行人</Label>
                  <Select
                    value={form.workerId || '__none__'}
                    onValueChange={(v) => setForm((f) => ({ ...f, workerId: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择执行人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">选择执行人</SelectItem>
                      {workerOptions.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">班次</Label>
                  <Select
                    value={form.shiftType || '__none__'}
                    onValueChange={(v) => {
                      const code = v === '__none__' ? '' : v;
                      const cfg = shifts.find((s) => s.shiftCode === code);
                      setForm((f) => ({
                        ...f,
                        shiftType: code,
                        // 选中班次自动带出该班次的起止时间（仍可手动改）
                        planStart: cfg?.startTime || f.planStart,
                        planEnd: cfg?.endTime || f.planEnd,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择班次" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">选择班次</SelectItem>
                      {shifts.map((s) => (
                        <SelectItem key={s.shiftCode} value={s.shiftCode}>
                          {s.shiftName}（{s.startTime}-{s.endTime}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">开始时间</Label>
                  <Input type="time" value={form.planStart} onChange={(e) => setForm((f) => ({ ...f, planStart: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">结束时间</Label>
                  <Input type="time" value={form.planEnd} onChange={(e) => setForm((f) => ({ ...f, planEnd: e.target.value }))} className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">备注</Label>
                <Input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="可留空"
                  className="h-9"
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? '保存中…' : '保存排班'}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              当日排班（{schedules.length}）
            </h3>
            {schedules.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">该日期暂无排班</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-600">{s.taskCode || s.taskId}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                          {s.shiftName || shifts.find((x) => x.shiftCode === s.shiftType)?.shiftName || s.shiftType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 truncate">{s.taskTitle || '-'}</div>
                      <div className="text-xs text-gray-500">
                        {s.planStart || '—'} ~ {s.planEnd || '—'} · {s.workerName || '-'}
                        {s.teamName ? ` · ${s.teamName}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(s)}
                        title="编辑排班"
                        aria-label="编辑排班"
                      >
                        <Pencil className="w-4 h-4 text-amber-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="删除排班">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 编辑排班弹窗 */}
      <TaskScheduleEditModal
        open={editing !== null}
        target={editing}
        shifts={shifts}
        teams={teams}
        workers={workers}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
