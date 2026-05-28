/**
 * 病虫害字典新增弹窗组件
 * 字段：病虫害名称（必填）、类型（虫害/病害，根据Tab自动设置）、适用作物（逗号分隔）、描述
 * 使用 UnifiedModal 包装，提交时调用 store.createItem()
 */
import React, { useState, useCallback, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { TextArea } from '../../../ui/TextArea';
import { usePestDiseaseDictStore } from '@/stores';

interface AddPestDiseaseModalProps {
  isOpen: boolean;
  dictType: 'pest' | 'disease';
  onClose: () => void;
  onSaved: () => void;
}

// 默认表单数据
const defaultForm = {
  dictCode: '',
  dictName: '',
  dictType: 'pest' as const,
  targetCrops: '',
  description: '',
};

export function AddPestDiseaseModal({ isOpen, dictType, onClose, onSaved }: AddPestDiseaseModalProps) {
  const store = usePestDiseaseDictStore();

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // 生成编码
  const generateCode = async () => {
    setGeneratingCode(true);
    const nextCode = await store.fetchNextCode(form.dictType);
    setForm(prev => ({ ...prev, dictCode: nextCode }));
    setGeneratingCode(false);
  };

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setForm({ ...defaultForm, dictType });
    }
  }, [isOpen, dictType]);

  // 更新表单字段
  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 提交表单
  const handleSubmit = async () => {
    if (!form.dictName.trim()) return; // 基本校验
    setSubmitting(true);
    await store.createItem({
      dictCode: form.dictCode,
      dictName: form.dictName,
      dictType: form.dictType,
      targetCrops: form.targetCrops,
      description: form.description,
      status: 'active',
    });
    setSubmitting(false);
    onSaved();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`新增${form.dictType === 'pest' ? '虫害' : '病害'}字典`}
      size="xxl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-900">
                病虫害编码
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={form.dictCode}
                  readOnly
                  placeholder="点击生成获取编码"
                  className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none font-mono bg-gray-50"
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={generateCode}
                  disabled={generatingCode}
                  className="px-3"
                >
                  {generatingCode ? '生成中...' : '生成'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-gray-900">
                病虫害名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={form.dictName}
                onChange={(e) => updateField('dictName', e.target.value)}
                placeholder="请输入病虫害名称"
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <Label className="text-gray-900">类型</Label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50">
                {form.dictType === 'pest' ? (
                  <span className="text-orange-600 font-medium">虫害</span>
                ) : (
                  <span className="text-purple-600 font-medium">病害</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">根据当前Tab自动设置，不可修改</p>
            </div>
          </div>
        </div>

        {/* Section 2: 详细信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📝 详细信息</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-gray-900">适用作物</Label>
              <Input
                type="text"
                value={form.targetCrops}
                onChange={(e) => updateField('targetCrops', e.target.value)}
                placeholder="请输入适用作物，多个用逗号分隔，如：水稻,小麦,玉米"
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">多个作物用逗号分隔</p>
            </div>
            <div>
              <Label className="text-gray-900">描述</Label>
              <TextArea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="请输入病虫害描述"
                rows={4}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !form.dictName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
