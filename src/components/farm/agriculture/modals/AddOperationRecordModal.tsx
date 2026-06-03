/**
 * 新增农事操作记录弹窗
 * 支持手动录入操作记录
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { DatePicker } from '../../../ui/DatePicker';
import { TextArea } from '../../../ui/TextArea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../ui/select';
import { useOperationRecords } from '../../../../hooks/useOperationRecords';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { useGreenhouseStore, useWorkerStore, useWarehouseMaterialStore } from '../../../../stores';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

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

  // 仓库物料主数据（用于动态生成物料多选下拉，已废弃硬编码 materialOptions）
  const warehouseMaterials = useWarehouseMaterialStore((s) => s.items);
  const loadWarehouseMaterials = useWarehouseMaterialStore((s) => s.loadItems);
  useEffect(() => {
    if (isOpen && warehouseMaterials.length === 0) loadWarehouseMaterials();
  }, [isOpen, warehouseMaterials.length, loadWarehouseMaterials]);

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

  // 动态物料多选选项：来自仓库物料主数据，保留"其他"作为兜底
  const materialOptions = useMemo(() => {
    const names = warehouseMaterials
      .filter((m) => !m.dataStatus || m.dataStatus === '启用')
      .map((m) => m.name)
      .filter(Boolean);
    if (!names.includes('其他')) names.push('其他');
    return Array.from(new Set(names));
  }, [warehouseMaterials]);

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
            <Label className="text-gray-700">
              操作类型 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.operationType}
              onValueChange={(val) => setFormData({ ...formData, operationType: val })}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {FARM_OPERATION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">
              操作区域 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.greenhouseId}
              onValueChange={(val) => setFormData({ ...formData, greenhouseId: val })}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {greenhouseOptions.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">
              操作人员 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.operatorId}
              onValueChange={(val) => setFormData({ ...formData, operatorId: val })}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 第二行：作物名称、品种、操作日期 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-700">作物名称</Label>
            <Input
              type="text"
              value={formData.cropName}
              onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
              placeholder="请输入作物名称"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700">品种</Label>
            <Input
              type="text"
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
              placeholder="请输入品种"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700">
              操作日期 <span className="text-red-500">*</span>
            </Label>
            <DatePicker
              selected={formData.operationDate ? new Date(formData.operationDate) : undefined}
              onChange={(date) => setFormData({ ...formData, operationDate: date.toISOString().split('T')[0] })}
              className="w-full"
            />
          </div>
        </div>

        {/* 第三行：开始时间、结束时间、工作量 */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label className="text-gray-700">开始时间</Label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700">结束时间</Label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700">工作量</Label>
            <Input
              type="number"
              value={formData.workload}
              onChange={(e) => setFormData({ ...formData, workload: e.target.value })}
              placeholder="数量"
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700">单位</Label>
            <Select
              value={formData.unit}
              onValueChange={(val) => setFormData({ ...formData, unit: val })}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="选择单位" />
              </SelectTrigger>
              <SelectContent>
                {workloadUnitOptions.map(u => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 物料选择 */}
        <div>
          <Label className="text-gray-700">使用物料</Label>
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
                  <Label
                    key={m}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Input
                      type="checkbox"
                      checked={formData.materials.includes(m)}
                      onChange={() => toggleMaterial(m)}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 mr-2"
                    />
                    <span className="text-sm text-gray-700">{m}</span>
                  </Label>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/warehouse-overview"
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline mt-1 inline-block"
          >
            没找到物料？去物料总览添加
          </Link>
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-700">备注</Label>
          <TextArea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="请输入备注信息"
            rows={3}
            className={deepInputClass + " resize-none"}
          />
        </div>
      </div>
    </Modal>
  );
}
