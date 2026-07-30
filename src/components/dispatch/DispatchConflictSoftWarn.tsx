/**
 * DispatchConflictSoftWarn
 *
 * 派工前冲突软警告 Modal。
 * - 显示工人姓名 + 日期 + scheduleStatus
 * - 用户必须填写覆写原因才能点"仍要派工"
 * - 覆写原因会被 useDispatchScheduleBridge 持久化到 dispatch_override_log（Task 7 后端）
 *
 * 排班调度 × 班组分配贯通（2026-07-30）
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { UnifiedModal, Button, Input, Label } from '../ui';

export interface DispatchConflictSoftWarnProps {
  open: boolean;
  workerName: string;
  date: string;
  scheduleStatus: 'off_duty' | 'no_schedule' | 'on_duty';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** scheduleStatus 中文映射（与后端 Occupations 表对齐） */
const STATUS_LABEL: Record<DispatchConflictSoftWarnProps['scheduleStatus'], string> = {
  off_duty: '请假 / 休息',
  no_schedule: '未排班',
  on_duty: '在岗',
};

export function DispatchConflictSoftWarn({
  open,
  workerName,
  date,
  scheduleStatus,
  onConfirm,
  onCancel,
}: DispatchConflictSoftWarnProps) {
  const [reason, setReason] = useState('');

  // 关闭时重置原因输入
  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const canConfirm = reason.trim().length > 0;

  const handleConfirm = () => {
    if (canConfirm) onConfirm(reason.trim());
  };

  return (
    <UnifiedModal isOpen={open} onClose={onCancel} title="派工冲突警告" size="sm">
      <div className="space-y-4" data-testid="dispatch-soft-warn">
        {/* 顶部冲突说明 */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              工人 <span className="text-red-600">{workerName}</span> 当日{' '}
              <span className="font-mono">{date}</span> 状态：
              <span className="font-medium text-amber-800">
                {STATUS_LABEL[scheduleStatus]}
              </span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              是否仍要派工？若是，请填写覆写原因（必填）。
            </p>
          </div>
        </div>

        {/* 覆写原因输入 */}
        <div>
          <Label htmlFor="override-reason">覆写原因（必填）</Label>
          <Input
            id="override-reason"
            data-testid="override-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：紧急任务，工人已电话确认可出勤"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            data-testid="soft-warn-confirm"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            仍要派工
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}