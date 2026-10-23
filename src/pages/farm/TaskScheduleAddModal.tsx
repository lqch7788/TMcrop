/**
 * 任务排班新增弹窗
 *
 * 2026-10-23 新增：「任务排班」页原形态是「左侧待排班任务列表 + 右侧内嵌表单」，
 *   页面信息密度过高、跨页操作不便。现改为：
 *   - 待排班任务改为表格（与「排班记录」表格模式一致）
 *   - 新增排班改为弹窗：点「新增排班」或表格行尾「排班」打开本弹窗，
 *     弹窗内先选任务，再填排班信息（日期 / 班组 / 执行人 / 班次 / 起止时间 / 备注）
 *
 * 字段口径与「编辑排班」弹窗（TaskScheduleEditModal）完全一致，弹窗样式沿用 UnifiedModal。
 *
 * 注意：弹窗不能加 key 强制重挂载（会让取消/ESC/X/遮罩全部失效），
 *       表单重置一律走 useEffect[open, initialTaskId, defaultDate]。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, UnifiedModal } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import type { Shift } from '../../services/apiBasicDataService';
import type { UnscheduledTask } from '../../hooks/useFarmTaskSchedule';
import type { TaskScheduleEditTeam, TaskScheduleEditWorker } from './TaskScheduleEditModal';
import { resolveWorkerIdByAssignee, isCrossDayShift, isValidScheduleTimeRange } from './taskScheduleUtils';

export interface TaskScheduleCreateInput {
  taskId: string;
  taskCode?: string;
  taskTitle?: string;
  workerId: string;
  workerName: string;
  teamId: string | null;
  teamName: string | null;
  planDate: string;
  planStart: string;
  planEnd: string;
  shiftType: string;
  remarks: string;
}

interface TaskScheduleAddModalProps {
  open: boolean;
  /** 预选任务 id（从待排班任务表格行尾「排班」进来时带上） */
  initialTaskId?: string | null;
  /** 预选班组 id（从「班组分配」页带 ?teamId= 跳进来时带上） */
  initialTeamId?: string | null;
  /** 待排班任务（供弹窗内选择） */
  tasks: UnscheduledTask[];
  /** 排班日期默认值（页面当前选中日期） */
  defaultDate: string;
  shifts: Shift[];
  teams: TaskScheduleEditTeam[];
  workers: TaskScheduleEditWorker[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: TaskScheduleCreateInput) => Promise<void>;
}

/** 任务在选择器里的显示文本：编号 + 标题 */
function taskOptionLabel(task: UnscheduledTask): string {
  const title = task.taskTitle || task.title || '';
  return title ? `${task.taskCode} · ${title}` : task.taskCode;
}

export function TaskScheduleAddModal({
  open,
  initialTaskId,
  initialTeamId,
  tasks,
  defaultDate,
  shifts,
  teams,
  workers,
  saving,
  onClose,
  onSubmit,
}: TaskScheduleAddModalProps) {
  const [form, setForm] = useState({
    taskId: '',
    planDate: '',
    teamId: '',
    teamName: '',
    workerId: '',
    shiftType: '',
    planStart: '08:00',
    planEnd: '12:00',
    remarks: '',
  });

  // tasks / workers 的最新值（放 ref 而非 effect 依赖）：
  //   两者都是异步加载的，若写进下面重置表单的依赖里，会在数据到位那一刻把用户已填的表单冲掉。
  const tasksRef = useRef(tasks);
  const workersRef = useRef(workers);
  useEffect(() => {
    tasksRef.current = tasks;
    workersRef.current = workers;
  }, [tasks, workers]);

  /**
   * 按姓名匹配工人表，带出待排班任务的派工执行人。
   * 待排班任务都是「已派工」的，派工时已指定执行人；匹配不到则留空由用户手工选。
   */
  const resolveWorkerId = (taskId: string): string =>
    resolveWorkerIdByAssignee(tasksRef.current, workersRef.current, taskId);

  // 打开时重置表单（不用 key 重挂载，否则关闭通道会失效）
  useEffect(() => {
    if (!open) return;
    setForm({
      taskId: initialTaskId || '',
      planDate: defaultDate,
      teamId: initialTeamId || '',
      teamName: '',
      // 预选任务时同步带出执行人（与在弹窗里手动选任务的行为一致）
      workerId: initialTaskId ? resolveWorkerId(initialTaskId) : '',
      shiftType: '',
      planStart: '08:00',
      planEnd: '12:00',
      remarks: '',
    });
  }, [open, initialTaskId, initialTeamId, defaultDate]);

  // 选了班组就只列该班组成员
  const workerOptions = useMemo(() => {
    if (!form.teamId) return workers;
    const team = teams.find((t) => t.id === form.teamId);
    if (!team) return workers;
    const memberIds = new Set(team.memberIds || []);
    return workers.filter((w) => memberIds.has(w.id));
  }, [workers, teams, form.teamId]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === form.taskId),
    [tasks, form.taskId],
  );

  /**
   * 切换任务时带出执行人（与打开弹窗时的预选行为一致）
   */
  const applyTask = (taskId: string) => {
    setForm((f) => ({
      ...f,
      taskId,
      workerId: taskId ? resolveWorkerId(taskId) : '',
    }));
  };

  const handleSave = async () => {
    if (!form.taskId) {
      await showAlert('请选择待排班任务');
      return;
    }
    if (!form.planDate) {
      await showAlert('请选择排班日期');
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
    // 跨天班次（如晚班 22:00-06:00）合法，结束时间按次日计算；
    // 只有起止完全相同（零时长）才非法。
    if (!isValidScheduleTimeRange(form.planStart, form.planEnd)) {
      await showAlert('开始时间与结束时间不能相同');
      return;
    }
    const worker = workers.find((w) => w.id === form.workerId);
    // 班组名称现查（表单里存的是选班组那一刻的名字，班组列表异步到位时可能为空）
    const team = teams.find((x) => x.id === form.teamId);
    await onSubmit({
      taskId: form.taskId,
      taskCode: selectedTask?.taskCode,
      taskTitle: selectedTask?.taskTitle || selectedTask?.title,
      workerId: form.workerId,
      workerName: worker?.name || '',
      teamId: form.teamId || null,
      teamName: team?.name || form.teamName || null,
      planDate: form.planDate,
      planStart: form.planStart,
      planEnd: form.planEnd,
      shiftType: form.shiftType,
      remarks: form.remarks,
    });
  };

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
        <X className="w-4 h-4" /> 取消
      </Button>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4" /> {saving ? '保存中…' : '保存'}
      </Button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="新增排班"
      size="xl"
      // 2026-10-23：弹窗尺寸整体放大一倍（md 默认 500×400 → 1000×800）
      width={1000}
      height={800}
      showFooter={true}
      footer={footer}
    >
      <div className="space-y-3">
        {/* 待排班任务选择 */}
        <div>
          <Label className="text-xs text-gray-600">待排班任务</Label>
          <Select value={form.taskId || '__none__'} onValueChange={(v) => applyTask(v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="选择待排班任务" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">选择待排班任务</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {taskOptionLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 已选任务信息（只读） */}
        {selectedTask && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="font-medium text-gray-900">{taskOptionLabel(selectedTask)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {[
                selectedTask.typeName || selectedTask.type || '',
                selectedTask.greenhouseName || selectedTask.areaName || '',
                `计划日期 ${selectedTask.planDate || '-'}`,
                `派工执行人 ${selectedTask.assigneeName || '-'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs text-gray-600">排班日期</Label>
          <Input
            type="date"
            value={form.planDate}
            onChange={(e) => setForm((f) => ({ ...f, planDate: e.target.value }))}
            className="h-9"
          />
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
            <Input
              type="time"
              value={form.planStart}
              onChange={(e) => setForm((f) => ({ ...f, planStart: e.target.value }))}
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600">结束时间</Label>
            <Input
              type="time"
              value={form.planEnd}
              onChange={(e) => setForm((f) => ({ ...f, planEnd: e.target.value }))}
              className="h-9"
            />
            {/* 跨天班次提示：晚班 22:00 → 次日 06:00（库里仍存 06:00，按次日解释） */}
            {isCrossDayShift(form.planStart, form.planEnd) && (
              <p className="text-[11px] text-amber-600 mt-1">跨天班次，结束时间为次日 {form.planEnd}</p>
            )}
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
        </div>
      </div>
    </UnifiedModal>
  );
}

export default TaskScheduleAddModal;
