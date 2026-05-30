/**
 * 技术方案详情弹窗
 * 使用通用DetailModal组件统一样式
 */

import React from 'react';
import { DetailModal, type DetailField } from '@/components/ui/DetailModal';

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
  lastSubmitTime?: string;
  isValid?: string;
}

interface TechSolutionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tech: TechSolution | null;
}

export function TechSolutionDetailModal({ isOpen, onClose, tech }: TechSolutionDetailModalProps) {
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

  // 字段配置
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
      { label: '种植模式', value: tech.plantingMode },
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
      { label: '审核人', value: tech.approver || '-' },
      { label: '审批状态', value: approveStatusBadge },
    ],
    [
      { label: '状态', value: statusBadge },
      { label: '审批日期', value: tech.approvalDate || '-' },
    ],
    [
      { label: '方案是否有效', value: tech.isValid || '有效' },
      { label: '最后提交时间', value: tech.lastSubmitTime || '-' },
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
    />
  );
}
