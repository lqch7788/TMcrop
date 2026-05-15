/**
 * 新增农事操作记录弹窗
 * 支持手动录入操作记录
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { useOperationRecords } from '../../../../hooks/useOperationRecords';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { useGreenhouseStore, useWorkerStore } from '../../../../stores';

// 物料选项（静态配置，非动态数据）
const materialOptions = [
  '番茄苗', '黄瓜苗', '草莓苗', '生根剂',
  '水溶肥', '有机肥', '复合肥', '多菌灵',
  '吡虫啉', '周转箱', '滴灌带', '钾肥',
  '氮肥', '磷肥', '微生物菌剂', '其他'
];

// 工作量单位选项（静态配置）
const workloadUnitOptions = [
  { value: '株', label: '株' },
  { value: '㎡', label: '平方米' },
  { value: 'kg', label: '公斤' },
  { value: '米', label: '米' },
  { value: '袋', label: '袋' },
  { value: '亩', label: '亩' },
];

interface AddOperationRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddOperationRecordModal({ isOpen, onClose }: AddOperationRecordModalProps) {
  const { addRecord } = useOperationRecords();
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);

  useEffect(() => {
    if (greenhouses.length === 0) loadGreenhouses();
    if (workers.length === 0) loadWorkers();
  }, [greenhouses.length, loadGreenhouses, workers.length, loadWorkers]);

  // 温室选项（从Store获取）
  const greenhouseOptions = useMemo(() =>
    greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name })),
    [greenhouses]
  );

  // 操作人员选项（从Store获取）
  const operatorOptions = useMemo(() =>
    workers.filter(w => w.status === 'active').map(w => ({ value: w.id, label: w.name })),
    [workers]
  );

  // 表单状态
  const [formData, setFormData] = useState({
    operationType: '',
    greenhouseId: '',
    cropName: '',
    variety: '',
    operatorId: '',
    operationDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    workload: '',
    unit: '株',
    materials: [] as string[],
    remarks: '',
    progress: 100,
    status: 'completed',
  });

  // 物料下拉状态
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);

  // 重置表单
  const resetForm = () => {
    setFormData({
      operationType: '',
      greenhouseId: '',
      cropName: '',
      variety: '',
      operatorId: '',
      operationDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      workload: '',
      unit: '株',
      materials: [],
      remarks: '',
      progress: 100,
      status: 'completed',
    });
    setMaterialDropdownOpen(false);
  };

  // 关闭弹窗
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 物料切换
  const toggleMaterial = (material: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material],
    }));
  };

  // 保存记录
  const handleSave = () => {
    // 获取温室信息
    const greenhouse = greenhouseOptions.find(g => g.value === formData.greenhouseId);
    const operator = operatorOptions.find(o => o.value === formData.operatorId);

    // 计算工作时长
    let duration: number | undefined;
    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      duration = (eh * 60 + em) - (sh * 60 + sm);
    }

    // 添加记录
    addRecord({
      operationType: formData.operationType,
      operationTypeName: FARM_OPERATION_TYPES.find(t => t.value === formData.operationType)?.label || formData.operationType,
      status: formData.status,
      greenhouseId: formData.greenhouseId,
      greenhouseName: greenhouse?.label || '',
      cropName: formData.cropName,
      variety: formData.variety,
      operatorId: formData.operatorId,
      operatorName: operator?.label || '',
      operationDate: formData.operationDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      duration,
      workload: formData.workload ? Number(formData.workload) : undefined,
      unit: formData.unit,
      materials: formData.materials.map(name => ({ name, qty: 0, unit: '' })),
      remarks: formData.remarks,
      progress: formData.progress,
    });

    handleClose();
  };

  // 检查必填
  const canSave = formData.operationType && formData.greenhouseId && formData.operatorId && formData.operationDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="新增农事操作记录"
      size="lg"
      onSubmit={handleSave}
      submitText="保存"
      cancelText="取消"
      submitDisabled={!canSave}
    >
      <div className="space-y-4">
        {/* 第一行：操作类型、操作区域、操作人员 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.operationType}
              onChange={(e) => setFormData({ ...formData, operationType: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择</option>
              {FARM_OPERATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作区域 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.greenhouseId}
              onChange={(e) => setFormData({ ...formData, greenhouseId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择</option>
              {greenhouseOptions.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作人员 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.operatorId}
              onChange={(e) => setFormData({ ...formData, operatorId: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">请选择</option>
              {operatorOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 第二行：作物名称、品种、操作日期 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
            <input
              type="text"
              value={formData.cropName}
              onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
              placeholder="请输入作物名称"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
            <input
              type="text"
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
              placeholder="请输入品种"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.operationDate}
              onChange={(e) => setFormData({ ...formData, operationDate: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 第三行：开始时间、结束时间、工作量 */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工作量</label>
            <input
              type="number"
              value={formData.workload}
              onChange={(e) => setFormData({ ...formData, workload: e.target.value })}
              placeholder="数量"
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {workloadUnitOptions.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 物料选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">使用物料</label>
          <div className="relative">
            <div
              onClick={() => setMaterialDropdownOpen(!materialDropdownOpen)}
              className="w-full min-h-[40px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white cursor-pointer flex items-center flex-wrap gap-1"
            >
              {formData.materials.length === 0 ? (
                <span className="text-gray-400">请选择物料</span>
              ) : (
                formData.materials.map(m => (
                  <span key={m} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                    {m}
                  </span>
                ))
              )}
            </div>
            {materialDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {materialOptions.map(m => (
                  <label
                    key={m}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.materials.includes(m)}
                      onChange={() => toggleMaterial(m)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 mr-2"
                    />
                    <span className="text-sm text-gray-700">{m}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 备注 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="请输入备注信息"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
