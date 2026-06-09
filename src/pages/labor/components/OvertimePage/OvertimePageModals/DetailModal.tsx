/**
 * 加班申请页面 - 详情弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { Check, XCircle } from 'lucide-react';

import { LaborStatusBadge } from '../../../../../components/common/labor/LaborStatusBadge';
import { Button } from '@/components/ui';
import { Label } from '@/components/ui';
import type { OvertimeRecord } from '../types/overtimePage.types';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OvertimeRecord | null;
  onApprove: (record: OvertimeRecord) => void;
  onReject: (record: OvertimeRecord) => void;
}

export function OvertimePageDetailModal({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
}: DetailModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="加班详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</Label>
            <div className="text-sm text-gray-900">{record.staffName}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">加班类型</Label>
            <div className="text-sm text-gray-900">{record.overtimeType}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">开始时间</Label>
            <div className="text-sm text-gray-900">{record.startTime}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">结束时间</Label>
            <div className="text-sm text-gray-900">{record.endTime}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">加班时长</Label>
            <div className="text-sm text-gray-900">{record.hours} 小时</div>
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
          <div className="col-span-2">
            <Label className="block text-sm font-medium text-gray-500 mb-1">加班原因</Label>
            <div className="text-sm text-gray-900">{record.reason || '无'}</div>
          </div>
          {record.remarks && (
            <div className="col-span-2">
              <Label className="block text-sm font-medium text-gray-500 mb-1">备注</Label>
              <div className="text-sm text-gray-900">{record.remarks}</div>
            </div>
          )}
        </div>

        {/* 审批操作 */}
        {record.status === '待审批' && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="destructive"
              onClick={() => { onReject(record); onClose(); }}
            >
              <XCircle className="w-4 h-4" /> 驳回
            </Button>
            <Button
              variant="default"
              onClick={() => { onApprove(record); onClose(); }}
            >
              <Check className="w-4 h-4" /> 通过
            </Button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
