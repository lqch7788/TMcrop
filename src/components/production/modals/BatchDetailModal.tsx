/**
 * 生产批次详情弹窗
 * 使用通用DetailModal组件统一样式
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, X } from 'lucide-react';
import { CropBatch } from '@/types';
import { batchStatusColors, batchStatusLabels, SEED_BREEDING_MODES, SEEDLING_MODES, PLANTING_MODES } from '../constants';
import { ProductionPlanApproval, ApprovalRecord } from '@/services/productionPlanService';
import { useApprovalStore } from '@/stores';
import { DetailModal, type DetailField } from '@/components/ui/DetailModal';
import { Button } from '@/components/ui';
import { logger } from '@/lib/logger';

interface BatchDetailModalProps {
  batch: CropBatch | null;
  onClose: () => void;
  onViewWorkOrders?: () => void;
}

// 审批操作类型中文映射
const actionLabels: Record<string, string> = {
  approve: '通过',
  reject: '拒绝',
  partially_approve: '部分通过',
  cancel: '撤销',
};

// 审批状态中文映射
const approvalStatusLabels: Record<string, string> = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已撤销',
  partially_approved: '部分通过',
};

export function BatchDetailModal({ batch, onClose, onViewWorkOrders }: BatchDetailModalProps) {
  // L-05: 改用 useApprovalStore 取审批单（按 batch.id 在 businessLink 过滤）
  // 避免每个详情弹窗都直接 fetch 独立接口
  const allApprovals = useApprovalStore((s) => s.approvals);
  const fetchApprovals = useApprovalStore((s) => s.fetchApprovals);
  const isLoaded = useApprovalStore((s) => s.isLoaded);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 触发审批单加载（仅在 store 还没数据时拉一次）
  useEffect(() => {
    if (batch && !isLoaded) {
      setLoadingApprovals(true);
      setLoadError(null);
      fetchApprovals()
        .catch((err) => {
          // H-07 + M-14: 不再静默吞错
          logger.error('[BatchDetailModal] 加载审批单失败', err);
          setLoadError(err?.message || '加载审批记录失败');
        })
        .finally(() => setLoadingApprovals(false));
    }
  }, [batch, isLoaded, fetchApprovals]);

  // 在已加载的审批单里按 businessLink.requestId 过滤当前批次的
  const approvals: ProductionPlanApproval[] = useMemo(() => {
    if (!batch) return [];
    return allApprovals
      .filter((a) => {
        const link = a.businessLink as { type?: string; requestId?: string } | undefined;
        return link?.type === 'production' && link?.requestId === batch.id;
      })
      .map((a) => ({
        id: a.id,
        code: a.code,
        title: a.title,
        status: a.status,
        currentStep: a.currentStep,
        totalSteps: a.totalSteps,
        records: (a.records || []) as unknown as ApprovalRecord[],
        createdAt: a.createdAt,
      }));
  }, [allApprovals, batch]);

  if (!batch) return null;

  // 格式化时间
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 种植模式中文映射（合并所有模式列表）
  const allModes = [...SEED_BREEDING_MODES, ...SEEDLING_MODES, ...PLANTING_MODES];
  const modeMap = Object.fromEntries(allModes.map(m => [m.value, m.label]));
  const plantingModeLabel = (batch.plantingMode || '')
    .split(',')
    .map(v => modeMap[v.trim()] || v.trim())
    .join('、');

  // 单位中文映射
  const unitLabels: Record<string, string> = {
    kg: '公斤',
    t: '吨',
    '株': '株',
    '粒': '粒',
    '袋': '袋',
    'm²': '平方米',
    '亩': '亩',
  };
  const unitLabel = unitLabels[batch.unit || ''] || batch.unit || '公斤';

  // 状态Badge
  const statusBadge = (
    <span className={`inline-flex px-2 py-1 rounded-lg text-sm font-medium ${batchStatusColors[batch.batchStatus || 'draft']}`}>
      {batchStatusLabels[batch.batchStatus || 'draft']}
    </span>
  );

  // 基本信息字段配置
  const fields: DetailField[][] = [
    [
      { label: '批次编号', value: batch.batchCode },
      { label: '种植模式', value: plantingModeLabel || '-' },
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
      { label: '目标产量', value: batch.targetYield != null ? `${batch.targetYield} ${unitLabel}` : '-' },
    ],
    [
      { label: '当前状态', value: statusBadge },
      { label: '发布人', value: batch.publisher || '-' },
    ],
    [
      { label: '初次发布时间', value: batch.publishDate || '-' },
      { label: '最后修改时间', value: batch.lastModifyDate || '-' },
    ],
  ];

  // 审批记录渲染
  const renderApprovalRecords = () => {
    if (loadError) {
      return <div className="text-center text-red-500 py-4 text-sm">加载失败：{loadError}</div>;
    }
    if (loadingApprovals) {
      return <div className="text-center text-gray-500 py-4">加载中...</div>;
    }

    if (approvals.length === 0) {
      return <div className="text-center text-gray-400 py-4">暂无审批记录</div>;
    }

    return approvals.map((approval) => (
      <div key={approval.id} className="mb-4">
        {/* 审批单概要 */}
        <div className="flex items-center gap-3 mb-2 text-sm flex-wrap">
          <span className="font-medium text-gray-700">{approval.title || approval.code}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${
            approval.status === 'approved' ? 'bg-green-100 text-green-700' :
            approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
            approval.status === 'pending' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {approvalStatusLabels[approval.status] || approval.status}
          </span>
          <span className="text-gray-400">第{approval.currentStep}/{approval.totalSteps}步</span>
          <span className="text-gray-400">提交时间：{formatDateTime(approval.createdAt)}</span>
        </div>

        {/* 审批记录列表 */}
        {approval.records.length > 0 ? (
          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
            {approval.records.map((record, idx) => (
              <div key={record.id || idx} className="flex flex-wrap items-start gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500 min-w-[60px]">{formatDateTime(record.actionTime)}</span>
                <span className="text-gray-700">{record.approverName}</span>
                <span className={`font-medium ${
                  record.action === 'approve' ? 'text-green-600' :
                  record.action === 'reject' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {actionLabels[record.action] || record.action}
                </span>
                {record.comment && (
                  <span className="text-gray-500 w-full pl-24">理由：{record.comment}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 pl-4 border-l-2 border-gray-200">尚未有审批操作</div>
        )}
      </div>
    ));
  };

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" size="sm" onClick={onClose}>
        <X className="w-4 h-4" /> 关闭
      </Button>
      {onViewWorkOrders && (
        <Button size="sm" variant="blue" onClick={onViewWorkOrders}>
          <Eye className="w-4 h-4" />
          查看工单
        </Button>
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
      bottom={
        <div className="border-t mt-4 pt-4">
          <div className="text-sm font-medium text-gray-700 mb-3">审批记录</div>
          {renderApprovalRecords()}
        </div>
      }
    />
  );
}
