import { Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Download } from 'lucide-react';
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
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onAddClick,
  onBatchEditClick,
  onBatchDeleteClick,
  onExportClick,
}: LeaveTableProps & {
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: number[];
  onSelectAll?: () => void;
  onSelectRow?: (id: number) => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onExportClick?: () => void;
}) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const allSelected = data.length > 0 && selectedRows.length === total;

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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">请假记录</h3>
        <div className="flex gap-2">
          {(batchEditMode || batchDeleteMode || exportMode) ? (
            <>
              {batchEditMode && (
                <>
                  <button
                    onClick={onBatchEditClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit className="w-4 h-4" />
                    批量编辑
                  </button>
                  <button
                    onClick={onBatchDeleteClick}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <button
                    onClick={onBatchDeleteClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </button>
                  <button
                    onClick={onBatchDeleteClick}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {exportMode && (
                <>
                  <button
                    onClick={onExportClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button
                    onClick={onExportClick}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <button
                  onClick={onAddClick}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {onBatchEditClick && (
                <button
                  onClick={onBatchEditClick}
                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
              )}
              {onBatchDeleteClick && (
                <button
                  onClick={onBatchDeleteClick}
                  className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {onExportClick && (
                <button
                  onClick={onExportClick}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            {(exportMode || batchEditMode || batchDeleteMode) && (
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">员工姓名</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">请假类型</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">开始日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">结束日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">天数</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
            {!showCheckbox && (
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((record) => (
            <tr key={record.id} className="hover:bg-blue-100 transition-colors">
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(record.id)}
                    onChange={() => onSelectRow?.(record.id)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.staffName}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.leaveType}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.startDate}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.endDate}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.days}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                  {record.status}
                </span>
              </td>
              {!showCheckbox && (
                <td className="px-4 py-3 whitespace-nowrap">
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* 选择栏 */}
      {showCheckbox && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <button
              onClick={onSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {allSelected ? '全不选' : '全选'}
            </button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        </div>
      )}

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4 px-4 pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {total} 条</span>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &lt;
          </button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
