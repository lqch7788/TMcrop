/**
 * 重新派发任务弹窗组件
 * 功能：任务失败/放弃后，选择新执行人重新派发
 */

import { useState, useEffect } from 'react';
import { Modal } from '../../../ui/Modal';
import { UserPlus, AlertTriangle, Users } from 'lucide-react';
import { Task } from '../../../../types/task';
import { useUserStore } from '../../../../stores';

interface ReassignTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onConfirm: (newAssigneeId: string, newAssigneeName: string) => void;
  onClose: () => void;
}

export function ReassignTaskModal({
  isOpen,
  task,
  onConfirm,
  onClose,
}: ReassignTaskModalProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
  }, [users.length, loadUsers]);

  if (!task) return null;

  // 执行人拒绝次数 >= 2 时必须更换执行人
  const mustChangeExecutor = (task.executorRejectCount || 0) >= 2;

  // 过滤可选的执行人（排除当前执行人，但如果必须更换则不过滤）
  const availableAssignees = mustChangeExecutor
    ? users  // 必须更换时，显示所有执行人
    : users.filter(u => u.id !== task.assigneeId);  // 排除当前执行人

  const handleSubmit = () => {
    if (selectedAssignee) {
      const user = users.find(u => u.id === selectedAssignee);
      if (user) {
        onConfirm(selectedAssignee, user.name);
        setSelectedAssignee('');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="重新派发任务"
      size="md"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 警示信息 */}
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          mustChangeExecutor
            ? 'border-red-200 bg-red-50'  // 严重提示
            : 'border-orange-100 bg-orange-50'
        }`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            mustChangeExecutor ? 'text-red-600' : 'text-orange-600'
          }`} />
          <div>
            <p className={`font-medium ${
              mustChangeExecutor ? 'text-red-900' : 'text-orange-900'
            }`}>
              {mustChangeExecutor
                ? `执行人已拒绝任务${task.executorRejectCount}次，必须更换执行人！`
                : `任务 "${task.title}" 需要重新派发`}
            </p>
            <p className={`text-sm mt-1 ${
              mustChangeExecutor ? 'text-red-700' : 'text-orange-700'
            }`}>
              {mustChangeExecutor
                ? '请选择新的执行人'
                : `请选择新的执行人。原执行人：${task.assigneeName || '(已清空)'}`}
            </p>
          </div>
        </div>

        {/* 任务信息 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            <p>任务编号：{task.taskCode}</p>
            <p>执行人：{task.assigneeName || '(已清空)'}</p>
            <p>任务类型：{task.typeName}</p>
            <p>当前状态：
              <span className="text-red-600 font-medium">
                {task.status === 'failed' ? '任务失败' : task.status === 'rejected' ? '已拒绝' : '已放弃'}
              </span>
            </p>
            {task.rejectReason && (
              <p className="col-span-2 text-red-600">拒绝原因：{task.rejectReason}</p>
            )}
          </div>
        </div>

        {/* 执行人选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择新执行人
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择执行人</option>
              {availableAssignees.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 确认提示 */}
        {selectedAssignee && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-emerald-800">
              确认将任务派发给：
              <span className="font-medium">
                {users.find(u => u.id === selectedAssignee)?.name}
              </span>
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAssignee}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              selectedAssignee
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            确认派发
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ReassignTaskModal;
