/**
 * 合同续签详情弹窗组件
 */
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { Label } from '@/components/ui';
import { Button } from '@/components/ui';
import { ContractRenewalRecord } from '../../types/contractRenewal.types';

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ContractRenewalRecord | null;
  onApprove: (record: ContractRenewalRecord) => void;
  onReject: (record: ContractRenewalRecord) => void;
}

/**
 * 合同续签详情弹窗组件
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
      title="合同续签详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</Label>
            <div className="text-sm text-gray-900">{record.employeeName}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">部门</Label>
            <div className="text-sm text-gray-900">{record.department}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">岗位</Label>
            <div className="text-sm text-gray-900">{record.position}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">续签期限</Label>
            <div className="text-sm text-gray-900">{record.renewalPeriod}个月</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">当前合同到期日</Label>
            <div className="text-sm text-gray-900">{record.currentContractEnd}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">新合同开始日期</Label>
            <div className="text-sm text-emerald-600 font-medium">{record.newContractStart}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">新合同到期日</Label>
            <div className="text-sm text-emerald-600 font-medium">{record.newContractEnd}</div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-500 mb-1">新薪资</Label>
            <div className="text-sm text-gray-900">{record.newSalary ? `¥${record.newSalary.toLocaleString()}` : '未填写'}</div>
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
            <Label className="block text-sm font-medium text-gray-500 mb-1">审批人</Label>
            <div className="text-sm text-gray-900">{record.approver || '未审批'}</div>
          </div>
          {record.termsChange && (
            <div className="col-span-2">
              <Label className="block text-sm font-medium text-gray-500 mb-1">条款变更说明</Label>
              <div className="text-sm text-gray-900">{record.termsChange}</div>
            </div>
          )}
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
              驳回
            </Button>
            <Button
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
