import { Eye, Plus, Edit, Trash2, Download } from 'lucide-react';
import type { WorkLog, WorkLogTableProps } from './types';

/**
 * 工作日志表格组件
 */
export function WorkLogTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
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
}: WorkLogTableProps & {
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
  const allSelected = selectedRows.length === data.length && data.length > 0;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">工作日志列表</h3>
        <div className="flex gap-2">
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
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">日志编号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务编号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作量</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">进度</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">天气</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">温度</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">大棚</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生长状况</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作内容</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">问题描述</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">处理措施</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">提交时间</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((log) => (
            <tr key={log.id} className="hover:bg-blue-100 transition-colors">
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(log.id)}
                    onChange={() => onSelectRow?.(log.id)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{log.code}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.taskCode || '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.taskTypeName || '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {log.workloadDays || log.workloadHours ? (
                  `${log.workloadDays ? `${log.workloadDays}天` : ''}${log.workloadHours ? `${log.workloadHours}小时` : ''}${log.workers ? `，${log.workers}人` : ''}`
                ) : '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {log.progress !== undefined ? `${log.progress}%` : '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.weather}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.temperature}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.crop}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.greenhouse}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    log.growthStatus === '良好'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {log.growthStatus}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[150px] truncate">
                {log.tasks}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate">
                {log.problems}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-[120px] truncate">
                {log.solutions}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                {log.submitTime ? new Date(log.submitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => onViewDetail(log)}
                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                  title="查看"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

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
