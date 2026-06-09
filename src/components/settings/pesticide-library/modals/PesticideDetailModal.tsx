/**
 * 药剂详情查看弹窗组件
 * 只读视图，以网格形式展示所有字段
 */
import React from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { PesticideLibrary } from '@/stores';

interface PesticideDetailModalProps {
  isOpen: boolean;
  record: PesticideLibrary;
  onClose: () => void;
}

// 防治类型 Badge
const getControlTypeBadge = (type: string) => {
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

export function PesticideDetailModal({ isOpen, record, onClose }: PesticideDetailModalProps) {
  if (!record) return null;

  // 详情字段定义
  const fields = [
    { label: '药剂编码', value: record.pesticideCode || '-', mono: true },
    { label: '药剂名称', value: record.pesticideName || '-', bold: true },
    { label: '药剂成分', value: record.ingredient || '-' },
    { label: '作用机制', value: record.mechanism || '-' },
    {
      label: '防治类型',
      value: record.controlType,
      badge: true,
    },
    { label: '功能说明', value: record.functionDesc || '-' },
    { label: '使用禁忌', value: record.tabooDesc || '-' },
    { label: '防治对象', value: record.targetPests || '-' },
    { label: '创建时间', value: record.createTime || '-' },
    { label: '更新时间', value: record.updateTime || '-' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="药剂详情"
      size="lg"
      showFooter={false}
    >
      {/* 编号头部 */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 mb-4 border border-red-100">
        <div className="text-xs text-gray-500 mb-1">药剂编码</div>
        <div className="text-xl font-mono font-bold text-red-700">{record.pesticideCode || '-'}</div>
        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
          {record.pesticideName}
          {getControlTypeBadge(record.controlType)}
        </div>
      </div>

      {/* 规格列表 */}
      {record.specs && record.specs.length > 0 && (
        <div className="mb-4">
          <Label className="text-xs text-gray-500 mb-2 block">规格信息</Label>
          <div className="space-y-2">
            {record.specs.map((spec, index) => (
              <div
                key={spec.id || index}
                className="grid grid-cols-9 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
              >
                <div>
                  <span className="text-xs text-gray-500">品牌名称</span>
                  <p className="text-gray-900">{spec.brandName || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">含量</span>
                  <p className="text-gray-900 font-medium">{spec.specContent || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">剂型</span>
                  <p className="text-gray-900">{spec.formulation || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">生产厂家</span>
                  <p className="text-gray-900">{spec.manufacturer || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">建议用量</span>
                  <p className="text-gray-900">{spec.suggestedDosage || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">单位</span>
                  <p className="text-gray-900">{spec.dosageUnit || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">稀释比例</span>
                  <p className="text-gray-900">{spec.suggestedRatio || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">作用机制</span>
                  <p className="text-gray-900">{spec.mechanism || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">备注</span>
                  <p className="text-gray-900">{spec.remark || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 详情网格 */}
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field, idx) => {
          // 全宽字段（如备注）
          if (field.label === '功能说明' || field.label === '使用禁忌' || field.label === '防治对象') {
            return (
              <div key={idx} className="col-span-2">
                <Label className="text-xs text-gray-500">{field.label}</Label>
                <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
                  {field.badge ? (
                    getControlTypeBadge(field.value)
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
                  getControlTypeBadge(field.value)
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
