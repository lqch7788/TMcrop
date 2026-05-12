import { useState, useEffect } from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import type { OvertimeFormModalProps, OvertimeType, OvertimeFormData } from './types';
import { getWorkerSelectList } from '../../../services/apiWorkerService';

// 员工选择列表状态
interface StaffOption {
  id: string;
  name: string;
}

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
  const [staffList, setStaffList] = useState<StaffOption[]>([]);

  // 加载员工列表
  useEffect(() => {
    if (open) {
      getWorkerSelectList().then(list => {
        setStaffList(list);
      });
    }
  }, [open]);

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
    const staff = staffList.find((s) => s.id === staffId);
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

  const content = (
    <div className="space-y-4">
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
          {staffList.map((staff) => (
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
            <Button
              key={type}
              variant={formData.type === type ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, type })}
            >
              {type}
            </Button>
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
  );

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>
        取消
      </Button>
      <Button onClick={handleSubmit}>
        提交申请
      </Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={record ? '编辑加班' : '申请加班'}
      size="md"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}

export default OvertimeFormModal;
