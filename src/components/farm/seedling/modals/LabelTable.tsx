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
  // 2026-07-01: 多选（批量作废）
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  onClearSelection?: () => void;
  /** 标签单位（默认"株"，种源可能为"粒/颗/kg"等） */
  unit?: string;
  /** 2026-08-20：搜索框右侧动作按钮（履历/补印/批量作废 等单/多标签操作） */
  topbarActions?: React.ReactNode;
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
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  unit = '株',
  topbarActions,
}: LabelTableProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 搜索框 + 顶部动作按钮（2026-08-20：搜索框占满剩余空间，4 个按钮靠右不缩） */}
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0 flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchText}
            onChange={(e) => { onSearchChange(e.target.value); }}
            placeholder="搜索标签编号..."
            className="pl-9 pr-3 py-2 border border-gray-400 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {topbarActions}
        </div>
      </div>

      {/* 2026-07-01: 多选模式提示条 */}
      {selectedIds && selectedIds.size > 0 && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-amber-800 font-medium">
            📋 多选模式 — 已选 <span className="font-bold">{selectedIds.size}</span> 个标签
          </span>
          <button
            onClick={() => onClearSelection?.()}
            className="text-amber-700 hover:text-amber-900 underline font-medium"
          >
            取消多选
          </button>
        </div>
      )}

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
                {onToggleSelectAll && (
                  <TableHead className="px-2 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={labels.length > 0 && labels.every((l: any) => selectedIds?.has(l.id))}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                  </TableHead>
                )}
                <TableHead className="px-3 py-2 text-xs">标签编号</TableHead>
                <TableHead className="px-3 py-2 text-xs">
                  移入位置
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold cursor-help" title="该植株被种植到的具体地块位置（如：东区-A区-3号畦），非育苗温室区域">?</span>
                </TableHead>
                <TableHead className="px-3 py-2 text-xs">移入日期</TableHead>
                {/* 2026-08-19：新增移出位置列（标签位置变更后显示最新移出位置） */}
                <TableHead className="px-3 py-2 text-xs">移出位置</TableHead>
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
                  {onToggleSelect && (
                    <TableCell className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(label.id) ?? false}
                        onChange={() => onToggleSelect(label.id)}
                        className="w-4 h-4 rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-3 py-2 font-mono text-xs">{label.labelNumber}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveInAreaName || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveInDate || '-'}</TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">{label.moveOutAreaName || '-'}</TableCell>
                  <TableCell className="px-3 py-2">
                    <LabelBadge status={label.status} quantity={label.quantity} unit={unit} />
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
