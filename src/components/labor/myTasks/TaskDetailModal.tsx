/**
 * 任务详情弹窗组件
 */

import { FileText } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
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
  task: any | null;
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
  const renderTypeCell = (task: any) => {
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
                  <Button
                    variant="ghost"
                    size="sm"
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
                  </Button>
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
          /**
           * 把操作记录映射成流转动作。
           *
           * 2026-10-20 重写（用户反馈「流转记录里显示很多备注，实际没做过这些操作」）：
           *   原实现是拿 operationTypeName 去 `includes("??")` 模糊匹配中文关键词，
           *   有两点致命问题：
           *     ① 该函数里的中文字面量在功能首次提交时就已损坏成 `??`，
           *        任何输入都匹配不上，恒返回 'comment' → 全部显示为「备注」；
           *     ② 即使中文没坏也匹配不了 —— operationTypeName 存的是**任务类型名**
           *        （育苗任务 / 定植,灌溉 / 其他），根本不代表 accept/reject 等动作。
           *   改为按确定性口径判断：优先用 status（枚举、无歧义），
           *   其次用 remarks 文本兜底（子记录常把动作写在这里）。
           */
          const ACTION_BY_STATUS: Record<string, string> = {
            draft: 'dispatch',
            pending: 'dispatch',
            pending_approval: 'dispatch',
            accepted: 'accept',
            in_progress: 'progress',
            waiting_acceptance: 'submit',
            completed: 'complete',
            rejected: 'reject',
            failed: 'reject',
            cancelled: 'cancel',
            abandoned: 'cancel',
          };
          /** 备注文本 → 动作；按从具体到宽泛排列，命中即返回 */
          const ACTION_BY_TEXT: Array<[RegExp, string]> = [
            [/驳回|返工|退回/, 'reject'],
            [/验收通过|验收完成|已完成/, 'complete'],
            [/接受|接单|领取/, 'accept'],
            [/提交进度|进度更新|更新进度/, 'progress'],
            [/申请验收|提交验收/, 'submit'],
            [/派发|发布|新建/, 'dispatch'],
            [/撤回|取消|作废/, 'cancel'],
            [/继续执行|恢复执行/, 'start'],
          ];

          const mapActionByStatus = (status?: string): string =>
            ACTION_BY_STATUS[String(status || '').toLowerCase()] || 'comment';

          const mapActionByText = (text?: string): string => {
            const t = String(text || '');
            if (!t) return 'comment';
            for (const [re, action] of ACTION_BY_TEXT) {
              if (re.test(t)) return action;
            }
            return 'comment';
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
          
          // 2. 农事操作记录（farm_operation_records）
          //
          // 2026-10-20 语义修正：这张表对「任务来源」的记录是**一条任务一行**，
          //   每次操作都覆盖同一行的 status / remarks / progress，真实历史压进 children。
          //   所以父行的 status 是「最新状态」而非「当时发生的事件」——
          //   直接拿它当流转动作会把历史标错（实测：钱七只是接单，
          //   父行 status 已是 rejected，于是被渲染成「钱七 拒绝任务」）。
          //   现口径：**有 children 时只展示 children（真实历史），父行不再单独作为事件**；
          //   没有 children 的才用父行本身兜底成一条。
          operationRecords.forEach((r: Record<string, unknown>, idx: number) => {
            const parentStatus = r.status as string | undefined;
            const parentComment = (r.remarks as string) || (r.rejectReason as string) || "";

            const children = Array.isArray(r.children)
              ? (r.children as Array<Record<string, unknown>>)
              : [];

            // 兜底：无子记录时才把父行当作一条事件（动作优先看备注文本，其次看状态）
            if (children.length === 0) {
              const action = mapActionByText(parentComment) !== 'comment'
                ? mapActionByText(parentComment)
                : mapActionByStatus(parentStatus);
              flowRecords.push({
                id: "opr_" + idx + "_" + Date.now(),
                action,
                actionTime: (r.operationDate as string) || (r.createdAt as string) || "",
                operatorName: (r.operatorName as string) || (r.operator as string) || "??",
                toStatus: parentStatus,
                comment: parentComment,
              });
            }

            if (children.length) {
              children.forEach((rawChild: Record<string, unknown>, childIdx: number) => {
                const child = rawChild as any;
                // 子记录：以 remarks 文本判断动作；文本没有时按 progress 兜底
                // （progress 到 100 视为「申请验收」，否则视为「提交进度」）。
                const childComment = (child.remarks as string) || "";
                let childAction = mapActionByText(childComment);
                if (childAction === 'comment') {
                  const p = Number(child.progress);
                  if (Number.isFinite(p) && p >= 100) childAction = 'submit';
                  else if (Number.isFinite(p)) childAction = 'progress';
                }
                flowRecords.push({
                  id: "opr_c_" + idx + "_" + childIdx + "_" + Date.now(),
                  action: childAction,
                  actionTime: (child.time as string) || (child.operationDate as string) || "",
                  operatorName: (child.operatorName as string) || "",
                  toStatus: undefined,
                  comment: childComment,
                });
              });
            }
          });
          
          // 3. useTasks 的 TaskRecord（已带标准动作 key，直接用；否则按中文名兜底）
          const KNOWN_ACTIONS = new Set([
            'dispatch', 'accept', 'reject', 'start', 'progress', 'submit',
            'complete', 'approve', 'cancel', 'comment',
          ]);
          taskRecords.forEach((r: Record<string, unknown>, idx: number) => {
            const rawAction = String(r.action || '');
            const actionName = (r.actionName as string) || rawAction || '';
            const action = KNOWN_ACTIONS.has(rawAction)
              ? rawAction
              : mapActionByText(actionName);

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
          
          // 2026-10-20：剔除纯噪音记录 —— 动作识别为「备注」且无任何备注内容、
          //   也没有时间/操作人的空壳（此前会把这类条目也渲染出来，用户看到一堆
          //   "备注"却没有实际发生过的操作）。
          const meaningful = flowRecords
            .filter((rec) => !(rec.action === 'comment' && !String(rec.comment || '').trim()))
            // 同一动作 + 同一操作人 + 同一时间（精确到分钟）视为重复，去重
            .filter((rec, i, arr) => {
              const key = `${rec.action}|${rec.operatorName}|${String(rec.actionTime).slice(0, 16)}`;
              return arr.findIndex((x) =>
                `${x.action}|${x.operatorName}|${String(x.actionTime).slice(0, 16)}` === key) === i;
            });

          // 按时间正序
          meaningful.sort((a, b) => new Date(a.actionTime).getTime() - new Date(b.actionTime).getTime());

          if (meaningful.length === 0) {
            return (
              <div className="text-sm text-gray-400 py-4 text-center">暂无流转记录</div>
            );
          }
          
          return (
            <div>
              <TaskFlowTimeline records={meaningful as any} />
            </div>
          );
        })()}

        {/* 操作记录（useOperationRecords） */}
        {operationRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">操作记录</h4>
            <div className="space-y-4">
              {operationRecords.map((rawRecord: Record<string, unknown>, idx: number) => {
                const record = rawRecord as any;
                return (
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
                  {/* 显示子记录（children）—— 同样用 Array.isArray 防御，避免字符串导致 .map 崩溃 */}
                  {Array.isArray(record.children) && record.children.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-400 space-y-3">
                      {(record.children as Array<Record<string, unknown>>).map((rawChild: Record<string, unknown>, childIdx: number) => {
                        const child = rawChild as any;
                        return (
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
                          {/* 工作量 —— 同样显式转布尔，避免三项皆 0 时渲染出字面量 0 */}
                          {((Number(child.workloadDays) || 0) > 0 ||
                            (Number(child.workloadHours) || 0) > 0 ||
                            (Number(child.workers) || 0) > 0) && (
                            <div className="text-xs text-gray-600 mb-1">
                              工作量：{child.workloadDays && `${child.workloadDays as any}天`}
                              {child.workloadHours && `${child.workloadHours as any}小时`}
                              {child.workers && `×${child.workers as any}人`}
                            </div>
                          )}
                          {/* 进度 */}
                          {child.progress !== undefined && (
                            <div className="text-xs text-gray-600 mb-1">
                              进度：{child.progress as any}%
                              {(child.progressIncrement as number) !== undefined && (child.progressIncrement as number) > 0 && (
                                <span className="text-emerald-600 ml-1">(+{child.progressIncrement as any}%)</span>
                              )}
                            </div>
                          )}
                          {/* GPS位置 */}
                          {child.gpsLocation && (
                            <div className="text-xs text-emerald-600 mb-1">
                              GPS：{(child.gpsLocation as { lat: number; lng: number }).lat.toFixed(6)}, {(child.gpsLocation as { lat: number; lng: number }).lng.toFixed(6)}
                            </div>
                          )}
                          {/* 照片 —— 注意：`a?.length || b?.length` 在两数组皆空时等于 0，
                              `{0 && <div/>}` 会把字面量 0 渲染到页面上（React 的常见陷阱）。
                              2026-10-20：数据层把 photosBefore/photosAfter 统一规整成 [] 后
                              这个坑被暴露，弹窗里出现一串 "0"。此处显式转成布尔。 */}
                          {((child.photosBefore?.length || 0) > 0 || (child.photosAfter?.length || 0) > 0) && (
                            <div className="text-xs text-blue-600 mb-1">
                              照片：{(child.photosBefore as any)?.length || 0}张(前) + {(child.photosAfter as any)?.length || 0}张(后)
                            </div>
                          )}
                          {/* 语音 */}
                          {child.voiceNote && (
                            <div className="text-xs text-purple-600 mb-1">语音备注</div>
                          )}
                          {/* 物料 —— 同样用 Array.isArray 防御（后端可能返回 JSON 字符串） */}
                          {Array.isArray(child.materials) && child.materials.length > 0 && (
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
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 任务流转记录（useTasks.taskRecords） */}
        {taskRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">任务流转记录</h4>
            <div className="space-y-4">
              {taskRecords.map((rawRecord: Record<string, unknown>, idx: number) => {
                const record = rawRecord as any;
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
                        {((record.feedback as Record<string, any>) as any)?.text && (
                          <div className="text-sm text-gray-700 bg-white rounded p-2">
                            {(record.feedback as any).text as string}
                          </div>
                        )}
                        {(record.feedback as any).gpsLocation && (
                          <div className="text-xs text-emerald-600">
                            GPS：{((record.feedback as any).gpsLocation as { lat: number; lng: number }).lat.toFixed(6)}, {((record.feedback as any).gpsLocation as { lat: number; lng: number }).lng.toFixed(6)}
                          </div>
                        )}
                        {(record.feedback as any).images && ((record.feedback as any).images as unknown[]).length > 0 && (
                          <div className="text-xs text-blue-600">
                            照片：{((record.feedback as any).images as unknown[]).length}张
                          </div>
                        )}
                        {(record.feedback as any).voiceNote && (
                          <div className="text-xs text-purple-600">语音备注</div>
                        )}
                        {(record.feedback as any).materials && ((record.feedback as any).materials as Array<{ name: string; qty: number }>).length > 0 && (
                          <div className="text-xs text-orange-600">
                            物料：{((record.feedback as any).materials as Array<{ name: string; qty: number }>).map(m => `${m.name}×${m.qty}`).join(', ')}
                          </div>
                        )}
                        {/* 工作量确认 */}
                        {(record.feedback as any).workloadDays !== undefined || (record.feedback as any).workloadHours !== undefined || (record.feedback as any).workers !== undefined && (
                          <div className="text-xs text-cyan-600">
                            工作量确认：
                            {(record.feedback as any).workloadDays !== undefined && `${(record.feedback as any).workloadDays}天`}
                            {(record.feedback as any).workloadHours !== undefined && `${(record.feedback as any).workloadHours}小时`}
                            {(record.feedback as any).workers !== undefined && `×${(record.feedback as any).workers}人`}
                          </div>
                        )}
                        {/* 物资编码 */}
                        {(record.feedback as any).materialCode && (
                          <div className="text-xs text-pink-600">
                            物资编码：{(record.feedback as any).materialCode as string}
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
