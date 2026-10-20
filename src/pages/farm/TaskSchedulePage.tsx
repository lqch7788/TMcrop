/**
 * 农事任务排班页（P0-6）
 *
 * 左侧：待排班任务（已派工但未排班的农事任务）
 * 右侧：按日期的排班列表
 *
 * 与「排班调度」（/schedule，工人考勤班次）区分：这里排的是"哪条农事任务在什么时候由谁做"。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2, Users } from 'lucide-react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useFarmTaskSchedule, FARM_TASK_SHIFT_TYPES } from '../../hooks/useFarmTaskSchedule';
import { useWorkerStore } from '../../stores';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';

const SHIFT_LABEL: Record<string, string> = Object.fromEntries(
  FARM_TASK_SHIFT_TYPES.map((s) => [s.value, s.label]),
);

export default function TaskSchedulePage() {
  const [date, setDate] = useState(todayLocal());
  const { schedules, unscheduledTasks, loading, error, createSchedule, deleteSchedule, refresh } =
    useFarmTaskSchedule({ date });

  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) void loadWorkers();
  }, [workers.length, loadWorkers]);

  // 选中待排班任务
  const [selectedTaskId, setSelectedTaskId] = useState('');
  // 排班表单
  const [form, setForm] = useState({ workerId: '', planStart: '08:00', planEnd: '12:00', shiftType: 'day', remarks: '' });
  const [saving, setSaving] = useState(false);

  const selectedTask = useMemo(
    () => unscheduledTasks.find((t) => t.id === selectedTaskId),
    [unscheduledTasks, selectedTaskId],
  );

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

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">农事任务排班</h2>
            <span className="text-xs text-gray-500">把已派工的农事任务安排到具体的日期与执行人</span>
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
                  <Label className="text-xs text-gray-600">执行人</Label>
                  <Select value={form.workerId || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, workerId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择执行人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">选择执行人</SelectItem>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">班次</Label>
                  <Select value={form.shiftType} onValueChange={(v) => setForm((f) => ({ ...f, shiftType: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FARM_TASK_SHIFT_TYPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
                          {SHIFT_LABEL[s.shiftType] || s.shiftType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 truncate">{s.taskTitle || '-'}</div>
                      <div className="text-xs text-gray-500">
                        {s.planStart || '—'} ~ {s.planEnd || '—'} · {s.workerName || '-'}
                        {s.teamName ? ` · ${s.teamName}` : ''}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="删除排班">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
