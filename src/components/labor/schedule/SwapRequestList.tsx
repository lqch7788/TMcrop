/**
 * 调班申请列表组件（2026-09-18 从 SwapRequestModal.tsx 抽出）
 *
 * 抽因：SwapRequestModal.tsx 原本混装了「申请表单」+「申请列表」两个独立组件（974 行）。
 * 列表组件自带 filter/分页 state，边界清晰，抽到独立文件后可单独维护与测试。
 *
 * 数据流（V2.1 铁律）：受控组件，数据与操作全部通过 props 传入。
 */

import { useMemo, useState } from 'react';
import { Check, Download, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import type { SwapRequest } from './types';

// 调班申请列表组件（2026-09-15：与排班记录导出完全一致 — 进入 exportMode 显示 checkbox + 「确认导出」「取消」）
interface SwapRequestListProps {
  requests: SwapRequest[];
  onHandle: (id: string, status: '已同意' | '已拒绝') => void;
  // 2026-09-15：导出模式（受控），与 ScheduleTable 一致
  exportMode?: boolean;
  selectedRows?: string[];
  // 2026-09-19 修复 C2：与 ScheduleTable 一致，传当前筛选结果的行 id
  onSelectAll?: (ids: string[]) => void;
  onSelectRow?: (id: string) => void;
  onEnterExportMode?: () => void;
  onConfirmExport?: () => void;
  onCancelExport?: () => void;
}

type SwapStatusFilter = '全部' | '待审批' | '已同意' | '已拒绝';

// 状态徽章样式（表格里复用）
function StatusBadge({ status }: { status: SwapRequest['status'] }) {
  const cls =
    status === '待审批' ? 'bg-yellow-100 text-yellow-700'
    : status === '已同意' ? 'bg-green-100 text-green-700'
    : status === '已拒绝' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function SwapRequestList({
  requests,
  onHandle,
  exportMode = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  onEnterExportMode,
  onConfirmExport,
  onCancelExport,
}: SwapRequestListProps) {
  // 状态过滤 tab（仅在非导出模式下展示，避免与导出工具栏冲突）
  const [filter, setFilter] = useState<SwapStatusFilter>('全部');
  // 2026-09-15：分页状态（与排班记录一致，默认 10 条/页）
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 切换 tab 时重置 currentPage = 1，避免跨 tab 翻页错位
  const handleFilterChange = (tab: SwapStatusFilter) => {
    setFilter(tab);
    setCurrentPage(1);
  };

  // 按 tab 过滤 + 按创建时间倒序（最新在最上面，2026-09-15）
  const filtered = useMemo(() => {
    const base = filter === '全部' ? requests : requests.filter(r => r.status === filter);
    return [...base].sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
  }, [requests, filter]);

  // 分页数据（2026-09-15：与排班记录列表底部同款分页）
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // 各状态计数（用于 tab 标签）
  const counts = useMemo(() => ({
    全部: requests.length,
    待审批: requests.filter(r => r.status === '待审批').length,
    已同意: requests.filter(r => r.status === '已同意').length,
    已拒绝: requests.filter(r => r.status === '已拒绝').length,
  }), [requests]);

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无调班申请
      </div>
    );
  }

  const selectedSet = new Set(selectedRows);
  const filteredIds = filtered.map(r => r.id);
  const allFilteredSelected = exportMode && filteredIds.length > 0 && filteredIds.every(id => selectedSet.has(id));
  const someFilteredSelected = exportMode && filteredIds.some(id => selectedSet.has(id));

  return (
    <div>
      {/* 顶部工具栏：导出模式下显示「确认导出/取消」；非导出模式显示 tab + 「导出」入口 */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        {exportMode ? (
          <>
            <div className="text-sm text-gray-600">
              已选择 <strong className="text-emerald-600">{selectedRows.length}</strong> 项
              （请勾选要导出的调班申请）
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelExport}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['全部', '待审批', '已同意', '已拒绝'] as SwapStatusFilter[]).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleFilterChange(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    filter === tab
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab}
                  <span className={`ml-1 text-[10px] ${
                    filter === tab ? 'text-blue-500' : 'text-gray-400'
                  }`}>
                    {counts[tab]}
                  </span>
                </button>
              ))}
            </div>
            {onEnterExportMode && (
              <Button
                size="sm"
                onClick={onEnterExportMode}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </>
        )}
      </div>

      {/* 表格 */}
      {filtered.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">
          「{filter}」状态下暂无调班申请
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {exportMode && (
                  <TableHead className="px-3 py-2 w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) (el as HTMLInputElement).indeterminate = !allFilteredSelected && someFilteredSelected;
                      }}
                      onCheckedChange={() => onSelectAll?.(filteredIds)}
                    />
                  </TableHead>
                )}
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  状态
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  申请人
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  调班对象
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  原日期
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  目标日期
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  原因
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                  申请时间
                </TableHead>
                <TableHead className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap w-24 text-center">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {paginatedData.map(request => (
                <TableRow
                  key={request.id}
                  className={`hover:bg-blue-50 transition-colors ${exportMode && selectedSet.has(request.id) ? 'bg-blue-50/50' : ''}`}
                >
                  {exportMode && (
                    <TableCell className="px-3 py-2">
                      <Checkbox
                        checked={selectedSet.has(request.id)}
                        onCheckedChange={() => onSelectRow?.(request.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-3 py-2 whitespace-nowrap">
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                    {request.requesterName}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                    {request.targetName}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {request.originalDate}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {request.targetDate}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-gray-600 max-w-[200px] truncate" title={request.reason || ''}>
                    {request.reason || '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {request.createTime}
                  </TableCell>
                  <TableCell className="px-3 py-2 whitespace-nowrap text-center">
                    {request.status === '待审批' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onHandle(request.id, '已同意')}
                          className="p-1 rounded text-green-600 hover:bg-green-100 transition-colors"
                          title="同意"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onHandle(request.id, '已拒绝')}
                          className="p-1 rounded text-red-600 hover:bg-red-100 transition-colors"
                          title="拒绝"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 2026-09-15：分页（与排班记录 ScheduleTable 同款 Pagination 组件，单页也显示便于调整每页条数） */}
      {filtered.length > 0 && (
        <div className="px-3 py-3 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            showPageSize={true}
          />
        </div>
      )}
    </div>
  );
}
// 2026-09-18：原文件的 `export default SwapRequestModal;` 在抽取时被一并带入，
// 导致 "SwapRequestModal is not defined" 运行时错误（本文件未定义该符号）。
// 全部消费方都用命名导入，无需 default export。
