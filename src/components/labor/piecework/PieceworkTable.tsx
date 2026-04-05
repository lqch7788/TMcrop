import React from 'react';
import { Eye, Edit2, Check, Coins } from 'lucide-react';
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
  // 状态颜色映射
  const statusColors: Record<PieceRate['status'], string> = {
    '待确认': 'bg-amber-100 text-amber-700',
    '已确认': 'bg-blue-100 text-blue-700',
    '已发放': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">员工姓名</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">任务名称</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">单位</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">数量</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">单价</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">合计</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">工作日期</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">状态</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {data.map((record) => (
            <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2.5 font-medium text-gray-900">{record.workerName}</td>
              <td className="px-3 py-2.5 text-gray-700">{record.taskName}</td>
              <td className="px-3 py-2.5 text-gray-700">{record.unit}</td>
              <td className="px-3 py-2.5 text-gray-700">{record.quantity.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-gray-700">
                <span className="inline-flex items-center gap-0.5">
                  <Coins className="w-3 h-3" />
                  {record.unitPrice.toFixed(2)}
                </span>
              </td>
              <td className="px-3 py-2.5 font-semibold text-emerald-600">
                <span className="inline-flex items-center gap-0.5">
                  <Coins className="w-3 h-3" />
                  {record.total.toFixed(2)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-gray-700">{record.workDate}</td>
              <td className="px-3 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewDetail?.(record)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit?.(record)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {record.status === '待确认' && (
                    <button
                      onClick={() => onConfirm?.(record)}
                      className="p-1 rounded hover:bg-emerald-100 text-gray-500 hover:text-emerald-600"
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
  );
};

export default PieceworkTable;
