import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ContractFormData, ContractType } from './types';

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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            员工姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.staffName}
            onChange={(e) => onChange('staffName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.staffName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请输入员工姓名"
          />
          {errors.staffName && <p className="mt-1 text-sm text-red-500">{errors.staffName}</p>}
        </div>

        {/* 身份证号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            身份证号 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.idCard}
            onChange={(e) => onChange('idCard', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.idCard ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请输入身份证号"
          />
          {errors.idCard && <p className="mt-1 text-sm text-red-500">{errors.idCard}</p>}
        </div>

        {/* 合同类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            合同类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.contractType}
            onChange={(e) => onChange('contractType', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.contractType ? 'border-red-500' : 'border-gray-300'
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
          <label className="block text-sm font-medium text-gray-700 mb-1">签订日期</label>
          <input
            type="date"
            value={formData.signingDate || ''}
            onChange={(e) => onChange('signingDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 开始日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            开始日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.startDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
        </div>

        {/* 结束日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            结束日期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.endDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
        </div>

        {/* 月薪（劳动合同） */}
        {formData.contractType === '劳动合同' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">月薪</label>
            <input
              type="number"
              value={formData.monthlySalary || ''}
              onChange={(e) => onChange('monthlySalary', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="请输入月薪"
            />
          </div>
        )}

        {/* 日工资（劳务合同） */}
        {formData.contractType === '劳务合同' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日工资</label>
            <input
              type="number"
              value={formData.dailyWage || ''}
              onChange={(e) => onChange('dailyWage', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="请输入日工资"
            />
          </div>
        )}

        {/* 时工资（实习协议） */}
        {formData.contractType === '实习协议' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">时工资</label>
            <input
              type="number"
              value={formData.hourlyWage || ''}
              onChange={(e) => onChange('hourlyWage', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="请输入时工资"
            />
          </div>
        )}
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <textarea
          value={formData.remarks || ''}
          onChange={(e) => onChange('remarks', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={3}
          placeholder="请输入备注"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button variant="default" onClick={onSubmit}>
          {isEdit ? '保存' : '创建合同'}
        </Button>
      </div>
    </div>
  );
}
