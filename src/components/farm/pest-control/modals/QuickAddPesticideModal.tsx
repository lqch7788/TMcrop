/**
 * 快速新增药剂弹窗
 * 简化的药剂新增表单，用于病虫害防治记录时快速添加
 * 2026-07-10：取消防治类型分类，默认给药剂类型 ["insecticide"]（杀虫剂）
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
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

  // 2026-07-10：取消 controlType 字段，pesticideTypes 默认 ['insecticide']（杀虫剂），后续可在药剂库编辑修改
  const [form, setForm] = useState({
    pesticideName: '',
    pesticideCode: '',
    pesticideTypes: ['insecticide'] as string[],
    functionDesc: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.pesticideName.trim()) {
      // 2026-07-28 审核 M：showAlert 只接受 1 个参数（message），删掉多余的 'warning'
      showAlert('请输入药剂名称');
      return;
    }

    setSubmitting(true);
    try {
      // 2026-07-10：编码可由用户填，不填则后端生成
      const payload: Record<string, unknown> = {
        pesticideName: form.pesticideName,
        pesticideTypes: form.pesticideTypes,
        functionDesc: form.functionDesc,
        status: 'active',
      };
      if (form.pesticideCode.trim()) {
        payload.pesticideCode = form.pesticideCode.trim();
      }

      const newItem = await store.createItem(payload as Partial<typeof store.items[number]>);

      if (newItem) {
        onSaved(newItem.id, newItem.pesticideName);
        handleClose();
      }
    } catch (error) {
      // 2026-07-28 审核 M：删掉多余的 'error'
      showAlert(`添加失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      pesticideName: '',
      pesticideCode: '',
      pesticideTypes: ['insecticide'],
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
            placeholder="留空由后端自动生成"
            className={deepInputClass}
          />
        </div>

        {/* 2026-07-10：药剂类型默认「杀虫剂」，保存后可在药剂库编辑修改 */}
        <div className="text-xs text-gray-500 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          💡 药剂类型默认为「杀虫剂」，如需调整请到药剂库编辑修改。
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
            <X className="w-4 h-4" /> 取消
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