/**
 * 每日工单汇总 - 任务详情弹窗
 * 使用统一 Modal 组件（支持拖动、最大化、缩放）
 */

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { FileText, Package, Wrench, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import type { Task } from '../../hooks/useTasks';
import { TASK_STATUS_CONFIG } from '../../hooks/useTasks';
import type { TaskRecord } from '../../types/task';
import { TaskRecordTimeline } from '../common/TaskRecordTimeline';
import { getTaskRecords } from '../../services/apiFarmTaskService';

interface DailyWorkDetailModalProps {
  taskId: string;
  onClose: () => void;
  tasks: Task[];
}

export function DailyWorkDetailModal({ taskId, onClose, tasks }: DailyWorkDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);

  useEffect(() => {
    const found = tasks.find(t => t.id === taskId) || null;
    setTask(found);

    // 加载流转记录
    if (taskId) {
      getTaskRecords(taskId).then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted: TaskRecord[] = data.map((r: Record<string, unknown>) => ({
            id: String(r.id || ''),
            taskId: String(r.taskId || taskId),
            taskCode: String(r.taskCode || ''),
            taskTitle: String(r.taskTitle || ''),
            operatorId: String(r.operatorId || ''),
            operatorName: String(r.operatorName || ''),
            action: (r.action || 'progress') as TaskRecord['action'],
            actionName: String(r.actionName || r.action || ''),
            fromStatus: r.fromStatus ? String(r.fromStatus) as TaskRecord['fromStatus'] : undefined,
            toStatus: String(r.toStatus || ''),
            progress: r.progress !== undefined ? Number(r.progress) : undefined,
            progressIncrement: r.progressIncrement !== undefined ? Number(r.progressIncrement) : undefined,
            comment: r.comment ? String(r.comment) : undefined,
            reason: r.reason ? String(r.reason) : undefined,
            feedback: r.feedback as TaskRecord['feedback'],
            actionTime: String(r.actionTime || r.createdAt || new Date().toISOString()),
            createdAt: String(r.createdAt || r.actionTime || new Date().toISOString()),
          }));
          setRecords(formatted);
        }
      }).catch((err) => {
        // Fail Loud：加载流转记录失败必须上报，禁止静默吞错
        console.error('[DailyWorkDetailModal] 加载流转记录失败:', taskId, err);
        setRecords([]);
      });
    }
  }, [taskId, tasks]);

  // 优先级映射
  const priorityMap: Record<string, { color: string; label: string }> = {
    urgent: { color: 'text-red-600', label: '紧急' },
    high: { color: 'text-orange-600', label: '高' },
    normal: { color: 'text-gray-600', label: '普通' },
    low: { color: 'text-gray-400', label: '低' },
  };

  if (!task) {
    return null;
  }

  // 状态标签：直接复用 useTasks 的 TASK_STATUS_CONFIG（含 rejected→返工中）
  const statusInfo = TASK_STATUS_CONFIG[task.status] || { bg: 'bg-gray-100', color: 'text-gray-600', label: task.status };
  const priorityInfo = priorityMap[task.priority || 'normal'] || { color: 'text-gray-600', label: '普通' };

  return (
    <Modal
      isOpen={!!task}
      onClose={onClose}
      title={`任务详情 - ${task.taskCode || task.id}`}
      size="xl"
      showFooter={false}
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
      bodyClassName="scrollbar-thin"
    >
      {/* 内容区域 - 单页滚动展示 */}
      <div className="space-y-4">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <h4 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            基本信息
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500">任务编号</Label>
              <p className="font-semibold text-gray-900">{task.taskCode || task.id}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">任务标题</Label>
              <p className="font-semibold text-gray-900">{task.title || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">任务类型</Label>
              <p className="font-semibold text-gray-900">{task.typeName || task.type || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">作业区域</Label>
              <p className="font-semibold text-gray-900">{task.greenhouseName || task.field || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">作物</Label>
              <p className="font-semibold text-gray-900">{task.cropName || task.crop || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">执行人</Label>
              <p className="font-semibold text-gray-900">{task.assigneeName || task.assignee || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">优先级</Label>
              <p className={`font-semibold ${priorityInfo.color}`}>{priorityInfo.label}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">状态</Label>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* 时间信息 */}
        <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
          <h4 className="text-sm font-bold text-sky-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            时间信息
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-sky-600">计划开始</Label>
              <p className="font-semibold text-gray-900">{task.planStart || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-sky-600">计划结束</Label>
              <p className="font-semibold text-gray-900">{task.planEnd || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-sky-600">截止时间</Label>
              <p className="font-semibold text-gray-900">{task.dueDate || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-sky-600">预计时长</Label>
              <p className="font-semibold text-gray-900">
                {(task.estimatedDays || 0) > 0 ? `${task.estimatedDays}天` : ''}
                {(task.estimatedHours || 0) > 0 ? `${task.estimatedHours}小时` : ''}
                {!task.estimatedDays && !task.estimatedHours ? '-' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* 执行进度 */}
        <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
          <h4 className="text-sm font-bold text-cyan-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            执行进度
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${task.progress === 100 ? 'bg-emerald-500' : task.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                style={{ width: `${task.progress || 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-cyan-700">{task.progress || 0}%</span>
          </div>
        </div>

        {/* 所需物资 */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            所需物资
          </h4>
          {task.materials && task.materials.length > 0 ? (
            <div className="bg-white rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs text-amber-600">
                    <TableHead className="text-left pb-2">物资名称</TableHead>
                    <TableHead className="text-right pb-2">数量</TableHead>
                    <TableHead className="text-right pb-2">单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {task.materials.map((m: any, i: number) => (
                    <TableRow key={`mat-${m.name}-${i}`}>
                      <TableCell className="py-2 text-gray-900">{m.name}</TableCell>
                      <TableCell className="py-2 text-gray-900 text-right">{m.qty}</TableCell>
                      <TableCell className="py-2 text-gray-500 text-right">{m.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-3">暂无所需物资</p>
          )}
        </div>

        {/* 所需工具 */}
        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            所需工具
          </h4>
          {task.tools && task.tools.length > 0 ? (
            <div className="bg-white rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs text-gray-500">
                    <TableHead className="text-left pb-2">工具名称</TableHead>
                    <TableHead className="text-right pb-2">数量</TableHead>
                    <TableHead className="text-right pb-2">单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {task.tools.map((t: any, i: number) => (
                    <TableRow key={`tool-${t.name}-${i}`}>
                      <TableCell className="py-2 text-gray-900">{t.name}</TableCell>
                      <TableCell className="py-2 text-gray-900 text-right">{t.qty}</TableCell>
                      <TableCell className="py-2 text-gray-500 text-right">{t.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-3">暂无所需工具</p>
          )}
          {task.toolsRemarks && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">备注：</p>
              <p className="text-sm text-gray-900">{task.toolsRemarks}</p>
            </div>
          )}
        </div>

        {/* 作业标准 */}
        {task.sopContent && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              作业标准 (SOP)
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-line bg-white rounded p-3 border border-purple-100 max-h-32 overflow-y-auto">
              {task.sopContent}
            </p>
          </div>
        )}

        {/* 备注 */}
        {task.remarks && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              备注
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-line">{task.remarks}</p>
          </div>
        )}

        {/* 流转记录 */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            流转记录
          </h4>
          {records.length > 0 ? (
            <TaskRecordTimeline records={records} showStatusChange showFeedback />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">暂无流转记录</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
