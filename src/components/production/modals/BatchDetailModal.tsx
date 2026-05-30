/**
 * 生产批次详情弹窗
 * 使用通用DetailModal组件统一样式
 */

import React, { useState, useEffect } from 'react';
import { CropBatch } from '@/types';
import { batchStatusColors, batchStatusLabels, stageProgress } from '../constants';
import { getProductionPlanRelations, ProductionPlanRelation } from '@/services/productionPlanService';
import { DetailModal, type DetailField } from '@/components/ui/DetailModal';

interface BatchDetailModalProps {
  batch: CropBatch | null;
  onClose: () => void;
  onViewWorkOrders?: () => void;
}

export function BatchDetailModal({ batch, onClose, onViewWorkOrders }: BatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'relations'>('info');
  const [relations, setRelations] = useState<ProductionPlanRelation[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  useEffect(() => {
    if (batch && activeTab === 'relations') {
      loadRelations();
    }
  }, [batch, activeTab]);

  const loadRelations = async () => {
    if (!batch) return;
    setLoadingRelations(true);
    try {
      const result = await getProductionPlanRelations(batch.id, batch.batchCode);
      setRelations(result.relations);
    } catch {
      setRelations([]);
    } finally {
      setLoadingRelations(false);
    }
  };

  if (!batch) return null;

  const stages = [
    { key: 'seedling', label: '苗期' },
    { key: 'vegetative', label: '生长期' },
    { key: 'flowering', label: '开花期' },
    { key: 'fruiting', label: '结果期' },
    { key: 'harvest', label: '采收期' },
  ];

  // 状态Badge
  const statusBadge = (
    <span className={`inline-flex px-2 py-1 rounded-lg text-sm font-medium ${batchStatusColors[batch.batchStatus || 'draft']}`}>
      {batchStatusLabels[batch.batchStatus || 'draft']}
    </span>
  );

  // 生长进度
  const progressBar = (
    <div className="space-y-2">
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
          style={{ width: `${stageProgress[batch.stage]}%` }}
        />
      </div>
      <div className="flex justify-between">
        {stages.map((stage) => (
          <span
            key={stage.key}
            className={`text-xs ${
              batch.stage === stage.key ? 'text-emerald-600 font-medium' : 'text-gray-500'
            }`}
          >
            {stage.label}
          </span>
        ))}
      </div>
    </div>
  );

  // 基本信息字段配置
  const fields: DetailField[][] = [
    [
      { label: '批次编号', value: batch.batchCode },
      { label: '种植模式', value: batch.plantingMode },
    ],
    [
      { label: '作物名称', value: batch.cropName },
      { label: '作物品种', value: batch.variety },
    ],
    [
      { label: '种植区域', value: batch.greenhouseName },
      { label: '种植面积', value: `${batch.plantingArea} ${batch.plantingAreaUnit || 'm²'}` },
    ],
    [
      { label: '开始时间', value: batch.startDate },
      { label: '预计结束时间', value: batch.expectedHarvestDate },
    ],
    [
      { label: '负责人', value: batch.responsiblePerson },
      { label: '目标产量', value: `${batch.targetYield} ${batch.unit || 'kg'}` },
    ],
    [
      { label: '当前状态', value: statusBadge },
      { label: '发布人', value: batch.publisher || '-' },
    ],
    [
      { label: '初次发布时间', value: batch.publishDate || '-' },
      { label: '最后修改时间', value: batch.lastModifyDate || '-' },
    ],
    [
      { label: '生长进度', value: progressBar, fullWidth: true },
    ],
  ];

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        关闭
      </button>
      {onViewWorkOrders && (
        <button
          onClick={onViewWorkOrders}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
        >
          查看工单
        </button>
      )}
    </div>
  );

  return (
    <DetailModal
      title="批次详情"
      fields={fields}
      isOpen={!!batch}
      onClose={onClose}
      footer={footer}
      width={700}
      height={600}
    />
  );
}
