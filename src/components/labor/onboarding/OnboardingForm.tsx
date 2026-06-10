import { Button } from '@/components/ui';
import { X } from 'lucide-react';

import type { OnboardingFormData, ContractType } from './types';
import { Label } from '@/components/ui';
import { NumberInput } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface OnboardingFormProps {
  formData: OnboardingFormData;
  onChange: (field: keyof OnboardingFormData, value: string | number) => void;
  errors: Record<string, string>;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}

const contractTypes: ContractType[] = ['劳动合同', '实习协议', '劳务合同'];

export function OnboardingForm({
  formData,
  onChange,
  errors,
  onSubmit,
  onCancel,
  isEdit = false,
}: OnboardingFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 姓名 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            姓名 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.name ? 'border-red-500' : 'border-gray-400'
            }`}
            placeholder="请输入姓名"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* 身份证号 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            身份证号 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.idCard}
            onChange={(e) => onChange('idCard', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.idCard ? 'border-red-500' : 'border-gray-400'
            }`}
            placeholder="请输入身份证号"
          />
          {errors.idCard && <p className="mt-1 text-sm text-red-500">{errors.idCard}</p>}
        </div>

        {/* 联系电话 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            联系电话 <span className="text-red-500">*</span>
          </Label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-400'
            }`}
            placeholder="请输入联系电话"
          />
          {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
        </div>

        {/* 入职日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            入职日期 <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            selected={formData.joinDate ? new Date(formData.joinDate) : undefined}
            onChange={(date) => onChange('joinDate', todayLocal(date))}
            className="w-full"
          />
          {errors.joinDate && <p className="mt-1 text-sm text-red-500">{errors.joinDate}</p>}
        </div>

        {/* 岗位 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            岗位 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => onChange('position', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.position ? 'border-red-500' : 'border-gray-400'
            }`}
            placeholder="请输入岗位"
          />
          {errors.position && <p className="mt-1 text-sm text-red-500">{errors.position}</p>}
        </div>

        {/* 部门 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            部门 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => onChange('department', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.department ? 'border-red-500' : 'border-gray-400'
            }`}
            placeholder="请输入部门"
          />
          {errors.department && <p className="mt-1 text-sm text-red-500">{errors.department}</p>}
        </div>

        {/* 合同类型 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            合同类型 <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.contractType}
            onChange={(e) => onChange('contractType', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.contractType ? 'border-red-500' : 'border-gray-400'
            }`}
          >
            <option value="">请选择合同类型</option>
            {contractTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.contractType && <p className="mt-1 text-sm text-red-500">{errors.contractType}</p>}
        </div>

        {/* 日工资（临时工） */}
        {formData.contractType === '劳务合同' && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">日工资</Label>
            <NumberInput
              value={formData.dailyWage}
              onChange={(val) => onChange('dailyWage', Number(val))}
              decimals={0}
              placeholder="请输入日工资"
            />
          </div>
        )}

        {/* 时工资 */}
        {formData.contractType === '实习协议' && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">时工资</Label>
            <NumberInput
              value={formData.hourlyWage}
              onChange={(val) => onChange('hourlyWage', Number(val))}
              decimals={0}
              placeholder="请输入时工资"
            />
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="default" onClick={onSubmit}>
          {isEdit ? '保存' : '创建入职'}
        </Button>
      </div>
    </div>
  );
}
