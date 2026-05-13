/**
 * 生产链条汇总表格组件
 * 展示生产链条各环节的详情表格：生产计划、种源管理、种植管理、采收入库、库存管理
 */
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';

// 表格类型
export type ChainTableType = 'plans' | 'seedlings' | 'plantings' | 'harvests' | 'inventory';

// 列定义接口
export interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, record: any) => React.ReactNode;
}

// 组件 Props
interface ProductionChainTableProps {
  type: ChainTableType;
  data: any[];
  onView?: (record: any) => void;
}

// 状态中文映射
const statusMap: Record<string, string> = {
  draft: '草稿',
  planning: '规划中',
  planned: '计划中',
  published: '已发布',
  in_progress: '进行中',
  planted: '已种植',
  growing: '生长中',
  harvesting: '采收中',
  completed: '已完成',
  stored: '已入库',
};

// 表格类型中文名称
const tableTypeLabels: Record<ChainTableType, string> = {
  plans: '生产计划',
  seedlings: '种源管理',
  plantings: '种植管理',
  harvests: '采收入库',
  inventory: '库存管理',
};

// 各类型表格列配置
const columnConfigs: Record<ChainTableType, Column[]> = {
  // 生产计划表
  plans: [
    { key: 'batchCode', label: '计划编号', width: 'w-32' },
    { key: 'cropName', label: '作物', width: 'w-24' },
    { key: 'planType', label: '类型', width: 'w-20' },
    { key: 'greenhouseName', label: '温室', width: 'w-28' },
    { key: 'targetQuantity', label: '目标产量', width: 'w-24' },
    { key: 'status', label: '状态', width: 'w-20' },
    { key: 'techSolution', label: '技术方案', width: 'w-28' },
  ],
  // 种源管理表
  seedlings: [
    { key: 'seedlingCode', label: '育苗编号', width: 'w-32' },
    { key: 'cropName', label: '作物', width: 'w-24' },
    { key: 'cropVariety', label: '品种', width: 'w-28' },
    { key: 'sourceName', label: '来源', width: 'w-24' },
    { key: 'seedlingQuantity', label: '数量', width: 'w-20' },
    { key: 'survivalRate', label: '存活率', width: 'w-20' },
    { key: 'productionPlanCode', label: '关联计划', width: 'w-32' },
  ],
  // 种植管理表
  plantings: [
    { key: 'plantingCode', label: '种植编号', width: 'w-32' },
    { key: 'cropName', label: '作物', width: 'w-24' },
    { key: 'cropVariety', label: '品种', width: 'w-28' },
    { key: 'greenhouseName', label: '温室', width: 'w-28' },
    { key: 'plantingArea', label: '面积', width: 'w-20' },
    { key: 'status', label: '状态', width: 'w-20' },
    { key: 'productionPlanCode', label: '关联计划', width: 'w-32' },
  ],
  // 采收入库表
  harvests: [
    { key: 'harvestCode', label: '采收编号', width: 'w-32' },
    { key: 'cropName', label: '作物', width: 'w-24' },
    { key: 'greenhouseName', label: '温室', width: 'w-28' },
    { key: 'harvestQuantity', label: '数量', width: 'w-20' },
    { key: 'harvestDate', label: '采收日期', width: 'w-28' },
    { key: 'sourceId', label: '关联计划', width: 'w-32' },
  ],
  // 库存管理表
  inventory: [
    { key: 'id', label: '库存编号', width: 'w-32' },
    { key: 'cropName', label: '作物', width: 'w-24' },
    { key: 'variety', label: '品种', width: 'w-28' },
    { key: 'quantity', label: '数量', width: 'w-20' },
    { key: 'unit', label: '单位', width: 'w-16' },
    { key: 'productionPlanCode', label: '关联计划', width: 'w-32' },
  ],
};

/**
 * 生产链条汇总表格组件
 */
export function ProductionChainTable({ type, data, onView }: ProductionChainTableProps) {
  const columns = columnConfigs[type];

  // 渲染单元格内容
  const renderCell = (column: Column, record: any) => {
    const value = record[column.key];

    // 如果有自定义 render 函数，使用它
    if (column.render) {
      return column.render(value, record);
    }

    // 状态字段特殊处理
    if (column.key === 'status') {
      return statusMap[value] || value || '-';
    }

    // 存活率显示为百分比
    if (column.key === 'survivalRate' && value !== undefined && value !== null) {
      return `${value}%`;
    }

    // 数量添加单位（如果没有单位字段）
    if (column.key === 'targetQuantity' || column.key === 'seedlingQuantity' || column.key === 'harvestQuantity' || column.key === 'quantity') {
      if (value !== undefined && value !== null) {
        const unit = record.unit || 'kg';
        return `${value} ${unit}`;
      }
      return '-';
    }

    return value || '-';
  };

  // 无数据时显示空状态
  if (!data || data.length === 0) {
    return (
      <div className="w-full">
        <EmptyState
          type="data"
          title={`暂无${tableTypeLabels[type]}数据`}
          description="当前没有可显示的数据记录"
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* 表头 */}
        <thead className="bg-gray-50">
          <tr className="divide-x divide-gray-100">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-sm font-medium text-gray-700 ${column.width || ''}`}
              >
                {column.label}
              </th>
            ))}
            {/* 操作列 */}
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-20">
              操作
            </th>
          </tr>
        </thead>
        {/* 表体 */}
        <tbody className="divide-y divide-gray-100">
          {data.map((record, index) => (
            <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-gray-900 ${column.width || ''}`}
                >
                  {renderCell(column, record)}
                </td>
              ))}
              {/* 操作按钮 */}
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView?.(record)}
                  title="查看详情"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductionChainTable;
