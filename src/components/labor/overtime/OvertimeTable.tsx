import { Eye, Check, X } from 'lucide-react';
import type { OvertimeTableProps, OvertimeRecord, OvertimeType } from './types';

/**
 * 加班记录表格组件
 */
export function OvertimeTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onApprove,
  onReject,
}: OvertimeTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);

  // 获取加班类型标签样式
  const getTypeBadgeClass = (type: OvertimeType) => {
    switch (type) {
      case '普通加班':
        return 'bg-blue-100 text-blue-700';
      case '周末加班':
        return 'bg-purple-100 text-purple-700';
      case '节假日加班':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // 获取状态标签样式
  const getStatusBadgeClass = (status: string) => {
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
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">员工姓名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">加班类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时长(小时)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">加班费(元)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{record.staffName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{record.date}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeClass(record.type)}`}>
                    {record.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{record.hours}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                  {record.totalPay ? `¥${record.totalPay.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{record.reason}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewDetail(record)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {record.status === '待审批' && (
                      <>
                        <button
                          onClick={() => onApprove(record)}
                          className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                          title="批准"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onReject(record)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="驳回"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  暂无加班记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          共 {total} 条记录，第 {currentPage} / {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

export default OvertimeTable;
