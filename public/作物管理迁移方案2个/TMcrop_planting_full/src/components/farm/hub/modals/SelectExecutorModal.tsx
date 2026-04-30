/**
 * 选择执行人弹窗组件
 * 功能：为待派工任务选择执行人
 */

import { useState } from 'react';
import { Modal } from '../../../ui/Modal';
import { UserPlus, Users, Clock, AlertCircle } from 'lucide-react';
import { Task } from '../../../../hooks/useTasks';
import { taskDispatchStaff } from '../../../../data/farmMockData';

interface SelectExecutorModalProps {
  isOpen: boolean;
  task: Task | null;
  onConfirm: (assigneeId: string, assigneeName: string) => void;
  onClose: () => void;
}

export function SelectExecutorModal({
  isOpen,
  task,
  onConfirm,
  onClose,
}: SelectExecutorModalProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  if (!isOpen || !task) return null;

  // 执行人状态映射
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      available: '空闲',
      busy: '工作中',
      off: '休息中',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      available: 'text-green-600 bg-green-50',
      busy: 'text-orange-600 bg-orange-50',
      off: 'text-gray-600 bg-gray-50',
    };
    return colorMap[status] || 'text-gray-600 bg-gray-50';
  };

  const handleSubmit = () => {
    if (selectedAssignee) {
      const staff = taskDispatchStaff.find(s => s.id === selectedAssignee);
      if (staff) {
        onConfirm(selectedAssignee, staff.name);
        setSelectedAssignee('');
      }
    }
  };

  const handleClose = () => {
    setSelectedAssignee('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="选择执行人"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 提示信息 */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-100 bg-blue-50">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900">
              为任务 "{task.title || task.id}" 选择执行人
            </p>
            <p className="text-sm text-blue-700 mt-1">
              选择执行人后，任务将直接变为已接受状态并推送到执行人的任务列表
            </p>
          </div>
        </div>

        {/* 任务信息 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            <p>任务编号：{task.taskCode || task.id}</p>
            <p>任务类型：{task.typeName || task.type}</p>
            <p>任务区域：{task.greenhouseName || task.field || '-'}</p>
            <p>批次：{task.batchCode || '-'}</p>
            <p className="col-span-2">
              计划时间：{task.planStart || '-'} 至 {task.planEnd || '-'}
            </p>
          </div>
        </div>

        {/* 执行人选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            选择执行人
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {taskDispatchStaff.map(staff => (
              <div
                key={staff.id}
                onClick={() => setSelectedAssignee(staff.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedAssignee === staff.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                    selectedAssignee === staff.id ? 'bg-emerald-500' : 'bg-gray-400'
                  }`}>
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{staff.name}</p>
                    <p className="text-sm text-gray-500">{staff.role || '执行人员工'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(staff.status || 'available')}`}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {getStatusLabel(staff.status || 'available')}
                  </span>
                  {selectedAssignee === staff.id && (
                    <span className="text-emerald-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3-707-707a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H11a1 1 0 01-1-1V11z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 确认提示 */}
        {selectedAssignee && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-emerald-800">
              确认将任务派发给：
              <span className="font-medium">
                {taskDispatchStaff.find(s => s.id === selectedAssignee)?.name}
              </span>
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              执行人将收到任务通知，任务状态将变为"已接受"
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAssignee}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              selectedAssignee
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
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

export default SelectExecutorModal;
