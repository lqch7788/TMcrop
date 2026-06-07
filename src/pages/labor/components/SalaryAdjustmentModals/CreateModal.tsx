/**
 * 调薪申请创建弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { SalaryAdjustmentFormData, ADJUSTMENT_TYPE_OPTIONS } from '../../types/salaryAdjustment.types';
import { Label } from '@/components/ui';
import { Button } from '@/components/ui';
import { DatePicker, NumberInput } from '@/components/ui';

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: SalaryAdjustmentFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<SalaryAdjustmentFormData>>;
  onStaffChange: (employeeId: string, employeeName: string, department: string, position: string, currentSalary: number) => void;
  onProposedSalaryChange: (value: number) => void;
  onSubmit: () => void;
  workers: { workerId: string; name: string; department: string; position: string; wagesType?: string; salary?: number }[];
  displayAmount: number;
  displayRatio: number;
}

/**
 * 调薪申请创建弹窗组件
 */
export function CreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onStaffChange,
  onProposedSalaryChange,
  onSubmit,
  workers,
  displayAmount,
  displayRatio,
}: CreateModalProps) {
  const handleWorkerChange = (workerId: string) => {
    const worker = workers.find(w => w.workerId === workerId);
    if (worker) {
      // 模拟根据员工ID获取当前薪资
      const currentSalary = worker.wagesType === '月薪' ? (worker.salary || 6000) : 5000;
      onStaffChange(workerId, worker.name, worker.department, worker.position, currentSalary);
    }
  };

  const handleProposedSalaryInput = (value: string) => {
    const numValue = parseFloat(value) || 0;
    onProposedSalaryChange(numValue);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建调薪申请"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 员工选择 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            员工姓名 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.employeeId}
            onChange={(e) => handleWorkerChange(e.target.value)}
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">部门</Label>
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
          <Label className="block text-sm font-medium text-gray-700 mb-1">岗位</Label>
          <input
            type="text"
            value={formData.position}
            readOnly
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
            placeholder="选择员工后自动填充"
          />
        </div>

        {/* 当前薪资 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">当前薪资</Label>
          <input
            type="text"
            value={formData.currentSalary ? `¥${formData.currentSalary.toLocaleString()}` : ''}
            readOnly
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
            placeholder="选择员工后自动填充"
          />
        </div>

        {/* 申请薪资 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            申请薪资 <span className="text-red-500">*</span>
          </Label>
          <NumberInput
            value={formData.proposedSalary ?? 0}
            onChange={(val: string) => handleProposedSalaryInput(val)}
            decimals={2}
            placeholder="请输入申请薪资"
            className="w-full"
          />
        </div>

        {/* 调整类型 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            调整类型 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.adjustmentType}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, adjustmentType: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {ADJUSTMENT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 调整金额和比例显示 */}
        <div className="col-span-2 p-3 bg-blue-50 rounded-lg">
          <div className="flex gap-8">
            <div>
              <span className="text-sm text-gray-500">调整金额：</span>
              <span className={`text-lg font-semibold ml-2 ${displayAmount > 0 ? 'text-emerald-600' : displayAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {displayAmount > 0 ? '+' : ''}¥{displayAmount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">调整比例：</span>
              <span className={`text-lg font-semibold ml-2 ${displayRatio > 0 ? 'text-emerald-600' : displayRatio < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {displayRatio > 0 ? '+' : ''}{displayRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 生效日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            生效日期 <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            selected={formData.effectiveDate ? new Date(formData.effectiveDate) : undefined}
            onChange={(date: Date) => onFormDataChange(prev => ({ ...prev, effectiveDate: date.toISOString().slice(0, 10) }))}
            placeholder="选择日期"
            className="w-full"
          />
        </div>

        <div></div>

        {/* 调薪原因 */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            调薪原因 <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={formData.reason}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, reason: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入调薪原因（10-500字符）"
          />
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
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
          variant="default"
          onClick={onSubmit}
          disabled={!formData.employeeId || !formData.proposedSalary || formData.proposedSalary <= formData.currentSalary}
        >
          提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
