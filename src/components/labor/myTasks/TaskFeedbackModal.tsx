/**
 * 任务反馈表单弹窗组件
 */

import { Modal } from '@/components/ui/Modal';
import { FeedbackInput } from '../../common/FeedbackInput';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { FeedbackFormData } from './types';
import { STATUS_MAP, PRIORITY_MAP, getTypeLabel } from './constants';
import { Label } from '@/components/ui/label';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface TaskFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDispatchTask | Task | null;
  feedbackForm: FeedbackFormData;
  setFeedbackForm: React.Dispatch<React.SetStateAction<FeedbackFormData>>;
  problemFlowRecords: Array<Record<string, unknown>>;
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
  validateRequiredFeedback,
  onSubmit,
}: TaskFeedbackModalProps) {
  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="任务处理"
      size="xl"
      showFooter={false}
      bottomContent={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            取消
          </button>
          {/* 新增：无法继续按钮 */}
          <button
            onClick={() => {
              // 切换无法继续模式
              setFeedbackForm(prev => ({ ...prev, cannotContinue: !prev.cannotContinue }));
            }}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              feedbackForm.cannotContinue
                ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                : 'border-red-300 text-red-600 hover:bg-red-50'
            }`}
          >
            {feedbackForm.cannotContinue ? '取消无法继续' : '无法继续'}
          </button>
          <button
            onClick={onSubmit}
            disabled={
              feedbackForm.cannotContinue
                ? !feedbackForm.cannotContinueReason.trim()  // 无法继续时只需要填写原因
                : (!validateRequiredFeedback().valid ||  // 正常模式需要校验必填反馈
                   !feedbackForm.resultStatus ||  // 必须选择处理结果
                   ((feedbackForm.resultStatus === '其他' || feedbackForm.resultStatus === '无法继续') && !feedbackForm.resultText.trim())  // 选择"其他"或"无法继续"时需要填写备注
                )
            }
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              feedbackForm.cannotContinue
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {feedbackForm.cannotContinue ? '确认无法继续' : '提交反馈'}
          </button>
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

        {/* 流转记录 */}
        {task.sourceProblemId && problemFlowRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">流转记录</h4>
            <TaskFlowTimeline records={problemFlowRecords} />
          </div>
        )}

        {/* 执行进度（可操作） */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={feedbackForm.progress}
              onChange={(e) => {
                setFeedbackForm(prev => ({ ...prev, progress: parseInt(e.target.value, 10) }));
              }}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="w-14 text-sm font-medium text-gray-700 text-center bg-gray-100 rounded px-2 py-1">
              {feedbackForm.progress}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {feedbackForm.progress === 100 ? '已完成，可提交反馈' :
             feedbackForm.progress === 0 ? '未开始' : '进行中'}
          </p>
        </div>

        {/* 处理结果/进展情况（进度条下方 - 统一使用下拉选择） */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            处理结果 <span className="text-red-500">*</span>
          </Label>
          <select
            value={feedbackForm.resultStatus}
            onChange={(e) => {
              const newStatus = e.target.value as '' | '全部完成' | '部分完成' | '延迟完成' | '无法继续' | '其他';
              setFeedbackForm(prev => ({
                ...prev,
                resultStatus: newStatus,
                resultText: '',
                // 选择"无法继续"时自动设置 cannotContinue 为 true
                cannotContinue: newStatus === '无法继续',
                cannotContinueReason: newStatus === '无法继续' ? prev.cannotContinueReason : '',
              }));
            }}
            className={deepInputClass}
          >
            <option value="">请选择处理结果</option>
            <option value="全部完成">全部完成</option>
            <option value="部分完成">部分完成</option>
            <option value="延迟完成">延迟完成</option>
            <option value="无法继续">无法继续</option>
            <option value="其他">其他</option>
          </select>
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

        {/* 反馈提示信息（根据模式显示不同内容） */}
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
              : task.progress === 100
                ? '提交反馈后，任务将进入"待验收"状态，等待管理者确认完成。'
                : '提交进度反馈后，任务将继续进行，可再次提交直到100%。'}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TaskFeedbackModal;
