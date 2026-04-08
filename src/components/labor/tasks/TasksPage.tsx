import { useState } from 'react';
import { Plus, ClipboardCheck } from 'lucide-react';
import { tasks as initialTasks, greenhouses, cropBatches, users } from '../../../data/mockData';
import { Task } from '../../../types';
import { TasksFilters } from './TasksFilters';
import { TasksTable } from './TasksTable';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskFormModal } from './TaskFormModal';
import { useTasksFilters } from './hooks/useTasksFilters';
import { useTaskForm } from './hooks/useTaskForm';

export function TasksPage() {
  const [taskList, setTaskList] = useState<Task[]>([...initialTasks]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 创建/编辑弹窗状态
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // 先定义 closeFormModal，让 hook 可以引用
  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingTask(null);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  // 使用筛选hook
  const {
    filters,
    filteredTasks,
    setSearchTerm,
    setTypeFilter,
    setStatusFilter,
    setModeFilter,
  } = useTasksFilters({ tasks: taskList });

  // 使用表单hook - 注意：不传onCancel避免循环依赖
  const {
    formData,
    errors,
    taskTypes,
    filteredGreenhouses,
    filteredBatches,
    workerUsers,
    updateFormData,
    handleSubmit: handleFormSubmit,
    handleReset,
    generateTaskCode,
  } = useTaskForm({
    mode: editingTask ? 'edit' : 'create',
    initialData: editingTask || undefined,
    greenhouses,
    cropBatches,
    users,
    onSubmit: (task) => {
      if (editingTask) {
        setTaskList(prev => prev.map(t => t.id === task.id ? task : t));
      } else {
        setTaskList(prev => [task, ...prev]);
      }
      closeFormModal();
    },
  });

  // 打开详情弹窗
  const openDetailModal = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  // 打开创建弹窗
  const openCreateModal = () => {
    setEditingTask(null);
    setIsFormModalOpen(true);
  };

  // 打开编辑弹窗
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsFormModalOpen(true);
  };

  // 处理表单提交
  const handleFormSubmitWrapper = () => {
    handleFormSubmit();
  };

  // 删除任务
  const handleDeleteTask = (task: Task) => {
    if (window.confirm(`确定要删除任务 "${task.title}" 吗？`)) {
      setTaskList(prev => prev.filter(t => t.id !== task.id));
    }
  };

  // 确认完成
  const handleConfirmComplete = (task: Task) => {
    setTaskList(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: 'completed' as const }
        : t
    ));
    closeDetailModal();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">任务工单管理</h1>
              <p className="text-xs text-gray-500">管理农事任务派发、执行和验收</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            创建
          </button>
        </div>
      </div>

      {/* 筛选组件 */}
      <TasksFilters
        searchTerm={filters.searchTerm}
        typeFilter={filters.typeFilter}
        statusFilter={filters.statusFilter}
        modeFilter={filters.modeFilter}
        onSearchChange={setSearchTerm}
        onTypeChange={setTypeFilter}
        onStatusChange={setStatusFilter}
        onModeChange={setModeFilter}
      />

      {/* 任务列表表格 */}
      <TasksTable
        tasks={filteredTasks}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onViewTask={openDetailModal}
        onEditTask={openEditModal}
        onDeleteTask={handleDeleteTask}
      />

      {/* 详情弹窗 */}
      <TaskDetailModal
        task={selectedTask}
        onClose={closeDetailModal}
        onConfirmComplete={handleConfirmComplete}
      />

      {/* 创建/编辑表单弹窗 */}
      <TaskFormModal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        onSubmit={handleFormSubmitWrapper}
        title={editingTask ? '编辑任务' : '创建任务'}
        formData={formData}
        errors={errors}
        taskTypes={taskTypes}
        filteredGreenhouses={filteredGreenhouses}
        filteredBatches={filteredBatches}
        workerUsers={workerUsers}
        onFormChange={updateFormData}
      />
    </div>
  );
}

export default TasksPage;
