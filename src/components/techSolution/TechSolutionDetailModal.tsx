/**
 * 技术方案详情弹窗
 * 使用通用DetailModal组件统一样式
 */

import React, { useState, useEffect } from 'react';
import { DetailModal, type DetailField } from '@/components/ui/DetailModal';
import { getTechSolutionApprovals, type TechSolutionApproval } from '../../services/apiTechSolutionService';
import { getDictItemName } from '../../stores';

// 技术方案类型
interface TechSolution {
  id: string;
  code: string;
  title: string;
  crop: string;
  cropCode?: string;
  plantingMode: string;
  stage: string;
  author: string;
  authorId?: string;
  createDate: string;
  updateTime?: string;
  status: string;
  batchStatus?: string;
  statusClass?: 'normal' | 'pending' | 'draft';
  version: string;
  approveStatus?: string;
  content: string;
  approvalDate?: string;
  approver?: string;
  relatedBatchCode?: string;
  planDetailFileName?: string;
  priority?: string;
  remarks?: string;
  lastSubmitTime?: string;
  isValid?: string;
}

interface TechSolutionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tech: TechSolution | null;
}

export function TechSolutionDetailModal({ isOpen, onClose, tech }: TechSolutionDetailModalProps) {
  const [approvals, setApprovals] = useState<TechSolutionApproval[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // 加载审批记录
  useEffect(() => {
    if (tech) {
      loadApprovals();
    }
  }, [tech]);

  const loadApprovals = async () => {
    if (!tech) return;
    setLoadingApprovals(true);
    try {
      const result = await getTechSolutionApprovals(tech.id);
      setApprovals(result);
    } catch {
      setApprovals([]);
    } finally {
      setLoadingApprovals(false);
    }
  };

  // 格式化时间
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

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

  // 渲染审批记录
  const renderApprovalRecords = () => {
    if (loadingApprovals) {
      return <div className="text-sm text-gray-400">加载中...</div>;
    }

    if (approvals.length === 0) {
      return <div className="text-sm text-gray-400">暂无审批记录</div>;
    }

    return approvals.map((approval) => (
      <div key={approval.id} className="mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-2">
          <span className="font-medium text-gray-700">{approval.title}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            approval.status === 'approved' ? 'bg-green-100 text-green-700' :
            approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
            approval.status === 'pending' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-700'
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
                <span className="text-gray-500 min-w-[120px]">{formatDateTime(record.actionTime)}</span>
                <span className="text-gray-700">{record.approverName}</span>
                <span className={`font-medium ${
                  record.action === 'approve' ? 'text-green-600' :
                  record.action === 'reject' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {actionLabels[record.action] || record.action}
                </span>
                {record.comment && (
                  <span className="text-gray-500 w-full pl-32">理由：{record.comment}</span>
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

  if (!tech) return null;

  // 审批状态Badge
  const approveStatusBadge = (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
      tech.approveStatus === '已审批' ? 'bg-green-100 text-green-700' :
      tech.approveStatus === '待审批' ? 'bg-amber-100 text-amber-700' :
      'bg-gray-100 text-gray-700'
    }`}>
      {tech.approveStatus || '待审批'}
    </span>
  );

  // 状态Badge
  const statusBadge = (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
      tech.statusClass === 'normal' ? 'bg-green-100 text-green-700' :
      tech.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
      'bg-gray-100 text-gray-700'
    }`}>
      {tech.status || '草稿'}
    </span>
  );

  // 字段配置 - 与列表字段保持一致
  const fields: DetailField[][] = [
    [
      { label: '方案编号', value: tech.code },
      { label: '版本', value: tech.version },
    ],
    [
      { label: '方案标题', value: tech.title, fullWidth: true },
    ],
    [
      { label: '作物品种', value: tech.crop },
      { label: '种植模式', value: getDictItemName('planting_mode', tech.plantingMode) },
    ],
    [
      { label: '适用范围', value: tech.stage },
      { label: '关联批次', value: tech.relatedBatchCode || '-' },
    ],
    [
      { label: '编制人', value: tech.author },
      { label: '创建日期', value: tech.createDate },
    ],
    [
      { label: '最后修改时间', value: tech.updateTime ? formatDateTime(tech.updateTime) : '-' },
      { label: '最后提交时间', value: tech.lastSubmitTime ? formatDateTime(tech.lastSubmitTime) : '-' },
    ],
    [
      { label: '状态', value: statusBadge },
      { label: '方案是否有效', value: tech.isValid || '有效' },
    ],
    [
      { label: '备注', value: (tech as any).remarks || '-' },
      { label: '方案详情文件', value: (tech as any).planDetailFileName || '-' },
    ],
    [
      { label: '方案内容', value: tech.content, fullWidth: true },
    ],
  ];

  return (
    <DetailModal
      title="方案详情"
      fields={fields}
      isOpen={isOpen}
      onClose={onClose}
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
