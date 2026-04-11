/**
 * 我的任务页面
 * 员工查看自己被分派的任务，并完成任务
 */

import { useState, useEffect, useMemo } from 'react';
import { Eye, CheckCircle, Download } from 'lucide-react';
import { Task } from '../../../types';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';
import { TaskStatusBadge } from '../tasks/TaskStatusBadge';
import { TaskPriorityBadge } from '../tasks/TaskPriorityBadge';
import { TaskModeBadge } from '../tasks/TaskModeBadge';

// 模拟任务数据（分配给陆启闯的任务）
const INITIAL_MY_TASKS: Task[] = [
  {
    id: 'MYTASK-001',
    taskCode: 'TK20260408-001',
    title: '【问题处理】番茄叶片发黄，可能是缺氮肥',
    type: 'scouting',
    typeName: '问题处理',
    priority: 'high',
    status: 'pending',
    batchId: '',
    batchCode: '',
    greenhouseId: 'G001',
    greenhouseName: '玻璃温室A区',
    mode: 'glass',
    assigneeId: 'U001',
    assigneeName: '陆启闯',
    assignerId: 'U002',
    assignerName: '李明辉',
    dueDate: '2026-04-12',
    workDuration: 2,
    requiredMaterials: [],
    description: '问题描述：部分叶片发黄，可能是缺氮肥\n严重程度：严重\n巡检时间：2026-04-08 09:00\n温室：玻璃温室A区\n作物：番茄',
    actualWorkload: 0,
    sourceProblemId: 1,
  },
  {
    id: 'MYTASK-002',
    taskCode: 'TK20260409-002',
    title: '【问题处理】黄瓜叶片发现少量蚜虫',
    type: 'spraying',
    typeName: '问题处理',
    priority: 'medium',
    status: 'pending',
    batchId: '',
    batchCode: '',
    greenhouseId: 'G002',
    greenhouseName: '日光温室1号',
    mode: 'solar',
    assigneeId: 'U001',
    assigneeName: '陆启闯',
    assignerId: 'U003',
    assignerName: '王建国',
    dueDate: '2026-04-14',
    workDuration: 1.5,
    requiredMaterials: [],
    description: '问题描述：黄瓜叶片发现少量蚜虫\n严重程度：轻微\n巡检时间：2026-04-09 14:00\n温室：日光温室1号\n作物：黄瓜',
    actualWorkload: 0,
    sourceProblemId: 2,
  },
  {
    id: 'MYTASK-003',
    taskCode: 'TK20260410-003',
    title: '【例行巡田】玻璃温室A区番茄生长检查',
    type: 'scouting',
    typeName: '巡田',
    priority: 'medium',
    status: 'in_progress',
    batchId: 'B001',
    batchCode: 'FQ2026-001',
    greenhouseId: 'G001',
    greenhouseName: '玻璃温室A区',
    mode: 'glass',
    assigneeId: 'U001',
    assigneeName: '陆启闯',
    assignerId: 'U002',
    assignerName: '李明辉',
    dueDate: '2026-04-10',
    workDuration: 1,
    requiredMaterials: [],
    description: '对玻璃温室A区的番茄进行例行生长检查，记录株高、叶片数，病虫害情况',
    actualWorkload: 0,
  },
  {
    id: 'MYTASK-004',
    taskCode: 'TK20260410-004',
    title: '【采收任务】日光温室2号草莓采收',
    type: 'harvest',
    typeName: '采收',
    priority: 'high',
    status: 'pending',
    batchId: 'B003',
    batchCode: 'FQ2026-003',
    greenhouseId: 'G003',
    greenhouseName: '日光温室2号',
    mode: 'solar',
    assigneeId: 'U001',
    assigneeName: '陆启闯',
    assignerId: 'U003',
    assignerName: '王建国',
    dueDate: '2026-04-11',
    workDuration: 3,
    requiredMaterials: [],
    description: '日光温室2号草莓已达采收标准，预计产量200公斤，需按时完成采收',
    actualWorkload: 0,
  },
  {
    id: 'MYTASK-005',
    taskCode: 'TK20260409-005',
    title: '【浇水任务】大田A区小麦灌溉',
    type: 'irrigation',
    typeName: '浇水',
    priority: 'low',
    status: 'completed',
    batchId: 'B005',
    batchCode: 'FQ2026-005',
    greenhouseId: 'G011',
    greenhouseName: '大田A区',
    mode: 'field',
    assigneeId: 'U001',
    assigneeName: '陆启闯',
    assignerId: 'U004',
    assignerName: '赵文静',
    dueDate: '2026-04-09',
    workDuration: 2,
    requiredMaterials: [],
    description: '大田A区小麦需要灌溉，保持土壤湿润',
    actualWorkload: 2,
  },
  {
    id: 'MYTASK-006',
    taskCode: 'TK20260407-006',
    title: '【施肥任务】玻璃温室B区番茄追肥',
    type: 'fertilization',
    typeName: '施肥',
    priority: 'medium',
    status: 'completed',
    batchId: 'B002',
    batchCode: 'FQ2026-002',
    greenhouseId: 'G002',
    greenhouseName: '玻璃温室B区',
    mode: 'glass',
    assigneeId: 'U001',
    assigneeName: '陆启闯',
    assignerId: 'U002',
    assignerName: '李明辉',
    dueDate: '2026-04-07',
    workDuration: 1.5,
    requiredMaterials: [{ materialId: 'MT001', materialName: '水溶肥', requiredQuantity: 5, unit: '袋' }],
    description: '玻璃温室B区番茄进入结果期，需要追施高钾复合肥',
    actualWorkload: 1.5,
  },
];

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

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">选择导出格式</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">×</button>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">已选择 {selectedCount} 条数据</p>
            <div className="space-y-3">
              {exportFormats.map((format) => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    exportFormat === format.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => onFormatChange(e.target.value)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                  />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    <p className="text-xs text-gray-500">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="h-10 px-6 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">取消</button>
            <button onClick={onConfirm} className="h-10 px-6 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">导出</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyTasksPage() {
  // 从 localStorage 读取任务
  const [tasks, setTasks] = useLocalStorage<Task[]>(STORAGE_KEYS.TASKS, []);

  // 获取当前用户名
  const currentUserName = localStorage.getItem('username') || '陆启闯';

  // 问题更新 hook
  const { updateProblem } = usePersistentProblems();

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  // 初始化模拟数据（仅在没有数据时）
  useEffect(() => {
    if (tasks.length === 0) {
      setTasks(INITIAL_MY_TASKS);
    }
  }, [tasks.length, setTasks]);

  // 筛选当前用户的任务
  const myTasks = useMemo(() => {
    return tasks.filter(task => task.assigneeName === currentUserName);
  }, [tasks, currentUserName]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(myTasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, myTasks.length);
  const paginatedTasks = myTasks.slice(startIndex, endIndex);

  // 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 打开详情弹窗
  const openDetailModal = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  // 确认完成
  const handleConfirmComplete = (task: Task) => {
    // 更新任务状态
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: 'completed' as const }
        : t
    ));

    // 如果是问题来源的任务，自动更新问题的处理结果
    if (task.sourceProblemId) {
      updateProblem(task.sourceProblemId, {
        status: '已处理',
        handleDate: new Date().toISOString().slice(0, 10),
        handleResult: `任务已完成：${task.title}`,
      });
    }

    closeDetailModal();
  };

  // 导出相关操作
  const handleExportClick = () => {
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === myTasks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(myTasks.map(t => t.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  const handleDoExport = () => {
    const selectedData = myTasks.filter(t => selectedRows.includes(t.id));
    const headers = ['任务编号', '任务标题', '任务类型', '作业区域', '执行人', '派单人', '截止日期', '优先级', '状态'];
    const exportData = selectedData.map(row => ({
      '任务编号': row.taskCode,
      '任务标题': row.title,
      '任务类型': row.typeName,
      '作业区域': row.greenhouseName,
      '执行人': row.assigneeName,
      '派单人': row.assignerName,
      '截止日期': row.dueDate,
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

    const fileName = `我的任务_${new Date().toISOString().slice(0, 10)}.${extension}`;
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

  const allSelected = selectedRows.length === myTasks.length && myTasks.length > 0;

  return (
    <div className="space-y-4">
      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-800">我的任务</div>
            <div className="text-sm text-blue-600 mt-1">
              这里显示所有分配给您的任务。完成任务后，问题状态会自动更新。
            </div>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">我的任务列表</h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportClick}
              className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
              <tr>
                {exportMode && (
                  <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务编号</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务标题</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">类型备注</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作业区域</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物备注</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">执行人</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划开始</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划结束</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">预计天数</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">预计小时</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">工作制</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">所需物资</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">所需工具</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-300">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={exportMode ? 19 : 18} className="px-4 py-12 text-center text-gray-400">
                    暂无任务
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-blue-100 transition-colors">
                    {exportMode && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(task.id)}
                          onChange={() => handleSelectRow(task.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{task.taskCode}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-start gap-2">
                        <TaskModeBadge mode={task.mode} />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{task.typeName}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{(task as any).typeRemarks || '-'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{task.greenhouseName}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{(task as any).crop || '-'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{(task as any).cropRemarks || '-'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                          {task.assigneeName.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700">{task.assigneeName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{(task as any).planStart || '-'}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        {task.dueDate}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{(task as any).estimatedDays || 0}天</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{(task as any).estimatedHours || task.workDuration}小时</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{(task as any).workHoursPerDay || 8}时/天</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <TaskPriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {(task as any).materials?.length > 0
                          ? (task as any).materials.map((m: any) => m.name).join(', ')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {(task as any).tools?.length > 0
                          ? (task as any).tools.map((t: any) => t.name).join(', ')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openDetailModal(task)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => setCurrentPage(1)}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {myTasks.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 导出操作按钮栏 */}
      {exportMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center gap-4 z-40">
          <span className="text-sm text-gray-600">
            已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmExport}
              disabled={selectedRows.length === 0}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              确认导出
            </button>
            <button
              onClick={handleCancelExport}
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">任务详情</h3>
              <button
                onClick={closeDetailModal}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-6">
                {/* 任务编号 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务编号</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.taskCode}</p>
                </div>

                {/* 任务类型 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务类型</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.typeName}</p>
                </div>

                {/* 任务标题 */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务标题</label>
                  <div className="flex items-center gap-2 mt-1">
                    <TaskModeBadge mode={selectedTask.mode} />
                    <p className="text-sm font-medium text-gray-900">{selectedTask.title}</p>
                  </div>
                </div>

                {/* 作业区域 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">作业区域</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.greenhouseName}</p>
                </div>

                {/* 执行人 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">执行人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.assigneeName}</p>
                </div>

                {/* 派单人 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">派单人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.assignerName}</p>
                </div>

                {/* 截止时间 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">截止时间</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.dueDate}</p>
                </div>

                {/* 优先级 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">优先级</label>
                  <div className="mt-1">
                    <TaskPriorityBadge priority={selectedTask.priority} />
                  </div>
                </div>

                {/* 状态 */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">状态</label>
                  <div className="mt-1">
                    <TaskStatusBadge status={selectedTask.status} />
                  </div>
                </div>

                {/* 任务描述 */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务描述</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedTask.description || '-'}</p>
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                关闭
              </button>
              {selectedTask.status !== 'completed' && (
                <button
                  onClick={() => handleConfirmComplete(selectedTask)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  确认完成
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedRows.length}
        onFormatChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleDoExport}
      />
    </div>
  );
}

export default MyTasksPage;
