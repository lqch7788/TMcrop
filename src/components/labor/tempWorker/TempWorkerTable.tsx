import { Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Plus, Pencil, Download } from 'lucide-react';
import {
  TempWorkerTableProps,
  TempWorker,
  StaffStatus,
} from './types';

/**
 * 获取状态对应的样式
 */
function getStatusClass(status: StaffStatus): string {
  switch (status) {
    case '在职':
      return 'bg-emerald-100 text-emerald-700';
    case '离职':
      return 'bg-gray-100 text-gray-600';
    case '停薪留职':
      return 'bg-amber-100 text-amber-700';
    case '试用期':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

interface ExtendedTempWorkerTableProps extends TempWorkerTableProps {
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  onCancelExport?: () => void;
}

/**
 * 临时工列表表格组件
 */
export function TempWorkerTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEdit,
  onDelete,
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
}: ExtendedTempWorkerTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const allSelected = selectedRows.length === data.length && data.length > 0;

  // 处理删除确认
  const handleDelete = (record: TempWorker) => {
    if (confirm(`确定要删除员工 "${record.name}" 吗？`)) {
      onDelete(record);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">临时工列表</h3>
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
                    <Pencil className="w-4 h-4" />
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
                  <Edit2 className="w-4 h-4" />
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

      {/* 表格 */}
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
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                工号
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                姓名
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                类型
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                合同类型
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                技能数
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                状态
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                入职日期
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-blue-100 transition-colors"
                >
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(record.id)}
                        onChange={() => onSelectRow?.(record.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {record.employeeCode}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {record.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {record.workerType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {record.contractType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                      {record.skillTags.length} 项
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {record.joinDate}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
