import React from 'react';
import { UnifiedModal } from '../ui/UnifiedModal';

interface MaterialDetail {
  code: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface CostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: MaterialDetail[];
}

export const CostDetailModal: React.FC<CostDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      {/* 表格内容 */}
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">物料编码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">物料名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">规格</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">单位</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">领料数量</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">单价</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">金额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-emerald-600">{item.code}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.spec}</td>
                <td className="px-4 py-3 text-sm text-center text-gray-600">{item.unit}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">¥{item.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-600">¥{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部汇总 */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 mt-4">
        <div className="flex justify-end gap-8">
          <span className="text-sm text-gray-600">合计：</span>
          <span className="text-lg font-bold text-emerald-600">
            ¥{data.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </UnifiedModal>
  );
};

export default CostDetailModal;
console.log('组件创建成功: CostDetailModal');
