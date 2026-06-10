import { useState } from 'react';
import { Check, Send } from 'lucide-react';

import { Task } from '../../../types';
import { SearchableSelect } from '../../materialReturn/modals/SearchableSelect';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Label } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: string[];
  tasks: Task[];
  users: Array<{ id: string; name: string }>;
  greenhouses: Array<{ id: string; name: string }>;
  onClose: () => void;
  onConfirm: (editedTasks: Record<string, Partial<Task>>) => void;
}

export function BatchEditModal({ isOpen, selectedRows, tasks, users, greenhouses, onClose, onConfirm }: BatchEditModalProps) {
  const [selectedTaskCode, setSelectedTaskCode] = useState<string>('');
  const [editedTasks, setEditedTasks] = useState<Record<string, Partial<Task>>>({});

  if (!isOpen) return null;

  const selectedTaskList = selectedRows.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[];
  const currentTask = selectedTaskCode ? tasks.find(t => t.taskCode === selectedTaskCode) : null;
  const editedData = selectedTaskCode ? editedTasks[selectedTaskCode] || {} : {};

  const handleFieldChange = (field: keyof Task, value: unknown) => {
    const updated = {
      ...editedTasks,
      [selectedTaskCode]: { ...editedTasks[selectedTaskCode], [field]: value },
    };
    setEditedTasks(updated);
  };

  // 确认（下一个）- 仅切换到下一个任务
  const handleConfirmNext = () => {
    const currentIndex = selectedTaskList.findIndex(t => t.taskCode === selectedTaskCode);
    if (currentIndex < selectedTaskList.length - 1) {
      setSelectedTaskCode(selectedTaskList[currentIndex + 1].taskCode);
    } else {
      setSelectedTaskCode(selectedTaskList[0].taskCode);
    }
  };

  // 发布 - 保存所有编辑并关闭
  const handlePublish = () => {
    onConfirm(editedTasks);
    setEditedTasks({});
    setSelectedTaskCode('');
    onClose();
  };

  const handleClose = () => {
    setEditedTasks({});
    setSelectedTaskCode('');
    onClose();
  };

  const content = (
    <div>
      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 个任务进行批量编辑，
          已编辑 <strong>{Object.keys(editedTasks).length}</strong> 个
        </p>
      </div>

      {/* Task Selector */}
      <div className="mb-4">
        <Label className="block text-xs font-medium text-gray-600 mb-1">选择任务编号</Label>
        <SearchableSelect
          value={selectedTaskCode}
          options={selectedTaskList.map(task => ({
            value: task.taskCode,
            label: `${task.taskCode} - ${task.title}${editedTasks[task.taskCode] ? ' ✅ 已编辑' : ''}`
          }))}
          onChange={setSelectedTaskCode}
          placeholder="请选择任务编号"
          className="w-full"
        />
      </div>

      {/* Content */}
      {selectedTaskCode && currentTask && (
        <div className="grid grid-cols-4 gap-3">
          {/* 任务编号 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">任务编号</div>
            <div className="text-sm font-medium text-gray-900">{currentTask.taskCode}</div>
          </div>

          {/* 任务标题 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">任务标题</div>
            <input
              type="text"
              value={editedData.title ?? currentTask.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 执行人 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">执行人</div>
            <select
              value={editedData.assigneeId ?? currentTask.assigneeId}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                handleFieldChange('assigneeId', e.target.value);
                handleFieldChange('assigneeName', user?.name || '待分配');
              }}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">待分配</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* 作业区域 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">作业区域</div>
            <select
              value={editedData.greenhouseId ?? currentTask.greenhouseId}
              onChange={(e) => {
                const gh = greenhouses.find(g => g.id === e.target.value);
                handleFieldChange('greenhouseId', e.target.value);
                handleFieldChange('greenhouseName', gh?.name || '');
              }}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              {greenhouses.map(gh => (
                <option key={gh.id} value={gh.id}>{gh.name}</option>
              ))}
            </select>
          </div>

          {/* 优先级 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">优先级</div>
            <select
              value={editedData.priority ?? currentTask.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>

          {/* 计划结束日期 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">计划结束日期</div>
            <DatePicker
              selected={(editedData.dueDate ?? currentTask.dueDate) ? new Date(editedData.dueDate ?? currentTask.dueDate) : undefined}
              onChange={(date) => handleFieldChange('dueDate', todayLocal(date))}
              className="w-full"
            />
          </div>

          {/* 状态 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">状态</div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
              currentTask.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              currentTask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              currentTask.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {currentTask.status === 'pending' ? '待执行' :
               currentTask.status === 'in_progress' ? '进行中' :
               currentTask.status === 'completed' ? '已完成' : '已取消'}
            </span>
          </div>

          {/* 发布人 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">发布人</div>
            <div className="text-sm text-gray-700">{currentTask.assignerName}</div>
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button variant="blue" onClick={handleConfirmNext}><Check className="w-4 h-4" /> 确认（下一个）</Button>
      <Button onClick={handlePublish}><Send className="w-4 h-4" /> 发布</Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="批量编辑任务"
      size="xxl"
      showFooter={true}
      footer={footer}
      showMaximize={true}
    >
      {content}
    </UnifiedModal>
  );
}

export default BatchEditModal;