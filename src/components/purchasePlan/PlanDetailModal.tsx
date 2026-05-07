/**
 * 采购计划详情弹窗组件
 */
import React from 'react';
import { Modal, FormField, Input } from '../ui/Modal';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';

interface PlanDetailModalProps {
  // 弹窗状态
  isOpen: boolean;
  onClose: () => void;
  // 选中详情
  selectedPlanDetail: PurchasePlan | null;
}

/**
 * 物料明细表格组件
 */
function MaterialItemsTable({ items }: { items: PurchasePlanItem[] }) {
  return (
    <div className="overflow-auto max-h-80 rounded-lg border border-gray-200 bg-white">
      <table className="text-sm" style={{ minWidth: '1600px' }}>
        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">物料编码</th>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">物料名称</th>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">分类</th>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">规格型号</th>
            <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">单位</th>
            <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">数量</th>
            <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">预估单价</th>
            <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">预估总价</th>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">供应商</th>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">用途说明</th>
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">备注</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 text-gray-600 font-mono whitespace-nowrap">{item.materialCode || '-'}</td>
              <td className="px-4 py-2.5 text-gray-900 font-medium whitespace-nowrap">{item.materialName || '-'}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.category || '-'}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.specification || '-'}</td>
              <td className="px-4 py-2.5 text-gray-600 text-center whitespace-nowrap">{item.unit || '-'}</td>
              <td className="px-4 py-2.5 text-gray-900 text-right font-medium whitespace-nowrap">{item.quantity || 0}</td>
              <td className="px-4 py-2.5 text-gray-600 text-right whitespace-nowrap">¥{(item.estimatedPrice || 0).toFixed(2)}</td>
              <td className="px-4 py-2.5 text-gray-900 text-right font-medium whitespace-nowrap">¥{(item.estimatedTotalPrice || 0).toLocaleString()}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.supplier || '-'}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.purpose || '-'}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{item.remark || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
 * 采购计划详情弹窗组件
 */
export function PlanDetailModal({
  isOpen,
  onClose,
  selectedPlanDetail,
}: PlanDetailModalProps) {
  if (!selectedPlanDetail) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="采购申请单详情"
      size="xxl"
      showFooter={false}
    >
      <div className="space-y-3">
        {/* 第一行：采购申请批次号、采购类型、关联生产批次 */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="采购申请批次号">
            <Input
              value={selectedPlanDetail.purchaseApplicationCode}
              disabled
              className="bg-gray-100"
            />
          </FormField>
          <FormField label="采购类型">
            <Input
              value={selectedPlanDetail.purchaseTypeName}
              disabled
              className="bg-gray-100"
            />
          </FormField>
          <FormField label="关联生产批次号">
            <Input
              value={selectedPlanDetail.relatedBatchCode || '不关联批次'}
              disabled
              className="bg-gray-100"
            />
          </FormField>
        </div>
        {/* 第二行：申请人、申请部门、申请日期 */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="申请人">
            <Input
              value={selectedPlanDetail.applicant}
              disabled
              className="bg-gray-100"
            />
          </FormField>
          <FormField label="申请部门">
            <Input
              value={selectedPlanDetail.applicantDepartment}
              disabled
              className="bg-gray-100"
            />
          </FormField>
          <FormField label="申请日期">
            <Input
              type="date"
              value={selectedPlanDetail.applyDate}
              disabled
              className="bg-gray-100"
            />
          </FormField>
        </div>
        {/* 第三行：需求日期、优先级、状态 */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="需求日期">
            <Input
              type="date"
              value={selectedPlanDetail.requiredDate}
              disabled
              className="bg-gray-100"
            />
          </FormField>
          <FormField label="优先级">
            <div className="flex items-center h-9 px-3 border border-gray-200 rounded-lg bg-gray-100">
              <PriorityBadge priority={selectedPlanDetail.priority} priorityText={selectedPlanDetail.priorityText} />
            </div>
          </FormField>
          <FormField label="状态">
            <div className="flex items-center h-9 px-3 border border-gray-200 rounded-lg bg-gray-100">
              <StatusBadge status={selectedPlanDetail.status} statusText={selectedPlanDetail.statusText} />
            </div>
          </FormField>
        </div>
        {/* 第四行：备注（占整行） */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="备注" className="col-span-2">
            <Input
              value={selectedPlanDetail.remark || '-'}
              disabled
              className="bg-gray-100"
            />
          </FormField>
        </div>

        {/* 物料明细区域 */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">物料明细（{selectedPlanDetail.items?.length || 0}种物料）</h4>
          {selectedPlanDetail.items && selectedPlanDetail.items.length > 0 ? (
            <MaterialItemsTable items={selectedPlanDetail.items} />
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
              暂无物料明细
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default PlanDetailModal;
