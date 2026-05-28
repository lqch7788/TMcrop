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
import { usePestDiseaseDictStore, usePesticideLibraryStore } from '@/stores';

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
  const pesticideStore = usePesticideLibraryStore();

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // 选中的关联药剂
  const [selectedPesticides, setSelectedPesticides] = useState<string[]>([]);

  // 药剂搜索和过滤
  const [pesticideSearch, setPesticideSearch] = useState('');
  const [pesticideTypeFilter, setPesticideTypeFilter] = useState<'all' | 'chemical' | 'bio' | 'physical'>('all');

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
      setSelectedPesticides([]);
      setPesticideSearch('');
      setPesticideTypeFilter('all');
      // 确保药剂列表已加载（强制刷新获取所有药剂）
      pesticideStore.fetchItems();
    }
  }, [isOpen, dictType]);

  // 更新表单字段
  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 切换药剂选中状态
  const togglePesticide = (pesticideId: string) => {
    setSelectedPesticides(prev =>
      prev.includes(pesticideId)
        ? prev.filter(id => id !== pesticideId)
        : [...prev, pesticideId]
    );
  };

  // 过滤后的药剂列表（支持名称、编码、功能描述搜索）
  const filteredPesticides = pesticideStore.items.filter((p) => {
    const searchLower = pesticideSearch.toLowerCase();
    const matchesSearch =
      pesticideSearch === '' ||
      p.pesticideName.toLowerCase().includes(searchLower) ||
      p.pesticideCode.toLowerCase().includes(searchLower) ||
      (p.functionDesc && p.functionDesc.toLowerCase().includes(searchLower)) ||
      (p.ingredient && p.ingredient.toLowerCase().includes(searchLower));
    const matchesType = pesticideTypeFilter === 'all' || p.controlType === pesticideTypeFilter;
    return matchesSearch && matchesType;
  });

  // 提交表单
  const handleSubmit = async () => {
    if (!form.dictName.trim()) return; // 基本校验
    setSubmitting(true);

    // 创建病虫害记录
    const newItem = await store.createItem({
      dictCode: form.dictCode,
      dictName: form.dictName,
      dictType: form.dictType,
      targetCrops: form.targetCrops,
      description: form.description,
      status: 'active',
    });

    // 如果有关联的药剂，建立关联
    if (newItem && selectedPesticides.length > 0) {
      await store.updateRelations(newItem.id, selectedPesticides);
    }

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

        {/* Section 3: 关联药剂 */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="text-base font-bold text-gray-900 mb-2">💊 关联药剂</h3>
          <p className="text-sm text-gray-500 mb-3">选择能治疗该病虫害的药剂（支持名称、编码、功能描述搜索）</p>
          {/* 搜索框 */}
          <div className="mb-3">
            <Input
              type="text"
              value={pesticideSearch}
              onChange={(e) => setPesticideSearch(e.target.value)}
              placeholder="搜索药剂名称、编码或功能..."
              className="w-full h-10 px-4 text-sm"
            />
          </div>
          {/* 类型筛选按钮 - 彩色图块 */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPesticideTypeFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pesticideTypeFilter === 'all'
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setPesticideTypeFilter('chemical')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pesticideTypeFilter === 'chemical'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              🧪 化学
            </button>
            <button
              type="button"
              onClick={() => setPesticideTypeFilter('bio')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pesticideTypeFilter === 'bio'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
              }`}
            >
              🌿 生物
            </button>
            <button
              type="button"
              onClick={() => setPesticideTypeFilter('physical')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pesticideTypeFilter === 'physical'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              🔧 物理
            </button>
          </div>
          {/* 左右列表 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 左侧：可选列表 */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="mr-2">📋</span> 可选药剂
                <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{filteredPesticides.length}</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-gray-300 rounded-lg bg-white p-2 space-y-1">
                {filteredPesticides.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">无匹配药剂</div>
                ) : (
                  filteredPesticides.map((pesticide) => (
                    <button
                      key={pesticide.id}
                      type="button"
                      onClick={() => togglePesticide(pesticide.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        selectedPesticides.includes(pesticide.id)
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                      }`}
                    >
                      <span className="font-medium text-base">{pesticide.pesticideName}</span>
                      <span className="text-xs text-gray-500 ml-2">{pesticide.pesticideCode}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
            {/* 右侧：已选列表 */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="mr-2">✅</span> 已选药剂
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{selectedPesticides.length}</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-green-200 rounded-lg bg-green-50 p-2 space-y-1">
                {selectedPesticides.length === 0 ? (
                  <div className="text-center text-gray-400 py-8 text-sm">请从左侧选择</div>
                ) : (
                  selectedPesticides.map((id) => {
                    const pesticide = pesticideStore.items.find((p) => p.id === id);
                    return pesticide ? (
                      <div key={id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-green-200">
                        <div>
                          <div className="font-medium text-gray-800">{pesticide.pesticideName}</div>
                          <div className="text-xs text-gray-500">{pesticide.pesticideCode}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePesticide(id)}
                          className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })
                )}
              </div>
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
