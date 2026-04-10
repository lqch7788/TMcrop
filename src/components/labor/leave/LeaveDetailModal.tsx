import { X, CheckCircle, XCircle } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { LeaveDetailModalProps } from './types';

/**
 * 请假详情弹窗组件
 */
export function LeaveDetailModal({ record, open, onClose, onApprove, onReject }: LeaveDetailModalProps) {
  if (!open || !record) return null;

  // 状态颜色映射
  const getStatusStyle = (status: string) => {
    switch (status) {
      case '待审批':
        return 'bg-amber-100 text-amber-700';
      case '已审批':
        return 'bg-green-100 text-green-700';
      case '已驳回':
        return 'bg-red-100 text-red-700';
      case '已取消':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const content = (
    <div className="grid grid-cols-2 gap-4">
      {/* 员工姓名 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">员工姓名</label>
        <p className="text-gray-900">{record.staffName}</p>
      </div>

      {/* 员工编号 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">员工编号</label>
        <p className="text-gray-900">{record.staffId}</p>
      </div>

      {/* 请假类型 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">请假类型</label>
        <p className="text-gray-900">{record.leaveType}</p>
      </div>

      {/* 状态 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">状态</label>
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
          {record.status}
        </span>
      </div>

      {/* 开始日期 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">开始日期</label>
        <p className="text-gray-900">{record.startDate}</p>
      </div>

      {/* 结束日期 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">结束日期</label>
        <p className="text-gray-900">{record.endDate}</p>
      </div>

      {/* 请假天数 */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">请假天数</label>
        <p className="text-gray-900">{record.days} 天</p>
      </div>

      {/* 审批人 */}
      {record.approver && (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">审批人</label>
          <p className="text-gray-900">{record.approver}</p>
        </div>
      )}

      {/* 审批时间 */}
      {record.approveTime && (
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">审批时间</label>
          <p className="text-gray-900">{record.approveTime}</p>
        </div>
      )}

      {/* 请假原因 */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-500 mb-1">请假原因</label>
        <p className="text-gray-900">{record.reason}</p>
      </div>

      {/* 备注 */}
      {record.remarks && (
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-500 mb-1">备注</label>
          <p className="text-gray-900">{record.remarks}</p>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
      >
        关闭
      </button>
      {record.status === '待审批' && (
        <>
          <button
            onClick={() => onReject(record)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            驳回
          </button>
          <button
            onClick={() => onApprove(record)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            批准
          </button>
        </>
      )}
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title="请假详情"
      size="md"
      showFooter={true}
      headerAction={
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
