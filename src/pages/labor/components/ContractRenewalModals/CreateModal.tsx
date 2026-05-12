/**
 * 合同续签创建弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Button } from '@/components/ui';
import { ContractRenewalFormData, CONTRACT_PERIOD_OPTIONS } from '../../types/contractRenewal.types';

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: ContractRenewalFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<ContractRenewalFormData>>;
  onStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentContractEnd: string) => void;
  onPeriodChange: (period: number) => void;
  onNewStartDateChange: (date: string) => void;
  onSubmit: () => void;
  workers: { workerId: string; name: string; department: string; position: string; contractExpireDate?: string }[];
}

/**
 * 合同续签创建弹窗组件
 */
export function CreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onStaffChange,
  onPeriodChange,
  onNewStartDateChange,
  onSubmit,
  workers,
}: CreateModalProps) {
  // 检查表单是否有效
  const isFormValid = formData.employeeId && formData.newContractStart && formData.newContractEnd;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建合同续签申请"
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
            onChange={(e) => {
              const worker = workers.find(w => w.workerId === e.target.value);
              if (worker) {
                onStaffChange(
                  worker.workerId,
                  worker.name,
                  worker.department,
                  worker.position,
                  worker.contractExpireDate || ''
                );
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

        {/* 岗位 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
          <input
            type="text"
            value={formData.position}
            readOnly
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
            placeholder="选择员工后自动填充"
          />
        </div>

        {/* 当前合同到期日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">当前合同到期日</label>
          <input
            type="date"
            value={formData.currentContractEnd}
            readOnly
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
            placeholder="选择员工后自动填充"
          />
        </div>

        {/* 新合同开始日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            新合同开始日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.newContractStart}
            onChange={(e) => onNewStartDateChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 续签期限 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            续签期限 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.renewalPeriod}
            onChange={(e) => onPeriodChange(Number(e.target.value))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {CONTRACT_PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 新合同到期日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            新合同到期日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.newContractEnd}
            readOnly
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
            placeholder="根据期限自动计算"
          />
        </div>

        {/* 新薪资 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">新薪资</label>
          <input
            type="number"
            value={formData.newSalary || ''}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, newSalary: e.target.value ? Number(e.target.value) : undefined }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="选填"
          />
        </div>

        {/* 条款变更 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">条款变更说明</label>
          <textarea
            value={formData.termsChange}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, termsChange: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入条款变更说明（选填）"
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
            placeholder="请输入备注信息（选填）"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          onClick={onClose}
        >
          取消
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!isFormValid}
        >
          提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
