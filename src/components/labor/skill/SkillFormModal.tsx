import React, { useState, useEffect } from 'react';
import { Modal, FormField } from '@/components/ui/Modal';
import { StaffSkill, SkillFormData, DEPARTMENTS } from './types';
import { SkillTagSelector } from './SkillTagSelector';

interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SkillFormData) => void;
  title: string;
  editingSkill?: StaffSkill | null;
}

export function SkillFormModal({ isOpen, onClose, onSubmit, title, editingSkill }: SkillFormModalProps) {
  const [formData, setFormData] = useState<SkillFormData>({
    staffId: '',
    staffName: '',
    department: '',
    skills: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (editingSkill) {
      setFormData({
        staffId: editingSkill.staffId,
        staffName: editingSkill.staffName,
        department: editingSkill.department,
        skills: editingSkill.skills,
      });
    } else {
      setFormData({
        staffId: '',
        staffName: '',
        department: '',
        skills: [],
      });
    }
    setErrors({});
  }, [editingSkill, isOpen]);

  // 处理字段变化
  const handleFieldChange = (field: keyof SkillFormData, value: string | typeof formData.skills) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  // 表单验证
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.staffId.trim()) {
      newErrors.staffId = '请输入员工工号';
    }
    if (!formData.staffName.trim()) {
      newErrors.staffName = '请输入员工姓名';
    }
    if (!formData.department) {
      newErrors.department = '请选择部门';
    }
    if (formData.skills.length === 0) {
      newErrors.skills = '请至少选择一个技能';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      onSubmit={handleSubmit}
      submitText={editingSkill ? '更新' : '创建'}
      cancelText="取消"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 员工工号 */}
          <FormField label="员工工号" required error={errors.staffId}>
            <input
              type="text"
              value={formData.staffId}
              onChange={(e) => handleFieldChange('staffId', e.target.value)}
              placeholder="请输入员工工号"
              className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>

          {/* 员工姓名 */}
          <FormField label="员工姓名" required error={errors.staffName}>
            <input
              type="text"
              value={formData.staffName}
              onChange={(e) => handleFieldChange('staffName', e.target.value)}
              placeholder="请输入员工姓名"
              className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </FormField>
        </div>

        {/* 部门 */}
        <FormField label="部门" required error={errors.department}>
          <select
            value={formData.department}
            onChange={(e) => handleFieldChange('department', e.target.value)}
            className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">请选择部门</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </FormField>

        {/* 技能标签选择 */}
        <FormField label="技能标签" required error={errors.skills}>
          <SkillTagSelector
            selectedSkills={formData.skills}
            onChange={(skills) => handleFieldChange('skills', skills)}
            maxSkills={10}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export default SkillFormModal;
