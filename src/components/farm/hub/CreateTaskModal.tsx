/**
 * 农事任务中心 - 新建任务弹窗
 * 样式与现有弹窗统一
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTasks, Task } from '../../../hooks/useTasks';
import { useUserStore, useGreenhouseStore, useProductionPlanStore, usePesticideLibraryStore, usePestDiseaseDictStore } from '../../../stores';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import type { User } from '../../../types';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Label, DatePicker } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { DictSelect } from '@/components/common/settings/DictSelect';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
  prefillData?: {
    title?: string;
    description?: string;
    sourceType?: 'problem' | 'inspection';
    sourceId?: string;
    greenhouseName?: string;
  };
}

type Worker = User & {
  skills?: string[];
  currentLoad?: number;
};

// 药剂条目（病虫害防治用）
interface PesticideItem {
  name: string;       // 药剂名称
  type: string;       // 药剂类型
  dosage: number;      // 用药量
  unit: string;       // 单位
  ratio: string;      // 稀释倍数
}

/**
 * 新建任务弹窗组件
 */
export function CreateTaskModal({ onClose, onCreated, prefillData }: CreateTaskModalProps) {
  const { createTask } = useTasks();
  const users = useUserStore((state) => state.users);
  const loadUsers = useUserStore((state) => state.loadUsers);
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loadGreenhouses = useGreenhouseStore((state) => state.loadGreenhouses);
  const storePlans = useProductionPlanStore((state) => state.batches);
  const fetchPlans = useProductionPlanStore((state) => state.fetchPlans);
  const pesticideStore = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();

  useEffect(() => {
    if (users.length === 0) {
      loadUsers();
    }
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
    if (storePlans.length === 0) {
      fetchPlans();
    }
  }, [users.length, loadUsers, greenhouses.length, loadGreenhouses, storePlans.length, fetchPlans]);

  // 从Store计算生产批次列表
  const cropBatches = useMemo(() => storePlans.map(p => ({
    id: p.id,
    batchCode: p.batchCode,
    cropName: (p as any).cropName || (p as any).cropTypeName || '',
    batchStatus: (p as any).batchStatus || (p as any).status,
  })), [storePlans]);

  const [title, setTitle] = useState(prefillData?.title || '');
  const [description, setDescription] = useState(prefillData?.description || '');
  const [taskType, setTaskType] = useState('irrigation');
  const [batchCode, setBatchCode] = useState('');
  const [area, setArea] = useState('');
  const [greenhouse, setGreenhouse] = useState(prefillData?.greenhouseName || '');
  const [plannedDate, setPlannedDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(2);
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 病虫害防治专用：药剂列表
  const [pesticides, setPesticides] = useState<PesticideItem[]>([]);
  // 病虫害防治专用：目标病虫害
  const [targetPests, setTargetPests] = useState<string[]>([]);

  // 药剂选项（化学防治用）
  const pesticideOptions = useMemo(() =>
    pesticideStore.items
      .filter(p => p.controlType === 'chemical')
      .map(p => ({
        value: p.pesticideName,
        label: p.pesticideName,
        searchText: `${p.pesticideCode} ${p.functionDesc || ''}`,
      })),
    [pesticideStore.items]
  );

  // 病虫害选项（用于搜索选择）
  const pestDiseaseOptions = useMemo(() =>
    pestDiseaseStore.items.map(p => ({
      value: p.dictName,
      label: p.dictName,
      searchText: `${p.dictCode} ${p.targetCrops || ''}`,
    })),
    [pestDiseaseStore.items]
  );

  // 加载药剂库和病虫害字典
  useEffect(() => {
    pesticideStore.fetchItems();
    pestDiseaseStore.fetchItems();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      await showAlert('请输入任务标题');
      return;
    }
    if (!greenhouse.trim()) {
      await showAlert('请选择执行区域');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedWorker = workers.find(w => w.id === assigneeId);

      // 使用 useTasks.createTask 创建任务，这样 React 状态会正确更新
      // 状态：如果选择了执行人则为 'pending'，否则为 'draft'
      createTask({
        title: title.trim(),
        description: description.trim(),
        type: taskType,
        typeName: FARM_OPERATION_TYPES.find(t => t.value === taskType)?.label || taskType,
        batchCode,
        greenhouseName: greenhouse,
        plannedDate,
        estimatedHours,
        dueDate: plannedDate,
        priority,
        assigneeId,
        assigneeName: selectedWorker?.name || '',
        sourceType: prefillData?.sourceType as any,
        sourceId: prefillData?.sourceId,
        dispatchMode: 'farm',
      }, 'farm', assigneeId ? 'pending' : 'draft');

      onCreated();
    } catch (error) {
      // 创建任务失败
      await showAlert('创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* 头部 - 使用现有弹窗样式 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-white">新建任务</h3>
            {prefillData?.sourceType && (
              <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded">
                从{profillData.sourceType === 'problem' ? '问题' : '巡查'}创建
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 任务信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">任务信息</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-gray-600 mb-1">任务标题 <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入任务标题"
                  className={deepInputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-600 mb-1">任务类型</Label>
                  <Select
                    value={taskType}
                    onValueChange={(val) => setTaskType(val)}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {FARM_OPERATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600 mb-1">关联批次</Label>
                  <Select
                    value={batchCode}
                    onValueChange={(val) => setBatchCode(val)}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择批次" />
                    </SelectTrigger>
                    <SelectContent>
                      {cropBatches.map((batch) => (
                        <SelectItem key={batch.batchCode} value={batch.batchCode}>
                          {batch.batchCode} - {batch.cropName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-600 mb-1">执行区域 <span className="text-red-500">*</span></Label>
                  <Select
                    value={greenhouse}
                    onValueChange={(val) => setGreenhouse(val)}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择区域" />
                    </SelectTrigger>
                    <SelectContent>
                      {greenhouses.map((gh) => (
                        <SelectItem key={gh.id} value={gh.name}>{gh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600 mb-1">计划日期</Label>
                  <DatePicker
                    selected={plannedDate ? new Date(plannedDate) : undefined}
                    onChange={(date) => setPlannedDate(date.toISOString().split('T')[0])}
                    placeholder="选择计划日期"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-600 mb-1">预计工时</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className={deepInputClass}
                    />
                    <span className="text-sm text-gray-500">小时</span>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600 mb-1">优先级</Label>
                  <Select
                    value={priority}
                    onValueChange={(val) => setPriority(val as any)}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="中" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">紧急</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 执行人选择 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">执行人选择</h4>
            <div className="space-y-2">
              <Label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${!assigneeId ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}>
                <Input
                  type="radio"
                  name="assignee"
                  value=""
                  checked={!assigneeId}
                  onChange={() => setAssigneeId('')}
                  className="w-4 h-4 text-emerald-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">保存草稿</p>
                  <p className="text-xs text-gray-500">暂不分派，稍后手动派发</p>
                </div>
              </Label>

              {workers.map((worker) => (
                <Label
                  key={worker.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${assigneeId === worker.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                >
                  <Input
                    type="radio"
                    name="assignee"
                    value={worker.id}
                    checked={assigneeId === worker.id}
                    onChange={() => setAssigneeId(worker.id)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                    {worker.department && (
                      <p className="text-xs text-gray-500">{worker.department}</p>
                    )}
                  </div>
                </Label>
              ))}
            </div>
          </div>

          {/* 任务描述 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">任务描述</h4>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入任务详细描述..."
              rows={3}
              className={`${deepInputClass} resize-none`}
            />
          </div>

          {/* 病虫害防治专用配置 */}
          {taskType === 'pest_control' && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <h4 className="text-sm font-bold text-gray-900 mb-3">病虫害防治配置</h4>
              <div className="space-y-3">
                {/* 目标病虫害 */}
                <div>
                  <Label className="text-gray-700 text-xs mb-1 block">目标病虫害</Label>
                  <div className="space-y-2">
                    {targetPests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {targetPests.map((pest, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
                          >
                            {pest}
                            <button
                              type="button"
                              onClick={() => setTargetPests(targetPests.filter((_, i) => i !== idx))}
                              className="ml-1.5 text-orange-500 hover:text-orange-700 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <SearchableSelect
                      value=""
                      onChange={(val) => {
                        if (val && !targetPests.includes(val)) {
                          setTargetPests([...targetPests, val]);
                        }
                      }}
                      options={pestDiseaseOptions.filter(p => !targetPests.includes(p.value))}
                      placeholder="搜索添加目标病虫害"
                    />
                  </div>
                </div>

                {/* 药剂列表 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-gray-700 text-xs">药剂列表</Label>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setPesticides([...pesticides, { name: '', type: '', dosage: 0, unit: '克', ratio: '' }]);
                      }}
                    >
                      <Plus className="w-4 h-4" /> + 新增药剂
                    </Button>
                  </div>
                  {pesticides.length === 0 ? (
                    <div className="text-center text-gray-400 py-4 text-sm border border-dashed border-gray-300 rounded-lg">
                      点击上方"新增药剂"添加
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pesticides.map((item, index) => (
                        <div key={index} className="grid grid-cols-6 gap-2 items-end bg-white p-2 rounded-lg">
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">药剂名称</Label>
                            <SearchableSelect
                              value={item.name}
                              onChange={(val) => {
                                const newList = [...pesticides];
                                newList[index] = { ...item, name: val };
                                setPesticides(newList);
                              }}
                              options={pesticideOptions}
                              placeholder="选择药剂"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">类型</Label>
                            <DictSelect
                              category="pesticide_type"
                              value={item.type}
                              onChange={(val) => {
                                const newList = [...pesticides];
                                newList[index] = { ...item, type: val };
                                setPesticides(newList);
                              }}
                              placeholder="类型"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">用药量</Label>
                            <Input
                              type="number"
                              value={item.dosage || ''}
                              onChange={(e) => {
                                const newList = [...pesticides];
                                newList[index] = { ...item, dosage: Number(e.target.value) };
                                setPesticides(newList);
                              }}
                              min="0"
                              placeholder="0"
                              className={deepInputClass}
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">单位</Label>
                            <UnitDictSelect
                              value={item.unit}
                              onChange={(val) => {
                                const newList = [...pesticides];
                                newList[index] = { ...item, unit: val };
                                setPesticides(newList);
                              }}
                              placeholder="克 (g)"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-700 text-xs mb-1 block">稀释倍数</Label>
                            <Input
                              type="text"
                              value={item.ratio}
                              onChange={(e) => {
                                const newList = [...pesticides];
                                newList[index] = { ...item, ratio: e.target.value };
                                setPesticides(newList);
                              }}
                              placeholder="如: 1000"
                              className={deepInputClass}
                            />
                          </div>
                          <div className="mb-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setPesticides(pesticides.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="w-4 h-4" /> 删除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !greenhouse.trim()}
          >
            {isSubmitting ? '创建中...' : assigneeId ? '直接派发' : '保存草稿'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateTaskModal;
