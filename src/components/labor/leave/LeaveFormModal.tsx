import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { LeaveFormModalProps, LeaveRecord, LeaveType } from './types';

/**
 * 请假表单弹窗组件（新建/编辑）
 */
export function LeaveFormModal({ record, open, onClose, onSave }: LeaveFormModalProps) {
  const [formData, setFormData] = useState<Partial<LeaveRecord>>({
    staffName: '',
    leaveType: '事假',
    startDate: '',
    endDate: '',
    days: 0,
    reason: '',
    remarks: '',
  });

  // 当弹窗打开或 record 变化时，初始化表单数据
  useEffect(() => {
    if (open) {
      if (record) {
        setFormData(record);
      } else {
        // 新建时设置默认值
        setFormData({
          staffName: '',
          leaveType: '事假',
          startDate: '',
          endDate: '',
          days: 0,
          reason: '',
          remarks: '',
        });
      }
    }
  }, [open, record]);

  if (!open) return null;

  const leaveTypes: LeaveType[] = ['事假', '病假', '年假', '婚假', '产假', '陪产假', '丧假', '工伤假'];

  const handleChange = (field: keyof LeaveRecord, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 计算请假天数
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newData = { ...formData, [field]: value };
    if (field === 'startDate') {
      newData.days = calculateDays(value, formData.endDate || '');
    } else {
      newData.days = calculateDays(formData.startDate || '', value);
    }
    setFormData(newData);
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const content = (
    <div className="grid grid-cols-2 gap-4">
      {/* 员工姓名 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          员工姓名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.staffName || ''}
          onChange={(e) => handleChange('staffName', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          placeholder="请输入员工姓名"
        />
      </div>

      {/* 请假类型 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          请假类型 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.leaveType || ''}
          onChange={(e) => handleChange('leaveType', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {leaveTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* 开始日期 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          开始日期 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.startDate || ''}
          onChange={(e) => handleDateChange('startDate', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* 结束日期 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          结束日期 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.endDate || ''}
          onChange={(e) => handleDateChange('endDate', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* 请假天数 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">请假天数</label>
        <input
          type="text"
          value={formData.days ? `${formData.days} 天` : ''}
          readOnly
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
          placeholder="自动计算"
        />
      </div>

      {/* 请假原因 */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          请假原因 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.reason || ''}
          onChange={(e) => handleChange('reason', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          placeholder="请输入请假原因"
        />
      </div>

      {/* 备注 */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <textarea
          value={formData.remarks || ''}
          onChange={(e) => handleChange('remarks', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          placeholder="请输入备注信息（可选）"
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
      >
        取消
      </button>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
      >
        保存
      </button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={record ? '编辑请假' : '新建请假'}
      size="lg"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
