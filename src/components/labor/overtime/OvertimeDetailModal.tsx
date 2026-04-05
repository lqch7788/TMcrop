import { X, Check, XCircle } from 'lucide-react';
import type { OvertimeDetailModalProps, OvertimeType } from './types';

/**
 * 加班详情弹窗组件
 */
export function OvertimeDetailModal({ record, open, onClose, onApprove, onReject }: OvertimeDetailModalProps) {
  if (!open || !record) return null;

  // 获取加班类型信息
  const getTypeInfo = (type: OvertimeType) => {
    switch (type) {
      case '普通加班':
        return { label: '普通加班', multiplier: '1.5倍', color: 'blue' };
      case '周末加班':
        return { label: '周末加班', multiplier: '2倍', color: 'purple' };
      case '节假日加班':
        return { label: '节假日加班', multiplier: '3倍', color: 'red' };
    }
  };

  const typeInfo = getTypeInfo(record.type);

  // 获取状态样式
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">加班详情</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">员工姓名</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{record.staffName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">员工工号</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{record.staffId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">加班日期</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{record.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">加班时长</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{record.hours} 小时</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">加班类型</p>
              <p className="mt-1">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-${typeInfo.color}-100 text-${typeInfo.color}-700`}>
                  {typeInfo.label} ({typeInfo.multiplier})
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">审批状态</p>
              <p className="mt-1">
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyle(record.status)}`}>
                  {record.status}
                </span>
              </p>
            </div>
          </div>

          {/* 加班费 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">加班费计算</span>
              <span className="text-lg font-bold text-emerald-600">
                {record.totalPay ? `¥${record.totalPay.toFixed(2)}` : '-'}
              </span>
            </div>
            {record.hourlyRate && (
              <p className="mt-1 text-xs text-gray-400">
                {record.hours}h × ¥{record.hourlyRate}/h × {typeInfo.multiplier}
              </p>
            )}
          </div>

          {/* 加班原因 */}
          <div>
            <p className="text-sm text-gray-500">加班原因</p>
            <p className="mt-1 text-sm text-gray-900">{record.reason || '无'}</p>
          </div>

          {/* 审批信息 */}
          {record.approver && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">审批人</span>
                <span className="text-sm text-gray-900">{record.approver}</span>
              </div>
              {record.approveTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">审批时间</span>
                  <span className="text-sm text-gray-900">{record.approveTime}</span>
                </div>
              )}
              {record.remarks && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">备注</span>
                  <span className="text-sm text-gray-900">{record.remarks}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {record.status === '待审批' && (
            <>
              <button
                onClick={() => onReject(record)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                驳回
              </button>
              <button
                onClick={() => onApprove(record)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                批准
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default OvertimeDetailModal;
