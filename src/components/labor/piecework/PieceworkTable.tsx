import React, { useState } from 'react';
import { Eye, Edit2, Check, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PieceRate } from './types';

interface PieceworkTableProps {
  data: PieceRate[];
  onViewDetail?: (record: PieceRate) => void;
  onEdit?: (record: PieceRate) => void;
  onConfirm?: (record: PieceRate) => void;
}

export const PieceworkTable: React.FC<PieceworkTableProps> = ({
  data,
  onViewDetail,
  onEdit,
  onConfirm,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize) || 1;

  // 状态颜色映射
  const statusColors: Record<PieceRate['status'], string> = {
    '待确认': 'bg-amber-100 text-amber-700',
    '已确认': 'bg-blue-100 text-blue-700',
    '已发放': 'bg-emerald-100 text-emerald-700',
  };

  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">计件记录</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">员工姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">单位</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">单价</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合计</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {paginatedData.map((record) => (
              <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{record.workerName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{record.taskName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{record.unit}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{record.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  <span className="inline-flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    {record.unitPrice.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-600">
                  <span className="inline-flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    {record.total.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">{record.workDate}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewDetail?.(record)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit?.(record)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {record.status === '待确认' && (
                      <button
                        onClick={() => onConfirm?.(record)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="确认"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
            onChange={(e) => setCurrentPage(1)}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {data.length} 条</span>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &lt;
          </button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default PieceworkTable;
