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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">工作日志列表</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">日志编号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工人姓名</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">天气</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">温度</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">大棚</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生长状况</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作内容</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">问题描述</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">处理措施</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((log) => (
            <tr key={log.id} className="hover:bg-blue-100 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{log.code}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.date}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.worker}</td>
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
