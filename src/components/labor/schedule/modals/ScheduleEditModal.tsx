/**
 * 单条排班编辑 Modal（2026-09-15 新增）
 *
 * 行尾「编辑」图标点击后弹出。可修改：日期、班次、工作区域、状态。
 * 提交后调 scheduleStore.updateSchedule 写入。
 *
 * 数据流（V2.1 铁律）：弹窗内直接调 useScheduleStore.getState()，不走 SchedulePage 中转。
 */

import { useEffect, useState } from 'react';
import { Modal, FormField, Input, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { useScheduleStore } from '@/stores';
import type { ScheduleRecord, ShiftType, ScheduleStatus } from '../types';

interface ScheduleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleRecord | null;
}

const SHIFT_OPTIONS: ShiftType[] = ['早班', '中班', '晚班', '全天', '弹性'];
const STATUS_OPTIONS: ScheduleStatus[] = ['已排班', '已执行', '已取消'];

export function ScheduleEditModal({ isOpen, onClose, schedule }: ScheduleEditModalProps) {
  const [date, setDate] = useState('');
  const [shift, setShift] = useState<ShiftType>('早班');
  const [workZone, setWorkZone] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>('已排班');
  const [submitting, setSubmitting] = useState(false);

  // 打开弹窗时预填原值
  useEffect(() => {
    if (isOpen && schedule) {
      setDate(schedule.date);
      setShift(schedule.shift);
      setWorkZone(schedule.workZone || '');
      setStatus(schedule.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!schedule) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      showAlert('日期格式应为 YYYY-MM-DD');
      return;
    }
    if (!workZone.trim()) {
      showAlert('请填写工作区域');
      return;
    }

    setSubmitting(true);
    try {
      await useScheduleStore.getState().updateSchedule(schedule.id, {
        date,
        shift,
        workZone: workZone.trim(),
        status,
      });
      showAlert('排班已更新');
      onClose();
    } catch (err) {
      showAlert(`保存失败：${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑排班"
      size="md"
      onSubmit={handleSubmit}
      submitText={submitting ? '保存中...' : '保存'}
    >
      {schedule && (
        <div className="space-y-4">
          {/* 排班概要（只读） */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
            <div className="font-medium text-blue-800 mb-1">员工</div>
            <div className="text-blue-700">{schedule.staffName || '-'}</div>
          </div>

          <FormField label="日期">
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </FormField>

          <FormField label="班次">
            <Select value={shift} onValueChange={v => setShift(v as ShiftType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="工作区域">
            <Input
              value={workZone}
              onChange={e => setWorkZone(e.target.value)}
              placeholder="如：A 区大棚"
            />
          </FormField>

          <FormField label="状态">
            <Select value={status} onValueChange={v => setStatus(v as ScheduleStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}
    </Modal>
  );
}

export default ScheduleEditModal;
