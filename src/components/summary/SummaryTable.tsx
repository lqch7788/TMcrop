/**
 * 数据表格组件 - 支持选择、分页和操作
 */

import { Eye } from 'lucide-react';
import { TableColumn } from './types';
import { Pagination } from './Pagination';
import { Button } from '../ui/button';

interface SummaryTableProps<T extends { id: number | string }> {
  title?: string;
  columns: TableColumn<T>[];
  data: T[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  exportMode: boolean;
  selectedRows: (number | string)[];
  onPageChange: (page: number) => void;
  onSelectAll: () => void;
  onSelectRow: (id: number | string) => void;
  onView?: (record: T) => void;
}

export function SummaryTable<T extends { id: number | string }>({
  title,
  columns,
  data,
  currentPage,
  totalPages,
  pageSize,
  exportMode,
  selectedRows,
  onPageChange,
  onSelectAll,
  onSelectRow,
  onView,
}: SummaryTableProps<T>) {
  const totalCount = data.length;
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {exportMode && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key as string} className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {!exportMode && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedData.map((record) => (
              <tr key={record.id} className="hover:bg-blue-100 transition-colors">
                {exportMode && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(record.id)}
                      onChange={() => onSelectRow(record.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key as string} className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {col.render
                      ? col.render((record as Record<string, unknown>)[col.key as string], record)
                      : String((record as Record<string, unknown>)[col.key as string] ?? '')}
                  </td>
                ))}
                {!exportMode && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => onView?.(record)} title="查看">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {exportMode && selectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                {selectedRows.length === data.length ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </div>
  );
}
