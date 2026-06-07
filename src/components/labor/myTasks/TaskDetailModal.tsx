/**
 * 任务详情弹窗组件
 */

import { FileText } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { TaskTypeConfigDisplay } from '../../farm/taskDispatch/components/TaskTypeConfigDisplay';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { TaskMaterial, TaskWithExtras } from './types';
import { STATUS_MAP, PRIORITY_MAP, getTypeColor, getTypeLabel } from './constants';
import { TASK_ACTION_CONFIG, TASK_STATUS_CONFIG } from '../../../config/taskConfig';
import { Label } from '@/components/ui';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDispatchTask | Task | null;
  problemFlowRecords: Array<Record<string, unknown>>;
  operationRecords: Array<Record<string, unknown>>;
  taskRecords: Array<Record<string, unknown>>;
  getActualWorkload: () => { days: number; hours: number; workers: number };
}

/**
 * 任务详情弹窗组件
 */
export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  problemFlowRecords,
  operationRecords,
  taskRecords,
  getActualWorkload,
}: TaskDetailModalProps) {
  if (!task) return null;

  const taskWithExtras = task as TaskWithExtras;

  // 渲染任务类型单元格
  const renderTypeCell = (task: TaskDispatchTask) => {
    const types = task.types || [];
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {types.slice(0, 2).map((typeValue: string, idx: number) => {
          const typeLabel = getTypeLabel(typeValue);
          return typeLabel === '其他' ? (
            <span key={idx} className="text-orange-500 text-xs">其他</span>
          ) : (
            <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
              {typeLabel}
            </span>
          );
        })}
        {types.length > 2 && (
          <span className="text-xs text-gray-500">+{types.length - 2}</span>
        )}
      </div>
    );
  };

  // 实际完成工作量
  const actualWorkload = getActualWorkload();
  const hasActualWorkload = actualWorkload.days > 0 || actualWorkload.hours > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`任务详情 - ${task.id || ''}`}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500">任务区域</Label>
              <p className="font-semibold text-gray-900">{task.field || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">作物</Label>
              <p className="font-semibold text-gray-900">{task.crop || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">负责人</Label>
              <p className="font-semibold text-gray-900">陆启闯</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">优先级</Label>
              <p className={`font-semibold ${PRIORITY_MAP[task.priority]?.color || ''}`}>
                {PRIORITY_MAP[task.priority]?.label || task.priority}
              </p>
            </div>
          </div>
        </div>

        {/* 任务类型 - 单一类型显示详细信息，多类型显示SOP下载 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">任务类型配置</h4>
          {(task.types || []).length === 1 ? (
            <TaskTypeConfigDisplay
              taskType={task.types[0]}
              configValues={task.typeConfig || {}}
            />
          ) : (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">作业标准文件</span>
              </div>
              {task.sopContent ? (
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-sm text-gray-600 mb-2">已导入SOP文档</p>
                  <button
                    onClick={() => {
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
                    <FileText className="w-4 h-4" />
                    下载SOP文件
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">暂无SOP文件</p>
              )}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">已选择的操作类型：</p>
                <div className="flex flex-wrap gap-2">
                  {(task.types || []).map((t: string) => {
                    return (
                      <span
                        key={t}
                        className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(t)}`}
                      >
                        {getTypeLabel(t)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 所需物资 */}
        {task.materials && task.materials.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">所需物资</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="text-xs text-gray-500 border-b border-gray-200">
                    <TableHead className="text-left pb-2">物资名称</TableHead>
                    <TableHead className="text-right pb-2">数量</TableHead>
                    <TableHead className="text-right pb-2">单位</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {task.materials.map((m: TaskMaterial, i: number) => (
                    <TableRow key={i} className="border-b border-gray-100 last:border-0">
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

        {/* 时间信息 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500">计划开始</Label>
              <p className="font-semibold text-gray-900">{task.planStart || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">计划结束</Label>
              <p className="font-semibold text-gray-900">{task.planEnd || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">状态</Label>
              <p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[task.status]?.bg || ''} ${STATUS_MAP[task.status]?.color || ''}`}>
                  {STATUS_MAP[task.status]?.label || task.status}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">预计时长</Label>
              <p className="font-semibold text-gray-900">
                {task.estimatedDays > 0 ? `${task.estimatedDays}天` : ''}
                {task.estimatedHours > 0 ? `${task.estimatedHours}小时` : ''}
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
                  <Label className="text-xs text-green-600">实际工日</Label>
                  <p className="font-bold text-green-700 text-lg">
                    {actualWorkload.days > 0 ? `${actualWorkload.days}天` : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-green-600">实际工时</Label>
                  <p className="font-bold text-green-700 text-lg">
                    {actualWorkload.hours > 0 ? `${actualWorkload.hours}小时` : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-green-600">作业人数</Label>
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
              {task.requiredFeedback.map((fb: string) => (
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

        {/* ???? ? ??????????????? + ???? + ????? */}
        {(() => {
          // ???? ? ??????
          const mapAction = (typeName: string): string => {
            if (!typeName) return "comment";
            if (typeName.includes("??") || typeName.includes("??") || typeName.includes("??") || typeName.includes("??") || typeName.includes("??")) return "dispatch";
            if (typeName.includes("??") || typeName.includes("??") || typeName.includes("??")) return "accept";
            if (typeName.includes("??") || typeName.includes("??")) return "reject";
            if (typeName.includes("??") || typeName.includes("??")) return "start";
            if (typeName.includes("??") || typeName.includes("??") || typeName.includes("??")) return "submit";
            if (typeName.includes("??") || typeName.includes("??") || typeName.includes("??")) return "approve";
            if (typeName.includes("??")) return "complete";
            return "comment";
          };

          // ?????????????
          const flowRecords: Array<{id:string;action:string;actionTime:string;operatorName:string;fromStatus?:string;toStatus?:string;comment?:string}> = [];
          
          // 1. ??????????????
          problemFlowRecords.forEach((r: Record<string, unknown>, idx: number) => {
            flowRecords.push({
              id: (r.id as string) || ("pf_" + Date.now() + "_" + idx),
              action: (r.action as string) || "comment",
              actionTime: (r.actionTime as string) || (r.createdAt as string) || "",
              operatorName: (r.operatorName as string) || (r.operator as string) || "??",
              fromStatus: r.fromStatus as string | undefined,
              toStatus: r.toStatus as string | undefined,
              comment: (r.comment as string) || (r.reason as string) || "",
            });
          });
          
          // 2. ???????????
          operationRecords.forEach((r: Record<string, unknown>, idx: number) => {
            const opType = (r.operationTypeName as string) || (r.operationType as string) || "";
            const action = mapAction(opType);
            
            flowRecords.push({
              id: "opr_" + idx + "_" + Date.now(),
              action,
              actionTime: (r.operationDate as string) || (r.createdAt as string) || "",
              operatorName: (r.operatorName as string) || (r.operator as string) || "??",
              toStatus: r.status as string | undefined,
              comment: (r.remarks as string) || (r.rejectReason as string) || "",
            });
            
            // ????children?
            const children = r.children as Array<Record<string, unknown>> | undefined;
            if (children && children.length) {
              children.forEach((child: Record<string, unknown>, childIdx: number) => {
                const childType = (child.operationTypeName as string) || (child.operationType as string) || "";
                const childAction = mapAction(childType);
                flowRecords.push({
                  id: "opr_c_" + idx + "_" + childIdx + "_" + Date.now(),
                  action: childAction,
                  actionTime: (child.time as string) || (child.operationDate as string) || "",
                  operatorName: (child.operatorName as string) || "",
                  toStatus: (r.status || child.status) as string | undefined,
                  comment: (child.remarks as string) || "",
                });
              });
            }
          });
          
          // 3. ???????useTasks TaskRecord ???
          taskRecords.forEach((r: Record<string, unknown>, idx: number) => {
            const actionName = (r.actionName as string) || (r.action as string) || "";
            const action = mapAction(actionName);
            
            flowRecords.push({
              id: (r.id as string) || ("tr_" + idx + "_" + Date.now()),
              action,
              actionTime: (r.actionTime as string) || (r.createdAt as string) || "",
              operatorName: (r.operatorName as string) || (r.operator as string) || "??",
              fromStatus: r.fromStatus as string | undefined,
              toStatus: r.toStatus as string | undefined,
              comment: (r.comment as string) || (r.reason as string) || (r.remarks as string) || "",
            });
          });
          
          // ?????
          flowRecords.sort((a, b) => new Date(a.actionTime).getTime() - new Date(b.actionTime).getTime());
          
          return (
            <div>
              <TaskFlowTimeline records={flowRecords} />
            </div>
          );
        })()}

        {/* 操作记录（useOperationRecords） */}
        {operationRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">操作记录</h4>
            <div className="space-y-4">
              {operationRecords.map((record: Record<string, unknown>, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {(record.operationTypeName as string) || (record.operationType as string)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{(record.operatorName as string)}</span>
                    </div>
                    <span className="text-xs text-gray-500">{(record.operationDate as string)}</span>
                  </div>
                  {/* 显示子记录（children） */}
                  {(record.children as Array<Record<string, unknown>>)?.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-400 space-y-3">
                      {(record.children as Array<Record<string, unknown>>).map((child: Record<string, unknown>, childIdx: number) => (
                        <div key={childIdx} className="bg-white rounded p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                {(child.operationTypeName as string) || (child.operationType as string)}
                              </span>
                              <span className="text-xs text-gray-600">{(child.operatorName as string)}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {(child.time as string) || (child.operationDate as string)}
                            </span>
                          </div>
                          {/* 工作量 */}
                          {(child.workloadDays || child.workloadHours || child.workers) && (
                            <div className="text-xs text-gray-600 mb-1">
                              工作量：{child.workloadDays && `${child.workloadDays}天`}
                              {child.workloadHours && `${child.workloadHours}小时`}
                              {child.workers && `×${child.workers}人`}
                            </div>
                          )}
                          {/* 进度 */}
                          {child.progress !== undefined && (
                            <div className="text-xs text-gray-600 mb-1">
                              进度：{child.progress}%
                              {(child.progressIncrement as number) !== undefined && (child.progressIncrement as number) > 0 && (
                                <span className="text-emerald-600 ml-1">(+{child.progressIncrement}%)</span>
                              )}
                            </div>
                          )}
                          {/* GPS位置 */}
                          {child.gpsLocation && (
                            <div className="text-xs text-emerald-600 mb-1">
                              GPS：{(child.gpsLocation as { lat: number; lng: number }).lat.toFixed(6)}, {(child.gpsLocation as { lat: number; lng: number }).lng.toFixed(6)}
                            </div>
                          )}
                          {/* 照片 */}
                          {(child.photosBefore?.length || child.photosAfter?.length) && (
                            <div className="text-xs text-blue-600 mb-1">
                              照片：{child.photosBefore?.length || 0}张(前) + {child.photosAfter?.length || 0}张(后)
                            </div>
                          )}
                          {/* 语音 */}
                          {child.voiceNote && (
                            <div className="text-xs text-purple-600 mb-1">语音备注</div>
                          )}
                          {/* 物料 */}
                          {(child.materials as Array<{ name: string; qty: number }>)?.length > 0 && (
                            <div className="text-xs text-orange-600 mb-1">
                              物料：{(child.materials as Array<{ name: string; qty: number }>).map(m => `${m.name}×${m.qty}`).join(', ')}
                            </div>
                          )}
                          {/* 备注 */}
                          {child.remarks && (
                            <div className="text-sm text-gray-700 bg-gray-50 rounded px-2 py-1 mt-1">
                              {child.remarks as string}
                            </div>
                          )}
                          {/* 驳回原因 */}
                          {child.rejectReason && (
                            <div className="text-sm text-red-600 bg-red-50 rounded px-2 py-1 mt-1">
                              驳回原因：{child.rejectReason as string}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 任务流转记录（useTasks.taskRecords） */}
        {taskRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">任务流转记录</h4>
            <div className="space-y-4">
              {taskRecords.map((record: Record<string, unknown>, idx: number) => {
                const actionConfig = TASK_ACTION_CONFIG[record.action as keyof typeof TASK_ACTION_CONFIG];
                const statusFromConfig = record.fromStatus ? TASK_STATUS_CONFIG[record.fromStatus as keyof typeof TASK_STATUS_CONFIG] : null;
                const statusToConfig = record.toStatus ? TASK_STATUS_CONFIG[record.toStatus as keyof typeof TASK_STATUS_CONFIG] : null;
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          {actionConfig?.label || (record.actionName as string) || (record.action as string)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{(record.operatorName as string)}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(record.actionTime as string).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    {/* 状态变化 */}
                    {(record.fromStatus || record.toStatus) && (
                      <div className="flex items-center gap-1 mb-2 text-xs">
                        {record.fromStatus && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                            {statusFromConfig?.label || (record.fromStatus as string)}
                          </span>
                        )}
                        <span className="text-gray-400">→</span>
                        {record.toStatus && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {statusToConfig?.label || (record.toStatus as string)}
                          </span>
                        )}
                      </div>
                    )}
                    {/* 进度 */}
                    {record.progress !== undefined && (
                      <div className="text-xs text-gray-600 mb-1">
                        进度：{record.progress}%
                        {(record.progressIncrement as number) !== undefined && (record.progressIncrement as number) > 0 && (
                          <span className="text-emerald-600 ml-1">(+{record.progressIncrement}%)</span>
                        )}
                      </div>
                    )}
                    {/* 反馈内容 */}
                    {record.feedback && (
                      <div className="mt-2 space-y-1">
                        {(record.feedback as Record<string, unknown>).text && (
                          <div className="text-sm text-gray-700 bg-white rounded p-2">
                            {(record.feedback as Record<string, unknown>).text as string}
                          </div>
                        )}
                        {(record.feedback as Record<string, unknown>).gpsLocation && (
                          <div className="text-xs text-emerald-600">
                            GPS：{((record.feedback as Record<string, unknown>).gpsLocation as { lat: number; lng: number }).lat.toFixed(6)}, {((record.feedback as Record<string, unknown>).gpsLocation as { lat: number; lng: number }).lng.toFixed(6)}
                          </div>
                        )}
                        {(record.feedback as Record<string, unknown>).images && ((record.feedback as Record<string, unknown>).images as unknown[]).length > 0 && (
                          <div className="text-xs text-blue-600">
                            照片：{((record.feedback as Record<string, unknown>).images as unknown[]).length}张
                          </div>
                        )}
                        {(record.feedback as Record<string, unknown>).voiceNote && (
                          <div className="text-xs text-purple-600">语音备注</div>
                        )}
                        {(record.feedback as Record<string, unknown>).materials && ((record.feedback as Record<string, unknown>).materials as Array<{ name: string; qty: number }>).length > 0 && (
                          <div className="text-xs text-orange-600">
                            物料：{((record.feedback as Record<string, unknown>).materials as Array<{ name: string; qty: number }>).map(m => `${m.name}×${m.qty}`).join(', ')}
                          </div>
                        )}
                        {/* 工作量确认 */}
                        {(record.feedback as Record<string, unknown>).workloadDays !== undefined || (record.feedback as Record<string, unknown>).workloadHours !== undefined || (record.feedback as Record<string, unknown>).workers !== undefined && (
                          <div className="text-xs text-cyan-600">
                            工作量确认：
                            {(record.feedback as Record<string, unknown>).workloadDays !== undefined && `${(record.feedback as Record<string, unknown>).workloadDays}天`}
                            {(record.feedback as Record<string, unknown>).workloadHours !== undefined && `${(record.feedback as Record<string, unknown>).workloadHours}小时`}
                            {(record.feedback as Record<string, unknown>).workers !== undefined && `×${(record.feedback as Record<string, unknown>).workers}人`}
                          </div>
                        )}
                        {/* 物资编码 */}
                        {(record.feedback as Record<string, unknown>).materialCode && (
                          <div className="text-xs text-pink-600">
                            物资编码：{(record.feedback as Record<string, unknown>).materialCode as string}
                          </div>
                        )}
                      </div>
                    )}
                    {/* 备注 */}
                    {record.comment && (
                      <div className="text-sm text-gray-600 bg-white rounded p-2 mt-2">
                        {record.comment as string}
                      </div>
                    )}
                    {/* 驳回原因 */}
                    {record.reason && (
                      <div className="text-sm text-red-600 bg-red-50 rounded p-2 mt-2">
                        驳回原因：{record.reason as string}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 进度（只读） */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${task.progress || 0}%` }}
              />
            </div>
            <span className="w-14 text-sm font-medium text-gray-700 text-center">
              {task.progress || 0}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {task.progress === 100 ? '已完成' : task.progress === 0 ? '未开始' : '进行中'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default TaskDetailModal;
