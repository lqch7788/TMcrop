/**
 * 招聘申请创建弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Send, X } from 'lucide-react';

import { RecruitmentFormData, EMPLOYMENT_TYPE_OPTIONS, PRIORITY_OPTIONS } from '../../types/recruitment.types';
import { Button } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { Label } from '@/components/ui';

export interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: RecruitmentFormData;
  onFormDataChange: React.Dispatch<React.SetStateAction<RecruitmentFormData>>;
  onDeptChange: (deptId: string) => void;
  onHeadcountChange: (value: number) => void;
  onSubmit: () => void;
  departments: { oid: string; name: string }[];
  positions: { id: string; name: string; departmentOid: string }[];
  availablePositions: { id: string; name: string; departmentOid: string }[];
}

/**
 * 招聘申请创建弹窗组件
 */
export function CreateModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  onDeptChange,
  onHeadcountChange,
  onSubmit,
  departments,
  availablePositions,
}: CreateModalProps) {
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新建招聘申请"
      size="lg"
      showFooter={false}
    >
      <div className="grid grid-cols-2 gap-4">
        {/* 部门选择 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            申请部门 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.deptId}
            onChange={(e) => onDeptChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择部门</option>
            {departments.map(dept => (
              <option key={dept.oid} value={dept.oid}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* 岗位选择 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            招聘岗位 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.positionId}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, positionId: e.target.value }))}
            disabled={!formData.deptId}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">请选择岗位</option>
            {availablePositions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.name}</option>
            ))}
          </select>
        </div>

        {/* 招聘人数 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            招聘人数 <span className="text-red-500">*</span>
          </Label>
          <NumberInput
            value={formData.headcount}
            onChange={(val) => onHeadcountChange(parseInt(val) || 1)}
            decimals={0}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="输入招聘人数"
          />
        </div>

        {/* 用工类型 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            用工类型 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.employmentType}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, employmentType: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 最低薪资 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            最低薪资 (元/月)
          </Label>
          <NumberInput
            value={formData.salaryMin || ''}
            onChange={(val) => onFormDataChange(prev => ({ ...prev, salaryMin: parseInt(val) || 0 }))}
            decimals={0}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="输入最低薪资"
          />
        </div>

        {/* 最高薪资 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            最高薪资 (元/月)
          </Label>
          <NumberInput
            value={formData.salaryMax || ''}
            onChange={(val) => onFormDataChange(prev => ({ ...prev, salaryMax: parseInt(val) || 0 }))}
            decimals={0}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="输入最高薪资"
          />
        </div>

        {/* 优先级 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">优先级</Label>
          <select
            value={formData.priority}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, priority: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {PRIORITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 薪资校验提示 */}
        {formData.salaryMin > 0 && formData.salaryMax > 0 && formData.salaryMin > formData.salaryMax && (
          <div className="col-span-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              最低薪资不能大于最高薪资
            </div>
          </div>
        )}

        {/* 招聘原因 */}
        <div className="col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            招聘原因 <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={formData.reason}
            onChange={(e) => onFormDataChange(prev => ({ ...prev, reason: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入招聘原因"
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
            placeholder="请输入备注信息（可选）"
          />
        </div>
      </div>

      {/* 弹窗底部按钮 */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onSubmit}
          disabled={!formData.deptId || !formData.positionId || formData.headcount < 1 || !formData.reason || formData.salaryMin > formData.salaryMax}
        >
          <Send className="w-4 h-4" /> 提交申请
        </Button>
      </div>
    </UnifiedModal>
  );
}
