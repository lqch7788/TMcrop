import React, { useState } from 'react';
import { Eye, Edit2, Check, Coins, Trash2, Download, Plus } from 'lucide-react';
import type { PieceRate } from './types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface PieceworkTableProps {
  data: PieceRate[];
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows?: string[];
  onViewDetail?: (record: PieceRate) => void;
  onEdit?: (record: PieceRate) => void;
  onConfirm?: (record: PieceRate) => void;
  onDelete?: (record: PieceRate) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  onBatchEditClick?: () => void;
  onBatchDeleteClick?: () => void;
  onBatchExportClick?: () => void;
  onCancelBatch?: () => void;
  onAddClick?: () => void;
}

export const PieceworkTable: React.FC<PieceworkTableProps> = ({
  data,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onViewDetail,
  onEdit,
  onConfirm,
  onDelete,
  onSelectAll,
  onSelectRow,
  onBatchEditClick,
  onBatchDeleteClick,
  onBatchExportClick,
  onCancelBatch,
  onAddClick,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allSelected = selectedRows.length === data.length && data.length > 0;

  // 状态颜色映射
  const statusColors: Record<PieceRate['status'], string> = {
    '待确认': 'bg-amber-100 text-amber-700',
    '已确认': 'bg-blue-100 text-blue-700',
    '已发放': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">计件记录</h3>
        <div className="flex gap-2">
          {(batchEditMode || batchDeleteMode || exportMode) ? (
            <>
              {batchEditMode && (
                <>
                  <Button
                    size="sm"
                    variant="blue"
                    onClick={onBatchEditClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Edit2 className="w-4 h-4" />
                    批量编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatch}
                  >
                    取消
                  </Button>
                </>
              )}
              {batchDeleteMode && (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onBatchDeleteClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                    确认删除
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatch}
                  >
                    取消
                  </Button>
                </>
              )}
              {exportMode && (
                <>
                  <Button
                    size="sm"
                    onClick={onBatchExportClick}
                    disabled={selectedRows.length === 0}
                  >
                    <Download className="w-4 h-4" />
                    确认导出
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancelBatch}
                  >
                    取消
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {onAddClick && (
                <Button
                  size="sm"
                  onClick={onAddClick}
                >
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {onBatchEditClick && (
                <Button
                  size="sm"
                  variant="blue"
                  onClick={onBatchEditClick}
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {onBatchDeleteClick && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBatchDeleteClick}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {onBatchExportClick && (
                <Button
                  size="sm"
                  onClick={onBatchExportClick}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onSelectAll?.()}
                    className="border-white data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-blue-600"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">员工姓名</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">任务名称</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">单位</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">数量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">单价</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">合计</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">工作日期</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
              {!showCheckbox && (
                <TableHead className="px-4 py-3 text-center text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 10 : 9} className="px-4 py-8 text-center text-gray-500">
                  暂无计件工资记录
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((record) => (
                <TableRow key={record.id} className="hover:bg-blue-100 transition-colors">
                  {showCheckbox && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <Checkbox
                        checked={selectedRows.includes(record.id)}
                        onCheckedChange={() => onSelectRow?.(record.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{record.workerName}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-gray-700">{record.taskName}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-gray-700">{record.unit}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-gray-700">{record.quantity.toLocaleString()}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-gray-700">
                    <span className="inline-flex items-center gap-0.5">
                      <Coins className="w-3 h-3" />
                      {record.unitPrice.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-600">
                    <span className="inline-flex items-center gap-0.5">
                      <Coins className="w-3 h-3" />
                      {record.total.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-gray-700">{record.workDate}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
                      {record.status}
                    </span>
                  </TableCell>
                  {!showCheckbox && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetail?.(record)}
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit?.(record)}
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {record.status === '待确认' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onConfirm?.(record)}
                            title="确认"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete?.(record)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 选择栏 */}
      {showCheckbox && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
            >
              {allSelected ? '全不选' : '全选'}
            </Button>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            &lt;
          </Button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PieceworkTable;