import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, DatePicker, NumberInput, Label } from '@/components/ui';
import type { ContractFormData, ContractType } from './types';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface ContractFormModalProps {
  formData: ContractFormData;
  onChange: (field: keyof ContractFormData, value: string | number) => void;
  errors: Record<string, string>;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}

const contractTypes: ContractType[] = ['劳动合同', '实习协议', '劳务合同'];

export function ContractFormModal({
  formData,
  onChange,
  errors,
  onSubmit,
  onCancel,
  isEdit = false,
}: ContractFormModalProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 员工姓名 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            员工姓名 <span className="text-red-500">*</span>
          </Label>
          <input
            type="text"
            value={formData.staffName}
            onChange={(e) => onChange('staffName', e.target.value)}
            className={`${deepInputClass} ${
              errors.staffName ? 'border-red-500' : ''
            }`}
            placeholder="请输入员工姓名"
          />
          {errors.staffName && <p className="mt-1 text-sm text-red-500">{errors.staffName}</p>}
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
            className={`${deepInputClass} ${
              errors.idCard ? 'border-red-500' : ''
            }`}
            placeholder="请输入身份证号"
          />
          {errors.idCard && <p className="mt-1 text-sm text-red-500">{errors.idCard}</p>}
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

        {/* 签订日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">签订日期</Label>
          <DatePicker
            selected={formData.signingDate ? new Date(formData.signingDate) : undefined}
            onChange={(date: Date) => onChange('signingDate', date.toISOString().slice(0, 10))}
            placeholder="选择日期"
          />
        </div>

        {/* 开始日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            开始日期 <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            selected={formData.startDate ? new Date(formData.startDate) : undefined}
            onChange={(date: Date) => onChange('startDate', date.toISOString().slice(0, 10))}
            placeholder="选择日期"
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
        </div>

        {/* 结束日期 */}
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            结束日期 <span className="text-red-500">*</span>
          </Label>
          <DatePicker
            selected={formData.endDate ? new Date(formData.endDate) : undefined}
            onChange={(date: Date) => onChange('endDate', date.toISOString().slice(0, 10))}
            placeholder="选择日期"
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
        </div>

        {/* 月薪（劳动合同） */}
        {formData.contractType === '劳动合同' && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">月薪</Label>
            <NumberInput
              value={formData.monthlySalary}
              onChange={(val) => onChange('monthlySalary', Number(val))}
              placeholder="请输入月薪"
              decimals={2}
            />
          </div>
        )}

        {/* 日工资（劳务合同） */}
        {formData.contractType === '劳务合同' && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">日工资</Label>
            <NumberInput
              value={formData.dailyWage}
              onChange={(val) => onChange('dailyWage', Number(val))}
              placeholder="请输入日工资"
              decimals={2}
            />
          </div>
        )}

        {/* 时工资（实习协议） */}
        {formData.contractType === '实习协议' && (
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">时工资</Label>
            <NumberInput
              value={formData.hourlyWage}
              onChange={(val) => onChange('hourlyWage', Number(val))}
              placeholder="请输入时工资"
              decimals={2}
            />
          </div>
        )}
      </div>

      {/* 备注 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">备注</Label>
        <textarea
          value={formData.remarks || ''}
          onChange={(e) => onChange('remarks', e.target.value)}
          className={deepInputClass}
          rows={3}
          placeholder="请输入备注"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="default" onClick={onSubmit}>
          {isEdit ? '保存' : '创建合同'}
        </Button>
      </div>
    </div>
  );
}
