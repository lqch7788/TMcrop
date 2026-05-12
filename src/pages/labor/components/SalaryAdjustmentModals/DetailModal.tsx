/**
 * 调薪申请详情弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { SalaryAdjustmentRecord } from '../../types/salaryAdjustment.types';
import { Button } from '@/components/ui/button';

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalaryAdjustmentRecord | null;
  onApprove: (record: SalaryAdjustmentRecord) => void;
  onReject: (record: SalaryAdjustmentRecord) => void;
}

/**
 * 调薪申请详情弹窗组件
 */
export function DetailModal({
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
      title="调薪详情"
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
            <label className="block text-sm font-medium text-gray-500 mb-1">岗位</label>
            <div className="text-sm text-gray-900">{record.position}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">调整类型</label>
            <div className="text-sm text-gray-900">{record.adjustmentType}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">当前薪资</label>
            <div className="text-sm text-gray-900">¥{record.currentSalary.toLocaleString()}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请薪资</label>
            <div className="text-sm text-emerald-600 font-medium">¥{record.proposedSalary.toLocaleString()}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">调整金额</label>
            <div className={`text-sm font-medium ${record.adjustmentAmount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {record.adjustmentAmount > 0 ? '+' : ''}¥{record.adjustmentAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">调整比例</label>
            <div className={`text-sm font-medium ${record.adjustmentRatio > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {record.adjustmentRatio > 0 ? '+' : ''}{record.adjustmentRatio.toFixed(1)}%
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">生效日期</label>
            <div className="text-sm text-gray-900">{record.effectiveDate}</div>
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
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">调薪原因</label>
            <div className="text-sm text-gray-900">{record.reason}</div>
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
