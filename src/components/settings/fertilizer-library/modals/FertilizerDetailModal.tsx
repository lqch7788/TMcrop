/**
 * 肥料详情查看弹窗组件
 * 只读视图，以网格形式展示所有字段
 */
import React from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { FertilizerLibrary } from '@/stores';
import { getDictItemName } from '@/stores';

interface FertilizerDetailModalProps {
  isOpen: boolean;
  record: FertilizerLibrary;
  onClose: () => void;
}

// 施肥时期 Badge 配置
const getTimingBadgeConfig = (timing: string) => {
  switch (timing) {
    case 'base': return { bg: 'bg-amber-100', text: 'text-amber-700', label: '底肥' };
    case 'dressing': return { bg: 'bg-green-100', text: 'text-green-700', label: '追肥' };
    case 'foliar': return { bg: 'bg-blue-100', text: 'text-blue-700', label: '叶面肥' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: timing };
  }
};

// 施肥时期 Badge（支持多选）
const getApplicationTimingBadge = (timing: string) => {
  if (!timing) return '-';
  const timings = timing.split(',').map(t => t.trim()).filter(Boolean);
  if (timings.length === 0) return '-';
  return (
    <div className="flex flex-wrap gap-1">
      {timings.map((t, idx) => {
        const badge = getTimingBadgeConfig(t);
        return (
          <span
            key={idx}
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        );
      })}
    </div>
  );
};

// 获取肥料类型标签
const getFertilizerTypeLabel = (type: string) => {
  if (!type) return '-';
  const label = getDictItemName('fertilizer_type', type);
  return label || type;
};

export function FertilizerDetailModal({ isOpen, record, onClose }: FertilizerDetailModalProps) {
  if (!record) return null;

  // 详情字段定义（不同类型字段用不同背景色区分）
  const fields = [
    { label: '肥料编码', value: record.fertilizerCode || '-', mono: true, bgColor: 'bg-amber-50' },
    { label: '肥料名称', value: record.fertilizerName || '-', bold: true, bgColor: 'bg-blue-50' },
    { label: '肥料类型', value: getFertilizerTypeLabel(record.fertilizerType || ''), bgColor: 'bg-blue-50' },
    { label: '施肥时期', value: record.applicationTiming, badge: true, bgColor: 'bg-blue-50' },
    { label: '功能说明', value: record.functionDesc || '-', bgColor: 'bg-purple-50' },
    { label: '使用禁忌', value: record.tabooDesc || '-', bgColor: 'bg-red-50' },
    { label: '保质期', value: record.shelfLife || '-', bgColor: 'bg-green-50' },
    { label: '存储条件', value: record.storageCondition || '-', bgColor: 'bg-green-50' },
    { label: '供应商信息', value: record.supplierInfo || '-', bgColor: 'bg-orange-50' },
    { label: '创建时间', value: record.createTime || '-', bgColor: 'bg-gray-50' },
    { label: '更新时间', value: record.updateTime || '-', bgColor: 'bg-gray-50' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="肥料详情"
      size="lg"
      showFooter={false}
    >
      {/* 编号头部 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 mb-4 border border-amber-100">
        <div className="text-xs text-gray-500 mb-1">肥料编码</div>
        <div className="text-xl font-mono font-bold text-amber-700">{record.fertilizerCode || '-'}</div>
        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
          {record.fertilizerName}
          {getApplicationTimingBadge(record.applicationTiming || '')}
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
                className="grid grid-cols-7 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm"
              >
                <div>
                  <span className="text-xs text-gray-500">品牌名称</span>
                  <p className="text-gray-900 font-medium">{spec.brandName || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">成份与含量</span>
                  <p className="text-gray-900 font-medium">{spec.specContent || '-'}</p>
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
                  <p className="text-gray-900">{getDictItemName('dosage_unit', spec.dosageUnit || '') || spec.dosageUnit || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">稀释比例</span>
                  <p className="text-gray-900">{spec.suggestedRatio || '-'}</p>
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
          if (field.label === '功能说明' || field.label === '使用禁忌' || field.label === '供应商信息') {
            return (
              <div key={idx} className="col-span-2">
                <Label className="text-xs text-gray-500">{field.label}</Label>
                <div className={`text-sm text-gray-900 ${field.bgColor || 'bg-gray-50'} rounded-lg p-3 min-h-[40px]`}>
                  {field.badge ? (
                    getApplicationTimingBadge(field.value)
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
              <div className={`text-sm ${field.bgColor || 'bg-gray-50'} rounded-lg p-3 ${field.highlight || 'text-gray-900'}`}>
                {field.mono ? (
                  <span className="font-mono">{field.value}</span>
                ) : field.bold ? (
                  <span className="font-bold">{field.value}</span>
                ) : field.badge ? (
                  getApplicationTimingBadge(field.value)
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
          关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}
