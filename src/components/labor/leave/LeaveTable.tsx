import { Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LeaveTableProps } from './types';

/**
 * 请假管理表格组件
 */
export function LeaveTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onApprove,
  onReject,
}: LeaveTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;

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

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">员工姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">请假类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">开始日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">结束日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">天数</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.staffName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.leaveType}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.startDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.endDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.days}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewDetail(record)}
                      className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {record.status === '待审批' && (
                      <>
                        <button
                          onClick={() => onApprove(record)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="批准"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onReject(record)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="驳回"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
