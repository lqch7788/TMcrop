/**
 * 任务表格行组件
 */

import React from 'react';
import { FileText, Bell } from 'lucide-react';
import { Button } from '../../../ui/button';
import { STATUS_MAP, getTypeLabel, getTypeColor, formatWorkHours } from '../constants/taskDispatchConstants';
import { OvertimeBadge } from './OvertimeBadge';
import { Input } from '../../../ui/input';
import { TableRow, TableCell } from '../../../ui/table';
import { showAlert } from '@/lib/dialogService';

interface TaskTableRowProps {
  task: any;
  index: number;
  showCheckbox: boolean;
  isSelected: boolean;
  isSelectable: boolean;
  selectableReason?: string;
  onSelect: () => void;
  onViewDetail: () => void;
  onViewSop?: () => void;
  onAccept?: () => void;
  onWithdraw?: () => void;
  onCancel?: () => void;
  onOvertime?: () => void;
  onContinue?: () => void;
  onReassign?: () => void;
  onRemind?: () => void;
  remindProps?: {
    allowed: boolean;
    cooldownSec: number;
    todayCount: number;
  };
  canRemind: (taskId: string) => { allowed: boolean; reason?: string };
  sendReminder: (
    taskId: string,
    taskCode: string,
    assigneeId: string,
    assigneeName: string,
    senderId: string,
    senderName: string
  ) => void;
}

export const TaskTableRow = React.memo<TaskTableRowProps>(({
  task,
  index,
  showCheckbox,
  isSelected,
  isSelectable,
  selectableReason,
  onSelect,
  onViewDetail,
  onViewSop,
  onAccept,
  onWithdraw,
  onCancel,
  onOvertime,
  onContinue,
  onReassign,
  onRemind,
  remindProps,
  canRemind,
  sendReminder,
}: TaskTableRowProps) => {
  const statusInfo = STATUS_MAP[task.status] || { label: task.status, bg: 'bg-gray-100', color: 'text-gray-600' };

  return (
    <TableRow key={task.id} className="hover:bg-blue-100 transition-colors">
      {/* 复选框 */}
      {showCheckbox && (
        <TableCell className="px-3 py-3 text-center whitespace-nowrap">
          <Input
            type="checkbox"
            checked={isSelected}
            disabled={!isSelectable}
            onChange={onSelect}
            className={`w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 ${!isSelectable ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isSelectable ? selectableReason : ''}
          />
        </TableCell>
      )}

      {/* 任务ID */}
      <TableCell className="px-3 py-3 text-sm font-medium whitespace-nowrap">
        <Button
          variant="link"
          size="sm"
          onClick={onViewDetail}
          title="点击查看详情"
        >
          {task.id}
        </Button>
      </TableCell>

      {/* 任务类型 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-wrap gap-1 items-center">
          {(task.types || []).slice(0, 2).map((typeValue: string, idx: number) => {
            const typeLabel = getTypeLabel(typeValue);
            return typeLabel === '其他' ? (
              <span key={idx} className="text-orange-500 text-xs">其他</span>
            ) : (
              <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
                {typeLabel}
              </span>
            );
          })}
          {(task.types || []).length > 2 && (
            <span className="text-xs text-gray-500">+{(task.types || []).length - 2}</span>
          )}
        </div>
      </TableCell>

      {/* 任务区域 */}
      <TableCell className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.field}</TableCell>

      {/* 作物 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        {task.crop === '其他' ? (
          <div className="text-orange-500 text-xs">其他（{(task as any).cropRemarks || ''}）</div>
        ) : (
          <span className="text-sm text-gray-600">{task.crop}</span>
        )}
      </TableCell>

      {/* 批次 */}
      <TableCell className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
        {(task as any).batchCode || '-'}
      </TableCell>

      {/* 执行人 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-600">{task.assignee}</span>
      </TableCell>

      {/* 进度 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden w-16 flex-shrink-0">
            <div
              className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : task.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{task.progress}%</span>
        </div>
      </TableCell>

      {/* 优先级 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium ${task.priority === 'urgent' ? 'text-red-500' : task.priority === 'high' ? 'text-orange-500' : 'text-gray-500'}`}>
          {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : '普通'}
        </span>
      </TableCell>

      {/* 状态 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {/* 超时警示徽章 */}
          {(task as any).timeout && (
            <OvertimeBadge timeout={(task as any).timeout} size="sm" showLabel={true} />
          )}
        </div>
      </TableCell>

      {/* 操作按钮 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 待验收 - 验收按钮 */}
          {task.status === 'waiting_acceptance' && onAccept && (
            <Button
              variant="default"
              size="sm"
              onClick={onAccept}
            >
              验收
            </Button>
          )}

          {/* pending - 撤回按钮 */}
          {task.status === 'pending' && onWithdraw && (
            <Button
              variant="warning"
              size="sm"
              onClick={onWithdraw}
            >
              撤回
            </Button>
          )}

          {/* accepted/in_progress - 取消按钮 */}
          {(task.status === 'accepted' || task.status === 'in_progress') && onCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onCancel}
            >
              取消
            </Button>
          )}

          {/* 超时严重 - 超时处理按钮 */}
          {(task as any).timeout?.severity === 'critical' && onOvertime && (
            <Button
              variant="default"
              size="sm"
              onClick={onOvertime}
            >
              超时处理
            </Button>
          )}

          {/* rejected - 重新派发按钮（执行人拒绝后需要重新派发给其他人） */}
          {task.status === 'rejected' && onReassign && (
            <Button
              variant="default"
              size="sm"
              onClick={onReassign}
            >
              重新派发
            </Button>
          )}

          {/* pending 但没有执行人（被清空） - 重新派发按钮（需要重新选择执行人） */}
          {task.status === 'pending' && !task.assigneeId && onReassign && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onReassign}
            >
              选择执行人
            </Button>
          )}

          {/* failed/abandoned - 重新派发按钮 */}
          {(task.status === 'failed' || task.status === 'abandoned') && onReassign && (
            <Button
              variant="default"
              size="sm"
              onClick={onReassign}
            >
              重新派发
            </Button>
          )}

          {/* 催办按钮 - 已发布状态且非终态显示 */}
          {!['draft', 'completed', 'cancelled', 'abandoned'].includes(task.status) && onRemind && (
            <Button
              variant={remindProps?.allowed ? 'destructive' : 'secondary'}
              size="sm"
              onClick={() => {
                const remindCheck = canRemind(task.id);
                if (remindCheck.allowed) {
                  sendReminder(
                    task.id,
                    task.taskCode || task.id,
                    task.assigneeId || '',
                    task.assigneeName || task.assignee,
                    'admin',
                    '管理员'
                  );
                } else {
                  showAlert(remindCheck.reason || '暂时无法催办');
                }
              }}
              disabled={!remindProps?.allowed}
              title={remindProps?.cooldownSec ? `${Math.ceil(remindProps.cooldownSec / 60)}分钟后可催办` : `今日已催办${remindProps?.todayCount || 0}次`}
            >
              <Bell className="w-3 h-3 mr-1" />
              {remindProps?.cooldownSec ? `${Math.ceil(remindProps.cooldownSec / 60)}m` : '催办'}
            </Button>
          )}
        </div>
      </TableCell>

      {/* 备注 */}
      <TableCell className="px-3 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={(task as any).remarks || '-'}>
        {(task as any).remarks || '-'}
      </TableCell>

      {/* 作业标准 */}
      <TableCell className="px-3 py-3 whitespace-nowrap">
        {(task.types?.length || 0) >= 2 && (task as any).sopContent ? (
          <Button
            variant="link"
            size="sm"
            onClick={onViewSop}
            className="text-xs"
          >
            <FileText className="w-3 h-3" />
            SOP文件
          </Button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </TableCell>

      {/* 计划开始 */}
      <TableCell className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.planStart || '-'}</TableCell>

      {/* 计划结束 */}
      <TableCell className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.planEnd || '-'}</TableCell>

      {/* 任务工时 */}
      <TableCell className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {formatWorkHours((task as any).estimatedDays || 0, (task as any).estimatedHours || 0)}
      </TableCell>
    </TableRow>
  );
});
