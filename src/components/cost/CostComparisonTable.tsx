import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui';

interface CategoryAgg {
  category: string;
  requisitionCount: number;
  totalQuantity: number;
  totalAmount: number;
  percentage: number;
}

interface DepartmentAgg {
  department: string;
  requisitionCount: number;
  materialTypes: number;
  totalAmount: number;
  percentage: number;
}

interface BatchAgg {
  batchCode: string;
  cropName: string;
  area: string;
  requisitionCount: number;
  materialTypes: number;
  totalAmount: number;
  unitCost: number;
}

interface MaterialDetailItem {
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: string;
}

interface MaterialDetail {
  materialCode: string;
  materialName: string;
  totalAmount: number;
}

interface CostComparisonTableProps {
  categoryData: CategoryAgg[];
  departmentData: DepartmentAgg[];
  batchData: BatchAgg[];
  batchMaterialDetails?: Record<string, MaterialDetail[]>; // 批次物料明细
  onViewDetail: (dimension: string, value: string) => void;
}

type DimensionType = 'category' | 'department' | 'batch';

export const CostComparisonTable: React.FC<CostComparisonTableProps> = ({
  categoryData,
  departmentData,
  batchData,
  onViewDetail,
}) => {
  const [dimension, setDimension] = useState<DimensionType>('category');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // 获取当前维度的数据和图表数据
  const getCurrentData = () => {
    switch (dimension) {
      case 'category':
        return categoryData;
      case 'department':
        return departmentData;
      case 'batch':
        return batchData;
      default:
        return [];
    }
  };

  const getChartData = () => {
    const data = getCurrentData();
    return data.map(item => {
      if (dimension === 'category') {
        const d = item as CategoryAgg;
        return { name: d.category, value: d.totalAmount };
      } else if (dimension === 'department') {
        const d = item as DepartmentAgg;
        return { name: d.department, value: d.totalAmount };
      } else {
        const d = item as BatchAgg;
        return { name: d.batchCode, value: d.totalAmount };
      }
    });
  };

  const renderTableRows = () => {
    const data = getCurrentData();
    if (dimension === 'category') {
      return (data as CategoryAgg[]).map((item) => (
        <tr key={item.category} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.category}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.requisitionCount}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.totalQuantity.toLocaleString()}</td>
          <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.percentage.toFixed(1)}%</td>
          <td className="px-4 py-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail('category', item.category)}
              className="text-emerald-600 hover:text-emerald-700 text-sm"
            >
              <Eye className="w-4 h-4" /> 查看明细
            </Button>
          </td>
        </tr>
      ));
    } else if (dimension === 'department') {
      return (data as DepartmentAgg[]).map((item) => (
        <tr key={item.department} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.department}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.requisitionCount}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.materialTypes}</td>
          <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.percentage.toFixed(1)}%</td>
          <td className="px-4 py-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail('department', item.department)}
              className="text-emerald-600 hover:text-emerald-700 text-sm"
            >
              <Eye className="w-4 h-4" /> 查看明细
            </Button>
          </td>
        </tr>
      ));
    } else {
      return (data as BatchAgg[]).map((item) => (
        <React.Fragment key={item.batchCode}>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleExpand(item.batchCode)}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-emerald-600"
              >
                {expandedRows.has(item.batchCode) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </td>
            <td className="px-4 py-3 text-sm font-mono text-emerald-600">{item.batchCode}</td>
            <td className="px-4 py-3 text-sm text-gray-900">{item.cropName}</td>
            <td className="px-4 py-3 text-sm text-center text-gray-600">{item.requisitionCount}</td>
            <td className="px-4 py-3 text-sm text-center text-gray-600">{item.materialTypes}种</td>
            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-right text-amber-600">¥{item.unitCost.toFixed(2)}/m²</td>
          </tr>
          {expandedRows.has(item.batchCode) && (
            <tr>
              <td colSpan={7} className="px-4 py-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-2">该批次物料领用明细：</div>
                <div className="grid grid-cols-4 gap-2">
                  {batchMaterialDetails?.[item.batchCode]?.length > 0 ? (
                    batchMaterialDetails[item.batchCode].map((mat) => (
                      <div key={mat.materialCode} className="bg-white rounded p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">{mat.materialName}</div>
                        <div className="text-sm font-medium text-emerald-600">¥{mat.totalAmount.toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-sm text-gray-500">暂无物料明细</div>
                  )}
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      ));
    }
  };

  const getTableHeaders = () => {
    if (dimension === 'category') {
      return (
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">物料分类</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">领料次数</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">总数量</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">总金额</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">占比</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
        </tr>
      );
    } else if (dimension === 'department') {
      return (
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">部门</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">领料次数</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">物料种类</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">总金额</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">占比</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
        </tr>
      );
    } else {
      return (
        <tr>
          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-10"></th>
          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">批次号</th>
          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">作物</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">领料次数</th>
          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">物料种类</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">总成本</th>
          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">单位成本</th>
        </tr>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 维度切换 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">对比维度：</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={dimension === 'category' ? 'default' : 'ghost'}
            onClick={() => setDimension('category')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              dimension === 'category'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            按物料分类
          </Button>
          <Button
            size="sm"
            variant={dimension === 'department' ? 'default' : 'ghost'}
            onClick={() => setDimension('department')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              dimension === 'department'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            按部门
          </Button>
          <Button
            size="sm"
            variant={dimension === 'batch' ? 'default' : 'ghost'}
            onClick={() => setDimension('batch')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              dimension === 'batch'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            按批次
          </Button>
        </div>
      </div>

      {/* 图表 */}
      <div className="bg-white/50 rounded-xl p-4 border border-gray-100">
        <h5 className="font-semibold text-gray-700 mb-4">
          {dimension === 'category' ? '分类成本对比' : dimension === 'department' ? '部门成本对比' : '批次成本对比'}
        </h5>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getChartData()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.5)',
                }}
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '成本']}
              />
              <Bar
                dataKey="value"
                name="成本"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white/50 rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              {getTableHeaders()}
            </thead>
            <tbody className="divide-y divide-gray-400">
              {renderTableRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostComparisonTable;
// logger.info('组件创建成功: CostComparisonTable');
