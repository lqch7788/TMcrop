import React from 'react';
import { Table, TableProps, Button } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

/**
 * ProTable - 通用表格组件
 * 支持自定义列配置、排序、筛选、分页、行选中
 * 斑马纹显示
 */

// 列配置类型
export interface Column {
  title: string;
  dataIndex: string;
  key?: string;
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  filters?: { text: string; value: string }[];
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

// 分页配置类型
export interface PaginationConfig {
  current?: number;
  pageSize?: number;
  total?: number;
  onChange?: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number) => string;
}

// 行选择配置类型
export interface RowSelection {
  selectedRowKeys?: React.Key[];
  onChange?: (selectedRowKeys: React.Key[], selectedRows: any[]) => void;
  onSelect?: (record: any, selected: boolean) => void;
  onSelectAll?: (selected: boolean, selectedRows: any[]) => void;
}

interface ProTableProps {
  columns: Column[];
  dataSource: any[];
  loading?: boolean;
  pagination?: PaginationConfig | false;
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, FilterValue | null>) => void;
  rowSelection?: RowSelection;
  scroll?: { x?: number | string; y?: number | string };
}

const ProTable: React.FC<ProTableProps> = ({
  columns,
  dataSource,
  loading = false,
  pagination = false,
  onSort,
  onFilter,
  rowSelection,
  scroll,
}) => {
  // 处理排序变化
  const handleTableChange: TableProps['onChange'] = (
    paginationConfig: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<any> | SorterResult<any>[]
  ) => {
    // 处理筛选
    if (onFilter) {
      onFilter(filters);
    }

    // 处理排序
    if (onSort && !Array.isArray(sorter)) {
      if (sorter.order) {
        const order = sorter.order === 'ascend' ? 'asc' : 'desc';
        onSort(sorter.field as string, order);
      }
    }
  };

  // 转换列配置为Ant Design Table格式
  const transformedColumns: ColumnsType<any> = columns.map((col) => ({
    title: col.title,
    dataIndex: col.dataIndex,
    key: col.key || col.dataIndex,
    width: col.width,
    sorter: col.sortable ? (a: any, b: any) => {
      const valA = a[col.dataIndex];
      const valB = b[col.dataIndex];
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    } : undefined,
    sortOrder: undefined,
    filters: col.filterable ? col.filters : undefined,
    render: col.render,
  }));

  return (
    <Table
      columns={transformedColumns}
      dataSource={dataSource}
      loading={loading}
      pagination={pagination === false ? false : pagination}
      onChange={handleTableChange}
      rowSelection={rowSelection ? {
        selectedRowKeys: rowSelection.selectedRowKeys,
        onChange: (selectedRowKeys, selectedRows) => {
          rowSelection.onChange?.(selectedRowKeys, selectedRows);
        },
        onSelect: rowSelection.onSelect,
        onSelectAll: rowSelection.onSelectAll,
      } : undefined}
      scroll={scroll}
      rowClassName={(_, index) => index % 2 === 1 ? 'ant-table-row-zebra' : ''}
      style={{
        '--ant-table-row-zebra-bg': '#fafafa',
      } as React.CSSProperties}
    />
  );
};

export default ProTable;
