/**
 * 病虫害字典编辑弹窗组件
 * 字段：病虫害名称（必填）、类型（虫害/病害）、适用作物、描述
 * 使用 UnifiedModal 包装，提交时调用 store.updateItem()
 */
import React, { useState, useCallback, useEffect } from 'react';

import { X } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { usePestDiseaseDictStore, usePesticideLibraryStore, PestDiseaseDict } from '@/stores';
import { ImageUploader } from '@/components/ui';

interface EditPestDiseaseModalProps {
  isOpen: boolean;
  record: PestDiseaseDict;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPestDiseaseModal({ isOpen, record, onClose, onSaved }: EditPestDiseaseModalProps) {
  const store = usePestDiseaseDictStore();
  const pesticideStore = usePesticideLibraryStore();

  const [form, setForm] = useState({
    dictName: '',
    dictType: 'pest' as 'pest' | 'disease',
    targetCrops: '',
    description: '',
    // 2026-07-16：编辑现有病虫害时保留原图片（base64 数组）
    images: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  // 选中的关联药剂
  const [selectedPesticides, setSelectedPesticides] = useState<string[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  // 药剂搜索和过滤
  const [pesticideSearch, setPesticideSearch] = useState('');
  // 2026-07-16：pesticide_typeFilter 字段对齐药剂库字典 dict_code（杀虫剂/杀菌剂/...）
  // 旧的「化学/生物/物理」分类已废弃
  const PESTICIDE_TYPE_OPTIONS = [
    { code: 'insecticide',  label: '杀虫剂',  emoji: '🐛', active: 'bg-red-500',    idle: 'bg-red-50 text-red-600 border-red-200' },
    { code: 'fungicide',    label: '杀菌剂',  emoji: '🦠', active: 'bg-cyan-500',   idle: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { code: 'herbicide',    label: '除草剂',  emoji: '🌿', active: 'bg-emerald-500',idle: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { code: 'acaricide',    label: '杀螨剂',  emoji: '🕷️', active: 'bg-purple-500', idle: 'bg-purple-50 text-purple-600 border-purple-200' },
    { code: 'protective',   label: '保护剂',  emoji: '🛡️', active: 'bg-blue-500',   idle: 'bg-blue-50 text-blue-600 border-blue-200' },
    { code: 'adjuvant',     label: '助剂',    emoji: '💧', active: 'bg-amber-500',  idle: 'bg-amber-50 text-amber-600 border-amber-200' },
    { code: 'other',        label: '其他',    emoji: '📦', active: 'bg-gray-500',   idle: 'bg-gray-50 text-gray-600 border-gray-200' },
  ] as const;
  type PesticideTypeCode = typeof PESTICIDE_TYPE_OPTIONS[number]['code'];
  const [pesticideTypeFilter, setPesticideTypeFilter] = useState<'all' | PesticideTypeCode>('all');

  // 预填充数据
  useEffect(() => {
    if (isOpen && record) {
      setForm({
        dictName: record.dictName || '',
        dictType: record.dictType || 'pest',
        targetCrops: record.targetCrops || '',
        description: record.description || '',
        images: Array.isArray(record.images) ? record.images : [],
      });
      // 加载关联的药剂
      loadRelations();
      // 确保药剂列表已加载（强制刷新获取所有药剂）
      pesticideStore.fetchItems();
    }
  }, [isOpen, record]);

  // 加载关联的药剂
  const loadRelations = async () => {
    if (!record) return;
    setLoadingRelations(true);
    const pesticides = await store.fetchRelatedPesticides(record.id);
    setSelectedPesticides(pesticides.map(p => p.id));
    setLoadingRelations(false);
  };

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

  // 过滤后的药剂列表
  const filteredPesticides = pesticideStore.items.filter((p) => {
    const matchesSearch =
      pesticideSearch === '' ||
      p.pesticideName.includes(pesticideSearch) ||
      p.pesticideCode.includes(pesticideSearch);
    // 2026-07-10：controlType 已删除，pesticideTypeFilter 改为按 pesticideTypes[] 包含判断
    const matchesType = pesticideTypeFilter === 'all' || (p.pesticideTypes || []).includes(pesticideTypeFilter);
    return matchesSearch && matchesType;
  });

  // 提交表单
  const handleSubmit = async () => {
    if (!form.dictName.trim()) return; // 基本校验
    setSubmitting(true);
    await store.updateItem(record.id, {
      dictName: form.dictName,
      dictType: form.dictType,
      targetCrops: form.targetCrops,
      description: form.description,
      // 2026-07-16：编辑保存图片数组
      images: form.images,
    });
    // 更新关联的药剂
    await store.updateRelations(record.id, selectedPesticides);
    setSubmitting(false);
    onSaved();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`编辑${form.dictType === 'pest' ? '虫害' : '病害'}字典 - ${record.dictCode}`}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">编码</Label>
                <Input
                  type="text"
                  value={record.dictCode || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed font-mono text-gray-600"
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
            {/* 2026-07-16：图片字段（编辑现有图片）+ 描述字段同行 grid-cols-2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
              {/* 列 1：图片 — 2026-07-16 修复：不强制固定高度，让 ImageUploader 自然高度 */}
              <div className="flex flex-col">
                <Label className="text-gray-900">
                  图片 <span className="text-xs text-gray-500">（最多 5 张，建议小于 1MB/张）</span>
                </Label>
                <ImageUploader
                  value={form.images}
                  onChange={(arr) => updateField('images', arr)}
                  maxCount={5}
                  compact
                />
              </div>
              {/* 列 2：描述 — 同步固定高度 */}
              <div className="flex flex-col">
                <Label className="text-gray-900">描述</Label>
                <TextArea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="请输入病虫害描述"
                  rows={3}
                  className="w-full h-[100px] px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
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
            {PESTICIDE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setPesticideTypeFilter(opt.code)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pesticideTypeFilter === opt.code
                    ? `${opt.active} text-white shadow-md`
                    : `${opt.idle} hover:opacity-80 border`
                }`}
              >
                <span className="mr-1">{opt.emoji}</span>{opt.label}
              </button>
            ))}
          </div>
          {/* 左右列表 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 左侧：可选列表 */}
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <span className="mr-2">📋</span> 可选药剂
                <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{loadingRelations ? '...' : filteredPesticides.length}</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto border border-gray-300 rounded-lg bg-white p-2 space-y-1">
                {loadingRelations ? (
                  <div className="text-center text-gray-400 py-8 text-sm">加载中...</div>
                ) : filteredPesticides.length === 0 ? (
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
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="warning"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting || !form.dictName.trim()}
        >
          {submitting ? '保存中...' : '保存修改'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
