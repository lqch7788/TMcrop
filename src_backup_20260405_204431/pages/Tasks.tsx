import { useState } from 'react';
import {
  Search, Filter, Plus, MoreVertical, Calendar, Clock, User,
  CheckCircle, Circle, PlayCircle, XCircle, ChevronDown, Edit, Trash2, Eye, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { tasks, greenhouses, users, cropBatches } from '../data/mockData';
import { Modal, FormField, Input, Select, Textarea } from '../components/ui/Modal';

const taskTypes = [
  { value: 'all', label: '全部任务' },
  { value: 'irrigation', label: '浇水' },
  { value: 'fertilization', label: '施肥' },
  { value: 'pruning', label: '整枝' },
  { value: 'harvest', label: '采收' },
  { value: 'scouting', label: '巡田' },
  { value: 'spraying', label: '打药' },
  { value: 'weeding', label: '除草' },
];

const taskStatuses = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待执行' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'glass' | 'solar' | 'field'>('all');
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Task Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskList, setTaskList] = useState([...tasks]);
  const [newTask, setNewTask] = useState({
    taskCode: '',
    title: '',
    type: 'irrigation',
    batchCode: '',
    greenhouseId: '',
    assigneeId: '',
    dueDate: '',
    workDuration: 1,
    priority: 'medium',
    mode: 'glass',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateTaskCode = () => {
    const date = new Date();
    const code = `RW${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    return code;
  };

  const validateTaskForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newTask.title.trim()) newErrors.title = '请输入任务标题';
    if (!newTask.type) newErrors.type = '请选择任务类型';
    if (!newTask.batchCode) newErrors.batchCode = '请选择所属批次';
    if (!newTask.greenhouseId) newErrors.greenhouseId = '请选择作业区域';
    if (!newTask.assigneeId) newErrors.assigneeId = '请选择执行人';
    if (!newTask.dueDate) newErrors.dueDate = '请选择截止时间';
    if (newTask.workDuration <= 0) newErrors.workDuration = '请输入预计工时';
    if (!newTask.mode) newErrors.mode = '请选择任务模式';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTask = () => {
    if (!validateTaskForm()) return;

    const selectedGreenhouse = greenhouses.find(g => g.id === newTask.greenhouseId);
    const selectedBatch = cropBatches.find(b => b.batchCode === newTask.batchCode);
    const selectedUser = users.find(u => u.id === newTask.assigneeId);
    const taskTypeName = taskTypes.find(t => t.value === newTask.type)?.label || '';

    const task = {
      id: taskList.length + 1,
      taskCode: generateTaskCode(),
      title: newTask.title,
      type: newTask.type,
      typeName: taskTypeName,
      batchCode: newTask.batchCode,
      greenhouseName: selectedGreenhouse?.name || '',
      assigneeId: newTask.assigneeId,
      assigneeName: selectedUser?.name || '',
      assignerId: 'U001',
      assignerName: '系统管理员',
      dueDate: newTask.dueDate,
      workDuration: newTask.workDuration,
      priority: newTask.priority,
      status: 'pending' as const,
      mode: newTask.mode,
      description: newTask.description,
      requiredMaterials: [],
      actualWorkload: '',
      startTime: '',
      endTime: '',
      notes: '',
      createTime: new Date().toISOString().split('T')[0],
    };

    setTaskList([task, ...taskList]);
    setIsCreateModalOpen(false);
    setNewTask({
      taskCode: '',
      title: '',
      type: 'irrigation',
      batchCode: '',
      greenhouseId: '',
      assigneeId: '',
      dueDate: '',
      workDuration: 1,
      priority: 'medium',
      mode: 'glass',
      description: '',
    });
    setErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewTask({
      taskCode: '',
      title: '',
      type: 'irrigation',
      batchCode: '',
      greenhouseId: '',
      assigneeId: '',
      dueDate: '',
      workDuration: 1,
      priority: 'medium',
      mode: 'glass',
      description: '',
    });
    setErrors({});
  };

  // Filter greenhouses and batches based on selected mode
  const filteredGreenhouses = newTask.mode === 'all'
    ? greenhouses
    : greenhouses.filter(g => g.mode === newTask.mode);
  const filteredBatches = cropBatches.filter(b =>
    newTask.mode === 'all' || b.plantingMode === newTask.mode
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">紧急</span>;
      case 'medium':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">重要</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">一般</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
            <Circle className="w-3 h-3" /> 待执行
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            <PlayCircle className="w-3 h-3" /> 进行中
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
            <CheckCircle className="w-3 h-3" /> 已完成
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            <XCircle className="w-3 h-3" /> 已取消
          </span>
        );
    }
  };

  const getModeBadge = (mode: string) => {
    return mode === 'glass' ? (
      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">玻璃温室</span>
    ) : mode === 'solar' ? (
      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">日光温室</span>
    ) : (
      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">大田</span>
    );
  };

  const filteredTasks = taskList.filter((task) => {
    const matchSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.taskCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || task.type === typeFilter;
    const matchStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchMode = modeFilter === 'all' || task.mode === modeFilter;
    return matchSearch && matchType && matchStatus && matchMode;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务工单管理</h1>
            <p className="text-gray-500">管理农事任务派发、执行和验收</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            创建任务
          </button>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        <button
          onClick={() => setModeFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            modeFilter === 'all'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          全部模式
        </button>
        <button
          onClick={() => setModeFilter('glass')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            modeFilter === 'glass'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          玻璃温室模式
        </button>
        <button
          onClick={() => setModeFilter('solar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            modeFilter === 'solar'
              ? 'bg-amber-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          日光温室模式
        </button>
        <button
          onClick={() => setModeFilter('field')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            modeFilter === 'field'
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          大田模式
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索任务名称、任务编号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none w-full lg:w-40 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {taskTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full lg:w-40 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {taskStatuses.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            更多筛选
          </button>
        </div>
      </div>

      {/* Tasks List - 横向滚动表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
          <table className="w-full min-w-[1400px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3">任务编号</th>
                <th className="px-3 py-3">任务标题</th>
                <th className="px-3 py-3">任务类型</th>
                <th className="px-3 py-3">类型备注</th>
                <th className="px-3 py-3">作业区域</th>
                <th className="px-3 py-3">作物</th>
                <th className="px-3 py-3">作物备注</th>
                <th className="px-3 py-3">执行人</th>
                <th className="px-3 py-3">计划开始</th>
                <th className="px-3 py-3">计划结束</th>
                <th className="px-3 py-3">预计天数</th>
                <th className="px-3 py-3">预计小时</th>
                <th className="px-3 py-3">工作制</th>
                <th className="px-3 py-3">优先级</th>
                <th className="px-3 py-3">状态</th>
                <th className="px-3 py-3">所需物资</th>
                <th className="px-3 py-3">所需工具</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-900">{task.taskCode}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      {getModeBadge(task.mode)}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-700">{task.typeName}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-500">{(task as any).typeRemarks || '-'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-700">{task.greenhouseName}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-700">{(task as any).crop || '-'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-500">{(task as any).cropRemarks || '-'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                        {task.assigneeName.charAt(0)}
                      </div>
                      <span className="text-sm text-gray-700">{task.assigneeName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">{(task as any).planStart || '-'}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-3 h-3" />
                      {task.dueDate}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">{(task as any).estimatedDays || 0}天</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">{(task as any).estimatedHours || task.workDuration}小时</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">{(task as any).workHoursPerDay || 8}时/天</span>
                  </td>
                  <td className="px-3 py-3">
                    {getPriorityBadge(task.priority)}
                  </td>
                  <td className="px-3 py-3">
                    {getStatusBadge(task.status)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">
                      {(task as any).materials?.length > 0
                        ? (task as any).materials.map((m: any) => m.name).join(', ')
                        : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm text-gray-600">
                      {(task as any).tools?.length > 0
                        ? (task as any).tools.map((t: any) => t.name).join(', ')
                        : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredTasks.length} 条</span>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {Math.ceil(filteredTasks.length / pageSize) || 1}</span>
            <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredTasks.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(filteredTasks.length / pageSize)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">任务详情</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务编号</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.taskCode}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务类型</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.typeName}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务标题</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.title}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">所属批次</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.batchCode}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">作业区域</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.greenhouseName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">执行人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.assigneeName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">派单人</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.assignerName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">截止时间</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.dueDate}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">预计工时</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.workDuration} 小时</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务模式</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.mode === 'glass' ? '玻璃温室' : selectedTask.mode === 'solar' ? '日光温室' : '大田'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">任务描述</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedTask.description}</p>
                </div>
                {selectedTask.requiredMaterials.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">所需物料</label>
                    <div className="mt-2 space-y-2">
                      {selectedTask.requiredMaterials.map((material, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{material.materialName}</span>
                          <span className="text-sm font-medium text-gray-900">{material.requiredQuantity} {material.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedTask.status === 'completed' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">实际工作量</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedTask.actualWorkload}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">执行时间</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {selectedTask.startTime} - {selectedTask.endTime}
                      </p>
                    </div>
                    {selectedTask.notes && (
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 uppercase tracking-wide">执行备注</label>
                        <p className="text-sm text-gray-700 mt-1">{selectedTask.notes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                关闭
              </button>
              {selectedTask.status !== 'completed' && (
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  确认完成
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="创建任务"
        size="lg"
        onSubmit={handleCreateTask}
        submitText="创建任务"
        cancelText="取消"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="任务模式" required error={errors.mode}>
              <select
                value={newTask.mode}
                onChange={(e) => setNewTask({ ...newTask, mode: e.target.value, batchCode: '', greenhouseId: '' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择任务模式</option>
                <option value="glass">玻璃温室</option>
                <option value="solar">日光温室</option>
              </select>
            </FormField>
            <FormField label="任务类型" required error={errors.type}>
              <select
                value={newTask.type}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择任务类型</option>
                {taskTypes.filter(t => t.value !== 'all').map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="任务标题" required error={errors.title}>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="请输入任务标题"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="所属批次" required error={errors.batchCode}>
              <select
                value={newTask.batchCode}
                onChange={(e) => setNewTask({ ...newTask, batchCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择批次</option>
                {filteredBatches.map(batch => (
                  <option key={batch.id} value={batch.batchCode}>{batch.batchCode} - {batch.cropName}</option>
                ))}
              </select>
            </FormField>
            <FormField label="作业区域" required error={errors.greenhouseId}>
              <select
                value={newTask.greenhouseId}
                onChange={(e) => setNewTask({ ...newTask, greenhouseId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择区域</option>
                {filteredGreenhouses.map(gh => (
                  <option key={gh.id} value={gh.id}>{gh.name}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="执行人" required error={errors.assigneeId}>
              <select
                value={newTask.assigneeId}
                onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择执行人</option>
                {users.filter(u => u.role === 'technician' || u.role === 'worker').map(user => (
                  <option key={user.id} value={user.id}>{user.name} - {user.roleName}</option>
                ))}
              </select>
            </FormField>
            <FormField label="优先级" required>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="low">一般</option>
                <option value="medium">重要</option>
                <option value="high">紧急</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="截止时间" required error={errors.dueDate}>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
            <FormField label="预计工时(小时)" required error={errors.workDuration}>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newTask.workDuration}
                onChange={(e) => setNewTask({ ...newTask, workDuration: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </FormField>
          </div>

          <FormField label="任务描述">
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="请输入任务描述"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
