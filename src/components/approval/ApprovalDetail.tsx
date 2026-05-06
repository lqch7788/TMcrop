// ============================================================
// 审批详情组件
// 文件路径：src/components/approval/ApprovalDetail.tsx
// 组件化结构：统一的审批详情展示
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, Clock, User, Calendar, FileText, MessageSquare } from 'lucide-react';
import type { Approval, ApprovalStatus, ApprovalAction } from '../../types/approval';
import { BusinessPreview } from './BusinessPreview';

interface ApprovalDetailProps {
  approval: Approval;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onClose?: () => void;
  // 权限控制 props，默认都为 true
  canApprove?: boolean;
  canReject?: boolean;
}

export function ApprovalDetail({
  approval,
  showActions = false,
  onApprove,
  onReject,
  onClose,
  canApprove = true,
  canReject = true,
}: ApprovalDetailProps) {
  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case ApprovalStatus.REJECTED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.DRAFT:
        return '草稿';
      case ApprovalStatus.PENDING:
        return '待审批';
      case ApprovalStatus.APPROVED:
        return '已通过';
      case ApprovalStatus.PARTIALLY_APPROVED:
        return '部分通过';
      case ApprovalStatus.REJECTED:
        return '已拒绝';
      case ApprovalStatus.CANCELLED:
        return '已撤回';
      default:
        return status;
    }
  };

  const getActionText = (action: ApprovalAction) => {
    switch (action) {
      case 'approve':
        return '通过';
      case 'reject':
        return '拒绝';
      case 'partially_approve':
        return '部分通过';
      case 'cancel':
        return '撤回';
      default:
        return action;
    }
  };

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">审批单号</div>
            <div className="font-medium text-gray-900">{approval.code}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">审批类型</div>
            <div className="font-medium text-gray-900">{approval.typeName}</div>
          </div>
          <div className="col-span-2">
            <div className="text-sm text-gray-500">标题</div>
            <div className="font-medium text-gray-900">{approval.title}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">申请人</div>
            <div className="font-medium text-gray-900">{approval.applicantName}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">申请部门</div>
            <div className="font-medium text-gray-900">{approval.applicantDepartment}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">申请时间</div>
            <div className="font-medium text-gray-900">{approval.applyDate} {approval.applyTime}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">当前状态</div>
            <div className="flex items-center gap-2">
              {getStatusIcon(approval.status)}
              <span className="font-medium text-gray-900">{getStatusText(approval.status)}</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">审批进度</div>
            <div className="font-medium text-gray-900">
              第 {approval.currentStep} / {approval.totalSteps} 步
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">优先级</div>
            <div className="font-medium text-gray-900">
              {approval.priority === 'urgent' ? '加急' : approval.priority === 'high' ? '高' : '普通'}
            </div>
          </div>
        </div>
      </div>

      {/* 审批流程 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">审批流程</h3>
        <div className="space-y-3">
          {approval.approvers.map((approver, index) => (
            <div
              key={approver.userId}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {approver.userName}
                  <span className="text-gray-400 text-sm ml-2">{approver.role}</span>
                </div>
                <div className="text-sm text-gray-500">
                  第 {approver.order} 步审批人
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                approver.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : approver.status === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : approver.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {approver.status === 'approved' ? '已通过' :
                 approver.status === 'rejected' ? '已拒绝' :
                 approver.status === 'pending' ? '待审批' : approver.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 审批记录 */}
      {approval.records && approval.records.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">审批记录</h3>
          <div className="space-y-3">
            {approval.records.map((record) => (
              <div key={record.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  {record.action === 'approve' ? (
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  ) : record.action === 'reject' ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {record.approverName}
                    <span className="text-gray-400 text-sm ml-2">
                      {getActionText(record.action)}
                    </span>
                  </div>
                  {record.comment && (
                    <div className="text-sm text-gray-600 mt-1">{record.comment}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(record.actionTime).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 物料明细（如果有） */}
      {approval.materials && approval.materials.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">物料明细</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料编码</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">申请数量</th>
                {approval.status === ApprovalStatus.PARTIALLY_APPROVED && (
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">批准数量</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approval.materials.map((mat) => (
                <tr key={mat.materialId}>
                  <td className="px-3 py-2 text-gray-900">{mat.materialCode}</td>
                  <td className="px-3 py-2 text-gray-900">{mat.materialName}</td>
                  <td className="px-3 py-2 text-right text-gray-900">{mat.requestedQuantity} {mat.unit}</td>
                  {approval.status === ApprovalStatus.PARTIALLY_APPROVED && (
                    <td className="px-3 py-2 text-right text-gray-900">
                      {mat.approvedQuantity ?? mat.requestedQuantity} {mat.unit}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 业务关联信息（如果有） */}
      {approval.businessLink && (
        <div>
          <BusinessPreview approval={approval} businessLink={approval.businessLink} />
        </div>
      )}

      {/* 操作按钮 */}
      {showActions && approval.status === ApprovalStatus.PENDING && (
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {onReject && canReject && (
            <button
              onClick={() => onReject(approval.id)}
              className="h-10 px-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
            >
              拒绝
            </button>
          )}
          {onApprove && canApprove && (
            <button
              onClick={() => onApprove(approval.id)}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              通过
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ApprovalDetail;
