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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">绩效考核记录</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">月份</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务完成率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">出勤率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作质量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">安全规范</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">协作态度</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">综合得分</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">排名</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.staffId}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.staffName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.department}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.month}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.taskCompletionRate}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.attendanceRate}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.workQuality}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.safetyCompliance}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.teamworkAttitude}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold whitespace-nowrap text-gray-900">
                  <span className={getScoreColor(record.totalScore)}>{record.totalScore}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{getRankBadge(record.rank)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={record.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
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
      <div className="flex items-center justify-between mt-4 px-4 pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {totalCount} 条</span>
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
