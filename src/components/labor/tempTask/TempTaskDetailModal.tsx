import { useState } from 'react';
import { X, MapPin, User, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { TempTask, TEMP_TASK_URGENCY_CONFIG } from '../../../types';

const statusConfig = {
  pending: { label: '待执行', color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-50' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-50' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50' },
  rejected: { label: '已驳回', color: 'text-red-600', bg: 'bg-red-50' },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
  pending_reassign: { label: '待重新派发', color: 'text-purple-600', bg: 'bg-purple-50' },
};

interface TempTaskDetailModalProps {
  task: TempTask | null;
  onClose: () => void;
  onStartTask: (task: TempTask) => void;
  onSubmitComplete: (task: TempTask, hours: number, remarks: string) => void;
  onAcceptComplete: (task: TempTask) => void;
  onRejectComplete: (task: TempTask, reason: string) => void;
  onReassign?: (task: TempTask) => void;  // 重新派发回调
}

export function TempTaskDetailModal({
  task,
  onClose,
  onStartTask,
  onSubmitComplete,
  onAcceptComplete,
  onRejectComplete,
  onReassign,
}: TempTaskDetailModalProps) {
  if (!task) return null;

  // 待验收弹窗状态
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [completeHours, setCompleteHours] = useState(task.estimatedHours?.toString() || '1');
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const content = (
    <div className="space-y-4">
      {/* 标签 */}
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-sm font-medium ${TEMP_TASK_URGENCY_CONFIG[task.urgency].badge}`}>
          {TEMP_TASK_URGENCY_CONFIG[task.urgency].label}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}>
          {statusConfig[task.status].label}
        </span>
      </div>

      {/* 标题 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">{task.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{task.taskCode}</p>
      </div>

      {/* 信息卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">任务类型</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{task.tempTaskType}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">工作地点</p>
          <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {task.workLocation}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">负责人</p>
          <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assigneeName}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">预估时长</p>
          <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.estimatedHours}小时
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">截止日期</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{task.dueDate}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">发布人</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{task.assignerName}</p>
        </div>
      </div>

      {/* 任务描述 */}
      {task.description && (
        <div>
          <p className="text-sm text-gray-500">任务描述</p>
          <p className="text-sm text-gray-900 mt-1">{task.description}</p>
        </div>
      )}

      {/* 备注 */}
      {task.notes && (
        <div>
          <p className="text-sm text-gray-500">备注</p>
          <p className="text-sm text-gray-900 mt-1">{task.notes}</p>
        </div>
      )}

      {/* 紧急说明 */}
      {task.urgency === 'critical' && (
        <div className="p-3 bg-red-50 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">非常紧急任务</p>
            <p className="text-xs text-red-600 mt-1">此任务需要立即处理，请相关人员尽快响应</p>
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      {task.status === 'pending' && (
        <button
          onClick={() => onStartTask(task)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          开始执行
        </button>
      )}
      {task.status === 'in_progress' && (
        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          提交完成
        </button>
      )}
      {task.status === 'waiting_acceptance' && (
        <>
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            驳回
          </button>
          <button
            onClick={() => onAcceptComplete(task)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            审核通过
          </button>
        </>
      )}
      {task.status === 'pending_reassign' && onReassign && (
        <button
          onClick={() => onReassign(task)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          重新派发
        </button>
      )}
      {task.status === 'pending_reassign' && !onReassign && (
        <span className="text-purple-600 font-medium">
          该任务已被驳回2次，请等待重新派发
        </span>
      )}
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
      >
        关闭
      </button>
    </>
  );

  // 提交完成弹窗
  const submitModalContent = showSubmitModal && (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">实际工时（小时）</label>
        <input
          type="number"
          value={completeHours}
          onChange={(e) => setCompleteHours(e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          min="0.5"
          step="0.5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">完成说明</label>
        <textarea
          value={completeRemarks}
          onChange={(e) => setCompleteRemarks(e.target.value)}
          placeholder="请输入完成说明..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
        />
      </div>
    </div>
  );

  // 驳回弹窗
  const rejectModalContent = showRejectModal && (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">驳回原因</label>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请输入驳回原因..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
        />
      </div>
    </div>
  );

  return (
    <>
      <UnifiedModal
        isOpen={true}
        onClose={onClose}
        title="任务详情"
        size="md"
        showFooter={true}
        headerAction={
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        }
        footer={footer}
      >
        {content}
      </UnifiedModal>

      {/* 提交完成弹窗 */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowSubmitModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">提交完成</h2>
                <button onClick={() => setShowSubmitModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                {submitModalContent}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onSubmitComplete(task, parseFloat(completeHours) || 1, completeRemarks);
                    setShowSubmitModal(false);
                  }}
                  className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  确认提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 驳回弹窗 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">驳回任务</h2>
                <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                {rejectModalContent}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    onRejectComplete(task, rejectReason);
                    setShowRejectModal(false);
                  }}
                  className="h-10 px-6 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认驳回
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TempTaskDetailModal;
