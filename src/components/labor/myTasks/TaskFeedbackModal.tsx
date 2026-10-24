/**
 * 任务反馈表单弹窗组件
 */

import { Modal, Button } from '@/components/ui';
import { X } from 'lucide-react';

import { FeedbackInput } from '../../common/FeedbackInput';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { FeedbackFormData, TaskDispatchTask } from './types';
import type { Task } from '../../../hooks/useTasks';
import type { ProblemFlowRecord } from '../../../hooks/useProblemDispatch';
import { STATUS_MAP, PRIORITY_MAP, getTypeLabel } from './constants';
import { Label } from '@/components/ui';

// 深度输入框样式
// 2026-10-21：补 w-full —— 此前缺宽度类，下拉框和"其他"备注输入框只占内容默认宽度，
//   与弹窗（size="xl"）严重不匹配，备注框尤其窄到无法正常书写。
const deepInputClass = "w-full px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

/* ========== 处理结果 ↔ 执行进度 联动规则（2026-10-21 新增）==========
 *
 * 矛盾背景：progress 是客观完成度，resultStatus 是主观处理结论。此前二者互不影响，
 *   用户可以选「全部完成」但进度停在 0%，或拖到 100% 却选「部分完成」，
 *   验收人看到的进度与结论自相矛盾。
 *
 * 规则（单一事实来源，UI 与提交校验共用）：
 *   全部完成 / 延迟完成 → 进度强制 100%，滑块锁定
 *   部分完成            → 进度允许 5~95%
 *   无法继续            → 进度不适用（走 reject 通道），滑块锁定
 *   其他                → 进度允许 5~100%（覆盖"进度满了但需额外说明"的特例）
 *
 * 「延迟完成」与「全部完成」进度同为 100%，区别在时间维度（超期 vs 按期），
 *   故反向联动时「延迟完成」不被覆盖。
 */
interface ProgressRule {
  /** 该结论下强制的进度值（设置后滑块锁定） */
  requiredProgress?: number;
  /** 该结论下允许的最小进度 */
  minProgress?: number;
  /** 该结论下允许的最大进度 */
  maxProgress?: number;
  /** 该结论下进度滑块是否禁用 */
  lockProgress: boolean;
}

const RESULT_PROGRESS_RULES: Record<string, ProgressRule> = {
  '全部完成': { requiredProgress: 100, lockProgress: true },
  '部分完成': { minProgress: 5, maxProgress: 95, lockProgress: false },
  '延迟完成': { requiredProgress: 100, lockProgress: true },
  '无法继续': { lockProgress: true },
  '其他': { minProgress: 5, maxProgress: 100, lockProgress: false },
};

/** 滑块步长（与 <input type="range" step> 保持一致） */
const PROGRESS_STEP = 5;

/**
 * 选择处理结果后，规范化进度值
 * - 有 requiredProgress 的（全部完成/延迟完成）直接强制
 * - 有区间的（部分完成/其他）若当前值越界，取区间中点并对齐步长
 */
function normalizeProgressForResult(status: string, currentProgress: number): number {
  const rule = RESULT_PROGRESS_RULES[status];
  if (!rule) return currentProgress;
  if (rule.requiredProgress !== undefined) return rule.requiredProgress;
  if (rule.minProgress !== undefined && rule.maxProgress !== undefined) {
    if (currentProgress < rule.minProgress || currentProgress > rule.maxProgress) {
      const mid = Math.round((rule.minProgress + rule.maxProgress) / 2 / PROGRESS_STEP) * PROGRESS_STEP;
      return mid;
    }
  }
  return currentProgress;
}

/**
 * 拖动进度滑块后，反推应有的处理结果
 * - 100% → 全部完成（「延迟完成」是时间维度的标记，不被覆盖）
 * - 1~95% → 若原本是完成类结论，自动降级为「部分完成」
 * - 0% → 清空结论（还没开始干活，不可能有处理结论）
 */
function inferResultStatusFromProgress(progress: number, currentStatus: string): string {
  if (progress >= 100) {
    return currentStatus === '延迟完成' ? '延迟完成' : '全部完成';
  }
  if (progress > 0) {
    if (currentStatus === '全部完成' || currentStatus === '延迟完成') return '部分完成';
    return currentStatus;
  }
  return '';
}

/**
 * 提交前一致性校验（双保险，防止联动逻辑被绕过）
 * @returns true = 进度与处理结果自洽，允许提交
 */
function isProgressConsistent(status: string, progress: number): boolean {
  if (!status) return false;
  if (status === '无法继续') return true; // 走 reject 通道，进度不适用
  if (status === '全部完成' || status === '延迟完成') return progress === 100;
  if (status === '部分完成') return progress >= 5 && progress <= 95;
  if (status === '其他') return progress >= 5;
  return false;
}

interface TaskFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDispatchTask | Task | null;
  feedbackForm: FeedbackFormData;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackFormData>>;
  // 与 TaskFlowTimeline 的 records 类型一致
  problemFlowRecords: ProblemFlowRecord[];
  /** 2026-10-24：关联问题（巡查异常派生任务用），用于展示具体病害内容 */
  problemDetail?: { description?: string; issueText?: string; issuePresets?: unknown; issue_presets?: unknown } | null;
  validateRequiredFeedback: () => { valid: boolean; message: string };
  onSubmit: () => void;
}

/**
 * 任务反馈表单弹窗组件
 */
export function TaskFeedbackModal({
  isOpen,
  onClose,
  task,
  feedbackForm,
  setFeedbackForm,
  problemFlowRecords,
  problemDetail,
  validateRequiredFeedback,
  onSubmit,
}: TaskFeedbackModalProps) {
  if (!task) return null;

  // 当前处理结果对应的进度规则（用于滑块锁定 / 提示文案）
  const progressRule = feedbackForm.resultStatus
    ? RESULT_PROGRESS_RULES[feedbackForm.resultStatus]
    : undefined;
  // 进度与结论是否自洽（提交前双保险）
  const consistent = isProgressConsistent(feedbackForm.resultStatus, feedbackForm.progress);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="任务处理"
      size="xl"
      showFooter={false}
      bottomContent={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4" /> 取消
          </Button>
          {/* 新增：无法继续按钮 */}
          <Button
            variant={feedbackForm.cannotContinue ? 'destructive' : 'outline'}
            onClick={() => {
              // 切换无法继续模式
              setFeedbackForm(prev => ({ ...prev, cannotContinue: !prev.cannotContinue }));
            }}
          >
            {feedbackForm.cannotContinue ? '取消无法继续' : '无法继续'}
          </Button>
          <Button
            variant={feedbackForm.cannotContinue ? 'destructive' : 'warning'}
            onClick={onSubmit}
            disabled={
              feedbackForm.cannotContinue
                ? !feedbackForm.cannotContinueReason.trim()  // 无法继续时只需要填写原因
                : (!validateRequiredFeedback().valid ||  // 正常模式需要校验必填反馈
                   !feedbackForm.resultStatus ||  // 必须选择处理结果
                   !consistent ||  // 2026-10-21：进度必须与处理结果自洽（如 100% 配"全部完成"）
                   ((feedbackForm.resultStatus === '其他' || feedbackForm.resultStatus === '无法继续') && !feedbackForm.resultText.trim())  // 选择"其他"或"无法继续"时需要填写备注
                )
            }
          >
            {feedbackForm.cannotContinue ? '确认无法继续' : '提交反馈'}
          </Button>
        </div>
      }
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
              {/* 2026-10-24 修复：与 TaskDetailModal 一致，改为动态取负责人（原硬编码「陆启闯」） */}
              <p className="font-semibold text-gray-900">{(task as any).assigneeName || (task as any).assignee || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">优先级</Label>
              <p className={`font-semibold ${PRIORITY_MAP[task.priority]?.color || ''}`}>
                {PRIORITY_MAP[task.priority]?.label || task.priority}
              </p>
            </div>
          </div>
        </div>

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
              <Label className="text-xs text-gray-500">任务类型</Label>
              <p className="font-semibold text-gray-900">{getTypeLabel(task.types?.[0] || '')}</p>
            </div>
          </div>
        </div>

        {/* 关联问题内容 —— 2026-10-24
            巡查异常派生的整改任务，执行人此前在弹窗里只能看到任务标题，
            看不到具体病害（灰霉病/病毒病/白粉病），不知道要治什么。 */}
        {problemDetail && (problemDetail.description || problemDetail.issueText) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-red-700 mb-1">关联问题</div>
            <p className="text-sm text-gray-800 leading-relaxed">
              {problemDetail.description || problemDetail.issueText}
            </p>
            {(() => {
              const raw = (problemDetail as any).issuePresets ?? (problemDetail as any).issue_presets;
              let presets: string[] = [];
              if (Array.isArray(raw)) presets = raw;
              else if (typeof raw === 'string' && raw.trim()) {
                try { const p = JSON.parse(raw); if (Array.isArray(p)) presets = p; } catch { /* 忽略脏值 */ }
              }
              if (presets.length === 0) return null;
              return (
                <div className="flex gap-1 flex-wrap mt-2">
                  {presets.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 bg-orange-100 border border-orange-300 text-orange-800 text-xs font-medium rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* 流转记录 —— 2026-10-21：去掉外层重复标题（TaskFlowTimeline 自带「流转记录（N条）」） */}
        {task.sourceProblemId && problemFlowRecords.length > 0 && (
          <div>
            <TaskFlowTimeline records={problemFlowRecords} />
          </div>
        )}

        {/* 处理结果（2026-10-21：移到执行进度上方 —— 先选结论，进度自动跟随，
            符合"先表态再量化"的操作直觉；此前进度在上、结论在下，用户容易先拖滑块再发现结论被改） */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            处理结果 <span className="text-red-500">*</span>
          </Label>
          <select
            value={feedbackForm.resultStatus}
            onChange={(e) => {
              const newStatus = e.target.value;
              setFeedbackForm(prev => {
                // 正向联动：选择结论时同步规范化进度（全部完成→100，部分完成→5~95）
                const nextProgress = normalizeProgressForResult(newStatus, prev.progress);
                return {
                  ...prev,
                  resultStatus: newStatus as FeedbackFormData['resultStatus'],
                  resultText: '',
                  progress: nextProgress,
                  // 选择"无法继续"时自动设置 cannotContinue 为 true
                  cannotContinue: newStatus === '无法继续',
                  cannotContinueReason: newStatus === '无法继续' ? prev.cannotContinueReason : '',
                };
              });
            }}
            className={deepInputClass}
          >
            <option value="">请选择处理结果</option>
            <option value="全部完成">全部完成（进度自动设为 100%）</option>
            <option value="部分完成">部分完成（进度 5% ~ 95%）</option>
            <option value="延迟完成">延迟完成（已完工但超期，进度 100%）</option>
            <option value="无法继续">无法继续（转交他人处理）</option>
            <option value="其他">其他（需填写备注说明）</option>
          </select>
          {/* 联动状态提示：让用户明确知道进度已被自动设定 */}
          {feedbackForm.resultStatus && RESULT_PROGRESS_RULES[feedbackForm.resultStatus]?.requiredProgress !== undefined && (
            <p className="text-xs text-emerald-600 mt-1">
              进度已根据处理结果自动设为 {feedbackForm.progress}%
            </p>
          )}
        </div>

        {/* 执行进度（可操作）—— 与「处理结果」双向联动，
            结论为完成类时锁定 100%，拖到 100% 时自动切换结论 */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            执行进度
            {progressRule?.lockProgress && (
              <span className="ml-2 text-xs font-normal text-gray-500">（由处理结果自动设定）</span>
            )}
          </h4>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              step={PROGRESS_STEP}
              value={feedbackForm.progress}
              disabled={progressRule?.lockProgress || feedbackForm.cannotContinue}
              onChange={(e) => {
                const newProgress = parseInt(e.target.value, 10);
                setFeedbackForm(prev => {
                  // 反向联动：进度变化同步修正处理结果，消除"100% + 部分完成"这类矛盾
                  const inferred = inferResultStatusFromProgress(newProgress, prev.resultStatus);
                  return {
                    ...prev,
                    progress: newProgress,
                    resultStatus: inferred as FeedbackFormData['resultStatus'],
                    // 从完成类结论降级时，清掉只属于"其他/无法继续"的备注
                    resultText: inferred === prev.resultStatus ? prev.resultText : '',
                  };
                });
              }}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="w-14 text-sm font-medium text-gray-700 text-center bg-gray-100 rounded px-2 py-1">
              {feedbackForm.progress}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {feedbackForm.cannotContinue ? '当前为"无法继续"模式，进度不适用' :
             feedbackForm.progress === 100 ? '已完成，提交后进入待验收' :
             feedbackForm.progress === 0 ? '未开始 —— 请拖动进度条或先选择处理结果' :
             `进行中（还差 ${100 - feedbackForm.progress}%）`}
          </p>
        </div>
        {/* 备注输入框 - 仅当选择"其他"或"无法继续"时显示 */}
        {(feedbackForm.resultStatus === '其他' || feedbackForm.resultStatus === '无法继续') && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              备注说明 <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={feedbackForm.resultText}
              onChange={(e) => setFeedbackForm(prev => ({ ...prev, resultText: e.target.value }))}
              placeholder="请详细说明处理情况和原因..."
              rows={4}
              className={deepInputClass}
            />
          </div>
        )}

        {/* 无法继续原因输入区域（当 cannotContinue 为 true 时显示） */}
        {feedbackForm.cannotContinue && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <Label className="block text-sm font-medium text-red-700 mb-2">
              请说明无法继续的原因 <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={feedbackForm.cannotContinueReason}
              onChange={(e) => setFeedbackForm(prev => ({ ...prev, cannotContinueReason: e.target.value }))}
              placeholder="请详细描述无法继续的原因（如：天气原因、设备故障、物料不足、其他紧急任务等）..."
              rows={3}
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <p className="text-xs text-red-600 mt-2">
              提交后任务将变为"已拒绝"状态，等待重新分派给其他执行人。
            </p>
          </div>
        )}

        {/* 必填反馈输入区域（无法继续模式下不显示） */}
        {!feedbackForm.cannotContinue && task.requiredFeedback && task.requiredFeedback.length > 0 && (
          <div className="space-y-3">
            <Label className="block text-sm font-medium text-gray-700">
              必填反馈项
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {task.requiredFeedback.includes('workload_confirm') && (
                <FeedbackInput
                  type="workload_confirm"
                  value={feedbackForm.workloadConfirm}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, workloadConfirm: v }))}
                />
              )}
              {task.requiredFeedback.includes('gps') && (
                <FeedbackInput
                  type="gps"
                  value={feedbackForm.gpsLocation}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, gpsLocation: v }))}
                />
              )}
              {task.requiredFeedback.includes('photo_before') && (
                <FeedbackInput
                  type="photo_before"
                  value={feedbackForm.photosBefore}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, photosBefore: v }))}
                />
              )}
              {task.requiredFeedback.includes('photo_after') && (
                <FeedbackInput
                  type="photo_after"
                  value={feedbackForm.photosAfter}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, photosAfter: v }))}
                />
              )}
              {task.requiredFeedback.includes('material') && (
                <FeedbackInput
                  type="material"
                  value={feedbackForm.materialCode}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, materialCode: v }))}
                />
              )}
              {task.requiredFeedback.includes('voice') && (
                <FeedbackInput
                  type="voice"
                  value={feedbackForm.voiceNote}
                  onChange={(v) => setFeedbackForm(prev => ({ ...prev, voiceNote: v }))}
                />
              )}
            </div>
          </div>
        )}

        {/* 反馈提示信息（根据模式显示不同内容）
            2026-10-21：判断依据由 task.progress（任务原始进度）改为 feedbackForm.progress
            （用户本次选择的进度）—— 提交逻辑用后者决定是否进入待验收，此前提示与实际行为不符。 */}
        <div className={`rounded-lg p-3 ${
          feedbackForm.cannotContinue
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className={`text-sm ${
            feedbackForm.cannotContinue ? 'text-red-800' : 'text-amber-800'
          }`}>
            {feedbackForm.cannotContinue
              ? '确认无法继续后，任务将变为"已拒绝"状态，等待重新分派。'
              : feedbackForm.progress === 100
                ? `提交反馈后，任务将进入"待验收"状态，等待管理者确认完成（处理结果：${feedbackForm.resultStatus || '未选择'}）。`
                : `提交进度反馈后，任务将继续进行（当前 ${feedbackForm.progress}%，可再次提交直到 100%）。`}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TaskFeedbackModal;
