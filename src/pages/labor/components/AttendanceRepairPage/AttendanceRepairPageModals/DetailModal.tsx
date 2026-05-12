/**
 * 考勤补录页面 - 详情弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../../components/common/labor/LaborStatusBadge';
import { Button } from '@/components/ui';
import type { AttendanceRepairRecord } from '../types/attendanceRepairPage.types';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRepairRecord | null;
  onApprove: (record: AttendanceRepairRecord) => void;
  onReject: (record: AttendanceRepairRecord) => void;
}

export function AttendanceRepairPageDetailModal({
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
      title="考勤补录详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
            <div className="text-sm text-gray-900">{record.employeeName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">部门</label>
            <div className="text-sm text-gray-900">{record.department}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">补录日期</label>
            <div className="text-sm text-gray-900">{record.repairDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">补录原因</label>
            <div className="text-sm text-gray-900">{record.reason}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">上班时间</label>
            <div className="text-sm text-gray-900">{record.checkInTime}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">下班时间</label>
            <div className="text-sm text-gray-900">{record.checkOutTime}</div>
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
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">审批人</label>
            <div className="text-sm text-gray-900">{record.approver || '未审批'}</div>
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
            <Button
              onClick={() => { onReject(record); onClose(); }}
              variant="destructive"
              size="default"
            >
              驳回
            </Button>
            <Button
              onClick={() => { onApprove(record); onClose(); }}
              variant="default"
              size="default"
            >
              通过
            </Button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
