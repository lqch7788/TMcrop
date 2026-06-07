import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';

interface BatchCostDetail {
  batchCode: string;
  cropName: string;
  area: string;
  materialCount: number;
  totalCost: number;
  unitCost: number;
}

interface CostBatchTableProps {
  data: BatchCostDetail[];
}

export const CostBatchTable: React.FC<CostBatchTableProps> = ({ data }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (batchCode: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(batchCode)) {
      newExpanded.delete(batchCode);
    } else {
      newExpanded.add(batchCode);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="bg-white/50 rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">批次成本追踪</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-10"></th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">作物</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">种植面积</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">领料次数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">物料种类</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">总成本</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">单位成本</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400">
            {data.map((item) => (
              <React.Fragment key={item.batchCode}>
                <tr className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.cropName}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{item.area}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{item.materialCount + 4}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{item.materialCount}种</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">¥{item.totalCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-amber-600">¥{item.unitCost.toFixed(2)}/m²</td>
                </tr>
                {expandedRows.has(item.batchCode) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-3 bg-gray-50">
                      <div className="text-xs text-gray-500 mb-2">该批次物料领用明细：</div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">商品有机肥</div>
                          <div className="text-sm font-medium">¥4,500</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">尿素</div>
                          <div className="text-sm font-medium">¥3,200</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">吡虫啉</div>
                          <div className="text-sm font-medium">¥1,800</div>
                        </div>
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <div className="text-xs text-gray-500">其他</div>
                          <div className="text-sm font-medium">¥9,060</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CostBatchTable;
// logger.info('组件创建成功: CostBatchTable');
