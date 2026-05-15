/**
 * 选择执行人弹窗组件
 * 功能：为待派工任务选择执行人（支持AI推荐和手动选择）
 */

import { useState, useCallback, useMemo } from 'react';
import { Modal } from '../../../ui/Modal';
import { UserPlus, Users, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Task } from '../../../../hooks/useTasks';
import { useWorkerStore } from '../../../../stores';
import { AIRecommendationPanel } from '../../../dispatch/AIRecommendationPanel';
import { useComprehensiveDispatch } from '../../../../hooks/useComprehensiveDispatch';
import type { WorkerRecommendation } from '../../../../hooks/useComprehensiveDispatch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';

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
  // 从Store获取员工列表（替换原 taskDispatchStaff mock数据）
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);
  const taskDispatchStaff = useMemo(() => workers.map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    role: w.position || 'worker',
    skills: [] as string[],
    workZone: w.department || '',
    workLoad: 0,
  })), [workers]);

  // 加载员工数据
  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  // 分派模式：ai_assisted 或 manual
  const [dispatchMode, setDispatchMode] = useState<'ai_assisted' | 'manual'>('ai_assisted');
  // AI推荐结果
  const [aiRecommendations, setAiRecommendations] = useState<WorkerRecommendation[]>([]);
  // AI推荐加载状态
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // 使用综合派工Hook获取AI推荐功能
  const { getRecommendations } = useComprehensiveDispatch();

  // 获取AI推荐
  const fetchAIRecommendations = useCallback(() => {
    if (!task) return;

    setIsLoadingAI(true);
    try {
      // 构建任务信息用于AI推荐
      const taskInfo = {
        id: task.id,
        source: 'farm' as const,
        sourceId: '',
        taskCode: task.taskCode || task.id,
        title: task.title || '农事任务',
        type: task.type || 'other',
        typeName: task.typeName || task.type || '',
        priority: (task.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
        workZone: task.greenhouseName || task.field || '',
        greenhouse: task.greenhouseName || '',
        cropName: task.cropName || '',
        batchId: task.batchId || '',
        batchCode: task.batchCode || '',
        requiredSkills: [],
        estimatedHours: 2,
        dueDate: task.dueDate || '',
        description: task.description || '',
        createdAt: new Date().toISOString(),
      };

      const recommendations = getRecommendations(taskInfo, 5);
      setAiRecommendations(recommendations || []);
    } catch {
      setAiRecommendations([]);
    } finally {
      setIsLoadingAI(false);
    }
  }, [task, getRecommendations]);

  // 当切换到AI模式时获取推荐
  const handleModeChange = (mode: 'ai_assisted' | 'manual') => {
    setDispatchMode(mode);
    if (mode === 'ai_assisted' && aiRecommendations.length === 0) {
      fetchAIRecommendations();
    }
  };

  // 处理AI推荐选中
  const handleAIRecommendSelect = (workerId: string) => {
    const worker = taskDispatchStaff.find(s => s.id === workerId);
    if (worker) {
      setSelectedAssignee(workerId);
      // 自动切换为手动模式，保留选中状态
      setDispatchMode('manual');
    }
  };

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
        setDispatchMode('ai_assisted');
        setAiRecommendations([]);
      }
    }
  };

  const handleClose = () => {
    setSelectedAssignee('');
    setDispatchMode('ai_assisted');
    setAiRecommendations([]);
    onClose();
  };

  // 如果任务为空，不渲染弹窗
  if (!isOpen || !task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="选择执行人"
      size="xl"
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

        {/* 分派模式切换 */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => handleModeChange('ai_assisted')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
              dispatchMode === 'ai_assisted'
                ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI智能推荐（默认）
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
              dispatchMode === 'manual'
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            手动选择
          </button>
        </div>

        {/* AI辅助模式 - 显示AI推荐面板 */}
        {dispatchMode === 'ai_assisted' && (
          <div className="space-y-3">
            {isLoadingAI ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                <span className="ml-3 text-gray-500">正在分析最优执行人...</span>
              </div>
            ) : (
              <>
                {/* AI推荐触发按钮 */}
                {aiRecommendations.length === 0 && (
                  <button
                    onClick={fetchAIRecommendations}
                    className="w-full py-4 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-500 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    点击获取AI智能推荐
                  </button>
                )}

                {/* AI推荐面板 */}
                {aiRecommendations.length > 0 && (
                  <AIRecommendationPanel
                    taskInfo={{
                      id: task.id,
                      source: 'farm' as const,
                      sourceId: '',
                      taskCode: task.taskCode || task.id,
                      title: task.title || '农事任务',
                      type: task.type || 'other',
                      typeName: task.typeName || '',
                      priority: (task.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
                      workZone: task.greenhouseName || '',
                      greenhouse: task.greenhouseName || '',
                      cropName: task.cropName || '',
                      batchId: task.batchId || '',
                      batchCode: task.batchCode || '',
                      requiredSkills: [],
                      estimatedHours: 2,
                      dueDate: task.dueDate || '',
                      description: task.description || '',
                      createdAt: new Date().toISOString(),
                    }}
                    recommendations={aiRecommendations}
                    onWorkerSelect={(workerId, score) => {
                      handleAIRecommendSelect(workerId);
                    }}
                    onManualSelect={() => handleModeChange('manual')}
                    config={{ defaultSelectTop: true, maxResults: 5 }}
                    selectedWorkerId={selectedAssignee}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* 手动模式 - 执行人列表 */}
        {dispatchMode === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              选择执行人
            </label>
            <Select
              value={selectedAssignee || ''}
              onValueChange={(value) => setSelectedAssignee(value)}
            >
              <SelectTrigger className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg text-base focus:border-blue-500">
                <SelectValue placeholder="请选择执行人..." />
              </SelectTrigger>
              <SelectContent>
                {taskDispatchStaff.map(staff => (
                  <SelectItem key={staff.id} value={staff.id} className="text-base py-3">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-sm text-gray-500">{staff.role || '执行人员工'}</div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(staff.status || 'available')}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {getStatusLabel(staff.status || 'available')}
                        </span>
                        {staff.skillTags?.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
