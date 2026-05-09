/**
 * 加班申请页面 - 详情弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../../components/common/labor/LaborStatusBadge';
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
            <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
            <div className="text-sm text-gray-900">{record.staffName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">加班类型</label>
            <div className="text-sm text-gray-900">{record.overtimeType}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">开始时间</label>
            <div className="text-sm text-gray-900">{record.startTime}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">结束时间</label>
            <div className="text-sm text-gray-900">{record.endTime}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">加班时长</label>
            <div className="text-sm text-gray-900">{record.hours} 小时</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
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
            <label className="block text-sm font-medium text-gray-500 mb-1">加班原因</label>
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
