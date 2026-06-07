/**
 * 请假申请详情弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { Button } from '@/components/ui';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { Label } from '@/components/ui';
import { LeaveRecord } from '../../../../components/labor/leave/types';

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LeaveRecord | null;
  onApprove: (record: LeaveRecord) => void;
  onReject: (record: LeaveRecord) => void;
  onWithdraw: (record: LeaveRecord) => void;
}

export function DetailModal({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
  onWithdraw,
}: DetailModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="请假详情"
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
            <Label className="block text-sm font-medium text-gray-500 mb-1">请假类型</Label>
            <div className="text-sm text-gray-900">{record.leaveType}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">开始日期</Label>
            <div className="text-sm text-gray-900">{record.startDate}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">结束日期</Label>
            <div className="text-sm text-gray-900">{record.endDate}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">请假天数</Label>
            <div className="text-sm text-gray-900">{record.days} 天</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">状态</Label>
            <div className="mt-1">
              <LaborStatusBadge
                status={
                  record.status === '已通过' ? 'completed' :
                  record.status === '已拒绝' ? 'rejected' :
                  record.status === '已取消' || record.status === '已撤回' ? 'cancelled' : 'pending'
                }
                label={record.status}
              />
            </div>
          </div>
          <div className="col-span-2">
            <Label className="block text-sm font-medium text-gray-500 mb-1">请假原因</Label>
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
              variant="warning"
              onClick={() => { onWithdraw(record); onClose(); }}
            >
              撤回申请
            </Button>
            <Button
              variant="destructive"
              onClick={() => { onReject(record); onClose(); }}
            >
              驳回
            </Button>
            <Button
              variant="default"
              onClick={() => { onApprove(record); onClose(); }}
            >
              通过
            </Button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
