/**
 * 加班申请页面 - 新增/编辑表单弹窗组件
 */
import { useEffect } from 'react';
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import type { OvertimeFormData, OvertimeFeePreview } from '../types/overtimePage.types';
import { OVERTIME_TYPE_OPTIONS } from '../types/overtimePage.types';
import { useWorkerStore } from '../../../../../stores';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: OvertimeFormData;
  overtimeFeePreview: OvertimeFeePreview | null;
  onFormDataChange: (data: OvertimeFormData) => void;
  onStaffChange: (staffId: string) => void;
  onTimeChange: (field: 'startTime' | 'endTime', value: string) => void;
  onSubmit: () => void;
}

export function OvertimePageCreateModal({
  isOpen,
  onClose,
  formData,
  overtimeFeePreview,
  onFormDataChange,
  onStaffChange,
  onTimeChange,
  onSubmit,
}: CreateModalProps) {
  const workers = useWorkerStore((state) => state.workers);
  const loadWorkers = useWorkerStore((state) => state.loadWorkers);

  useEffect(() => {
    if (workers.length === 0) {
      loadWorkers();
    }
  }, [workers.length, loadWorkers]);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建加班申请"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 员工选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            员工姓名 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.staffId}
            onChange={(e) => onStaffChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择员工</option>
            {workers.map(w => (
              <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
            ))}
          </select>
        </div>

        {/* 加班类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            加班类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.overtimeType}
            onChange={(e) => onFormDataChange({ ...formData, overtimeType: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {OVERTIME_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 开始时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            开始时间 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => onTimeChange('startTime', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 结束时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            结束时间 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => onTimeChange('endTime', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 时长显示 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">加班时长</label>
          <div className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 flex items-center">
            {formData.hours > 0 ? (
              <span className="text-emerald-600">{formData.hours} 小时</span>
            ) : (
              <span className="text-gray-400">请选择开始和结束时间</span>
            )}
          </div>
        </div>

        {/* 加班费预览 */}
        {overtimeFeePreview && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">加班费预览</label>
            <div className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-emerald-50">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  时薪：<span className="text-emerald-700 font-medium">¥{overtimeFeePreview.hourlyRate}</span>
                </span>
                <span className="text-gray-600">
                  费率：<span className="text-emerald-700 font-medium">{overtimeFeePreview.rateText}</span>
                </span>
                <span className="text-gray-600">
                  加班时长：<span className="text-emerald-700 font-medium">{formData.hours} 小时</span>
                </span>
                <span className="text-gray-600">
                  预计加班费：<span className="text-emerald-700 font-bold">¥{overtimeFeePreview.totalFee}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 加班原因 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            加班原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => onFormDataChange({ ...formData, reason: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入加班原因"
          />
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => onFormDataChange({ ...formData, remarks: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入备注信息（可选）"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button variant="default" onClick={onSubmit}>
          提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
