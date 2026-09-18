/**
 * 签到/签退 Modal（2026-09-14 新增）
 *
 * 用户在表格视图侧边栏点击"签到 / 签退"按钮时弹出。
 * - 输入 HH:mm 时间
 * - 提交后调 scheduleStore.updateSchedule 写入 check_in / check_out
 * - 后端自动设置 status='已执行'（但不会覆盖'已取消'）
 *
 * 数据流（V2.1 铁律）：弹窗内直接调 useScheduleStore.getState()，不走 SchedulePage 中转。
 */

import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, X } from 'lucide-react';
import { Modal, FormField, Input, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { useScheduleStore } from '@/stores';
import type { ScheduleRecord } from '../types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleRecord | null;
}

function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 生成 24h x 30min 间隔的 HH:mm 选项（48 个：00:00 ~ 23:30）
const TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

// 把任意 HH:mm 时间向下取整到最近的 30 分钟
function roundTo30Min(hhmm: string): string {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${m >= 30 ? '30' : '00'}`;
}

export function CheckInModal({ isOpen, onClose, schedule }: CheckInModalProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 打开弹窗时预填已有值（四舍五入到 30 分钟）
  useEffect(() => {
    if (isOpen && schedule) {
      setCheckIn(roundTo30Min(schedule.checkIn || ''));
      setCheckOut(roundTo30Min(schedule.checkOut || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!schedule) return;
    if (!checkIn && !checkOut) {
      showAlert('请至少填写签到或签退时间');
      return;
    }
    // 简单时间格式校验 HH:mm
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (checkIn && !timeRe.test(checkIn)) {
      showAlert('签到时间格式应为 HH:mm（如 08:30）');
      return;
    }
    if (checkOut && !timeRe.test(checkOut)) {
      showAlert('签退时间格式应为 HH:mm（如 17:30）');
      return;
    }
    // 2026-09-18 修复 C-1：跨日班次不能简单用字符串比较判断时间先后。
    // 例：晚班 22:00 → 次日 06:00，签退 06:00 字符串上 < 签到 22:00，
    // 但业务上完全合法（跨午夜）。改为读班次配置判断该班次是否跨日。
    if (checkIn && checkOut) {
      const cfg = useScheduleStore.getState().shiftConfigs.find((c) => c.name === schedule.shift);
      // 跨日班次判定：班次结束时间 <= 开始时间（如 22:00-06:00、20:00-04:00）
      const isOvernight = cfg ? cfg.endTime <= cfg.startTime : false;
      if (!isOvernight && checkIn >= checkOut) {
        showAlert('签退时间必须晚于签到时间');
        return;
      }
      // 跨日班次：签退时间必须 < 签到时间（否则用户可能填反了）
      if (isOvernight && checkIn < checkOut) {
        showAlert(`该班次为跨日班（${cfg?.startTime}-${cfg?.endTime}），签退时间应早于签到时间`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await useScheduleStore.getState().updateSchedule(schedule.id, {
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
      });
      showAlert('签到/签退时间已保存');
      onClose();
    } catch (err) {
      showAlert(`保存失败：${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillNow = (which: 'in' | 'out') => {
    // 当前时间向下舍入到 30 分钟步长（00 或 30），保证匹配下拉选项
    const now = roundTo30Min(nowHHmm());
    if (which === 'in') setCheckIn(now);
    else setCheckOut(now);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="签到 / 签退"
      size="md"
      onSubmit={handleSubmit}
    >
      {schedule && (
        <div className="space-y-4">
          {/* 排班概要 */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
            <div className="font-medium text-blue-800 mb-1">排班信息</div>
            <div className="text-blue-700">
              <span className="mr-3">📅 {schedule.date}</span>
              <span className="mr-3">🕐 {schedule.shift}</span>
              <span>👤 {schedule.staffName || '-'}</span>
            </div>
            {schedule.status === '已取消' && (
              <div className="text-amber-700 mt-1">⚠ 该排班已取消，签到信息仅作记录</div>
            )}
          </div>

          {/* 签到时间（2026-09-14：30 分钟间隔下拉） */}
          <FormField label="签到时间">
            <div className="flex gap-2">
              <Select value={checkIn} onValueChange={setCheckIn}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择签到时间（30 分钟间隔）" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* 2026-09-14：2 列网格布局，每行 2 个时间选项，48 项只滚 24 行 */}
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {TIME_OPTIONS.map(t => (
                      <SelectItem key={t} value={t} className="justify-center text-center">
                        {t}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFillNow('in')}
              >
                <Clock className="w-3 h-3" />
                当前
              </Button>
            </div>
          </FormField>

          {/* 签退时间（2026-09-14：30 分钟间隔下拉） */}
          <FormField label="签退时间">
            <div className="flex gap-2">
              <Select value={checkOut} onValueChange={setCheckOut}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择签退时间（30 分钟间隔）" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* 2026-09-14：2 列网格布局，每行 2 个时间选项，48 项只滚 24 行 */}
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {TIME_OPTIONS.map(t => (
                      <SelectItem key={t} value={t} className="justify-center text-center">
                        {t}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFillNow('out')}
              >
                <Clock className="w-3 h-3" />
                当前
              </Button>
            </div>
          </FormField>

          {/* 说明 */}
          <div className="text-xs text-gray-500 bg-gray-50 border rounded p-2">
            💡 填写签到或签退时间后，排班状态将自动变为"已执行"。
            如只填签到或只填签退，另一个可后续补填。
          </div>

          {submitting && (
            <div className="text-xs text-gray-500 text-center">保存中…</div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default CheckInModal;
