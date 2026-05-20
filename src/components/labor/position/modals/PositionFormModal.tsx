import { useState, useEffect, useMemo } from 'react';
import { showAlert } from '@/lib/dialogService';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { useDepartmentStore } from '../../../../stores';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/NumberInput';

interface Position {
  id: number;
  code: string;
  name: string;
  dept: string;
  level: string;
  salary: number;
  staffCount: number;
  description: string;
  status: string;
  statusClass: string;
}

interface PositionFormModalProps {
  record?: Position | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Position>) => void;
}

const levelOptions = ['高层', '中层', '基层'];
const statusOptions = ['启用', '停用'];

export function PositionFormModal({ record, open, onClose, onSave }: PositionFormModalProps) {
  const deptOptions = useMemo(() => {
    return useDepartmentStore.getState().departments.map(d => d.name);
  }, []);
  const [formData, setFormData] = useState<Partial<Position>>({
    name: '',
    dept: '技术部',
    level: '中层',
    salary: 0,
    description: '',
    status: '启用',
    statusClass: 'normal',
  });

  useEffect(() => {
    if (open) {
      if (record) {
        setFormData(record);
      } else {
        setFormData({
          name: '',
          dept: '技术部',
          level: '中层',
          salary: 0,
          description: '',
          status: '启用',
          statusClass: 'normal',
        });
      }
    }
  }, [open, record]);

  const handleChange = (field: keyof Position, value: string | number) => {
    const newData = { ...formData, [field]: value };
    if (field === 'status') {
      newData.statusClass = value === '启用' ? 'normal' : 'disabled';
    }
    setFormData(newData);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      showAlert('请输入职务名称');
      return;
    }
    onSave(formData);
  };

  const content = (
    <div className="grid grid-cols-2 gap-4">
      {/* 职务名称 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          职务名称 <span className="text-red-500">*</span>
        </Label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          placeholder="请输入职务名称"
        />
      </div>

      {/* 所属部门 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          所属部门 <span className="text-red-500">*</span>
        </Label>
        <select
          value={formData.dept || ''}
          onChange={(e) => handleChange('dept', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {deptOptions.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* 职务级别 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          职务级别 <span className="text-red-500">*</span>
        </Label>
        <select
          value={formData.level || ''}
          onChange={(e) => handleChange('level', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {levelOptions.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* 基本工资 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">
          基本工资(元) <span className="text-red-500">*</span>
        </Label>
        <NumberInput
          value={formData.salary || 0}
          onChange={(val) => handleChange('salary', Number(val))}
          decimals={0}
          placeholder="请输入基本工资"
        />
      </div>

      {/* 状态 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">状态</Label>
        <select
          value={formData.status || '启用'}
          onChange={(e) => handleChange('status', e.target.value)}
          className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* 职责描述 */}
      <div className="col-span-2">
        <Label className="block text-sm font-medium text-gray-700 mb-1">职责描述</Label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
          placeholder="请输入职责描述"
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        取消
      </Button>
      <Button variant="default" onClick={handleSubmit}>
        保存
      </Button>
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={record ? '编辑职务' : '新增职务'}
      size="lg"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}