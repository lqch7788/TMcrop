import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { OvertimeFormModalProps, OvertimeType, OvertimeFormData } from './types';

// 模拟员工列表
const MOCK_STAFF = [
  { id: 'S001', name: '郭靖' },
  { id: 'S002', name: '杨过' },
  { id: 'S003', name: '张无忌' },
  { id: 'S004', name: '令狐冲' },
  { id: 'S005', name: '段誉' },
  { id: 'S006', name: '黄蓉' },
  { id: 'S007', name: '陈家洛' },
  { id: 'S008', name: '任盈盈' },
];

const overtimeTypes: OvertimeType[] = ['普通加班', '周末加班', '节假日加班'];

/**
 * 加班申请表单弹窗组件
 */
export function OvertimeFormModal({ record, open, onClose, onSave }: OvertimeFormModalProps) {
  const [formData, setFormData] = useState<OvertimeFormData>({
    staffId: '',
    staffName: '',
    date: '',
    hours: 0,
    type: '普通加班',
    reason: '',
  });

  // 编辑时填充数据
  useEffect(() => {
    if (record) {
      setFormData({
        staffId: record.staffId,
        staffName: record.staffName,
        date: record.date,
        hours: record.hours,
        type: record.type,
        reason: record.reason,
      });
    } else {
      setFormData({
        staffId: '',
        staffName: '',
        date: '',
        hours: 0,
        type: '普通加班',
        reason: '',
      });
    }
  }, [record, open]);

  // 处理员工选择
  const handleStaffChange = (staffId: string) => {
    const staff = MOCK_STAFF.find((s) => s.id === staffId);
    if (staff) {
      setFormData({ ...formData, staffId, staffName: staff.name });
    }
  };

  // 提交表单
  const handleSubmit = () => {
    if (!formData.staffId || !formData.date || formData.hours <= 0) {
      alert('请填写完整信息');
      return;
    }
    onSave(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {record ? '编辑加班' : '申请加班'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="px-6 py-4 space-y-4">
          {/* 员工选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              员工姓名 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.staffId}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">请选择员工</option>
              {MOCK_STAFF.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 加班类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {overtimeTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    formData.type === type
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              普通加班1.5倍 / 周末加班2倍 / 节假日加班3倍
            </p>
          </div>

          {/* 时长 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班时长(小时) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={formData.hours || ''}
              onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="请输入加班时长"
            />
          </div>

          {/* 加班原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              加班原因
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="请输入加班原因"
            />
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            提交申请
          </button>
        </div>
      </div>
    </div>
  );
}

export default OvertimeFormModal;
