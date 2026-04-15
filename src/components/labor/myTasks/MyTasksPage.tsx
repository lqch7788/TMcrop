/**
 * 我的任务页面
 * 员工查看自己被分派的任务，并完成任务
 */

import { useState, useEffect, useMemo } from 'react';
import { Edit, FileText, CheckCircle, XCircle, Play, Upload, Eye, Clock } from 'lucide-react';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { Modal } from '../../ui/Modal';
import { TaskTypeConfigDisplay } from '../../farm/taskDispatch/components/TaskTypeConfigDisplay';
import { taskDispatchTasks, TaskDispatchTask } from '../../../data/farmMockData';
import { useProblemDispatch } from '../../../hooks/useProblemDispatch';
import { TaskFlowTimeline } from '../../common/TaskFlowTimeline';
import { usePersistentProblems } from '../../../hooks/usePersistentProblems';

// 任务类型定义
const taskTypes = [
  { value: 'fertilization', label: '施肥', color: 'bg-green-500' },
  { value: 'irrigation', label: '灌溉', color: 'bg-blue-500' },
  { value: 'pruning', label: '修剪', color: 'bg-purple-500' },
  { value: 'pesticide', label: '植保', color: 'bg-red-500' },
  { value: 'rootIrrigation', label: '灌根', color: 'bg-cyan-500' },
  { value: 'planting', label: '定植', color: 'bg-lime-500' },
  { value: 'harvest', label: '采收', color: 'bg-orange-500' },
  { value: 'weeding', label: '除草', color: 'bg-emerald-500' },
  { value: 'other', label: '其他', color: 'bg-gray-500' },
];

// 状态映射（扩展支持问题处理流程）
const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'bg-gray-100', color: 'text-gray-600', label: '待接受' },
  accepted: { bg: 'bg-blue-100', color: 'text-blue-600', label: '已接受' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-600', label: '进行中' },
  completed: { bg: 'bg-green-100', color: 'text-green-600', label: '已完成' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待验收' },
  rejected: { bg: 'bg-red-100', color: 'text-red-600', label: '已拒绝' },
};

// 优先级映射
const priorityMap: Record<string, { color: string; label: string }> = {
  urgent: { color: 'text-red-500', label: '紧急' },
  high: { color: 'text-orange-500', label: '高' },
  medium: { color: 'text-yellow-500', label: '中' },
  low: { color: 'text-green-500', label: '低' },
  normal: { color: 'text-gray-500', label: '普通' },
};

// 获取任务类型颜色
const getTypeColor = (type: string): string => {
  const taskType = taskTypes.find(t => t.value === type);
  return taskType?.color || 'bg-gray-500';
};

// 获取任务类型标签
const getTypeLabel = (type: string): string => {
  const taskType = taskTypes.find(t => t.value === type);
  return taskType?.label || type;
};

export function MyTasksPage() {
  // 从 localStorage 读取任务（用于进度更新等操作）
  // 注意：问题分派的任务存储在 TASKS key 下
  const [tasks, setTasks] = useLocalStorage<TaskDispatchTask[]>(STORAGE_KEYS.TASKS, []);

  // 获取当前用户名（原型阶段默认使用陆启闯）
  const currentUserName = localStorage.getItem('username') || '陆启闯';

  // 使用任务数据（优先从 localStorage 读取，如果没有则使用 taskDispatchTasks）
  const myTasks = tasks.length > 0 ? tasks : taskDispatchTasks;

  // 任务筛选状态：全部 / 问题处理 / 生产任务
  const [taskFilter, setTaskFilter] = useState<'all' | 'problem' | 'production'>('all');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 初始化数据到 localStorage
  useEffect(() => {
    // 如果 localStorage 为空，则使用 taskDispatchTasks 初始化
    if (tasks.length === 0) {
      setTasks(taskDispatchTasks);
    }
  }, [tasks.length, setTasks]);

  // 监听 localStorage 变化（其他页面更新后同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.TASKS && e.newValue) {
        try {
          const newTasks = JSON.parse(e.newValue);
          // 强制更新组件状态
          setTasks(newTasks);
        } catch (err) {
          console.warn('Failed to parse tasks from storage:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setTasks]);

  // 根据筛选过滤任务
  const filteredTasks = useMemo(() => {
    switch (taskFilter) {
      case 'problem':
        // 问题处理任务：有 sourceProblemId 的任务
        return myTasks.filter(task => task.sourceProblemId !== undefined);
      case 'production':
        // 生产任务：没有 sourceProblemId 的任务
        return myTasks.filter(task => !task.sourceProblemId);
      default:
        return myTasks;
    }
  }, [myTasks, taskFilter]);

  // 计算分页
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTasks.length);
  const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

  // 统计各类型任务数量
  const taskCounts = useMemo(() => ({
    all: myTasks.length,
    problem: myTasks.filter(t => t.sourceProblemId !== undefined).length,
    production: myTasks.filter(t => !t.sourceProblemId).length,
  }), [myTasks]);

  // 详情弹窗状态
  const [selectedTask, setSelectedTask] = useState<TaskDispatchTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);
  const [selectedSopTask, setSelectedSopTask] = useState<TaskDispatchTask | null>(null);

  // 详情弹窗引用（用于传递正确的数据）
  const openDetailModal = (task: TaskDispatchTask) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  // 使用 useProblemDispatch 获取流转方法
  const { acceptProblem, rejectProblem, submitProblemFeedback, addProgressRecord, approveProblemCompletion, getProblemFlowRecords } = useProblemDispatch();
  const { problems } = usePersistentProblems();

  // 反馈表单状态
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    task: TaskDispatchTask | null;
  }>({ isOpen: false, task: null });

  const [feedbackForm, setFeedbackForm] = useState({
    resultText: '',
    progressText: '',
    workloadDays: '',
    workloadHours: '',
    photosBefore: [] as string[],
    photosAfter: [] as string[],
  });

  // 拒绝原因弹窗
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    task: TaskDispatchTask | null;
  }>({ isOpen: false, task: null });

  const [rejectReason, setRejectReason] = useState('');

  // 处理接单
  const handleAccept = (task: TaskDispatchTask) => {
    if (task.sourceProblemId) {
      acceptProblem(task.sourceProblemId, 'U013', '陆启闯');
    }
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'accepted' } : t
    ));
    setShowDetailModal(false);
  };

  // 打开拒绝弹窗
  const openRejectModal = (task: TaskDispatchTask) => {
    setRejectModal({ isOpen: true, task });
    setRejectReason('');
  };

  // 处理拒绝
  const handleReject = () => {
    if (!rejectModal.task || !rejectReason.trim()) return;
    const task = rejectModal.task;
    if (task.sourceProblemId) {
      rejectProblem(task.sourceProblemId, 'U013', '陆启闯', rejectReason);
    }
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setRejectModal({ isOpen: false, task: null });
    setRejectReason('');
    setShowDetailModal(false);
  };

  // 开始处理
  const handleStartProcessing = (task: TaskDispatchTask) => {
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'in_progress' } : t
    ));
    setShowDetailModal(false);
  };

  // 打开反馈弹窗
  const openFeedbackModal = (task: TaskDispatchTask) => {
    setFeedbackModal({ isOpen: true, task });
    setFeedbackForm({
      resultText: '',
      actualWorkload: '',
      photosBefore: [],
      photosAfter: [],
    });
    setShowDetailModal(false);
  };

  // 提交反馈
  const handleSubmitFeedback = () => {
    if (!feedbackModal.task) return;
    const task = feedbackModal.task;
    if (task.sourceProblemId) {
      // 先记录进度流转
      addProgressRecord(task.sourceProblemId, 'U013', '陆启闯', task.progress || 0, feedbackForm.resultText);
      // 进度100%时提交验收，否则只是进度反馈
      if (task.progress === 100) {
        submitProblemFeedback(task.sourceProblemId, 'U013', '陆启闯', {
          resultText: feedbackForm.resultText,
          actualWorkload: feedbackForm.workloadDays || feedbackForm.workloadHours
            ? (parseFloat(feedbackForm.workloadDays || '0') * 24 + parseFloat(feedbackForm.workloadHours || '0'))
            : undefined,
        });
      }
    }
    // 进度100%时进入待验收，否则继续进行中
    const newStatus = task.progress === 100 ? 'waiting_acceptance' : 'in_progress';
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: newStatus, progress: task.progress } : t
    ));
    setFeedbackModal({ isOpen: false, task: null });
  };

  // 获取当前任务关联的问题流转记录
  const getCurrentProblemFlowRecords = () => {
    if (!selectedTask?.sourceProblemId) return [];
    return getProblemFlowRecords(selectedTask.sourceProblemId);
  };

  // 打开SOP弹窗
  const openSopModal = (task: TaskDispatchTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSopTask(task);
    setShowSopModal(true);
  };

  // 更新任务进度
  const handleProgressChange = (taskId: string, progress: number) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, progress } : t
    ));
    // 更新当前选中的任务显示
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, progress } : null);
    }
    // 注意：进度100%时不自动改变状态，用户需要通过提交反馈来确认完成
  };

  // 确认完成
  const handleConfirmComplete = (task: TaskDispatchTask) => {
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t
    ));
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  // 渲染任务类型单元格
  const renderTypeCell = (task: TaskDispatchTask) => {
    const types = task.types || [];
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {types.slice(0, 2).map((typeValue: string, idx: number) => {
          const typeLabel = getTypeLabel(typeValue);
          return typeLabel === '其他' ? (
            <span key={idx} className="text-orange-500 text-xs">其他</span>
          ) : (
            <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
              {typeLabel}
            </span>
          );
        })}
        {types.length > 2 && (
          <span className="text-xs text-gray-500">+{types.length - 2}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-800">我的任务</div>
            <div className="text-sm text-blue-600 mt-1">
              这里显示所有分配给您的任务。完成任务后，可通过进度滑块更新任务进度。
            </div>
          </div>
        </div>
      </div>

      {/* 任务类型标签页筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setTaskFilter('all'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'all'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            全部任务
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
              {taskCounts.all}
            </span>
          </button>
          <button
            onClick={() => { setTaskFilter('problem'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'problem'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            问题处理
            <span className="px-2 py-0.5 bg-orange-200 text-orange-600 rounded-full text-xs">
              {taskCounts.problem}
            </span>
          </button>
          <button
            onClick={() => { setTaskFilter('production'); setCurrentPage(1); }}
            className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              taskFilter === 'production'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            生产任务
            <span className="px-2 py-0.5 bg-blue-200 text-blue-600 rounded-full text-xs">
              {taskCounts.production}
            </span>
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务ID</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务区域</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划开始</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划结束</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务工时</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">进度</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">备注</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作业标准</th>
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-gray-400">
                    暂无任务
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const types = task.types || [];
                  return (
                    <tr key={task.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
                        <button
                          onClick={() => openDetailModal(task)}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          title="点击查看详情"
                        >
                          {task.id}
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {renderTypeCell(task)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {task.field || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {task.crop || '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">陆启闯</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {task.planStart?.split(' ')[0] || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {task.planEnd || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {((task.estimatedDays || 0) * 8 + (task.estimatedHours || 0)) || 0}小时
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : (task.progress || 0) > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{task.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium ${priorityMap[task.priority]?.color || 'text-gray-500'}`}>
                          {priorityMap[task.priority]?.label || task.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[task.status]?.bg || 'bg-gray-100'} ${statusMap[task.status]?.color || 'text-gray-600'}`}>
                          {statusMap[task.status]?.label || task.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={task.typeLabel || '-'}>
                        {task.typeLabel || '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {types.length >= 2 && task.sopContent ? (
                          <button
                            onClick={(e) => openSopModal(task, e)}
                            className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            SOP文件
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {task.status === 'pending' && (
                          // 待接受状态：显示接受和拒绝按钮
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAccept(task)}
                              className="flex items-center gap-1 px-2 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
                              title="接受任务"
                            >
                              <CheckCircle className="w-3 h-3" />
                              接受
                            </button>
                            <button
                              onClick={() => openRejectModal(task)}
                              className="flex items-center gap-1 px-2 py-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
                              title="拒绝任务"
                            >
                              <XCircle className="w-3 h-3" />
                              拒绝
                            </button>
                          </div>
                        )}
                        {(task.status === 'accepted' || task.status === 'in_progress') && (
                          // 已接受/进行中状态：显示提交进度按钮
                          <button
                            onClick={() => openFeedbackModal(task)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                            title="点击提交进度"
                          >
                            <Edit className="w-4 h-4" />
                            提交进度
                          </button>
                        )}
                        {(task.status === 'waiting_acceptance' || task.status === 'completed' || task.status === 'rejected') && (
                          // 待验收/已完成/已拒绝状态：只显示查看详情按钮
                          <button
                            onClick={() => openDetailModal(task)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
                            title="点击查看详情"
                          >
                            <Eye className="w-4 h-4" />
                            查看
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {filteredTasks.length} 条</span>
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

      {/* 详情弹窗 */}
      <Modal
        isOpen={showDetailModal && !!selectedTask}
        onClose={() => { setShowDetailModal(false); setSelectedTask(null); }}
        title={`任务详情 - ${selectedTask?.id || ''}`}
        size="xl"
        showFooter={false}
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">任务区域</label>
                  <p className="font-semibold text-gray-900">{selectedTask.field || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">作物</label>
                  <p className="font-semibold text-gray-900">{selectedTask.crop || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">负责人</label>
                  <p className="font-semibold text-gray-900">陆启闯</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">优先级</label>
                  <p className={`font-semibold ${priorityMap[selectedTask.priority]?.color || ''}`}>
                    {priorityMap[selectedTask.priority]?.label || selectedTask.priority}
                  </p>
                </div>
              </div>
            </div>

            {/* 任务类型 - 单一类型显示详细信息，多类型显示SOP下载 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">任务类型配置</h4>
              {(selectedTask.types || []).length === 1 ? (
                <TaskTypeConfigDisplay
                  taskType={selectedTask.types[0]}
                  configValues={selectedTask.typeConfig || {}}
                />
              ) : (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">作业标准文件</span>
                  </div>
                  {selectedTask.sopContent ? (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <p className="text-sm text-gray-600 mb-2">已导入SOP文档</p>
                      <button
                        onClick={() => {
                          const blob = new Blob([selectedTask.sopContent || ''], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `任务SOP_${selectedTask.id}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        下载SOP文件
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">暂无SOP文件</p>
                  )}
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">已选择的操作类型：</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedTask.types || []).map((t: string) => {
                        return (
                          <span
                            key={t}
                            className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(t)}`}
                          >
                            {getTypeLabel(t)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 所需物资 */}
            {selectedTask.materials && selectedTask.materials.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">所需物资</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                        <th className="text-left pb-2">物资名称</th>
                        <th className="text-right pb-2">数量</th>
                        <th className="text-right pb-2">单位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTask.materials.map((m: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-gray-900">{m.name}</td>
                          <td className="py-2 text-gray-900 text-right">{m.qty}</td>
                          <td className="py-2 text-gray-500 text-right">{m.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">计划开始</label>
                  <p className="font-semibold text-gray-900">{selectedTask.planStart || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">计划结束</label>
                  <p className="font-semibold text-gray-900">{selectedTask.planEnd || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[selectedTask.status]?.bg || ''} ${statusMap[selectedTask.status]?.color || ''}`}>
                      {statusMap[selectedTask.status]?.label || selectedTask.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">预计时长</label>
                  <p className="font-semibold text-gray-900">
                    {selectedTask.estimatedDays > 0 ? `${selectedTask.estimatedDays}天` : ''}
                    {selectedTask.estimatedHours > 0 ? `${selectedTask.estimatedHours}小时` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* 必填反馈 */}
            {selectedTask.requiredFeedback && selectedTask.requiredFeedback.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">必填反馈</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.requiredFeedback.map((fb: string) => (
                    <span key={fb} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {fb === 'gps' && '位置打卡'}
                      {fb === 'material' && '物资扫码'}
                      {fb === 'photo_before' && '作业前照片'}
                      {fb === 'photo_after' && '作业后照片'}
                      {fb === 'voice' && '语音备注'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 流转记录 */}
            {selectedTask.sourceProblemId && getCurrentProblemFlowRecords().length > 0 && (
              <div>
                <TaskFlowTimeline records={getCurrentProblemFlowRecords()} />
              </div>
            )}

            {/* 进度（只读） */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${selectedTask.progress || 0}%` }}
                  />
                </div>
                <span className="w-14 text-sm font-medium text-gray-700 text-center">
                  {selectedTask.progress || 0}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedTask.progress === 100 ? '已完成' : selectedTask.progress === 0 ? '未开始' : '进行中'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* 反馈表单弹窗 */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => { setFeedbackModal({ isOpen: false, task: null }); }}
        title="任务处理"
        size="xl"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setFeedbackModal({ isOpen: false, task: null }); }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={
                !feedbackModal.task ||
                (feedbackModal.task.progress === 100
                  ? !(feedbackForm?.resultText || '').trim()
                  : !(feedbackForm?.progressText || '').trim())
              }
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提交反馈
            </button>
          </div>
        }
      >
        {feedbackModal.task && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">任务区域</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.field || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">作物</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.crop || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">负责人</label>
                  <p className="font-semibold text-gray-900">陆启闯</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">优先级</label>
                  <p className={`font-semibold ${priorityMap[feedbackModal.task.priority]?.color || ''}`}>
                    {priorityMap[feedbackModal.task.priority]?.label || feedbackModal.task.priority}
                  </p>
                </div>
              </div>
            </div>

            {/* 时间信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">时间信息</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">计划开始</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.planStart || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">计划结束</label>
                  <p className="font-semibold text-gray-900">{feedbackModal.task.planEnd || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">状态</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[feedbackModal.task.status]?.bg || ''} ${statusMap[feedbackModal.task.status]?.color || ''}`}>
                      {statusMap[feedbackModal.task.status]?.label || feedbackModal.task.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">任务类型</label>
                  <p className="font-semibold text-gray-900">{getTypeLabel(feedbackModal.task.types?.[0] || '')}</p>
                </div>
              </div>
            </div>

            {/* 流转记录 */}
            {feedbackModal.task.sourceProblemId && getProblemFlowRecords(feedbackModal.task.sourceProblemId).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">流转记录</h4>
                <TaskFlowTimeline records={getProblemFlowRecords(feedbackModal.task.sourceProblemId)} />
              </div>
            )}

            {/* 执行进度（可操作） */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={feedbackModal.task.progress || 0}
                  onChange={(e) => {
                    const newProgress = parseInt(e.target.value);
                    setTasks(prev => prev.map(t =>
                      t.id === feedbackModal.task!.id ? { ...t, progress: newProgress } : t
                    ));
                    setFeedbackModal(prev => ({
                      ...prev,
                      task: prev.task ? { ...prev.task, progress: newProgress } : null
                    }));
                  }}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="w-14 text-sm font-medium text-gray-700 text-center bg-gray-100 rounded px-2 py-1">
                  {feedbackModal.task.progress || 0}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {feedbackModal.task.progress === 100 ? '已完成，可提交反馈' :
                 feedbackModal.task.progress === 0 ? '未开始' : '进行中'}
              </p>
            </div>

            {/* 必填反馈提醒 */}
            {feedbackModal.task.requiredFeedback && feedbackModal.task.requiredFeedback.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="block text-sm font-medium text-amber-800 mb-2">
                  必填反馈项
                </label>
                <div className="flex flex-wrap gap-2">
                  {feedbackModal.task.requiredFeedback.map((fb: string) => (
                    <span key={fb} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                      {fb === 'gps' && '位置打卡'}
                      {fb === 'material' && '物资扫码'}
                      {fb === 'photo_before' && '作业前照片'}
                      {fb === 'photo_after' && '作业后照片'}
                      {fb === 'voice' && '语音备注'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 反馈表单（任何进度都可以提交） */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-sm text-amber-800">
                {feedbackModal.task.progress === 100
                  ? '提交反馈后，任务将进入"待验收"状态，等待管理者确认完成。'
                  : '提交进度反馈后，任务将继续进行，可再次提交直到100%。'}
              </div>
            </div>

            {/* 100%时显示处理结果和工作量 */}
            {feedbackModal.task.progress === 100 ? (
              <>
                {/* 处理结果 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    处理结果 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={feedbackForm.resultText}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, resultText: e.target.value }))}
                    placeholder="请描述处理过程和结果..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 实际工作量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    实际工作量
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={feedbackForm.workloadDays}
                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, workloadDays: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-600">天</span>
                    <input
                      type="number"
                      value={feedbackForm.workloadHours}
                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, workloadHours: e.target.value }))}
                      placeholder="0"
                      min="0"
                      max="23"
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-600">小时</span>
                  </div>
                </div>
              </>
            ) : (
              /* 小于100%时显示进展情况 */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  进展情况 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedbackForm.progressText}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, progressText: e.target.value }))}
                  placeholder="请描述当前处理进度和下一步计划..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 拒绝原因弹窗 */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => { setRejectModal({ isOpen: false, task: null }); setRejectReason(''); }}
        title="拒绝任务"
        size="md"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setRejectModal({ isOpen: false, task: null }); setRejectReason(''); }}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认拒绝
            </button>
          </div>
        }
      >
        {rejectModal.task && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                拒绝任务后，该问题将重新回到"待分派"状态。
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                拒绝原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* SOP文件查看弹窗 */}
      <Modal
        isOpen={showSopModal}
        onClose={() => { setShowSopModal(false); setSelectedSopTask(null); }}
        title={`作业标准文件 - ${selectedSopTask?.id || ''}`}
        size="lg"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end">
            <button
              onClick={() => setShowSopModal(false)}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        }
      >
        {selectedSopTask && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">任务类型：</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {(selectedSopTask.types || []).map((t: string) => (
                  <span
                    key={t}
                    className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(t)}`}
                  >
                    {getTypeLabel(t)}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{selectedSopTask.sopContent || '暂无SOP内容'}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default MyTasksPage;
