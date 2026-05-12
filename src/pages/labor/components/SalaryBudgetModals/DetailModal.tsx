/**
 * 工资预算详情弹窗组件
 */
import { Button } from '@/components/ui';
import { UnifiedModal } from '../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../components/common/labor/LaborStatusBadge';
import { SalaryBudgetRecord } from '../../types/salaryBudget.types';
import { ApprovalStatus, getApprovalStatusName } from '../../../../types/approval';

export interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalaryBudgetRecord | null;
  onApprove: (record: SalaryBudgetRecord) => void;
  onReject: (record: SalaryBudgetRecord) => void;
}

/**
 * 工资预算详情弹窗组件
 * 显示工资预算的完整信息和审批操作
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
      title="预算详情"
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">预算编号</label>
            <div className="text-sm text-gray-900">{record.budgetCode}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">部门</label>
            <div className="text-sm text-gray-900">{record.deptName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">预算月份</label>
            <div className="text-sm text-gray-900">
              {record.budgetMonth && (() => {
                const [year, month] = record.budgetMonth.split('-');
                return `${year}年${parseInt(month)}月`;
              })()}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请人</label>
            <div className="text-sm text-gray-900">{record.applicantName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请日期</label>
            <div className="text-sm text-gray-900">{record.applyDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
            <div className="mt-1">
              <LaborStatusBadge
                status={
                  record.status === ApprovalStatus.APPROVED ? 'completed' :
                  record.status === ApprovalStatus.PENDING ? 'pending' :
                  record.status === ApprovalStatus.REJECTED ? 'rejected' :
                  record.status === ApprovalStatus.CANCELLED ? 'cancelled' : 'draft'
                }
                label={getApprovalStatusName(record.status)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">基本工资总额</label>
            <div className="text-sm text-gray-900">
              ¥{record.totalBaseSalary.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">加班费总额</label>
            <div className="text-sm text-gray-900">
              ¥{record.totalOvertimePay.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">奖金总额</label>
            <div className="text-sm text-gray-900">
              ¥{record.totalBonus.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">总计</label>
            <div className="text-sm font-medium text-emerald-600">
              ¥{record.grandTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          {record.remark && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
              <div className="text-sm text-gray-900">{record.remark}</div>
            </div>
          )}
        </div>

        {/* 审批操作 */}
        {record.status === ApprovalStatus.PENDING && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="destructive" onClick={() => { onReject(record); onClose(); }}>
              驳回
            </Button>
            <Button variant="blue" onClick={() => { onApprove(record); onClose(); }}>
              通过
            </Button>
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
