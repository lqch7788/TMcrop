import { Eye, Check, X, Plus, Edit, Trash2, Download } from 'lucide-react';
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
  onBatchExportClick,
  onCancelBatchEdit,
  onCancelBatchDelete,
  onCancelExport,
}: OvertimeTableProps & {
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: (string | number)[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string | number) => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  onCancelExport?: () => void;
}) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const allSelected = data.length > 0 && selectedRows.length === total;

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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">加班记录</h3>
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
                    onClick={onCancelBatchEdit}
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
                    onClick={onCancelBatchDelete}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
              {exportMode && (
                <>
                  <button
                    onClick={onBatchExportClick}
                    disabled={selectedRows.length === 0}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </button>
                  <button
                    onClick={onCancelExport}
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
              {onBatchExportClick && (
                <button
                  onClick={onBatchExportClick}
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
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">加班类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">时长(小时)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">加班费(元)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">原因</th>
              {!showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {data.map((record) => (
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
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.staffName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeClass(record.type)}`}>
                    {record.type}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.hours}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {record.totalPay ? `¥${record.totalPay.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{record.reason}</td>
                {!showCheckbox && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
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
                )}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={showCheckbox ? 9 : 8} className="px-4 py-12 text-center text-gray-400">
                  暂无加班记录
                </td>
              </tr>
            )}
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
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
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

export default OvertimeTable;