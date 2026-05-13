/**
 * 考勤补录页面 - 新增/编辑表单弹窗组件
 */
import { useEffect } from 'react';
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { Button } from '@/components/ui';
import type { AttendanceRepairFormData } from '../types/attendanceRepairPage.types';
import { REPAIR_REASON_OPTIONS } from '../types/attendanceRepairPage.types';
import { useWorkerStore } from '../../../../../stores';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: AttendanceRepairFormData;
  onFormDataChange: (data: AttendanceRepairFormData) => void;
  onStaffChange: (employeeId: string) => void;
  onSubmit: () => void;
}

export function AttendanceRepairPageCreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onStaffChange,
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
      title="新建考勤补录申请"
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
            value={formData.employeeId}
            onChange={(e) => onStaffChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择员工</option>
            {workers.map(w => (
              <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
            ))}
          </select>
        </div>

        {/* 部门 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
          <input
            type="text"
            value={formData.department}
            readOnly
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
            placeholder="选择员工后自动填充"
          />
        </div>

        {/* 补录日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            补录日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.repairDate}
            onChange={(e) => onFormDataChange({ ...formData, repairDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 补录原因 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            补录原因 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.reason}
            onChange={(e) => onFormDataChange({ ...formData, reason: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {REPAIR_REASON_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 自定义原因（当选择"其他"时显示） */}
        {formData.reason === '其他' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              具体原因 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customReason}
              onChange={(e) => onFormDataChange({ ...formData, customReason: e.target.value })}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              placeholder="请输入具体的补录原因"
            />
          </div>
        )}

        {/* 上班时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            上班时间 <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.checkInTime}
            onChange={(e) => onFormDataChange({ ...formData, checkInTime: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 下班时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            下班时间 <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.checkOutTime}
            onChange={(e) => onFormDataChange({ ...formData, checkOutTime: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => onFormDataChange({ ...formData, remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入备注信息（选填）"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button
          onClick={onClose}
          variant="secondary"
          size="default"
        >
          取消
        </Button>
        <Button
          onClick={onSubmit}
          variant="default"
          size="default"
        >
          提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
