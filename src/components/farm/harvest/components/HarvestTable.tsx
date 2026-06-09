/**
 * 采收记录表格组件
 * 从HarvestPage中拆分出来，负责表格展示
 */

import React from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { HarvestRecord } from '../../../../types/crop';
import { getStatusBadge, getGradeBadge } from '../statusBadgeUtils.tsx';
import { getPlantingModeLabel, parseHarvesterNames } from '../../../../constants/cropConstants';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { INBOUND_TYPE_MAP, SUPPLEMENTARY_STATUS_MAP } from '../../../../constants/cropConstants';

// 产品明细行组件
interface ProductRowProps {
  record: HarvestRecord;
  recordIdx: number;
  generateProductCode: (cropName: string, variety: string, index: number) => string;
}

// V3.1: 1:N 产品明细
// - 有 products 数组：每条产品 1 行（1 条主单 + N 行产品）
// - 无 products 数组（老数据 1:1 简化）：用 record 自身字段填充 1 行
function ProductRow({ record, recordIdx, generateProductCode }: ProductRowProps) {
  const productList: any[] = Array.isArray((record as any).products) && (record as any).products.length > 0
    ? (record as any).products
    : null;

  // 老数据兼容：1 条主单 = 1 个产品
  const rows = productList ?? [{
    productCode: '',
    cropName: record.cropName,
    cropCode: (record as any).cropCode || '',
    variety: record.variety || record.cropVariety || '',
    batchCode: record.batchCode,
    plantingMode: record.plantingMode,
    harvestQuantity: record.harvestQuantity,
    targetYield: record.targetYield,
    grade: record.grade || record.qualityGrade,
    remarks: record.remarks,
  }];

  return (
    <>
      {/* 表头 */}
      <thead style={{ backgroundColor: '#059669' }}>
        <tr style={{ backgroundColor: '#059669' }}>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">产品编码</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">作物名称</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">品种</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">生产计划批次号</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">种植模式</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">采收量</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">目标产量</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">完成率</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">品质等级</th>
          <th className="px-2 py-2 text-white text-xs font-medium whitespace-nowrap text-left">备注</th>
        </tr>
      </thead>
      {/* 表体：每条产品 1 行 */}
      <tbody>
        {rows.map((p, i) => {
          const qty = Number(p.harvestQuantity) || 0;
          const tgt = Number(p.targetYield) || 0;
          return (
            <tr key={i} className="border-t" style={{ backgroundColor: 'white' }}>
              <td className="px-2 py-2 text-xs font-mono text-emerald-600 whitespace-nowrap">
                {p.productCode || generateProductCode(p.cropName || record.cropName, p.variety || '', recordIdx + i)}
              </td>
              <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{p.cropName || record.cropName || '-'}</td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{p.variety || '-'}</td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{p.batchCode || record.batchCode || '-'}</td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{getPlantingModeLabel(p.plantingMode) || '-'}</td>
              <td className="px-2 py-2 text-xs text-gray-900 whitespace-nowrap">{qty} {p.unit || record.unit}</td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{tgt}</td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                {tgt ? Math.round(qty / tgt * 100) : 0}%
              </td>
              <td className="px-2 py-2 text-xs whitespace-nowrap">{getGradeBadge(p.grade || 'good')}</td>
              <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{p.remarks || '-'}</td>
            </tr>
          );
        })}
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

  return [
    <TableRow key="main" className="hover:bg-blue-100 transition-colors">
      {showCheckbox && (
        <TableCell className="px-4 py-3 whitespace-nowrap">
          <Input
            type="checkbox"
            checked={isSelected}
            onChange={onSelectRow}
            className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
          />
        </TableCell>
      )}
      <TableCell className="px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onToggleExpand} className="hover:bg-gray-100">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </Button>
      </TableCell>
      <TableCell
        className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap"
        onClick={onViewDetail}
      >
        {record.harvestCode}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
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
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.harvestDate?.replace('T', ' ') || '-'}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.greenhouseName}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.warehouseName || '-'}</TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col items-center gap-1">
          {parseHarvesterNames(record.harvesterNames).length > 0 ? (
            parseHarvesterNames(record.harvesterNames).map((name, i) => (
              <span key={i} className="text-sm text-gray-900">{name || '-'}</span>
            ))
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
        {record.unitPrice ? `${record.unitPrice.toFixed(2)}` : '-'}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-emerald-600 font-medium text-right whitespace-nowrap">
        {record.totalAmount ? `${record.totalAmount.toFixed(2)}` : '-'}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">1 条</TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.auditor || '-'}</TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap">{getStatusBadge(record.status)}</TableCell>
    </TableRow>,
    isExpanded && (
      <TableRow key="expand">
        <TableCell colSpan={colSpan} className="px-4 py-3 bg-gray-50">
          <div className="text-sm">
            <p className="font-medium text-gray-700 mb-2">产品明细：</p>
            <div className="overflow-x-auto rounded border">
              <Table className="bg-white">
                <ProductRow
                  record={record}
                  recordIdx={idx}
                  generateProductCode={generateProductCode}
                />
              </Table>
            </div>
          </div>
        </TableCell>
      </TableRow>
    ),
  ];
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
      <Table>
        <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <TableRow className="hover:from-blue-500 hover:to-blue-600">
            {showCheckbox && (
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                <Input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                />
              </TableHead>
            )}
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-10"></TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">采收单号</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">入库类型</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">采收时间</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">采收区域</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">入库仓库</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">采收人员</TableHead>
            <TableHead className="px-4 py-3 text-right text-white text-sm font-semibold whitespace-nowrap">单价(元/kg)</TableHead>
            <TableHead className="px-4 py-3 text-right text-white text-sm font-semibold whitespace-nowrap">收入(元)</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">产品数量</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">审核人员</TableHead>
            <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-300">
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
        </TableBody>
      </Table>
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
          <Check className="w-4 h-4" />
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
    <div className="px-4 py-3 border-t border-gray-100">
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        showPageSize
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
}

export default HarvestTable;
