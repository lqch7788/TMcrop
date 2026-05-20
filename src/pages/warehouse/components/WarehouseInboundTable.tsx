/**
 * 仓库入库表格组件
 * 从 WarehouseInboundPage 拆分出来，处理表格展示功能
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { getStatusText, getStatusClassName } from '../utils/warehouseInbound.utils';

interface WarehouseInboundTableProps {
  // 数据
  records: InboundRecord[];
  displayedRecords: InboundRecord[];

  // 选择状态
  selectedRows: number[];
  isAllSelected: boolean;
  editMode: boolean;
  deleteMode: boolean;
  exportMode: boolean;

  // 展开状态
  expandedRows: Set<number>;

  // 操作方法
  onToggleExpand: (id: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number) => void;
  onViewRecord: (record: InboundRecord) => void;

  // 分页
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const WarehouseInboundTable: React.FC<WarehouseInboundTableProps> = ({
  records,
  displayedRecords,
  selectedRows,
  isAllSelected,
  editMode,
  deleteMode,
  exportMode,
  expandedRows,
  onToggleExpand,
  onSelectAll,
  onSelectRow,
  onViewRecord,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) => {
  // 判断是否有任何模式激活
  const hasActiveMode = editMode || deleteMode || exportMode;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格主体 */}
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {/* 选择框列 */}
              {hasActiveMode && (
                <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={() => onSelectAll()}
                  />
                </TableHead>
              )}

              {/* 展开按钮列 */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-10"></TableHead>

              {/* 表头 */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库单号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库日期</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作员</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料数量</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-300">
            {displayedRecords.map((record) => (
              <React.Fragment key={record.id}>
                {/* 主数据行 */}
                <TableRow className="hover:bg-blue-100 transition-colors">
                  {/* 选择框 */}
                  {hasActiveMode && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {deleteMode && record.status !== 'pending' ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <Checkbox
                          checked={selectedRows.includes(record.id)}
                          onCheckedChange={() => onSelectRow(record.id)}
                        />
                      )}
                    </TableCell>
                  )}

                  {/* 展开按钮 */}
                  <TableCell className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleExpand(record.id)}
                    >
                      {expandedRows.has(record.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                  </TableCell>

                  {/* 数据列 */}
                  <TableCell
                    className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
                    onClick={() => onViewRecord(record)}
                  >
                    {record.code}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </TableCell>
                </TableRow>

                {/* 展开的物料明细行 */}
                {expandedRows.has(record.id) && (
                  <TableRow key={`${record.id}-expanded`} className="bg-white hover:bg-gray-50">
                    <TableCell colSpan={hasActiveMode ? 8 : 7} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          物料明细（共 {record.materials.length} 项）
                        </div>
                        <Table className="w-full text-sm">
                          <TableHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                            <TableRow>
                              <TableHead className="px-3 py-2 text-left font-medium">物料编码</TableHead>
                              <TableHead className="px-3 py-2 text-left font-medium">物料名称</TableHead>
                              <TableHead className="px-3 py-2 text-left font-medium">分类</TableHead>
                              <TableHead className="px-3 py-2 text-left font-medium">规格</TableHead>
                              <TableHead className="px-3 py-2 text-right font-medium">数量</TableHead>
                              <TableHead className="px-3 py-2 text-right font-medium">单价</TableHead>
                              <TableHead className="px-3 py-2 text-left font-medium">批次号</TableHead>
                              <TableHead className="px-3 py-2 text-left font-medium">有效期至</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-gray-300">
                            {record.materials.map((material, idx) => (
                              <TableRow key={idx} className="hover:bg-gray-50">
                                <TableCell className="px-3 py-2 text-gray-800 font-mono text-xs">{material.code}</TableCell>
                                <TableCell className="px-3 py-2 text-gray-800 font-medium">{material.name}</TableCell>
                                <TableCell className="px-3 py-2 text-gray-600">{material.category}</TableCell>
                                <TableCell className="px-3 py-2 text-gray-600">{material.specification}</TableCell>
                                <TableCell className="px-3 py-2 text-right text-gray-800">{material.quantity} {material.unit}</TableCell>
                                <TableCell className="px-3 py-2 text-right text-gray-800">{material.price}</TableCell>
                                <TableCell className="px-3 py-2 text-gray-600">{material.batchNo || '-'}</TableCell>
                                <TableCell className="px-3 py-2 text-gray-600">{material.expiryDate || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {totalCount} 条</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
          <span className="text-sm">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseInboundTable;
