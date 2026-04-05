import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
            <th className="px-4 py-3 text-left text-xs font-semibold">物料编码</th>
            <th className="px-4 py-3 text-left text-xs font-semibold">物料名称</th>
            <th className="px-4 py-3 text-left text-xs font-semibold">物料分类</th>
            <th className="px-4 py-3 text-left text-xs font-semibold">规格</th>
            <th className="px-4 py-3 text-center text-xs font-semibold">单位</th>
            <th className="px-4 py-3 text-right text-xs font-semibold">领料次数</th>
            <th className="px-4 py-3 text-right text-xs font-semibold">总数量</th>
            <th className="px-4 py-3 text-right text-xs font-semibold">总金额(元)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold">主要仓库</th>
            <th className="px-4 py-3 text-center text-xs font-semibold">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.slice(startIdx, endIdx).map((item, idx) => (
            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
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
                <button
                  onClick={() => onViewDetail(item)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  查看明细
                </button>
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
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            return (
              <button
                key={i}
                onClick={() => onPageChange(startPage + i)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  currentPage === startPage + i
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {startPage + i}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatMaterialTable;
console.log('组件创建成功: StatMaterialTable');
