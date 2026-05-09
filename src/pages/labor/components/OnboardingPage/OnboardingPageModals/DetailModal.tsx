/**
 * 入职办理页面详情弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../../components/common/labor/LaborStatusBadge';
import { OnboardingRecord } from '../../../types/onboardingPage.types';

interface OnboardingPageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: OnboardingRecord | null;
  onApprove: (record: OnboardingRecord) => void;
  onReject: (record: OnboardingRecord) => void;
}

export function OnboardingPageDetailModal({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
}: OnboardingPageDetailModalProps) {
  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="入职详情"
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
            <label className="block text-sm font-medium text-gray-500 mb-1">预计入职日期</label>
            <div className="text-sm text-gray-900">{record.expectedStartDate}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">实际入职日期</label>
            <div className="text-sm text-gray-900">{record.actualStartDate || '未入职'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
            <div className="mt-1">
              <LaborStatusBadge
                status={
                  record.status === '已完成' ? 'completed' :
                  record.status === '已取消' ? 'cancelled' :
                  record.status === '入职中' ? 'in_progress' : 'pending'
                }
                label={record.status}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">学历</label>
            <div className="text-sm text-gray-900">{record.education || '未填写'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">专业</label>
            <div className="text-sm text-gray-900">{record.major || '未填写'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">联系电话</label>
            <div className="text-sm text-gray-900">{record.contactPhone || '未填写'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">紧急联系人</label>
            <div className="text-sm text-gray-900">{record.emergencyContact || '未填写'}</div>
          </div>
          {record.remarks && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
              <div className="text-sm text-gray-900">{record.remarks}</div>
            </div>
          )}
        </div>

        {/* 审批操作 */}
        {record.status === '待入职' && (
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
