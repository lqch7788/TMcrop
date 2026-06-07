/**
 * 绩效考核表格组件
 */
import { Eye, ChevronLeft, ChevronRight, Edit2, Trash2, Download, Plus, CheckSquare, Square, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { PerformanceRecord } from './types';
import { Pagination } from '@/components/ui';

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
            <Button
              variant="secondary"
              onClick={onCancelBatch}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              取消
            </Button>
          )}
          {/* 新增按钮 - 正常模式显示 */}
          {!showCheckbox && (
            <Button
              onClick={onAddClick}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              新增
            </Button>
          )}
          {/* 编辑/批量编辑按钮 - 同一位置 */}
          {batchEditMode ? (
            <Button
              onClick={onBatchEditClick}
              disabled={selectedRows.length === 0}
              className="gap-1 bg-blue-600 hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              批量编辑
            </Button>
          ) : (
            !showCheckbox && (
              <Button
                onClick={onBatchEditClick}
                className="gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </Button>
            )
          )}
          {/* 删除/批量删除按钮 - 同一位置 */}
          {batchDeleteMode ? (
            <Button
              onClick={onBatchDeleteClick}
              disabled={selectedRows.length === 0}
              className="gap-1 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              批量删除
            </Button>
          ) : (
            !showCheckbox && (
              <Button
                onClick={onBatchDeleteClick}
                className="gap-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            )
          )}
          {/* 导出按钮 - 同一位置 */}
          {exportMode ? (
            <Button
              onClick={onBatchExportClick}
              disabled={selectedRows.length === 0}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          ) : (
            !showCheckbox && (
              <Button
                onClick={onBatchExportClick}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap w-12">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSelectAll}
                    className="text-white hover:text-blue-200"
                  >
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </Button>
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">工号</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">姓名</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">部门</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">月份</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">任务完成率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">出勤率</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">工作质量</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">安全规范</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">协作态度</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">综合得分</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">排名</TableHead>
              <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">状态</TableHead>
              {!showCheckbox && (
                <TableHead className="px-4 py-3 text-sm font-semibold whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {records.map((record) => (
              <TableRow key={record.id} className={`hover:bg-gray-50 ${selectedRows.includes(record.id) ? 'bg-emerald-50' : ''}`}>
                {showCheckbox && (
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectRow?.(record.id)}
                      className="text-gray-500 hover:text-emerald-600"
                    >
                      {selectedRows.includes(record.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                )}
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.staffId}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.staffName}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.department}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.month}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.taskCompletionRate}%</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.attendanceRate}%</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.workQuality}%</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.safetyCompliance}%</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.teamworkAttitude}%</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                  <span className={getScoreColor(record.totalScore)}>{record.totalScore}</span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">{getRankBadge(record.rank)}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={record.status} />
                </TableCell>
                {!showCheckbox && (
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewDetail(record)}
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(record)}
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(record)}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 选择栏 */}
      {showCheckbox && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium p-0 h-auto"
            >
              {allSelected ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        </div>
      )}

      {/* 分页 */}
      <div className="px-4 pb-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          showPageSize={true}
        />
      </div>
    </div>
  );
}
