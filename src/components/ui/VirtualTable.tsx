/**
 * 虚拟滚动表格组件
 * 用于处理大数据量表格（1000+行），提升渲染性能
 *
 * 使用 @tanstack/react-virtual 实现虚拟滚动
 * 只渲染可视区域内的行，而非整个表格
 */

import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';

export interface VirtualTableColumn<T> {
  /** 列标识 */
  key: string;
  /** 列标题 */
  header: string;
  /** 列宽 */
  width?: number;
  /** 自定义渲染 */
  render?: (row: T, index: number) => React.ReactNode;
  /** 列对齐方式 */
  align?: 'left' | 'center' | 'right';
}

export interface VirtualTableProps<T> {
  /** 表格数据 */
  data: T[];
  /** 列配置 */
  columns: VirtualTableColumn<T>[];
  /** 估计的行高（默认50） */
  estimatedRowHeight?: number;
  /** 表格最大高度（默认600px） */
  maxHeight?: number;
  /** 行点击事件 */
  onRowClick?: (row: T, index: number) => void;
  /** 行类名 */
  rowClassName?: (row: T, index: number) => string;
  /** 是否显示表头（默认true） */
  showHeader?: boolean;
  /** 空状态文本 */
  emptyText?: string;
  /** 加载状态 */
  loading?: boolean;
}

export function VirtualTable<T>({
  data,
  columns,
  estimatedRowHeight = 50,
  maxHeight = 600,
  onRowClick,
  rowClassName,
  showHeader = true,
  emptyText = '暂无数据',
  loading = false,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 虚拟滚动器
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 10, // 额外渲染的行数，避免滚动时出现空白
  });

  // 虚拟行
  const virtualRows = virtualizer.getVirtualItems();

  // 计算总高度
  const totalSize = virtualizer.getTotalSize();

  // 表格行类名
  const getRowClassName = (row: T, index: number) => {
    const baseClass = 'table-row';
    const customClass = rowClassName?.(row, index) || '';
    return `${baseClass} ${customClass}`.trim();
  };

  if (loading) {
    return (
      <div className="border rounded-lg overflow-hidden" style={{ maxHeight }}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} style={{ width: col.width }}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          加载中...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border rounded-lg overflow-hidden" style={{ maxHeight }}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} style={{ width: col.width }}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="border rounded-lg overflow-auto"
      style={{ maxHeight }}
    >
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {/* 顶部占位元素 */}
          {virtualRows.length > 0 && (
            <TableRow style={{ height: virtualRows[0]?.start || 0 }} />
          )}

          {/* 虚拟行 */}
          {virtualRows.map((virtualRow) => {
            const row = data[virtualRow.index];
            return (
              <TableRow
                key={virtualRow.key}
                data-index={virtualRow.index}
                onClick={() => onRowClick?.(row, virtualRow.index)}
                className={getRowClassName(row, virtualRow.index)}
                style={{
                  height: virtualRow.size,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render
                      ? col.render(row, virtualRow.index)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}

          {/* 底部占位元素 */}
          {virtualRows.length > 0 && (
            <TableRow
              style={{
                height:
                  totalSize -
                  (virtualRows[virtualRows.length - 1]?.end || 0),
              }}
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default VirtualTable;
