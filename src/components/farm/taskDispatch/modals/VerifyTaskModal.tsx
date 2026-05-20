/**
 * 任务验收弹窗组件
 * 功能：验收人查看任务记录，选择通过验收或驳回返工
 */

import { useState } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/button';
import { CheckCircle, XCircle, Clock, User, MessageSquare, Image, Mic, MapPin, Package } from 'lucide-react';
import { Task, TaskRecord, TASK_STATUS_CONFIG } from '../../../../types/task';
import { TaskProgressTimeline } from '../components/TaskProgressTimeline';
import { TextArea } from '../../../ui/TextArea';

interface VerifyTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  records: TaskRecord[];
  onVerify: (approved: boolean, comments?: string) => void;
  onClose: () => void;
}

export function VerifyTaskModal({
  isOpen,
  task,
  records,
  onVerify,
  onClose,
}: VerifyTaskModalProps) {
  const [handleType, setHandleType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');

  if (!task) return null;

  const statusConfig = TASK_STATUS_CONFIG[task.status];

  const handleSubmit = () => {
    if (handleType === 'approve') {
      onVerify(true, comments || undefined);
    } else if (handleType === 'reject') {
      if (comments.trim()) {
        onVerify(false, comments);
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setHandleType(null);
    setComments('');
  };

  // 获取反馈类型图标
  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
      case 'image_before':
      case 'image_after':
        return <Image className="w-4 h-4 text-purple-500" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-red-500" />;
      case 'gps':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'materials':
        return <Package className="w-4 h-4 text-orange-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="任务验收"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 任务基本信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{task.title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="text-gray-500">任务编号</label>
              <p className="font-medium">{task.taskCode}</p>
            </div>
            <div>
              <label className="text-gray-500">执行人</label>
              <p className="font-medium">{task.assigneeName}</p>
            </div>
            <div>
              <label className="text-gray-500">任务类型</label>
              <p className="font-medium">{task.typeName}</p>
            </div>
            <div>
              <label className="text-gray-500">当前进度</label>
              <p className="font-medium">{task.progress}%</p>
            </div>
          </div>
          {task.dueDate && (
            <div className="mt-2 text-sm text-gray-500">
              截止日期：{task.dueDate}
            </div>
          )}
        </div>

        {/* 进度历史 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            执行记录
          </label>
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {records.length > 0 ? (
              <TaskProgressTimeline records={records} />
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                暂无执行记录
              </div>
            )}
          </div>
        </div>

        {/* 驳回原因提示 */}
        {handleType === 'reject' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>注意：</strong>驳回后任务将返回给执行人，执行人需要继续执行或放弃。连续驳回2次后任务将变为"任务失败"状态，需要重新派发。
            </p>
          </div>
        )}

        {/* 验收意见 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {handleType === 'reject' ? '驳回原因' : '验收意见'}
            {handleType === 'reject' && <span className="text-red-500">*</span>}
          </label>
          <TextArea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={
              handleType === 'reject'
                ? '请填写驳回原因，说明需要返工的内容...'
                : '选填，可添加验收备注...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-200">
          <Button
            onClick={() => {
              resetForm();
              onClose();
            }}
            variant="secondary"
            size="sm"
          >
            取消
          </Button>

          {/* 驳回按钮 */}
          <Button
            onClick={() => setHandleType('reject')}
            disabled={handleType === 'approve'}
            variant={handleType === 'reject' ? "destructive" : "outline"}
            size="sm"
            className={handleType !== 'reject' ? 'bg-red-50 text-red-600 hover:bg-red-100' : ''}
          >
            <XCircle className="w-4 h-4" />
            驳回返工
          </Button>

          {/* 通过按钮 */}
          <Button
            onClick={() => setHandleType('approve')}
            disabled={handleType === 'reject'}
            variant={handleType === 'approve' ? "default" : "outline"}
            size="sm"
            className={handleType !== 'approve' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : ''}
          >
            <CheckCircle className="w-4 h-4" />
            验收通过
          </Button>
        </div>

        {/* 确认操作 */}
        {handleType && (
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <Button onClick={resetForm} variant="secondary" size="sm">
              上一步
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={handleType === 'reject' && !comments.trim()}
              variant={handleType === 'reject' ? "destructive" : "default"}
              size="sm"
            >
              {handleType === 'reject' ? '确认驳回' : '确认通过'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default VerifyTaskModal;
