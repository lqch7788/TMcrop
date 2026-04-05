import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkLogTableProps } from './types';

/**
 * 工作日志表格组件
 */
export function WorkLogTable({
  data,
  pagination,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
}: WorkLogTableProps) {
  const { currentPage, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日志编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工人姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">天气</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">温度</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">作物</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">大棚</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生长状况</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作内容</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">问题描述</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">处理措施</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.worker}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.weather}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.temperature}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.crop}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.greenhouse}</td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                  {log.tasks}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate">
                  {log.problems}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[120px] truncate">
                  {log.solutions}
                </td>
                <td className="px-4 py-3">
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
