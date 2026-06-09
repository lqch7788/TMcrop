// ============================================================
// 批量确认弹窗组件
// 文件路径：src/components/approval/BatchConfirmModal.tsx
// 组件化结构：批量审批操作前的确认弹窗
// ============================================================

import React, { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { UnifiedModal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TextArea, Label, Button } from '@/components/ui';
import type { Approval } from '../../types/approval';
import { getApprovalTypeName } from '../../types/approval';

interface BatchConfirmModalProps {
  isOpen: boolean;
  action: 'approve' | 'reject';
  selectedApprovals: Approval[];
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

export function BatchConfirmModal({
  isOpen,
  action,
  selectedApprovals,
  onConfirm,
  onCancel,
}: BatchConfirmModalProps) {
  const [comment, setComment] = useState('');

  const isApprove = action === 'approve';
  const actionText = isApprove ? '通过' : '拒绝';

  const handleConfirm = () => {
    onConfirm(comment);
    setComment('');
  };

  const handleCancel = () => {
    setComment('');
    onCancel();
  };

  // 按类型分组统计
  const typeStats = selectedApprovals.reduce((acc, approval) => {
    const typeName = approval.typeName || getApprovalTypeName(approval.type);
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`批量${actionText}确认`}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleCancel}>
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isApprove && comment.trim() === ''}
            className={isApprove ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300' : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-300'}
          >
            <Check className="w-4 h-4" /> 确认批量{actionText}
          </Button>
        </div>
      }
    >
      {/* 警告提示 */}
      <div className={`flex items-start gap-3 p-4 rounded-lg mb-4 ${
        isApprove ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
      }`}>
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isApprove ? 'text-emerald-600' : 'text-red-600'
        }`} />
        <div className="text-sm">
          <p className={`font-medium ${
            isApprove ? 'text-emerald-800' : 'text-red-800'
          }`}>
            确认要批量{actionText}这 {selectedApprovals.length} 项审批吗？
          </p>
          <p className={`mt-1 ${
            isApprove ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {isApprove
              ? '审批通过后，业务数据将自动更新，请确保已核实每项审批的内容。'
              : '审批拒绝后，申请人将收到拒绝通知，请填写拒绝原因。'}
          </p>
        </div>
      </div>

      {/* 按类型统计 */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">审批单类型分布：</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(typeStats).map(([typeName, count]) => (
            <span
              key={typeName}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
            >
              {typeName} × {count}
            </span>
          ))}
        </div>
      </div>

      {/* 审批单列表 */}
      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0">
            <TableRow>
              <TableHead className="text-xs font-medium text-gray-500">单号</TableHead>
              <TableHead className="text-xs font-medium text-gray-500">类型</TableHead>
              <TableHead className="text-xs font-medium text-gray-500">申请人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedApprovals.map((approval) => (
              <TableRow key={approval.id}>
                <TableCell>{approval.code}</TableCell>
                <TableCell>{approval.typeName}</TableCell>
                <TableCell>{approval.applicantName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 审批意见 */}
      <div className="mt-4">
        <Label className="text-gray-700 mb-1">
          {isApprove ? '审批意见（可选）' : '拒绝原因（必填）'}
        </Label>
        <TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={isApprove ? '可填写审批意见...' : '请填写拒绝原因...'}
          rows={3}
          className="w-full border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        />
        {!isApprove && comment.trim() === '' && (
          <p className="mt-1 text-sm text-red-600">请填写拒绝原因</p>
        )}
      </div>
    </UnifiedModal>
  );
}

export default BatchConfirmModal;
