/**
 * 绩效考核表格组件
 */
import { Eye, ChevronLeft, ChevronRight, Edit2, Trash2, Download, Plus, CheckSquare, Square, X } from 'lucide-react';
import { PerformanceRecord } from './types';

interface PerformanceTableProps {
  records: PerformanceRecord[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (record: PerformanceRecord) => void;
  onEdit?: (record: PerformanceRecord) => void;
  onDelete?: (record: PerformanceRecord) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onShowExportModal?: () => void;
  onAddClick?: () => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onBatchEditMode?: boolean;
  onBatchDeleteMode?: boolean;
}

export function PerformanceTable({
  records,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEdit,
  onDelete,
  onSelectAll,
  onSelectRow,
  onShowExportModal,
  onAddClick,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onBatchEditMode = false,
  onBatchDeleteMode = false,
}: PerformanceTableProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;
  const allSelected = records.length > 0 && selectedRows.length === totalCount;

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
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">绩效考核记录</h3>
          {showCheckbox && (
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 取消按钮 - 批量模式下显示 */}
          {showCheckbox && (
            <button
              onClick={onCancelBatch}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          )}
          {/* 新增按钮 - 正常模式显示 */}
          {!showCheckbox && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          )}
          {/* 编辑/批量编辑按钮 - 同一位置 */}
          {batchEditMode ? (
            <button
              onClick={onBatchEditClick}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
              批量编辑
            </button>
          ) : (
            !showCheckbox && (
              <button
                onClick={onBatchEditClick}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            )
          )}
          {/* 删除/批量删除按钮 - 同一位置 */}
          {batchDeleteMode ? (
            <button
              onClick={onBatchDeleteClick}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </button>
          ) : (
            !showCheckbox && (
              <button
                onClick={onBatchDeleteClick}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            )
          )}
          {/* 导出按钮 - 同一位置 */}
          {exportMode ? (
            <button
              onClick={onBatchExportClick}
              disabled={selectedRows.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          ) : (
            !showCheckbox && (
              <button
                onClick={onBatchExportClick}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <button
                    onClick={onSelectAll}
                    className="text-white hover:text-blue-200"
                  >
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
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
              {!showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {records.map((record) => (
              <tr key={record.id} className={`hover:bg-gray-50 ${selectedRows.includes(record.id) ? 'bg-emerald-50' : ''}`}>
                {showCheckbox && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => onSelectRow?.(record.id)}
                      className="text-gray-500 hover:text-emerald-600"
                    >
                      {selectedRows.includes(record.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                )}
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
                {!showCheckbox && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(record)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(record)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
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
