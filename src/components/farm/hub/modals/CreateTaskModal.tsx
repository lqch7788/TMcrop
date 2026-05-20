/**
 * 新建任务模态框 - CreateTaskModal
 * 农事任务中心的新建任务功能完整实现
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button, Label, DatePicker } from '@/components/ui';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { TextArea } from '../../../ui/TextArea';
import { ChevronRight, AlertCircle, Clock, MapPin, Package, Camera, Mic } from 'lucide-react';
import { TaskTypeConfigPanel } from '../components/TaskTypeConfigPanel';
import { FARM_OPERATION_TYPES, PRIORITY_OPTIONS } from '../../../../types/farm/common';
import { TaskConfigValues } from '../../../../types/farm/taskTypeConfig';
import { useUserStore, useProductionPlanStore, useTeamManageStore, useGreenhouseStore } from '../../../../stores';
import { useTasks, Task } from '../../../../hooks/useTasks';
import type { UseTasksReturn } from '../../../../hooks/useTasks';
import { format, addHours } from 'date-fns';
import { getDictionaries } from '../../../../services/dictionaryService';

// 辅助函数：自动生成任务编号 NS+年月日+3位流水号（如 NS20260416001）
function autoGenerateTaskCode(tasks: Task[]): string {
  const today = new Date();
  const datePrefix = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');

  let maxSequence = 0;
  tasks.forEach(t => {
    const taskId = t.taskCode || t.id || '';
    if (taskId.startsWith('NS' + datePrefix + '-')) {
      const seqStr = taskId.slice(-3);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });

  const newSequence = maxSequence + 1;
  return `NS${datePrefix}-${String(newSequence).padStart(3, '0')}`;
}

function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    'fertilization': '施肥',
    'irrigation': '灌溉',
    'pruning': '修剪',
    'pesticide': '植保',
    'rootIrrigation': '灌根',
    'planting': '定植',
    'harvest': '采收',
    'weeding': '除草',
    'other': '其他',
    'fertilizing': '施肥',
    'pest_control': '病虫害防治',
    'harvesting': '采收',
    'soil_management': '土壤管理',
    'seedling': '育苗',
    'transplanting': '移栽',
  };
  return typeMap[type] || type;
}

function calculateEndDateTime(startTime: string, days: number, hours: number, workHoursPerDay: number): string {
  if (!startTime) return '';
  try {
    const start = parse(startTime, 'yyyy-MM-dd HH:mm', new Date());
    const totalHours = days * workHoursPerDay + hours;
    const end = addHours(start, totalHours);
    return format(end, 'yyyy-MM-dd HH:mm');
  } catch {
    return '';
  }
}

// newTask 状态类型
interface NewTaskState {
  taskId: string;
  types: string[];
  typeRemarks: string;
  fields: string[];
  crops: string[];
  cropRemarks: string;
  areaRemarks: string;
  assignee: string;
  teamId: string;       // 关联班组ID（来自农事管理-班组分配）
  teamName: string;     // 关联班组名称
  planStart: string;
  planEnd: string;
  sopContent: string;
  materials: { name: string; qty: number; unit: string }[];
  tools: { name: string; qty: number; unit: string }[];
  requiredFeedback: string[];
  priority: string;
  estimatedDays: number;
  estimatedHours: number;
  typeConfig: TaskConfigValues;
  toolsRemarks: string;
  batchId: string;
  batchCode: string;
  batchSearch: string;
  remarks: string;
  workHoursPerDay: number;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;  // 回调通知主组件刷新
  tasksHook: UseTasksReturn; // 从父组件共享 useTasks 实例，确保与任务列表数据同步
}

const initialNewTask: NewTaskState = {
  taskId: '',
  types: [],
  typeRemarks: '',
  fields: [],
  crops: [],
  cropRemarks: '',
  areaRemarks: '',
  assignee: '',
  teamId: '',
  teamName: '',
  planStart: '',
  planEnd: '',
  sopContent: '',
  materials: [],
  tools: [],
  requiredFeedback: ['workload_confirm'],
  priority: 'normal',
  estimatedDays: 0,
  estimatedHours: 1,
  typeConfig: {},
  toolsRemarks: '',
  batchId: '',
  batchCode: '',
  batchSearch: '',
  remarks: '',
  workHoursPerDay: 8,
};

export function CreateTaskModal({ isOpen, onClose, onCreated, tasksHook }: CreateTaskModalProps) {
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);
  const storePlans = useProductionPlanStore((state) => state.plans);
  const fetchPlans = useProductionPlanStore((state) => state.fetchPlans);
  // 班组数据（来自农事管理-班组分配）
  const teams = useTeamManageStore((state) => state.teams);
  const teamFetchData = useTeamManageStore((state) => state.fetchData);
  // 温室数据（替换硬编码 taskDispatchFields）
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (storePlans.length === 0) {
      fetchPlans();
    }
    if (teams.length === 0) {
      teamFetchData();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
  }, [users.length, loadUsers, storePlans.length, fetchPlans, teams.length, teamFetchData, greenhouses.length, loadGreenhouses]);

  // 从Store计算生产批次列表（保持与原 cropBatches 变量兼容）
  const cropBatches = useMemo(() => storePlans.map(p => ({
    id: p.id,
    batchCode: p.batchCode,
    cropName: (p as any).cropName || (p as any).cropTypeName || '',
    batchStatus: (p as any).batchStatus || (p as any).status,
  })), [storePlans]);

  // 任务区域字段列表（从温室 Store 动态计算，替换硬编码 farmMockData.taskDispatchFields）
  const taskDispatchFields = useMemo(() => greenhouses.map(g => ({
    id: Number(g.id) || 0,
    name: g.name,
    type: g.greenhouseType || '',
    crop: g.crop || '',
    area: g.area || 0,
  })), [greenhouses]);

  // 新建任务状态
  const [createStep, setCreateStep] = useState(1);
  const [stepError, setStepError] = useState('');
  const [newTask, setNewTask] = useState<NewTaskState>(initialNewTask);

  // 下拉框显示状态
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [showCropDropdown, setShowCropDropdown] = useState(false);
  const [showTaskTypeDropdown, setShowTaskTypeDropdown] = useState(false);

  // 从生产计划提取唯一作物列表
  const uniqueCrops = useMemo(() => {
    const crops = cropBatches.map(b => b.cropName).filter(Boolean);
    return [...new Set(crops)] as string[];
  }, [cropBatches]);

  // 处理函数
  const handleNextStep = () => {
    let error = '';
    if (createStep === 1) {
      if (!newTask.taskId) {
        error = '请生成任务编号';
      } else if (newTask.types.length === 0) {
        error = '请选择任务类型';
      } else if (newTask.fields.length === 0) {
        error = '请选择任务区域';
      } else if (newTask.crops.length === 0) {
        error = '请选择作物';
      } else if (newTask.types.includes('other') && !newTask.typeRemarks.trim()) {
        error = '请输入其他任务备注';
      }
    }

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    setCreateStep(createStep + 1);
  };

  const handleTypeConfigChange = (type: string, values: Record<string, string>) => {
    setNewTask(prev => ({
      ...prev,
      typeConfig: {
        ...prev.typeConfig,
        [type]: values,
      },
    }));
  };

  const handleCreateTask = (publish: boolean = true) => {
    const typeLabels = newTask.types.map(t => getTypeLabel(t)).join(',');
    const fieldValue = newTask.fields?.includes('other')
      ? newTask.areaRemarks
      : (newTask.fields?.join(',') || '');
    const cropValue = newTask.crops?.includes('other')
      ? newTask.cropRemarks
      : (newTask.crops?.join(',') || '');

    const finalAssigneeName = newTask.assignee || '';
    const finalAssigneeId = finalAssigneeName
      ? `EMP_${finalAssigneeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)}`
      : '';

    const defaultDispatcher = users.find(u => u.id === 'U001');
    const assignerId = defaultDispatcher?.id || 'U001';
    const assignerName = defaultDispatcher?.name || '系统';

    const firstFieldName = fieldValue.split(',')[0]?.trim() || '';
    const matchedField = taskDispatchFields.find(f => f.name === firstFieldName);
    const greenhouseId = matchedField?.id?.toString() || '';

    const estimatedHours = ((newTask.estimatedDays || 0) * (newTask.workHoursPerDay || 8)) + (newTask.estimatedHours || 0);
    const planEndTime = calculateEndDateTime(
      newTask.planStart,
      newTask.estimatedDays || 0,
      newTask.estimatedHours || 0,
      newTask.workHoursPerDay || 8
    );

    const taskStatus: 'pending' | 'draft' = publish ? 'pending' : 'draft';

    console.log('[CreateTaskModal] handleCreateTask called, publish:', publish, 'taskStatus:', taskStatus);
    console.log('[CreateTaskModal] assignee:', finalAssigneeName, 'id:', finalAssigneeId);

    const createdTask = tasksHook.createTask({
      title: typeLabels || '农事任务',
      type: newTask.types[0] || 'other',
      typeName: typeLabels,
      batchId: newTask.batchId,
      batchCode: newTask.batchCode,
      greenhouseId: greenhouseId,
      greenhouseName: fieldValue,
      teamId: newTask.teamId || '',
      teamName: newTask.teamName || '',
      cropName: cropValue,
      priority: (newTask.priority as 'urgent' | 'high' | 'normal') || 'normal',
      assigneeId: finalAssigneeId,
      assigneeName: finalAssigneeName,
      assignerId: assignerId,
      assignerName: assignerName,
      planStart: newTask.planStart || '',
      planEnd: planEndTime || '',
      dueDate: planEndTime?.split(' ')[0] || '',
      estimatedDays: newTask.estimatedDays || 0,
      estimatedHours: estimatedHours,
      description: newTask.sopContent || '',
      remarks: newTask.toolsRemarks || '',
      sourceType: 'dispatch',
      dispatchMode: 'farm',  // 农事任务标识，用于"我的任务"Tab分类
      materials: newTask.materials,
      tools: newTask.tools,
      toolsRemarks: newTask.toolsRemarks,
      requiredFeedback: newTask.requiredFeedback,
      typeConfig: newTask.typeConfig || {},
      status: taskStatus,
      types: newTask.types,
      typeLabel: typeLabels,
      field: fieldValue,
      assignee: finalAssigneeName,
      crop: cropValue,
      sopContent: newTask.sopContent || '',
    });

    // 重置状态
    handleClose();
    console.log('[CreateTaskModal] calling onCreated, created task id:', createdTask?.id);
    onCreated();
  };

  const handleSaveDraft = () => {
    let error = '';
    if (!newTask.taskId) {
      error = '请生成任务编号';
    } else if (newTask.types.length === 0) {
      error = '请选择任务类型';
    }

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    handleCreateTask(false);
  };

  const handleFinalCreate = () => {
    let error = '';
    if (!newTask.taskId) {
      error = '请生成任务编号';
    } else if (newTask.types.length === 0) {
      error = '请选择任务类型';
    } else if (newTask.fields.length === 0) {
      error = '请选择任务区域';
    } else if (newTask.crops.length === 0) {
      error = '请选择作物';
    }

    if (error) {
      setStepError(error);
      return;
    }

    setStepError('');
    handleCreateTask(true);
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setStepError('');
    setCreateStep(1);
    setNewTask(initialNewTask);
  };

  // 内部关闭模态框处理
  const handleModalClose = () => {
    setShowCreateModal(false);
    setStepError('');
    setCreateStep(1);
  };

  // 由于props不包含showCreateModal，需要用isOpen代替
  // 但是我们需要在内部维护这个状态来控制关闭时的重置
  const [showCreateModal, setShowCreateModal] = useState(isOpen);

  // 执行人列表状态（从数据字典加载）
  const [responsiblePersons, setResponsiblePersons] = useState<{ code: string; name: string }[]>([]);

  // 加载执行人列表
  useEffect(() => {
    async function loadResponsiblePersons() {
      try {
        const data = await getDictionaries('responsible_person');
        // 转换为下拉框需要的格式
        const persons = data.map(item => ({
          code: item.dictCode || item.code || '',
          name: item.dictLabel || item.name || ''
        })).filter(item => item.code || item.name);
        setResponsiblePersons(persons);
      } catch (error) {
        console.error('加载执行人列表失败:', error);
      }
    }
    if (showCreateModal) {
      loadResponsiblePersons();
    }
  }, [showCreateModal]);

  // 当isOpen变化时同步状态
  React.useEffect(() => {
    setShowCreateModal(isOpen);
    if (isOpen) {
      setStepError('');
      setCreateStep(1);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={showCreateModal}
      onClose={() => { handleModalClose(); onClose(); }}
      title="新建任务"
      size="xl"
      showFooter={false}
      bottomContent={
        <div className="flex justify-between">
          {createStep > 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateStep(createStep - 1)}
            >
              上一步
            </Button>
          )}
          {createStep === 2 ? (
            <div className="flex gap-2 ml-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
              >
                保存草稿
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleFinalCreate}
              >
                发布任务
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleNextStep}
              className="ml-auto"
            >
              下一步 <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      }
    >
      {stepError && (
        <div className="px-6 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{stepError}</span>
          </div>
        </div>
      )}

      {/* 步骤指示器 */}
      <div className="px-6 py-4 border-b border-gray-100 -mx-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${createStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>1</div>
            <span className="text-sm font-medium">任务定义</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-4">
            <div className={`h-full bg-emerald-500 transition-all ${createStep >= 2 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center gap-2 ${createStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>2</div>
            <span className="text-sm font-medium">资源与时间</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: 任务定义 */}
        {createStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 mb-1">任务编号</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={newTask.taskId || ''}
                    onChange={(e) => setNewTask({ ...newTask, taskId: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="点击下方生成按钮"
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setNewTask({ ...newTask, taskId: autoGenerateTaskCode(tasksHook.tasks) })}
                  >
                    生成
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-gray-700 mb-1">关联生产批次</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={newTask.batchCode || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTask(prev => ({ ...prev, batchCode: val, batchId: val ? prev.batchId : '' }));
                    }}
                    onFocus={() => setShowBatchDropdown(true)}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="搜索或选择生产批次..."
                  />
                  {showBatchDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {cropBatches
                        .filter(b =>
                          !newTask.batchCode ||
                          b.batchCode.toLowerCase().includes(newTask.batchCode.toLowerCase()) ||
                          b.cropName.includes(newTask.batchCode)
                        )
                        .slice(0, 10)
                        .map(batch => (
                          <div
                            key={batch.id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                            onClick={() => {
                              setNewTask(prev => ({
                                ...prev,
                                batchId: batch.id,
                                batchCode: batch.batchCode,
                              }));
                              setShowBatchDropdown(false);
                            }}
                          >
                            <div className="font-medium text-gray-900">{batch.batchCode}</div>
                            <div className="text-xs text-gray-500">{batch.cropName} · {batch.greenhouseName}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {showBatchDropdown && (
                  <div className="fixed inset-0 z-0" onClick={() => setShowBatchDropdown(false)} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 mb-1">任务区域 <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <div
                    className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                    onClick={() => setShowFieldDropdown(!showFieldDropdown)}
                  >
                    {(!newTask.fields || newTask.fields.length === 0) && (
                      <span className="text-gray-400 text-sm">请选择任务区域</span>
                    )}
                    {(newTask.fields || []).map((fieldValue: string) => {
                      const field = taskDispatchFields.find(f => f.name === fieldValue);
                      return (
                        <span
                          key={fieldValue}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                        >
                          {field?.name || fieldValue}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== fieldValue) });
                            }}
                            className="hover:text-red-500 h-4 w-4"
                          >
                            ×
                          </Button>
                        </span>
                      );
                    })}
                  </div>
                  {showFieldDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {taskDispatchFields.slice(0, 12).map(f => (
                        <Label
                          key={f.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            type="checkbox"
                            checked={(newTask.fields || []).includes(f.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, fields: [...(newTask.fields || []), f.name] });
                              } else {
                                setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== f.name) });
                              }
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{f.name}</span>
                        </Label>
                      ))}
                      <Label
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          type="checkbox"
                          checked={(newTask.fields || []).includes('other')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTask({ ...newTask, fields: [...(newTask.fields || []), 'other'] });
                            } else {
                              setNewTask({ ...newTask, fields: (newTask.fields || []).filter((v: string) => v !== 'other') });
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="text-sm text-gray-700">其他</span>
                      </Label>
                    </div>
                  )}
                </div>
                {showFieldDropdown && (
                  <div className="fixed inset-0 z-0" onClick={() => setShowFieldDropdown(false)} />
                )}
              </div>
              <div>
                <Label className="text-gray-700 mb-1">作物 <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <div
                    className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                    onClick={() => setShowCropDropdown(!showCropDropdown)}
                  >
                    {(!newTask.crops || newTask.crops.length === 0) && (
                      <span className="text-gray-400 text-sm">请选择作物</span>
                    )}
                    {(newTask.crops || []).map((cropValue: string) => (
                      <span
                        key={cropValue}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                      >
                        {cropValue}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewTask({ ...newTask, crops: (newTask.crops || []).filter((v: string) => v !== cropValue) });
                          }}
                          className="hover:text-red-500 h-4 w-4"
                        >
                          ×
                        </Button>
                      </span>
                    ))}
                  </div>
                  {showCropDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {uniqueCrops.map(crop => (
                        <Label
                          key={crop}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            type="checkbox"
                            checked={(newTask.crops || []).includes(crop)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTask({ ...newTask, crops: [...(newTask.crops || []), crop] });
                              } else {
                                setNewTask({ ...newTask, crops: (newTask.crops || []).filter((v: string) => v !== crop) });
                              }
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{crop}</span>
                        </Label>
                      ))}
                      <Label
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          type="checkbox"
                          checked={(newTask.crops || []).includes('other')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTask({ ...newTask, crops: [...(newTask.crops || []), 'other'] });
                            } else {
                              setNewTask({ ...newTask, crops: (newTask.crops || []).filter((v: string) => v !== 'other') });
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="text-sm text-gray-700">其他</span>
                      </Label>
                    </div>
                  )}
                </div>
                {showCropDropdown && (
                  <div className="fixed inset-0 z-0" onClick={() => setShowCropDropdown(false)} />
                )}
                {newTask.crops?.includes('other') && (
                  <div className="mt-2">
                    <Label className="text-gray-700 mb-1">作物备注 <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      value={newTask.cropRemarks || ''}
                      onChange={(e) => setNewTask({ ...newTask, cropRemarks: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="请输入作物说明"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-gray-700 mb-1">任务类型 <span className="text-red-500">*</span></Label>
              <div className="relative">
                <div
                  className="w-full min-h-[42px] px-3 py-2 border border-gray-400 rounded-lg bg-white cursor-pointer flex flex-wrap gap-1 items-center"
                  onClick={() => setShowTaskTypeDropdown(!showTaskTypeDropdown)}
                >
                  {(!newTask.types || newTask.types.length === 0) && (
                    <span className="text-gray-400 text-sm">请选择任务类型</span>
                  )}
                  {(newTask.types || []).map((typeValue: string) => {
                    const type = FARM_OPERATION_TYPES.find(t => t.value === typeValue);
                    return (
                      <span
                        key={typeValue}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm"
                      >
                        {type?.label || typeValue}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewTask({ ...newTask, types: newTask.types.filter(v => v !== typeValue) });
                          }}
                          className="hover:text-red-500 h-4 w-4"
                        >
                          ×
                        </Button>
                      </span>
                    );
                  })}
                </div>
                {showTaskTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {FARM_OPERATION_TYPES.map(t => (
                      <Label
                        key={t.value}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Input
                          type="checkbox"
                          checked={newTask.types.includes(t.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewTask({ ...newTask, types: [...newTask.types, t.value] });
                            } else {
                              setNewTask({ ...newTask, types: newTask.types.filter(v => v !== t.value) });
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{t.label}</span>
                      </Label>
                    ))}
                  </div>
                )}
              </div>
              {showTaskTypeDropdown && (
                <div className="fixed inset-0 z-0" onClick={() => setShowTaskTypeDropdown(false)} />
              )}
            </div>

            {newTask.types.includes('other') && (
              <div>
                <Label className="text-gray-700 mb-1">其他任务备注 <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={newTask.typeRemarks || ''}
                  onChange={(e) => setNewTask({ ...newTask, typeRemarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入其他任务说明"
                />
              </div>
            )}

            <TaskTypeConfigPanel
              taskTypes={newTask.types}
              configValues={newTask.typeConfig}
              onConfigChange={handleTypeConfigChange}
            />

            <div>
              <Label className="text-gray-700 mb-1">作业标准 (SOP)</Label>
              <TextArea
                value={newTask.sopContent}
                onChange={(e) => setNewTask({ ...newTask, sopContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="请输入作业标准...（简单任务可在此直接输入，复杂任务可点击导入文件）"
              />
              <div className="mt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="blue"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.doc,.docx,.pdf';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          setNewTask({ ...newTask, sopContent: content });
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                >
                  导入文件
                </Button>
                <span className="text-xs text-gray-500">支持 .txt, .doc, .docx, .pdf 格式</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 资源与时间 */}
        {createStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 mb-1">所需物资</Label>
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                {(!newTask.materials || newTask.materials.length === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-2">暂无所需物资</p>
                ) : (
                  newTask.materials.map((m, i) => (
                    <div key={`mat-${i}`} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={m.name}
                        onChange={(e) => {
                          const newMaterials = [...(newTask.materials || [])];
                          newMaterials[i].name = e.target.value;
                          setNewTask({ ...newTask, materials: newMaterials });
                        }}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                        placeholder="物资名称"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={m.qty}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.]/g, '');
                          if (raw === '' || raw === '-') {
                            const newMaterials = [...(newTask.materials || [])];
                            newMaterials[i].qty = 0;
                            setNewTask({ ...newTask, materials: newMaterials });
                            return;
                          }
                          const val = parseFloat(raw);
                          if (!isNaN(val)) {
                            const newMaterials = [...(newTask.materials || [])];
                            newMaterials[i].qty = Math.round(val * 100) / 100;
                            setNewTask({ ...newTask, materials: newMaterials });
                          }
                        }}
                        className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <Select
                        value={m.unit}
                        onValueChange={(val) => {
                          const newMaterials = [...(newTask.materials || [])];
                          newMaterials[i].unit = val;
                          setNewTask({ ...newTask, materials: newMaterials });
                        }}
                      >
                        <SelectTrigger className="px-2 py-1 border border-gray-200 rounded text-sm w-auto">
                          <SelectValue placeholder="个" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="个">个</SelectItem>
                          <SelectItem value="件">件</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="mL">mL</SelectItem>
                          <SelectItem value="袋">袋</SelectItem>
                          <SelectItem value="箱">箱</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newMaterials = (newTask.materials || []).filter((_, idx) => idx !== i);
                          setNewTask({ ...newTask, materials: newMaterials });
                        }}
                        className="text-red-500 hover:text-red-700 font-bold h-5 w-5"
                      >
                        ×
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setNewTask({ ...newTask, materials: [...(newTask.materials || []), { name: '', qty: 1, unit: '个' }] })}
                >
                  + 物资
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 mb-1">所需工具</Label>
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                {(!newTask.tools || newTask.tools.length === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-2">暂无所需工具</p>
                ) : (
                  newTask.tools.map((t, i) => (
                    <div key={`tool-${i}`} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={t.name}
                        onChange={(e) => {
                          const newTools = [...(newTask.tools || [])];
                          newTools[i].name = e.target.value;
                          setNewTask({ ...newTask, tools: newTools });
                        }}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                        placeholder="工具名称"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={t.qty}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.]/g, '');
                          if (raw === '' || raw === '-') {
                            const newTools = [...(newTask.tools || [])];
                            newTools[i].qty = 0;
                            setNewTask({ ...newTask, tools: newTools });
                            return;
                          }
                          const val = parseFloat(raw);
                          if (!isNaN(val)) {
                            const newTools = [...(newTask.tools || [])];
                            newTools[i].qty = Math.round(val * 100) / 100;
                            setNewTask({ ...newTask, tools: newTools });
                          }
                        }}
                        className="w-16 px-2 py-1 border border-gray-200 rounded text-sm"
                      />
                      <Select
                        value={t.unit}
                        onValueChange={(val) => {
                          const newTools = [...(newTask.tools || [])];
                          newTools[i].unit = val;
                          setNewTask({ ...newTask, tools: newTools });
                        }}
                      >
                        <SelectTrigger className="px-2 py-1 border border-gray-200 rounded text-sm w-auto">
                          <SelectValue placeholder="把" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="把">把</SelectItem>
                          <SelectItem value="个">个</SelectItem>
                          <SelectItem value="台">台</SelectItem>
                          <SelectItem value="套">套</SelectItem>
                          <SelectItem value="件">件</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newTools = (newTask.tools || []).filter((_, idx) => idx !== i);
                          setNewTask({ ...newTask, tools: newTools });
                        }}
                        className="text-red-500 hover:text-red-700 font-bold h-5 w-5"
                      >
                        ×
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setNewTask({ ...newTask, tools: [...(newTask.tools || []), { name: '', qty: 1, unit: '把' }] })}
                >
                  + 工具
                </Button>
              </div>
            </div>
            {/* 资源备注 */}
            <div>
              <Label className="text-gray-700 mb-1">备注（可选）</Label>
              <TextArea
                value={newTask.toolsRemarks || ''}
                onChange={(e) => setNewTask({ ...newTask, toolsRemarks: e.target.value })}
                placeholder="补充说明资源相关要求"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* 时间与要求 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* 工作制 */}
              <div>
                <Label className="text-gray-700 mb-1">工作制</Label>
                <Select
                  value={String(newTask.workHoursPerDay)}
                  onValueChange={(val) => {
                    const newWorkHours = Number(val);
                    setNewTask({ ...newTask, workHoursPerDay: newWorkHours });
                    if ((newTask.estimatedHours || 0) >= newWorkHours) {
                      setNewTask({ ...newTask, workHoursPerDay: newWorkHours, estimatedHours: newWorkHours - 1 });
                    }
                  }}
                >
                  <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <SelectValue placeholder="8小时/天" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8小时/天</SelectItem>
                    <SelectItem value="10">10小时/天</SelectItem>
                    <SelectItem value="12">12小时/天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* 计划开始日期 */}
              <div>
                <Label className="text-gray-700 mb-1">开始日期 <span className="text-red-500">*</span></Label>
                <DatePicker
                  selected={newTask.planStart ? new Date(newTask.planStart.split(' ')[0]) : undefined}
                  onChange={(date) => {
                    const timePart = newTask.planStart?.split(' ')[1] || '08:00';
                    setNewTask({ ...newTask, planStart: date.toISOString().split('T')[0] + ' ' + timePart });
                  }}
                  placeholder="选择开始日期"
                />
              </div>
              {/* 开始时间 */}
              <div>
                <Label className="text-gray-700 mb-1">开始时间</Label>
                <Select
                  value={newTask.planStart?.split(' ')[1] || '08:00'}
                  onValueChange={(val) => {
                    const datePart = newTask.planStart?.split(' ')[0] || '';
                    setNewTask({ ...newTask, planStart: datePart + ' ' + val });
                  }}
                >
                  <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <SelectValue placeholder="08:00" />
                  </SelectTrigger>
                  <SelectContent>
                    {[7,8,9,10,11,12,13,14,15,16,17,18,19].map(h => (
                      <SelectItem key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 天数 */}
              <div>
                <Label className="text-gray-700 mb-1">天数</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={newTask.estimatedDays || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
                    setNewTask({ ...newTask, estimatedDays: isNaN(val) ? 0 : val });
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {/* 小时 */}
              <div>
                <Label className="text-gray-700 mb-1">小时 <span className="text-xs text-gray-400">(最大{(newTask.workHoursPerDay || 8) - 1})</span></Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={newTask.estimatedHours || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/[^\d]/g, ''), 10);
                    const maxHours = (newTask.workHoursPerDay || 8) - 1;
                    if (!isNaN(val) && val >= 0 && val <= maxHours) {
                      setNewTask({ ...newTask, estimatedHours: val });
                    } else if (isNaN(val) || val === 0) {
                      setNewTask({ ...newTask, estimatedHours: 0 });
                    }
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            {/* 任务截止时间自动计算显示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700">
                  任务截止时间：
                </span>
                <span className="text-sm font-medium text-blue-900">
                  {newTask.planStart ? calculateEndDateTime(newTask.planStart, newTask.estimatedDays || 0, newTask.estimatedHours || 0, newTask.workHoursPerDay || 8) : '-'}
                </span>
                <span className="text-xs text-blue-500">
                  (共 {(newTask.estimatedDays || 0) * (newTask.workHoursPerDay || 8) + (newTask.estimatedHours || 0)} 小时)
                </span>
              </div>
            </div>
            <div>
              <Label className="text-gray-700 mb-1">优先级</Label>
              <Select
                value={newTask.priority}
                onValueChange={(val) => setNewTask({ ...newTask, priority: val })}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="普通" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">普通</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 班组选择（数据来自农事管理-班组分配，选择后自动提示该班组成员） */}
            <div>
              <Label className="text-gray-700 mb-1">
                班组 <span className="text-xs text-gray-400">（来自农事管理-班组分配）</span>
              </Label>
              <Select
                value={newTask.teamId || ''}
                onValueChange={(val) => {
                  const selectedTeam = teams.find(t => t.id === val);
                  setNewTask({
                    ...newTask,
                    teamId: val,
                    teamName: selectedTeam?.name || '',
                  });
                }}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50">
                  <SelectValue placeholder="不关联班组（直接选人）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不关联班组（直接选人）</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}（{team.memberCount}人 - {team.workZone || '未分配区域'}）</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newTask.teamId && (
                <p className="text-xs text-blue-600 mt-1">
                  已选班组：{newTask.teamName}，请在下方选择该班组成员作为执行人
                </p>
              )}
            </div>
            {/* 执行人选择 */}
            <div>
              <Label className="text-gray-700 mb-1">执行人</Label>
              <Select
                value={newTask.assignee || ''}
                onValueChange={(val) => setNewTask({ ...newTask, assignee: val })}
              >
                <SelectTrigger className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="请选择执行人" />
                </SelectTrigger>
                <SelectContent>                  {responsiblePersons.map(person => (
                    <SelectItem key={person.code || person.name} value={person.name}>{person.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-bold text-red-600 mb-2">必填反馈 <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'workload_confirm', label: '工作量确认', icon: Clock, iconBg: 'bg-emerald-500', iconColor: 'text-white' },
                  { key: 'gps', label: '位置打卡', icon: MapPin, iconBg: 'bg-blue-500', iconColor: 'text-white' },
                  { key: 'material', label: '物资扫码', icon: Package, iconBg: 'bg-amber-500', iconColor: 'text-white' },
                  { key: 'photo_before', label: '作业前照片', icon: Camera, iconBg: 'bg-purple-500', iconColor: 'text-white' },
                  { key: 'photo_after', label: '作业后照片', icon: Camera, iconBg: 'bg-pink-500', iconColor: 'text-white' },
                  { key: 'voice', label: '语音备注', icon: Mic, iconBg: 'bg-teal-500', iconColor: 'text-white' },
                ].map(item => {
                  const isSelected = newTask.requiredFeedback.includes(item.key);
                  const Icon = item.icon;
                  return (
                    <Label
                      key={item.key}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-gray-100 border-2 border-emerald-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'}`}
                    >
                      <Input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTask({ ...newTask, requiredFeedback: [...newTask.requiredFeedback, item.key] });
                          } else {
                            setNewTask({ ...newTask, requiredFeedback: newTask.requiredFeedback.filter(f => f !== item.key) });
                          }
                        }}
                        className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 sr-only"
                      />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? item.iconBg : 'bg-gray-200'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? item.iconColor : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</span>
                    </Label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
