/**
 * 请假申请创建弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { LeaveType, LeaveQuota } from '../../../../components/labor/leave/types';
import { LEAVE_TYPE_OPTIONS } from '../../hooks/useLeave';

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    staffId: string;
    staffName: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    remarks: string;
  };
  onFormDataChange: React.Dispatch<React.SetStateAction<{
    staffId: string;
    staffName: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    remarks: string;
  }>>;
  onStaffChange: (staffId: string, staffName: string) => void;
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void;
  onSubmit: () => void;
  currentQuota: LeaveQuota | null;
  workers: { workerId: string; name: string; department: string }[];
}

/** 获取某类型的可用余额 */
function getAvailableDays(quota: LeaveQuota, leaveType: LeaveType): number {
  switch (leaveType) {
    case '年假':
      return quota.annualLeaveRemaining;
    case '病假':
      return quota.sickLeaveRemaining;
    default:
      return quota.otherLeaveRemaining;
  }
}

export function CreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onStaffChange,
  onDateChange,
  onSubmit,
  currentQuota,
  workers,
}: CreateModalProps) {
  const availableDays = currentQuota ? getAvailableDays(currentQuota, formData.leaveType) : 0;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建请假申请"
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
            onChange={(e) => {
              const worker = workers.find(w => w.workerId === e.target.value);
              if (worker) {
                onStaffChange(worker.workerId, worker.name);
              }
            }}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择员工</option>
            {workers.map(w => (
              <option key={w.workerId} value={w.workerId}>{w.name} - {w.department}</option>
            ))}
          </select>
        </div>

        {/* 请假类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            请假类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.leaveType}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, leaveType: e.target.value as LeaveType }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {LEAVE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
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
            value={formData.startDate}
            onChange={(e) => onDateChange('startDate', e.target.value)}
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
            value={formData.endDate}
            onChange={(e) => onDateChange('endDate', e.target.value)}
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

        {/* 余额显示 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">可用余额</label>
          <div className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 flex items-center">
            {currentQuota ? (
              <span className="text-emerald-600">
                {formData.leaveType === '年假' && `年假剩余: ${currentQuota.annualLeaveRemaining}天`}
                {formData.leaveType === '病假' && `病假剩余: ${currentQuota.sickLeaveRemaining}天`}
                {formData.leaveType !== '年假' && formData.leaveType !== '病假' && `其他假剩余: ${currentQuota.otherLeaveRemaining}天`}
              </span>
            ) : (
              <span className="text-gray-400">请先选择员工</span>
            )}
          </div>
        </div>

        {/* 余额不足提示 */}
        {currentQuota && formData.days > 0 && (
          <div className="col-span-2">
            {formData.days > availableDays && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                余额不足！当前可用天数: {availableDays}天，申请天数: {formData.days}天
              </div>
            )}
          </div>
        )}

        {/* 请假原因 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            请假原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, reason: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入请假原因"
          />
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea
            value={formData.remarks}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, remarks: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入备注信息（可选）"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          取消
        </button>
        <button
          onClick={onSubmit}
          disabled={currentQuota ? formData.days > availableDays : false}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          提交申请
        </button>
      </div>
    </UnifiedModal>
  );
}
