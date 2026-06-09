/**
 * 指标创建/编辑弹窗组件
 * 用于新增指标或编辑已有指标
 */
import { useState, useEffect, useMemo } from 'react';
import { Edit, Plus, Save, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Modal } from '../../../../components/ui/Modal';
import type { Indicator } from '../../../types/indicators.types';
import { getIndicatorCategories } from '../../../hooks/useIndicators';

interface CreateModalProps {
  isOpen: boolean;
  indicator: Indicator | null;
  onClose: () => void;
  onSave: (data: Partial<Indicator>) => void;
}

export default function CreateModal({ isOpen, indicator, onClose, onSave }: CreateModalProps) {
  const isEdit = !!indicator;
  const categories = useMemo(() => getIndicatorCategories().filter(c => c !== '全部'), []);

  // 表单状态
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '生产指标',
    unit: '',
    target: 0,
    actual: 0,
    source: '自动采集',
    warning: 0,
    weight: 0,
    frequency: '月度',
  });

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (indicator) {
        setFormData({
          code: indicator.code || '',
          name: indicator.name || '',
          category: indicator.category || '生产指标',
          unit: indicator.unit || '',
          target: indicator.target || 0,
          actual: indicator.actual || 0,
          source: indicator.source || '自动采集',
          warning: indicator.warning || 0,
          weight: indicator.weight || 0,
          frequency: indicator.frequency || '月度',
        });
      } else {
        setFormData({
          code: '',
          name: '',
          category: '生产指标',
          unit: '',
          target: 0,
          actual: 0,
          source: '自动采集',
          warning: 0,
          weight: 0,
          frequency: '月度',
        });
      }
    }
  }, [isOpen, indicator]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }
    onSave(formData);
  };

  // 采集方式选项
  const sourceOptions = ['自动采集', '人工录入'];

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button size="sm" variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button size="sm" variant="default" onClick={handleSubmit}><Save className="w-4 h-4" /> 保存</Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? '编辑指标' : '新增指标'}
      size="lg"
      showFooter={true}
      footer={footer}
      showMaximize={true}
      enableDrag={true}
      enableResize={true}
    >
      <div className="space-y-4">
        <div>
          <Label className="text-gray-700">
            指标编码 <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            value={formData.code}
            onChange={e => handleChange('code', e.target.value)}
            placeholder="系统自动生成"
            disabled
            className="border-gray-300 bg-gray-50"
          />
        </div>
        <div>
          <Label className="text-gray-700">
            指标名称 <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="请输入指标名称"
            className="border-gray-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">类别</Label>
            <Select value={formData.category} onValueChange={(val) => handleChange('category', val)}>
              <SelectTrigger className="border-gray-300"><SelectValue placeholder="请选择类别" /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">单位</Label>
            <Input
              type="text"
              value={formData.unit}
              onChange={e => handleChange('unit', e.target.value)}
              placeholder="如: %, 元, kg"
              className="border-gray-300"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">目标值</Label>
            <Input
              type="number"
              value={formData.target}
              onChange={e => handleChange('target', parseFloat(e.target.value) || 0)}
              className="border-gray-300"
            />
          </div>
          <div>
            <Label className="text-gray-700">实际值</Label>
            <Input
              type="number"
              value={formData.actual}
              onChange={e => handleChange('actual', parseFloat(e.target.value) || 0)}
              className="border-gray-300"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">数据采集方式</Label>
            <Select value={formData.source} onValueChange={(val) => handleChange('source', val)}>
              <SelectTrigger className="border-gray-300"><SelectValue placeholder="请选择采集方式" /></SelectTrigger>
              <SelectContent>
                {sourceOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-700">权重</Label>
            <Input
              type="number"
              value={formData.weight}
              onChange={e => handleChange('weight', parseFloat(e.target.value) || 0)}
              className="border-gray-300"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
