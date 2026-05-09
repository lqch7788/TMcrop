/**
 * 离职申请页面详情弹窗组件
 */
import { UnifiedModal } from '../../../../../components/ui/UnifiedModal';
import { LaborStatusBadge } from '../../../../../components/common/labor/LaborStatusBadge';
import { ResignationRecord } from '../../../types/resignationPage.types';

interface ResignationPageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ResignationRecord | null;
  onApprove: (record: ResignationRecord) => void;
  onReject: (record: ResignationRecord) => void;
}

export function ResignationPageDetailModal({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
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
            <label className="block text-sm font-medium text-gray-500 mb-1">离职编号</label>
            <div className="text-sm text-gray-900">{record.resignationCode}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">申请人</label>
            <div className="text-sm text-gray-900">{record.workerName}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">离职类型</label>
            <div className="text-sm text-gray-900">{record.resignationType}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">离职原因</label>
            <div className="text-sm text-gray-900">{record.reason}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">预计最后工作日</label>
            <div className="text-sm text-gray-900">{record.expectedLastDay}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">工作交接人</label>
            <div className="text-sm text-gray-900">{record.handoverUserName || '未指定'}</div>
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
            <label className="block text-sm font-medium text-gray-500 mb-1">申请时间</label>
            <div className="text-sm text-gray-900">{record.createTime}</div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">交接说明</label>
            <div className="text-sm text-gray-900">{record.handoverNote || '无'}</div>
          </div>
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
