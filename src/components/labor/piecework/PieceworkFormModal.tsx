import React, { useState, useEffect } from 'react';
import { X, Coins } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { PieceRate, PieceworkFormData } from './types';
import { mockTempWorkers } from '../tempWorker/mockData';

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

  // 任务选项（简化）
  const taskOptions = [
    { id: 'T001', name: '番茄采收' },
    { id: 'T002', name: '黄瓜分装' },
    { id: 'T003', name: '辣椒采收' },
    { id: 'T004', name: '茄子打包' },
    { id: 'T005', name: '番茄包装' },
  ];

  // 单位选项
  const unitOptions = ['斤', '箱', '个', 'kg', '筐'];

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
    const worker = mockTempWorkers.find((w) => w.id === formData.workerId);
    const task = taskOptions.find((t) => t.id === formData.taskId);

    if (!worker || !task) {
      alert('请选择员工和任务');
      return;
    }

    if (formData.quantity <= 0 || formData.unitPrice <= 0) {
      alert('数量和单价必须大于0');
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          员工姓名 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.workerId}
          onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">请选择员工</option>
          {mockTempWorkers
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          任务名称 <span className="text-red-500">*</span>
        </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            单位 <span className="text-red-500">*</span>
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            数量 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.quantity || ''}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      {/* 单价 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          单价(元) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Coins className="w-4 h-4" />
          </span>
          <input
            type="number"
            value={formData.unitPrice || ''}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* 工作日期 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          工作日期 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.workDate}
          onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          备注
        </label>
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
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        取消
      </button>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
      >
        确认
      </button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={record ? '编辑计件记录' : '新建计件记录'}
      size="md"
      showFooter={true}
      headerAction={
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
};

export default PieceworkFormModal;
