/**
 * 离职申请页面详情弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';

import { Label } from '@/components/ui';
import { LaborStatusBadge } from '../../../../../components/common/labor/LaborStatusBadge';
import { ResignationRecord } from '../../../types/resignationPage.types';

interface ResignationPageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ResignationRecord | null;
}

export function ResignationPageDetailModal({
  isOpen,
  onClose,
  record,
}: ResignationPageDetailModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="离职详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">离职编号</Label>
            <div className="text-sm text-gray-900">{record.resignationCode}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">申请人</Label>
            <div className="text-sm text-gray-900">{record.workerName}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">离职类型</Label>
            <div className="text-sm text-gray-900">{record.resignationType}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">离职原因</Label>
            <div className="text-sm text-gray-900">{record.reason}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">预计最后工作日</Label>
            <div className="text-sm text-gray-900">{record.expectedLastDay}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">工作交接人</Label>
            <div className="text-sm text-gray-900">{record.handoverUserName || '未指定'}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">状态</Label>
            <div className="mt-1">
              <LaborStatusBadge
                status={
                  record.status === '已通过' ? 'completed' :
                  record.status === '已拒绝' ? 'rejected' :
                  record.status === '已取消' ? 'cancelled' : 'pending'
                }
                label={record.status}
              />
            </div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">申请时间</Label>
            <div className="text-sm text-gray-900">{record.createTime}</div>
          </div>
          <div className="col-span-2">
            <Label className="block text-sm font-medium text-gray-500 mb-1">交接说明</Label>
            <div className="text-sm text-gray-900">{record.handoverNote || '无'}</div>
          </div>
        </div>

        {/* 2026-10-10：通过/驳回按钮已迁移至「人事审批 → 人员异动」tab（统一审批体系） */}
      </div>
    </UnifiedModal>
  );
}
