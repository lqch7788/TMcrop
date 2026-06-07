/**
 * 工资预算创建/编辑弹窗组件
 */
import { Label } from '@/components/ui';
import { Button, NumberInput } from '@/components/ui';
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { SalaryBudgetFormData } from '../../types/salaryBudget.types';
import { getMonthOptions } from '../../hooks/useSalaryBudget';

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: SalaryBudgetFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<SalaryBudgetFormData>>;
  onDeptChange: (deptId: string, deptName: string) => void;
  onSubmit: () => void;
  departments: { id: string; name: string }[];
  grandTotal: number;
}

/**
 * 工资预算创建弹窗组件
 * 用于新建工资预算申请
 */
export function CreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onDeptChange,
  onSubmit,
  departments,
  grandTotal,
}: CreateModalProps) {
  const monthOptions = getMonthOptions();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建工资预算"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 部门选择 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            部门 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.deptId}
            onChange={(e) => {
              const dept = departments.find(d => d.id === e.target.value);
              onDeptChange(e.target.value, dept?.name || '');
            }}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择部门</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* 月份选择 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            预算月份 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.budgetMonth}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, budgetMonth: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 基本工资总额 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            基本工资总额 <span className="text-red-500">*</span>
          </Label>
          <NumberInput
            value={formData.totalBaseSalary ?? 0}
            onChange={(val: string) => onFormDataChange(prev => ({ ...prev, totalBaseSalary: parseFloat(val) || 0 }))}
            decimals={2}
            placeholder="请输入金额"
            className="w-full"
          />
        </div>

        {/* 加班费总额 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            加班费总额
          </Label>
          <NumberInput
            value={formData.totalOvertimePay ?? 0}
            onChange={(val: string) => onFormDataChange(prev => ({ ...prev, totalOvertimePay: parseFloat(val) || 0 }))}
            decimals={2}
            placeholder="请输入金额"
            className="w-full"
          />
        </div>

        {/* 奖金总额 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            奖金总额
          </Label>
          <NumberInput
            value={formData.totalBonus ?? 0}
            onChange={(val: string) => onFormDataChange(prev => ({ ...prev, totalBonus: parseFloat(val) || 0 }))}
            decimals={2}
            placeholder="请输入金额"
            className="w-full"
          />
        </div>

        {/* 总计显示 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            总计
          </Label>
          <div className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50 flex items-center">
            <span className="font-medium text-emerald-600">
              ¥{grandTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            备注
          </Label>
          <textarea
            value={formData.remark}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, remark: e.target.value }))}
            rows={3}
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
        <Button
          variant="default"
          onClick={onSubmit}
          disabled={!formData.deptId || !formData.budgetMonth || formData.totalBaseSalary <= 0}
        >
          提交审批
        </Button>
      </div>
    </UnifiedModal>
  );
}
