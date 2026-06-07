import { useState, useEffect, useMemo } from 'react';
import { Modal, FormField } from '@/components/ui';
import { RecruitmentFormData, RecruitmentSource, EmploymentType, Priority } from './types';
import { usePositionStore, getPositionsByDepartment } from '@/stores/usePositionStore';
import { useDepartmentStore } from '@/stores/useDepartmentStore';
import { NumberInput } from '@/components/ui';
import { DatePicker } from '@/components/ui';

interface RecruitmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  formData: RecruitmentFormData;
  errors: Record<string, string>;
  onFormChange: (field: keyof RecruitmentFormData, value: string | number) => void;
}

const sourceOptions: { value: RecruitmentSource; label: string }[] = [
  { value: '劳务公司', label: '劳务公司' },
  { value: '个人零工', label: '个人零工' },
  { value: '学生实习', label: '学生实习' },
  { value: '内部推荐', label: '内部推荐' },
];

const employmentTypeOptions: { value: EmploymentType; label: string }[] = [
  { value: '正式工', label: '正式工' },
  { value: '临时工', label: '临时工' },
  { value: '季节工', label: '季节工' },
  { value: '实习生', label: '实习生' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: '紧急', label: '紧急', color: 'red' },
  { value: '高', label: '高', color: 'orange' },
  { value: '普通', label: '普通', color: 'blue' },
  { value: '低', label: '低', color: 'gray' },
];

export function RecruitmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  formData,
  errors,
  onFormChange,
}: RecruitmentFormModalProps) {
  // 从 Zustand Store 获取岗位和部门数据
  const positionStore = usePositionStore();
  const departmentStore = useDepartmentStore();

  // 弹窗打开时加载数据
  useEffect(() => {
    if (isOpen) {
      positionStore.loadPositions();
      departmentStore.loadDepartments();
    }
  }, [isOpen, positionStore.loadPositions, departmentStore.loadDepartments]);

  // 部门选项（从 Store 获取）
  const departmentOptions = useMemo(() => {
    return departmentStore.departments.map(d => d.name);
  }, [departmentStore.departments]);

  // 根据已选部门过滤岗位
  const filteredPositions = useMemo(() => {
    if (!formData.department) {
      return positionStore.positions;
    }
    return getPositionsByDepartment(formData.department);
  }, [positionStore.positions, formData.department]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={onSubmit}
      submitText="提交申请"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 需求部门 - 放在前面以便先选择 */}
          <FormField label="需求部门" required error={errors.department}>
            <select
              value={formData.department}
              onChange={(e) => {
                onFormChange('department', e.target.value);
                // 部门改变时，清空岗位选择
                onFormChange('position', '');
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择部门</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </FormField>

          {/* 招聘岗位 */}
          <FormField label="招聘岗位" required error={errors.position}>
            {positionStore.loading ? (
              <select
                value=""
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100"
              >
                <option value="">加载中...</option>
              </select>
            ) : filteredPositions.length === 0 && formData.department ? (
              <div className="relative">
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => onFormChange('position', e.target.value)}
                  placeholder="该部门暂无岗位，请手动输入"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-500">无匹配岗位</span>
              </div>
            ) : (
              <select
                value={formData.position}
                onChange={(e) => onFormChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">请选择岗位</option>
                {filteredPositions.map((pos) => (
                  <option key={pos.id} value={pos.name}>
                    {pos.name} {pos.code ? `(${pos.code})` : ''}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* 招聘人数 */}
          <FormField label="招聘人数" required error={errors.quantity}>
            <NumberInput
              value={formData.quantity}
              onChange={(val) => onFormChange('quantity', val === '' ? 0 : Number(val))}
              decimals={0}
              placeholder="请输入人数"
              className="w-full"
            />
          </FormField>

          {/* 用工类型 */}
          <FormField label="用工类型" required error={errors.employmentType}>
            <select
              value={formData.employmentType}
              onChange={(e) => onFormChange('employmentType', e.target.value as EmploymentType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择</option>
              {employmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>

          {/* 优先级 */}
          <FormField label="优先级" required error={errors.priority}>
            <select
              value={formData.priority}
              onChange={(e) => onFormChange('priority', e.target.value as Priority)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 最低薪资 */}
          <FormField label="最低薪资 (元/月)">
            <NumberInput
              value={formData.salaryMin}
              onChange={(val) => onFormChange('salaryMin', val === '' ? 0 : Number(val))}
              decimals={0}
              placeholder="请输入"
              className="w-full"
            />
          </FormField>

          {/* 最高薪资 */}
          <FormField label="最高薪资 (元/月)" error={errors.salaryMax}>
            <NumberInput
              value={formData.salaryMax}
              onChange={(val) => onFormChange('salaryMax', val === '' ? 0 : Number(val))}
              decimals={0}
              placeholder="请输入"
              className={`w-full ${errors.salaryMax ? 'border-red-500' : ''}`}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 招聘来源 */}
          <FormField label="招聘来源" required error={errors.source}>
            <select
              value={formData.source}
              onChange={(e) => onFormChange('source', e.target.value as RecruitmentSource)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">请选择来源</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FormField>

          {/* 期望到岗日期 */}
          <FormField label="期望到岗日期" required error={errors.expectedDate}>
            <DatePicker
              selected={formData.expectedDate ? new Date(formData.expectedDate) : undefined}
              onChange={(date) => onFormChange('expectedDate', date.toISOString().split('T')[0])}
              className="w-full"
            />
          </FormField>
        </div>

        {/* 招聘原因 */}
        <FormField label="招聘原因" required error={errors.reason}>
          <textarea
            value={formData.reason}
            onChange={(e) => onFormChange('reason', e.target.value)}
            placeholder="请输入招聘原因"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>

        {/* 岗位要求 */}
        <FormField label="岗位要求" required error={errors.requirements}>
          <textarea
            value={formData.requirements}
            onChange={(e) => onFormChange('requirements', e.target.value)}
            placeholder="请输入岗位要求"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>

        {/* 备注 */}
        <FormField label="备注">
          <textarea
            value={formData.remarks || ''}
            onChange={(e) => onFormChange('remarks', e.target.value)}
            placeholder="请输入备注信息（可选）"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default RecruitmentFormModal;
