/**
 * 采购计划详情弹窗
 * 使用通用DetailModal组件统一样式
 */

import React from 'react';
import { DetailModal, type DetailField } from '@/components/ui/DetailModal';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import type { PurchasePlan } from '@/types/purchase';
import type { Approval } from '@/types/approval';
import { MaterialItemsTable } from './MaterialItemsTable';

interface PlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanDetail: PurchasePlan | null;
  /** 审批记录（可选） */
  approvalRecords?: Approval['records'];
}

/**
 * 优先级Badge组件
 */
function PriorityBadge({ priority, priorityText }: { priority: string; priorityText: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      priority === 'urgent' ? 'bg-red-100 text-red-700' :
      priority === 'high' ? 'bg-orange-100 text-orange-700' :
      priority === 'normal' ? 'bg-blue-100 text-blue-700' :
      'bg-gray-100 text-gray-600'
    }`}>
      {priorityText}
    </span>
  );
}

/**
 * 状态Badge组件
 */
function StatusBadge({ status, statusText }: { status: string; statusText: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      status === 'completed' ? 'bg-green-100 text-green-700' :
      status === 'purchasing' ? 'bg-purple-100 text-purple-700' :
      status === 'pending' ? 'bg-amber-100 text-amber-700' :
      status === 'approved' ? 'bg-blue-100 text-blue-700' :
      status === 'draft' ? 'bg-gray-100 text-gray-700' :
      'bg-red-100 text-red-700'
    }`}>
      {statusText}
    </span>
  );
}

/**
 * 采购计划详情弹窗
 */
export function PlanDetailModal({
  isOpen,
  onClose,
  selectedPlanDetail,
  approvalRecords,
}: PlanDetailModalProps) {
  if (!selectedPlanDetail) return null;

  // 字段配置
  const fields: DetailField[][] = [
    [
      { label: '采购申请批次号', value: selectedPlanDetail.purchaseApplicationCode },
      { label: '采购类型', value: selectedPlanDetail.purchaseTypeName },
    ],
    [
      { label: '关联生产批次号', value: selectedPlanDetail.relatedBatchCode || '不关联批次' },
      { label: '申请人', value: selectedPlanDetail.applicant },
    ],
    [
      { label: '申请部门', value: selectedPlanDetail.applicantDepartment },
      { label: '申请日期', value: selectedPlanDetail.applyDate },
    ],
    [
      { label: '需求日期', value: selectedPlanDetail.requiredDate },
      { label: '优先级', value: <PriorityBadge priority={selectedPlanDetail.priority} priorityText={selectedPlanDetail.priorityText} /> },
    ],
    [
      { label: '状态', value: <StatusBadge status={selectedPlanDetail.status} statusText={selectedPlanDetail.statusText} /> },
      { label: '备注', value: selectedPlanDetail.remark || '-' },
    ],
    [
      { label: '物料明细', value: (
        <div className="w-full">
          {selectedPlanDetail.items && selectedPlanDetail.items.length > 0 ? (
            <div className="mt-1 overflow-auto max-h-80 rounded-lg border border-gray-300 bg-white">
              <div style={{ minWidth: '1600px' }}>
                <MaterialItemsTable items={selectedPlanDetail.items} />
              </div>
            </div>
          ) : (
            <span className="text-gray-400">暂无物料明细</span>
          )}
        </div>
      ), fullWidth: true },
    ],
  ];

  // 审批记录卡片（参照 ProductionApproval.tsx）
  const renderApprovalRecords = () => {
    if (!approvalRecords || approvalRecords.length === 0) return null;
    return (
      <div className="mt-4 bg-purple-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-purple-600 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> 审批记录
        </h4>
        <div className="space-y-3">
          {approvalRecords.map((record: any, index: number) => (
            <div key={index} className="flex items-start gap-3 p-2 bg-white rounded-lg">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                record.action === 'approve' ? 'bg-emerald-500' :
                record.action === 'reject' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{record.approverName}</span>
                  <span className="text-gray-500 mx-1">
                    {record.action === 'approve' ? '通过了申请' :
                     record.action === 'reject' ? '拒绝了申请' :
                     record.action === 'partially_approve' ? '部分通过了' : '操作了'}
                  </span>
                </p>
                {record.comment && (
                  <p className="text-xs text-gray-500 mt-1">备注：{record.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{record.actionTime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 底部按钮
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" size="sm" onClick={onClose}>
        关闭
      </Button>
    </div>
  );

  return (
    <DetailModal
      title="采购申请单详情"
      fields={fields}
      isOpen={isOpen}
      onClose={onClose}
      footer={footer}
      width={900}
      height={600}
      customFooter={renderApprovalRecords()}
    />
  );
}
