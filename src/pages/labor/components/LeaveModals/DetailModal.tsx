/**
 * 请假申请详情弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
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
            <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
            <div className="text-sm text-gray-900">{record.staffName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">请假类型</label>
            <div className="text-sm text-gray-900">{record.leaveType}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">开始日期</label>
            <div className="text-sm text-gray-900">{record.startDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">结束日期</label>
            <div className="text-sm text-gray-900">{record.endDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">请假天数</label>
            <div className="text-sm text-gray-900">{record.days} 天</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
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
            <label className="block text-sm font-medium text-gray-500 mb-1">请假原因</label>
            <div className="text-sm text-gray-900">{record.reason || '无'}</div>
          </div>
          {record.remarks && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
              <div className="text-sm text-gray-900">{record.remarks}</div>
            </div>
          )}
        </div>

        {/* 审批操作 */}
        {record.status === '待审批' && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => { onWithdraw(record); onClose(); }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
            >
              撤回申请
            </button>
            <button
              onClick={() => { onReject(record); onClose(); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              驳回
            </button>
            <button
              onClick={() => { onApprove(record); onClose(); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              通过
            </button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
