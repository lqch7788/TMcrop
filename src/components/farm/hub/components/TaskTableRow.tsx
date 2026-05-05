/**
 * 任务表格行组件
 */

import React from 'react';
import { FileText, Bell } from 'lucide-react';
import { STATUS_MAP, getTypeLabel, getTypeColor, formatWorkHours } from '../constants_taskDispatch';
import { OvertimeBadge } from './OvertimeBadge';

/**
 * 任务表格行任务类型
 * 用于统一任务管理中的任务数据结构
 */
interface TaskTableRowTask {
  id: string;
  taskCode?: string;
  status: string;
  type?: string;
  typeName?: string;
  types?: string[];
  field?: string;
  greenhouseName?: string;
  crop?: string;
  cropName?: string;
  cropRemarks?: string;
  batchCode?: string;
  assignee?: string;
  assigneeName?: string;
  assigneeId?: string;
  progress?: number;
  priority?: string;
  timeout?: {
    severity?: string;
    [key: string]: unknown;
  };
  remarks?: string;
  sopContent?: string;
  planStart?: string;
  planEnd?: string;
  dueDate?: string;
  estimatedDays?: number;
  estimatedHours?: number;
  // 临时任务特有字段
  sourceType?: string;
  sourceProblemId?: string;
  workLocation?: string;
  urgency?: string;
  tempTaskType?: string;
  workerCount?: number;
  totalEstimatedHours?: number;
  // 巡查反馈特有字段
  sourceId?: string;
  recordCode?: string;
  inspectionType?: string;
  submitterId?: string;
  submitterName?: string;
  assignerName?: string;
  location?: string;
  checkDate?: string;
  checkTime?: string;
  checkResult?: string;
  issueCategories?: string[];
  issueSeverity?: string;
  issueText?: string;
  photos?: string[];
  feedbackStatus?: string;
  feedbackUsers?: Array<{ id: string; name: string }>;
  processProgress?: number;
  inspectorId?: string;
  inspectorName?: string;
  createdAt?: string;
  [key: string]: unknown;  // 允许额外属性
}

interface TaskTableRowProps {
  task: TaskTableRowTask;
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
  onSelectExecutor?: () => void;
  onPublish?: () => void;  // 发布草稿任务
  // 标识是否为"我的任务"视图（true=执行人视图，显示接受/拒绝；false=管理者视图，显示撤回/取消）
  isMyTasksView?: boolean;
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
  onSelectExecutor,
  onPublish,
  isMyTasksView = false,
  remindProps,
  canRemind,
  sendReminder,
}: TaskTableRowProps) => {
  const statusInfo = STATUS_MAP[task.status] || { label: task.status, bg: 'bg-gray-100', color: 'text-gray-600' };

  return (
    <tr key={task.id} className="hover:bg-blue-100 transition-colors">
      {/* 复选框 */}
      {showCheckbox && (
        <td className="px-3 py-3 text-center whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!isSelectable}
            onChange={onSelect}
            className={`w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 ${!isSelectable ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isSelectable ? selectableReason : ''}
          />
        </td>
      )}

      {/* 任务ID */}
      <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
        <button
          onClick={onViewDetail}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          title="点击查看详情"
        >
          {task.id}
        </button>
      </td>

      {/* 任务类型 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-wrap gap-1 items-center">
          {/* 优先使用 typeName 显示，兼容 types 数组 */}
          {task.typeName ? (
            <span className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(task.type)}`}>
              {task.typeName}
            </span>
          ) : (
            (task.types || []).slice(0, 2).map((typeValue: string, idx: number) => {
              const typeLabel = getTypeLabel(typeValue);
              return typeLabel === '其他' ? (
                <span key={idx} className="text-orange-500 text-xs">其他</span>
              ) : (
                <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
                  {typeLabel}
                </span>
              );
            })
          )}
          {(task.types || []).length > 2 && (
            <span className="text-xs text-gray-500">+{(task.types || []).length - 2}</span>
          )}
        </div>
      </td>

      {/* 任务区域 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.greenhouseName || task.field || '-'}
      </td>

      {/* 作物 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.cropName ? (
          task.cropName === '其他' ? (
            <div className="text-orange-500 text-xs">其他（{task.cropRemarks || ''}）</div>
          ) : (
            <span className="text-sm text-gray-600">{task.cropName}</span>
          )
        ) : task.crop === '其他' ? (
          <div className="text-orange-500 text-xs">其他（{task.cropRemarks || ''}）</div>
        ) : (
          <span className="text-sm text-gray-600">{task.crop || '-'}</span>
        )}
      </td>

      {/* 批次 */}
      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
        {task.batchCode || '-'}
      </td>

      {/* 执行人 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-600">{task.assigneeName || task.assignee || '-'}</span>
      </td>

      {/* 进度 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden w-16 flex-shrink-0">
            <div
              className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : task.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{task.progress}%</span>
        </div>
      </td>

      {/* 优先级 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium ${task.priority === 'urgent' ? 'text-red-500' : task.priority === 'high' ? 'text-orange-500' : 'text-gray-500'}`}>
          {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : '普通'}
        </span>
      </td>

      {/* 状态 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {/* 超时警示徽章 */}
          {task.timeout && (
            <OvertimeBadge timeout={task.timeout} size="sm" showLabel={true} />
          )}
        </div>
      </td>

      {/* 操作按钮 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 草稿状态 - 发布按钮 */}
          {task.status === 'draft' && onPublish && (
            <button
              onClick={onPublish}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              发布
            </button>
          )}

          {/* 待验收 - 验收按钮 */}
          {task.status === 'waiting_acceptance' && onAccept && (
            <button
              onClick={onAccept}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
            >
              验收
            </button>
          )}

          {/* pending 且无执行人 - 选择执行人按钮 */}
          {task.status === 'pending' && !task.assigneeId && onSelectExecutor && (
            <button
              onClick={onSelectExecutor}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              选择执行人
            </button>
          )}

          {/* pending 且有执行人 */}
          {task.status === 'pending' && task.assigneeId && (
            <div className="flex items-center gap-1">
              {isMyTasksView ? (
                // 我的任务视图（执行人）：显示接受/拒绝
                <>
                  {onAccept && (
                    <button
                      onClick={onAccept}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      接受
                    </button>
                  )}
                  {onWithdraw && (
                    <button
                      onClick={onWithdraw}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      拒绝
                    </button>
                  )}
                </>
              ) : (
                // 农事任务表视图（管理者）：显示撤回/取消
                <>
                  {onWithdraw && (
                    <button
                      onClick={onWithdraw}
                      className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                    >
                      撤回
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      取消
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* accepted/in_progress - 取消按钮 */}
          {(task.status === 'accepted' || task.status === 'in_progress') && onCancel && (
            <button
              onClick={onCancel}
              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
            >
              取消
            </button>
          )}

          {/* 超时严重 - 超时处理按钮 */}
          {task.timeout?.severity === 'critical' && onOvertime && (
            <button
              onClick={onOvertime}
              className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
            >
              超时处理
            </button>
          )}

          {/* rejected - 重新派发按钮（执行人拒绝后需要重新派发给其他人） */}
          {task.status === 'rejected' && onReassign && (
            <button
              onClick={onReassign}
              className="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors"
            >
              重新派发
            </button>
          )}

          {/* failed/abandoned - 重新派发按钮 */}
          {(task.status === 'failed' || task.status === 'abandoned') && onReassign && (
            <button
              onClick={onReassign}
              className="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors"
            >
              重新派发
            </button>
          )}

          {/* 催办按钮 - 已发布状态且非终态显示（pending无执行人时不显示催办） */}
          {!['draft', 'completed', 'cancelled', 'abandoned', 'pending'].includes(task.status) && onRemind && (
            <button
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
                  alert(remindCheck.reason || '暂时无法催办');
                }
              }}
              disabled={!remindProps?.allowed}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                remindProps?.allowed
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              title={remindProps?.cooldownSec ? `${Math.ceil(remindProps.cooldownSec / 60)}分钟后可催办` : `今日已催办${remindProps?.todayCount || 0}次`}
            >
              <Bell className="w-3 h-3 inline mr-1" />
              {remindProps?.cooldownSec ? `${Math.ceil(remindProps.cooldownSec / 60)}m` : '催办'}
            </button>
          )}
        </div>
      </td>

      {/* 备注 */}
      <td className="px-3 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={task.remarks || '-'}>
        {task.remarks || '-'}
      </td>

      {/* 作业标准 */}
      <td className="px-3 py-3 whitespace-nowrap max-w-[150px]">
        {task.sopContent ? (
          <div
            className="text-blue-600 text-xs cursor-pointer hover:text-blue-800 truncate block"
            onClick={onViewSop}
            title="点击查看完整内容"
          >
            {(task.sopContent || '').substring(0, 20)}
            {(task.sopContent || '').length > 20 ? '...' : ''}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>

      {/* 计划开始 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.planStart || task.dueDate || '-'}
      </td>

      {/* 计划结束 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.planEnd || task.dueDate || '-'}
      </td>

      {/* 任务工时 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {formatWorkHours(task.estimatedDays || 0, task.estimatedHours || 0)}
      </td>
    </tr>
  );
});
