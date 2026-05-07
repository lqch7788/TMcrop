import { useCallback } from 'react';
import { Task } from '../../../types';

interface UseTaskExportProps {
  tasks: Task[];
}

export function useTaskExport({ tasks }: UseTaskExportProps) {
  const exportToExcel = useCallback((filteredTasks: Task[]) => {
    // 简单的CSV导出实现
    const headers = [
      '任务编号',
      '任务标题',
      '任务类型',
      '作业区域',
      '批次',
      '执行人',
      '派单人',
      '截止时间',
      '预计工时',
      '优先级',
      '状态',
      '任务模式',
      '描述',
    ];

    const csvContent = [
      headers.join(','),
      ...filteredTasks.map(task => [
        task.taskCode,
        task.title,
        task.typeName,
        task.greenhouseName,
        task.batchCode,
        task.assigneeName,
        task.assignerName,
        task.dueDate,
        task.workDuration,
        task.priority === 'high' ? '紧急' : task.priority === 'medium' ? '重要' : '一般',
        task.status === 'pending' ? '待执行' : task.status === 'in_progress' ? '进行中' : task.status === 'completed' ? '已完成' : '已取消',
        task.mode === 'glass' ? '玻璃温室' : task.mode === 'solar' ? '日光温室' : '大田',
        task.description,
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `任务工单_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const exportSelectedTasks = useCallback((selectedTaskIds: string[]) => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    exportToExcel(selectedTasks);
  }, [tasks, exportToExcel]);

  return {
    exportToExcel,
    exportSelectedTasks,
  };
}

export default useTaskExport;
