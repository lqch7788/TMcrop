/**
 * 施肥详情查看弹窗组件
 * 只读视图，以网格形式展示所有字段，IoT记录显示绿色标识
 */
import React from 'react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { FertilizerData } from '@/stores';
import { getDictItemName } from '@/stores/useDictionaryStore';

interface FertilizerDetailModalProps {
  isOpen: boolean;
  record: FertilizerData;
  onClose: () => void;
}

export function FertilizerDetailModal({ isOpen, record, onClose }: FertilizerDetailModalProps) {
  if (!record) return null;

  const isIot = record.dataSource === 'auto_iot';

  // 详情字段定义
  const fields = [
    { label: '施肥编号', value: record.fertilizerCode || '-', mono: true },
    { label: '肥料名称', value: record.fertilizerName || '-', bold: true },
    {
      label: '肥料类型',
      value: getDictItemName('fertilizer_type', record.fertilizerType) || record.fertilizerType || '-',
      badge: true,
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    { label: '作物品种', value: record.cropName || '-' },
    { label: '温室位置', value: record.greenhouseName || '-' },
    { label: '稀释比例', value: record.dilutionRatio || '-' },
    { label: '施肥量', value: `${record.quantity?.toLocaleString() || '0'} kg`, highlight: 'text-emerald-600 font-bold' },
    { label: '单价', value: `${record.unitPrice?.toLocaleString() || '0'} 元/kg` },
    { label: '总成本', value: `${record.totalCost?.toLocaleString() || '0'} 元`, highlight: 'text-amber-600 font-bold' },
    { label: '施肥时间', value: record.fertilizeTime || '-' },
    {
      label: '数据来源',
      value: isIot ? 'IoT自动' : '手动',
    },
    { label: '操作员', value: record.operatorName || '-' },
    { label: '关联生产计划', value: record.productionPlanCode || '-' },
    { label: '关联种植记录', value: record.plantingCode || '-' },
    { label: '关联农事任务', value: record.farmTaskId || '-' },
    { label: '备注', value: record.description || '-', full: true },
    { label: '创建时间', value: record.createTime || '-' },
    { label: '更新时间', value: record.updateTime || '-' },
  ];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>施肥详情</span>
          {isIot && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              IoT自动
            </span>
          )}
        </div>
      }
      size="lg"
      showFooter={false}
    >
      {/* 编号头部 */}
      <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-4 mb-4 border border-blue-100">
        <div className="text-xs text-gray-500 mb-1">施肥编号</div>
        <div className="text-xl font-mono font-bold text-blue-700">{record.fertilizerCode || '-'}</div>
        <div className="text-sm text-gray-500 mt-1">
          {record.fertilizerName} | {record.greenhouseName || '未知位置'}
        </div>
      </div>

      {/* 详情网格 */}
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field, idx) => {
          // 全宽字段（如备注）
          if (field.full) {
            return (
              <div key={idx} className="col-span-2">
                <Label className="text-xs text-gray-500">{field.label}</Label>
                <div className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 min-h-[40px]">
                  {field.value}
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
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${field.badgeColor}`}>
                    {field.value}
                  </span>
                ) : field.label === '数据来源' ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isIot ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isIot ? 'bg-green-500' : 'bg-blue-500'}`} />
                    {field.value}
                  </span>
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
