/**
 * 病虫害详情查看弹窗组件
 * 显示病虫害基本信息及关联的药剂列表
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
// 2026-07-10：pesticideTypes 多值 label 翻译
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { usePestDiseaseDictStore, usePesticideLibraryStore, PestDiseaseDict, PesticideForRelation } from '@/stores';

interface PestDiseaseDetailModalProps {
  isOpen: boolean;
  record: PestDiseaseDict | null;
  onClose: () => void;
}

// 防治类型 Badge
const getTypeBadge = (type: string) => {
  switch (type) {
    case 'pest':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          虫害
        </span>
      );
    case 'disease':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          病害
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {type}
        </span>
      );
  }
};

// 药剂类型 Badge
const getPesticideTypeBadge = (type: string) => {
  switch (type) {
    case 'chemical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          化学防治
        </span>
      );
    case 'bio':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          生物防治
        </span>
      );
    case 'physical':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          物理防治
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {type}
        </span>
      );
  }
};

export function PestDiseaseDetailModal({ isOpen, record, onClose }: PestDiseaseDetailModalProps) {
  const pestDiseaseStore = usePestDiseaseDictStore();

  const [relatedPesticides, setRelatedPesticides] = useState<PesticideForRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  // 2026-07-17：图片全屏预览
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 加载关联的药剂
  useEffect(() => {
    if (isOpen && record) {
      loadRelatedPesticides();
    }
  }, [isOpen, record]);

  const loadRelatedPesticides = async () => {
    if (!record) return;
    setLoadingRelations(true);
    try {
      const pesticides = await pestDiseaseStore.fetchRelatedPesticides(record.id);
      setRelatedPesticides(pesticides);
    } finally {
      setLoadingRelations(false);
    }
  };

  if (!record) return null;

  // 2026-07-17：图片数组（store normalize 已 parseImages 为 string[]，兜底再防御一层）
  const images: string[] = Array.isArray(record.images) ? record.images : [];

  // 详情字段定义
  const fields = [
    { label: '病虫害编码', value: record.dictCode || '-', mono: true },
    { label: '病虫害名称', value: record.dictName || '-', bold: true },
    { label: '类型', value: record.dictType, badge: true },
    { label: '适用作物', value: record.targetCrops || '-' },
    { label: '描述', value: record.description || '-', fullWidth: true },
    { label: '状态', value: record.status === 'active' ? '启用' : '禁用' },
    { label: '创建时间', value: record.createTime ? new Date(record.createTime).toLocaleString() : '-' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="病虫害详情"
      size="lg"
      showFooter={false}
    >
      {/* 编号头部 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 mb-4 border border-orange-100">
        <div className="text-xs text-gray-500 mb-1">病虫害编码</div>
        <div className="text-xl font-mono font-bold text-orange-700">{record.dictCode || '-'}</div>
        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
          {record.dictName}
          {getTypeBadge(record.dictType)}
        </div>
      </div>

      {/* 关联药剂列表 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-gray-700">关联药剂 ({relatedPesticides.length})</Label>
          {loadingRelations && <span className="text-xs text-gray-400">加载中...</span>}
        </div>
        {relatedPesticides.length === 0 ? (
          <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
            暂无关联药剂
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {relatedPesticides.map((pesticide) => (
              <div
                key={pesticide.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{pesticide.pesticideName}</div>
                  <div className="text-sm text-gray-500 font-mono">{pesticide.pesticideCode}</div>
                </div>
                {/* 2026-07-10：controlType 已删除，改为 pesticideTypes 多值 chips 展示
                    2026-07-17：修复 — 原注释用 // 直接写在 JSX 里被当文本渲染 */}
                <div className="ml-4 flex flex-wrap gap-1">
                  {(pesticide.pesticideTypes || []).map(t => (
                    <span
                      key={t}
                      className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
                    >
                      {getDictLabel('pesticide_type', t) || t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2026-07-17：图片区块（缩略图 + 点击全屏预览） */}
      {images.length > 0 && (
        <div className="mb-4">
          <Label className="text-gray-700 mb-2 block">图片 ({images.length})</Label>
          <div className="flex flex-wrap gap-2">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`病虫害图片 ${idx + 1}`}
                className="w-24 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setPreviewUrl(src)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 详情网格 */}
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field, idx) => {
          if (field.fullWidth) {
            return (
              <div key={idx} className="col-span-2">
                <Label className="text-xs text-gray-500">{field.label}</Label>
                <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
                  {field.badge ? (
                    getTypeBadge(field.value)
                  ) : (
                    field.value
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={idx}>
              <Label className="text-xs text-gray-500">{field.label}</Label>
              <div className={`text-sm ${field.highlight || 'text-gray-900'}`}>
                {field.mono ? (
                  <span className="font-mono">{field.value}</span>
                ) : field.bold ? (
                  <span className="font-bold">{field.value}</span>
                ) : field.badge ? (
                  getTypeBadge(field.value)
                ) : (
                  field.value
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部关闭按钮 */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>

      {/* 2026-07-17：图片全屏预览层 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewUrl}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </UnifiedModal>
  );
}
