import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { TempTask } from '../../../types';
import { tempTasks as initialTempTasks, users } from '../../../data/mockData';
import { TempTaskFilters } from './TempTaskFilters';
import { TempTaskTable } from './TempTaskTable';
import { TempTaskDetailModal } from './TempTaskDetailModal';
import { TempTaskFormModal } from './TempTaskFormModal';
import { useTempTaskFilters } from './hooks/useTempTaskFilters';
import { useTempTaskForm } from './hooks/useTempTaskForm';

export function TempTaskPage() {
  const [taskList, setTaskList] = useState<TempTask[]>([...initialTempTasks]);
  const [selectedTask, setSelectedTask] = useState<TempTask | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TempTask | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 筛选hook
  const {
    filters,
    filteredTasks,
    stats,
    setSearchTerm,
    setUrgencyFilter,
    setStatusFilter,
  } = useTempTaskFilters({ tasks: taskList });

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  // 关闭表单弹窗
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingTask(null);
  };

  // 表单hook
  const {
    formData,
    errors,
    updateFormData,
    handleSubmit: handleFormSubmit,
  } = useTempTaskForm({
    initialData: editingTask,
    users: users.map(u => ({ id: u.id, name: u.name })),
    onSubmit: (taskData) => {
      if (editingTask) {
        // 更新
        setTaskList(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } as TempTask : t));
      } else {
        // 新建
        const newTask: TempTask = {
          id: `TT${Date.now()}`,
          taskCode: `TEMP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(taskList.length + 1).padStart(3, '0')}`,
          title: taskData.title || '',
          priority: taskData.priority || 'medium',
          status: 'pending',
          assigneeId: taskData.assigneeId || '',
          assigneeName: taskData.assigneeName || '待分配',
          assignerId: 'admin',
          assignerName: '管理员',
          dueDate: taskData.dueDate || new Date().toISOString().slice(0, 10),
          description: taskData.description || '',
          notes: taskData.notes || '',
          images: [],
          urgency: taskData.urgency || 'normal',
          tempTaskType: taskData.tempTaskType || '其他',
          workLocation: taskData.workLocation || '',
          estimatedHours: taskData.estimatedHours || 1,
        };
        setTaskList(prev => [newTask, ...prev]);
      }
      closeFormModal();
    },
  });

  // 打开详情弹窗
  const openDetailModal = (task: TempTask) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  // 打开创建弹窗
  const openCreateModal = () => {
    setEditingTask(null);
    setIsFormModalOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (task: TempTask) => {
    setEditingTask(task);
    setIsFormModalOpen(true);
  };

  // 开始任务
  const handleStartTask = (task: TempTask) => {
    setTaskList(prev => prev.map(t => t.id === task.id ? { ...t, status: 'in_progress' as const } : t));
    closeDetailModal();
  };

  // 完成任务
  const handleCompleteTask = (task: TempTask) => {
    setTaskList(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' as const } : t));
    closeDetailModal();
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">临时任务</h1>
              <p className="text-xs text-gray-500">管理不在计划内的临时任务</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            新建
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">总任务</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">待执行</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">进行中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">已完成</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
          <p className="text-sm text-gray-500">非常紧急</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
        </div>
      </div>

      {/* 筛选组件 */}
      <TempTaskFilters
        searchTerm={filters.searchTerm}
        urgencyFilter={filters.urgencyFilter}
        statusFilter={filters.statusFilter}
        onSearchChange={setSearchTerm}
        onUrgencyChange={setUrgencyFilter}
        onStatusChange={setStatusFilter}
      />

      {/* 任务列表表格 */}
      <TempTaskTable
        tasks={filteredTasks}
        onViewTask={openDetailModal}
        onEditTask={openEditModal}
        onStartTask={handleStartTask}
        onCompleteTask={handleCompleteTask}
        pagination={{
          currentPage,
          pageSize,
          total: filteredTasks.length,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
      />

      {/* 详情弹窗 */}
      <TempTaskDetailModal
        task={selectedTask}
        onClose={closeDetailModal}
        onStartTask={handleStartTask}
        onCompleteTask={handleCompleteTask}
      />

      {/* 创建/编辑表单弹窗 */}
      <TempTaskFormModal
        isOpen={isFormModalOpen}
        title={editingTask ? '编辑临时任务' : '新建临时任务'}
        task={editingTask}
        formData={formData}
        errors={errors}
        workerUsers={users.map(u => ({ id: u.id, name: u.name }))}
        onClose={closeFormModal}
        onSubmit={handleFormSubmit}
        onChange={updateFormData}
      />
    </div>
  );
}

export default TempTaskPage;
