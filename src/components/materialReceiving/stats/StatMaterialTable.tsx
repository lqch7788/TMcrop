import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatMaterialTableProps {
  activeTab: 'monthly' | 'material';
  data: any[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewDetail: (record: any) => void;
}

export const StatMaterialTable: React.FC<StatMaterialTableProps> = ({
  activeTab,
  data,
  currentPage,
  pageSize,
  onPageChange,
  onViewDetail,
}) => {
  if (activeTab !== 'material') return null;

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">领料统计表</h3>
      </div>
      <table className="w-full">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">物料编码</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">物料名称</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">物料分类</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">规格</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">单位</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">领料次数</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">总数量</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">总金额(元)</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">主要仓库</th>
            <th className="px-4 py-3 text-center text-sm font-semibold">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.slice(startIdx, endIdx).map((item, idx) => (
            <tr key={idx} className="hover:bg-blue-100 transition-colors">
              <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.materialCode}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.spec}</td>
              <td className="px-4 py-3 text-sm text-center text-gray-600">{item.unit}</td>
              <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{item.requisitionCount}</td>
              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{item.mainWarehouse}</td>
              <td className="px-4 py-3 text-center">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onViewDetail(item)}
                >
                  查看明细
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* 分页 */}
      <div className="flex items-center justify-between mt-4 px-4 pb-4">
        <div className="text-sm text-gray-500">
          显示第 {startIdx + 1} 至 {endIdx} 条，共 {totalItems} 条
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            return (
              <Button
                key={i}
                variant={currentPage === startPage + i ? 'default' : 'outline'}
                size="icon"
                onClick={() => onPageChange(startPage + i)}
                className={currentPage === startPage + i ? 'shadow-md shadow-emerald-500/30' : ''}
              >
                {startPage + i}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StatMaterialTable;
