/**
 * 农事任务中心 - 任务详情弹窗
 * 与 TaskDispatchPage 的任务详情弹窗完全一致
 * 只读视图，仅供查看，不可操作
 */

import React, { useState, useEffect } from 'react';
import { type Task } from '../../../hooks/useTasks';
import { X, FileText, User, Camera, MapPin, Mic, Download } from 'lucide-react';
import { Button, Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { STATUS_MAP, PRIORITY_MAP, TASK_TYPES } from '../taskDispatch/constants/taskDispatchConstants';
import { TASK_ACTION_CONFIG } from '../../../config/taskConfig';
import { TaskTypeConfigDisplay } from '../taskDispatch/components/TaskTypeConfigDisplay';
import type { TaskConfigValues } from '../taskDispatch/hooks/useTaskTypeConfig';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onVerify?: (taskId: string) => void;
  /** 从父组件传入的完整任务列表（复用 useTasks 数据源） */
  tasks: Task[];
  /** 从父组件传入的任务记录获取函数（复用 useTasks 实例） */
  getTaskRecordsByTaskId: (taskId: string) => TaskRecord[];
}

interface TaskRecord {
  id: string;
  taskId: string;
  actionTime: string;
  operatorName: string;
  action: string;
  content?: string;
  fromStatus?: string;
  toStatus?: string;
  progress?: number;
  progressIncrement?: number;
  feedback?: {
    text?: string;
    images?: string[];
    gpsLocation?: { lat: number; lng: number };
    voiceNote?: boolean;
    materials?: { name: string; qty: string; unit: string }[];
    workloadDays?: number;
    workloadHours?: number;
    workers?: number;
    materialCode?: string;
  };
}

export function TaskDetailModal({ taskId, onClose, onVerify, tasks, getTaskRecordsByTaskId }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);

  // 加载任务数据和记录
  useEffect(() => {
    // 从父组件传入的 tasks 中查找（复用 useTasks 数据源，不再读 useFarmTaskStore）
    const foundTask = tasks.find((t) => t.id === taskId) || null;
    setTask(foundTask);

    // 加载任务记录
    const taskRecords = getTaskRecordsByTaskId(taskId);
    setRecords(taskRecords);
  }, [taskId, tasks, getTaskRecordsByTaskId]);

  // 状态映射 - 放在条件返回之前，因为 hooks 必须在条件返回之前
  const statusMap = STATUS_MAP;
  const priorityMap = PRIORITY_MAP;
  const taskTypes = TASK_TYPES;

  // 计算实际完成工作量 - 使用普通函数而非 useCallback，避免 hooks 规则问题
  const calculateActualWorkload = () => {
    let totalDays = 0;
    let totalHours = 0;
    let totalWorkers = 0;
    records.forEach(record => {
      if (record.feedback) {
        if (record.feedback.workloadDays) totalDays += record.feedback.workloadDays;
        if (record.feedback.workloadHours) totalHours += record.feedback.workloadHours;
        if (record.feedback.workers && record.feedback.workers > totalWorkers) totalWorkers = record.feedback.workers;
      }
    });
    return { days: totalDays, hours: totalHours, workers: totalWorkers };
  };

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  const actualWorkload = calculateActualWorkload();
  const hasActualWorkload = actualWorkload.days > 0 || actualWorkload.hours > 0;

  // 判断是否可以验收
  const canVerify = task.status === 'waiting_acceptance' && onVerify;

  // 按时间倒序排序记录
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
  );

  // 获取任务类型配置显示 - 与派工页面完全一致
  const renderTaskTypeConfig = () => {
    if (!task.types || task.types.length === 0) return null;

    if (task.types.length === 1) {
      // 单一任务类型 - 使用 TaskTypeConfigDisplay 显示详细配置
      return (
        <TaskTypeConfigDisplay
          taskType={task.types[0]}
          configValues={(task.typeConfig || {}) as TaskConfigValues}
        />
      );
    }

    // 多任务类型 - 显示SOP信息
    return (
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">作业标准文件</span>
        </div>
        {task.sopContent ? (
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-sm text-gray-600 mb-2">已导入SOP文档</p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // 创建Blob下载
                const blob = new Blob([task.sopContent || ''], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `任务SOP_${task.id}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              下载SOP文件
            </a>
          </div>
        ) : (
          <p className="text-sm text-gray-500">暂无SOP文件</p>
        )}
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">已选择的操作类型：</p>
          <div className="flex flex-wrap gap-2">
            {task.types.map(t => {
              const typeInfo = taskTypes.find(tt => tt.value === t);
              return (
                <span
                  key={t}
                  className={`px-2 py-1 rounded text-xs text-white ${typeInfo?.color || 'bg-gray-500'}`}
                >
                  {typeInfo?.label || t}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 主内容区 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">任务详情</h3>
            <span className={`px-2 py-0.5 text-xs rounded ${statusMap[task.status]?.bg || 'bg-gray-100'} ${statusMap[task.status]?.color || 'text-gray-600'}`}>
              {statusMap[task.status]?.label || task.status}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* 基本信息 - 白色背景，蓝色标题 */}
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                基本信息
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">任务类型</Label>
                  <p className="font-semibold text-gray-900">{task.typeName || task.type || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">任务区域</Label>
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
                  <p className={`font-semibold ${priorityMap[task.priority]?.color || 'text-gray-900'}`}>
                    {priorityMap[task.priority]?.label || task.priority || '普通'}
                  </p>
                </div>
              </div>
            </div>

            {/* 来源信息 - 蓝色背景 */}
            {task.sourceId && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  来源信息
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-blue-600">来源类型</Label>
                    <p className="font-semibold text-gray-900">
                      {task.type === 'seedling' ? '育苗任务' : task.sourceType === 'dispatch' ? '任务派工' : task.sourceType === 'tempTask' ? '临时任务' : task.sourceType === 'inspection' ? '巡查任务' : '-'}
                    </p>
                  </div>
                  {task.sourceCode && (
                    <div>
                      <Label className="text-xs text-blue-600">来源编号</Label>
                      <p className="font-semibold text-gray-900">{task.sourceCode}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-blue-600">关联ID</Label>
                    <p className="font-semibold text-gray-900 text-xs">{task.sourceId}</p>
                  </div>
                </div>
                {/* 显示详细工作内容（如果有） */}
                {task.remarks && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Label className="text-xs text-blue-600">工作内容</Label>
                    <p className="text-sm text-gray-700 whitespace-pre-line bg-white rounded p-2">{task.remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* 任务类型配置 - 紫色背景 */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <h4 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                任务类型配置
              </h4>
              {renderTaskTypeConfig()}
            </div>

            {/* 所需物资 - 橙色背景 */}
            {task.materials && task.materials.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  所需物资
                </h4>
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
                      {task.materials.map((m, i) => (
                        <TableRow key={`mat-${m.name}-${i}`}>
                          <TableCell className="py-2 text-gray-900">{m.name}</TableCell>
                          <TableCell className="py-2 text-gray-900 text-right">{m.qty}</TableCell>
                          <TableCell className="py-2 text-gray-500 text-right">{m.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 所需工具 - 灰色背景 */}
            {(task.tools && task.tools.length > 0) || task.toolsRemarks ? (
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  所需工具
                </h4>
                <div className="bg-white rounded-lg">
                  {task.tools && task.tools.length > 0 ? (
                    <Table className="mb-2">
                      <TableHeader>
                        <TableRow className="text-xs text-gray-500">
                          <TableHead className="text-left pb-2">工具名称</TableHead>
                          <TableHead className="text-right pb-2">数量</TableHead>
                          <TableHead className="text-right pb-2">单位</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {task.tools.map((t, i) => (
                          <TableRow key={`tool-${t.name}-${i}`}>
                            <TableCell className="py-2 text-gray-900">{t.name}</TableCell>
                            <TableCell className="py-2 text-gray-900 text-right">{t.qty}</TableCell>
                            <TableCell className="py-2 text-gray-500 text-right">{t.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">暂无所需工具</p>
                  )}
                  {task.toolsRemarks && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">备注：</p>
                      <p className="text-sm text-gray-900">{task.toolsRemarks}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* 时间信息 - 天蓝色背景 */}
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
                  <Label className="text-xs text-sky-600">状态</Label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status]?.bg || ''} ${statusMap[task.status]?.color || ''}`}>
                      {statusMap[task.status]?.label || task.status}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-sky-600">预计时长</Label>
                  <p className="font-semibold text-gray-900">
                    {task.estimatedDays > 0 ? `${task.estimatedDays}天` : ''}
                    {task.estimatedHours > 0 ? `${task.estimatedHours}小时` : ''}
                    {!task.estimatedDays && !task.estimatedHours ? '-' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* 实际完成工作量 - 绿色背景 */}
            {hasActualWorkload && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  实际完成工作量
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-emerald-600">实际工日</Label>
                    <p className="font-bold text-emerald-700 text-lg">
                      {actualWorkload.days > 0 ? `${actualWorkload.days}天` : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-emerald-600">实际工时</Label>
                    <p className="font-bold text-emerald-700 text-lg">
                      {actualWorkload.hours > 0 ? `${actualWorkload.hours}小时` : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-emerald-600">作业人数</Label>
                    <p className="font-bold text-emerald-700 text-lg">
                      {actualWorkload.workers > 0 ? `${actualWorkload.workers}人` : '-'}
                    </p>
                  </div>
                </div>
                {task.estimatedDays !== undefined && task.estimatedHours !== undefined && (
                  <div className="mt-3 pt-3 border-t border-emerald-200">
                    <p className="text-xs text-emerald-600">
                      预估总工时：{(task.estimatedDays * 8 + task.estimatedHours)}小时 → 实际总工时：{actualWorkload.days * 8 + actualWorkload.hours}小时
                      {actualWorkload.days * 8 + actualWorkload.hours > 0 && (
                        <span className={`ml-2 ${actualWorkload.days * 8 + actualWorkload.hours > task.estimatedDays * 8 + task.estimatedHours ? 'text-red-600' : 'text-emerald-600'}`}>
                          ({actualWorkload.days * 8 + actualWorkload.hours > task.estimatedDays * 8 + task.estimatedHours ? '超出' : '节省'}
                          {Math.abs((actualWorkload.days * 8 + actualWorkload.hours) - (task.estimatedDays * 8 + task.estimatedHours)).toFixed(1)}小时)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 必填反馈 - 粉色背景 */}
            {task.requiredFeedback && task.requiredFeedback.length > 0 && (
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
                <h4 className="text-sm font-bold text-pink-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  必填反馈
                </h4>
                <div className="flex flex-wrap gap-2">
                  {task.requiredFeedback.map(fb => (
                    <span key={fb} className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">
                      {fb === 'gps' && '位置打卡'}
                      {fb === 'material' && '物资扫码'}
                      {fb === 'photo_before' && '作业前照片'}
                      {fb === 'photo_after' && '作业后照片'}
                      {fb === 'voice' && '语音备注'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 执行进度 - 青色背景 */}
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
              <h4 className="text-sm font-bold text-cyan-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
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

            {/* 处理流转记录 */}
            {sortedRecords.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <span>📋</span>
                    处理流转记录（{sortedRecords.length}条）
                  </h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {sortedRecords.map((record, index) => {
                    const actionName = record.action || '';
                    const fromStatus = record.fromStatus || '';
                    const toStatus = record.toStatus || '';
                    const comment = record.content || record.comment || '';
                    const reason = record.reason || '';
                    return (
                    <div key={record.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* 时间线节点 */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                            actionName.includes('验收通过') || actionName.includes('通过') ? 'bg-green-500' :
                            actionName.includes('返工') || actionName.includes('驳回') ? 'bg-red-500' :
                            actionName.includes('提交') || actionName.includes('反馈') ? 'bg-amber-500' :
                            actionName.includes('分派') || actionName.includes('派发') || actionName.includes('发布') ? 'bg-blue-500' :
                            actionName.includes('接单') || actionName.includes('接受') || actionName.includes('开始') ? 'bg-indigo-500' :
                            'bg-gray-500'
                          }`}>
                            {sortedRecords.length - index}
                          </div>
                          {index < sortedRecords.length - 1 && (
                            <div className="w-0.5 h-full min-h-[40px] bg-gray-200 mt-1"></div>
                          )}
                        </div>

                        {/* 流转详情 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{record.operatorName}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                actionName.includes('验收通过') || actionName.includes('通过') ? 'bg-green-100 text-green-700' :
                                actionName.includes('返工') || actionName.includes('驳回') ? 'bg-red-100 text-red-700' :
                                actionName.includes('提交') || actionName.includes('反馈') ? 'bg-amber-100 text-amber-700' :
                                actionName.includes('分派') || actionName.includes('派发') || actionName.includes('发布') ? 'bg-blue-100 text-blue-700' :
                                actionName.includes('接单') || actionName.includes('接受') || actionName.includes('开始') ? 'bg-indigo-100 text-indigo-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {actionName}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {(() => {
                                const d = new Date(record.actionTime);
                                if (isNaN(d.getTime())) return '';
                                return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                              })()}
                            </span>
                          </div>

                          {/* 状态变化 */}
                          {(fromStatus || toStatus) && (
                            <div className="flex items-center gap-1 mb-1">
                              {fromStatus && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {fromStatus}
                                </span>
                              )}
                              <span className="text-gray-400">→</span>
                              {toStatus && (
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  toStatus.includes('completed') || toStatus.includes('完成') ? 'bg-green-100 text-green-700' :
                                  toStatus.includes('waiting_acceptance') || toStatus.includes('验收') ? 'bg-amber-100 text-amber-700' :
                                  toStatus.includes('in_progress') || toStatus.includes('进行') ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {toStatus}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 进度显示 */}
                          {record.progress !== undefined && record.progress !== null && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 max-w-[120px] bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${record.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{record.progress}%</span>
                            </div>
                          )}

                          {/* 备注/原因 */}
                          {comment && (
                            <div className="mt-1 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                              {comment}
                            </div>
                          )}
                          {reason && (
                            <div className="mt-1 text-sm text-red-600 bg-red-50 rounded px-2 py-1">
                              {reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 无流转记录提示 */}
            {sortedRecords.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                暂无处理流转记录
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
          {canVerify && (
            <Button
              variant="default"
              onClick={() => onVerify?.(taskId)}
            >
              验收
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
