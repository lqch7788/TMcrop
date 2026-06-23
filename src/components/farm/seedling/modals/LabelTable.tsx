/**
 * 标签列表表格 — 搜索 + 分页 + 行选中
 * 从 SeedlingLabelManageModal 左侧面板提取
 */
import React from 'react';
import { Search, Tag } from 'lucide-react';
import { Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Pagination } from '@/components/ui';
import { LabelBadge } from './LabelBadge';
import type { PlantLabel } from '@/stores/usePlantLabelStore';

interface LabelTableProps {
  labels: PlantLabel[];
  selectedLabelId: number | null;
  searchText: string;
  onSearchChange: (v: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSelectLabel: (id: number) => void;
  loading?: boolean;
}

export function LabelTable({
  labels,
  selectedLabelId,
  searchText,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  onSelectLabel,
  loading = false,
}: LabelTableProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 搜索框 */}
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchText}
            onChange={(e) => { onSearchChange(e.target.value); }}
            placeholder="搜索标签编号..."
            className="pl-9 pr-3 py-2 border border-gray-400 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 表格区域 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : labels.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">暂无标签数据</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0">
              <TableRow>
                <TableHead className="px-3 py-2 text-xs">标签编号</TableHead>
                <TableHead className="px-3 py-2 text-xs">移入位置</TableHead>
                <TableHead className="px-3 py-2 text-xs">移入日期</TableHead>
                <TableHead className="px-3 py-2 text-xs">数量/状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {labels.map((label: any) => (
                <TableRow
                  key={label.id}
                  className={`cursor-pointer ${
                    selectedLabelId === label.id ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
                  }`}
                  onClick={() => onSelectLabel(label.id)}
                >
                  <TableCell className="px-3 py-2 font-mono text-xs">{label.labelNumber}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveInAreaName || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveInDate || '-'}</TableCell>
                  <TableCell className="px-3 py-2">
                    <LabelBadge status={label.status} quantity={label.quantity} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center p-3 border-t flex-shrink-0">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

export default LabelTable;
