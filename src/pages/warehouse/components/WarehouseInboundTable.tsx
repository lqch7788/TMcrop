/**
 * 仓库入库表格组件
 * 从 WarehouseInboundPage 拆分出来，处理表格展示功能
 */

import React from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { InboundRecord } from '../../../types/warehouseInbound.types';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
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
  // 2026-08-10：行内操作列回调（参照物料库存页面模式）
  onEditRecord?: (record: InboundRecord) => void;
  onDeleteRecord?: (record: InboundRecord) => void;
  // 权限控制
  canEdit?: boolean;
  canDelete?: boolean;

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
  onEditRecord,
  onDeleteRecord,
  canEdit = true,
  canDelete = true,
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
              {/* 2026-08-10：操作列（参照物料库存页面，下沉编辑/删除按钮） */}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</TableHead>
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
                      {/* 2026-08-10 修复：删除模式取消仅允许 pending 的限制。
                          原逻辑 `deleteMode && status !== 'pending' ? '—' : <Checkbox/>`
                          导致非 pending 行永远显示 "—" 占位符，用户看不到复选框、无法删除入库单。
                          后端 DELETE 不限制状态，确认弹窗仍做二次确认，安全可控。 */}
                      <Checkbox
                        checked={selectedRows.includes(record.id)}
                        onCheckedChange={() => onSelectRow(record.id)}
                      />
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
                  {/* 行内操作列：编辑 + 删除按钮（2026-08-10 下沉自工具栏） */}
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {canEdit && onEditRecord && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="编辑"
                          onClick={() => onEditRecord(record)}
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {canDelete && onDeleteRecord && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="删除"
                          onClick={() => onDeleteRecord(record)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* 展开的物料明细行 */}
                {expandedRows.has(record.id) && (
                  <TableRow key={`${record.id}-expanded`} className="bg-white hover:bg-gray-50">
                    <TableCell colSpan={hasActiveMode ? 9 : 8} className="px-4 py-3">
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
      <div className="px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          showPageSize={true}
        />
      </div>
    </div>
  );
};

export default WarehouseInboundTable;
