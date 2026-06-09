/**
 * 病虫害详情查看弹窗组件
 * 显示病虫害基本信息及关联的药剂列表
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
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

  // 加载关联的药剂
  useEffect(() => {
    if (isOpen && record) {
      loadRelatedPesticides();
    }
  }, [isOpen, record]);

  const loadRelatedPesticides = async () => {
    if (!record) return;
    setLoadingRelations(true);
    const pesticides = await pestDiseaseStore.fetchRelatedPesticides(record.id);
    setRelatedPesticides(pesticides);
    setLoadingRelations(false);
  };

  if (!record) return null;

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
                <div className="ml-4">
                  {getPesticideTypeBadge(pesticide.controlType)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </UnifiedModal>
  );
}
