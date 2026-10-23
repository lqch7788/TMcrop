/**
 * 生产任务表格行组件
 */

import { CheckCircle, XCircle, Play, Eye, Edit2, FileText, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { TaskWithExtras, TaskDispatchTask } from './types';
import type { Task } from '../../../hooks/useTasks';
import { STATUS_MAP, PRIORITY_MAP, getTypeColor, getTypeLabel } from './constants';
import { isOverdueInspection, OVERDUE_BADGE_CLASS } from '../../../utils/inspectionOverdue';
import { todayLocal } from '../../../lib/dateUtils';

/**
 * 2026-08-29：备注英文 enum → 中文映射
 * DB 里 remarks 字段是中文自由文本，但夹杂英文 enum 值（如 seedling/plug/direct/tissue/ground）
 * TASK_TYPES 只覆盖 8 个常见值（fertilization/irrigation/.../harvest/other），缺少 seedling 等
 * 兜底翻译：行级正则匹配，按单词边界替换避免误伤中文同字母
 */
const REMARKS_DICT: Record<string, string> = {
  seedling: '育苗',
  plug: '穴盘',
  direct: '直播',
  tissue: '组织培养',
  ground: '地栽',
  mother_plant_count: '母株数量',
  propagation_mode: '扩繁模式',
};
function translateRemarks(text: string): string {
  if (!text) return '';
  let result = text;
  Object.entries(REMARKS_DICT).forEach(([en, zh]) => {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'g'), zh);
  });
  return result;
}

interface ProductionTaskTableRowProps {
  task: TaskDispatchTask | Task;
  onAccept: (task: TaskDispatchTask) => void;
  onReject: (task: TaskDispatchTask) => void;
  onContinueExecution: (task: TaskDispatchTask) => void;
  onOpenFeedbackModal: (task: TaskDispatchTask) => void;
  onOpenDetailModal: (task: TaskDispatchTask) => void;
  onOpenSopModal: (task: TaskDispatchTask, e: React.MouseEvent) => void;
  /** 2026-10-21 P4：巡查计划任务 → 打开「填写/重提巡查记录」弹窗 */
  onSubmitInspectionRecord?: (task: TaskDispatchTask) => void;
}

/**
 * 渲染任务类型单元格
 */
const renderTypeCell = (task: TaskDispatchTask | Task) => {
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

/**
 * 生产任务表格行组件
 */
export function ProductionTaskTableRow({
  task,
  onAccept,
  onReject,
  onContinueExecution,
  onOpenFeedbackModal,
  onOpenDetailModal,
  onOpenSopModal,
  onSubmitInspectionRecord,
}: ProductionTaskTableRowProps) {
  const taskWithExtras = task as TaskWithExtras;
  const types = task.types || [];
  // 2026-10-21 P4：巡查计划实例任务 —— 有专属的「填写巡查记录」入口，
  //   不走通用「提交进度」（那条路不产记录，会被后端 409 挡住）
  const isPlanInspection = !!taskWithExtras.inspectionPlanId;

  // 2026-10-10（审核修复 H3）：巡查来源的动作按钮仅在关联了整改问题时显示（同 ProblemTaskTableRow）
  const isInspectionTask = !!(task as { sourceInspectionId?: string }).sourceInspectionId;
  const canOperate = !isInspectionTask || !!(taskWithExtras as { sourceProblemId?: string }).sourceProblemId;
  // 2026-10-23：巡查计划实例「逾期未执行」标记（执行日已过且没提交巡查记录）
  const isOverdue = isPlanInspection && isOverdueInspection(
    {
      occurrenceDate: taskWithExtras.planOccurrenceDate,
      inspectionRecordId: taskWithExtras.inspectionRecordId,
      status: task.status,
    },
    todayLocal(),
  );

  return (
    <>
      {/* 任务ID */}
      <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
        <Button
          variant="link"
          size="sm"
          onClick={() => onOpenDetailModal(task)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          title="点击查看详情"
        >
          {task.id}
        </Button>
      </td>
      {/* 任务类型 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {renderTypeCell(task)}
        {/* 2026-10-21 P4：巡查计划实例徽章 + 计划编号（方案 §10.5） */}
        {isPlanInspection && (
          <div className="mt-0.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-xs">
              <ClipboardCheck className="w-3 h-3" />
              巡查计划
            </span>
          </div>
        )}
      </td>
      {/* 任务区域 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.field || '-'}
      </td>
      {/* 作物 —— 2026-10-20：为「其他」时带上作物备注，与农事任务中心列表口径一致 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.crop === '其他'
          ? `其他（${(task as { cropRemarks?: string }).cropRemarks || '未填写'}）`
          : (task.crop || '-')}
      </td>
      {/* 负责人 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-700">{task.assigneeName || '-'}</span>
      </td>
      {/* 计划开始 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.planStart?.split(' ')[0] || '-'}
      </td>
      {/* 计划结束 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.planEnd || '-'}
      </td>
      {/* 任务工时（2026-10-21 口径统一）：estimated_hours 已含天数，不再加 days×8；
          总工时 = estimatedHours × 人工数量，与农事任务中心列表一致 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {((task.estimatedHours || 0) * (task.workerCount || 1)) || 0}小时
      </td>
      {/* 进度 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : (task.progress || 0) > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{task.progress || 0}%</span>
        </div>
      </td>
      {/* 优先级 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium ${PRIORITY_MAP[task.priority]?.color || 'text-gray-500'}`}>
          {PRIORITY_MAP[task.priority]?.label || task.priority}
        </span>
      </td>
      {/* 状态 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[task.status]?.bg || 'bg-gray-100'} ${STATUS_MAP[task.status]?.color || 'text-gray-600'}`}>
            {STATUS_MAP[task.status]?.label || task.status}
          </span>
          {isOverdue && (
            <span className={OVERDUE_BADGE_CLASS} title="执行日已过且未提交巡查记录">逾期</span>
          )}
        </div>
      </td>
      {/* 备注（2026-08-29：改显示 task.remarks，不再显示 task.typeLabel；英文 enum 翻译为中文） */}
      <td className="px-3 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={task.remarks || '-'}>
        {translateRemarks(task.remarks) || '-'}
      </td>
      {/* 作业标准 —— 2026-10-20 修复：此前要求「任务类型 >= 2 个」才显示 SOP 链接，
          但 SOP 与类型数量无关，单类型任务同样可以有作业标准（实测单类型任务一律显示 '-'）。 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.sopContent ? (
          <Button
            variant="link"
            size="sm"
            onClick={(e) => onOpenSopModal(task, e)}
            className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            SOP文件
          </Button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      {/* 操作 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.status === 'pending' && canOperate && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => onAccept(task)}
              title="接受任务"
            >
              <CheckCircle className="w-4 h-4" />
              接受
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(task)}
              title="拒绝任务"
            >
              <XCircle className="w-4 h-4" />
              拒绝
            </Button>
          </div>
        )}
        {/* 2026-10-23：巡查计划实例**不提供**「提交进度」——
            通用进度提交不产巡查记录，会把任务推进到「待验收」而无记录，此后
            既不能补交记录（状态不允许）也不能重提（无记录）→ 死锁。
            巡查实例只走「填写巡查记录」通道。 */}
        {(task.status === 'accepted' || task.status === 'in_progress') && canOperate && !isPlanInspection && (
          <Button
            size="sm"
            variant="blue"
            onClick={() => onOpenFeedbackModal(task)}
            title="点击提交进度"
          >
            <Edit2 className="w-4 h-4" />
            提交进度
          </Button>
        )}
        {/* 2026-10-21 P4：巡查计划任务的记录入口 */}
        {isPlanInspection && onSubmitInspectionRecord && (
          <div className="flex items-center gap-1">
            {taskWithExtras.inspectionRecordId ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onSubmitInspectionRecord(task)}
                title={`已提交记录 ${taskWithExtras.inspectionRecordCode || ''}，点击查看/重提`}
              >
                <Eye className="w-4 h-4" />
                {task.status === 'rejected' ? '修改记录并重提' : '查看记录'}
              </Button>
            ) : (
              /* 2026-10-23：待接受状态不直接给「填写巡查记录」——
                 未接受就能填记录不合理，且与同行的「接受」语义冲突。
                 必须先接受，状态到 accepted 后才出现填写入口。 */
              ['accepted', 'in_progress', 'rejected'].includes(task.status) ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onSubmitInspectionRecord(task)}
                  title="填写巡查记录（提交后自动转待验收）"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  {task.status === 'rejected' ? '修改记录并重提' : '填写巡查记录'}
                </Button>
              ) : null
            )}
          </div>
        )}
        {task.status === 'rejected' && (
          <div className="flex items-center gap-1">
            {/* 2026-10-10（审核修复）：拒单清空执行人后不再显示"继续执行"（防 in_progress+无执行人卡死） */}
            {!isInspectionTask && !!task.assigneeId && (
              <Button
                size="sm"
                variant="warning"
                onClick={() => onContinueExecution(task)}
                title="点击继续执行"
              >
                <Play className="w-4 h-4" />
                继续执行
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenDetailModal(task)}
              title="点击查看详情"
            >
              <Eye className="w-4 h-4" />
              查看
            </Button>
          </div>
        )}
        {(task.status === 'waiting_acceptance' || task.status === 'completed') && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenDetailModal(task)}
            title="点击查看详情"
          >
            <Eye className="w-4 h-4" />
            查看
          </Button>
        )}
        {/* 2026-10-10：巡查来源但无关联整改问题时无动作按钮，兜底显示「查看」 */}
        {isInspectionTask && !canOperate && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenDetailModal(task)}
            title="该巡查暂无关联整改问题，可查看详情"
          >
            <Eye className="w-4 h-4" />
            查看
          </Button>
        )}
      </td>
    </>
  );
}

export default ProductionTaskTableRow;
