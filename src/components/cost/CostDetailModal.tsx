import React from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表格内容 */}
        <div className="overflow-auto max-h-[calc(80vh-72px)]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">物料编码</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">物料名称</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">规格</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">单位</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">领料数量</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">单价</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">金额</th>
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
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-end gap-8">
            <span className="text-sm text-gray-600">合计：</span>
            <span className="text-lg font-bold text-emerald-600">
              ¥{data.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostDetailModal;
console.log('组件创建成功: CostDetailModal');
