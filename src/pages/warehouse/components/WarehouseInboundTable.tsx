/**
 * 仓库入库表格组件
 * 从 WarehouseInboundPage 拆分出来，处理表格展示功能
 */

import React from 'react';
import { ChevronDown, ChevronRight, Edit2, RotateCcw, Trash2 } from 'lucide-react';
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
  /** 2026-09-27：冲销（红字单）——列表行内入口，仅对已完成单显示 */
  onRequestReversal?: (record: InboundRecord) => void;
  /**
   * 2026-09-28：已被冲销的原单 → 冲销单号 映射（由页面用**全量**记录计算后传入）。
   * 此前表格自己用 filteredRecords 计算，一旦筛掉冲销单，"已冲销"徽章消失、
   * 行内"冲销"按钮重新出现（守卫被筛选绕过）。
   */
  reversalByOriginal?: Map<number, string>;
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
  onRequestReversal,
  reversalByOriginal = new Map(),
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

  // 2026-09-27：已被冲销的原单 → 冲销单号 映射（2026-09-28 起由页面用全量记录传入，
  // 避免筛选把冲销单排除后"已冲销"徽章消失、冲销按钮复现）

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
            {/* 2026-09-28 审计修复：空结果必须有提示——此前筛选后无命中时表格全空白，
                用户以为"数据没了"（配合页码越界问题更明显） */}
            {displayedRecords.length === 0 && (
              <TableRow>
                <TableCell colSpan={hasActiveMode ? 9 : 8} className="px-4 py-10 text-center text-gray-500">
                  没有符合条件的入库记录（可尝试重置筛选条件）
                </TableCell>
              </TableRow>
            )}
            {displayedRecords.map((record) => (
              <React.Fragment key={record.id}>
                {/* 主数据行 */}
                <TableRow className="hover:bg-blue-100 transition-colors">
                  {/* 选择框 */}
                  {hasActiveMode && (
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {/* 2026-08-10 修复：删除模式取消仅允许 pending 的限制（原逻辑让非 pending 行
                          永远显示 "—"，用户看不到复选框）。
                          2026-09-28 更正：后端自 2026-09-27 起**已完成单禁止删除**（materials.ts:527），
                          勾选已完成行会在确认时被逐条拒绝；前端保留复选框是为了让用户拿到明确原因提示，
                          正确路径是行内"作废/冲销"。 */}
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
                    {/* 2026-09-27：冲销单标识（红字单，关联原单） */}
                    {record.recordType === 'reversal' && (
                      <span className="mr-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs no-underline" title={`冲销单：冲销 #${record.reversalOf ?? ''}${record.reversalReason ? `｜原因：${record.reversalReason}` : ''}`}>
                        冲销
                      </span>
                    )}
                    {/* 2026-09-28：被冲销的原单标识（灰蓝底，与红色"冲销"徽章明显区分）
                        原单 status 仍是"已完成"（冲销不动原单），只在状态列看不出已失效，故在单号前显式标记 */}
                    {record.recordType !== 'reversal' && reversalByOriginal.has(record.id) && (
                      <span
                        className="mr-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs no-underline"
                        title={`该入库单已被冲销（冲销单：${reversalByOriginal.get(record.id) || '-'}），原单保留供追溯`}
                      >
                        已冲销
                      </span>
                    )}
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
                  {/* 行内操作列：编辑 + 冲销 + 删除按钮（2026-08-10 下沉自工具栏；冲销 2026-09-27 新增） */}
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
                      {/* 冲销：仅已完成、非冲销单本身、且未被他单冲销过（防重复冲销） */}
                      {onRequestReversal && record.status === 'completed' && record.recordType !== 'reversal' && !reversalByOriginal.has(record.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="冲销（原单保留，回收仍在库存中的数量）"
                          onClick={() => onRequestReversal(record)}
                        >
                          <RotateCcw className="w-4 h-4 text-amber-600" />
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
