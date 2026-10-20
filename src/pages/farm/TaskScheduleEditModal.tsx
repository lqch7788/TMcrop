/**
 * 任务排班编辑弹窗
 *
 * 2026-10-20 新增：派工后自动生成的排班（派工即排班）落在任务计划日期上，
 *   现场常常需要改期 / 换班次 / 换执行人。没有编辑能力的话只能"删了重排"，
 *   而删除是物理删除（不可撤销），体验差且容易误删。
 *
 * 复用「新增排班」的全部字段口径：日期 / 班次 / 起止时间 / 班组 / 执行人 / 备注。
 */
import { useEffect, useMemo, useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, UnifiedModal } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import type { Shift } from '../../services/apiBasicDataService';

export interface TaskScheduleEditTarget {
  id: string;
  taskId: string;
  taskCode?: string;
  taskTitle?: string;
  workerId: string;
  workerName?: string;
  teamId?: string | null;
  teamName?: string | null;
  planDate: string;
  planStart?: string | null;
  planEnd?: string | null;
  shiftType: string;
  remarks?: string | null;
}

export interface TaskScheduleEditTeam {
  id: string;
  name: string;
  memberIds?: string[];
}

export interface TaskScheduleEditWorker {
  id: string;
  name: string;
}

interface TaskScheduleEditModalProps {
  open: boolean;
  target: TaskScheduleEditTarget | null;
  shifts: Shift[];
  teams: TaskScheduleEditTeam[];
  workers: TaskScheduleEditWorker[];
  saving: boolean;
  onClose: () => void;
  onSave: (id: string, updates: {
    planDate: string;
    workerId: string;
    workerName: string;
    teamId: string | null;
    teamName: string | null;
    shiftType: string;
    planStart: string;
    planEnd: string;
    remarks: string;
  }) => Promise<void>;
}

export function TaskScheduleEditModal({
  open,
  target,
  shifts,
  teams,
  workers,
  saving,
  onClose,
  onSave,
}: TaskScheduleEditModalProps) {
  const [form, setForm] = useState({
    planDate: '',
    workerId: '',
    teamId: '',
    teamName: '',
    shiftType: '',
    planStart: '08:00',
    planEnd: '12:00',
    remarks: '',
  });

  // 打开时用目标排班的数据回填（记忆教训：弹窗加 key 强制重挂载会让关闭失效，
  // 用 useEffect[target] 重置表单，不要给 Modal 加 key）
  useEffect(() => {
    if (!open || !target) return;
    setForm({
      planDate: target.planDate || '',
      workerId: target.workerId || '',
      teamId: target.teamId || '',
      teamName: target.teamName || '',
      shiftType: target.shiftType || '',
      planStart: target.planStart || '08:00',
      planEnd: target.planEnd || '12:00',
      remarks: target.remarks || '',
    });
  }, [open, target]);

  // 选了班组就只列该班组成员
  const workerOptions = useMemo(() => {
    if (!form.teamId) return workers;
    const team = teams.find((t) => t.id === form.teamId);
    if (!team) return workers;
    const memberIds = new Set(team.memberIds || []);
    return workers.filter((w) => memberIds.has(w.id));
  }, [workers, teams, form.teamId]);

  const handleSave = async () => {
    if (!target) return;
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
    if (form.planStart >= form.planEnd) {
      await showAlert('开始时间必须早于结束时间');
      return;
    }
    const worker = workers.find((w) => w.id === form.workerId);
    await onSave(target.id, {
      planDate: form.planDate,
      workerId: form.workerId,
      workerName: worker?.name || '',
      teamId: form.teamId || null,
      teamName: form.teamName || null,
      shiftType: form.shiftType,
      planStart: form.planStart,
      planEnd: form.planEnd,
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
      title="编辑排班"
      size="md"
      showFooter={true}
      footer={footer}
    >
      <div className="space-y-3">
        {/* 任务信息（只读） */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <div className="font-medium text-gray-900">
            {target?.taskCode || target?.taskId || ''}
            {target?.taskTitle ? ` · ${target.taskTitle}` : ''}
          </div>
          {target?.remarks === '派工后自动生成' && (
            <div className="text-xs text-gray-500 mt-1">该排班由派工动作自动生成，可在此调整</div>
          )}
        </div>

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
            <Label className="text-xs text-gray-600">备注</Label>
            <Input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="可留空"
              className="h-9"
            />
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
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default TaskScheduleEditModal;
