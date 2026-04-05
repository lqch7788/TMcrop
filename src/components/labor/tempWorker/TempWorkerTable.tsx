import { Eye, Edit2, Trash2 } from 'lucide-react';
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
}: TempWorkerTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);

  // 处理删除确认
  const handleDelete = (record: TempWorker) => {
    if (confirm(`确定要删除员工 "${record.name}" 吗？`)) {
      onDelete(record);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                合同类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                技能数
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                入职日期
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                    {record.employeeCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {record.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.workerType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.contractType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                      {record.skillTags.length} 项
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.joinDate}
                  </td>
                  <td className="px-4 py-3 text-right">
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
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          共 {total} 条，第 {currentPage}/{totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-8 px-3 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="h-8 px-3 border border-gray-200 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
