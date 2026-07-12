/**
 * 肥料详情查看弹窗组件（扁平化 2026-07-12）
 * 只读视图，展示全部 26 字段（对应 DB fertilizer_specs 所有列）
 * 统一 4 列网格布局，统一字段背景色
 */
import React from 'react';
import { X } from 'lucide-react';

import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { FertilizerSpec } from '@/stores';
import { getDictItemName } from '@/stores';

interface FertilizerDetailModalProps {
  isOpen: boolean;
  record: FertilizerSpec;
  onClose: () => void;
}

// 施肥时期 Badge 配置
const TIMING_OPTIONS = [
  { value: 'base', label: '底肥', bg: 'bg-amber-100', text: 'text-amber-700' },
  { value: 'dressing', label: '追肥', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'foliar', label: '叶面肥', bg: 'bg-blue-100', text: 'text-blue-700' },
];

const getTimingBadgeConfig = (timing: string) => {
  const found = TIMING_OPTIONS.find(t => t.value === timing);
  return found || { bg: 'bg-gray-100', text: 'text-gray-700', label: timing };
};

// 施肥时期 Badge 渲染（支持逗号分隔多选）
const renderApplicationTiming = (timing?: string) => {
  if (!timing) return <span className="text-gray-400">-</span>;
  const timings = timing.split(',').map(t => t.trim()).filter(Boolean);
  if (timings.length === 0) return <span className="text-gray-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {timings.map((t, idx) => {
        const cfg = getTimingBadgeConfig(t);
        return (
          <span key={idx} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
};

// 肥料类型中文标签
const getFertilizerTypeLabel = (type?: string) => {
  if (!type) return '-';
  return getDictItemName('fertilizer_type', type) || type;
};

// 库存颜色
const getStockColor = (stock: number) => {
  if (stock === 0) return 'text-red-600 font-semibold';
  if (stock < 50) return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
};

// 统一字段配置（不再区分 fullWidth/highlight）
interface DetailField {
  label: string;
  value: React.ReactNode;
}

export function FertilizerDetailModal({ isOpen, record, onClose }: FertilizerDetailModalProps) {
  if (!record) return null;

  const fields: DetailField[] = [
    { label: '肥料编码', value: <span className="font-mono">{record.fertilizerCode || '-'}</span> },
    { label: '肥料名称', value: <span className="font-bold">{record.fertilizerName || '-'}</span> },
    { label: '肥料类型', value: getFertilizerTypeLabel(record.fertilizerType) },
    { label: '施肥时期', value: renderApplicationTiming(record.applicationTiming) },
    { label: '状态', value: record.status === 'active' ? <span className="text-green-600 font-medium">启用</span> : <span className="text-gray-400">停用</span> },
    { label: '品牌名称', value: record.brandName || '主品牌' },
    { label: '成份与含量', value: record.specContent || '-' },
    { label: '生产厂家', value: record.manufacturer || '-' },
    { label: '包装规格', value: record.packageSpec || '-' },
    { label: '建议用量', value: <span className="font-mono">{record.suggestedDosage || '-'}</span> },
    { label: '单位', value: getDictItemName('dosage_unit', record.dosageUnit || '') || record.dosageUnit || '-' },
    { label: '稀释比例', value: <span className="font-mono">{record.suggestedRatio || '-'}</span> },
    { label: '单价 (元/单位)', value: record.unitPrice != null && record.unitPrice > 0 ? <span className="font-mono">{Number(record.unitPrice).toFixed(2)}</span> : '-' },
    { label: '库存量', value: <span className={`font-mono ${getStockColor(record.stockQuantity ?? 0)}`}>{(record.stockQuantity ?? 0).toFixed(2)}</span> },
    { label: '库存单位', value: record.stockUnit || 'kg' },
    { label: '产品批次', value: <span className="font-mono">{record.batchNumber || '-'}</span> },
    { label: '生产日期', value: record.productionDate || '-' },
    { label: '过期日期', value: record.expirationDate || '-' },
    { label: '保质期', value: record.shelfLife || '-' },
    { label: '存储条件', value: record.storageCondition || '-' },
    { label: '功能说明', value: record.functionDesc || '-' },
    { label: '使用禁忌', value: record.tabooDesc || '-' },
    { label: '供应商信息', value: record.supplierInfo || '-' },
    { label: '备注', value: record.remark || '-' },
    { label: '创建时间', value: record.createTime || '-' },
    { label: '更新时间', value: record.updateTime || '-' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="肥料详情"
      size="xxxl"
      showFooter={false}
    >
      {/* 编号头部 — 单行展示：编码 + 名称 + 类型 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-5 mb-5 border border-amber-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">编码</span>
            <span className="text-xl font-mono font-bold text-amber-700">{record.fertilizerCode || '-'}</span>
          </div>
          <span className="text-gray-300 text-lg">|</span>
          <span className="text-base font-bold text-gray-800">{record.fertilizerName || '-'}</span>
          {record.fertilizerType && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded text-sm font-medium">
              {getFertilizerTypeLabel(record.fertilizerType)}
            </span>
          )}
        </div>
      </div>

      {/* 统一 4 列网格 — 全部 26 字段 */}
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-4 gap-3">
          {fields.map((f, i) => (
            <FieldCell key={i} field={f} />
          ))}
        </div>
      </div>

      {/* 底部关闭按钮 */}
      <div className="mt-6 flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 关闭
        </Button>
      </div>
    </UnifiedModal>
  );
}

/** 单个字段展示格子 — 统一浅灰色线框 */
function FieldCell({ field }: { field: DetailField }) {
  return (
    <div>
      <Label className="text-sm text-gray-500 mb-0.5">{field.label}</Label>
      <div className="text-base rounded-lg p-3 min-h-[44px] border border-gray-300 text-gray-800">
        {field.value}
      </div>
    </div>
  );
}
