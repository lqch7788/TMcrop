/**
 * 入职办理页面新建/编辑表单弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui';
import { OnboardingFormData } from '../../../types/onboardingPage.types';

interface OnboardingPageCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: OnboardingFormData;
  onFormDataChange: (data: Partial<OnboardingFormData>) => void;
  onSubmit: () => void;
  departmentOptions: { value: string; label: string }[];
}

export function OnboardingPageCreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onSubmit,
  departmentOptions,
}: OnboardingPageCreateModalProps) {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建入职申请"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 员工姓名 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            员工姓名 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.employeeName}
            onChange={(e) => onFormDataChange({ employeeName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入员工姓名"
          />
        </div>

        {/* 部门 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            部门 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.department}
            onChange={(e) => onFormDataChange({ department: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择部门</option>
            {departmentOptions.filter(d => d.value).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 岗位 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            岗位 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => onFormDataChange({ position: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入岗位"
          />
        </div>

        {/* 预计入职日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            预计入职日期 <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            selected={formData.expectedStartDate ? new Date(formData.expectedStartDate) : undefined}
            onChange={(date: Date) => onFormDataChange({ expectedStartDate: date.toISOString().slice(0, 10) })}
            placeholder="选择日期"
            className="w-full"
          />
        </div>

        {/* 学历 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">学历</Label>
          <select
            value={formData.education}
            onChange={(e) => onFormDataChange({ education: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择学历</option>
            <option value="初中">初中</option>
            <option value="中专">中专</option>
            <option value="高中">高中</option>
            <option value="大专">大专</option>
            <option value="本科">本科</option>
            <option value="硕士">硕士</option>
            <option value="博士">博士</option>
          </select>
        </div>

        {/* 专业 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">专业</Label>
          <input
            type="text"
            value={formData.major}
            onChange={(e) => onFormDataChange({ major: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入专业"
          />
        </div>

        {/* 联系电话 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">联系电话</Label>
          <input
            type="text"
            value={formData.contactPhone}
            onChange={(e) => onFormDataChange({ contactPhone: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入联系电话"
          />
        </div>

        {/* 紧急联系人 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">紧急联系人</Label>
          <input
            type="text"
            value={formData.emergencyContact}
            onChange={(e) => onFormDataChange({ emergencyContact: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入紧急联系人"
          />
        </div>

        {/* 身份证号 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">身份证号</Label>
          <input
            type="text"
            value={formData.idCard}
            onChange={(e) => onFormDataChange({ idCard: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入18位身份证号"
            maxLength={18}
          />
        </div>

        {/* 银行卡号 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">银行卡号</Label>
          <input
            type="text"
            value={formData.bankCard}
            onChange={(e) => onFormDataChange({ bankCard: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入16-19位银行卡号"
            maxLength={19}
          />
        </div>

        {/* 备注 */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
          <textarea
            value={formData.remarks}
            onChange={(e) => onFormDataChange({ remarks: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入备注信息"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button onClick={onClose} variant="secondary" size="default">
          取消
        </Button>
        <Button onClick={onSubmit} variant="default" size="default">
          提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
