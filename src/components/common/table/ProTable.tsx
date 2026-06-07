import React, { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * 列配置类型
 */
export interface Column {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  filters?: { text: string; value: string }[];
  render?: (value: unknown, record: any, index: number) => React.ReactNode;
}

/**
 * 分页配置类型
 */
export interface PaginationConfig {
  current?: number;
  pageSize?: number;
  total?: number;
  onChange?: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number) => string;
}

/**
 * 行选择配置类型
 */
export interface RowSelection {
  selectedRowKeys?: React.Key[];
  onChange?: (selectedRowKeys: React.Key[], selectedRows: any[]) => void;
  onSelect?: (record: any, selected: boolean) => void;
  onSelectAll?: (selected: boolean, selectedRows: any[]) => void;
}

interface ProTableProps {
  columns: Column[];
  dataSource: unknown[];
  loading?: boolean;
  pagination?: PaginationConfig | false;
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  rowSelection?: RowSelection;
  scroll?: { x?: number | string; y?: number | string };
  headerClassName?: string;
}

/**
 * ProTable - 通用表格组件
 * 基于 shadcn/ui Table 组件
 * 支持自定义列配置、排序、筛选、分页、行选中
 */
const ProTable: React.FC<ProTableProps> = ({
  columns,
  dataSource,
  loading = false,
  pagination = false,
  onSort,
  onFilter,
  rowSelection,
  scroll,
  headerClassName,
}) => {
  // 排序状态
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(pagination?.current || 1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 20);

  // 处理排序点击
  const handleSort = (column: Column) => {
    if (!column.sortable) return;

    let newOrder: 'asc' | 'desc' | null = null;

    if (sortColumn === column.dataIndex) {
      if (sortOrder === 'asc') {
        newOrder = 'desc';
      } else if (sortOrder === 'desc') {
        newOrder = null;
      } else {
        newOrder = 'asc';
      }
    } else {
      newOrder = 'asc';
    }

    setSortColumn(newOrder ? column.dataIndex : null);
    setSortOrder(newOrder);

    if (onSort) {
      onSort(column.dataIndex, newOrder as 'asc' | 'desc');
    }
  };

  // 获取排序图标
  const getSortIcon = (column: Column) => {
    if (!column.sortable) return null;

    if (sortColumn === column.dataIndex && sortOrder) {
      return sortOrder === 'asc' ? (
        <ArrowUp className="h-4 w-4 ml-1 inline-block" />
      ) : (
        <ArrowDown className="h-4 w-4 ml-1 inline-block" />
      );
    }

    return <ArrowUpDown className="h-4 w-4 ml-1 inline-block text-gray-400" />;
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (pagination && pagination.onChange) {
      pagination.onChange(page, pageSize);
    }
  };

  // 处理每页条数变化
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    if (pagination && pagination.onChange) {
      pagination.onChange(1, size);
    }
  };

  // 计算分页数据
  const paginationInfo = useMemo(() => {
    if (pagination === false) {
      return { paginatedData: dataSource, total: dataSource.length };
    }

    const total = pagination?.total || dataSource.length;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = dataSource.slice(startIndex, endIndex);

    return { paginatedData, total };
  }, [dataSource, pagination, currentPage, pageSize]);

  // 处理行选中变化
  const handleSelectAll = (checked: boolean) => {
    if (!rowSelection) return;

    const selectedRows = checked ? [...dataSource] : [];
    const selectedRowKeys = checked
      ? dataSource.map((_, index) => index)
      : [];

    rowSelection.onChange?.(selectedRowKeys as React.Key[], selectedRows);
    rowSelection.onSelectAll?.(checked, selectedRows);
  };

  // 处理单个行选中
  const handleSelectRow = (record: any, index: number, checked: boolean) => {
    if (!rowSelection) return;

    const selectedRowKeys = rowSelection.selectedRowKeys || [];
    const selectedRows =
      rowSelection.selectedRowKeys?.map((key) =>
        dataSource.find((_, i) => i === key)
      ).filter(Boolean) || [];

    let newSelectedRowKeys: React.Key[];
    let newSelectedRows: any[];

    if (checked) {
      newSelectedRowKeys = [...selectedRowKeys, index];
      newSelectedRows = [...selectedRows, record];
    } else {
      newSelectedRowKeys = selectedRowKeys.filter((k) => k !== index);
      newSelectedRows = selectedRows.filter((_, i) => selectedRowKeys[i] !== index);
    }

    rowSelection.onChange?.(newSelectedRowKeys, newSelectedRows);
    rowSelection.onSelect?.(record, checked);
  };

  // 判断是否全选
  const isAllSelected =
    dataSource.length > 0 &&
    rowSelection?.selectedRowKeys?.length === dataSource.length;

  const isIndeterminate =
    rowSelection?.selectedRowKeys?.length &&
    rowSelection.selectedRowKeys.length < dataSource.length;

  // 渲染加载状态
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className={cn("bg-gray-50", headerClassName)}>
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className="h-12 px-4 text-left align-middle font-medium text-gray-500"
                    style={{ width: col.width }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="p-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination !== false && (
          <div className="flex justify-end">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 表格 */}
      <div
        className="border rounded-lg overflow-auto"
        style={{ maxHeight: scroll?.y }}
      >
        <Table style={{ minWidth: scroll?.x }}>
          <TableHeader className={headerClassName}>
            <TableRow>
              {/* 行选择列 */}
              {rowSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = isIndeterminate;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {/* 数据列 */}
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  style={{ width: column.width, minWidth: column.width }}
                  className={cn(column.sortable && 'cursor-pointer select-none')}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center">
                    {column.title}
                    {getSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {paginationInfo.paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              paginationInfo.paginatedData.map((record, rowIndex) => {
                const originalIndex = (currentPage - 1) * pageSize + rowIndex;
                const isSelected = rowSelection?.selectedRowKeys?.includes(
                  originalIndex
                );

                return (
                  <TableRow
                    key={originalIndex}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      rowIndex % 2 === 1 && 'bg-gray-50/50',
                      'transition-colors hover:bg-gray-50'
                    )}
                  >
                    {/* 行选择列 */}
                    {rowSelection && (
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectRow(record, originalIndex, !!checked)
                          }
                        />
                      </TableCell>
                    )}
                    {/* 数据列 */}
                    {columns.map((column, colIndex) => {
                      const value = (record as any)[column.dataIndex];

                      return (
                        <TableCell key={colIndex}>
                          {column.render
                            ? column.render(value, record, originalIndex)
                            : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination !== false && (
        <div className="flex items-center justify-between">
          {/* 左侧信息 */}
          <div className="text-sm text-gray-500">
            {pagination?.showTotal ? (
              pagination.showTotal(paginationInfo.total)
            ) : (
              <>共 {paginationInfo.total} 条</>
            )}
          </div>

          {/* 分页器 */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(paginationInfo.total / pageSize)}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 20, 50, 100]}
            showPageSize={pagination?.showSizeChanger}
          />
        </div>
      )}
    </div>
  );
};

export default ProTable;
