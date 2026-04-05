/**
 * 绩效考核表格组件
 */
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { PerformanceRecord } from './types';

interface PerformanceTableProps {
  records: PerformanceRecord[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (record: PerformanceRecord) => void;
}

export function PerformanceTable({
  records,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
}: PerformanceTableProps) {
  // 计算排名
  const getRankBadge = (rank?: string) => {
    if (!rank) return '-';
    const num = parseInt(rank);
    if (num === 1) return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">第1名</span>;
    if (num === 2) return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">第2名</span>;
    if (num === 3) return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">第3名</span>;
    return <span className="text-gray-500">{rank}</span>;
  };

  // 状态徽章
  const StatusBadge = ({ status }: { status: PerformanceRecord['status'] }) => {
    return (
      <span
        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
          status === '已评估'
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {status}
      </span>
    );
  };

  // 得分颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格内容 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">月份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">任务完成率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">出勤率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">工作质量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">安全规范</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">协作态度</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">综合得分</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">排名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.staffId}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.staffName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.department}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.month}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.taskCompletionRate}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.attendanceRate}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.workQuality}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.safetyCompliance}%</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.teamworkAttitude}%</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  <span className={getScoreColor(record.totalScore)}>{record.totalScore}</span>
                </td>
                <td className="px-4 py-3">{getRankBadge(record.rank)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={record.status} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewDetail(record)}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                    title="查看详情"
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {totalCount} 条</span>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
