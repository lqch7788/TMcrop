import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { showAlert } from '@/lib/dialogService';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import type { PieceRate, PieceworkFormData } from './types';
import { useTempWorkerStore } from '@/stores/useTempWorkerStore';
import { taskOptions } from './hooks/usePiecework';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/DatePicker';
import { NumberInput } from '@/components/ui/NumberInput';
import { Label } from '@/components/ui/label';

// 单位选项（共享常量）
const unitOptions = ['斤', '箱', '个', 'kg', '筐'];

interface PieceworkFormModalProps {
  record: PieceRate | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: PieceworkFormData) => void;
}

export const PieceworkFormModal: React.FC<PieceworkFormModalProps> = ({
  record,
  open,
  onClose,
  onConfirm,
}) => {
  const [formData, setFormData] = useState<PieceworkFormData>({
    workerId: '',
    taskId: '',
    unit: '斤',
    quantity: 0,
    unitPrice: 0,
    workDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        workerId: record.workerId,
        taskId: record.taskId,
        unit: record.unit,
        quantity: record.quantity,
        unitPrice: record.unitPrice,
        workDate: record.workDate,
        remarks: record.remarks || '',
      });
    } else {
      setFormData({
        workerId: '',
        taskId: '',
        unit: '斤',
        quantity: 0,
        unitPrice: 0,
        workDate: new Date().toISOString().split('T')[0],
        remarks: '',
      });
    }
  }, [record, open]);

  // 计算总工资
  const total = formData.quantity * formData.unitPrice;

  const handleSubmit = () => {
    const workers = useTempWorkerStore.getState().workers;
    const worker = workers.find((w) => w.id === formData.workerId);
    const task = taskOptions.find((t) => t.id === formData.taskId);

    if (!worker || !task) {
      showAlert('请选择员工和任务');
      return;
    }

    if (formData.quantity <= 0 || formData.unitPrice <= 0) {
      showAlert('数量和单价必须大于0');
      return;
    }

    onConfirm({
      ...formData,
      workerName: worker.name,
      taskName: task.name,
    });
  };

  if (!open) return null;

  const content = (
    <div className="space-y-4">
      {/* 员工选择 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          员工姓名 <span className="text-red-500">*</span>
        </Label>
        <select
          value={formData.workerId}
          onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">请选择员工</option>
          {useTempWorkerStore.getState().workers
            .filter((w) => w.status === '在职')
            .map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name} ({worker.workerType})
              </option>
            ))}
        </select>
      </div>

      {/* 任务选择 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          任务名称 <span className="text-red-500">*</span>
        </Label>
        <select
          value={formData.taskId}
          onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">请选择任务</option>
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </div>

      {/* 单位和数量 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            单位 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            数量 <span className="text-red-500">*</span>
          </Label>
          <NumberInput
            value={formData.quantity || 0}
            onChange={(value) => setFormData({ ...formData, quantity: parseFloat(value) || 0 })}
            placeholder="0"
            min={0}
            className="w-full"
          />
        </div>
      </div>

      {/* 单价 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          单价(元) <span className="text-red-500">*</span>
        </Label>
        <NumberInput
          value={formData.unitPrice || 0}
          onChange={(value) => setFormData({ ...formData, unitPrice: parseFloat(value) || 0 })}
          placeholder="0.00"
          decimals={2}
          min={0}
          className="w-full"
        />
      </div>

      {/* 工作日期 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          工作日期 <span className="text-red-500">*</span>
        </Label>
        <DatePicker
          selected={formData.workDate ? new Date(formData.workDate) : undefined}
          onChange={(date) => setFormData({ ...formData, workDate: date.toISOString().split('T')[0] })}
          className="w-full"
        />
      </div>

      {/* 备注 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          备注
        </Label>
        <textarea
          value={formData.remarks || ''}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          rows={2}
          placeholder="可选"
        />
      </div>

      {/* 总工资预览 */}
      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-emerald-700">合计工资</span>
          <span className="text-xl font-bold text-emerald-600">
            <span className="inline-flex items-center gap-0.5">
              <Coins className="w-4 h-4" />
              {total.toFixed(2)}
            </span>
          </span>
        </div>
        <div className="text-xs text-emerald-600 mt-1">
          {formData.quantity} {formData.unit} × {formData.unitPrice}元
        </div>
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        取消
      </Button>
      <Button onClick={handleSubmit}>
        确认
      </Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={record ? '编辑计件记录' : '新建计件记录'}
      size="xl"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
};

export default PieceworkFormModal;
