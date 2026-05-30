/**
 * 快速新增病虫害弹窗
 * 简化的病虫害字典新增表单，用于病虫害防治记录时快速添加
 */
import React, { useState } from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextArea } from '@/components/ui/TextArea';
import { usePestDiseaseDictStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface QuickAddPestDiseaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'pest' | 'disease';
  onSaved: (pestId: string, pestName: string) => void;
}

export function QuickAddPestDiseaseModal({ isOpen, onClose, defaultType = 'pest', onSaved }: QuickAddPestDiseaseModalProps) {
  const store = usePestDiseaseDictStore();

  const [form, setForm] = useState({
    dictName: '',
    dictType: defaultType as 'pest' | 'disease',
    targetCrops: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.dictName.trim()) {
      showAlert('请输入病虫害名称', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const newItem = await store.createItem({
        dictName: form.dictName,
        dictType: form.dictType,
        targetCrops: form.targetCrops,
        description: form.description,
        status: 'active',
      });

      if (newItem) {
        onSaved(newItem.id, newItem.dictName);
        handleClose();
      }
    } catch (error) {
      showAlert('添加失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      dictName: '',
      dictType: defaultType,
      targetCrops: '',
      description: '',
    });
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`快速新增${form.dictType === 'pest' ? '虫害' : '病害'}`}
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        <div>
          <Label className="text-gray-900">病虫害名称 <span className="text-red-500">*</span></Label>
          <Input
            type="text"
            value={form.dictName}
            onChange={(e) => updateField('dictName', e.target.value)}
            placeholder="请输入病虫害名称"
            className={deepInputClass}
          />
        </div>

        <div>
          <Label className="text-gray-900">类型</Label>
          <div className="flex gap-4">
            {[
              { value: 'pest', label: '虫害' },
              { value: 'disease', label: '病害' },
            ].map(opt => (
              <div
                key={opt.value}
                onClick={() => updateField('dictType', opt.value)}
                className={`
                  px-4 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                  ${form.dictType === opt.value
                    ? opt.value === 'pest'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }
                `}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-gray-900">适用作物</Label>
          <Input
            type="text"
            value={form.targetCrops}
            onChange={(e) => updateField('targetCrops', e.target.value)}
            placeholder="多个用逗号分隔，如：番茄,黄瓜"
            className={deepInputClass}
          />
        </div>

        <div>
          <Label className="text-gray-900">描述</Label>
          <TextArea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="请输入病虫害描述"
            rows={3}
            className={`${deepInputClass} resize-none`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            取消
          </Button>
          <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}

export default QuickAddPestDiseaseModal;
