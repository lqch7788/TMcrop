import { useState, useEffect } from 'react';
import { ClipboardCheck, Download, Edit2, Eye, Plus, Trash2, X } from 'lucide-react';
import { useUserStore, useGreenhouseStore, useProductionPlanStore } from '../../../stores';
import { Task } from '../../../types';
import { TasksFilters } from './TasksFilters';
import { TasksTable } from './TasksTable';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskFormModal } from './TaskFormModal';
import { BatchEditModal } from './BatchEditModal';
import { useTasksFilters } from './hooks/useTasksFilters';
import { useTaskForm } from './hooks/useTaskForm';
import { useTasks } from '../../../hooks/useTasks';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { todayLocal } from '../../../lib/dateUtils';
import { Label } from '@/components/ui';
import { showAlert, showConfirm } from '@/lib/dialogService';

// 导出格式弹窗
interface ExportFormatModalProps {
  isOpen: boolean;
  exportFormat: string;
  selectedCount: number;
  onFormatChange: (format: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ExportFormatModal({ isOpen, exportFormat, selectedCount, onFormatChange, onClose, onConfirm }: ExportFormatModalProps) {
  if (!isOpen) return null;

  const exportFormats = [
    { value: 'excel', label: 'Excel (.xlsx)', desc: '适用于数据分析和处理' },
    { value: 'csv', label: 'CSV (.csv)', desc: '适用于数据交换' },
    { value: 'word', label: 'Word (.docx)', desc: '适用于文档编辑和分享' },
  ];

  const content = (
    <>
      <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
      <div className="space-y-3">
        {exportFormats.map((format) => (
          <Label
            key={format.value}
            onClick={() => onFormatChange(format.value)}
            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
              exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${exportFormat === format.value ? 'border-emerald-600' : 'border-gray-400'}`}>
              {exportFormat === format.value && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{format.label}</p>
              <p className="text-xs text-gray-500">{format.desc}</p>
            </div>
          </Label>
        ))}
      </div>
    </>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button onClick={onConfirm}><Download className="w-4 h-4" /> 导出</Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="选择导出格式"
      size="md"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}

// 删除确认弹窗
interface DeleteWarningModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteWarningModal({ isOpen, selectedCount, onClose, onConfirm }: DeleteWarningModalProps) {
  if (!isOpen) return null;

  const content = (
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <Trash2 className="w-6 h-6 text-red-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">删除任务警告</h3>
      </div>
      <div className="text-sm text-gray-600 space-y-3 mb-6">
        <p>确定要删除选中的 <strong>{selectedCount}</strong> 个任务吗？</p>
        <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button variant="destructive" onClick={onConfirm}><Trash2 className="w-4 h-4" /> 确认删除</Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="删除任务警告"
      size="sm"
      showFooter={true}
      footer={footer}
    >
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">删除任务警告</h3>
          </div>
        </div>
        <div className="text-sm text-gray-600 space-y-3">
          <p>确定要删除选中的 <strong>{selectedCount}</strong> 个任务吗？</p>
          <p>此操作 <strong className="text-red-600">无法恢复</strong>，删除后数据将永久丢失。</p>
        </div>
      </div>
    </UnifiedModal>
  );
}

export function TasksPage() {
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);
  const cropBatches = useProductionPlanStore((state) => state.batches);
  const fetchPlans = useProductionPlanStore((state) => state.fetchPlans);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
    if (cropBatches.length === 0) {
      fetchPlans();
    }
  }, [users.length, loadUsers, greenhouses.length, loadGreenhouses, cropBatches.length, fetchPlans]);

  // 使用统一任务管理 Hook
  const { tasks, addTask, updateTask, deleteTask, updateTaskStatus } = useTasks();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 批量操作状态
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 问题记录更新
  const { updateProblem } = usePersistentProblems();

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
  } = useTasksFilters({ tasks });

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
        updateTask(task.id, task);
      } else {
        addTask(task);
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
  const handleDeleteTask = async (task: Task) => {
    if (await showConfirm(`确定要删除任务 "${task.title}" 吗？`)) {
      deleteTask(task.id);
    }
  };

  // 确认完成
  const handleConfirmComplete = (task: Task) => {
    updateTaskStatus(task.id, 'completed');

    // 如果是问题来源的任务，自动更新问题的处理结果
    if ((task as any).sourceProblemId) {
      updateProblem((task as any).sourceProblemId, {
        status: '已处理',
        handleDate: todayLocal(),
        handleResult: `任务已完成：${task.title}`,
      });
    }

    closeDetailModal();
  };

  // 批量选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === filteredTasks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredTasks.map(t => t.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 批量删除
  const handleBatchDelete = () => {
    setBatchDeleteMode(false);
    setShowDeleteWarning(true);
  };

  const handleDeleteConfirm = () => {
    selectedRows.forEach(id => deleteTask(id));
    setSelectedRows([]);
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
  };

  // 批量编辑确认
  const handleBatchEditConfirm = (editedTasks: Record<string, Partial<Task>>) => {
    if (Object.keys(editedTasks).length === 0) return;
    Object.entries(editedTasks).forEach(([taskCode, updates]) => {
      const task = tasks.find(t => t.taskCode === taskCode);
      if (task) {
        updateTask(task.id, updates);
      }
    });
    setSelectedRows([]);
    setBatchEditMode(false);
  };

  // 导出
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = tasks.filter(t => selectedRows.includes(t.id));
    const headers = ['任务编号', '任务标题', '任务类型', '作业区域', '执行人', '计划开始', '计划结束', '优先级', '状态'];
    const exportData = selectedData.map(row => ({
      '任务编号': row.taskCode,
      '任务标题': row.title,
      '任务类型': row.typeName,
      '作业区域': row.greenhouseName,
      '执行人': row.assigneeName,
      '计划开始': (row as any).planStart || '-',
      '计划结束': row.dueDate,
      '优先级': row.priority,
      '状态': row.status,
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h as keyof typeof row] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h as keyof typeof row] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `任务工单_${todayLocal()}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  // 取消批量操作
  const handleCancelBatch = () => {
    setBatchEditMode(false);
    setBatchDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">任务工单管理</h1>
              <p className="text-gray-500">管理农事任务派发、执行和验收</p>
            </div>
          </div>
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">任务列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowExportModal(true)}
                disabled={selectedRows.length === 0}
                size="sm"
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelExport}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : batchEditMode ? (
            <div className="flex gap-2">
              <Button
                variant="blue"
                size="sm"
                onClick={() => setShowBatchEditModal(true)}
                disabled={selectedRows.length === 0}
              >
                <Edit2 className="w-4 h-4" />
                批量编辑
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelBatch}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : batchDeleteMode ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelBatch}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={openCreateModal}
              >
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button
                variant="blue"
                size="sm"
                onClick={() => {
                  setBatchEditMode(true);
                  setSelectedRows([]);
                }}
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setBatchDeleteMode(true);
                  setSelectedRows([]);
                }}
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
              <Button
                size="sm"
                onClick={handleExportClick}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            </div>
          )}
        </div>

        <TasksTable
          tasks={filteredTasks}
          currentPage={currentPage}
          pageSize={pageSize}
          showCheckbox={exportMode || batchEditMode || batchDeleteMode}
          exportMode={exportMode}
          batchEditMode={batchEditMode}
          batchDeleteMode={batchDeleteMode}
          selectedRows={selectedRows}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onViewTask={openDetailModal}
          onEditTask={openEditModal}
          onDeleteTask={handleDeleteTask}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
        />
      </div>

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

      {/* 删除确认弹窗 */}
      <DeleteWarningModal
        isOpen={showDeleteWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />

      {/* 批量编辑弹窗 */}
      <BatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        tasks={tasks}
        users={users.map(u => ({ id: u.id, name: u.name }))}
        greenhouses={greenhouses.map(g => ({ id: g.id, name: g.name }))}
        onClose={() => setShowBatchEditModal(false)}
        onConfirm={handleBatchEditConfirm}
      />
    </div>
  );
}

export default TasksPage;
