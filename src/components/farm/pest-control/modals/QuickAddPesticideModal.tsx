/**
 * 快速新增药剂弹窗
 * 简化的药剂新增表单，用于病虫害防治记录时快速添加
 */
import React, { useState } from 'react';
import { UnifiedModal } from '@/components/ui/UnifiedModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePesticideLibraryStore } from '@/stores';
import { showAlert } from '@/lib/dialogService';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface QuickAddPesticideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (pesticideId: string, pesticideName: string) => void;
}

export function QuickAddPesticideModal({ isOpen, onClose, onSaved }: QuickAddPesticideModalProps) {
  const store = usePesticideLibraryStore();

  const [form, setForm] = useState({
    pesticideName: '',
    pesticideCode: '',
    controlType: 'chemical' as 'chemical' | 'bio' | 'physical',
    functionDesc: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.pesticideName.trim()) {
      showAlert('请输入药剂名称', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 生成编码
      let code = form.pesticideCode;
      if (!code) {
        code = await store.fetchNextCode();
      }

      const newItem = await store.createItem({
        pesticideCode: code,
        pesticideName: form.pesticideName,
        controlType: form.controlType,
        functionDesc: form.functionDesc,
        status: 'active',
      });

      if (newItem) {
        onSaved(newItem.id, newItem.pesticideName);
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
      pesticideName: '',
      pesticideCode: '',
      controlType: 'chemical',
      functionDesc: '',
    });
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="快速新增药剂"
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        <div>
          <Label className="text-gray-900">药剂名称 <span className="text-red-500">*</span></Label>
          <Input
            type="text"
            value={form.pesticideName}
            onChange={(e) => updateField('pesticideName', e.target.value)}
            placeholder="请输入药剂名称"
            className={deepInputClass}
          />
        </div>

        <div>
          <Label className="text-gray-900">药剂编码</Label>
          <Input
            type="text"
            value={form.pesticideCode}
            onChange={(e) => updateField('pesticideCode', e.target.value)}
            placeholder="留空自动生成"
            className={deepInputClass}
          />
        </div>

        <div>
          <Label className="text-gray-900">防治类型</Label>
          <div className="flex gap-4">
            {[
              { value: 'chemical', label: '化学' },
              { value: 'bio', label: '生物' },
              { value: 'physical', label: '物理' },
            ].map(opt => (
              <div
                key={opt.value}
                onClick={() => updateField('controlType', opt.value)}
                className={`
                  px-4 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                  ${form.controlType === opt.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-emerald-300 text-gray-600'
                  }
                `}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-gray-900">功能描述</Label>
          <Input
            type="text"
            value={form.functionDesc}
            onChange={(e) => updateField('functionDesc', e.target.value)}
            placeholder="请输入功能描述"
            className={deepInputClass}
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

export default QuickAddPesticideModal;
