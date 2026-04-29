/**
 * 农事任务中心 - 任务详情弹窗
 * 与 TaskDispatchPage 的任务详情弹窗完全一致
 * 只读视图，仅供查看，不可操作
 */

import React, { useState, useEffect } from 'react';
import { Task, useTasks } from '../../../hooks/useTasks';
import { STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { Modal } from '../../ui/Modal';
import { X, FileText, User, Camera, MapPin, Mic, Download } from 'lucide-react';
import { STATUS_MAP, PRIORITY_MAP, TASK_TYPES } from '../taskDispatch/constants/taskDispatchConstants';
import { TASK_ACTION_CONFIG } from '../../../config/taskConfig';
import { TaskTypeConfigDisplay } from '../taskDispatch/components/TaskTypeConfigDisplay';
import { TaskConfigValues } from '../taskDispatch/hooks/useTaskTypeConfig';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onVerify?: (taskId: string) => void;
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

export function TaskDetailModal({ taskId, onClose, onVerify }: TaskDetailModalProps) {
  const { getTaskRecordsByTaskId } = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);

  // 加载任务数据和记录
  useEffect(() => {
    try {
      // 加载任务数据
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (storedTasks) {
        const parsed = JSON.parse(storedTasks);
        const tasksData = parsed.data || parsed;
        const foundTask = Array.isArray(tasksData) ? tasksData.find((t: Task) => t.id === taskId) : null;
        if (foundTask) {
          setTask(foundTask);
        }
      }

      // 加载任务记录
      const taskRecords = getTaskRecordsByTaskId(taskId);
      setRecords(taskRecords);
    } catch (error) {
      // 加载数据失败，无需额外处理
    }
  }, [taskId, getTaskRecordsByTaskId]);

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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-500 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">任务区域</label>
                  <p className="font-semibold text-gray-900">{task.greenhouseName || task.field || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">作物</label>
                  <p className="font-semibold text-gray-900">{task.cropName || task.crop || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">执行人</label>
                  <p className="font-semibold text-gray-900">{task.assigneeName || task.assignee || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">优先级</label>
                  <p className={`font-semibold ${priorityMap[task.priority]?.color || 'text-gray-900'}`}>
                    {priorityMap[task.priority]?.label || task.priority || '普通'}
                  </p>
                </div>
              </div>
            </div>

            {/* 来源信息 - 当有 sourceId 时显示 */}
            {task.sourceId && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">来源信息</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500">来源类型</label>
                      <p className="font-semibold text-gray-900">
                        {task.type === 'seedling' ? '育苗任务' : task.sourceType === 'dispatch' ? '任务派工' : task.sourceType === 'tempTask' ? '临时任务' : task.sourceType === 'inspection' ? '巡查任务' : '-'}
                      </p>
                    </div>
                    {task.sourceCode && (
                      <div>
                        <label className="text-xs text-gray-500">来源编号</label>
                        <p className="font-semibold text-gray-900">{task.sourceCode}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500">关联ID</label>
                      <p className="font-semibold text-gray-900 text-xs">{task.sourceId}</p>
                    </div>
                  </div>
                  {/* 显示详细工作内容（如果有） */}
                  {task.remarks && (
                    <div className="mt-3 pt-3 border-t border-blue-100">
                      <label className="text-xs text-gray-500 block mb-1">工作内容</label>
                      <p className="text-sm text-gray-700 whitespace-pre-line bg-white rounded p-2">{task.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 任务类型配置 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">任务类型配置</h4>
              {renderTaskTypeConfig()}
            </div>

            {/* 所需物资 */}
            {task.materials && task.materials.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需物资</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                        <th className="text-left pb-2">物资名称</th>
                        <th className="text-right pb-2">数量</th>
                        <th className="text-right pb-2">单位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {task.materials.map((m, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-gray-900">{m.name}</td>
                          <td className="py-2 text-gray-900 text-right">{m.qty}</td>
                          <td className="py-2 text-gray-500 text-right">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 所需工具 */}
            {(task.tools && task.tools.length > 0) || task.toolsRemarks ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需工具</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {task.tools && task.tools.length > 0 ? (
                    <table className="w-full text-sm mb-2">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left pb-2">工具名称</th>
                          <th className="text-right pb-2">数量</th>
                          <th className="text-right pb-2">单位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {task.tools.map((t, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 text-gray-900">{t.name}</td>
                            <td className="py-2 text-gray-900 text-right">{t.qty}</td>
                            <td className="py-2 text-gray-500 text-right">{t.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">计划开始</label>
                  <p className="font-semibold text-gray-900">{task.planStart || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">计划结束</label>
                  <p className="font-semibold text-gray-900">{task.planEnd || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status]?.bg || ''} ${statusMap[task.status]?.color || ''}`}>
                      {statusMap[task.status]?.label || task.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">预计时长</label>
                  <p className="font-semibold text-gray-900">
                    {task.estimatedDays > 0 ? `${task.estimatedDays}天` : ''}
                    {task.estimatedHours > 0 ? `${task.estimatedHours}小时` : ''}
                    {!task.estimatedDays && !task.estimatedHours ? '-' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* 实际完成工作量 */}
            {hasActualWorkload && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">实际完成工作量</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-green-600">实际工日</label>
                      <p className="font-bold text-green-700 text-lg">
                        {actualWorkload.days > 0 ? `${actualWorkload.days}天` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-green-600">实际工时</label>
                      <p className="font-bold text-green-700 text-lg">
                        {actualWorkload.hours > 0 ? `${actualWorkload.hours}小时` : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-green-600">作业人数</label>
                      <p className="font-bold text-green-700 text-lg">
                        {actualWorkload.workers > 0 ? `${actualWorkload.workers}人` : '-'}
                      </p>
                    </div>
                  </div>
                  {task.estimatedDays !== undefined && task.estimatedHours !== undefined && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-green-600">
                        预估总工时：{(task.estimatedDays * 8 + task.estimatedHours)}小时 → 实际总工时：{actualWorkload.days * 8 + actualWorkload.hours}小时
                        {actualWorkload.days * 8 + actualWorkload.hours > 0 && (
                          <span className={`ml-2 ${actualWorkload.days * 8 + actualWorkload.hours > task.estimatedDays * 8 + task.estimatedHours ? 'text-red-600' : 'text-green-600'}`}>
                            ({actualWorkload.days * 8 + actualWorkload.hours > task.estimatedDays * 8 + task.estimatedHours ? '超出' : '节省'}
                            {Math.abs((actualWorkload.days * 8 + actualWorkload.hours) - (task.estimatedDays * 8 + task.estimatedHours)).toFixed(1)}小时)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 必填反馈 */}
            {task.requiredFeedback && task.requiredFeedback.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">必填反馈</h4>
                <div className="flex flex-wrap gap-2">
                  {task.requiredFeedback.map(fb => (
                    <span key={fb} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
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

            {/* 执行进度 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${task.progress === 100 ? 'bg-green-500' : task.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">{task.progress || 0}%</span>
              </div>
            </div>

            {/* 执行反馈记录 */}
            {sortedRecords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">执行反馈记录</h4>
                <div className="space-y-3">
                  {sortedRecords.map((record, index) => {
                    const actionConfig = TASK_ACTION_CONFIG[record.action as keyof typeof TASK_ACTION_CONFIG];
                    const statusConfig = record.toStatus ? STATUS_MAP[record.toStatus as keyof typeof STATUS_MAP] : null;
                    const isLatest = index === 0;
                    return (
                      <div
                        key={record.id}
                        className={`relative pl-6 pb-4 ${
                          index !== sortedRecords.length - 1 ? 'border-l-2 border-gray-200' : ''
                        }`}
                      >
                        {/* 时间线节点 */}
                        <div
                          className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
                            isLatest ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        />
                        {/* 记录内容 */}
                        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  actionConfig?.bg || 'bg-gray-100'
                                } ${actionConfig?.color || 'text-gray-600'}`}
                              >
                                {actionConfig?.label || record.action}
                              </span>
                              {record.fromStatus && (
                                <>
                                  <span className="text-gray-400 text-xs">→</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      statusConfig?.bg || 'bg-gray-100'
                                    } ${statusConfig?.color || 'text-gray-600'}`}
                                  >
                                    {statusConfig?.label || record.toStatus}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(record.actionTime).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          {/* 操作人 */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <User className="w-3 h-3" />
                            <span>{record.operatorName}</span>
                          </div>
                          {/* 进度信息 */}
                          {record.progress !== undefined && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <FileText className="w-3 h-3" />
                              <span>
                                进度：{record.progress}%
                                {record.progressIncrement !== undefined && record.progressIncrement > 0 && (
                                  <span className="text-emerald-600 ml-1">
                                    (+{record.progressIncrement}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          {/* 反馈内容 */}
                          {record.feedback && (
                            <div className="mt-3 space-y-2">
                              {record.feedback.text && (
                                <div className="bg-blue-50 rounded p-2 text-sm">
                                  <p className="text-gray-700">{record.feedback.text}</p>
                                </div>
                              )}
                              {record.feedback.images && record.feedback.images.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {record.feedback.images.map((img, i) => (
                                    <div
                                      key={i}
                                      className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center"
                                    >
                                      <Camera className="w-6 h-6 text-gray-400" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {record.feedback.gpsLocation && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-3 h-3" />
                                  <span>
                                    GPS: {record.feedback.gpsLocation.lat.toFixed(4)},{' '}
                                    {record.feedback.gpsLocation.lng.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              {record.feedback.voiceNote && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mic className="w-3 h-3" />
                                  <span>语音备注</span>
                                </div>
                              )}
                              {record.feedback.materials && record.feedback.materials.length > 0 && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">物料使用：</span>
                                  {record.feedback.materials.map((m, mi) => (
                                    <span key={mi} className="ml-1">
                                      {m.name}({m.qty}{m.unit})
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* 工作量确认 */}
                              {(record.feedback.workloadDays !== undefined || record.feedback.workloadHours !== undefined || record.feedback.workers !== undefined) && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">工作量确认：</span>
                                  {record.feedback.workloadDays !== undefined && `${record.feedback.workloadDays}天`}
                                  {record.feedback.workloadHours !== undefined && `${record.feedback.workloadHours}小时`}
                                  {record.feedback.workers !== undefined && `×${record.feedback.workers}人`}
                                </div>
                              )}
                              {/* 物资编码 */}
                              {record.feedback.materialCode && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">物资编码：</span>
                                  {record.feedback.materialCode}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            关闭
          </button>
          {canVerify && (
            <button
              onClick={() => onVerify?.(taskId)}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              验收
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
