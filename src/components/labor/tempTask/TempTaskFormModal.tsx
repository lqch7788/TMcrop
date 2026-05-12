import { useState, useEffect, useMemo } from 'react';
import { Modal, FormField, Input, Select, Textarea } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { TempTask, TempTaskUrgency, TEMP_TASK_TYPES } from '../../../types';
import { currentUser } from '../../../data/mockData';
import { useGreenhouses } from '../../common/settings';
import { Clock, MapPin, Package, Camera, Mic } from 'lucide-react';
import { AIRecommendationPanel } from '../../dispatch/AIRecommendationPanel';
import { useComprehensiveDispatch, type UnifiedDispatchTask } from '../../../hooks/useComprehensiveDispatch';
import type { WorkerRecommendation } from '../../../hooks/useComprehensiveDispatch';

interface TempTaskFormModalProps {
  isOpen: boolean;
  title: string;
  task?: TempTask | null;
  formData: {
    taskCode: string;
    title: string;
    urgency: TempTaskUrgency;
    tempTaskType: string;
    workLocation: string;
    estimatedHours: number;
    assigneeId: string;
    assigneeName: string;
    dueDate: string;
    description: string;
    notes: string;
    priority: 'high' | 'medium' | 'low';
    estimatedDays: number;
    greenhouseId: string;
    workerCount: number;
    requiredFeedback: string[];
  };
  errors: Partial<Record<string, string>>;
  workerUsers: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmitDraft: () => void;
  onSubmit: () => void;
  onChange: <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => void;
  generateNewTaskCode: () => void;
  /** 派发模式：manual=手动选择，ai_assisted=待智能推荐 */
  dispatchMode?: 'manual' | 'ai_assisted';
  onDispatchModeChange?: (mode: 'manual' | 'ai_assisted') => void;
}

export function TempTaskFormModal({
  isOpen,
  title,
  task,
  formData,
  errors,
  workerUsers,
  onClose,
  onSubmitDraft,
  onSubmit,
  onChange,
  generateNewTaskCode,
  dispatchMode: externalDispatchMode,
  onDispatchModeChange,
}: TempTaskFormModalProps) {
  const { greenhouses } = useGreenhouses();

  // 派发模式状态（默认手动选择）
  const [dispatchMode, setDispatchMode] = useState<'manual' | 'ai_assisted'>(externalDispatchMode || 'manual');
  // AI推荐结果
  const [recommendations, setRecommendations] = useState<WorkerRecommendation[]>([]);
  // 选中执行人ID
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>(undefined);

  // 从 useComprehensiveDispatch 获取推荐算法
  const { getRecommendations } = useComprehensiveDispatch();

  // 监听外部 dispatchMode 变化
  useEffect(() => {
    if (externalDispatchMode) {
      setDispatchMode(externalDispatchMode);
    }
  }, [externalDispatchMode]);

  // 当派发模式切换到AI推荐时，获取推荐
  useEffect(() => {
    if (dispatchMode === 'ai_assisted' && formData.tempTaskType) {
      // 构建临时任务格式用于AI推荐
      const tempTask: UnifiedDispatchTask = {
        id: formData.taskCode || `temp-${Date.now()}`,
        source: 'tempTask',
        sourceId: '',
        taskCode: formData.taskCode,
        title: formData.title,
        type: formData.tempTaskType,
        typeName: TEMP_TASK_TYPES.find(t => t.value === formData.tempTaskType)?.label || '临时任务',
        priority: formData.urgency === 'critical' ? 'urgent' : formData.urgency === 'urgent' ? 'high' : 'normal',
        workZone: formData.workLocation || '',
        greenhouse: formData.workLocation || '',
        cropName: '',
        requiredSkills: [],
        estimatedHours: formData.estimatedHours || 2,
        dueDate: formData.dueDate,
        description: formData.description,
        createdAt: new Date().toISOString(),
      };

      // 紧急任务时，自动提升"当前负荷"权重（优先推荐空闲人员）
      let recs = getRecommendations(tempTask, 5);
      if (formData.urgency === 'critical' || formData.urgency === 'urgent') {
        // 紧急任务优先推荐空闲人员，按当前负荷排序
        recs = recs.sort((a, b) => a.worker.currentLoad - b.worker.currentLoad);
      }

      setRecommendations(recs);
    }
  }, [dispatchMode, formData.tempTaskType, formData.title, formData.workLocation, formData.urgency, formData.estimatedHours, formData.dueDate, formData.description, formData.taskCode, getRecommendations]);

  // 处理派发模式切换
  const handleDispatchModeChange = (mode: 'manual' | 'ai_assisted') => {
    setDispatchMode(mode);
    onDispatchModeChange?.(mode);
    if (mode === 'manual') {
      // 切换到手动模式时，清空AI选中的执行人
      setSelectedWorkerId(undefined);
    }
  };

  // 处理AI推荐选中执行人
  const handleAIWorkerSelect = (workerId: string, score: number) => {
    setSelectedWorkerId(workerId);
    const selectedWorker = recommendations.find(r => r.worker.id === workerId)?.worker;
    if (selectedWorker) {
      onChange('assigneeId', workerId);
      onChange('assigneeName', selectedWorker.name);
    }
  };

  // 紧急程度到优先级的映射
  const urgencyToPriority = {
    critical: 'high',
    urgent: 'medium',
    normal: 'low',
  } as const;

  // 优先级到紧急程度的映射
  const priorityToUrgency = {
    high: 'critical',
    medium: 'urgent',
    low: 'normal',
  } as const;

  // 处理紧急程度变化，自动更新优先级
  const handleUrgencyChange = (urgency: TempTaskUrgency) => {
    onChange('urgency', urgency);
    onChange('priority', urgencyToPriority[urgency]);
  };

  // 处理优先级变化，自动更新紧急程度
  const handlePriorityChange = (priority: 'high' | 'medium' | 'low') => {
    onChange('priority', priority);
    onChange('urgency', priorityToUrgency[priority]);
  };

  // 其他地点选项（非温室）
  const OTHER_LOCATIONS = [
    { value: '外出协助', label: '外出协助' },
    { value: '总部办公', label: '总部办公' },
    { value: '仓库', label: '仓库' },
    { value: '其他', label: '其他' },
  ];

  // 处理工作地点变化
  const handleWorkLocationChange = (value: string) => {
    // 检查是否选择了温室
    const selectedGreenhouse = greenhouses.find(g => g.id === value);
    if (selectedGreenhouse) {
      // 选择温室
      onChange('greenhouseId', value);
      onChange('workLocation', selectedGreenhouse.name);
    } else {
      // 选择其他地点
      onChange('greenhouseId', '');
      onChange('workLocation', value);
    }
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        onClick={onSubmitDraft}
        variant="ghost"
      >
        存为草稿
      </Button>
      <Button
        onClick={onSubmit}
      >
        发布
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      showFooter={true}
      footer={footer}
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
      bodyClassName="scrollbar-thin"
    >
      <div className="space-y-4">
        {/* 第一行：任务编号、任务名称 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="任务编号" error={errors.taskCode}>
            <div className="flex gap-2">
              <Input
                value={formData.taskCode}
                onChange={(e) => onChange('taskCode', e.target.value)}
                placeholder="点击生成获取编号"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={generateNewTaskCode}
                size="sm"
              >
                生成
              </Button>
            </div>
          </FormField>

          <FormField label="任务名称" required error={errors.title}>
            <Input
              value={formData.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="请输入任务名称"
            />
          </FormField>
        </div>

        {/* 第二行：任务类型、紧急程度 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="任务类型" required error={errors.tempTaskType}>
            <Select
              value={formData.tempTaskType}
              onChange={(e) => onChange('tempTaskType', e.target.value)}
              options={TEMP_TASK_TYPES.map(t => ({ value: t.value, label: t.label }))}
            />
          </FormField>

          {/* 选择"其他"时显示的备注输入框 */}
          {formData.tempTaskType === 'other' && (
            <FormField label="备注说明" required error={errors.notes}>
              <Input
                value={formData.notes}
                onChange={(e) => onChange('notes', e.target.value)}
                placeholder="请输入具体任务内容"
              />
            </FormField>
          )}

          <FormField label="紧急程度" error={errors.urgency}>
            <Select
              value={formData.urgency}
              onChange={(e) => handleUrgencyChange(e.target.value as TempTaskUrgency)}
              options={[
                { value: 'normal', label: '普通' },
                { value: 'urgent', label: '紧急' },
                { value: 'critical', label: '非常紧急' },
              ]}
            />
          </FormField>
        </div>

        {/* 第三行：工作地点、执行人、发布人 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="工作地点" required error={errors.workLocation}>
            <Select
              value={formData.greenhouseId || formData.workLocation}
              onChange={(e) => handleWorkLocationChange(e.target.value)}
              options={[
                { value: '', label: '请选择', disabled: true },
                { value: '---greenhouses---', label: '━━━━━━━━ 温室 ━━━━━━━━', disabled: true },
                ...greenhouses.map(g => ({ value: g.id, label: g.name })),
                { value: '---other---', label: '━━━━━━━━ 其他地点 ━━━━━━━━', disabled: true },
                ...OTHER_LOCATIONS,
              ]}
            />
          </FormField>

          <FormField label="执行人" required error={errors.assigneeId as any}>
            {/* 派发模式切换 */}
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dispatchMode"
                  value="manual"
                  checked={dispatchMode === 'manual'}
                  onChange={() => handleDispatchModeChange('manual')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">👤 手动选择</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dispatchMode"
                  value="ai_assisted"
                  checked={dispatchMode === 'ai_assisted'}
                  onChange={() => handleDispatchModeChange('ai_assisted')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">🤖 待智能推荐</span>
              </label>
            </div>

            {dispatchMode === 'manual' ? (
              /* 手动选择模式 */
              <Select
                value={formData.assigneeId}
                onChange={(e) => {
                  const selectedUser = workerUsers.find(u => u.id === e.target.value);
                  onChange('assigneeId', e.target.value);
                  onChange('assigneeName', selectedUser?.name || '');
                }}
                options={[
                  { value: '', label: '请选择执行人', disabled: true },
                  ...workerUsers.map(u => ({ value: u.id, label: u.name })),
                ]}
              />
            ) : (
              /* AI智能推荐模式 */
              <div className="mt-2">
                {formData.title && formData.workLocation ? (
                  <AIRecommendationPanel
                    taskInfo={{
                      id: formData.taskCode,
                      taskCode: formData.taskCode,
                      title: formData.title,
                      type: formData.tempTaskType,
                      typeName: TEMP_TASK_TYPES.find(t => t.value === formData.tempTaskType)?.label || '临时任务',
                      priority: formData.urgency === 'critical' ? 'urgent' : formData.urgency === 'urgent' ? 'high' : 'normal',
                      workZone: formData.workLocation,
                      greenhouse: formData.workLocation,
                      description: formData.description,
                      estimatedHours: formData.estimatedHours,
                    }}
                    recommendations={recommendations}
                    onWorkerSelect={handleAIWorkerSelect}
                    onManualSelect={() => handleDispatchModeChange('manual')}
                    selectedWorkerId={selectedWorkerId}
                    config={{ defaultSelectTop: true, showTopN: 3 }}
                  />
                ) : (
                  /* 任务信息不完整时显示提示 */
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
                    <p className="text-sm text-gray-500">请先填写任务名称和工作地点</p>
                    <p className="text-xs text-gray-400 mt-1">系统将基于这些信息生成智能推荐</p>
                  </div>
                )}
              </div>
            )}
          </FormField>

          <FormField label="发布人">
            <div className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
              <span className="font-medium">{currentUser.name}</span>
              <span className="ml-2 text-xs text-gray-500">（当前登录用户）</span>
            </div>
          </FormField>
        </div>

        {/* 第四行：计划开始时间、截止时间、优先级 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="计划开始时间" error={errors.dueDate}>
            <Input
              type="datetime-local"
              step="3600"
              value={formData.dueDate}
              onChange={(e) => onChange('dueDate', e.target.value)}
            />
          </FormField>

          <FormField label="截止时间" required error={errors.dueDate}>
            <Input
              type="datetime-local"
              step="3600"
              value={formData.dueDate}
              onChange={(e) => onChange('dueDate', e.target.value)}
            />
          </FormField>

          <FormField label="优先级" error={errors.priority}>
            <Select
              value={formData.priority}
              onChange={(e) => handlePriorityChange(e.target.value as 'high' | 'medium' | 'low')}
              options={[
                { value: 'high', label: '高优先级' },
                { value: 'medium', label: '中优先级' },
                { value: 'low', label: '低优先级' },
              ]}
            />
          </FormField>
        </div>

        {/* 第五行：预计天数、预计小时、人工数量、总工时 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="预计天数（8小时/天）" error={errors.estimatedDays}>
            <Input
              type="number"
              value={formData.estimatedDays}
              onChange={(e) => onChange('estimatedDays', parseInt(e.target.value) || 0)}
              min={0}
              placeholder="0"
            />
          </FormField>

          <FormField label="预计小时" error={errors.estimatedHours}>
            <Input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => onChange('estimatedHours', parseInt(e.target.value) || 0)}
              min={0}
              placeholder="0"
            />
          </FormField>

          <FormField label="人工数量" error={errors.workerCount as any}>
            <Input
              type="number"
              value={formData.workerCount}
              onChange={(e) => onChange('workerCount', parseInt(e.target.value) || 1)}
              min={1}
              placeholder="1"
            />
          </FormField>

          <FormField label="总工时">
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-medium">
              <span className="text-sm">共</span>
              <span className="text-lg">
                {(formData.estimatedDays * 8 + formData.estimatedHours) * formData.workerCount}
              </span>
              <span className="text-sm">小时</span>
            </div>
          </FormField>
        </div>

        {/* 第六行：任务描述（占满） */}
        <FormField label="任务描述" error={errors.description}>
          <Textarea
            value={formData.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="请输入任务描述"
            rows={3}
          />
        </FormField>

        {/* 第七行：备注（占满） */}
        <FormField label="备注" error={errors.notes}>
          <Textarea
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder="备注信息"
            rows={2}
          />
        </FormField>

        {/* 第八行：必填反馈选项 */}
        <div>
          <label className="block text-sm font-bold text-red-600 mb-2">
            必填反馈 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'workload_confirm', label: '工作量确认', icon: Clock, iconBg: 'bg-emerald-500', iconColor: 'text-white' },
              { key: 'gps', label: '位置打卡', icon: MapPin, iconBg: 'bg-blue-500', iconColor: 'text-white' },
              { key: 'material', label: '物资扫码', icon: Package, iconBg: 'bg-amber-500', iconColor: 'text-white' },
              { key: 'photo_before', label: '作业前照片', icon: Camera, iconBg: 'bg-purple-500', iconColor: 'text-white' },
              { key: 'photo_after', label: '作业后照片', icon: Camera, iconBg: 'bg-pink-500', iconColor: 'text-white' },
              { key: 'voice', label: '语音备注', icon: Mic, iconBg: 'bg-teal-500', iconColor: 'text-white' },
            ].map(item => {
              const isSelected = formData.requiredFeedback.includes(item.key);
              const Icon = item.icon;
              return (
                <label
                  key={item.key}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-gray-100 border-2 border-emerald-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange('requiredFeedback', [...formData.requiredFeedback, item.key]);
                      } else {
                        onChange('requiredFeedback', formData.requiredFeedback.filter(f => f !== item.key));
                      }
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 sr-only"
                  />
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? item.iconBg : 'bg-gray-200'}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? item.iconColor : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TempTaskFormModal;