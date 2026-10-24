/**
 * 农事任务中心 - 任务详情弹窗
 * 与 TaskDispatchPage 的任务详情弹窗完全一致
 * 只读视图，仅供查看，不可操作
 */

import React, { useState, useEffect } from 'react';
import { type Task, type TaskRecord } from '../../../hooks/useTasks';
import { Camera, CheckCircle, Download, FileText, MapPin, Mic, User } from 'lucide-react';
import { Button, Label, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { STATUS_MAP, PRIORITY_MAP, TASK_TYPES } from '../taskDispatch/constants/taskDispatchConstants';
import { TASK_ACTION_CONFIG } from '../../../config/taskConfig';
import { TaskTypeConfigDisplay } from '../taskDispatch/components/TaskTypeConfigDisplay';
import type { TaskConfigValues } from '../taskDispatch/hooks/useTaskTypeConfig';
import { TaskRecordTimeline } from '../../common/TaskRecordTimeline';
// 2026-10-24：任务类型 / 来源类型的中文兜底（避免 detail 里露出 irrigation / inspection_plan 等英文）
import { resolveTaskTypeLabel } from '../../../types/farm/common';

/**
 * 任务来源类型 → 中文（2026-10-24）
 * 原实现是三元链，只覆盖 dispatch / tempTask / inspection：
 * DB 里 137 条 source_type='inspection_plan'、1 条 'problem' 全部落到 '-'（信息丢失）。
 */
const SOURCE_TYPE_LABEL: Record<string, string> = {
  dispatch: '任务派工',
  tempTask: '临时任务',
  inspection: '巡查任务',
  inspection_plan: '巡查计划',
  problem: '问题整改',
};

/** 日期时间格式化（2026-10-24：时间线各节点统一展示口径） */
function formatDateTime(v?: string): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * 领料单状态 → 中文（2026-10-24）
 * /api/material-requests 返回的 status 是英文枚举（approved/pending/…），
 * 原实现在「关联领料单」里直接渲染 → 显示英文。
 * 口径与 material 模块 useApplicationTab 的 statusTextMap 保持一致。
 */
const MATERIAL_REQUEST_STATUS_LABEL: Record<string, string> = {
  approved: '已审批',
  pending: '待审批',
  rejected: '已拒绝',
  voided: '已作废',
  cancelled: '已取消',
  draft: '草稿',
};
// P0-7：任务绑定的作业标准（SOP）
import { getSopBindings, type SopTaskBinding } from '../../../services/apiSopLibraryService';
// 2026-08-22：AI 实际工时录入 UI
import { ActualHoursRecorder } from '../../../components/farm/ai/ActualHoursRecorder';

/** P0-4：任务关联的领料单（精简展示用） */
interface LinkedMaterialRequest {
  id: string;
  code: string;
  date: string;
  status: string;
  materials: Array<{ name: string; qty: number; unit: string }>;
}

/**
 * 2026-10-21：解析后端返回的 JSON 结构化字段（changeDiff / linkedDocuments）。
 * 后端存的是 JSON 字符串，但查询层可能已解包成对象 —— 两种都兼容。
 * 解析失败返回 undefined，不抛出（避免单条坏记录整页白屏）。
 */
function parseJsonObject<T>(raw: unknown): T | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as T) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** 解析领料单 materials（JSON 字符串或数组） */
function parseLinkedMaterials(raw: unknown): Array<{ name: string; qty: number; unit: string }> {
  let list: any[] = [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  } else if (Array.isArray(raw)) {
    list = raw;
  }
  return list.map((m) => ({
    name: String(m?.materialName || m?.material_name || m?.name || m?.materialCode || ''),
    qty: Number(m?.requestedQuantity ?? m?.quantity ?? 0),
    unit: String(m?.unit || ''),
  }));
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onVerify?: (taskId: string) => void;
  /** v0.3 P0-2：快速完成回调（可选，未传则不显示按钮） */
  onQuickComplete?: (taskId: string) => void;
  /** 2026-10-11：实际工时录入成功后的刷新回调（可选，未传则仅组件内部提示成功） */
  onRefresh?: () => void;
  /** 从父组件传入的完整任务列表（复用 useTasks 数据源） */
  tasks: Task[];
  /** 从父组件传入的任务记录获取函数（复用 useTasks 实例） */
  getTaskRecordsByTaskId: (taskId: string) => TaskRecord[];
}

export function TaskDetailModal({ taskId, onClose, onVerify, onQuickComplete, onRefresh, tasks, getTaskRecordsByTaskId }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  // P0-4：关联领料单
  const [linkedRequests, setLinkedRequests] = useState<LinkedMaterialRequest[]>([]);
  // P0-7：绑定的作业标准（SOP）
  const [sopBindings, setSopBindings] = useState<SopTaskBinding[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getSopBindings(taskId);
        if (!cancelled) setSopBindings(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setSopBindings([]);
      }
    })();
    return () => { cancelled = true; };
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/material-requests?task_id=${encodeURIComponent(taskId)}`);
        const result = await res.json();
        if (cancelled) return;
        if (result?.success && Array.isArray(result.data)) {
          setLinkedRequests(result.data.map((r: Record<string, any>) => ({
            id: String(r.id || ''),
            code: String(r.requestCode || r.request_code || r.code || ''),
            date: String(r.applyDate || r.apply_date || ''),
            status: String(r.status || ''),
            materials: parseLinkedMaterials(r.materials),
          })));
        } else {
          setLinkedRequests([]);
        }
      } catch {
        // 领料单加载失败不影响任务详情展示，但需在控制台留痕
        console.error('[TaskDetailModal] 加载关联领料单失败');
        if (!cancelled) setLinkedRequests([]);
      }
    })();
    return () => { cancelled = true; };
  }, [taskId]);

  // 加载任务数据和记录
  useEffect(() => {
    // 从父组件传入的 tasks 中查找（复用 useTasks 数据源，不再读 useFarmTaskStore）
    const foundTask = tasks.find((t) => t.id === taskId) || null;
    setTask(foundTask);

    // 从后端 API 获取流转记录
    const loadRecords = async () => {
      try {
        const res = await fetch(`/api/farm-tasks/${taskId}/records`);
        const result = await res.json();

        // API 返回数据

        if (result.success && Array.isArray(result.data)) {
          // 流转记录数据
          // 解析 feedback 字段（存储为 JSON 字符串）
          // 后端 queryToObjects 返回的是 camelCase 格式
          const formattedRecords: TaskRecord[] = result.data.map((r: Record<string, unknown>) => {
            // 每个记录独立解析 feedback
            let feedback: TaskRecord['feedback'] = undefined;
            if (r.feedback && typeof r.feedback === 'string') {
              try {
                feedback = JSON.parse(r.feedback as string);
              } catch {
                feedback = undefined;
              }
            } else if (r.feedback && typeof r.feedback === 'object') {
              feedback = r.feedback as TaskRecord['feedback'];
            }
            return {
              id: String(r.id || ''),
              taskId: String(r.taskId || taskId),
              taskCode: String(r.taskCode || ''),
              taskTitle: String(r.taskTitle || ''),
              operatorId: String(r.operatorId || ''),
              operatorName: String(r.operatorName || ''),
              action: String(r.action || 'progress') as TaskRecord['action'],
              actionName: String(r.actionName || r.action || ''),
              fromStatus: r.fromStatus ? String(r.fromStatus) as TaskRecord['fromStatus'] : undefined,
              toStatus: String(r.toStatus || foundTask?.status || ''),
              progress: r.progress !== undefined ? Number(r.progress) : undefined,
              progressIncrement: r.progressIncrement !== undefined ? Number(r.progressIncrement) : undefined,
              comment: r.comment ? String(r.comment) : undefined,
              reason: r.reason ? String(r.reason) : undefined,
              feedback,
              // 2026-10-21 追溯增强字段（后端 snake→camel 后为 assigneeNameAtAction / operatorIp / ...）
              assigneeNameAtAction: r.assigneeNameAtAction ? String(r.assigneeNameAtAction) : undefined,
              operatorIp: r.operatorIp ? String(r.operatorIp) : undefined,
              operatorUserAgent: r.operatorUserAgent ? String(r.operatorUserAgent) : undefined,
              changeDiff: parseJsonObject<TaskRecord['changeDiff']>(r.changeDiff),
              linkedDocuments: parseJsonObject<TaskRecord['linkedDocuments']>(r.linkedDocuments),
              actionTime: String(r.actionTime || r.createdAt || new Date().toISOString()),
              createdAt: String(r.createdAt || r.actionTime || new Date().toISOString()),
            };
          });
          // 格式化后的记录
          setRecords(formattedRecords);
        } else {
          // API 返回格式不对或无数据
          // 回退到父组件传入的记录获取函数
          const taskRecords = getTaskRecordsByTaskId(taskId);
          setRecords(taskRecords);
        }
      } catch (error) {
        // 获取流转记录失败
        // 回退到父组件传入的记录获取函数
        const taskRecords = getTaskRecordsByTaskId(taskId);
        setRecords(taskRecords);
      }
    };

    loadRecords();
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
                  {typeInfo?.label || resolveTaskTypeLabel(t) || t}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="任务详情"
      size="xl"
      showMaximize={true}
      headerAction={(
        <span className={`px-2 py-0.5 text-xs rounded ${statusMap[task.status]?.bg || 'bg-gray-100'} ${statusMap[task.status]?.color || 'text-gray-600'}`}>
          {statusMap[task.status]?.label || task.status}
        </span>
      )}
    >
      <>
      {/* 内容区域 */}
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
                  <p className="font-semibold text-gray-900">{task.typeName || resolveTaskTypeLabel(task.type) || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">任务区域</Label>
                  <p className="font-semibold text-gray-900">{task.greenhouseName || task.field || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">作物</Label>
                  {/* 2026-10-20：作物为「其他」时带上作物备注，与列表列口径一致 */}
                  <p className="font-semibold text-gray-900">
                    {(task.cropName || task.crop) === '其他'
                      ? `其他（${task.cropRemarks || '未填写'}）`
                      : (task.cropName || task.crop || '-')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">执行人</Label>
                  <p className="font-semibold text-gray-900">{task.assigneeName || task.assignee || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">优先级</Label>
                  <p className={`font-semibold ${priorityMap[task.priority || 'normal']?.color || 'text-gray-900'}`}>
                    {priorityMap[task.priority || 'normal']?.label || task.priority || '普通'}
                  </p>
                </div>
              </div>
            </div>

            {/* 工作内容（2026-10-20 修复：此前被嵌在「来源信息」区块内部，
                而该区块只在 task.sourceId 存在时渲染 —— 手工新建的任务没有来源 ID，
                工作内容整块消失。现独立成块，与来源无关。） */}
            {/* 2026-10-24：工作内容改读 description / taskContent。
                原实现读 remarks（库里仅 6% 有值），而真正的任务说明在
                description（81%）/ task_content（83%），详情里从未显示过。 */}
            {(() => {
              const workContent = task.description || task.taskContent || '';
              const remarkText = task.remarks || '';
              if (!workContent && !remarkText) return null;
              return (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    工作内容
                  </h4>
                  {workContent && (
                    <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded p-2">
                      {workContent}
                    </p>
                  )}
                  {remarkText && (
                    <div className={workContent ? 'mt-2' : ''}>
                      <span className="text-xs text-gray-500">备注：</span>
                      <span className="text-sm text-gray-700 whitespace-pre-line">{remarkText}</span>
                    </div>
                  )}
                </div>
              );
            })()}

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
                      {task.type === 'seedling' ? '育苗任务' : (SOURCE_TYPE_LABEL[task.sourceType || ''] || '-')}
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
              </div>
            )}

            {/* 关联信息 —— 2026-10-24：批次 / 班组 / 生产计划 / 创建人 / 审批
                这些字段后端一直在返回，详情里此前一个都没展示，追溯时对不上来源单据。 */}
            {(() => {
              const rows = [
                { label: '批次编号', value: task.batchCode || task.batchId },
                { label: '所属班组', value: task.teamName || task.teamId },
                { label: '生产计划', value: task.productionPlanCode || task.productionPlanId },
                { label: '种植实例', value: task.plantingId },
                { label: '创建人', value: task.createBy },
                { label: '派发审批', value: task.approvalCode },
                { label: '审批时间', value: task.approvedAt ? formatDateTime(task.approvedAt) : '' },
                { label: '人工数量', value: task.workerCount ? `${task.workerCount} 人` : '' },
              ].filter((r) => !!r.value);
              if (rows.length === 0) return null;
              return (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    关联信息
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {rows.map((r) => (
                      <div key={r.label}>
                        <Label className="text-xs text-slate-500">{r.label}</Label>
                        <p className="font-semibold text-gray-900 text-sm break-all">{r.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
                        {task.tools.map((t: any, i: number) => (
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
                    {(task.estimatedDays || 0) > 0 ? `${task.estimatedDays}天` : ''}
                    {(task.estimatedHours || 0) > 0 ? `${task.estimatedHours}小时` : ''}
                    {!task.estimatedDays && !task.estimatedHours ? '-' : ''}
                  </p>
                </div>
                {task.dueDate && (
                  <div>
                    <Label className="text-xs text-sky-600">截止日期</Label>
                    <p className="font-semibold text-gray-900">{task.dueDate}</p>
                  </div>
                )}
                {/* 2026-10-24：实际发生的时间节点 —— 追溯核查需要，此前一律不展示 */}
                {task.createdAt && (
                  <div>
                    <Label className="text-xs text-sky-600">创建时间</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.createdAt)}</p>
                  </div>
                )}
                {task.assignerName && (
                  <div>
                    <Label className="text-xs text-sky-600">派发人</Label>
                    <p className="font-semibold text-gray-900">{task.assignerName}</p>
                  </div>
                )}
                {task.acceptedAt && (
                  <div>
                    <Label className="text-xs text-sky-600">接受时间</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.acceptedAt)}</p>
                  </div>
                )}
                {task.actualStartAt && (
                  <div>
                    <Label className="text-xs text-sky-600">实际开始</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.actualStartAt)}</p>
                  </div>
                )}
                {task.actualEndAt && (
                  <div>
                    <Label className="text-xs text-sky-600">实际结束</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.actualEndAt)}</p>
                  </div>
                )}
                {task.completedAt && (
                  <div>
                    <Label className="text-xs text-sky-600">完成时间</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.completedAt)}</p>
                  </div>
                )}
                {task.cancelledAt && (
                  <div>
                    <Label className="text-xs text-sky-600">取消时间</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.cancelledAt)}</p>
                  </div>
                )}
                {task.rejectedAt && (
                  <div>
                    <Label className="text-xs text-sky-600">驳回时间</Label>
                    <p className="font-semibold text-gray-900">{formatDateTime(task.rejectedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 异常与返工 —— 2026-10-24：取消/驳回/放弃原因、返工次数此前详情里完全看不到，
                追溯时无法回答「为什么没做成」。只在有值时渲染。 */}
            {(() => {
              const rows = [
                { label: '取消原因', value: task.cancelledReason },
                { label: '驳回原因', value: task.rejectedReason },
                { label: '放弃原因', value: task.abandonedReason },
                { label: '完成备注', value: task.completionNote },
                { label: '返工次数', value: (task.reworkCount || 0) > 0 ? `${task.reworkCount} 次` : '' },
                { label: '执行人拒单', value: (task.executorRejectCount || 0) > 0 ? `${task.executorRejectCount} 次` : '' },
              ].filter((r) => !!r.value);
              if (rows.length === 0) return null;
              return (
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <h4 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    异常与返工
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {rows.map((r) => (
                      <div key={r.label}>
                        <Label className="text-xs text-red-600">{r.label}</Label>
                        <p className="font-semibold text-gray-900 break-all">{r.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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

            {/* P0-7：作业标准（SOP） */}
            {sopBindings.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-bold text-purple-600 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  作业标准（{sopBindings.length}）
                </h4>
                <div className="space-y-3">
                  {sopBindings.map((b) => (
                    <div key={b.bindingId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-900">{b.sopName}</span>
                        <span className="font-mono text-xs text-gray-500">{b.sopCode}</span>
                      </div>
                      {b.warningNotes && (
                        <p className="mt-1 text-xs text-amber-700">⚠️ {b.warningNotes}</p>
                      )}
                      {b.steps && b.steps.length > 0 && (
                        <ol className="mt-2 space-y-1">
                          {b.steps.map((s, i) => (
                            <li key={s.id ?? i} className="text-xs text-gray-700">
                              <span className="font-mono text-gray-400 mr-1">{i + 1}.</span>
                              <span className="font-medium">{s.stepTitle}</span>
                              {s.estimatedMinutes ? <span className="text-gray-400"> · {s.estimatedMinutes} 分钟</span> : null}
                              {s.pesticideCode ? <span className="text-gray-400"> · 药剂 {s.pesticideCode}</span> : null}
                              {s.stepContent ? <div className="text-gray-500">{s.stepContent}</div> : null}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* P0-4：关联领料单 */}
            {linkedRequests.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <h4 className="text-sm font-bold text-blue-600 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  关联领料单（{linkedRequests.length}）
                </h4>
                <div className="space-y-3">
                  {linkedRequests.map((req) => (
                    <div key={req.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono font-semibold text-gray-900">{req.code}</span>
                        <span className="text-gray-500">{req.date} · {MATERIAL_REQUEST_STATUS_LABEL[req.status] || req.status}</span>
                      </div>
                      {req.materials.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {req.materials.map((m, i) => (
                            <span key={`${req.id}-${i}`} className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                              {m.name} × {m.qty}{m.unit}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 处理流转记录 - 使用完整的时间线组件
                2026-10-21：透传 dueDate / 当前执行人，用于逾期标记与重派提示 */}
            {sortedRecords.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <TaskRecordTimeline
                  records={sortedRecords}
                  showStatusChange
                  showFeedback
                  taskDueDate={task?.dueDate}
                  currentAssigneeName={task?.assigneeName}
                />
              </div>
            )}

            {/* 无流转记录提示 */}
            {sortedRecords.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
                暂无处理流转记录
              </div>
            )}
          </div>
        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          {/* 2026-09-22：删除底部"关闭"按钮 —— 弹窗右上角 Modal 自带关闭图标，重复 */}
          {/* v0.3 P0-2：快速完成按钮（可选 prop，未传则不显示） */}
          {onQuickComplete && task && task.status !== 'completed' && task.status !== 'cancelled' && (
            <Button
              variant="default"
              onClick={() => {
                onQuickComplete(taskId);
                onClose();
              }}
              style={{ background: '#52c41a', color: '#fff', borderColor: '#52c41a' }}
            >
              <CheckCircle className="w-4 h-4" /> 标记完成
            </Button>
          )}
          {canVerify && (
            <Button
              variant="default"
              onClick={() => onVerify?.(taskId)}
            >
              <CheckCircle className="w-4 h-4" /> 验收
            </Button>
          )}
        </div>

        {/* ★ 2026-08-22：AI 实际工时录入（任务完成后员工填入） */}
        <div className="mt-4 px-1">
          <ActualHoursRecorder
            taskId={taskId}
            taskType={task.type || '其他'}
            taskCode={task.taskCode}
            estimatedHours={task.estimatedHours}
            onSuccess={() => onRefresh?.()}
          />
        </div>
      </>
    </Modal>
  );
}

export default TaskDetailModal;
