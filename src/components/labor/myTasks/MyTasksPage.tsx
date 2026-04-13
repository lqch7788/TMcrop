/**
 * 我的任务页面
 * 员工查看自己被分派的任务，并完成任务
 */

import { useState, useEffect } from 'react';
import { Edit, FileText, CheckCircle } from 'lucide-react';
import { useLocalStorage, STORAGE_KEYS } from '../../../hooks/useLocalStorage';
import { Modal } from '../../ui/Modal';
import { TaskTypeConfigDisplay } from '../../farm/taskDispatch/components/TaskTypeConfigDisplay';
import { taskDispatchTasks, TaskDispatchTask } from '../../../data/farmMockData';

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

// 状态映射
const statusMap: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'bg-gray-100', color: 'text-gray-600', label: '待开始' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-600', label: '进行中' },
  completed: { bg: 'bg-green-100', color: 'text-green-600', label: '已完成' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-600', label: '待验收' },
  rejected: { bg: 'bg-red-100', color: 'text-red-600', label: '已驳回' },
};

// 优先级映射
const priorityMap: Record<string, { color: string; label: string }> = {
  urgent: { color: 'text-red-500', label: '紧急' },
  high: { color: 'text-orange-500', label: '高' },
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
  const [tasks, setTasks] = useLocalStorage<TaskDispatchTask[]>(STORAGE_KEYS.MY_TASKS, []);

  // 获取当前用户名
  const currentUserName = localStorage.getItem('username') || '虚竹';

  // 使用任务数据（优先从 localStorage 读取，如果没有则使用 taskDispatchTasks）
  const myTasks = tasks.length > 0 ? tasks : taskDispatchTasks;

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

  // 计算分页
  const totalPages = Math.ceil(myTasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, myTasks.length);
  const paginatedTasks = myTasks.slice(startIndex, endIndex);

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
    // 如果进度100%，自动更新状态为已完成
    if (progress === 100) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed' } : t
      ));
    }
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
              {myTasks.length === 0 ? (
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
                        <button
                          onClick={() => openDetailModal(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                          title="点击提交进度"
                        >
                          <Edit className="w-4 h-4" />
                          提交进度
                        </button>
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

      {/* 详情弹窗 */}
      <Modal
        isOpen={showDetailModal && !!selectedTask}
        onClose={() => { setShowDetailModal(false); setSelectedTask(null); }}
        title={`任务详情 - ${selectedTask?.id || ''}`}
        size="xl"
        showFooter={false}
        bottomContent={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                // 提交当前进度并关闭弹窗
                if (selectedTask) {
                  handleProgressChange(selectedTask.id, selectedTask.progress || 0);
                }
                setShowDetailModal(false);
                setSelectedTask(null);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              提交
            </button>
            {selectedTask?.progress === 100 && (
              <button
                onClick={() => handleConfirmComplete(selectedTask!)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
              >
                确认完成
              </button>
            )}
          </div>
        }
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

            {/* 进度 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">执行进度</h4>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={selectedTask.progress || 0}
                  onChange={(e) => handleProgressChange(selectedTask.id, parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="w-14 text-sm font-medium text-gray-700 text-center bg-gray-100 rounded px-2 py-1">
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
