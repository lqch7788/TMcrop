/**
 * 采收记录表格组件
 * 从HarvestPage中拆分出来，负责表格展示
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HarvestRecord } from '../../../../types/crop';
import { getStatusBadge, getGradeBadge } from '../statusBadgeUtils.tsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { INBOUND_TYPE_MAP, SUPPLEMENTARY_STATUS_MAP } from '../../../../constants/cropConstants';

// 产品明细行组件
interface ProductRowProps {
  record: HarvestRecord;
  recordIdx: number;
  generateProductCode: (cropName: string, variety: string, index: number) => string;
}

function ProductRow({ record, recordIdx, generateProductCode }: ProductRowProps) {
  return (
    <>
      {/* 表头 */}
      <thead className="bg-emerald-600 text-white">
        <tr>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">产品编码</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">作物名称</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">品种</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">生产计划批次号</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">种植模式</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">采收量</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">目标产量</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">完成率</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">品质等级</th>
          <th className="px-2 py-2 text-left text-xs font-medium whitespace-nowrap">备注</th>
        </tr>
      </thead>
      {/* 表体 */}
      <tbody>
        <tr className="border-t">
          <td className="px-2 py-2 text-xs font-mono text-emerald-600 whitespace-nowrap">
            {generateProductCode(record.cropName, record.variety || record.cropVariety || '', recordIdx)}
          </td>
          <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{record.cropName}</td>
          <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{record.variety || record.cropVariety || '-'}</td>
          <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{record.batchCode || '-'}</td>
          <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{record.plantingMode || '-'}</td>
          <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{record.harvestQuantity} {record.unit}</td>
          <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{record.targetYield || 0}</td>
          <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
            {record.targetYield ? Math.round(record.harvestQuantity / record.targetYield * 100) : 0}%
          </td>
          <td className="px-2 py-2 text-xs whitespace-nowrap">{getGradeBadge(record.grade || record.qualityGrade || 'A')}</td>
          <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{record.remarks || '-'}</td>
        </tr>
      </tbody>
    </>
  );
}

// 表格行组件
interface HarvestTableRowProps {
  record: HarvestRecord;
  idx: number;
  expandedRows: Set<number>;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  onToggleExpand: () => void;
  onSelectRow: () => void;
  onViewDetail: () => void;
  generateProductCode: (cropName: string, variety: string, index: number) => string;
}

export function HarvestTableRow({
  record,
  idx,
  expandedRows,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  onToggleExpand,
  onSelectRow,
  onViewDetail,
  generateProductCode,
}: HarvestTableRowProps) {
  const isExpanded = expandedRows.has(idx);
  const isSelected = selectedRows.includes(idx);
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;
  const colSpan = showCheckbox ? 13 : 12;

  return (
    <React.Fragment key={record.id}>
      {/* 主行 */}
      <tr className="hover:bg-blue-100 transition-colors">
        {showCheckbox && (
          <td className="px-4 py-3 whitespace-nowrap">
            <Input
              type="checkbox"
              checked={isSelected}
              onChange={onSelectRow}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
          </td>
        )}
        <td className="px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onToggleExpand} className="p-1 hover:bg-gray-100 rounded">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </Button>
        </td>
        <td
          className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
          onClick={onViewDetail}
        >
          {record.harvestCode}
        </td>
        <td className="px-4 py-3 text-sm whitespace-nowrap">
          {record.inboundType && INBOUND_TYPE_MAP[record.inboundType] ? (
            <span className={`px-2 py-0.5 ${INBOUND_TYPE_MAP[record.inboundType].bg} ${INBOUND_TYPE_MAP[record.inboundType].text} rounded text-xs`}>
              {INBOUND_TYPE_MAP[record.inboundType].label}
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">-</span>
          )}
          {record.isSupplementary && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
              {SUPPLEMENTARY_STATUS_MAP[record.supplementaryStatus] || '补录'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.harvestDate?.replace('T', ' ') || '-'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.greenhouseName}</td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.warehouseName}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col items-center gap-1">
            {(record.harvesterNames || record.createBy ? [record.createBy] : []).map((name, i) => (
              <span key={i} className="text-sm text-gray-900">{name || '-'}</span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
          {record.unitPrice ? `${record.unitPrice.toFixed(2)}` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-emerald-600 font-medium text-right whitespace-nowrap">
          {record.totalAmount ? `${record.totalAmount.toFixed(2)}` : '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">1 条</td>
        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.auditor || '-'}</td>
        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(record.status)}</td>
      </tr>
      {/* 展开行：产品明细 */}
      {isExpanded && (
        <tr>
          <td colSpan={colSpan} className="px-4 py-3 bg-gray-50">
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-2">产品明细：</p>
              <div className="overflow-x-auto rounded border">
                <table className="w-full bg-white">
                  <ProductRow
                    record={record}
                    recordIdx={idx}
                    generateProductCode={generateProductCode}
                  />
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

// 主表格组件
interface HarvestTableProps {
  records: HarvestRecord[];
  currentPage: number;
  pageSize: number;
  expandedRows: Set<number>;
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  onToggleRow: (idx: number) => void;
  onSelectRow: (idx: number) => void;
  onSelectAll: () => void;
  onViewDetail: (record: HarvestRecord) => void;
  generateProductCode: (cropName: string, variety: string, index: number) => string;
}

export function HarvestTable({
  records,
  currentPage,
  pageSize,
  expandedRows,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  onToggleRow,
  onSelectRow,
  onSelectAll,
  onViewDetail,
  generateProductCode,
}: HarvestTableProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allSelected = paginatedRecords.length > 0 && selectedRows.length === records.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            {showCheckbox && (
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                <Input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
            )}
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-10"></th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收单号</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库类型</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收时间</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收区域</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库仓库</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收人员</th>
            <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">单价(元/kg)</th>
            <th className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">收入(元)</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">产品数量</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">审核人员</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {paginatedRecords.map((record, idx) => {
            const globalIdx = (currentPage - 1) * pageSize + idx;
            return (
              <HarvestTableRow
                key={record.id}
                record={record}
                idx={globalIdx}
                expandedRows={expandedRows}
                selectedRows={selectedRows}
                exportMode={exportMode}
                batchEditMode={batchEditMode}
                batchDeleteMode={batchDeleteMode}
                onToggleExpand={() => onToggleRow(globalIdx)}
                onSelectRow={() => onSelectRow(globalIdx)}
                onViewDetail={() => onViewDetail(record)}
                generateProductCode={generateProductCode}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 批量选择操作栏组件
interface BatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
}

export function BatchActionBar({ selectedCount, totalCount, onSelectAll }: BatchActionBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          {selectedCount === totalCount ? '全不选' : '全选'}
        </Button>
        <span className="text-sm text-gray-500">已选择 {selectedCount} 项</span>
      </div>
    </div>
  );
}

// 分页组件
interface HarvestPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function HarvestPagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: HarvestPaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
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
          <SelectTrigger className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500 w-auto">
            <SelectValue placeholder="20" />
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
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <span className="text-sm">{currentPage} / {totalPages}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

export default HarvestTable;
